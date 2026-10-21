import Array "mo:core/Array";
import Cycles "mo:core/Cycles";
import Error "mo:core/Error";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Timer "mo:core/Timer";
import Types "../types/cycles-reserve";
import Treasury "../types/treasury";
import TreasuryLib "treasury";

// Cycles reserve domain logic: reserve share, cached balance, automatic CMC
// top-up (timer) and the admin withdrawal of the excess above the floor.
module {
  public type Account = Types.Account;
  public type CyclesReserveStore = Types.CyclesReserveStore;
  public type ReserveLock = Types.ReserveLock;
  public type CyclesStatus = Types.CyclesStatus;
  public type TopUpRecord = Types.TopUpRecord;
  public type ReserveWithdrawal = Types.ReserveWithdrawal;
  public type ReserveShare = Types.ReserveShare;
  public type WithdrawReserveResult = Types.WithdrawReserveResult;
  public type Cmc = Types.Cmc;

  // --- Constants -------------------------------------------------------------

  // Fixed, published 32-byte ICP subaccount of this canister holding the
  // cycles reserve (printable ASCII). Stable account identifier: never change.
  public let CYCLES_RESERVE_SUBACCOUNT : Blob = "CYCLES-RESERVE-TTTI-T-0000000001";

  // Always kept for cycles (2 ICP); only the amount above it can be withdrawn.
  public let RESERVE_FLOOR_E8S : Nat = 200_000_000;
  // Top up when the cycles balance is below 3 T cycles.
  public let TOPUP_THRESHOLD : Nat = 3_000_000_000_000;
  // Each top-up converts about 2 T cycles worth of ICP.
  public let TOPUP_TARGET_CYCLES : Nat = 2_000_000_000_000;
  // Top-up check interval: 6 hours.
  public let TOPUP_INTERVAL_SECONDS : Nat = 21_600;
  // Smallest top-up sent to the CMC (0.001 ICP); smaller amounts are skipped.
  public let MIN_TOPUP_E8S : Nat = 100_000;

  // Cycles Minting Canister (mainnet).
  public let CMC_CANISTER_ID : Text = "rkp4c-7iaaa-aaaaa-aaaca-cai";
  // CMC top-up memo 'TPUP' = 1347768404 (0x50555054).
  public let TPUP_MEMO : Nat64 = 1_347_768_404;
  // The same memo as the ICRC-1 blob: 8-byte little-endian encoding.
  public let TPUP_MEMO_BLOB : Blob = "\54\50\55\50\00\00\00\00";

  public let RESERVE_RULE : Text = "Fixed 1% running-cost fee: kept in the canister's public cycles reserve and converted to cycles automatically when the balance runs low. The administrator can transfer the amount above a 2 ICP floor to the creator's treasury account; the floor always stays available for cycles.";

  // --- Accounts and handles --------------------------------------------------

  // The cycles reserve account: this canister + CYCLES_RESERVE_SUBACCOUNT.
  public func reserveAccount(canister : Principal) : Account {
    { owner = canister; subaccount = ?CYCLES_RESERVE_SUBACCOUNT };
  };

  public func cmc() : Cmc = actor (CMC_CANISTER_ID);

  public func icpLedger() : TreasuryLib.IcpLedger = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai");

  // CMC deposit subaccount for a top-up of `canister`: [len, principal bytes, 0...] (32 bytes).
  public func cmcTopUpSubaccount(canister : Principal) : Blob {
    let bytes = canister.toBlob().toArray();
    let n = bytes.size();
    Array.tabulate<Nat8>(
      32,
      func i = if (i == 0) n.toNat8() else if (i <= n) bytes[i - 1] else 0,
    ).toBlob();
  };

  func nowNat64() : Nat64 = Time.now().toNat().toNat64();

  func sat(a : Nat, b : Nat) : Nat = if (a > b) Nat.sub(a, b) else 0;

  // --- Reserve math ----------------------------------------------------------

  // Fee share of a delivered purchase: floor(costE8s * 100 / 10_100).
  public func reserveShare(costE8s : Nat) : Nat {
    costE8s * 100 / 10_100;
  };

  // Amount handed to the treasury forward: cost - share, minus the ledger fee
  // the canister pays for the reserve transfer (when there is a share).
  public func treasuryShare(costE8s : Nat, shareE8s : Nat) : Nat {
    let rest = sat(costE8s, shareE8s);
    if (shareE8s == 0) rest else sat(rest, TreasuryLib.ICP_FEE);
  };

  // max(0, reserveBalanceE8s - RESERVE_FLOOR_E8S - ICP_FEE).
  public func withdrawableExcess(store : CyclesReserveStore) : Nat {
    sat(store.reserveBalanceE8s, RESERVE_FLOOR_E8S + TreasuryLib.ICP_FEE);
  };

  // Base amount a treasury forward (and its retries) uses for a conversion:
  // the recorded treasury share, or the full icpAmount for older records.
  public func forwardBase(store : CyclesReserveStore, conversion : Treasury.Conversion) : Nat {
    switch (store.shares.get(conversion.id)) {
      case (?s) { s.treasuryE8s };
      case null { conversion.icpAmount };
    };
  };

  // --- Views -----------------------------------------------------------------

  public func status(store : CyclesReserveStore, canister : Principal) : CyclesStatus {
    {
      cyclesBalance = Cycles.balance();
      topUpThreshold = TOPUP_THRESHOLD;
      reserveAccount = reserveAccount(canister);
      reserveBalanceE8s = store.reserveBalanceE8s;
      reserveFloorE8s = RESERVE_FLOOR_E8S;
      withdrawableExcessE8s = withdrawableExcess(store);
      lastTopUp = store.lastTopUp;
      withdrawals = store.withdrawals.toArray();
    };
  };

  // --- Ledger / CMC operations (never trap, never send cycles) ---------------

  func fetchReserveBalance(canister : Principal) : async ?Nat {
    try {
      ?(await icpLedger().icrc1_balance_of(reserveAccount(canister)));
    } catch (_) {
      null;
    };
  };

  // Re-reads the reserve balance from the ICP ledger into the cache.
  public func refreshReserveBalance(store : CyclesReserveStore, canister : Principal) : async () {
    switch (await fetchReserveBalance(canister)) {
      case (?balance) { store.reserveBalanceE8s := balance };
      case null {};
    };
  };

  // --- Purchase reserve shares -----------------------------------------------

  // Records the fee split of a delivered purchase, already claimed (#pending)
  // by the caller. Returns the claim to pass to transferShare.
  public func recordShare(store : CyclesReserveStore, conversionId : Nat, shareE8s : Nat, treasuryE8s : Nat) : ReserveShare {
    let share : ReserveShare = { conversionId; shareE8s; treasuryE8s; transfer = #pending };
    store.shares.add(conversionId, share);
    share;
  };

  // Synchronously claims a #failed share by marking it #pending (no await
  // between the check and the mark). Returns null for #pending/#transferred.
  func claimFailedShare(store : CyclesReserveStore, conversionId : Nat) : ?ReserveShare {
    switch (store.shares.get(conversionId)) {
      case (?share) {
        switch (share.transfer) {
          case (#failed(_)) {
            let claimed = { share with transfer = #pending };
            store.shares.add(conversionId, claimed);
            ?claimed;
          };
          case (_) { null };
        };
      };
      case null { null };
    };
  };

  // Transfers exactly a share the caller has claimed (#pending, set
  // synchronously by recordShare or claimFailedShare) from the canister
  // default account to the reserve (fee paid on top by the sender). Never trap.
  public func transferShare(store : CyclesReserveStore, ledger : TreasuryLib.IcpLedger, canister : Principal, share : ReserveShare) : async () {
    let conversionId = share.conversionId;
    // Send only while the caller's #pending claim is still in place.
    switch (store.shares.get(conversionId)) {
      case (?{ transfer = #pending }) {};
      case (_) { return };
    };
    if (share.shareE8s == 0) {
      store.shares.add(conversionId, { share with transfer = #transferred(0) });
      return;
    };
    let transfer : Types.ReserveTransferStatus = try {
      switch (
        await ledger.icrc1_transfer({
          from_subaccount = null;
          to = reserveAccount(canister);
          amount = share.shareE8s;
          fee = ?TreasuryLib.ICP_FEE;
          memo = null;
          created_at_time = null;
        })
      ) {
        case (#Ok(blockIndex)) { #transferred(blockIndex) };
        case (#Err(err)) { #failed(TreasuryLib.transferErrorMessage(err)) };
      };
    } catch (e) {
      #failed("The ICP ledger could not be reached: " # e.message());
    };
    store.shares.add(conversionId, { share with transfer });
    switch (transfer) {
      case (#transferred(_)) { await refreshReserveBalance(store, canister) };
      case (_) {};
    };
  };

  // Re-sends, to the reserve only, the shares whose transfer #failed.
  public func retryFailedShareTransfers(store : CyclesReserveStore, ledger : TreasuryLib.IcpLedger, canister : Principal) : async () {
    let failed = store.shares.values().filter(
      func s = switch (s.transfer) { case (#failed(_)) { true }; case (_) { false } }
    ).toArray();
    for (share in failed.values()) {
      // Claim synchronously before awaiting: a concurrent retry then sees
      // #pending and skips this share, so it is never sent twice.
      switch (claimFailedShare(store, share.conversionId)) {
        case (?claimed) { await transferShare(store, ledger, canister, claimed) };
        case null {};
      };
    };
  };

  // --- Top-up ----------------------------------------------------------------

  func isPendingNotify(store : CyclesReserveStore) : Bool {
    switch (store.lastTopUp) {
      case (?r) { switch (r.status) { case (#transferred) { true }; case (_) { false } } };
      case null { false };
    };
  };

  // Calls notify_top_up for the recorded block (same blockIndex every time).
  func notify(store : CyclesReserveStore, record : TopUpRecord, canister : Principal) : async () {
    let updated : TopUpRecord = try {
      switch (await cmc().notify_top_up({ block_index = record.blockIndex.toNat64(); canister_id = canister })) {
        case (#Ok(cycles)) { { record with status = #notified({ cycles }); lastError = null } };
        case (#Err(#Processing)) {
          { record with lastError = ?"The CMC is still processing this top-up; notify will be retried" };
        };
        case (#Err(#Other({ error_code; error_message }))) {
          { record with lastError = ?("CMC error " # error_code.toText() # ": " # error_message) };
        };
        case (#Err(#Refunded({ reason }))) {
          { record with status = #failed("Refunded by the CMC: " # reason); lastError = ?reason };
        };
        case (#Err(#InvalidTransaction(reason))) {
          { record with status = #failed("Invalid transaction: " # reason); lastError = ?reason };
        };
        case (#Err(#TransactionTooOld(_))) {
          { record with status = #failed("Transaction too old for the CMC"); lastError = ?"Transaction too old" };
        };
      };
    } catch (e) {
      { record with lastError = ?("The CMC could not be reached: " # e.message()) };
    };
    store.lastTopUp := ?updated;
    await refreshReserveBalance(store, canister);
  };

  func topUpPass(store : CyclesReserveStore, lock : ReserveLock, canister : Principal) : async () {
    await refreshReserveBalance(store, canister);
    // A transfer awaiting its notify: retry notify only, never a new transfer.
    switch (store.lastTopUp) {
      case (?r) {
        switch (r.status) {
          case (#transferred) {
            await notify(store, r, canister);
            return;
          };
          case (_) {};
        };
      };
      case null {};
    };
    // A transfer whose reply was lost is re-sent identically (same amount and
    // created_at_time), so the ledger deduplicates it instead of paying twice.
    let attempt = switch (lock.unconfirmedTopUp) {
      case (?a) { a };
      case null {
        if (Cycles.balance() >= TOPUP_THRESHOLD) {
          return;
        };
        let permyriad = try {
          (await cmc().get_icp_xdr_conversion_rate()).data.xdr_permyriad_per_icp.toNat();
        } catch (_) {
          return;
        };
        if (permyriad == 0) {
          return;
        };
        let wanted = TOPUP_TARGET_CYCLES * 10_000 * 100_000_000 / (permyriad * 1_000_000_000_000);
        let amount = Nat.min(wanted, sat(store.reserveBalanceE8s, TreasuryLib.ICP_FEE));
        if (amount == 0 or amount < MIN_TOPUP_E8S) {
          return;
        };
        let a = { amount; createdAt = nowNat64() };
        lock.unconfirmedTopUp := ?a;
        a;
      };
    };
    let amount = attempt.amount;
    let cmcPrincipal = Principal.fromText(CMC_CANISTER_ID);
    let result = try {
      await icpLedger().icrc1_transfer({
        from_subaccount = ?CYCLES_RESERVE_SUBACCOUNT;
        to = { owner = cmcPrincipal; subaccount = ?cmcTopUpSubaccount(canister) };
        amount;
        fee = ?TreasuryLib.ICP_FEE;
        memo = ?TPUP_MEMO_BLOB;
        created_at_time = ?attempt.createdAt;
      });
    } catch (_) {
      // Outcome unknown: keep the attempt; the next pass re-sends it identically.
      return;
    };
    lock.unconfirmedTopUp := null;
    let executed : ?Nat = switch (result) {
      case (#Ok(blockIndex)) { ?blockIndex };
      case (#Err(#Duplicate({ duplicate_of }))) { ?duplicate_of };
      case (#Err(_)) { null };
    };
    switch (executed) {
      case (?blockIndex) {
        // Persist the block BEFORE notify so a failed notify is retried with it.
        let record : TopUpRecord = {
          timestamp = Time.now();
          icpE8s = amount;
          blockIndex;
          status = #transferred;
          lastError = null;
        };
        store.lastTopUp := ?record;
        await notify(store, record, canister);
      };
      case null {};
    };
  };

  // One timer pass: retries a pending notify (same blockIndex), otherwise when
  // the cycles balance is below TOPUP_THRESHOLD transfers about
  // TOPUP_TARGET_CYCLES worth of reserve ICP to the CMC (TPUP memo), records
  // the blockIndex, then calls notify_top_up. Skipped while the lock is held.
  public func runTopUp(store : CyclesReserveStore, lock : ReserveLock, canister : Principal) : async () {
    if (lock.busy) {
      return;
    };
    lock.busy := true;
    try {
      await topUpPass(store, lock, canister);
    } catch (_) {} finally {
      lock.busy := false;
    };
  };

  // --- Withdrawal ------------------------------------------------------------

  // Transfers `amount` (<= withdrawable excess) from the reserve to the
  // configured treasury account only; refused without a ledger call otherwise.
  public func withdrawExcess(store : CyclesReserveStore, lock : ReserveLock, treasury : TreasuryLib.TreasuryStore, canister : Principal, amount : Nat) : async WithdrawReserveResult {
    if (lock.busy) {
      return #busy;
    };
    if (isPendingNotify(store) or lock.unconfirmedTopUp != null) {
      return #topUpPendingNotify;
    };
    let target = switch (treasury.config) {
      case (?c) { c.icpAccount };
      case null { return #treasuryNotConfigured };
    };
    // Refusals against the cached reserve balance: no ledger call at all.
    let cachedExcess = withdrawableExcess(store);
    if (cachedExcess == 0) {
      return #noExcess;
    };
    if (amount > cachedExcess) {
      return #amountExceedsExcess({ withdrawableE8s = cachedExcess });
    };
    if (amount == 0) {
      return #ledgerError("The amount must be greater than zero; nothing was transferred");
    };
    lock.busy := true;
    try {
      let balance = switch (await fetchReserveBalance(canister)) {
        case (?b) { b };
        case null {
          return #ledgerError("The reserve balance could not be read from the ICP ledger; nothing was transferred");
        };
      };
      store.reserveBalanceE8s := balance;
      let withdrawable = withdrawableExcess(store);
      if (withdrawable == 0) {
        return #noExcess;
      };
      if (amount > withdrawable) {
        return #amountExceedsExcess({ withdrawableE8s = withdrawable });
      };
      if (amount == 0) {
        return #ledgerError("The amount must be greater than zero; nothing was transferred");
      };
      let result = try {
        await icpLedger().icrc1_transfer({
          from_subaccount = ?CYCLES_RESERVE_SUBACCOUNT;
          to = target;
          amount;
          fee = ?TreasuryLib.ICP_FEE;
          memo = null;
          created_at_time = ?nowNat64();
        });
      } catch (e) {
        return #ledgerError("The ICP ledger could not be reached: " # e.message());
      };
      switch (result) {
        case (#Ok(blockIndex)) {
          store.withdrawals.add({ timestamp = Time.now(); amountE8s = amount; blockIndex });
          await refreshReserveBalance(store, canister);
          #ok(blockIndex);
        };
        case (#Err(err)) { #ledgerError(TreasuryLib.transferErrorMessage(err)) };
      };
    } finally {
      lock.busy := false;
    };
  };

  // Arms the 6-hour top-up timer (called on every install and upgrade).
  public func startTimer<system>(store : CyclesReserveStore, lock : ReserveLock, canister : Principal) {
    func tick() : async () {
      await runTopUp(store, lock, canister);
    };
    ignore Timer.setTimer<system>(#seconds(0), tick);
    ignore Timer.recurringTimer<system>(#seconds(TOPUP_INTERVAL_SECONDS), tick);
  };
};
