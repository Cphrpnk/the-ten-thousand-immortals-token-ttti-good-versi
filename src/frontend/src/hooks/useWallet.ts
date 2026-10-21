import { loadConfig } from "@caffeineai/core-infrastructure";
import type { Principal } from "@icp-sdk/core/principal";
import { useQuery } from "@tanstack/react-query";
import type { Account, Backend } from "../backend";
import { createLedgerActor } from "../lib/icpLedger";
import {
  type TokenDescriptor,
  tokenRegistry,
  withMetadata,
} from "../lib/tokenRegistry";
import { useActor } from "./useActor";

export type { TokenDescriptor };

/** True when `canisterId` is the TTTI-T ledger, i.e. this app's backend. */
async function isAppLedger(canisterId: Principal): Promise<boolean> {
  const config = await loadConfig();
  return canisterId.toText() === config.backend_canister_id;
}

/** Query a ledger's icrc1_metadata directly with an anonymous agent. */
async function readMetadata(canisterId: Principal, backend: Backend) {
  if (await isAppLedger(canisterId)) return backend.icrc1_metadata();
  const ledger = await createLedgerActor(canisterId.toText());
  return ledger.icrc1_metadata();
}

/** Query a ledger's icrc1_balance_of directly with an anonymous agent. */
async function readBalance(
  canisterId: Principal,
  account: Account,
  backend: Backend,
): Promise<bigint> {
  if (await isAppLedger(canisterId)) return backend.icrc1_balance_of(account);
  const ledger = await createLedgerActor(canisterId.toText());
  return ledger.icrc1_balance_of({
    owner: account.owner,
    subaccount: account.subaccount ? [account.subaccount] : [],
  });
}

async function describe(
  token: TokenDescriptor,
  backend: Backend,
): Promise<TokenDescriptor> {
  try {
    return withMetadata(token, await readMetadata(token.canisterId, backend));
  } catch {
    return token;
  }
}

/** Wallet tokens from the frontend registry, described by each ledger. */
export function useListTokens() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<TokenDescriptor>>({
    queryKey: ["listTokens"],
    queryFn: async () => {
      if (!actor) return [];
      const config = await loadConfig();
      return Promise.all(
        tokenRegistry(config.backend_canister_id).map((token) =>
          describe(token, actor),
        ),
      );
    },
    enabled: !!actor && !isFetching,
  });
}

/** Read a single registry token's metadata from its ledger. */
export function useTokenMetadata(canisterId: Principal | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<TokenDescriptor | null>({
    queryKey: ["tokenMetadata", canisterId?.toText()],
    queryFn: async () => {
      if (!actor || !canisterId) throw new Error("Actor not initialized");
      const config = await loadConfig();
      const token = tokenRegistry(config.backend_canister_id).find(
        (t) => t.canisterId.toText() === canisterId.toText(),
      );
      return token ? describe(token, actor) : null;
    },
    enabled: !!actor && !isFetching && !!canisterId,
  });
}

/** Read a token balance for an account directly from its ledger. */
export function useWalletBalance(
  canisterId: Principal | undefined,
  account: Account | undefined,
) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: [
      "walletBalance",
      canisterId?.toText(),
      account?.owner.toText(),
      account?.subaccount,
    ],
    queryFn: async () => {
      if (!actor || !canisterId || !account) {
        throw new Error("Actor not initialized");
      }
      return readBalance(canisterId, account, actor);
    },
    enabled: !!actor && !isFetching && !!canisterId && !!account,
  });
}
