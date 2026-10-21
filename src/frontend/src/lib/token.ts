import { Principal, base32Encode, getCrc32 } from "@icp-sdk/core/principal";
import { DeliveryAddressErrorCode } from "../backend";
import type { Account } from "../backend";

/** TTTI-T ledger precision (current blocks). */
export const TTTI_DECIMALS = 8;
export const TTTI_DIVISOR = 10n ** BigInt(TTTI_DECIMALS);
/** Precision used by blocks written before the 8-decimal upgrade. */
export const LEGACY_TTTI_DECIMALS = 4;
export const TTTI_SYMBOL = "TTTI-T";
export const TOKEN_NAME = "TTTI-T";

export const ICP_DECIMALS = 8;
export const ICP_DIVISOR = 10n ** BigInt(ICP_DECIMALS);
/** ICP ledger transfer / approve fee: 0.0001 ICP. */
export const ICP_FEE_E8S = 10_000n;

/** Base price: 1 TTTI-T = 10 000 USD (before the cycles fee). */
export const TOKEN_PRICE_USD = 10_000;
/** Fixed fee paying for the canister's own cycles: 100 bps = 1%. */
export const CYCLES_FEE_BPS = 100n;
/** Price paid by the buyer per whole TTTI-T, fee included: 10 100 USD. */
export const BUYER_PRICE_USD =
  (TOKEN_PRICE_USD * (10_000 + Number(CYCLES_FEE_BPS))) / 10_000;
/** Minimum purchase in TTTI-T base units (0.0001 TTTI-T = 1.01 USD). */
export const MIN_PURCHASE = 10_000n;
/** Minimum purchase shown to buyers, fee included: 1.01 USD. */
export const MIN_PURCHASE_USD = 1.01;
/** Display label of the buyer price per whole TTTI-T: "10,100 USD". */
export const BUYER_PRICE_LABEL = `${BUYER_PRICE_USD.toLocaleString("en-US")} USD`;
/** Display label of the base price per whole TTTI-T: "10,000 USD". */
export const TOKEN_PRICE_LABEL = `${TOKEN_PRICE_USD.toLocaleString("en-US")} USD`;
/** Display label of the minimum purchase: "1.01 USD". */
export const MIN_PURCHASE_LABEL = `${MIN_PURCHASE_USD.toFixed(2)} USD`;
/** Display label of the fixed cycles fee: "1%". */
export const CYCLES_FEE_LABEL = `${Number(CYCLES_FEE_BPS) / 100}%`;
/** Public description of the fixed cycles fee and its reserve. */
export const CYCLES_FEE_TEXT =
  "Fixed 1% running-cost fee: kept in the canister's public cycles reserve and converted to cycles automatically when the balance runs low. The administrator can transfer the amount above a 2 ICP floor to the creator's treasury account; the floor always stays available for cycles.";
/** ICP always kept in the cycles reserve: 2 ICP. */
export const RESERVE_FLOOR_E8S = 200_000_000n;
/** Fixed-point scale of USD prices returned by the backend (usdE8). */
export const PRICE_SCALE = 10n ** 8n;

/** Format base units as a decimal string, trimming trailing zeros. */
export function formatUnits(
  value: bigint,
  decimals: number,
  minFractionDigits = 2,
): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = (abs / divisor).toLocaleString("en-US");
  let fraction =
    decimals > 0
      ? (abs % divisor).toString().padStart(decimals, "0").replace(/0+$/, "")
      : "";
  if (fraction.length < minFractionDigits) {
    fraction = fraction.padEnd(Math.min(minFractionDigits, decimals), "0");
  }
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

/** Parse a decimal string into base units; null when invalid or too precise. */
export function parseUnits(text: string, decimals: number): bigint | null {
  const raw = text.trim();
  // Accept ',' as the decimal separator; more than one separator stays invalid.
  const trimmed =
    raw.split(",").length === 2 && !raw.includes(".")
      ? raw.replace(",", ".")
      : raw;
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) return null;
  const [whole = "", fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) return null;
  return BigInt(`${whole || "0"}${fraction.padEnd(decimals, "0")}`);
}

export function formatTtti(value: bigint, decimals = TTTI_DECIMALS): string {
  return formatUnits(value, decimals);
}

export function parseTtti(text: string): bigint | null {
  return parseUnits(text, TTTI_DECIMALS);
}

export function formatIcp(e8s: bigint): string {
  return formatUnits(e8s, ICP_DECIMALS);
}

/** ICP e8s as "1,234.5678 ICP". */
export function formatIcpE8s(e8s: bigint): string {
  return `${formatIcp(e8s)} ICP`;
}

export function parseIcp(text: string): bigint | null {
  return parseUnits(text, ICP_DECIMALS);
}

/** Format a USD amount scaled by 10^8 (usdE8) as "$1,234.56". */
export function formatUsdE8(usdE8: bigint, maximumFractionDigits = 4): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(Number(usdE8) / Number(PRICE_SCALE));
}

