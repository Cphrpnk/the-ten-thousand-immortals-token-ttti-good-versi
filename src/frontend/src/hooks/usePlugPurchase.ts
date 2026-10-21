import { loadConfig } from "@caffeineai/core-infrastructure";
import type { ActorSubclass } from "@icp-sdk/core/agent";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AcknowledgementError, Backend } from "../backend";
import type {
  Account,
  DeliveryAddressResult,
  PurchaseAcknowledgement,
  PurchaseResult,
} from "../backend";
import { type _SERVICE, idlFactory } from "../declarations/backend.did";
import { ICP_LEDGER_CANISTER_ID } from "../lib/icpLedger";
import { ensurePlugSession, getPlugSessionVersion, usePlug } from "./usePlug";

const unsupportedBlob = async (): Promise<never> => {
  throw new Error("File transfer is not available through the Plug actor.");
};

/** Backend client reused while the Plug session stays the same. */
let cachedBackend: { version: number; backend: Backend } | null = null;

/**
 * Build a backend client whose calls are signed by the connected Plug wallet,
 * so purchases run as the same principal that approved on the ICP ledger.
 * Plug is only prompted when the session does not already whitelist both the
 * backend and the ICP ledger.
 */
async function createPlugBackend(): Promise<Backend> {
  const plug = typeof window !== "undefined" ? window.ic?.plug : undefined;
  if (!plug) {
    throw new Error(
      "Plug wallet extension not detected. Install Plug to continue.",
    );
  }
  const config = await loadConfig();
  await ensurePlugSession(
    plug,
    [config.backend_canister_id, ICP_LEDGER_CANISTER_ID],
    config.backend_host,
  );
  const version = getPlugSessionVersion();
  if (cachedBackend && cachedBackend.version === version) {
    return cachedBackend.backend;
  }
  const actor = await plug.createActor<ActorSubclass<_SERVICE>>({
    canisterId: config.backend_canister_id,
    interfaceFactory: idlFactory,
  });
  const backend = new Backend(actor, unsupportedBlob, unsupportedBlob);
  cachedBackend = { version, backend };
  return backend;
}

function invalidateAfterPurchase(queryClient: QueryClient) {
  for (const key of [
    "saleStatus",
    "conversions",
    "treasuryState",
    "walletBalance",
    "icrc1BalanceOf",
    "tokenInfo",
    "icpPrice",
    "deliveryAddress",
    "exactQuote",
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export interface PlugPurchaseParams {
  icpAmount: bigint;
}

/** Purchase TTTI-T as the Plug principal (the same one that approved). */
export function usePlugPurchase() {
  const queryClient = useQueryClient();
  return useMutation<PurchaseResult, Error, PlugPurchaseParams>({
    mutationFn: async ({ icpAmount }) => {
      const backend = await createPlugBackend();
      // null recipient: the backend credits the saved delivery address,
      // otherwise the caller's own principal.
      return backend.convertDeposit(null, icpAmount);
    },
    onSuccess: () => {
      invalidateAfterPurchase(queryClient);
    },
  });
}

/** Whether the Plug principal already accepted the six purchase acknowledgements. */
export function usePlugPurchaseAcknowledgement(enabled: boolean) {
  const { principal } = usePlug();
  return useQuery<PurchaseAcknowledgement>({
    queryKey: ["purchaseAcknowledgement", "plug", principal?.toText()],
    queryFn: async () => {
      const backend = await createPlugBackend();
      return backend.getMyPurchaseAcknowledgement();
    },
    enabled: enabled && !!principal,
    retry: 1,
  });
}

/** Records acceptance as the Plug principal (the same one that buys). */
export function usePlugAcceptPurchaseAcknowledgements() {
  const queryClient = useQueryClient();
  return useMutation<PurchaseAcknowledgement, Error, void>({
    mutationFn: async () => {
      const backend = await createPlugBackend();
      const result = await backend.acceptPurchaseAcknowledgements();
      if (result.__kind__ === "err") {
        throw new Error(
          result.err === AcknowledgementError.anonymousCaller
            ? "Connect Plug before accepting the purchase acknowledgements"
            : "Could not record the acknowledgements",
        );
      }
      return result.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["purchaseAcknowledgement"],
      });
    },
  });
}

/** Saved delivery address of the Plug caller. */
export function usePlugDeliveryAddress(enabled: boolean) {
  const { principal } = usePlug();
  return useQuery<Account | null>({
    queryKey: ["deliveryAddress", "plug", principal?.toText()],
    queryFn: async () => {
      const backend = await createPlugBackend();
      return backend.getDeliveryAddress();
    },
    enabled: enabled && !!principal,
    retry: 1,
  });
}

export function usePlugSetDeliveryAddress() {
  const queryClient = useQueryClient();
  return useMutation<DeliveryAddressResult, Error, string>({
    mutationFn: async (principalText) => {
      const backend = await createPlugBackend();
      return backend.setDeliveryAddress(principalText.trim());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deliveryAddress"] });
    },
  });
}

export function usePlugClearDeliveryAddress() {
  const queryClient = useQueryClient();
  return useMutation<boolean, Error, void>({
    mutationFn: async () => {
      const backend = await createPlugBackend();
      return backend.clearDeliveryAddress();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deliveryAddress"] });
    },
  });
}
