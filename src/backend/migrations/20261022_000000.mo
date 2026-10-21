import Map "mo:core/Map";
import CorePrincipal "mo:core/Principal";

// Definitive mint cap: the ledger state gains a cumulative `totalMinted`
// counter (never decreased by a burn), initialised to the current
// totalSupply. Balances, approvals, blocks, dedup and every other ledger
// field are carried over unchanged.
module {
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

  // --- Old state -------------------------------------------------------------

  type OldLedgerState = {
    var totalSupply : Nat;
    var fee : Nat;
    var nextBlockIndex : Nat;
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

  type OldActor = {
    ledger : OldLedger;
  };

  // --- New state -------------------------------------------------------------

  type LedgerState = {
    var totalSupply : Nat;
    var totalMinted : Nat;
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

  type NewActor = {
    ledger : Ledger;
  };

  // --- Migration -------------------------------------------------------------

  public func migration(old : OldActor) : NewActor {
    let s = old.ledger.state;
    {
      ledger = {
        balances = old.ledger.balances;
        approvals = old.ledger.approvals;
        blocks = old.ledger.blocks;
        state = {
          var totalSupply = s.totalSupply;
          var totalMinted = s.totalSupply;
          var fee = s.fee;
          var nextBlockIndex = s.nextBlockIndex;
          legacyBlockBoundary = s.legacyBlockBoundary;
          var lastBlockHash = s.lastBlockHash;
        };
        dedup = old.ledger.dedup;
        dedupQueue = old.ledger.dedupQueue;
      };
    };
  };
};
