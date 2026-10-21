import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Subset migration: every existing actor field is carried forward
  // unchanged; this entry only introduces the per-user setup status map.
  type OldActor = {};
  type SetupStatus = {
    #notStarted;
    #completed;
    #skipped;
  };
  type SetupRecord = {
    status : SetupStatus;
    updatedAt : Int;
  };
  type NewActor = {
    setupStatuses : Map.Map<Principal, SetupRecord>;
  };

  public func migration(_old : OldActor) : NewActor {
    { setupStatuses = Map.empty() };
  };
};
