import Map "mo:core/Map";
import CorePrincipal "mo:core/Principal";

// TTTI-T mechanics: the admin transfer freeze, the seller margin, the admin
// fallback rate and its switch are removed; the `presale` store becomes
// `sale`. Balances, blocks, approvals, dedup, conversions, delivery addresses
// and on-ramp links are carried over unchanged.
module {
  // --- Shared shapes (unchanged) ---------------------------------------------

  type Account = {
    owner : CorePrincipal.Principal;
    subaccount : ?Blob;
  };

  type Value = {
    #Nat : Nat;
    #Int : Int;
    #Text : Text;
    #Blob : Blob;
    #Array : [Value];
    #Map : [(Text, Value)];
  };

  type Approval = { amount : Nat; expires_at : ?Nat64 };

  type DedupEntry = {
    txHash : Blob;
    ledgerTime : Nat64;
  };

  type TreasuryMode = { #auto; #manual };

  type ConversionStatus = { #completed; #failed; #refunded; #refundFailed };

  type ForwardStatus = {
    #notRequired;
    #pending;
    #forwarded : Nat;
    #failed : Text;
  };

  type OnRampLink = { name : Text; url : Text };

  type Conversion = {
    id : Nat;
    depositor : CorePrincipal.Principal;
    recipient : Account;
    icpAmount : Nat;
    tttiAmount : Nat;
    status : ConversionStatus;
    timestamp : Nat64;
    priceUsdE8 : Nat;
    usedFallback : Bool;
    fromCollector : Nat;
    minted : Nat;
    forward : ForwardStatus;
    message : ?Text;
  };

  // --- Old state -------------------------------------------------------------

  type OldLedgerState = {
    var totalSupply : Nat;
    var fee : Nat;
    var nextBlockIndex : Nat;
    var transfersFrozen : Bool;
    legacyBlockBoundary : Nat;
    var lastBlockHash : ?Blob;
  };

  type OldLedger = {
    balances : Map.Map<Account, Nat>;
    approvals : Map.Map<Account, Map.Map<Account, Approval>>;
    blocks : Map.Map<Nat, Value>;
    state : OldLedgerState;
    dedup : Map.Map<Blob, Nat>;
    dedupQueue : Map.Map<Nat, DedupEntry>;
  };

  type OldTreasuryConfig = {
    icpAccount : Account;
    rate : Nat;
    mode : TreasuryMode;
    marginBps : Nat;
  };

  type OldTreasury = {
    var config : ?OldTreasuryConfig;
    var conversions : Map.Map<Nat, Conversion>;
    var nextConversionId : Nat;
    var depositRecipients : Map.Map<CorePrincipal.Principal, Account>;
    var onRampLinks : [OnRampLink];
  };

  type OldPresale = {
    var sold : Nat;
    var reserved : Nat;
    var salesPaused : Bool;
    var fallbackEnabled : Bool;
  };

  type OldActor = {
    ledger : OldLedger;
    treasury : OldTreasury;
    presale : OldPresale;
  };

  // --- New state -------------------------------------------------------------

  type LedgerState = {
    var totalSupply : Nat;
    var fee : Nat;
    var nextBlockIndex : Nat;
    legacyBlockBoundary : Nat;
    var lastBlockHash : ?Blob;
  };

  type Ledger = {
    balances : Map.Map<Account, Nat>;
    approvals : Map.Map<Account, Map.Map<Account, Approval>>;
    blocks : Map.Map<Nat, Value>;
    state : LedgerState;
    dedup : Map.Map<Blob, Nat>;
    dedupQueue : Map.Map<Nat, DedupEntry>;
  };

  type TreasuryConfig = {
    icpAccount : Account;
    mode : TreasuryMode;
  };

  type Treasury = {
    var config : ?TreasuryConfig;
    var conversions : Map.Map<Nat, Conversion>;
    var nextConversionId : Nat;
    var depositRecipients : Map.Map<CorePrincipal.Principal, Account>;
    var onRampLinks : [OnRampLink];
  };

  type Sale = {
    var sold : Nat;
    var reserved : Nat;
    var salesPaused : Bool;
  };

  type NewActor = {
    ledger : Ledger;
    treasury : Treasury;
    sale : Sale;
  };

  // --- Migration -------------------------------------------------------------

  public func migration(old : OldActor) : NewActor {
    let s = old.ledger.state;
    let t = old.treasury;
    {
      ledger = {
        balances = old.ledger.balances;
        approvals = old.ledger.approvals;
        blocks = old.ledger.blocks;
        state = {
          var totalSupply = s.totalSupply;
          var fee = s.fee;
          var nextBlockIndex = s.nextBlockIndex;
          legacyBlockBoundary = s.legacyBlockBoundary;
          var lastBlockHash = s.lastBlockHash;
        };
        dedup = old.ledger.dedup;
        dedupQueue = old.ledger.dedupQueue;
      };
      treasury = {
        var config = switch (t.config) {
          case (?c) ?{ icpAccount = c.icpAccount; mode = c.mode };
          case null null;
        };
        var conversions = t.conversions;
        var nextConversionId = t.nextConversionId;
        var depositRecipients = t.depositRecipients;
        var onRampLinks = t.onRampLinks;
      };
      sale = {
        var sold = old.presale.sold;
        var reserved = old.presale.reserved;
        var salesPaused = old.presale.salesPaused;
      };
    };
  };
};
