import Common "common";

// Candid types of the official ICRC index-ng interface
// (dfinity/ic rs/ledger_suite/icrc1/index-ng/index-ng.did). Motoko names carry
// an Index prefix so they never collide with existing ledger type names; the
// Candid shapes are structural and match the official .did field for field.
module {
  public type Account = Common.Account;
  public type Subaccount = Common.Subaccount;
  public type BlockIndex = Nat;
  public type Tokens = Nat;

  public type IndexTransfer = {
    to : Account;
    fee : ?Tokens;
    from : Account;
    memo : ?Blob;
    created_at_time : ?Nat64;
    amount : Tokens;
    spender : ?Account;
  };

  public type IndexApprove = {
    fee : ?Tokens;
    from : Account;
    memo : ?Blob;
    created_at_time : ?Nat64;
    amount : Tokens;
    expected_allowance : ?Tokens;
    expires_at : ?Nat64;
    spender : Account;
  };

  public type IndexMint = {
    to : Account;
    memo : ?Blob;
    created_at_time : ?Nat64;
    amount : Tokens;
    fee : ?Nat;
  };

  public type IndexBurn = {
    from : Account;
    memo : ?Blob;
    created_at_time : ?Nat64;
    amount : Tokens;
    spender : ?Account;
    fee : ?Nat;
  };

  public type IndexAuthorizedMint = {
    to : Account;
    amount : Nat;
    created_at_time : ?Nat64;
    caller : ?Principal;
    mthd : ?Text;
    reason : ?Text;
  };

  public type IndexAuthorizedBurn = {
    from : Account;
    amount : Nat;
    created_at_time : ?Nat64;
    caller : ?Principal;
    mthd : ?Text;
    reason : ?Text;
  };

  public type IndexFeeCollector = {
    caller : ?Principal;
    fee_collector : ?Account;
    ts : ?Nat64;
    mthd : ?Text;
  };

  public type IndexTransaction = {
    burn : ?IndexBurn;
    kind : Text;
    mint : ?IndexMint;
    approve : ?IndexApprove;
    fee_collector : ?IndexFeeCollector;
    authorized_mint : ?IndexAuthorizedMint;
    authorized_burn : ?IndexAuthorizedBurn;
    timestamp : Nat64;
    transfer : ?IndexTransfer;
  };

  public type GetAccountTransactionsArgs = {
    account : Account;
    // Exclusive upper bound: results start at the next older tx id.
    start : ?BlockIndex;
    max_results : Nat;
  };

  public type TransactionWithId = {
    id : BlockIndex;
    transaction : IndexTransaction;
  };

  public type GetTransactions = {
    balance : Tokens;
    transactions : [TransactionWithId];
    oldest_tx_id : ?BlockIndex;
  };

  public type GetTransactionsErr = {
    message : Text;
  };

  public type GetTransactionsResult = {
    #Ok : GetTransactions;
    #Err : GetTransactionsErr;
  };

  public type ListSubaccountsArgs = {
    owner : Principal;
    start : ?Subaccount;
  };

  public type IndexStatus = {
    num_blocks_synced : BlockIndex;
  };
};
