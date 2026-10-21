import Blob "mo:core/Blob";
import Error "mo:core/Error";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Timer "mo:core/Timer";
import Types "../types/canister-info";

// Controllers and module hash of this canister, read from the management
// canister's canister_info and cached for getTechnicalDetails.
module {
  public type CanisterInfoStore = Types.CanisterInfoStore;
  public type ManagementCanister = Types.ManagementCanister;

  // Daily refresh interval.
  public let REFRESH_INTERVAL_SECONDS : Nat = 86_400;

  let HEX_DIGITS : [Char] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

  public func managementCanister() : ManagementCanister = actor ("aaaaa-aa");

  // Reads canister_info for `canister`; on success stores controllers, module
  // hash and fetchedAt; on failure records lastError and keeps the cache.
  public func refresh(store : CanisterInfoStore, canister : Principal) : async* () {
    try {
      let info = await managementCanister().canister_info({
        canister_id = canister;
        num_requested_changes = null;
      });
      store.controllers := ?info.controllers;
      store.moduleHash := info.module_hash;
      store.fetchedAt := ?Time.now();
      store.lastError := null;
    } catch (e) {
      store.lastError := ?{ message = e.message(); at = Time.now() };
    };
  };

  // The cached module hash as lowercase hex, or null when not read yet.
  public func moduleHashHex(store : CanisterInfoStore) : ?Text {
    switch (store.moduleHash) {
      case (null) null;
      case (?hash) {
        var out = "";
        for (b in hash.values()) {
          let n = b.toNat();
          out #= Text.fromChar(HEX_DIGITS[n / 16]) # Text.fromChar(HEX_DIGITS[n % 16]);
        };
        ?out;
      };
    };
  };

  // Called on every install and upgrade: an immediate read, then once a day.
  public func startTimer<system>(store : CanisterInfoStore, canister : Principal) {
    ignore Timer.setTimer<system>(#seconds 0, func() : async () { await* refresh(store, canister) });
    ignore Timer.recurringTimer<system>(#seconds REFRESH_INTERVAL_SECONDS, func() : async () { await* refresh(store, canister) });
  };
};
