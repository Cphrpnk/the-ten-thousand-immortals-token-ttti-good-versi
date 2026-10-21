import { Principal } from "@icp-sdk/core/principal";
import type { Account, MetadataValue, TransferArgs } from "../backend";
import { ICP_LEDGER_CANISTER_ID, type RawMetadataValue } from "./icpLedger";
import { ICP_FEE_E8S, TOKEN_NAME, TTTI_DECIMALS, TTTI_SYMBOL } from "./token";

/** A wallet token, described from its ledger's ICRC-1 metadata. */
export interface TokenDescriptor {
  canisterId: Principal;
  name: string;
  symbol: string;
  decimals: number;
  fee: bigint;
}

export const CKBTC_LEDGER_CANISTER_ID = "mxzaz-hqaaa-aaaar-qaada-cai";
export const CKUSDC_LEDGER_CANISTER_ID = "xevnm-gaaaa-aaaar-qafnq-cai";

/**
 * Wallet tokens in display order, with defaults used until (or if) the
 * ledger metadata cannot be read. TTTI-T is the app's backend canister.
 */
export function tokenRegistry(tttiCanisterId: string): Array<TokenDescriptor> {
  return [
    {
      canisterId: Principal.fromText(ICP_LEDGER_CANISTER_ID),
      name: "Internet Computer",
      symbol: "ICP",
      decimals: 8,
      fee: ICP_FEE_E8S,
    },
    {
      canisterId: Principal.fromText(tttiCanisterId),
      name: TOKEN_NAME,
      symbol: TTTI_SYMBOL,
      decimals: TTTI_DECIMALS,
      fee: 0n,
    },
    {
      canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID),
      name: "ckBTC",
      symbol: "ckBTC",
      decimals: 8,
      fee: 10n,
    },
    {
      canisterId: Principal.fromText(CKUSDC_LEDGER_CANISTER_ID),
      name: "ckUSDC",
      symbol: "ckUSDC",
      decimals: 6,
      fee: 10_000n,
    },
  ];
}

type MetadataEntry = [string, MetadataValue | RawMetadataValue];

function textField(entries: Array<MetadataEntry>, key: string) {
  const value = entries.find(([name]) => name === key)?.[1];
  if (!value) return undefined;
  if ("__kind__" in value) {
    return value.__kind__ === "Text" ? value.Text : undefined;
  }
  return "Text" in value ? value.Text : undefined;
}

function natField(entries: Array<MetadataEntry>, key: string) {
  const value = entries.find(([name]) => name === key)?.[1];
  if (!value) return undefined;
  if ("__kind__" in value) {
    return value.__kind__ === "Nat" ? value.Nat : undefined;
  }
  return "Nat" in value ? value.Nat : undefined;
}

/** Overlay icrc1_metadata (name, symbol, decimals, fee) on a descriptor. */
export function withMetadata(
  token: TokenDescriptor,
  entries: Array<MetadataEntry>,
): TokenDescriptor {
  const decimals = natField(entries, "icrc1:decimals");
  return {
    canisterId: token.canisterId,
    name: textField(entries, "icrc1:name") ?? token.name,
    symbol: textField(entries, "icrc1:symbol") ?? token.symbol,
    decimals: decimals !== undefined ? Number(decimals) : token.decimals,
    fee: natField(entries, "icrc1:fee") ?? token.fee,
  };
}

/** ICRC-1 transfer arguments built in the app (no memo, created now). */
export function buildTransferArgs(
  to: Account,
  amount: bigint,
  fee: bigint,
): TransferArgs {
  return {
    to,
    amount,
    fee,
    created_at_time: BigInt(Date.now()) * 1_000_000n,
  };
}
