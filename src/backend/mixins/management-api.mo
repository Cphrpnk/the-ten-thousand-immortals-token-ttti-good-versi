import Token "../types/token";
import IcrcLib "../lib/icrc";
import AccessControl "mo:caffeineai-authorization/access-control";
import Runtime "mo:core/Runtime";

// Ledger management. There is no mint and no burn method: TTTI-T is created
// only by the sale purchase pipeline, capped at the max supply, and tokens
// cannot be burned.
mixin (ledger : IcrcLib.Ledger, accessControlState : AccessControl.AccessControlState) {
  // Admin-only TTTI-T beta control. Accepts get_fee_bounds().min ..= get_fee_bounds().max.
  public shared ({ caller }) func set_fee(newFee : Nat) : async Token.SetFeeResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: only admins can set the fee");
    };
    IcrcLib.setFee(ledger, newFee);
  };

  public query func get_fee_bounds() : async Token.FeeBounds {
    IcrcLib.feeBounds();
  };

  public query func get_fee() : async Nat {
    IcrcLib.getFee(ledger);
  };

  public query func get_max_supply() : async Nat {
    IcrcLib.getMaxSupply();
  };
};
