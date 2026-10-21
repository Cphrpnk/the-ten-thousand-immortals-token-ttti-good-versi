import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import AccessControl "mo:caffeineai-authorization/access-control";
import Oracle "../types/oracle";
import OracleLib "../lib/oracle";

// `transform` is the actor-level query declared in main.mo.
mixin (
  oracle : OracleLib.OracleStore,
  accessControlState : AccessControl.AccessControlState,
  transform : OutCall.Transform,
) {
  // Returns the stored ICP/USD rate. Callable by anyone, including anonymous.
  // Never performs an outcall.
  public query func getIcpPrice() : async Oracle.IcpPrice {
    OracleLib.getPrice(oracle, Time.now());
  };

  // Admin-only. Allowed only when the current rate is absent or past
  // validUntil; otherwise refused with #Err and no outcall.
  public shared ({ caller }) func refreshIcpPrice() : async Oracle.PriceResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: only admins can refresh the ICP price");
    };
    await OracleLib.adminRefresh(oracle, transform);
  };
};
