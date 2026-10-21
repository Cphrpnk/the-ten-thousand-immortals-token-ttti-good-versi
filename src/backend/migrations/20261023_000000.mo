import Nat64 "mo:core/Nat64";

// Hourly ICP/USD rate: the oracle record is rebuilt into the new store. The
// existing usdE8 / source are kept, updatedAt becomes fetchedAt (Int ns) and
// validUntil = fetchedAt + 1 h (an old rate is simply expired). No other
// state is touched.
module {
  type PriceSource = {
    #none;
    #coinbase;
    #coingecko;
  };

  type OldOracleStore = {
    var usdE8 : Nat;
    var updatedAt : Nat64;
    var source : PriceSource;
  };

  type OldActor = {
    oracle : OldOracleStore;
  };

  type PriceError = {
    message : Text;
    at : Int;
  };

  type OracleStore = {
    var usdE8 : Nat;
    var source : PriceSource;
    var fetchedAt : Int;
    var validUntil : Int;
    var lastError : ?PriceError;
    var lastSuccessAt : ?Int;
  };

  type NewActor = {
    oracle : OracleStore;
  };

  let VALID_FOR_NS : Int = 3_600_000_000_000;

  public func migration(old : OldActor) : NewActor {
    let o = old.oracle;
    let hasRate = o.updatedAt != 0 and o.usdE8 != 0;
    let fetchedAt : Int = if (hasRate) o.updatedAt.toNat() else 0;
    {
      oracle = {
        var usdE8 = if (hasRate) o.usdE8 else 0;
        var source = if (hasRate) o.source else #none;
        var fetchedAt = fetchedAt;
        var validUntil = if (hasRate) fetchedAt + VALID_FOR_NS else 0;
        var lastError = null;
        var lastSuccessAt = if (hasRate) ?fetchedAt else null;
      };
    };
  };
};
