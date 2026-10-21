import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Common "common";
import Oracle "oracle";
import Treasury "treasury";

module {
  public type Account = Common.Account;
  public type Timestamp = Common.Timestamp;
  public type Conversion = Treasury.Conversion;

  // --- Sale status -----------------------------------------------------------

  // All TTTI-T amounts are base units (8 decimals, 1 TTTI-T = 100_000_000).
  // `mintableRemaining` = max(0, maxSupply - totalSupply) (fresh minting left;
  // tokens cannot be burned, so total supply never decreases).
  // `available` = mintableRemaining + feeAccountBalance - reserved: what can
  // still be sold (fee-account tokens are sold only after the mint cap).
  // `complete` = available == 0 and nothing is reserved.
  public type SaleStatus = {
    maxSupply : Nat; // 100_000_000 (1 TTTI-T)
    totalSupply : Nat;
    mintableRemaining : Nat;
    feeAccountBalance : Nat;
    sold : Nat; // delivered by the sale (cumulative)
    reserved : Nat; // held for in-flight purchases
    available : Nat;
    complete : Bool;
    minPurchase : Nat; // 10_000 (0.0001 TTTI-T)
    tokenPriceUsd : Nat; // 10_000 USD per whole TTTI-T (base price)
    cyclesFeeBps : Nat; // 100 = fixed 1% fee for canister running costs
    buyerPriceUsd : Nat; // 10_100 USD per whole TTTI-T (base price + fee)
    salesPaused : Bool;
    // The stored hourly ICP/USD rate, exactly the one convertDeposit applies.
    priceUsdE8 : Nat; // ICP/USD * 10^8, 0 = no rate
    priceSource : Oracle.PriceSource;
    priceFetchedAt : Oracle.Timestamp; // nanoseconds (Int), 0 = never
    priceValidUntil : Oracle.Timestamp; // fetchedAt + 1 h, nanoseconds (Int), 0 = never
    priceUsable : Bool; // rate exists and now <= validUntil + 5 minutes
    liveRate : ?Nat; // TTTI-T base units per whole ICP at the stored rate, fee included
  };

  // --- One-time purchase acknowledgement -------------------------------------

  // Nanoseconds since epoch (Time.now()).
  public type AcknowledgedAt = Int;

  // Per principal: when the caller accepted the six purchase acknowledgements.
  public type AcknowledgementStore = Map.Map<Principal, AcknowledgedAt>;

  public type PurchaseAcknowledgement = {
    accepted : Bool;
    acceptedAt : ?AcknowledgedAt; // null when not accepted
  };

  public type AcknowledgementError = {
    #anonymousCaller;
  };

  // --- Technical details (public) ---------------------------------------------

  public type TechnicalDetails = {
    ledgerCanisterId : Principal; // this canister
    tokenName : Text; // "TTTI-T"
    tokenSymbol : Text; // "TTTI-T"
    decimals : Nat8; // 8
    standards : [Text]; // ICRC-1, ICRC-2, ICRC-3, ICRC-10
    icpLedgerCanisterId : Principal; // ryjl3-tyaaa-aaaaa-aaaba-cai
    oracleSources : [Text]; // Coinbase ICP-USD spot, CoinGecko backup
    refreshPolicy : Text; // on demand at purchase
    maxRateAgeSeconds : Nat; // 300
    tokenPriceUsd : Nat; // 10_000
    cyclesFeeBps : Nat; // 100
    buyerPriceUsd : Nat; // 10_100
    minPurchase : Nat; // 10_000 base units
    smallestUnit : Nat; // 1 base unit = 0.00000001 TTTI-T
    roundingRule : Text;
    excessPaymentHandling : Text;
    deliveryOrder : Text;
    transferFee : Nat; // current transfer fee, base units
    maxSupply : Nat;
    totalSupply : Nat;
    feeAccount : Account;
    feeAccountBalance : Nat;
    cyclesReserveAccount : Account; // this canister + CYCLES_RESERVE subaccount
    reserveFloorE8s : Nat; // 200_000_000 (2 ICP) always kept for cycles
    reserveRule : Text;
    // From the management canister's canister_info (cached; null until read).
    controllers : ?[Principal];
    moduleHash : ?Text; // lowercase hex SHA-256 of the installed Wasm
    canisterInfoFetchedAt : ?Int; // nanoseconds, last successful read
    // Blocks with index < legacyBlockBoundary come from earlier test versions (4 decimals).
    legacyBlockBoundary : Nat;
  };

  // --- Purchase pipeline -----------------------------------------------------

  public type PurchaseErrorCode = {
    #anonymousCaller;
    // The caller already has a convertDeposit in flight; refused immediately,
    // with no external call.
    #purchaseInProgress;
    #acknowledgementRequired; // the six purchase acknowledgements are not accepted yet
    #notConfigured;
    #salesPaused; // "Sales are paused"
    #saleComplete; // "TTTI-T sale complete: no TTTI-T left to sell"
    #invalidAmount;
    #belowMinimum : { minimumTtti : Nat; requestedTtti : Nat };
    #aboveRemaining : { maximumTtti : Nat; maximumIcpE8s : Nat; requestedTtti : Nat };
    // No stored ICP/USD rate, or past validUntil + 5 minutes; no ICP taken.
    #priceUnavailable;
    #approvalMissing : { allowance : Nat };
    #insufficientIcp : { balance : Nat };
    #icpLedgerError; // any other ICP ledger error or rejected call
    #deliveryFailedRefunded;
    #deliveryFailedRefundFailed;
  };

  // `message` is the user-facing text. `conversion` is the recorded conversion
  // when one was written (failed / refunded / refundFailed), otherwise null.
  public type PurchaseError = {
    code : PurchaseErrorCode;
    message : Text;
    conversion : ?Conversion;
  };

  public type PurchaseResult = {
    #Ok : Conversion;
    #Err : PurchaseError;
  };

  // --- Delivery address ------------------------------------------------------

  public type DeliveryAddressErrorCode = {
    #anonymousCaller;
    #empty;
    #accountIdentifier; // "This is an account ID; please paste your Principal ID instead"
    #invalidPrincipal;
    #anonymousPrincipal;
  };

  public type DeliveryAddressError = {
    code : DeliveryAddressErrorCode;
    message : Text;
  };

  public type DeliveryAddressResult = {
    #Ok : Account;
    #Err : DeliveryAddressError;
  };

  // --- Balance snapshot export -----------------------------------------------

  public type HolderKind = {
    #holder;
    #feeCollector;
  };

  // `needsMigration` is true when the holder principal has no delivery address
  // (always false for the fee collector).
  public type SnapshotEntry = {
    account : Account;
    balance : Nat;
    deliveryAddress : ?Account;
    needsMigration : Bool;
    kind : HolderKind;
  };

  public type BalanceSnapshot = {
    exportedAt : Timestamp; // nanoseconds
    totalSupply : Nat;
    decimals : Nat8;
    holders : [SnapshotEntry]; // non-zero balances only
  };
};
