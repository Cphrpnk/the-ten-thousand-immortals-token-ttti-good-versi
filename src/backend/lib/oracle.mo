import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Char "mo:core/Char";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Timer "mo:core/Timer";
import Error "mo:core/Error";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Oracle "../types/oracle";

module {
  public type IcpPrice = Oracle.IcpPrice;
  public type PriceResult = Oracle.PriceResult;
  public type PriceSource = Oracle.PriceSource;
  public type PriceError = Oracle.PriceError;
  public type Timestamp = Oracle.Timestamp;

  // Stable rate state. fetchedAt / validUntil are 0 while no rate exists.
  public type OracleStore = {
    var usdE8 : Nat;
    var source : PriceSource;
    var fetchedAt : Timestamp;
    var validUntil : Timestamp;
    var lastError : ?PriceError;
    var lastSuccessAt : ?Timestamp;
  };

  // USD price scale: prices are stored as USD * 10^8.
  public let PRICE_SCALE : Nat = 100_000_000;

  // A rate is valid for 1 hour after it was fetched (ns).
  public let VALID_FOR_NS : Nat = 3_600_000_000_000;

  // A rate is still usable up to 5 minutes after validUntil (ns).
  public let GRACE_NS : Nat = 300_000_000_000;

  // Maximum age at which a rate is used: VALID_FOR_NS + GRACE_NS (ns).
  public let MAX_RATE_AGE_NS : Nat = 3_900_000_000_000;

  // Timer period: hourly fetch; retry every 5 minutes when every source fails.
  public let REFRESH_SECONDS : Nat = 3_600;
  public let RETRY_SECONDS : Nat = 300;

  // Primary feed: Coinbase spot, JSON `{"data":{"amount":"N.NN",...}}` (string).
  public let COINBASE_URL = "https://api.coinbase.com/v2/prices/ICP-USD/spot";

  // Backup feed: CoinGecko simple price, JSON `{"internet-computer":{"usd":N.NN}}`.
  public let COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd";

  // Response ceiling for the price outcalls (headers included).
  let MAX_RESPONSE_BYTES : Nat64 = 16_000;

  // 0.001 USD in usdE8 units.
  let ROUNDING_UNIT : Nat = 100_000;

  // The stored rate as the public view (usable computed against `now`).
  // Never performs an outcall.
  public func getPrice(store : OracleStore, now : Timestamp) : IcpPrice {
    {
      usdE8 = store.usdE8;
      source = store.source;
      fetchedAt = store.fetchedAt;
      validUntil = store.validUntil;
      usable = isUsable(store, now);
      lastError = store.lastError;
      lastSuccessAt = store.lastSuccessAt;
    };
  };

  // True when a rate exists and now <= validUntil + 5 minutes.
  public func isUsable(store : OracleStore, now : Timestamp) : Bool {
    store.usdE8 > 0 and store.fetchedAt > 0 and now <= store.validUntil + GRACE_NS;
  };

  // The stored usdE8 when usable at `now`, otherwise null. Used by purchases;
  // never performs an outcall.
  public func usableRate(store : OracleStore, now : Timestamp) : ?Nat {
    if (isUsable(store, now)) ?store.usdE8 else null;
  };

  // Fetches Coinbase, then CoinGecko; on success stores { usdE8; source;
  // fetchedAt = now; validUntil = now + 1 h } and lastSuccessAt; on failure
  // records lastError (exact text, date) and keeps the stored rate. Timer
  // context only (update). Never traps.
  public func fetchAndStore(store : OracleStore, transform : OutCall.Transform) : async PriceResult {
    let coinbaseError = switch (await fetchPrice(COINBASE_URL, transform)) {
      case (#ok(usdE8)) { return #Ok(storeRate(store, usdE8, #coinbase)) };
      case (#err(message)) {
        store.lastError := ?{ message = "Coinbase: " # message; at = Time.now() };
        message;
      };
    };
    switch (await fetchPrice(COINGECKO_URL, transform)) {
      case (#ok(usdE8)) { #Ok(storeRate(store, usdE8, #coingecko)) };
      case (#err(message)) {
        let combined = "Coinbase: " # coinbaseError # "; CoinGecko: " # message;
        store.lastError := ?{ message = combined; at = Time.now() };
        #Err(combined);
      };
    };
  };

  func storeRate(store : OracleStore, usdE8 : Nat, source : PriceSource) : IcpPrice {
    let now = Time.now();
    store.usdE8 := usdE8;
    store.source := source;
    store.fetchedAt := now;
    store.validUntil := now + VALID_FOR_NS;
    store.lastSuccessAt := ?now;
    getPrice(store, now);
  };

  // Admin refresh: refuses with #Err("... rate still valid until <time>")
  // and no outcall while now <= validUntil; otherwise fetchAndStore.
  public func adminRefresh(store : OracleStore, transform : OutCall.Transform) : async PriceResult {
    let now = Time.now();
    if (store.fetchedAt > 0 and store.usdE8 > 0 and now <= store.validUntil) {
      return #Err("Refresh refused: the current ICP/USD rate is still valid until " # store.validUntil.toText() # " (nanoseconds since the Unix epoch); no fetch was made");
    };
    await fetchAndStore(store, transform);
  };

  // Arms the rate timer (called from the actor body, so on every install and
  // upgrade): an immediate first check, then a check every 5 minutes. A check
  // fetches when no rate exists or less than 5 minutes of validity remain, so
  // a successful rate is refetched once an hour and a failed fetch is retried
  // every 5 minutes.
  public func startTimer<system>(store : OracleStore, transform : OutCall.Transform) : () {
    func tick() : async () {
      let now = Time.now();
      if (store.fetchedAt == 0 or store.usdE8 == 0 or now + RETRY_SECONDS * 1_000_000_000 > store.validUntil) {
        ignore await fetchAndStore(store, transform);
      };
    };
    ignore Timer.setTimer<system>(#seconds(0), tick);
    ignore Timer.recurringTimer<system>(#seconds(RETRY_SECONDS), tick);
  };

  // Transform helper for the actor's `transform` query: keeps only the price
  // extracted from the body, rounded to 0.001 USD (no headers, no other JSON),
  // so every replica gets an identical response.
  public func transform(input : OutCall.TransformationInput) : OutCall.TransformationOutput {
    let response = input.response;
    let price : ?Nat = if (response.status != 200) null else switch (response.body.decodeUtf8()) {
      case (?text) {
        switch (priceAfter(text, "\"amount\":")) {
          case (?p) ?p;
          case null priceAfter(text, "\"usd\":");
        };
      };
      case null null;
    };
    let body = switch (price) {
      case (?p) formatE8Milli((p + ROUNDING_UNIT / 2) / ROUNDING_UNIT * ROUNDING_UNIT);
      case null "";
    };
    { status = response.status; headers = []; body = body.encodeUtf8() };
  };

  // The number following `marker` in `text`, in usdE8 units.
  func priceAfter(text : Text, marker : Text) : ?Nat {
    let parts = text.split(#text marker);
    ignore parts.next();
    switch (parts.next()) {
      case (?rest) parseDecimalE8(rest);
      case null null;
    };
  };

  // usdE8 (a multiple of 0.001 USD) as canonical "W.FFF" text.
  func formatE8Milli(value : Nat) : Text {
    let milli = (value % PRICE_SCALE) / ROUNDING_UNIT;
    let pad = if (milli < 10) "00" else if (milli < 100) "0" else "";
    (value / PRICE_SCALE).toText() # "." # pad # milli.toText();
  };

  // GETs `url`; the transform reduces the body to the canonical price text.
  // #err carries the exact failure text.
  func fetchPrice(url : Text, transform : OutCall.Transform) : async { #ok : Nat; #err : Text } {
    try {
      let response = await OutCall.httpRequest({
        url;
        method = #get;
        headers = [{ name = "Accept"; value = "application/json" }];
        body = null;
        maxResponseBytes = MAX_RESPONSE_BYTES;
        transform;
      });
      if (response.status != 200) {
        return #err("HTTP status " # response.status.toText());
      };
      let body = response.body.decodeUtf8() ?? "";
      switch (parseDecimalE8(body)) {
        case (?price) {
          if (price == 0) #err("price not found in the response body") else #ok(price);
        };
        case null { #err("price not found in the response body") };
      };
    } catch (e) {
      #err("outcall rejected: " # e.message());
    };
  };

  // Parses a leading decimal number (optionally preceded by spaces / a quote)
  // into units of 10^-8, truncating digits beyond the 8th decimal.
  func parseDecimalE8(text : Text) : ?Nat {
    var whole = 0;
    var frac = 0;
    var fracDigits = 0;
    var digits = 0;
    var seenDot = false;
    for (c in text.chars()) {
      let code = c.toNat32().toNat();
      if (code >= 48 and code <= 57) {
        let value : Int = code - 48;
        let d = value.toNat();
        if (seenDot) {
          if (fracDigits < 8) {
            frac := frac * 10 + d;
            fracDigits += 1;
          };
        } else {
          whole := whole * 10 + d;
        };
        digits += 1;
      } else if (c == '.' and not seenDot) {
        seenDot := true;
      } else if (digits == 0 and not seenDot and (c == ' ' or c == '\"')) {
        // skip leading whitespace / opening quote
      } else {
        break;
      };
    };
    if (digits == 0) {
      return null;
    };
    while (fracDigits < 8) {
      frac := frac * 10;
      fracDigits += 1;
    };
    ?(whole * PRICE_SCALE + frac);
  };
};
