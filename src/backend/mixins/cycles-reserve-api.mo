import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/cycles-reserve";
import CyclesReserveLib "../lib/cycles-reserve";
import TreasuryLib "../lib/treasury";

// Public cycles reserve transparency and the admin withdrawal of the excess
// above the 2 ICP floor (to the configured treasury account only).
mixin (
  cyclesReserve : CyclesReserveLib.CyclesReserveStore,
  reserveLock : CyclesReserveLib.ReserveLock,
  treasury : TreasuryLib.TreasuryStore,
  accessControlState : AccessControl.AccessControlState,
  canisterPrincipal : Principal,
) {
  func requireReserveAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: only the administrator can withdraw the cycles reserve excess");
    };
  };

  // Public: cycles balance, threshold, reserve, floor, excess, last top-up
  // and withdrawal history.
  public query func getCyclesStatus() : async Types.CyclesStatus {
    CyclesReserveLib.status(cyclesReserve, canisterPrincipal);
  };

  // Admin only (non-admin callers trap).
  public shared ({ caller }) func withdrawReserveExcess(amount : Nat) : async Types.WithdrawReserveResult {
    requireReserveAdmin(caller);
    await CyclesReserveLib.withdrawExcess(cyclesReserve, reserveLock, treasury, canisterPrincipal, amount);
  };
};