/** TTTI-T base units bought with `icpE8s` at `usdE8`, buyer price (fee included). */
export function tttiFromIcp(icpE8s: bigint, usdE8: bigint): bigint {
  return (icpE8s * usdE8) / (BigInt(BUYER_PRICE_USD) * PRICE_SCALE);
}

/** ICP e8s needed (rounded up) to buy `tttiBase` units at `usdE8`, fee included. */
export function icpForTtti(tttiBase: bigint, usdE8: bigint): bigint {
  if (usdE8 <= 0n) return 0n;
  const numerator = tttiBase * BigInt(BUYER_PRICE_USD) * PRICE_SCALE;
  return (numerator + usdE8 - 1n) / usdE8;
}

/** Integer division rounded up (positive operands). */
export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ICRC-1 textual account encoding: bare principal for a null / all-zero
 * subaccount, otherwise `principal-checksum.hexSubaccount`.
 */
export function encodeAccountText(account: Account): string {
  const ownerText = account.owner.toText();
  const sub = account.subaccount;
  if (!sub || sub.every((b) => b === 0)) return ownerText;
  const ownerBytes = account.owner.toUint8Array();
  const joined = new Uint8Array(ownerBytes.length + sub.length);
  joined.set(ownerBytes, 0);
  joined.set(sub, ownerBytes.length);
  const crc = getCrc32(joined) >>> 0;
  const crcBytes = new Uint8Array([
    (crc >>> 24) & 0xff,
    (crc >>> 16) & 0xff,
    (crc >>> 8) & 0xff,
    crc & 0xff,
  ]);
  const checksum = base32Encode(crcBytes);
  const hex = toHex(sub).replace(/^0+/, "");
  return `${ownerText}-${checksum}.${hex}`;
}

/** Shorten a long account / principal text for compact display. */
export function truncateAccountText(text: string, head = 11, tail = 6): string {
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

/** Basis points as a percentage label, e.g. 200n -> "2%". */
export function formatBps(bps: bigint): string {
  return `${(Number(bps) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

/** Plain decimal string (no grouping) that parseUnits accepts. */
export function unitsInputValue(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const fraction = (value % divisor).toString().padStart(decimals, "0");
  return `${value / divisor}.${fraction}`.replace(/\.?0+$/, "");
}

/** USD value (usdE8) of a TTTI-T base-unit amount at the base price. */
export function tttiToUsdE8(tttiBase: bigint): bigint {
  return (tttiBase * BigInt(TOKEN_PRICE_USD) * PRICE_SCALE) / TTTI_DIVISOR;
}

/** USD paid (usdE8) for a TTTI-T base-unit amount at the buyer price (fee included). */
export function tttiToBuyerUsdE8(tttiBase: bigint): bigint {
  return (tttiBase * BigInt(BUYER_PRICE_USD) * PRICE_SCALE) / TTTI_DIVISOR;
}

/** Cycles fee part (usdE8) of the buyer price for a TTTI-T base-unit amount. */
export function cyclesFeeUsdE8(tttiBase: bigint): bigint {
  return tttiToBuyerUsdE8(tttiBase) - tttiToUsdE8(tttiBase);
}

export const DELIVERY_ADDRESS_MESSAGES: Record<
  DeliveryAddressErrorCode,
  string
> = {
  [DeliveryAddressErrorCode.empty]: "Paste your Principal ID.",
  [DeliveryAddressErrorCode.accountIdentifier]:
    "This is an account ID; please paste your Principal ID instead",
  [DeliveryAddressErrorCode.invalidPrincipal]:
    "This is not a valid Principal ID. Check it and try again.",
  [DeliveryAddressErrorCode.anonymousPrincipal]:
    "The anonymous principal cannot receive tokens. Paste your own Principal ID.",
  [DeliveryAddressErrorCode.anonymousCaller]:
    "Sign in before saving a delivery address.",
};

export type DeliveryAddressValidation =
  | { ok: true; principal: Principal }
  | { ok: false; code: DeliveryAddressErrorCode; message: string };

function invalid(code: DeliveryAddressErrorCode): DeliveryAddressValidation {
  return { ok: false, code, message: DELIVERY_ADDRESS_MESSAGES[code] };
}

/** Client-side mirror of the backend setDeliveryAddress rules. */
export function validateDeliveryAddress(
  text: string,
): DeliveryAddressValidation {
  const trimmed = text.trim();
  if (trimmed === "") return invalid(DeliveryAddressErrorCode.empty);
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return invalid(DeliveryAddressErrorCode.accountIdentifier);
  }
  let principal: Principal;
  try {
    principal = Principal.fromText(trimmed);
  } catch {
    return invalid(DeliveryAddressErrorCode.invalidPrincipal);
  }
  if (principal.isAnonymous()) {
    return invalid(DeliveryAddressErrorCode.anonymousPrincipal);
  }
  return { ok: true, principal };
}
