import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Treasury "../types/treasury";
import Sale "../types/presale";
import TreasuryLib "../lib/treasury";
import SaleLib "../lib/presale";
import IcrcLib "../lib/icrc";
import OracleLib "../lib/oracle";
import CyclesReserveLib "../lib/cycles-reserve";

// Treasury configuration (the account that receives the creator's ICP),
// conversion history and the buy-to-mint purchase endpoint. Each delivered
// purchase sends its 1% fee share to the cycles reserve and the rest to the
// treasury; the TTTI-T fee collector can never be withdrawn.
mixin (
  treasury : TreasuryLib.TreasuryStore,
  sale : SaleLib.SaleStore,
  ledger : IcrcLib.Ledger,
  accessControlState : AccessControl.AccessControlState,
  canisterPrincipal : Principal,
  oracle : OracleLib.OracleStore,
  acknowledgements : Sale.AcknowledgementStore,
  cyclesReserve : CyclesReserveLib.CyclesReserveStore,
) {
  // The ICP ledger canister (mainnet). Transient: a capability handle.
  transient let icpLedger : TreasuryLib.IcpLedger = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai");

  // Principals with a convertDeposit in flight (one purchase per principal).
  // Transient: in-flight state does not survive an upgrade meaningfully.
  transient let purchasesInFlight = Set.empty<Principal>();

  // The canister's own principal: the ICRC-2 spender the buyer must approve
  // on the ICP ledger, and the owner of the account ICP is collected into.
  public query func getCanisterPrincipal() : async Principal {
    canisterPrincipal;
  };

  func requireAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: only admins can manage the treasury");
    };
  };

  func purchaseContext() : SaleLib.PurchaseContext {
    {
      sale;
      treasury;
      ledger;
      oracle;
      acknowledgements;
      icpLedger;
      canister = canisterPrincipal;
      cyclesReserve;
    };
  };

  // --- Configuration ---------------------------------------------------------

  // Admin only: the account that receives the creator's ICP.
  public shared ({ caller }) func setTreasuryConfig(config : Treasury.TreasuryConfig) : async Treasury.TreasuryConfigResult {
    requireAdmin(caller);
    TreasuryLib.setConfig(treasury, config);
  };

  // Admin only: the full configuration.
  public query ({ caller }) func getTreasuryConfig() : async ?Treasury.TreasuryConfig {
    requireAdmin(caller);
    TreasuryLib.getConfig(treasury);
  };

  // Public: what the Buy page needs (no buyer data).
  public query func getPublicTreasuryInfo() : async ?Treasury.PublicTreasuryInfo {
    TreasuryLib.publicInfo(treasury);
  };

  // Admin only: every recorded conversion (purchase history).
  public query ({ caller }) func getConversions() : async [Treasury.Conversion] {
    requireAdmin(caller);
    TreasuryLib.getConversions(treasury);
  };

  // --- Purchase (signed-in callers who accepted the acknowledgements) --------

  // `recipient` = explicit delivery account, or null to use the caller's
  // stored delivery address, otherwise the caller's principal. Only the cost
  // of the TTTI-T actually delivered is pulled; the rest is never taken.
  // One purchase in flight per principal: a second concurrent call is refused
  // with #purchaseInProgress before any await or external call. The lock is
  // released on every exit (including a trap after an await) by `finally`.
  public shared ({ caller }) func convertDeposit(recipient : ?Common.Account, icpAmount : Nat) : async Sale.PurchaseResult {
    if (purchasesInFlight.contains(caller)) {
      return #Err({
        code = #purchaseInProgress;
        message = "A purchase is already in progress for this account; please wait for it to finish. No ICP was taken";
        conversion = null;
      });
    };
    purchasesInFlight.add(caller);
    try {
      await SaleLib.purchase(purchaseContext(), caller, recipient, icpAmount);
    } finally {
      purchasesInFlight.remove(caller);
    };
  };
};
