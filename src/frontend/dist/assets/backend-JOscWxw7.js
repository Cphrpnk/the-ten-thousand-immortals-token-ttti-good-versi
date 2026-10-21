import { _ as UserRole, a as MIN_PURCHASE, c as TOKEN_PRICE_USD, d as icpForTtti, f as tttiFromIcp, g as PriceSource, h as HolderKind, i as ICP_DIVISOR, l as TTTI_DIVISOR, m as ConversionStatus, n as CYCLES_FEE_BPS, o as RESERVE_FLOOR_E8S, p as validateDeliveryAddress, r as CYCLES_FEE_TEXT, s as TOKEN_NAME, t as BUYER_PRICE_USD, u as TTTI_SYMBOL, v as Principal } from "./index-CdJgy7rp.js";
//#region src/mocks/backend.ts
var FEE = 100n;
var FEE_BOUNDS = {
	min: 0n,
	max: 10000n
};
var MAX_SUPPLY = TTTI_DIVISOR;
var ICP_LEDGER_FEE = 10000n;
var MOCK_USD_E8 = 1250000000n;
/** TTTI-T base units per whole ICP at the mock price, fee included. */
var MOCK_LIVE_RATE = tttiFromIcp(ICP_DIVISOR, MOCK_USD_E8);
/** validUntil + 5-minute grace, as in the backend. */
var MAX_RATE_AGE_SECONDS = 3900n;
var HOURLY_RATE_TEXT = "The ICP/USD rate is set once an hour from Coinbase, or from CoinGecko if Coinbase is unavailable, and applies to every purchase in that hour. If no valid rate exists, the purchase is refused and no ICP is taken.";
var nowNs = () => BigInt(Date.now()) * 1000000n;
var HOUR_NS = 3600n * 1000000000n;
/** Start of the current hour, in nanoseconds. */
var hourStartNs = () => nowNs() / HOUR_NS * HOUR_NS;
var principalFrom = (seed) => Principal.fromUint8Array(new Uint8Array(Array.from({ length: 29 }, (_, i) => seed * 31 + i & 255)));
var ICP_CANISTER = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
var TTTI_CANISTER = Principal.fromUint8Array(new Uint8Array([
	0,
	0,
	0,
	0,
	0,
	48,
	0,
	18,
	1,
	1
]));
var CALLER = principalFrom(1);
var HOLDER_2 = principalFrom(2);
var HOLDER_3 = principalFrom(3);
var CALLER_ACCOUNT = { owner: CALLER };
/** Canister principal + 'FEE-COLLECTOR-TTTI-T-00000000001' (32 bytes). */
var FEE_COLLECTOR = {
	owner: TTTI_CANISTER,
	subaccount: new TextEncoder().encode("FEE-COLLECTOR-TTTI-T-00000000001")
};
/** Minting account: canister principal with a null subaccount. */
var MINTING_ACCOUNT = { owner: TTTI_CANISTER };
/** Transfers to the minting account are refused without any debit. */
var isMintingAccount = (account) => account.owner.toText() === TTTI_CANISTER.toText() && (!account.subaccount || account.subaccount.every((byte) => byte === 0));
var MINTING_REFUSAL = {
	__kind__: "GenericError",
	GenericError: {
		error_code: 8n,
		message: "Tokens cannot be burned; transfers to the contract address are refused."
	}
};
var MOCK_CONTROLLERS = [principalFrom(9)];
var MOCK_MODULE_HASH = "3f1c9a7e52b04d8e6a1f0c2b7d9e4a5f8c3b1e0d6a2f9c7b4e8d1a0f5c3b2e9a";
/** Canister principal + 'CYCLES-RESERVE-TTTI-T-0000000001' (32 bytes), on the ICP ledger. */
var CYCLES_RESERVE_ACCOUNT = {
	owner: TTTI_CANISTER,
	subaccount: new TextEncoder().encode("CYCLES-RESERVE-TTTI-T-0000000001")
};
var TOP_UP_THRESHOLD = 3000000000000n;
/** The backend publishes the same rule text as CYCLES_FEE_TEXT. */
var RESERVE_RULE = CYCLES_FEE_TEXT;
var TREASURY_ACCOUNT = {
	owner: HOLDER_3,
	subaccount: new Uint8Array(Array.from({ length: 32 }, (_, i) => i === 31 ? 7 : 0))
};
var STANDARDS = [
	{
		name: "ICRC-1",
		url: "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-1"
	},
	{
		name: "ICRC-2",
		url: "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-2"
	},
	{
		name: "ICRC-3",
		url: "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-3"
	},
	{
		name: "ICRC-10",
		url: "https://github.com/dfinity/ICRC/blob/main/ICRCs/ICRC-10/ICRC-10.md"
	}
];
var state = {
	salesPaused: false,
	sold: 1250000n,
	fee: FEE,
	feeCollectorBalance: 300n,
	deliveryAddress: null,
	conversions: [],
	acknowledgement: { accepted: false },
	treasuryConfig: { icpAccount: TREASURY_ACCOUNT },
	cyclesBalance: 4820000000000n,
	reserveBalanceE8s: 345670000n,
	lastTopUp: {
		timestamp: nowNs() - 3n * 24n * HOUR_NS,
		icpE8s: 50000000n,
		blockIndex: 18204311n,
		status: {
			__kind__: "notified",
			notified: { cycles: 1910000000000n }
		}
	},
	withdrawals: []
};
/** Reserve minus the floor minus the ICP ledger fee, never negative. */
var withdrawableExcess = () => {
	const excess = state.reserveBalanceE8s - RESERVE_FLOOR_E8S - ICP_LEDGER_FEE;
	return excess > 0n ? excess : 0n;
};
/** Live conversion at the buyer price (1% cycles fee included), floored. */
function liveTtti(icpAmount) {
	return tttiFromIcp(icpAmount, MOCK_USD_E8);
}
/** Fresh minting plus the collected fee account, as in getSaleStatus. */
var mockTotalSupply = () => state.sold + state.feeCollectorBalance;
/** What can still be minted: max(0, cap - totalSupply). */
var mintableRemaining = () => {
	const supply = mockTotalSupply();
	return MAX_SUPPLY > supply ? MAX_SUPPLY - supply : 0n;
};
function saleAvailable() {
	return mintableRemaining() + state.feeCollectorBalance;
}
function makeConversion(icpAmount, recipient) {
	const tttiAmount = liveTtti(icpAmount);
	const mintable = mintableRemaining();
	const minted = tttiAmount < mintable ? tttiAmount : mintable;
	return {
		id: BigInt(state.conversions.length + 1),
		status: ConversionStatus.completed,
		depositor: CALLER,
		usedFallback: false,
		priceUsdE8: MOCK_USD_E8,
		minted,
		fromCollector: tttiAmount - minted,
		recipient,
		timestamp: nowNs(),
		tttiAmount,
		icpAmount,
		forward: {
			__kind__: "forwarded",
			forwarded: icpAmount - ICP_LEDGER_FEE
		}
	};
}
state.conversions.push(makeConversion(ICP_DIVISOR, CALLER_ACCOUNT));
state.conversions.unshift({
	...makeConversion(ICP_DIVISOR / 2n, { owner: HOLDER_2 }),
	depositor: HOLDER_2,
	forward: {
		__kind__: "failed",
		failed: "ICP ledger transfer failed: TemporarilyUnavailable"
	}
});
function purchaseError(code, message) {
	return {
		__kind__: "Err",
		Err: {
			code,
			message
		}
	};
}
function mockPurchase(recipient, icpAmount) {
	if (!state.acknowledgement.accepted) return purchaseError({
		__kind__: "acknowledgementRequired",
		acknowledgementRequired: null
	}, "Accept the purchase acknowledgements before your first purchase.");
	if (icpAmount <= 0n) return purchaseError({
		__kind__: "invalidAmount",
		invalidAmount: null
	}, "Enter an amount greater than 0.");
	if (state.salesPaused) return purchaseError({
		__kind__: "salesPaused",
		salesPaused: null
	}, "Sales are paused.");
	const remaining = saleAvailable();
	if (remaining <= 0n) return purchaseError({
		__kind__: "saleComplete",
		saleComplete: null
	}, "Sale complete.");
	const requested = liveTtti(icpAmount);
	if (requested < 10000n) return purchaseError({
		__kind__: "belowMinimum",
		belowMinimum: {
			minimumTtti: MIN_PURCHASE,
			requestedTtti: requested
		}
	}, "The minimum purchase is 0.0001 TTTI-T (1.01 USD).");
	if (requested > remaining) return purchaseError({
		__kind__: "aboveRemaining",
		aboveRemaining: {
			maximumIcpE8s: icpForTtti(remaining, MOCK_USD_E8),
			maximumTtti: remaining,
			requestedTtti: requested
		}
	}, "Only the remaining TTTI-T can be purchased.");
	const conversion = makeConversion(icpAmount, recipient ?? state.deliveryAddress ?? CALLER_ACCOUNT);
	state.feeCollectorBalance -= conversion.fromCollector;
	state.sold += conversion.tttiAmount;
	state.conversions.unshift(conversion);
	return {
		__kind__: "Ok",
		Ok: conversion
	};
}
/** Hourly rate fetched at the start of the current hour, valid one hour. */
var mockPrice = () => {
	const fetchedAt = hourStartNs();
	return {
		usdE8: MOCK_USD_E8,
		source: PriceSource.coinbase,
		fetchedAt,
		validUntil: fetchedAt + HOUR_NS,
		usable: true,
		lastSuccessAt: fetchedAt,
		lastError: {
			message: "coinbase: HTTP 503 Service Unavailable",
			at: fetchedAt - 2n * HOUR_NS
		}
	};
};
var LEGACY_BOUNDARY = 3n;
var MAX_BLOCKS_PER_CALL = 100n;
var vNat = (Nat) => ({
	__kind__: "Nat",
	Nat
});
var vText = (Text) => ({
	__kind__: "Text",
	Text
});
var vBlob = (Blob) => ({
	__kind__: "Blob",
	Blob
});
var vMap = (Map) => ({
	__kind__: "Map",
	Map
});
var vAccount = (account) => ({
	__kind__: "Array",
	Array: account.subaccount ? [vBlob(account.owner.toUint8Array()), vBlob(account.subaccount)] : [vBlob(account.owner.toUint8Array())]
});
function encodeLeb128(value) {
	const out = [];
	let rest = value;
	do {
		const byte = Number(rest & 127n);
		rest >>= 7n;
		out.push(rest > 0n ? byte | 128 : byte);
	} while (rest > 0n);
	return out;
}
function encodeSleb128(value) {
	const out = [];
	let rest = value;
	for (;;) {
		const byte = Number(rest & 127n);
		rest >>= 7n;
		const done = rest === 0n && (byte & 64) === 0 || rest === -1n && (byte & 64) !== 0;
		out.push(done ? byte : byte | 128);
		if (done) return out;
	}
}
async function sha256(bytes) {
	const copy = new Uint8Array(bytes);
	return new Uint8Array(await crypto.subtle.digest("SHA-256", copy));
}
function concat(parts) {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let offset = 0;
	for (const part of parts) {
		out.set(part, offset);
		offset += part.length;
	}
	return out;
}
function compareBytes(a, b) {
	const len = Math.min(a.length, b.length);
	for (let i = 0; i < len; i++) if (a[i] !== b[i]) return a[i] - b[i];
	return a.length - b.length;
}
/** ICRC-3 representation-independent hash of a Value. */
async function hashValue(value) {
	switch (value.__kind__) {
		case "Nat": return sha256(new Uint8Array(encodeLeb128(value.Nat)));
		case "Int": return sha256(new Uint8Array(encodeSleb128(value.Int)));
		case "Text": return sha256(new TextEncoder().encode(value.Text));
		case "Blob": return sha256(value.Blob);
		case "Array": return sha256(concat(await Promise.all(value.Array.map(hashValue))));
		case "Map": {
			const pairs = await Promise.all(value.Map.map(async ([key, inner]) => concat([await sha256(new TextEncoder().encode(key)), await hashValue(inner)])));
			pairs.sort(compareBytes);
			return sha256(concat(pairs));
		}
	}
}
/** Builds each block value given the parent hash (legacy Text builders ignore it). */
var BLOCK_BUILDERS = [
	(ts) => vText(`3:${CALLER.toText()}:2500:${ts}`),
	(ts) => vText(`1:${CALLER.toText()}:${HOLDER_2.toText()}:1000:1:${ts}`),
	(ts) => vText(`4:${HOLDER_2.toText()}:50:${ts}`),
	(ts) => vText(`3:${CALLER.toText()}:500000:${ts}`),
	(ts) => vText(`1:${CALLER.toText()}:${HOLDER_2.toText()}:150000:${FEE}:${ts}`),
	(ts, phash) => vMap([
		["btype", vText("1mint")],
		["ts", vNat(ts)],
		["phash", vBlob(phash ?? /* @__PURE__ */ new Uint8Array(32))],
		["tx", vMap([["to", vAccount(CALLER_ACCOUNT)], ["amt", vNat(250000n)]])]
	]),
	(ts, phash) => vMap([
		["btype", vText("1xfer")],
		["ts", vNat(ts)],
		["fee", vNat(FEE)],
		["fee_col", vAccount(FEE_COLLECTOR)],
		["phash", vBlob(phash ?? /* @__PURE__ */ new Uint8Array(32))],
		["tx", vMap([
			["from", vAccount(CALLER_ACCOUNT)],
			["to", vAccount({ owner: HOLDER_2 })],
			["amt", vNat(100000n)]
		])]
	]),
	(ts, phash) => vMap([
		["btype", vText("2approve")],
		["ts", vNat(ts)],
		["fee", vNat(FEE)],
		["fee_col", vAccount(FEE_COLLECTOR)],
		["phash", vBlob(phash ?? /* @__PURE__ */ new Uint8Array(32))],
		["tx", vMap([
			["from", vAccount(CALLER_ACCOUNT)],
			["spender", vAccount({ owner: HOLDER_3 })],
			["amt", vNat(50000n)],
			["expected_allowance", vNat(0n)],
			["expires_at", vNat(ts + 7n * 24n * 3600n * 1000000000n)]
		])]
	]),
	(ts, phash) => vMap([
		["btype", vText("1burn")],
		["ts", vNat(ts)],
		["phash", vBlob(phash ?? /* @__PURE__ */ new Uint8Array(32))],
		["tx", vMap([["from", vAccount({ owner: HOLDER_2 })], ["amt", vNat(20000n)]])]
	]),
	(ts, phash) => vMap([
		["btype", vText("1xfer")],
		["ts", vNat(ts)],
		["fee", vNat(0n)],
		["phash", vBlob(phash ?? /* @__PURE__ */ new Uint8Array(32))],
		["tx", vMap([
			["from", vAccount(FEE_COLLECTOR)],
			["to", vAccount(CALLER_ACCOUNT)],
			["amt", vNat(300n)]
		])]
	]),
	(ts, phash) => vMap([
		["btype", vText("1xfer")],
		["ts", vNat(ts)],
		["fee_col", vAccount(FEE_COLLECTOR)],
		["phash", vBlob(phash ?? /* @__PURE__ */ new Uint8Array(32))],
		["tx", vMap([
			["from", vAccount({ owner: HOLDER_2 })],
			["to", vAccount({ owner: HOLDER_3 })],
			["amt", vNat(12345n)],
			["fee", vNat(FEE)],
			["memo", vBlob(new TextEncoder().encode("Immortal #42"))],
			["created_at_time", vNat(ts - 1000000000n)]
		])]
	])
];
var blockLogPromise = null;
/** Lazily builds the sample log so phash values are real SHA-256 hashes. */
function sampleBlockLog() {
	blockLogPromise ??= (async () => {
		const base = nowNs() - 3n * 24n * 3600n * 1000000000n;
		const blocks = [];
		let previous = null;
		for (const [index, build] of BLOCK_BUILDERS.entries()) {
			const id = BigInt(index);
			const block = build(base + id * 3600n * 1000000000n, id >= LEGACY_BOUNDARY ? previous : null);
			blocks.push({
				id,
				block
			});
			previous = await hashValue(block);
		}
		return {
			blocks,
			tipHash: previous ?? /* @__PURE__ */ new Uint8Array(32)
		};
	})();
	return blockLogPromise;
}
/** Serves every requested range in order, capped at 100 blocks per call. */
async function mockGetBlocks(ranges) {
	const { blocks } = await sampleBlockLog();
	const logLength = BigInt(blocks.length);
	const out = [];
	for (const { start, length } of ranges) {
		const end = start + length < logLength ? start + length : logLength;
		for (let i = start; i < end && BigInt(out.length) < MAX_BLOCKS_PER_CALL; i++) out.push(blocks[Number(i)]);
	}
	return {
		log_length: logLength,
		blocks: out,
		archived_blocks: []
	};
}
var MOCK_CERTIFICATE = new Uint8Array(Array.from({ length: 64 }, (_, i) => i * 7 + 3 & 255));
function cborBytes(data) {
	const body = Array.from(data);
	return body.length < 24 ? [64 + body.length, ...body] : [
		88,
		body.length,
		...body
	];
}
function labeledLeaf(label, value) {
	return [
		131,
		2,
		...cborBytes(new TextEncoder().encode(label)),
		130,
		3,
		...cborBytes(value)
	];
}
function buildMockHashTree(tipIndex, tipHash) {
	return new Uint8Array([
		217,
		217,
		247,
		131,
		1,
		...labeledLeaf("last_block_hash", tipHash),
		...labeledLeaf("last_block_index", encodeLeb128(tipIndex))
	]);
}
var mockBackend = {
	_initialize_access_control: async () => void 0,
	_internet_identity_sign_in_finish: async () => ({
		__kind__: "ok",
		ok: null
	}),
	_internet_identity_sign_in_start: async () => /* @__PURE__ */ new Uint8Array(),
	acceptPurchaseAcknowledgements: async () => {
		if (!state.acknowledgement.accepted) state.acknowledgement = {
			accepted: true,
			acceptedAt: nowNs()
		};
		return {
			__kind__: "ok",
			ok: state.acknowledgement
		};
	},
	assignCallerUserRole: async () => void 0,
	clearDeliveryAddress: async () => {
		const had = state.deliveryAddress !== null;
		state.deliveryAddress = null;
		return had;
	},
	convertDeposit: async (recipient, icpAmount) => mockPurchase(recipient, icpAmount),
	execute: async () => ({
		hasMore: false,
		rows: []
	}),
	exportBalanceSnapshot: async () => ({
		exportedAt: nowNs(),
		totalSupply: state.sold + state.feeCollectorBalance,
		decimals: 8,
		holders: [
			{
				account: CALLER_ACCOUNT,
				balance: 250000n,
				deliveryAddress: state.deliveryAddress ?? void 0,
				needsMigration: state.deliveryAddress === null,
				kind: HolderKind.holder
			},
			{
				account: { owner: HOLDER_2 },
				balance: 900000n,
				deliveryAddress: { owner: HOLDER_3 },
				needsMigration: false,
				kind: HolderKind.holder
			},
			{
				account: { owner: HOLDER_3 },
				balance: state.sold - 1150000n,
				needsMigration: true,
				kind: HolderKind.holder
			},
			{
				account: FEE_COLLECTOR,
				balance: state.feeCollectorBalance,
				needsMigration: false,
				kind: HolderKind.feeCollector
			}
		]
	}),
	getApiDoc: async () => JSON.stringify({ methods: [] }),
	getBurnAccount: async () => MINTING_ACCOUNT,
	getCallerUserRole: async () => UserRole.admin,
	getCanisterPrincipal: async () => TTTI_CANISTER,
	getConversions: async () => state.conversions,
	getDeliveryAddress: async () => state.deliveryAddress,
	getFeeCollector: async () => ({
		account: FEE_COLLECTOR,
		balance: state.feeCollectorBalance
	}),
	getIcpPrice: async () => mockPrice(),
	getLegacyBlockInfo: async () => ({
		boundaryIndex: LEGACY_BOUNDARY,
		legacyDecimals: 4,
		currentDecimals: 8
	}),
	getMyPurchaseAcknowledgement: async () => state.acknowledgement,
	getSaleStatus: async () => {
		const totalSupply = mockTotalSupply();
		const available = saleAvailable();
		const price = mockPrice();
		return {
			maxSupply: MAX_SUPPLY,
			totalSupply,
			mintableRemaining: mintableRemaining(),
			feeAccountBalance: state.feeCollectorBalance,
			sold: state.sold,
			reserved: 0n,
			available,
			complete: available === 0n,
			minPurchase: MIN_PURCHASE,
			tokenPriceUsd: BigInt(TOKEN_PRICE_USD),
			cyclesFeeBps: CYCLES_FEE_BPS,
			buyerPriceUsd: BigInt(BUYER_PRICE_USD),
			salesPaused: state.salesPaused,
			priceUsdE8: price.usdE8,
			priceSource: price.source,
			priceFetchedAt: price.fetchedAt,
			priceValidUntil: price.validUntil,
			priceUsable: price.usable,
			liveRate: MOCK_LIVE_RATE
		};
	},
	getTechnicalDetails: async () => ({
		ledgerCanisterId: TTTI_CANISTER,
		tokenName: TOKEN_NAME,
		tokenSymbol: TTTI_SYMBOL,
		decimals: 8,
		standards: STANDARDS.map((standard) => standard.name),
		icpLedgerCanisterId: ICP_CANISTER,
		oracleSources: [HOURLY_RATE_TEXT],
		refreshPolicy: HOURLY_RATE_TEXT,
		maxRateAgeSeconds: MAX_RATE_AGE_SECONDS,
		tokenPriceUsd: BigInt(TOKEN_PRICE_USD),
		cyclesFeeBps: CYCLES_FEE_BPS,
		buyerPriceUsd: BigInt(BUYER_PRICE_USD),
		minPurchase: MIN_PURCHASE,
		smallestUnit: 1n,
		roundingRule: "TTTI-T amounts rounded down to 1 base unit; ICP costs rounded up to 1 e8s",
		excessPaymentHandling: "Only the ICP cost of the delivered TTTI-T is collected; any excess is never pulled",
		deliveryOrder: "Fresh minting first; collected transfer fees are delivered only after minting reaches the maximum supply",
		transferFee: state.fee,
		maxSupply: MAX_SUPPLY,
		totalSupply: mockTotalSupply(),
		feeAccount: FEE_COLLECTOR,
		feeAccountBalance: state.feeCollectorBalance,
		cyclesReserveAccount: CYCLES_RESERVE_ACCOUNT,
		reserveFloorE8s: RESERVE_FLOOR_E8S,
		reserveRule: RESERVE_RULE,
		controllers: MOCK_CONTROLLERS,
		moduleHash: MOCK_MODULE_HASH,
		canisterInfoFetchedAt: hourStartNs(),
		legacyBlockBoundary: LEGACY_BOUNDARY
	}),
	getCyclesStatus: async () => ({
		cyclesBalance: state.cyclesBalance,
		topUpThreshold: TOP_UP_THRESHOLD,
		reserveAccount: CYCLES_RESERVE_ACCOUNT,
		reserveBalanceE8s: state.reserveBalanceE8s,
		reserveFloorE8s: RESERVE_FLOOR_E8S,
		withdrawableExcessE8s: withdrawableExcess(),
		lastTopUp: state.lastTopUp,
		withdrawals: state.withdrawals
	}),
	withdrawReserveExcess: async (amount) => {
		const withdrawableE8s = withdrawableExcess();
		if (withdrawableE8s === 0n) return {
			__kind__: "noExcess",
			noExcess: null
		};
		if (amount === 0n || amount > withdrawableE8s) return {
			__kind__: "amountExceedsExcess",
			amountExceedsExcess: { withdrawableE8s }
		};
		const blockIndex = 18300000n + BigInt(state.withdrawals.length);
		state.reserveBalanceE8s -= amount + ICP_LEDGER_FEE;
		state.withdrawals = [...state.withdrawals, {
			timestamp: nowNs(),
			amountE8s: amount,
			blockIndex
		}];
		return {
			__kind__: "ok",
			ok: blockIndex
		};
	},
	getPublicTreasuryInfo: async () => ({ icpAccount: state.treasuryConfig.icpAccount }),
	getTreasuryConfig: async () => state.treasuryConfig,
	get_account_transactions: async () => ({
		__kind__: "Ok",
		Ok: {
			balance: 0n,
			transactions: [],
			oldest_tx_id: void 0
		}
	}),
	get_fee: async () => state.fee,
	get_fee_bounds: async () => FEE_BOUNDS,
	get_max_supply: async () => MAX_SUPPLY,
	icrc10_supported_standards: async () => STANDARDS,
	icrc1_balance_of: async () => 250000n,
	icrc1_decimals: async () => 8,
	icrc1_fee: async () => state.fee,
	icrc1_metadata: async () => [
		["icrc1:name", {
			__kind__: "Text",
			Text: TOKEN_NAME
		}],
		["icrc1:symbol", {
			__kind__: "Text",
			Text: TTTI_SYMBOL
		}],
		["icrc1:decimals", {
			__kind__: "Nat",
			Nat: BigInt(8)
		}],
		["icrc1:fee", {
			__kind__: "Nat",
			Nat: state.fee
		}],
		["icrc1:max_memo_length", {
			__kind__: "Nat",
			Nat: 32n
		}],
		["icrc1:max_supply", {
			__kind__: "Nat",
			Nat: MAX_SUPPLY
		}]
	],
	icrc1_minting_account: async () => MINTING_ACCOUNT,
	icrc1_name: async () => TOKEN_NAME,
	icrc1_supported_standards: async () => STANDARDS,
	icrc1_symbol: async () => TTTI_SYMBOL,
	icrc1_total_supply: async () => mockTotalSupply(),
	icrc1_transfer: async (args) => isMintingAccount(args.to) ? {
		__kind__: "Err",
		Err: MINTING_REFUSAL
	} : {
		__kind__: "Ok",
		Ok: 9n
	},
	icrc2_allowance: async () => ({ allowance: 0n }),
	icrc2_approve: async () => ({
		__kind__: "Ok",
		Ok: 9n
	}),
	icrc2_transfer_from: async (args) => isMintingAccount(args.to) ? {
		__kind__: "Err",
		Err: MINTING_REFUSAL
	} : {
		__kind__: "Ok",
		Ok: 9n
	},
	icrc3_get_archives: async () => [],
	icrc3_get_blocks: async (ranges) => mockGetBlocks(ranges),
	icrc3_get_tip_certificate: async () => {
		const { blocks, tipHash } = await sampleBlockLog();
		return {
			certificate: MOCK_CERTIFICATE,
			hash_tree: buildMockHashTree(BigInt(blocks.length - 1), tipHash)
		};
	},
	icrc3_supported_block_types: async () => [
		{
			block_type: "1xfer",
			url: "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-1"
		},
		{
			block_type: "1mint",
			url: "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-1"
		},
		{
			block_type: "1burn",
			url: "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-1"
		},
		{
			block_type: "2approve",
			url: "https://github.com/dfinity/ICRC-1/tree/main/standards/ICRC-2"
		}
	],
	isCallerAdmin: async () => true,
	ledger_id: async () => TTTI_CANISTER,
	list_subaccounts: async () => [],
	refreshIcpPrice: async () => {
		const price = mockPrice();
		if (price.usable) return {
			__kind__: "Err",
			Err: "The current ICP/USD rate is still valid; refresh is allowed only when the rate is expired or absent."
		};
		return {
			__kind__: "Ok",
			Ok: price
		};
	},
	schema: async () => JSON.stringify({ tables: [] }),
	setDeliveryAddress: async (principalText) => {
		const result = validateDeliveryAddress(principalText);
		if (!result.ok) return {
			__kind__: "Err",
			Err: {
				code: result.code,
				message: result.message
			}
		};
		state.deliveryAddress = { owner: result.principal };
		return {
			__kind__: "Ok",
			Ok: state.deliveryAddress
		};
	},
	setSalesPaused: async (paused) => {
		state.salesPaused = paused;
	},
	setTreasuryConfig: async (config) => {
		state.treasuryConfig = { ...config };
		return {
			__kind__: "Ok",
			Ok: state.treasuryConfig
		};
	},
	set_fee: async (newFee) => {
		if (newFee < FEE_BOUNDS.min || newFee > FEE_BOUNDS.max) return {
			__kind__: "err",
			err: `Fee must be between ${FEE_BOUNDS.min} and ${FEE_BOUNDS.max} base units`
		};
		state.fee = newFee;
		return {
			__kind__: "ok",
			ok: null
		};
	},
	status: async () => ({ num_blocks_synced: 0n }),
	transform: async () => ({
		status: 200n,
		body: /* @__PURE__ */ new Uint8Array(),
		headers: []
	})
};
//#endregion
export { mockBackend };
