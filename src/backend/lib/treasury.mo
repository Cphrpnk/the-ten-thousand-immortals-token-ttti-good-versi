import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Error "mo:core/Error";
import Treasury "../types/treasury";

module {
  public type TreasuryConfig = Treasury.TreasuryConfig;
  public type Conversion = Treasury.Conversion;
  public type ConversionStatus = Treasury.ConversionStatus;
  public type ForwardStatus = Treasury.ForwardStatus;
  public type TreasuryConfigResult = Treasury.TreasuryConfigResult;
  public type Account = Treasury.Account;
  public type CollectResult = Treasury.CollectResult;
  public type PublicTreasuryInfo = Treasury.PublicTreasuryInfo;

  // The ICP ledger canister (mainnet) exposed through its ICRC-1 interface.
  public func icpLedger() : Principal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

  // ICP ICRC-1/ICRC-2 interface. Error variants include every ICRC-2
  // transfer_from variant (InsufficientAllowance etc.) so replies decode.
  public type IcpLedger = actor {
    icrc1_balance_of : shared query ({ owner : Principal; subaccount : ?Blob }) -> async Nat;
    icrc1_transfer : shared Treasury.IcpTransferArgs -> async Treasury.IcpTransferResult;
    icrc2_transfer_from : shared Treasury.IcpTransferFromArgs -> async Treasury.IcpTransferFromResult;
  };

  // ICP base units per whole ICP (8 decimals).
  public let ICP_DECIMALS : Nat = 100_000_000;

  // ICP ledger transfer fee in e8s (0.0001 ICP).
  public let ICP_FEE : Nat = 10_000;

  // Denominator of the conversion: ICP e8s (10^8) * USD price scale (10^8) *
  // TTTI-T price in USD (10^4) * basis points (10^4) = 10^24. The numerator
  // carries the TTTI-T base units per token (10^8).
  let LIVE_DENOMINATOR : Nat = 1_000_000_000_000_000_000_000_000;

  // Stable treasury state. `depositRecipients` is the per-caller optional
  // delivery address map (principal -> { owner; subaccount = null }).
  public type TreasuryStore = {
    var config : ?TreasuryConfig;
    var conversions : Map.Map<Nat, Conversion>;
    var nextConversionId : Nat;
    var depositRecipients : Map.Map<Principal, Account>;
  };

  // --- Configuration ---------------------------------------------------------

  public func getConfig(store : TreasuryStore) : ?TreasuryConfig {
    store.config;
  };

  // Fixed fee for canister running costs (cycles): 100 bps = 1%. A code
  // constant; no method changes it. The buyer pays 10 100 USD per TTTI-T.
  public let CYCLES_FEE_BPS : Nat = 100;

  // Stores the account that receives the creator's ICP.
  public func setConfig(store : TreasuryStore, config : TreasuryConfig) : TreasuryConfigResult {
    store.config := ?config;
    #Ok(config);
  };

  // What the Buy page needs; null when not configured.
  public func publicInfo(store : TreasuryStore) : ?PublicTreasuryInfo {
    switch (store.config) {
      case (?c) { ?{ icpAccount = c.icpAccount } };
      case null { null };
    };
  };

  // --- State -----------------------------------------------------------------

  public func getConversions(store : TreasuryStore) : [Conversion] {
    store.conversions.values().toArray();
  };

  // Automatic rule (no admin endpoint): re-sends to config.icpAccount, once
  // each, the treasury part of conversions whose forward is #failed (amount =
  // forwardBase(conversion) - ICP_FEE; forwardBase excludes the cycles reserve
  // share, so it is never sent again). Marks each #pending before its ledger
  // await so it can never forward twice; ends as #forwarded(blockIndex) or
  // #failed(reason). Called after a successful delivery. Never traps.
  public func retryFailedForwards(store : TreasuryStore, icpLedger : IcpLedger, canisterAccount : Account, forwardBase : Conversion -> Nat) : async () {
    let target = switch (store.config) {
      case (?c) { c.icpAccount };
      case (null) { return };
    };
    let failed = store.conversions.values().filter(
      func c = c.status == #completed and (switch (c.forward) { case (#failed(_)) { true }; case (_) { false } })
    ).toArray();
    for (conversion in failed.values()) {
      // Mark pending before the await so a concurrent retry never re-sends it.
      store.conversions.add(conversion.id, { conversion with forward = #pending });
      let forward = await forwardIcp(icpLedger, canisterAccount, target, forwardBase(conversion));
      store.conversions.add(conversion.id, { conversion with forward });
    };
  };

  // --- Conversion records ----------------------------------------------------

  // Stores `conversion` under a fresh id (store.nextConversionId) with
  // timestamp = now; the input's id and timestamp are ignored. Returns the
  // stored record.
  public func recordConversion(store : TreasuryStore, conversion : Conversion) : Conversion {
    let id = store.nextConversionId;
    store.nextConversionId += 1;
    let stored = { conversion with id; timestamp = Time.now().toNat().toNat64() };
    store.conversions.add(id, stored);
    stored;
  };

  // Replaces the stored record with the same id (e.g. forward status update).
  public func updateConversion(store : TreasuryStore, conversion : Conversion) : () {
    store.conversions.add(conversion.id, conversion);
  };

  // --- Conversion math -------------------------------------------------------
  //
  // Buyer price per whole TTTI-T: 10 000 USD * (10_000 + CYCLES_FEE_BPS) /
  // 10_000 = 10 100 USD. TTTI-T amounts are rounded down to 1 base unit
  // (0.00000001 TTTI-T); ICP costs for an exact amount are rounded up.

  // floor(icpE8s * priceUsdE8 * 10^8 * 10_000 / (10^8 * 10^8 * 10_000 *
  // (10_000 + CYCLES_FEE_BPS))): TTTI-T base units bought by `icpE8s`.
  // Equivalent to floor(icpE8s * priceUsdE8 / (10_100 * 10^8)).
  public func tttiFromPrice(icpE8s : Nat, priceUsdE8 : Nat) : Nat {
    (icpE8s * priceUsdE8 * 10_000_000_000_000_000) / (LIVE_DENOMINATOR * (10_000 + CYCLES_FEE_BPS));
  };

  // TTTI-T base units per whole ICP at `usdE8`, fee included; null when 0.
  public func liveRateFromPrice(usdE8 : Nat) : ?Nat {
    if (usdE8 == 0) null else ?tttiFromPrice(ICP_DECIMALS, usdE8);
  };

  // ceil(n / d) for d > 0.
  func ceilDiv(n : Nat, d : Nat) : Nat {
    let q = n / d;
    if (q * d == n) q else q + 1;
  };

  // Smallest ICP amount (e8s) that pays for exactly `tttiAmount` TTTI-T at the
  // buyer price (fee included), rounded up. null when the price is 0.
  public func icpForExactTtti(tttiAmount : Nat, priceUsdE8 : Nat) : ?Nat {
    if (priceUsdE8 == 0) {
      return null;
    };
    ?ceilDiv(tttiAmount * LIVE_DENOMINATOR * (10_000 + CYCLES_FEE_BPS), priceUsdE8 * 10_000_000_000_000_000);
  };

  // `amount` minus the ICP fee, or 0 when the amount does not cover it.
  func minusFee(amount : Nat) : Nat {
    if (amount <= ICP_FEE) {
      return 0;
    };
    let net : Int = amount - ICP_FEE;
    net.toNat();
  };

  // Formats an 8-decimal base-unit amount (ICP e8s or TTTI-T) as a decimal.
  public func formatE8(amount : Nat) : Text {
    let whole = amount / 100_000_000;
    let frac = amount % 100_000_000;
    if (frac == 0) {
      return whole.toText();
    };
    var digits = frac.toText();
    while (digits.size() < 8) {
      digits := "0" # digits;
    };
    whole.toText() # "." # digits.trimEnd(#char '0');
  };

  // --- ICP ledger calls (all try/catch, never trap, no cycles) ---------------

  // icrc2_transfer_from(buyer -> canisterAccount, icpAmount), canister is the spender.
  public func collectIcp(icpLedger : IcpLedger, buyer : Principal, canisterAccount : Account, icpAmount : Nat) : async CollectResult {
    try {
      let result = await icpLedger.icrc2_transfer_from({
        spender_subaccount = null;
        from = { owner = buyer; subaccount = null };
        to = canisterAccount;
        amount = icpAmount;
        fee = null;
        memo = null;
        created_at_time = null;
      });
      switch (result) {
        case (#Ok(blockIndex)) { #ok(blockIndex) };
        case (#Err(err)) { #ledgerError(err) };
      };
    } catch (e) {
      #callFailed(e.message());
    };
  };

  // icrc1_transfer(canister -> buyer, icpAmount - ICP_FEE). #ok(blockIndex) or #err(message).
  public func refundIcp(icpLedger : IcpLedger, buyer : Principal, icpAmount : Nat) : async { #ok : Nat; #err : Text } {
    let amount = minusFee(icpAmount);
    if (amount == 0) {
      return #err("the amount does not cover the 0.0001 ICP ledger fee");
    };
    try {
      let result = await icpLedger.icrc1_transfer({
        from_subaccount = null;
        to = { owner = buyer; subaccount = null };
        amount;
        fee = null;
        memo = null;
        created_at_time = null;
      });
      switch (result) {
        case (#Ok(blockIndex)) { #ok(blockIndex) };
        case (#Err(err)) { #err(transferErrorMessage(err)) };
      };
    } catch (e) {
      #err("the ICP ledger could not be reached: " # e.message());
    };
  };

  // icrc1_transfer(canister -> target, icpAmount - ICP_FEE) when target differs
  // from canisterAccount; #notRequired otherwise.
  public func forwardIcp(icpLedger : IcpLedger, canisterAccount : Account, target : Account, icpAmount : Nat) : async ForwardStatus {
    if (target == canisterAccount) {
      return #notRequired;
    };
    let amount = minusFee(icpAmount);
    if (amount == 0) {
      return #failed("The amount does not cover the 0.0001 ICP ledger fee");
    };
    try {
      let result = await icpLedger.icrc1_transfer({
        from_subaccount = null;
        to = target;
        amount;
        fee = null;
        memo = null;
        created_at_time = null;
      });
      switch (result) {
        case (#Ok(blockIndex)) { #forwarded(blockIndex) };
        case (#Err(err)) { #failed(transferErrorMessage(err)) };
      };
    } catch (e) {
      #failed("The ICP ledger could not be reached: " # e.message());
    };
  };

  // User-facing messages, e.g. #InsufficientAllowance ->
  // "Approval missing or too low: approve the amount + 0.0001 ICP fee".
  public func transferFromErrorMessage(err : Treasury.IcpTransferFromError) : Text {
    switch (err) {
      case (#InsufficientAllowance({ allowance })) {
        "Approval missing or too low: approve the amount + 0.0001 ICP fee (current allowance: " # formatE8(allowance) # " ICP)";
      };
      case (#InsufficientFunds({ balance })) {
        "Insufficient ICP balance: " # formatE8(balance) # " ICP available; the amount plus the 0.0001 ICP fee is required";
      };
      case (#BadFee({ expected_fee })) {
        "The ICP ledger rejected the fee (expected " # formatE8(expected_fee) # " ICP)";
      };
      case (#BadBurn({ min_burn_amount })) {
        "The ICP ledger rejected the transfer as a burn (minimum " # formatE8(min_burn_amount) # " ICP)";
      };
      case (#TooOld) { "The ICP ledger rejected the transfer as too old; please try again" };
      case (#CreatedInFuture(_)) {
        "The ICP ledger rejected the transfer time; please try again";
      };
      case (#Duplicate({ duplicate_of })) {
        "Duplicate ICP transfer (already recorded in block " # duplicate_of.toText() # ")";
      };
      case (#TemporarilyUnavailable) {
        "The ICP ledger is temporarily unavailable; please try again in a moment";
      };
      case (#GenericError({ message })) { "ICP ledger error: " # message };
    };
  };

  // icrc1_transfer errors are a subset of the transfer_from errors.
  public func transferErrorMessage(err : Treasury.IcpTransferError) : Text {
    transferFromErrorMessage(err);
  };
};
