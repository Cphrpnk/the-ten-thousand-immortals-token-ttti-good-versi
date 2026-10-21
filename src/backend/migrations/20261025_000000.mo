import Map "mo:core/Map";

// Core-contract trim: drops the profile, original white paper and setup-flow
// state. No other state (ledger, balances, blocks, conversions, delivery
// addresses, acknowledgements, stored rate, cycles reserve) is touched.
module {
  type UserProfile = {
    name : Text;
  };

  type ProfileState = {
    profiles : Map.Map<Principal, UserProfile>;
  };

  type OriginalDocument = {
    blob : Blob;
    filename : Text;
    mimeType : Text;
  };

  type DocumentState = {
    var original : ?OriginalDocument;
  };

  type SetupStatus = {
    #notStarted;
    #completed;
    #skipped;
  };

  type SetupRecord = {
    status : SetupStatus;
    updatedAt : Int;
  };

  type OldActor = {
    profileState : ProfileState;
    documentState : DocumentState;
    setupStatuses : Map.Map<Principal, SetupRecord>;
  };

  type NewActor = {};

  public func migration(_old : OldActor) : NewActor {
    {};
  };
};
