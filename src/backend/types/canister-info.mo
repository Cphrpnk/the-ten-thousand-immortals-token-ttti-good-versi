module {
  // Nanoseconds since epoch (Time.now()).
  public type Timestamp = Int;

  // Last failed canister_info read: the exact error text and when it happened.
  public type CanisterInfoError = {
    message : Text;
    at : Timestamp;
  };

  // Cached result of the management canister's canister_info for this canister.
  // Refreshed by a daily timer and right after every install/upgrade.
  public type CanisterInfoStore = {
    var controllers : ?[Principal]; // null until the first successful read
    var moduleHash : ?Blob; // SHA-256 of the installed Wasm module
    var fetchedAt : ?Timestamp; // last successful read
    var lastError : ?CanisterInfoError;
  };

  // Management canister canister_info (only the fields this canister reads;
  // Candid ignores the other response fields).
  public type CanisterInfoArgs = {
    canister_id : Principal;
    num_requested_changes : ?Nat64;
  };

  public type CanisterInfoResult = {
    module_hash : ?Blob;
    controllers : [Principal];
  };

  public type ManagementCanister = actor {
    canister_info : CanisterInfoArgs -> async CanisterInfoResult;
  };
};
