import List "mo:core/List";
import Map "mo:core/Map";

// Cycles reserve: adds the new reserve store, initialized empty. No existing
// state (balances, blocks, conversions) is touched.
module {
  type TopUpStatus = {
    #transferred;
    #notified : { cycles : Nat };
    #failed : Text;
  };

  type TopUpRecord = {
    timestamp : Int;
    icpE8s : Nat;
    blockIndex : Nat;
    status : TopUpStatus;
    lastError : ?Text;
  };

  type ReserveWithdrawal = {
    timestamp : Int;
    amountE8s : Nat;
    blockIndex : Nat;
  };

  type ReserveTransferStatus = {
    #pending;
    #transferred : Nat;
    #failed : Text;
  };

  type ReserveShare = {
    conversionId : Nat;
    shareE8s : Nat;
    treasuryE8s : Nat;
    transfer : ReserveTransferStatus;
  };

  type CyclesReserveStore = {
    var reserveBalanceE8s : Nat;
    var lastTopUp : ?TopUpRecord;
    withdrawals : List.List<ReserveWithdrawal>;
    shares : Map.Map<Nat, ReserveShare>;
  };

  type OldActor = {};

  type NewActor = {
    cyclesReserve : CyclesReserveStore;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      cyclesReserve = {
        var reserveBalanceE8s = 0;
        var lastTopUp = null;
        withdrawals = List.empty();
        shares = Map.empty();
      };
    };
  };
};
