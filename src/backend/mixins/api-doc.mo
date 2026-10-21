mixin () {
  public query func getApiDoc() : async Text {
    "# TTTI-T Backend API\n\n" #
    "## Purpose\n\n" #
    "This canister is the TTTI-T (test version) token ledger and its buy-to-mint\n" #
    "sale. TTTI-T is an ICRC-1 / ICRC-2 / ICRC-3 / ICRC-10 token with 8 decimals\n" #
    "and a maximum supply of 1 TTTI-T (100_000_000 base units). Tokens cannot be\n" #
    "burned, so total supply never decreases and never exceeds the cap. Base\n" #
    "price: 1 TTTI-T = 10 000 USD, plus a fixed 1% fee for the canister's running\n" #
    "costs (cycles), so a buyer pays 10 100 USD worth of ICP per TTTI-T. New\n" #
    "TTTI-T is created only by the purchase logic. The backend keeps only the core\n" #
    "contract: buying, balances, transfers, history and the token standards, plus\n" #
    "a few admin controls (pause sales, refresh the rate, the test transfer fee,\n" #
    "the receiving ICP account, the balance snapshot export).\n\n" #
    "Nobody, admin included, can mint outside the purchase logic, freeze\n" #
    "transfers, move other holders' tokens, or withdraw the TTTI-T\n" #
    "transfer-fee collector. Nobody can burn tokens. ICP moves only by the\n" #
    "automatic rules below; the single manual ICP movement is the admin\n" #
    "withdrawal of the cycles reserve excess above a 2 ICP floor, to the\n" #
    "configured treasury account only.\n\n" #
    "This canister can be upgraded by its controllers. `getTechnicalDetails`\n" #
    "publishes the current controllers and module hash (see Canister info), so\n" #
    "the guarantees above describe the code identified by that module hash.\n\n" #

    "## Authentication and identity\n\n" #
    "- Users sign in through the app frontend with Internet Identity or the Plug\n" #
    "  wallet. Every call is identified only by its caller principal. An Internet\n" #
    "  Identity principal and a Plug principal are different principals: balances,\n" #
    "  delivery addresses, acknowledgements and roles never carry over.\n" #
    "- The app's frontend pins an Internet Identity derivation origin, published at\n" #
    "  `/.well-known/ii-derivation-origin` when available. An agent already holding\n" #
    "  the user's Internet Identity authorization derives the correct per-app\n" #
    "  principal against that origin (for example\n" #
    "  `icp identity link web <name> --app <host>`). Warning: such a delegation acts\n" #
    "  with the user's full authority in this app (it can spend the user's TTTI-T\n" #
    "  and buy with their ICP approval) until it expires.\n" #
    "- Signed (non-anonymous) caller required: `icrc1_transfer`, `icrc2_approve`,\n" #
    "  `icrc2_transfer_from` (they act on the caller's own accounts),\n" #
    "  `convertDeposit` (anonymous -> `#Err` code\n" #
    "  `#anonymousCaller`), `acceptPurchaseAcknowledgements` (anonymous ->\n" #
    "  `#err(#anonymousCaller)`), `setDeliveryAddress` (anonymous -> `#Err` code\n" #
    "  `#anonymousCaller`).\n" #
    "- None of these need registration. A role matters only for admin endpoints.\n\n" #

    "### Registration and roles\n\n" #
    "- Roles are `#admin` or `#user`. Registration happens only when a caller signs\n" #
    "  in through this app's own frontend (the frontend calls the authorization\n" #
    "  library's sign-in hooks). A principal that never did so is unregistered even\n" #
    "  when it belongs to the app's owner, and a caller derived against a different\n" #
    "  origin is a different principal than the one the frontend registered.\n" #
    "- A direct API caller registers by calling `_initialize_access_control` once\n" #
    "  as a signed-in caller. It grants `#admin` only while no admin has been\n" #
    "  assigned yet; every later caller becomes `#user`. Anonymous calls register\n" #
    "  nothing.\n" #
    "- `getCallerUserRole`, `isCallerAdmin`, `assignCallerUserRole` come from the\n" #
    "  authorization library. `getCallerUserRole` and `isCallerAdmin` trap with\n" #
    "  `User is not registered` for an unregistered signed-in caller.\n" #
    "- Admin-only endpoints trap for any other caller. A registered non-admin gets\n" #
    "  `Unauthorized: only admins ...` (the exact message is listed per endpoint).\n" #
    "  An unregistered caller may get the library trap `User is not registered`\n" #
    "  instead. Treat any trap from an admin endpoint as \"not authorized\".\n\n" #

    "### Public vs caller-scoped vs admin\n\n" #
    "- Public (anyone, including anonymous): all ICRC-1/2/3/10 queries, the\n" #
    "  index-ng queries (`get_account_transactions`, `list_subaccounts`,\n" #
    "  `status`, `ledger_id`),\n" #
    "  `getFeeCollector`, `getBurnAccount`, `getLegacyBlockInfo`, `get_fee`,\n" #
    "  `get_fee_bounds`, `get_max_supply`, `getSaleStatus`, `getTechnicalDetails`,\n" #
    "  `getIcpPrice`, `getPublicTreasuryInfo`, `getCanisterPrincipal`,\n" #
    "  `getCyclesStatus`, `schema`, `execute` and `getApiDoc`.\n" #
    "- Caller-scoped: `getMyPurchaseAcknowledgement`,\n" #
    "  `acceptPurchaseAcknowledgements`, `getDeliveryAddress`,\n" #
    "  `setDeliveryAddress`, `clearDeliveryAddress`, `convertDeposit`.\n" #
    "- Admin-only reads: `getTreasuryConfig`, `getConversions`,\n" #
    "  `exportBalanceSnapshot`.\n" #
    "- Admin-only writes: `setSalesPaused`, `refreshIcpPrice`, `set_fee` (test\n" #
    "  version only), `setTreasuryConfig` (receiving ICP account),\n" #
    "  `withdrawReserveExcess` (cycles reserve excess\n" #
    "  to the treasury account only). There is no admin mint, no burn endpoint,\n" #
    "  no transfer freeze and no withdrawal of the TTTI-T fee collector or of the\n" #
    "  reserve floor.\n\n" #

    "## Units and encodings\n\n" #
    "- TTTI-T amounts are base units, 8 decimals (1 TTTI-T = 100_000_000; the\n" #
    "  minimum purchase 0.0001 TTTI-T = 10_000). Amounts are rounded down to\n" #
    "  1 base unit. Exception: legacy blocks below the legacy boundary (see\n" #
    "  ICRC-3) use 4 decimals.\n" #
    "- ICP amounts are e8s (1 ICP = 100_000_000). ICP ledger fee: 10_000 e8s.\n" #
    "- Prices: `usdE8` / `priceUsdE8` = USD per whole ICP * 10^8;\n" #
    "  `usdMicro` = USD * 10^6. `liveRate` is TTTI-T base units per whole ICP at\n" #
    "  the stored hourly rate (1% fee included; null when no rate). `cyclesFeeBps` is basis points\n" #
    "  (100 = 1%).\n" #
    "- Timestamps: nanoseconds since the Unix epoch. Conversion and snapshot\n" #
    "  timestamps are Candid `nat64`; ICP/USD rate timestamps (`fetchedAt`,\n" #
    "  `validUntil`, `lastError.at`, `lastSuccessAt`, `priceFetchedAt`,\n" #
    "  `priceValidUntil`) and acknowledgement `acceptedAt` are Candid `int`;\n" #
    "  cycles reserve timestamps are Candid `int`; ICRC-3 block `ts` is `Nat`. 0 means\n" #
    "  never.\n" #
    "- Accounts: ICRC-1 `{ owner : Principal; subaccount : ?Blob }` (32-byte\n" #
    "  subaccount). An all-zero subaccount is treated as `null`.\n" #
    "- Optional values are Candid `opt`; variants are Candid variants.\n\n" #

    "## Special accounts\n\n" #
    "- Fee collector: `{ owner = <this canister>; subaccount = <fixed 32-byte\n" #
    "  ASCII identifier> }`, unchanged since launch; read it from\n" #
    "  `getFeeCollector() : { account; balance }`. Every charged transfer /\n" #
    "  transfer_from / approve fee is credited here. No caller, admin included,\n" #
    "  can transfer or approve from it; its tokens are sold again against ICP,\n" #
    "  only once fresh minting reached the cap.\n" #
    "- Minting account (contract address): `{ owner = <this canister>;\n" #
    "  subaccount = null }`, returned by `icrc1_minting_account()` and\n" #
    "  `getBurnAccount()` (name kept for compatibility). Tokens cannot be burned:\n" #
    "  `icrc1_transfer` and `icrc2_transfer_from` to it return\n" #
    "  `#GenericError { error_code = 8; message = \"Tokens cannot be burned;\n" #
    "  transfers to the contract address are refused.\" }` before any debit, fee,\n" #
    "  allowance change, dedup entry or block. Transfers and approvals from it are\n" #
    "  refused too.\n\n" #

    "## ICRC-1 / ICRC-2\n\n" #
    "- Metadata: `icrc1_name` = \"TTTI-T\", `icrc1_symbol` = \"TTTI-T\",\n" #
    "  `icrc1_decimals` = 8, `icrc1_fee`, `icrc1_total_supply`,\n" #
    "  `icrc1_balance_of`, `icrc1_metadata` (`icrc1:name`, `icrc1:symbol`,\n" #
    "  `icrc1:decimals`, `icrc1:fee`, `icrc1:max_memo_length` = 32,\n" #
    "  `icrc1:max_supply`).\n" #
    "- `icrc1_supported_standards` and `icrc10_supported_standards` both return\n" #
    "  ICRC-1, ICRC-2, ICRC-3 and ICRC-10 as `{ name; url }`.\n" #
    "- `icrc1_transfer`, `icrc2_approve`, `icrc2_allowance`, `icrc2_transfer_from`.\n\n" #
    "Rules (checked in this order: memo, created_at_time, then the rest):\n\n" #
    "- `memo` is at most 32 bytes, else `#GenericError { error_code = 4 }`.\n" #
    "- Transfer and transfer_from with `amount = 0` return\n" #
    "  `#GenericError { error_code = 5 }`. `icrc2_approve` with `amount = 0` is\n" #
    "  accepted: it charges the fee, writes a block and removes the allowance.\n" #
    "- `fee`: pass `null` or exactly the current fee, else\n" #
    "  `#BadFee { expected_fee }`.\n" #
    "- To the minting account -> `#GenericError { error_code = 8 }` (checked\n" #
    "  right after memo and created_at_time, before amount and fee).\n" #
    "- From the minting account -> `#GenericError { error_code = 6 }`. Approving\n" #
    "  a spender with the same owner principal -> `#GenericError { error_code = 7 }`.\n" #
    "  From the fee collector -> `#GenericError { error_code = 2 }`.\n" #
    "- Insufficient balance -> `#InsufficientFunds { balance }` (amount + fee for\n" #
    "  transfers; only the fee for approve).\n\n" #
    "Deduplication (only when `created_at_time` is set):\n\n" #
    "- Window 24 h, permitted drift 2 min. Too old -> `#TooOld`; more than 2 min\n" #
    "  ahead -> `#CreatedInFuture { ledger_time }`.\n" #
    "- An identical request inside the window returns\n" #
    "  `#Duplicate { duplicate_of = <original block index> }` and changes nothing.\n" #
    "  Set `created_at_time` to make retries of a transfer/approve safe. Without it\n" #
    "  every call is a new transaction.\n\n" #
    "Approvals (ICRC-2):\n\n" #
    "- `expires_at <= now` -> `#Expired { ledger_time }`. A mismatching\n" #
    "  `expected_allowance` -> `#AllowanceChanged { current_allowance }`. A new\n" #
    "  approve replaces the amount and the expiry.\n" #
    "- `icrc2_allowance` reports `{ allowance = 0; expires_at = null }` for a\n" #
    "  missing or expired approval.\n" #
    "- `icrc2_transfer_from` needs allowance >= amount + fee (else\n" #
    "  `#InsufficientAllowance { allowance }`). The remaining allowance keeps its\n" #
    "  original `expires_at` and is removed when it reaches 0.\n\n" #

    "## ICRC-3 block log\n\n" #
    "- `icrc3_get_blocks(vec { record { start; length } })` ->\n" #
    "  `{ log_length; blocks = vec { record { id; block } }; archived_blocks }`.\n" #
    "  Ranges are served in request order, each ascending and clipped to\n" #
    "  `log_length`, with at most 100 blocks in total per call. Blocks beyond the\n" #
    "  cap are omitted, so request again from the last returned `id + 1`.\n" #
    "- No archives: `archived_blocks = []`, `icrc3_get_archives` returns `[]`. The\n" #
    "  log is append-only and stays in this canister.\n" #
    "- `icrc3_supported_block_types` -> `1xfer`, `2approve`, `1mint`, `1burn`.\n" #
    "  No new `1burn` block can be written; the type stays listed so blocks\n" #
    "  written by earlier test versions still decode.\n" #
    "- Standard blocks are ICRC-3 `Value` maps: `btype`, `ts` (ns), optional `fee`\n" #
    "  (present only when the caller omitted `tx.fee`), optional `fee_col`,\n" #
    "  `phash`, and `tx` (`from`, `to`, `spender` as `Array [Blob owner, Blob\n" #
    "  subaccount?]`, `amt`, optional `fee`, `memo`, `created_at_time`,\n" #
    "  `expires_at`, `expected_allowance`).\n" #
    "- Sale deliveries are `1mint` blocks while fresh minting is below the cap;\n" #
    "  after the cap, deliveries from the fee collector are `1xfer` blocks with\n" #
    "  top-level `fee = 0` and no `fee_col`.\n" #
    "- Legacy history written before the ICRC-3 upgrade is preserved at the same\n" #
    "  indexes as colon-separated `Text` values. `getLegacyBlockInfo() : {\n" #
    "  boundaryIndex; legacyDecimals = 4; currentDecimals = 8 }`: blocks with\n" #
    "  index < `boundaryIndex` use 4 decimals. Decode by index, not by shape.\n" #
    "- Hashes use the ICRC-3 representation-independent hash. The first standard\n" #
    "  block chains to the SHA-256 of the last legacy text block.\n" #
    "- `icrc3_get_tip_certificate()` -> `opt { certificate; hash_tree }` with\n" #
    "  `last_block_hash` and `last_block_index`; `null` for an empty log or when\n" #
    "  called as an update. Verify it against the IC root key.\n\n" #

    "## ICRC index-ng\n\n" #
    "This canister is also its own ICRC index (index-ng interface, official\n" #
    "Candid shapes). The index is derived on the fly from the full ICRC-3 block\n" #
    "log, so it is always in sync and stores nothing extra. All are public\n" #
    "queries (anonymous allowed) and never change state.\n\n" #
    "- `ledger_id() : principal` returns this canister's own principal (the\n" #
    "  ledger and the index are the same canister).\n" #
    "- `status() : { num_blocks_synced : nat }` equals the ledger block count\n" #
    "  (`icrc3_get_blocks` `log_length`).\n" #
    "- `icrc1_balance_of(account)` is the ledger's own balance query.\n" #
    "- `get_account_transactions({ account; start : opt nat; max_results : nat })`\n" #
    "  -> `variant { Ok : { balance; transactions : vec { id; transaction };\n" #
    "  oldest_tx_id : opt nat }; Err : { message } }`. Transactions involving the\n" #
    "  account (as from, to or spender) are returned newest first. `start` is an\n" #
    "  exclusive upper bound: only ids strictly below it are returned. Page with\n" #
    "  `start = <last returned id>` until the last id equals `oldest_tx_id` or a\n" #
    "  page is empty. `max_results` is capped at 500. `balance` equals\n" #
    "  `icrc1_balance_of`. `Err` is not produced today.\n" #
    "- `Transaction` = `{ kind (\"transfer\" | \"approve\" | \"mint\" | \"burn\");\n" #
    "  timestamp : nat64 (ns); transfer; approve; mint; burn; fee_collector;\n" #
    "  authorized_mint; authorized_burn }` with exactly one of the first four set;\n" #
    "  the last three are always null. Transfer `{ from; to; spender; amount; fee;\n" #
    "  memo; created_at_time }`, Approve adds `expected_allowance` and\n" #
    "  `expires_at`, Burn has optional `spender` (`burn` appears only for blocks\n" #
    "  written by earlier test versions). `fee` is the caller's `tx.fee`,\n" #
    "  else the block's top-level fee.\n" #
    "- `list_subaccounts({ owner; start : opt blob })` -> subaccounts the owner\n" #
    "  used in any block, ascending, strictly after `start`, at most 500 per call.\n" #
    "  The default account is reported as 32 zero bytes.\n" #
    "- Legacy text blocks are included. Amounts and fees of legacy blocks below\n" #
    "  `boundaryIndex` (4 decimals) are converted to current 8-decimal units\n" #
    "  (multiplied by 10_000). Legacy `legacy:index:amount` records carry no\n" #
    "  account and therefore appear in no account's history.\n" #
    "- An all-zero subaccount is the same account as `null`.\n" #
    "- Not provided: `get_blocks`, `get_fee_collectors_ranges` (use\n" #
    "  `icrc3_get_blocks` and `getFeeCollector`).\n\n" #

    "## Supply and fee\n\n" #
    "- There is no mint endpoint and no burn endpoint. `get_max_supply()` and\n" #
    "  `icrc1:max_supply` are 100_000_000 (1 TTTI-T).\n" #
    "  `mintableRemaining = max(0, maxSupply - icrc1_total_supply)`. Every purchase\n" #
    "  mint is refused if `totalSupply + minted` would exceed the max supply.\n" #
    "  Tokens cannot be burned, so once 1 TTTI-T has been minted\n" #
    "  `mintableRemaining` is 0 and stays 0.\n" #
    "- Transfer fees stay in the fee collector and are sold again against ICP:\n" #
    "  each delivery mints first (up to `mintableRemaining`), then takes the rest\n" #
    "  from the fee collector.\n" #
    "- `set_fee(newFee) : { #ok; #err : Text }` (admin, TTTI-T test version only;\n" #
    "  trap `Unauthorized: only admins can set the fee`). Range:\n" #
    "  `get_fee_bounds() = { min; max }`, otherwise `#err`. `get_fee()`,\n" #
    "  `get_max_supply()`.\n\n" #

    "## ICP/USD price\n\n" #
    "The ICP/USD rate is set once an hour from Coinbase, or from CoinGecko if\n" #
    "Coinbase is unavailable, and applies to every purchase in that hour. If no\n" #
    "valid rate exists, the purchase is refused and no ICP is taken.\n\n" #
    "- Only the canister fetches prices: from its own timer, or from the guarded\n" #
    "  admin refresh. No purchase and no query ever fetches a price.\n" #
    "- Timer: armed on every install and upgrade. It checks immediately, then every\n" #
    "  5 minutes, and fetches when no rate exists or less than 5 minutes of\n" #
    "  validity remain. A successful rate is therefore refetched once an hour; if\n" #
    "  both sources fail, the fetch is retried every 5 minutes until one succeeds.\n" #
    "- Order: Coinbase spot ICP-USD, then CoinGecko simple price if Coinbase fails.\n" #
    "  On success: `usdE8`, `source` (#coinbase/#coingecko), `fetchedAt` = now,\n" #
    "  `validUntil` = fetchedAt + 1 hour, `lastSuccessAt` = now. On a source\n" #
    "  failure `lastError = { message; at }` stores the exact error text and its\n" #
    "  date (`Coinbase: <text>`, or `Coinbase: <text>; CoinGecko: <text>` when both\n" #
    "  fail); the previous rate is kept but follows the validity window.\n" #
    "- Validity: a rate is usable while now <= validUntil + 5 minutes; after that\n" #
    "  it is never used. There is no fallback rate and no margin.\n" #
    "- `getIcpPrice() : IcpPrice` (public query, never an outcall): `{ usdE8;\n" #
    "  source (#none/#coinbase/#coingecko); fetchedAt; validUntil; usable;\n" #
    "  lastError : ?{ message; at }; lastSuccessAt : ?Int }`. 0 / #none = no rate.\n" #
    "- `refreshIcpPrice() : PriceResult` (admin; trap `Unauthorized: only admins\n" #
    "  can refresh the ICP price`). While the current rate exists and now <=\n" #
    "  validUntil it returns `#Err(\"Refresh refused: the current ICP/USD rate is\n" #
    "  still valid until <ns> ...; no fetch was made\")` and makes no outcall.\n" #
    "  Otherwise it runs the same fetch as the timer: `#Ok(IcpPrice)` or\n" #
    "  `#Err(<combined error text>)`.\n" #
    "- `transform` is the outcall transform callback and is not for clients. It\n" #
    "  drops all headers and replaces the body with only the extracted price,\n" #
    "  rounded to 0.001 USD (for example `3.125`), so every node sees an identical\n" #
    "  response; an unparsable or non-200 response gets an empty body.\n\n" #

    "## Sale status and details\n\n" #
    "- `getSaleStatus() : SaleStatus` returns `{ maxSupply; totalSupply;\n" #
    "  mintableRemaining (max(0, maxSupply - totalSupply)); feeAccountBalance;\n" #
    "  sold; reserved; available\n" #
    "  (mintableRemaining + feeAccountBalance - reserved); complete; minPurchase\n" #
    "  (10_000); tokenPriceUsd (10_000); cyclesFeeBps (100); buyerPriceUsd\n" #
    "  (10_100); salesPaused; priceUsdE8 (the stored rate, exactly the one a\n" #
    "  purchase applies); priceSource; priceFetchedAt; priceValidUntil;\n" #
    "  priceUsable (now <= priceValidUntil + 5 minutes); liveRate }`.\n" #
    "  `maxRateAgeSeconds` in `getTechnicalDetails` is 3_900 (1 h + 5 min).\n" #
    "- `getTechnicalDetails() : TechnicalDetails` (public) returns the ledger\n" #
    "  canister ID, token name and symbol, decimals, standards, the ICP ledger\n" #
    "  canister ID, oracle sources, refresh policy, max rate age, price, fee,\n" #
    "  minimum purchase, smallest unit, rounding rule, excess payment handling,\n" #
    "  delivery order, current transfer fee, max and total supply, the fee account\n" #
    "  and its balance, `cyclesReserveAccount`, `reserveFloorE8s` (200_000_000)\n" #
    "  and `reserveRule` (the reserve rule text), plus `controllers`,\n" #
    "  `moduleHash`, `canisterInfoFetchedAt` and `legacyBlockBoundary` (see\n" #
    "  Canister info). `excessPaymentHandling` reads \"ICP beyond the cost of what\n" #
    "  is delivered is never taken.\"\n" #
    "- `setSalesPaused(Bool)` (admin; trap `Unauthorized: only admins can manage\n" #
    "  the TTTI-T sale`). Idempotent.\n" #
    "- The price and the 1% fee are code constants; nobody can change them.\n\n" #

    "## Purchase acknowledgement (once per principal)\n\n" #
    "- `acceptPurchaseAcknowledgements() : { #ok : PurchaseAcknowledgement; #err :\n" #
    "  #anonymousCaller }` records once that the caller accepted the six purchase\n" #
    "  acknowledgements. Idempotent: a repeat call keeps the first `acceptedAt`.\n" #
    "- `getMyPurchaseAcknowledgement() : { accepted : Bool; acceptedAt : ?Int }`\n" #
    "  (query, never traps; anonymous -> not accepted).\n" #
    "- A purchase by a caller without an acknowledgement is refused with\n" #
    "  `#acknowledgementRequired` before any ICP is taken.\n\n" #

    "## Purchase: `convertDeposit(recipient : ?Account, icpAmount : Nat)`\n\n" #
    "1. On the ICP ledger call `icrc2_approve` with spender\n" #
    "   `{ owner = getCanisterPrincipal(); subaccount = null }` for at least\n" #
    "   `icpAmount` + 10_000 e8s. Clients are expected to set `expires_at` to\n" #
    "   now + 15 minutes (nanoseconds) so an unused approval lapses quickly.\n" #
    "2. Call `convertDeposit` as the signed-in buyer. ICP is pulled from the\n" #
    "   caller's default ICP account.\n" #
    "3. Refusals before any ICP is taken (`conversion = null`), in order:\n" #
    "   `#purchaseInProgress` (the same principal already has a `convertDeposit`\n" #
    "   in flight; refused immediately with no ICP ledger call; the lock is\n" #
    "   released when the first call ends, whatever its outcome),\n" #
    "   `#anonymousCaller`, `#acknowledgementRequired`, `#notConfigured`,\n" #
    "   `#invalidAmount` (0), `#salesPaused`, `#saleComplete`; then the stored\n" #
    "   hourly rate is read (no price fetch): absent or past validUntil + 5 minutes\n" #
    "   -> `#priceUnavailable` before any reservation or ICP ledger call;\n" #
    "   then `#belowMinimum { minimumTtti; requestedTtti }` and `#aboveRemaining {\n" #
    "   maximumTtti = 0; ... }` (everything left is reserved by in-flight\n" #
    "   purchases). A delivery account equal to the fee account or the minting\n" #
    "   account is refused with `#invalidAmount`.\n" #
    "4. TTTI-T = floor(icpE8s * usdE8 * 10^8 / (10_100 * 10^16)) base units,\n" #
    "   capped at `available`. A buyer may take the whole remainder when it is\n" #
    "   below the minimum. Only the ICP cost of the delivered TTTI-T (rounded up)\n" #
    "   is collected; any excess is never pulled.\n" #
    "5. The amount is reserved before the first ledger await (no overselling) and\n" #
    "   released on every failure. ICP is collected with `icrc2_transfer_from` into\n" #
    "   the canister's own account. Ledger refusals return `#approvalMissing {\n" #
    "   allowance }`, `#insufficientIcp { balance }` or `#icpLedgerError`, and\n" #
    "   nothing is taken.\n" #
    "6. Delivery goes to `recipient`, else the stored delivery address, else\n" #
    "   `{ owner = caller; subaccount = null }`: freshly minted first, from the fee\n" #
    "   account only once minting reached the cap. No TTTI-T fee is charged.\n" #
    "7. If delivery fails the ICP is refunded minus 10_000 e8s: `#Err` code\n" #
    "   `#deliveryFailedRefunded` (record `#refunded`) or, if the refund also fails,\n" #
    "   `#deliveryFailedRefundFailed` (record `#refundFailed`, needs manual\n" #
    "   follow-up), both with `conversion = ?<record>`.\n" #
    "8. Success records a `#completed` conversion and returns `#Ok(Conversion)`.\n" #
    "   The collected ICP is then forwarded automatically (see Receiving ICP).\n\n" #
    "`PurchaseResult` is `#Ok(Conversion)` or `#Err({ code; message; conversion })`.\n" #
    "`Conversion` is `{ id; depositor; recipient; icpAmount (e8s collected);\n" #
    "tttiAmount; status; timestamp; priceUsdE8; usedFallback (true only on\n" #
    "historical records); minted; fromCollector; forward; message }`. Purchases\n" #
    "never trap; `message` is user-facing English text.\n\n" #
    "### Purchase retry safety\n\n" #
    "Purchases are NOT idempotent: every successful call is a new purchase, up to\n" #
    "the remaining ICP approval. After a timeout or lost response do not blindly\n" #
    "retry; first check `icrc1_balance_of` of the delivery account or recent\n" #
    "`icrc3_get_blocks` entries crediting it. Refusals with `conversion = null`\n" #
    "(including `#purchaseInProgress`, `#acknowledgementRequired` and\n" #
    "`#priceUnavailable`) took nothing and are safe to retry once the cause is\n" #
    "fixed; retry `#purchaseInProgress` only after the earlier call has replied.\n\n" #

    "## Delivery address (optional)\n\n" #
    "- `setDeliveryAddress(principalText) : DeliveryAddressResult` stores\n" #
    "  `{ owner; subaccount = null }` for the caller, replacing any previous one.\n" #
    "  Error codes: `#anonymousCaller`, `#empty`, `#accountIdentifier` (a 64-hex\n" #
    "  account ID was pasted), `#invalidPrincipal`, `#anonymousPrincipal`.\n" #
    "- `getDeliveryAddress() : ?Account`. `clearDeliveryAddress() : Bool` returns\n" #
    "  true when an address was removed. All three are safe to repeat.\n\n" #

    "## Receiving ICP account\n\n" #
    "- `setTreasuryConfig({ icpAccount }) : { #Ok : TreasuryConfig; #Err : Text }`\n" #
    "  (admin; trap `Unauthorized: only admins can manage the treasury`) sets the\n" #
    "  account that receives the ICP of future purchases. It does not move ICP.\n" #
    "  `getTreasuryConfig() : ?TreasuryConfig` (admin). Purchases are refused with\n" #
    "  `#notConfigured` until it is set.\n" #
    "- `getPublicTreasuryInfo() : ?{ icpAccount }` (public, null until set).\n" #
    "- Fee split of each delivered purchase (cost = `icpAmount`): the cycles\n" #
    "  reserve share `share = floor(cost * 100 / 10_100)` e8s is sent from the\n" #
    "  canister's default account to the cycles reserve account (the 10_000 e8s\n" #
    "  ledger fee is paid on top, so the reserve receives exactly `share`). The\n" #
    "  treasury part `cost - share - 10_000` (or `cost` when share is 0) is then\n" #
    "  forwarded to `icpAccount`, which receives it minus another 10_000 e8s\n" #
    "  ledger fee (`#notRequired` when `icpAccount` is the canister's own account).\n" #
    "  Purchases delivered before this rule keep their original records.\n" #
    "- `forward` is `#notRequired`, `#pending`, `#forwarded(icpBlockIndex)` or\n" #
    "  `#failed(reason)`. A failed forward or reserve transfer never undoes the\n" #
    "  buyer's credit. After the next successful purchase, failed forwards are\n" #
    "  retried with the treasury part only (never the reserve share again) and\n" #
    "  failed reserve transfers are retried to the reserve only; each is marked\n" #
    "  `#pending` before its ledger call. There is no manual forward endpoint.\n" #
    "- `getConversions() : [Conversion]` (admin): the purchase history.\n" #
    "- `getCanisterPrincipal()` (public): the ICRC-2 spender to approve. Read ICP\n" #
    "  balances directly on the ICP ledger (`icrc1_balance_of` query).\n\n" #

    "## Cycles reserve\n\n" #
    "Fixed 1% running-cost fee: kept in the canister's public cycles reserve and\n" #
    "converted to cycles automatically when the balance runs low. The\n" #
    "administrator can transfer the amount above a 2 ICP floor to the creator's\n" #
    "treasury account; the floor always stays available for cycles.\n\n" #
    "- Reserve account (ICP ledger): `{ owner = <this canister>; subaccount =\n" #
    "  \"CYCLES-RESERVE-TTTI-T-0000000001\" }` (32 ASCII bytes, fixed). Also in\n" #
    "  `getCyclesStatus().reserveAccount` and `getTechnicalDetails()`.\n" #
    "- Constants: floor `RESERVE_FLOOR_E8S` = 200_000_000 e8s (2 ICP); top-up\n" #
    "  threshold 3_000_000_000_000 cycles; each top-up targets about\n" #
    "  2_000_000_000_000 cycles; minimum top-up 100_000 e8s.\n" #
    "- Automatic top-up: a timer, re-armed on every install and upgrade, runs\n" #
    "  immediately and then every 6 hours (21_600 s). If the cycles balance is\n" #
    "  below the threshold it reads `get_icp_xdr_conversion_rate` from the CMC\n" #
    "  (`rkp4c-7iaaa-aaaaa-aaaca-cai`), computes `icpE8s = 2_000_000_000_000 *\n" #
    "  10_000 * 10^8 / (xdr_permyriad_per_icp * 10^12)` (1 XDR = 10^12 cycles),\n" #
    "  capped at the\n" #
    "  reserve balance minus 10_000 e8s. The top-up may go below the floor: the\n" #
    "  floor protects cycles against withdrawals, not against top-ups. It sends\n" #
    "  `icrc1_transfer` from the reserve subaccount to the CMC account `{ owner =\n" #
    "  CMC; subaccount = [principal length, principal bytes, zero padding] }` of\n" #
    "  this canister, with memo `TPUP` = 1347768404 as 8 little-endian bytes and\n" #
    "  `created_at_time` set. The block index is stored (status `#transferred`)\n" #
    "  BEFORE `notify_top_up { block_index; canister_id = this canister }`.\n" #
    "- Notify outcome: `#Ok cycles` -> `#notified { cycles }`. `#Processing`, a\n" #
    "  CMC `#Other` error or a failed call keep `#transferred` with `lastError`;\n" #
    "  the next run retries notify with the same block index and never makes a\n" #
    "  second transfer while one awaits notification. `#Refunded`,\n" #
    "  `#InvalidTransaction` or `#TransactionTooOld` -> `#failed(reason)`, after\n" #
    "  which a later run may make a new transfer. The timer never traps.\n" #
    "- `getCyclesStatus() : CyclesStatus` (public query): `{ cyclesBalance;\n" #
    "  topUpThreshold; reserveAccount; reserveBalanceE8s; reserveFloorE8s;\n" #
    "  withdrawableExcessE8s; lastTopUp : ?{ timestamp; icpE8s; blockIndex; status\n" #
    "  (#transferred | #notified { cycles } | #failed : Text); lastError };\n" #
    "  withdrawals : [{ timestamp; amountE8s; blockIndex }] }`. `reserveBalanceE8s`\n" #
    "  is a cache refreshed from the ICP ledger by the timer and after each\n" #
    "  reserve movement; read `icrc1_balance_of(reserveAccount)` on the ICP ledger\n" #
    "  for the live value. `withdrawableExcessE8s = max(0, reserveBalanceE8s -\n" #
    "  200_000_000 - 10_000)`. Timestamps are nanoseconds (Candid `int`), ICP in\n" #
    "  e8s, cycles as plain Nat.\n" #
    "- `withdrawReserveExcess(amount : Nat) : WithdrawReserveResult` (admin;\n" #
    "  others trap with `Unauthorized: only the administrator can withdraw the\n" #
    "  cycles reserve excess`). Transfers exactly `amount` e8s from the reserve to\n" #
    "  the configured treasury `icpAccount` and nowhere else; the sender pays the\n" #
    "  10_000 e8s fee on top, so the reserve never drops below the floor. Results:\n" #
    "  `#ok(icpBlockIndex)` (logged in `withdrawals`); `#busy` (a top-up or\n" #
    "  another withdrawal holds the shared lock); `#topUpPendingNotify` (a top-up\n" #
    "  transfer still awaits notify); `#treasuryNotConfigured`; `#noExcess`\n" #
    "  (excess is 0); `#amountExceedsExcess { withdrawableE8s }`; `#ledgerError`\n" #
    "  (balance unreadable, amount 0, or the transfer failed). The balance is\n" #
    "  re-read from the ledger under the lock first; `#noExcess` and\n" #
    "  `#amountExceedsExcess` never call the transfer.\n" #
    "- Retry safety: a withdrawal is NOT idempotent. After a timeout check\n" #
    "  `getCyclesStatus().withdrawals` (or the ledger) before retrying. `#busy`\n" #
    "  and `#topUpPendingNotify` moved nothing and are safe to retry later.\n" #
    "- Polling: the cycles status changes at most every 6 hours (plus purchases\n" #
    "  and withdrawals); polling `getCyclesStatus` more than once a minute gains\n" #
    "  nothing.\n\n" #
    "## Canister info\n\n" #
    "- The canister reads its own `canister_info` from the management canister\n" #
    "  right after every install and upgrade, then once a day (86_400 s), and\n" #
    "  caches the result. `getTechnicalDetails` serves the cache (no call):\n" #
    "  `controllers : ?vec principal` and `moduleHash : ?text` (lowercase hex\n" #
    "  SHA-256 of the installed Wasm module), both null until the first\n" #
    "  successful read; `canisterInfoFetchedAt : ?int` (ns) of the last success.\n" #
    "  A failed read keeps the previous values.\n" #
    "- `legacyBlockBoundary : nat`: blocks with index below it come from earlier\n" #
    "  test versions of the contract and use 4 decimals; the earliest record\n" #
    "  amounts without accounts. Same value as `getLegacyBlockInfo().boundaryIndex`.\n" #
    "- Polling: these values change only on upgrade or controller change; reading\n" #
    "  them more than once an hour gains nothing.\n\n" #
    "## Other endpoints\n\n" #
    "- `exportBalanceSnapshot() : { exportedAt; totalSupply; decimals; holders }`\n" #
    "  (admin query; trap `Unauthorized: only admins can manage the TTTI-T sale`).\n" #
    "  Each holder is `{ account; balance; deliveryAddress; needsMigration; kind\n" #
    "  (#holder/#feeCollector) }`; zero balances are excluded.\n" #
    "- Data intelligence (OQL): `schema()` and `execute(qJson)` remain in the\n" #
    "  interface but register no entities: `schema()` describes no tables and\n" #
    "  `execute` has no table to query, for any caller. They expose no app data;\n" #
    "  use the endpoints above instead.\n\n" #

    "## Polling guidance\n\n" #
    "- Purchases, transfers and approvals are synchronous: the reply is final.\n" #
    "  There is no background job to poll.\n" #
    "- Poll cheap queries (`getSaleStatus`, `getIcpPrice`, `icrc1_balance_of`)\n" #
    "  every 10-30 s at most. The stored rate changes only when the hourly timer\n" #
    "  (or its 5-minute retry) or an allowed admin refresh succeeds; polling\n" #
    "  `getIcpPrice` more than once a minute gains nothing.\n" #
    "- Follow the block log by calling `icrc3_get_blocks` from the last known\n" #
    "  `log_length`, in pages of up to 100.\n" #
    "- Read token balances and metadata directly on each ledger with the\n" #
    "  `icrc1_balance_of` and `icrc1_metadata` queries.\n\n" #

    "## Gotchas\n\n" #
    "- The charged rate is exactly the stored `usdE8` shown by `getIcpPrice` and\n" #
    "  `getSaleStatus().priceUsdE8` at the time of the call.\n" #
    "- `getSaleStatus().available` already subtracts in-flight reservations.\n" #
    "- Legacy blocks are text and use 4 decimals below `boundaryIndex`.\n" #
    "- An all-zero subaccount is the same account as `null`.\n" #
    "- There are no wallet helper endpoints and no ICP balance endpoint on this\n" #
    "  canister. Read balances and metadata with the `icrc1_balance_of` and\n" #
    "  `icrc1_metadata` queries directly on the TTTI-T ledger (this canister) and\n" #
    "  the ICP ledger, and build `icrc1_transfer` arguments client-side.\n" #
    "- `icrc1_total_supply` never decreases (no burns) and never exceeds\n" #
    "  `get_max_supply()`. A transfer to the canister principal with a null or\n" #
    "  all-zero subaccount is always refused with error code 8.\n" #
    "- Admin endpoints trap (reject) instead of returning `#Err`; ICRC, purchase,\n" #
    "  acknowledgement and delivery-address endpoints return typed errors.\n";
  };
};
