import Array "mo:core/Array";
import Blob "mo:core/Blob";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Common "../types/common";
import IndexTypes "../types/index";
import IcrcLib "icrc";

// ICRC index-ng view of this ledger, derived on the fly from ledger.blocks
// (full history, read-only). Standard ICRC-3 #Map blocks and pre-upgrade
// ':'-separated #Text blocks are both decoded; amounts of legacy blocks below
// state.legacyBlockBoundary (4 decimals) are converted to 8-decimal units.
module {
  type Account = Common.Account;
  type Value = Common.Value;
  type Fields = [(Text, Value)];
  type Transaction = IndexTypes.IndexTransaction;

  // A decoded block: its index-ng transaction and every account it involves.
  type Decoded = { tx : Transaction; parties : [Account] };

  // Page caps per call.
  public let MAX_RESULTS : Nat = 500;
  public let MAX_SUBACCOUNTS : Nat = 500;

  let NAT64_MAX : Nat = 18_446_744_073_709_551_615;

  // 10^(8 - 4): multiplier from legacy 4-decimal to current 8-decimal units.
  func legacyScale() : Nat {
    10 ** Nat.sub(IcrcLib.decimals().toNat(), IcrcLib.LEGACY_DECIMALS.toNat());
  };

  func defaultSubaccount() : Blob {
    Array.repeat<Nat8>(0, 32).toBlob();
  };

  // ICRC-1: an all-zero subaccount is the default (null) subaccount.
  func normalize(a : Account) : Account {
    switch (a.subaccount) {
      case (?s) {
        if (s.toArray().all(func b = b == 0)) { { owner = a.owner; subaccount = null } } else a;
      };
      case (null) a;
    };
  };

  func toNat64(n : Nat) : Nat64 {
    if (n <= NAT64_MAX) n.toNat64() else NAT64_MAX.toNat64();
  };

  func optNat64(n : ?Nat) : ?Nat64 {
    switch (n) {
      case (?v) ?toNat64(v);
      case null null;
    };
  };

  func baseTx(kind : Text, timestamp : Nat64) : Transaction {
    {
      burn = null;
      kind;
      mint = null;
      approve = null;
      fee_collector = null;
      authorized_mint = null;
      authorized_burn = null;
      timestamp;
      transfer = null;
    };
  };

  func withSpender(parties : [Account], spender : ?Account) : [Account] {
    switch (spender) {
      case (?s) parties.concat([s]);
      case null parties;
    };
  };

  // --- Standard ICRC-3 #Map blocks -------------------------------------------

  func field(fields : Fields, key : Text) : ?Value {
    switch (fields.find(func entry = entry.0 == key)) {
      case (?(_, value)) ?value;
      case null null;
    };
  };

  func natOf(value : ?Value) : ?Nat {
    switch (value) {
      case (?(#Nat(n))) ?n;
      case (_) null;
    };
  };

  func blobOf(value : ?Value) : ?Blob {
    switch (value) {
      case (?(#Blob(b))) ?b;
      case (_) null;
    };
  };

  // #Array([#Blob owner, #Blob subaccount?]) as a normalized account.
  func valueAccount(value : ?Value) : ?Account {
    let items = switch (value) {
      case (?(#Array(items))) items;
      case (_) return null;
    };
    if (items.size() == 0 or items.size() > 2) {
      return null;
    };
    let owner = switch (items[0]) {
      case (#Blob(b)) Principal.fromBlob(b);
      case (_) return null;
    };
    let subaccount : ?Blob = if (items.size() == 2) {
      switch (items[1]) {
        case (#Blob(s)) ?s;
        case (_) return null;
      };
    } else null;
    ?normalize({ owner; subaccount });
  };

  func decodeMap(top : Fields) : ?Decoded {
    let btype = switch (field(top, "btype")) {
      case (?(#Text(t))) t;
      case (_) return null;
    };
    let tx : Fields = switch (field(top, "tx")) {
      case (?(#Map(f))) f;
      case (_) [];
    };
    let timestamp = toNat64(natOf(field(top, "ts")) ?? 0);
    let memo = blobOf(field(tx, "memo"));
    let created_at_time = optNat64(natOf(field(tx, "created_at_time")));
    let amount = natOf(field(tx, "amt")) ?? 0;
    // Effective fee: the caller-provided tx.fee, else the top-level fee.
    let fee = switch (natOf(field(tx, "fee"))) {
      case (?f) ?f;
      case null natOf(field(top, "fee"));
    };
    let from = valueAccount(field(tx, "from"));
    let to = valueAccount(field(tx, "to"));
    let spender = valueAccount(field(tx, "spender"));

    switch (btype) {
      case ("1xfer") {
        switch (from, to) {
          case (?f, ?t) {
            ?{
              tx = { baseTx("transfer", timestamp) with transfer = ?{ to = t; fee; from = f; memo; created_at_time; amount; spender } };
              parties = withSpender([f, t], spender);
            };
          };
          case (_) null;
        };
      };
      case ("2approve") {
        switch (from, spender) {
          case (?f, ?s) {
            ?{
              tx = {
                baseTx("approve", timestamp) with approve = ?{
                  fee;
                  from = f;
                  memo;
                  created_at_time;
                  amount;
                  expected_allowance = natOf(field(tx, "expected_allowance"));
                  expires_at = optNat64(natOf(field(tx, "expires_at")));
                  spender = s;
                }
              };
              parties = [f, s];
            };
          };
          case (_) null;
        };
      };
      case ("1mint") {
        switch (to) {
          case (?t) {
            ?{
              tx = { baseTx("mint", timestamp) with mint = ?{ to = t; memo; created_at_time; amount; fee = null } };
              parties = [t];
            };
          };
          case null null;
        };
      };
      case ("1burn") {
        switch (from) {
          case (?f) {
            ?{
              tx = { baseTx("burn", timestamp) with burn = ?{ from = f; memo; created_at_time; amount; spender; fee = null } };
              parties = withSpender([f], spender);
            };
          };
          case null null;
        };
      };
      case (_) null;
    };
  };

  // --- Legacy ':'-separated #Text blocks -------------------------------------

  func hexDigit(c : Char) : ?Nat {
    switch (c) {
      case ('0') ?0; case ('1') ?1; case ('2') ?2; case ('3') ?3;
      case ('4') ?4; case ('5') ?5; case ('6') ?6; case ('7') ?7;
      case ('8') ?8; case ('9') ?9;
      case ('a' or 'A') ?10; case ('b' or 'B') ?11; case ('c' or 'C') ?12;
      case ('d' or 'D') ?13; case ('e' or 'E') ?14; case ('f' or 'F') ?15;
      case (_) null;
    };
  };

  // Hex subaccount with leading zeros stripped, left-padded to 32 bytes.
  func hexSubaccount(hex : Text) : ?Blob {
    let chars = hex.toArray();
    if (chars.size() == 0 or chars.size() > 64) {
      return null;
    };
    let nibbles = List.empty<Nat>();
    var n = chars.size();
    while (n < 64) {
      nibbles.add(0);
      n += 1;
    };
    for (c in chars.values()) {
      switch (hexDigit(c)) {
        case (?d) nibbles.add(d);
        case null return null;
      };
    };
    let bytes = List.empty<Nat8>();
    var i = 0;
    while (i < 64) {
      bytes.add((nibbles.at(i) * 16 + nibbles.at(i + 1)).toNat8());
      i += 2;
    };
    ?bytes.toArray().toBlob();
  };

  // A legacy account: bare principal text, or the ICRC-1 textual form
  // `<principal>-<checksum>.<hex subaccount>`. Empty text means no account.
  func legacyAccount(text : Text) : ?Account {
    if (text == "") {
      return null;
    };
    let dotParts = text.split(#char '.').toArray();
    if (dotParts.size() == 1) {
      return ?{ owner = Principal.fromText(text); subaccount = null };
    };
    if (dotParts.size() != 2) {
      return null;
    };
    let groups = dotParts[0].split(#char '-').toArray();
    if (groups.size() < 2) {
      return null;
    };
    // Drop the trailing checksum group.
    var ownerText = "";
    var i = 0;
    for (g in groups.values()) {
      if (i + 1 < groups.size()) {
        ownerText := if (i == 0) g else ownerText # "-" # g;
      };
      i += 1;
    };
    switch (hexSubaccount(dotParts[1])) {
      case (?sub) ?normalize({ owner = Principal.fromText(ownerText); subaccount = ?sub });
      case null null;
    };
  };

  func decodeLegacy(text : Text, belowBoundary : Bool) : ?Decoded {
    let parts = text.split(#char ':').toArray();
    let scale = if (belowBoundary) legacyScale() else 1;
    func part(i : Nat) : Text {
      if (i < parts.size()) parts[i] else "";
    };
    func amountAt(i : Nat) : Nat {
      (part(i).toNat() ?? 0) * scale;
    };
    func feeAt(i : Nat) : ?Nat {
      switch (part(i).toNat()) {
        case (?f) ?(f * scale);
        case null null;
      };
    };
    func tsAt(i : Nat) : Nat64 {
      toNat64(part(i).toNat() ?? 0);
    };

    switch (part(0)) {
      case ("1") {
        // 1:from:to:amount:fee:timestamp[:feeCollector]
        let from = legacyAccount(part(1));
        let to = legacyAccount(part(2));
        let amount = amountAt(3);
        let timestamp = tsAt(5);
        switch (from, to) {
          case (?f, ?t) {
            ?{
              tx = { baseTx("transfer", timestamp) with transfer = ?{ to = t; fee = feeAt(4); from = f; memo = null; created_at_time = null; amount; spender = null } };
              parties = [f, t];
            };
          };
          case (null, ?t) {
            ?{
              tx = { baseTx("mint", timestamp) with mint = ?{ to = t; memo = null; created_at_time = null; amount; fee = null } };
              parties = [t];
            };
          };
          case (?f, null) {
            ?{
              tx = { baseTx("burn", timestamp) with burn = ?{ from = f; memo = null; created_at_time = null; amount; spender = null; fee = null } };
              parties = [f];
            };
          };
          case (null, null) null;
        };
      };
      case ("2") {
        // 2:from:spender:amount:fee:expires:timestamp[:feeCollector]
        switch (legacyAccount(part(1)), legacyAccount(part(2))) {
          case (?f, ?s) {
            let expires_at = switch (part(5).toNat()) {
              case (?e) { if (e > 0) ?toNat64(e) else null };
              case null null;
            };
            ?{
              tx = {
                baseTx("approve", tsAt(6)) with approve = ?{
                  fee = feeAt(4);
                  from = f;
                  memo = null;
                  created_at_time = null;
                  amount = amountAt(3);
                  expected_allowance = null;
                  expires_at;
                  spender = s;
                }
              };
              parties = [f, s];
            };
          };
          case (_) null;
        };
      };
      case ("3") {
        // 3:to:amount:timestamp
        switch (legacyAccount(part(1))) {
          case (?t) {
            ?{
              tx = { baseTx("mint", tsAt(3)) with mint = ?{ to = t; memo = null; created_at_time = null; amount = amountAt(2); fee = null } };
              parties = [t];
            };
          };
          case null null;
        };
      };
      case ("4") {
        // 4:from:amount:timestamp
        switch (legacyAccount(part(1))) {
          case (?f) {
            ?{
              tx = { baseTx("burn", tsAt(3)) with burn = ?{ from = f; memo = null; created_at_time = null; amount = amountAt(2); spender = null; fee = null } };
              parties = [f];
            };
          };
          case null null;
        };
      };
      // "legacy:index:amount" records carry no account and match no account.
      case (_) null;
    };
  };

  func decode(ledger : IcrcLib.Ledger, id : Nat, block : Value) : ?Decoded {
    switch (block) {
      case (#Map(fields)) decodeMap(fields);
      case (#Text(t)) decodeLegacy(t, id < ledger.state.legacyBlockBoundary);
      case (_) null;
    };
  };

  // --- index-ng queries ------------------------------------------------------

  // Newest first; `start` is an exclusive upper bound tx id. One pass over all
  // blocks, so oldest_tx_id is exact.
  public func getAccountTransactions(ledger : IcrcLib.Ledger, args : IndexTypes.GetAccountTransactionsArgs) : IndexTypes.GetTransactionsResult {
    let account = normalize(args.account);
    let limit = Nat.min(args.max_results, MAX_RESULTS);
    let page = List.empty<IndexTypes.TransactionWithId>();
    var oldest : ?Nat = null;
    for ((id, block) in ledger.blocks.reverseEntries()) {
      switch (decode(ledger, id, block)) {
        case (?d) {
          if (d.parties.any(func p = p == account)) {
            oldest := ?id;
            let beforeStart = switch (args.start) {
              case (?s) id < s;
              case null true;
            };
            if (beforeStart and page.size() < limit) {
              page.add({ id; transaction = d.tx });
            };
          };
        };
        case null {};
      };
    };
    #Ok({
      balance = IcrcLib.balanceOf(ledger, account);
      transactions = page.toArray();
      oldest_tx_id = oldest;
    });
  };

  // Subaccounts the owner used in any block, ascending, strictly after
  // `start`. The default account is reported as 32 zero bytes.
  public func listSubaccounts(ledger : IcrcLib.Ledger, args : IndexTypes.ListSubaccountsArgs) : [Blob] {
    let found = Set.empty<Blob>();
    for ((id, block) in ledger.blocks.entries()) {
      switch (decode(ledger, id, block)) {
        case (?d) {
          for (p in d.parties.values()) {
            if (p.owner == args.owner) {
              found.add(p.subaccount ?? defaultSubaccount());
            };
          };
        };
        case null {};
      };
    };
    let out = List.empty<Blob>();
    for (sub in found.values()) {
      let after = switch (args.start) {
        case (?s) sub > s;
        case null true;
      };
      if (after and out.size() < MAX_SUBACCOUNTS) {
        out.add(sub);
      };
    };
    out.toArray();
  };

  public func status(ledger : IcrcLib.Ledger) : IndexTypes.IndexStatus {
    { num_blocks_synced = ledger.state.nextBlockIndex };
  };
};
