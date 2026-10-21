import Map "mo:core/Map";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Nat64 "mo:core/Nat64";
import Int "mo:core/Int";
import Char "mo:core/Char";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Common "../types/common";
import Sale "../types/presale";
import IcrcLib "icrc";
import TreasuryLib "treasury";
import OracleLib "oracle";
import CyclesReserveLib "cycles-reserve";
import CanisterInfoLib "canister-info";

// TTTI-T sale: status, buy-to-mint purchase pipeline, delivery addresses and
// the balance snapshot export.
module {
  public type Account = Common.Account;
  public type SaleStatus = Sale.SaleStatus;
  public type TechnicalDetails = Sale.TechnicalDetails;
  public type AcknowledgementStore = Sale.AcknowledgementStore;
  public type PurchaseAcknowledgement = Sale.PurchaseAcknowledgement;
  public type AcknowledgementError = Sale.AcknowledgementError;
  public type PurchaseResult = Sale.PurchaseResult;
  public type PurchaseError = Sale.PurchaseError;
  public type DeliveryAddressResult = Sale.DeliveryAddressResult;
  public type DeliveryAddressError = Sale.DeliveryAddressError;
  public type BalanceSnapshot = Sale.BalanceSnapshot;

  // Stable sale state. `sold` = TTTI-T delivered by the sale (cumulative);
  // `reserved` = TTTI-T held for in-flight purchases (reserved before the first
  // await, released on failure, moved to `sold` on success).
  public type SaleStore = {
    var sold : Nat;
    var reserved : Nat;
    var salesPaused : Bool;
  };

  // Everything the purchase pipeline touches.
  public type PurchaseContext = {
    sale : SaleStore;
    treasury : TreasuryLib.TreasuryStore;
    ledger : IcrcLib.Ledger;
    oracle : OracleLib.OracleStore;
    acknowledgements : AcknowledgementStore;
    icpLedger : TreasuryLib.IcpLedger;
    canister : Principal;
    cyclesReserve : CyclesReserveLib.CyclesReserveStore;
  };

  // Minimum purchase: 0.0001 TTTI-T (1.01 USD of ICP with the 1% fee).
  public let MIN_PURCHASE : Nat = 10_000;
  // Base price: 1 TTTI-T = 10 000 USD.
  public let TOKEN_PRICE_USD : Nat = 10_000;

  // --- Status and switches ---------------------------------------------------

  // What can still be sold: mintableRemaining + fee-account balance - reserved
  // (saturating at 0).
  public func available(sale : SaleStore, ledger : IcrcLib.Ledger, canister : Principal) : Nat {
    let sellable = IcrcLib.mintableRemaining(ledger) + IcrcLib.balanceOf(ledger, IcrcLib.feeCollectorAccount(canister));
    if (sellable > sale.reserved) Nat.sub(sellable, sale.reserved) else 0;
  };

  func buyerPriceUsd() : Nat {
    TOKEN_PRICE_USD * (10_000 + TreasuryLib.CYCLES_FEE_BPS) / 10_000;
  };

  public func status(sale : SaleStore, treasury : TreasuryLib.TreasuryStore, ledger : IcrcLib.Ledger, oracle : OracleLib.OracleStore, canister : Principal) : SaleStatus {
    ignore treasury;
    let avail = available(sale, ledger, canister);
    {
      maxSupply = IcrcLib.getMaxSupply();
      totalSupply = IcrcLib.totalSupply(ledger);
      mintableRemaining = IcrcLib.mintableRemaining(ledger);
      feeAccountBalance = IcrcLib.balanceOf(ledger, IcrcLib.feeCollectorAccount(canister));
      sold = sale.sold;
      reserved = sale.reserved;
      available = avail;
      complete = avail == 0 and sale.reserved == 0;
      minPurchase = MIN_PURCHASE;
      tokenPriceUsd = TOKEN_PRICE_USD;
      cyclesFeeBps = TreasuryLib.CYCLES_FEE_BPS;
      buyerPriceUsd = buyerPriceUsd();
      salesPaused = sale.salesPaused;
      priceUsdE8 = oracle.usdE8;
      priceSource = oracle.source;
      priceFetchedAt = oracle.fetchedAt;
      priceValidUntil = oracle.validUntil;
      priceUsable = OracleLib.isUsable(oracle, Time.now());
      liveRate = TreasuryLib.liveRateFromPrice(oracle.usdE8);
    };
  };

  // Static facts plus live ledger figures shown on the site.
  public func technicalDetails(ledger : IcrcLib.Ledger, canister : Principal, canisterInfo : CanisterInfoLib.CanisterInfoStore) : TechnicalDetails {
    let feeAccount = IcrcLib.feeCollectorAccount(canister);
    {
      ledgerCanisterId = canister;
      tokenName = IcrcLib.tokenName();
      tokenSymbol = IcrcLib.tokenSymbol();
      decimals = IcrcLib.decimals();
      standards = IcrcLib.supportedStandards().map(func s = s.name);
      icpLedgerCanisterId = TreasuryLib.icpLedger();
      oracleSources = [
        "Coinbase ICP-USD spot price (" # OracleLib.COINBASE_URL # ")",
        "CoinGecko simple price, if Coinbase is unavailable (" # OracleLib.COINGECKO_URL # ")",
      ];
      refreshPolicy = "The ICP/USD rate is set once an hour from Coinbase, or from CoinGecko if Coinbase is unavailable, and applies to every purchase in that hour. If no valid rate exists, the purchase is refused and no ICP is taken.";
      maxRateAgeSeconds = OracleLib.MAX_RATE_AGE_NS / 1_000_000_000;
      tokenPriceUsd = TOKEN_PRICE_USD;
      cyclesFeeBps = TreasuryLib.CYCLES_FEE_BPS;
      buyerPriceUsd = buyerPriceUsd();
      minPurchase = MIN_PURCHASE;
      smallestUnit = 1;
      roundingRule = "TTTI-T amounts are rounded down to 1 base unit (0.00000001 TTTI-T). The ICP cost of a delivered amount is rounded up to 1 e8s (0.00000001 ICP).";
      excessPaymentHandling = "ICP beyond the cost of what is delivered is never taken.";
      deliveryOrder = "Fresh minting first, up to the 1 TTTI-T max supply (100_000_000 base units); what can still be minted is the max supply minus the total supply. Tokens cannot be burned. Transfer fees collected in the fee account are delivered to buyers against ICP only once fresh minting has reached the cap.";
      transferFee = IcrcLib.getFee(ledger);
      maxSupply = IcrcLib.getMaxSupply();
      totalSupply = IcrcLib.totalSupply(ledger);
      feeAccount;
      feeAccountBalance = IcrcLib.balanceOf(ledger, feeAccount);
      cyclesReserveAccount = CyclesReserveLib.reserveAccount(canister);
      reserveFloorE8s = CyclesReserveLib.RESERVE_FLOOR_E8S;
      reserveRule = CyclesReserveLib.RESERVE_RULE;
      controllers = canisterInfo.controllers;
      moduleHash = CanisterInfoLib.moduleHashHex(canisterInfo);
      canisterInfoFetchedAt = canisterInfo.fetchedAt;
      legacyBlockBoundary = IcrcLib.legacyBlockInfo(ledger).boundaryIndex;
    };
  };

  public func setSalesPaused(sale : SaleStore, paused : Bool) : () {
    sale.salesPaused := paused;
  };

  // --- One-time purchase acknowledgement -------------------------------------

  // True when `caller` already accepted the six purchase acknowledgements.
  public func hasAccepted(store : AcknowledgementStore, caller : Principal) : Bool {
    not caller.isAnonymous() and store.containsKey(caller);
  };

  // The caller's acknowledgement (accepted = false, acceptedAt = null when
  // none recorded, including anonymous callers).
  public func getAcknowledgement(store : AcknowledgementStore, caller : Principal) : PurchaseAcknowledgement {
    if (caller.isAnonymous()) {
      return { accepted = false; acceptedAt = null };
    };
    switch (store.get(caller)) {
      case (?at) { { accepted = true; acceptedAt = ?at } };
      case null { { accepted = false; acceptedAt = null } };
    };
  };

  // Records the acceptance once for a signed-in caller (idempotent: a repeat
  // call keeps the first timestamp); anonymous -> #err(#anonymousCaller).
  public func accept(store : AcknowledgementStore, caller : Principal, now : Sale.AcknowledgedAt) : { #ok : PurchaseAcknowledgement; #err : AcknowledgementError } {
    if (caller.isAnonymous()) {
      return #err(#anonymousCaller);
    };
    let at = switch (store.get(caller)) {
      case (?first) { first };
      case null {
        store.add(caller, now);
        now;
      };
    };
    #ok({ accepted = true; acceptedAt = ?at });
  };

  // --- Purchase pipeline -----------------------------------------------------

  func refusal(code : Sale.PurchaseErrorCode, message : Text) : PurchaseError {
    { code; message; conversion = null };
  };

  let PRICE_UNAVAILABLE_MESSAGE = "No valid ICP/USD rate is available for this hour; no ICP was taken. Please try again in a few minutes";

  // Checks shared by purchases, before any price use.
  func gate(sale : SaleStore, treasury : TreasuryLib.TreasuryStore, ledger : IcrcLib.Ledger, canister : Principal, amount : Nat) : ?PurchaseError {
    if (treasury.config == null) {
      return ?refusal(#notConfigured, "The TTTI-T sale is not configured yet");
    };
    if (amount == 0) {
      return ?refusal(#invalidAmount, "The amount must be greater than zero");
    };
    if (sale.salesPaused) {
      return ?refusal(#salesPaused, "Sales are paused");
    };
    if (available(sale, ledger, canister) == 0 and sale.reserved == 0) {
      return ?refusal(#saleComplete, "TTTI-T sale complete: no TTTI-T left to sell");
    };
    null;
  };

  func release(sale : SaleStore, amount : Nat) {
    sale.reserved := if (sale.reserved >= amount) Nat.sub(sale.reserved, amount) else 0;
  };

  // ICP-amount purchase (convertDeposit): refuses a caller without the
  // one-time acknowledgement; uses the stored hourly rate only (no outcall);
  // an absent or expired rate is refused with #priceUnavailable before any
  // ICP is taken.
  public func purchase(ctx : PurchaseContext, buyer : Principal, recipient : ?Account, icpAmount : Nat) : async PurchaseResult {
    if (buyer.isAnonymous()) {
      return #Err(refusal(#anonymousCaller, "Please sign in to buy TTTI-T"));
    };
    if (not hasAccepted(ctx.acknowledgements, buyer)) {
      return #Err(refusal(#acknowledgementRequired, "Please accept the purchase acknowledgements first; no ICP was taken"));
    };
    switch (gate(ctx.sale, ctx.treasury, ctx.ledger, ctx.canister, icpAmount)) {
      case (?err) { return #Err(err) };
      case null {};
    };
    let usdE8 = switch (OracleLib.usableRate(ctx.oracle, Time.now())) {
      case (?rate) { rate };
      case null {
        return #Err(refusal(#priceUnavailable, PRICE_UNAVAILABLE_MESSAGE));
      };
    };
    let requested = TreasuryLib.tttiFromPrice(icpAmount, usdE8);
    let avail = available(ctx.sale, ctx.ledger, ctx.canister);
    if (requested < MIN_PURCHASE and requested < avail) {
      return #Err(refusal(
        #belowMinimum({ minimumTtti = MIN_PURCHASE; requestedTtti = requested }),
        "The minimum purchase is 0.0001 TTTI-T (this ICP amount buys " # TreasuryLib.formatE8(requested) # " TTTI-T)",
      ));
    };
    if (avail == 0) {
      return #Err(refusal(
        #aboveRemaining({ maximumTtti = 0; maximumIcpE8s = 0; requestedTtti = requested }),
        "No TTTI-T is available right now; other purchases are in progress. Please try again in a moment",
      ));
    };
    // Cap at what can still be delivered; only its cost is pulled.
    let tttiAmount = Nat.min(requested, avail);
    let cost = TreasuryLib.icpForExactTtti(tttiAmount, usdE8) ?? icpAmount;
    await execute(ctx, buyer, recipient, tttiAmount, Nat.min(cost, icpAmount), usdE8);
  };

  // Reserve -> collect -> deliver (mint first) -> refund on failure -> commit,
  // record, forward. Called with all checks passed and no await since them.
  func execute(ctx : PurchaseContext, buyer : Principal, recipient : ?Account, tttiAmount : Nat, cost : Nat, usdE8 : Nat) : async PurchaseResult {
    let delivery : Account = switch (recipient) {
      case (?r) { r };
      case null { ctx.treasury.depositRecipients.get(buyer) ?? { owner = buyer; subaccount = null } };
    };
    if (delivery == IcrcLib.feeCollectorAccount(ctx.canister) or delivery == IcrcLib.burnAccount(ctx.canister)) {
      return #Err(refusal(#invalidAmount, "This delivery account cannot receive TTTI-T; no ICP was taken"));
    };
    let config = ctx.treasury.config ?? (return #Err(refusal(#notConfigured, "The TTTI-T sale is not configured yet")));
    let canisterAccount : Account = { owner = ctx.canister; subaccount = null };

    // RESERVE before the first ledger await.
    ctx.sale.reserved += tttiAmount;

    switch (await TreasuryLib.collectIcp(ctx.icpLedger, buyer, canisterAccount, cost)) {
      case (#ok(_)) {};
      case (#ledgerError(err)) {
        release(ctx.sale, tttiAmount);
        let message = TreasuryLib.transferFromErrorMessage(err);
        let code : Sale.PurchaseErrorCode = switch (err) {
          case (#InsufficientAllowance({ allowance })) { #approvalMissing({ allowance }) };
          case (#InsufficientFunds({ balance })) { #insufficientIcp({ balance }) };
          case (_) { #icpLedgerError };
        };
        return #Err(refusal(code, message));
      };
      case (#callFailed(reason)) {
        release(ctx.sale, tttiAmount);
        return #Err(refusal(#icpLedgerError, "The ICP ledger could not be reached: " # reason));
      };
    };

    let base : Sale.Conversion = {
      id = 0;
      depositor = buyer;
      recipient = delivery;
      icpAmount = cost;
      tttiAmount;
      status = #completed;
      timestamp = 0;
      priceUsdE8 = usdE8;
      usedFallback = false;
      minted = 0;
      fromCollector = 0;
      forward = #pending;
      message = null;
    };

    switch (IcrcLib.deliverMintFirst(ctx.ledger, ctx.canister, delivery, tttiAmount)) {
      case (#ok({ minted; fromCollector })) {
        release(ctx.sale, tttiAmount);
        ctx.sale.sold += tttiAmount;
        let recorded = TreasuryLib.recordConversion(ctx.treasury, { base with minted; fromCollector });
        // Fee split: the 1% share goes to the cycles reserve (ledger fee paid
        // on top by the canister account); the rest is forwarded to the treasury.
        let share = CyclesReserveLib.reserveShare(cost);
        let treasuryE8s = CyclesReserveLib.treasuryShare(cost, share);
        let claim = CyclesReserveLib.recordShare(ctx.cyclesReserve, recorded.id, share, treasuryE8s);
        await CyclesReserveLib.transferShare(ctx.cyclesReserve, ctx.icpLedger, ctx.canister, claim);
        let forward = await TreasuryLib.forwardIcp(ctx.icpLedger, canisterAccount, config.icpAccount, treasuryE8s);
        let latest = ctx.treasury.conversions.get(recorded.id) ?? recorded;
        let message : ?Text = switch (forward) {
          case (#failed(reason)) { ?("ICP forwarding to the treasury failed: " # reason) };
          case (_) { null };
        };
        let updated = { latest with forward; message };
        TreasuryLib.updateConversion(ctx.treasury, updated);
        let reserve = ctx.cyclesReserve;
        await TreasuryLib.retryFailedForwards(ctx.treasury, ctx.icpLedger, canisterAccount, func c = CyclesReserveLib.forwardBase(reserve, c));
        await CyclesReserveLib.retryFailedShareTransfers(ctx.cyclesReserve, ctx.icpLedger, ctx.canister);
        #Ok(ctx.treasury.conversions.get(updated.id) ?? updated);
      };
      case (#err(reason)) {
        release(ctx.sale, tttiAmount);
        switch (await TreasuryLib.refundIcp(ctx.icpLedger, buyer, cost)) {
          case (#ok(_)) {
            let message = "TTTI-T delivery failed (" # reason # "); the ICP was refunded minus the 0.0001 ICP ledger fee";
            let recorded = TreasuryLib.recordConversion(ctx.treasury, { base with status = #refunded; forward = #notRequired; message = ?message });
            #Err({ code = #deliveryFailedRefunded; message; conversion = ?recorded });
          };
          case (#err(refundReason)) {
            let message = "TTTI-T delivery failed (" # reason # ") and the ICP refund also failed (" # refundReason # "); this purchase needs manual follow-up";
            let recorded = TreasuryLib.recordConversion(ctx.treasury, { base with status = #refundFailed; forward = #notRequired; message = ?message });
            #Err({ code = #deliveryFailedRefundFailed; message; conversion = ?recorded });
          };
        };
      };
    };
  };

  // Pipeline: caller not anonymous -> acknowledgement accepted -> configured ->
  // amount > 0 -> not paused -> not complete -> stored hourly ICP/USD rate
  // usable (refuse #priceUnavailable before any ICP is taken; no outcall, no
  // fallback rate) ->
  // price at 10 000 USD + fixed 1% fee (TTTI-T rounded down to 1 base unit) ->
  // minimum / available checks -> deliver at most `available` and pull only
  // its ceiling ICP cost (excess never pulled) -> RESERVE before the first ICP
  // await -> collect ICP -> IcrcLib.deliverMintFirst (fresh mint first, fee
  // account only after the mint cap) -> refund minus ICP fee on delivery
  // failure -> commit reserved -> sold, record conversion, forward ICP to the
  // treasury account, retry failed forwards. Never traps.

  // --- Delivery address ------------------------------------------------------

  func addressError(code : Sale.DeliveryAddressErrorCode, message : Text) : DeliveryAddressError {
    { code; message };
  };

  func isHex(text : Text) : Bool {
    text.chars().all(func c = (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F'));
  };

  // Validates principal text without trapping (base32 + CRC32 round-trip via
  // Principal.fromBlob(...).toText() == input). Rejects empty text, a
  // 64-hex-character legacy account identifier ("This is an account ID; please
  // paste your Principal ID instead"), invalid text and the anonymous principal.
  public func parseDeliveryAddress(text : Text) : { #ok : Principal; #err : DeliveryAddressError } {
    let trimmed = text.trim(#predicate(func c = c == ' ' or c == '\t' or c == '\n' or c == '\r'));
    if (trimmed.size() == 0) {
      return #err(addressError(#empty, "Please paste your Principal ID"));
    };
    if (trimmed.size() == 64 and isHex(trimmed)) {
      return #err(addressError(#accountIdentifier, "This is an account ID; please paste your Principal ID instead"));
    };
    let invalid = addressError(#invalidPrincipal, "This is not a valid Principal ID; please check it and paste it again");
    let lower = trimmed.toLower();

    // Base32 (RFC 4648, lowercase, no padding) decode, ignoring dashes.
    let bytes = List.empty<Nat8>();
    var buffer = 0;
    var bits = 0;
    for (c in lower.chars()) {
      if (c != '-') {
        let code = c.toNat32().toNat();
        let value : Int = if (code >= 97 and code <= 122) {
          code - 97;
        } else if (code >= 50 and code <= 55) {
          code - 24;
        } else {
          -1;
        };
        if (value < 0) {
          return #err(invalid);
        };
        buffer := buffer * 32 + value.toNat();
        bits += 5;
        if (bits >= 8) {
          let rest : Int = bits - 8;
          bits := rest.toNat();
          let divisor = 2 ** bits;
          bytes.add((buffer / divisor).toNat8());
          buffer := buffer % divisor;
        };
      };
    };
    // 4 CRC32 bytes + 1..29 principal bytes.
    if (bytes.size() < 5 or bytes.size() > 33) {
      return #err(invalid);
    };
    let body = List.empty<Nat8>();
    var index = 0;
    for (b in bytes.values()) {
      if (index >= 4) {
        body.add(b);
      };
      index += 1;
    };
    let principal = Principal.fromBlob(body.toArray().toBlob());
    // The canonical text re-encodes the CRC and dash grouping.
    if (principal.toText() != lower) {
      return #err(invalid);
    };
    if (principal.isAnonymous()) {
      return #err(addressError(#anonymousPrincipal, "The anonymous principal cannot receive TTTI-T; please paste your own Principal ID"));
    };
    #ok(principal);
  };

  // Stores { owner = parsed; subaccount = null } for `caller` (anonymous caller refused).
  public func setDeliveryAddress(addresses : Map.Map<Principal, Account>, caller : Principal, text : Text) : DeliveryAddressResult {
    if (caller.isAnonymous()) {
      return #Err(addressError(#anonymousCaller, "Please sign in to set a delivery address"));
    };
    switch (parseDeliveryAddress(text)) {
      case (#ok(owner)) {
        let account : Account = { owner; subaccount = null };
        addresses.add(caller, account);
        #Ok(account);
      };
      case (#err(err)) { #Err(err) };
    };
  };

  public func getDeliveryAddress(addresses : Map.Map<Principal, Account>, caller : Principal) : ?Account {
    addresses.get(caller);
  };

  // Returns true when an address was removed.
  public func clearDeliveryAddress(addresses : Map.Map<Principal, Account>, caller : Principal) : Bool {
    switch (addresses.take(caller)) {
      case (?_) { true };
      case null { false };
    };
  };

  // --- Balance snapshot ------------------------------------------------------

  // Built from IcrcLib.listBalances: non-zero balances, delivery address per
  // holder principal, needsMigration = no delivery address (false for the fee
  // collector, which is labeled #feeCollector).
  public func snapshot(ledger : IcrcLib.Ledger, canister : Principal, addresses : Map.Map<Principal, Account>) : BalanceSnapshot {
    let feeCollector = IcrcLib.feeCollectorAccount(canister);
    func entry(holding : IcrcLib.HolderBalance) : Sale.SnapshotEntry {
      if (holding.account == feeCollector) {
        {
          account = holding.account;
          balance = holding.balance;
          deliveryAddress = null;
          needsMigration = false;
          kind = #feeCollector;
        };
      } else {
        let deliveryAddress = addresses.get(holding.account.owner);
        {
          account = holding.account;
          balance = holding.balance;
          deliveryAddress;
          needsMigration = deliveryAddress == null;
          kind = #holder;
        };
      };
    };
    {
      exportedAt = Time.now().toNat().toNat64();
      totalSupply = IcrcLib.totalSupply(ledger);
      decimals = IcrcLib.decimals();
      holders = IcrcLib.listBalances(ledger).filter(func h = h.balance > 0).map(entry);
    };
  };
};
