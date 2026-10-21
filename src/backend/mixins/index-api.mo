import IndexTypes "../types/index";
import IcrcLib "../lib/icrc";
import IndexLib "../lib/index";

// ICRC index-ng interface served by the ledger itself. icrc1_balance_of is
// provided by mixins/icrc-api.mo and is not redeclared here.
mixin (ledger : IcrcLib.Ledger, canisterPrincipal : Principal) {
  public query func get_account_transactions(args : IndexTypes.GetAccountTransactionsArgs) : async IndexTypes.GetTransactionsResult {
    IndexLib.getAccountTransactions(ledger, args);
  };

  public query func ledger_id() : async Principal {
    canisterPrincipal;
  };

  public query func status() : async IndexTypes.IndexStatus {
    IndexLib.status(ledger);
  };

  public query func list_subaccounts(args : IndexTypes.ListSubaccountsArgs) : async [IndexTypes.Subaccount] {
    IndexLib.listSubaccounts(ledger, args);
  };
};
