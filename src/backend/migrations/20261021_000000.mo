import Map "mo:core/Map";
import CorePrincipal "mo:core/Principal";

// Core contract trim: the treasury mode and the on-ramp link list are
// removed; a per-principal one-time purchase acknowledgement store is added
// (empty). Conversions, delivery addresses and the treasury ICP account are
// carried over unchanged.
module {
  type Account = {
    owner : CorePrincipal.Principal;
    subaccount : ?Blob;
  };

  type TreasuryMode = { #auto; #manual };

  type ConversionStatus = { #completed; #failed; #refunded; #refundFailed };

  type ForwardStatus = {
    #notRequired;
    #pending;
    #forwarded : Nat;
    #failed : Text;
  };

  type OnRampLink = { name : Text; url : Text };

  type Conversion = {
    id : Nat;
    depositor : CorePrincipal.Principal;
    recipient : Account;
    icpAmount : Nat;
    tttiAmount : Nat;
    status : ConversionStatus;
    timestamp : Nat64;
    priceUsdE8 : Nat;
    usedFallback : Bool;
    fromCollector : Nat;
    minted : Nat;
    forward : ForwardStatus;
    message : ?Text;
  };

  // --- Old state -------------------------------------------------------------

  type OldTreasuryConfig = {
    icpAccount : Account;
    mode : TreasuryMode;
  };

  type OldTreasury = {
    var config : ?OldTreasuryConfig;
    var conversions : Map.Map<Nat, Conversion>;
    var nextConversionId : Nat;
    var depositRecipients : Map.Map<CorePrincipal.Principal, Account>;
    var onRampLinks : [OnRampLink];
  };

  type OldActor = {
    treasury : OldTreasury;
  };

  // --- New state -------------------------------------------------------------

  type TreasuryConfig = {
    icpAccount : Account;
  };

  type Treasury = {
    var config : ?TreasuryConfig;
    var conversions : Map.Map<Nat, Conversion>;
    var nextConversionId : Nat;
    var depositRecipients : Map.Map<CorePrincipal.Principal, Account>;
  };

  type NewActor = {
    treasury : Treasury;
    purchaseAcknowledgements : Map.Map<CorePrincipal.Principal, Int>;
  };

  // --- Migration -------------------------------------------------------------

  public func migration(old : OldActor) : NewActor {
    let t = old.treasury;
    {
      treasury = {
        var config = switch (t.config) {
          case (?c) ?{ icpAccount = c.icpAccount };
          case null null;
        };
        var conversions = t.conversions;
        var nextConversionId = t.nextConversionId;
        var depositRecipients = t.depositRecipients;
      };
      purchaseAcknowledgements = Map.empty();
    };
  };
};
