import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Sale "../types/presale";
import SaleLib "../lib/presale";
import TreasuryLib "../lib/treasury";
import IcrcLib "../lib/icrc";
import OracleLib "../lib/oracle";
import CanisterInfoLib "../lib/canister-info";

// TTTI-T sale status, technical details, admin sales pause, the one-time
// purchase acknowledgement, delivery addresses and the balance snapshot export.
mixin (
  sale : SaleLib.SaleStore,
  treasury : TreasuryLib.TreasuryStore,
  ledger : IcrcLib.Ledger,
  oracle : OracleLib.OracleStore,
  accessControlState : AccessControl.AccessControlState,
  canisterPrincipal : Principal,
  acknowledgements : Sale.AcknowledgementStore,
  canisterInfo : CanisterInfoLib.CanisterInfoStore,
) {
  func requireSaleAdmin(caller : Principal) {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: only admins can manage the TTTI-T sale");
    };
  };

  // --- Sale status and technical details (public) ----------------------------

  public query func getSaleStatus() : async Sale.SaleStatus {
    SaleLib.status(sale, treasury, ledger, oracle, canisterPrincipal);
  };

  public query func getTechnicalDetails() : async Sale.TechnicalDetails {
    SaleLib.technicalDetails(ledger, canisterPrincipal, canisterInfo);
  };

  // --- Admin switch (admin-gated) --------------------------------------------

  public shared ({ caller }) func setSalesPaused(paused : Bool) : async () {
    requireSaleAdmin(caller);
    SaleLib.setSalesPaused(sale, paused);
  };

  // --- One-time purchase acknowledgement (per caller) ------------------------

  // Records once that the signed-in caller accepted the six purchase
  // acknowledgements; a repeat call keeps the first record.
  public shared ({ caller }) func acceptPurchaseAcknowledgements() : async { #ok : Sale.PurchaseAcknowledgement; #err : Sale.AcknowledgementError } {
    SaleLib.accept(acknowledgements, caller, Time.now());
  };

  public query ({ caller }) func getMyPurchaseAcknowledgement() : async Sale.PurchaseAcknowledgement {
    SaleLib.getAcknowledgement(acknowledgements, caller);
  };

  // --- Delivery address (per caller) -----------------------------------------

  public shared ({ caller }) func setDeliveryAddress(principalText : Text) : async Sale.DeliveryAddressResult {
    SaleLib.setDeliveryAddress(treasury.depositRecipients, caller, principalText);
  };

  public query ({ caller }) func getDeliveryAddress() : async ?Common.Account {
    SaleLib.getDeliveryAddress(treasury.depositRecipients, caller);
  };

  public shared ({ caller }) func clearDeliveryAddress() : async Bool {
    SaleLib.clearDeliveryAddress(treasury.depositRecipients, caller);
  };

  // --- Balance snapshot export (admin-gated query) ---------------------------

  public query ({ caller }) func exportBalanceSnapshot() : async Sale.BalanceSnapshot {
    requireSaleAdmin(caller);
    SaleLib.snapshot(ledger, canisterPrincipal, treasury.depositRecipients);
  };
};
