import type { Principal } from "@icp-sdk/core/principal";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AcknowledgementError } from "../backend";
import type {
  Account,
  Allowance,
  AllowanceArgs,
  ApproveArgs,
  ApproveResult,
  BalanceSnapshot,
  Conversion,
  CyclesStatus,
  DataCertificate,
  DeliveryAddressResult,
  FeeBounds,
  FeeCollectorInfo,
  GetBlocksArgs,
  GetBlocksResult,
  IcpPrice,
  LegacyBlockInfo,
  PriceResult,
  PublicTreasuryInfo,
  PurchaseAcknowledgement,
  PurchaseResult,
  SaleStatus,
  SupportedBlockType,
  SupportedStandard,
  TechnicalDetails,
  TransferArgs,
  TransferFromArgs,
  TransferFromResult,
  TransferResult,
  TreasuryConfig,
  WithdrawReserveResult,
} from "../backend";
import { formatIcpE8s } from "../lib/token";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export {
  useListTokens,
  useTokenMetadata,
  useWalletBalance,
} from "./useWallet";

/** Refresh everything a purchase or admin switch can change. */
function invalidateSale(queryClient: QueryClient) {
  for (const key of [
    "saleStatus",
    "technicalDetails",
    "adminSwitches",
    "conversions",
    "failedForwards",
    "icrc1BalanceOf",
    "walletBalance",
    "tokenInfo",
    "feeCollector",
    "icpPrice",
    "icrc3GetBlocks",
    "purchaseAcknowledgement",
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  maxSupply: bigint;
  totalSupply: bigint;
  fee: bigint;
  standards: Array<SupportedStandard>;
}

export function useTokenInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<TokenInfo>({
    queryKey: ["tokenInfo"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");

      const [name, symbol, decimals, maxSupply, totalSupply, fee, standards] =
        await Promise.all([
          actor.icrc1_name(),
          actor.icrc1_symbol(),
          actor.icrc1_decimals(),
          actor.get_max_supply(),
          actor.icrc1_total_supply(),
          actor.icrc1_fee(),
          actor.icrc1_supported_standards(),
        ]);

      return {
        name,
        symbol,
        decimals,
        maxSupply,
        totalSupply,
        fee,
        standards,
      };
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIcrc1Fee() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["icrc1Fee"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.icrc1_fee();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFee() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["getFee"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.get_fee();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMaxSupply() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["getMaxSupply"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.get_max_supply();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIcrc1BalanceOf(account: Account | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["icrc1BalanceOf", account?.owner.toText(), account?.subaccount],
    queryFn: async () => {
      if (!actor || !account) throw new Error("Actor not initialized");
      return actor.icrc1_balance_of(account);
    },
    enabled: !!actor && !isFetching && !!account,
  });
}

export function useIcrc1Transfer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<TransferResult, Error, TransferArgs>({
    mutationFn: async (args: TransferArgs) => {
      if (!actor) throw new Error("Actor not available");
      return actor.icrc1_transfer(args);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["icrc1BalanceOf"] });
      void queryClient.invalidateQueries({ queryKey: ["tokenInfo"] });
      void queryClient.invalidateQueries({ queryKey: ["icrc3GetBlocks"] });
      void queryClient.invalidateQueries({
        queryKey: ["icrc3GetTipCertificate"],
      });
    },
  });
}

/**
 * ICRC-2 approve on the TTTI-T ledger itself (Transfer page only).
 * Purchases must approve on the ICP ledger: use hooks/useIcpApprove.
 */
export function useTttiIcrc2Approve() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<ApproveResult, Error, ApproveArgs>({
    mutationFn: async (args: ApproveArgs) => {
      if (!actor) throw new Error("Actor not available");
      return actor.icrc2_approve(args);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["icrc2Allowance"] });
      void queryClient.invalidateQueries({ queryKey: ["icrc1BalanceOf"] });
      void queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      void queryClient.invalidateQueries({ queryKey: ["icrc3GetBlocks"] });
    },
  });
}

export function useIcrc2Allowance(args: AllowanceArgs | undefined) {
  const { actor, isFetching } = useActor();

  return useQuery<Allowance>({
    queryKey: [
      "icrc2Allowance",
      args?.account.owner.toText(),
      args?.spender.owner.toText(),
    ],
    queryFn: async () => {
      if (!actor || !args) throw new Error("Actor not initialized");
      return actor.icrc2_allowance(args);
    },
    enabled: !!actor && !isFetching && !!args,
  });
}

export function useIcrc2TransferFrom() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<TransferFromResult, Error, TransferFromArgs>({
    mutationFn: async (args: TransferFromArgs) => {
      if (!actor) throw new Error("Actor not available");
      return actor.icrc2_transfer_from(args);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["icrc1BalanceOf"] });
      void queryClient.invalidateQueries({ queryKey: ["icrc2Allowance"] });
      void queryClient.invalidateQueries({ queryKey: ["icrc3GetBlocks"] });
      void queryClient.invalidateQueries({
        queryKey: ["icrc3GetTipCertificate"],
      });
    },
  });
}

export function useIcrc3GetBlocks(args: Array<GetBlocksArgs>) {
  const { actor, isFetching } = useActor();

  return useQuery<GetBlocksResult>({
    queryKey: [
      "icrc3GetBlocks",
      args.map((a) => [a.start.toString(), a.length.toString()]),
    ],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.icrc3_get_blocks(args);
    },
    enabled: !!actor && !isFetching && args.length > 0,
  });
}

export function useIcrc3GetTipCertificate() {
  const { actor, isFetching } = useActor();

  return useQuery<DataCertificate | null>({
    queryKey: ["icrc3GetTipCertificate"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.icrc3_get_tip_certificate();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIcrc3SupportedBlockTypes() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<SupportedBlockType>>({
    queryKey: ["icrc3SupportedBlockTypes"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.icrc3_supported_block_types();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Inclusive transfer-fee bounds (base units) accepted by set_fee. */
export function useFeeBounds() {
  const { actor, isFetching } = useActor();

  return useQuery<FeeBounds>({
    queryKey: ["feeBounds"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.get_fee_bounds();
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Sets the transfer fee; rejects with the backend err text on failure. */
export function useSetFee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, bigint>({
    mutationFn: async (newFee: bigint) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.set_fee(newFee);
      if (result.__kind__ === "err") throw new Error(result.err);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tokenInfo"] });
      void queryClient.invalidateQueries({ queryKey: ["getFee"] });
      void queryClient.invalidateQueries({ queryKey: ["icrc1Fee"] });
      void queryClient.invalidateQueries({ queryKey: ["technicalDetails"] });
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// --- Treasury (ICP -> TTTI) -------------------------------------------------

/** True only once the backend confirmed the caller is an admin. */
function useAdminGate(): boolean {
  const { data: isAdmin } = useIsCallerAdmin();
  return isAdmin === true;
}

/** Public treasury mode and ICP account (no buyer data). */
export function usePublicTreasuryInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<PublicTreasuryInfo | null>({
    queryKey: ["publicTreasuryInfo"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPublicTreasuryInfo();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Full treasury config (admin-only endpoint; never called for non-admins). */
export function useTreasuryConfig() {
  const { actor, isFetching } = useActor();
  const isAdmin = useAdminGate();

  return useQuery<TreasuryConfig | null>({
    queryKey: ["treasuryConfig"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getTreasuryConfig();
    },
    enabled: !!actor && !isFetching && isAdmin,
  });
}

/** Saves the treasury config; rejects with the backend Err text on failure. */
export function useSetTreasuryConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<TreasuryConfig, Error, TreasuryConfig>({
    mutationFn: async (config: TreasuryConfig) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.setTreasuryConfig(config);
      if (result.__kind__ === "Err") throw new Error(result.Err);
      return result.Ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["treasuryConfig"] });
      void queryClient.invalidateQueries({ queryKey: ["publicTreasuryInfo"] });
      void queryClient.invalidateQueries({ queryKey: ["saleStatus"] });
      void queryClient.invalidateQueries({ queryKey: ["technicalDetails"] });
    },
  });
}

/** All conversions (admin-only endpoint; never called for non-admins). */
export function useConversions() {
  const { actor, isFetching } = useActor();
  const isAdmin = useAdminGate();

  return useQuery<Array<Conversion>>({
    queryKey: ["conversions"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getConversions();
    },
    enabled: !!actor && !isFetching && isAdmin,
  });
}

export function useConvertDeposit() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseResult,
    Error,
    { recipient: Account | null; icpAmount: bigint }
  >({
    mutationFn: async (params) => {
      if (!actor) throw new Error("Actor not available");
      return actor.convertDeposit(params.recipient, params.icpAmount);
    },
    onSuccess: () => {
      invalidateSale(queryClient);
    },
  });
}

export function useGetCanisterPrincipal() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal>({
    queryKey: ["canisterPrincipal"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCanisterPrincipal();
    },
    enabled: !!actor && !isFetching,
  });
}

// --- Purchase acknowledgements (asked once, at the first purchase) ----------

/** Whether the caller already accepted the six purchase acknowledgements. */
export function useGetMyPurchaseAcknowledgement(enabled = true) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principalText = identity?.getPrincipal().toText() ?? "anon";

  return useQuery<PurchaseAcknowledgement>({
    queryKey: ["purchaseAcknowledgement", principalText],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getMyPurchaseAcknowledgement();
    },
    enabled: enabled && !!actor && !isFetching,
  });
}

/** Records acceptance; rejects when the caller is anonymous. */
export function useAcceptPurchaseAcknowledgements() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<PurchaseAcknowledgement, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.acceptPurchaseAcknowledgements();
      if (result.__kind__ === "err") {
        throw new Error(
          result.err === AcknowledgementError.anonymousCaller
            ? "Sign in before accepting the purchase acknowledgements"
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

// --- ICP/USD oracle ---------------------------------------------------------

export function useGetIcpPrice() {
  const { actor, isFetching } = useActor();

  return useQuery<IcpPrice>({
    queryKey: ["icpPrice"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getIcpPrice();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRefreshIcpPrice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<PriceResult, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.refreshIcpPrice();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["icpPrice"] });
      void queryClient.invalidateQueries({ queryKey: ["saleStatus"] });
    },
  });
}

/**
 * Local HH:MM for a backend nanosecond timestamp (e.g. the hourly rate's
 * validUntil). Returns an em dash when the timestamp is absent or invalid.
 */
export function formatValidUntil(timestampNs: bigint | undefined): string {
  if (timestampNs === undefined || timestampNs <= 0n) return "—";
  const date = new Date(Number(timestampNs / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- Sale status, technical details & admin switches -----------------------

/**
 * True when the backend reports a valid hourly ICP/USD rate. When false, a
 * purchase is refused (no ICP taken) until the next hourly rate is set.
 */
export function isSalePriceUsable(status: SaleStatus): boolean {
  return status.priceUsable;
}

export function useGetSaleStatus() {
  const { actor, isFetching } = useActor();

  return useQuery<SaleStatus>({
    queryKey: ["saleStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getSaleStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

/** Public technical details of the ledger, oracle and purchase rules. */
export function useTechnicalDetails() {
  const { actor, isFetching } = useActor();

  return useQuery<TechnicalDetails>({
    queryKey: ["technicalDetails"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getTechnicalDetails();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

// --- Cycles reserve ---------------------------------------------------------

/** Public cycles balance, reserve, floor, excess and top-up history. */
export function useCyclesStatus() {
  const { actor, isFetching } = useActor();

  return useQuery<CyclesStatus>({
    queryKey: ["cyclesStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCyclesStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60_000,
  });
}

/**
 * Admin-only: moves `amountE8s` of reserve excess to the treasury account.
 * Resolves with the backend result; map it with withdrawReserveMessage.
 */
export function useWithdrawReserveExcess() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<WithdrawReserveResult, Error, bigint>({
    mutationFn: async (amountE8s: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.withdrawReserveExcess(amountE8s);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["cyclesStatus"] });
      void queryClient.invalidateQueries({ queryKey: ["technicalDetails"] });
    },
  });
}

/** Plain English message for a withdrawReserveExcess result. */
export function withdrawReserveMessage(result: WithdrawReserveResult): string {
  switch (result.__kind__) {
    case "ok":
      return `Transferred to the treasury account (ICP block ${result.ok.toString()}).`;
    case "noExcess":
      return "There is no excess above the 2 ICP floor to transfer.";
    case "amountExceedsExcess":
      return `The amount exceeds the withdrawable excess of ${formatIcpE8s(result.amountExceedsExcess.withdrawableE8s)}.`;
    case "treasuryNotConfigured":
      return "Set the treasury account before transferring the reserve excess.";
    case "busy":
      return "A cycles top-up or another withdrawal is in progress. Try again shortly.";
    case "topUpPendingNotify":
      return "A cycles top-up is waiting for confirmation. Try again after it completes.";
    case "ledgerError":
      return `The ICP ledger refused the transfer: ${result.ledgerError}`;
  }
}

function useSwitchMutation(
  call: (
    actor: NonNullable<ReturnType<typeof useActor>["actor"]>,
    value: boolean,
  ) => Promise<void>,
) {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error, boolean>({
    mutationFn: async (value: boolean) => {
      if (!actor) throw new Error("Actor not available");
      await call(actor, value);
    },
    onSuccess: () => {
      invalidateSale(queryClient);
    },
  });
}

export function useSetSalesPaused() {
  return useSwitchMutation((actor, paused) => actor.setSalesPaused(paused));
}

// --- Delivery address (optional, for the later migration) -------------------

export function useGetDeliveryAddress() {
  const { actor, isFetching } = useActor();

  return useQuery<Account | null>({
    queryKey: ["deliveryAddress"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getDeliveryAddress();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetDeliveryAddress() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<DeliveryAddressResult, Error, string>({
    mutationFn: async (principalText: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setDeliveryAddress(principalText.trim());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deliveryAddress"] });
    },
  });
}

export function useClearDeliveryAddress() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.clearDeliveryAddress();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deliveryAddress"] });
    },
  });
}

// --- Admin: snapshot, fee collector, minting account, legacy blocks ---------

/** On-demand export (admin) of all holder balances for the migration. */
export function useExportBalanceSnapshot() {
  const { actor } = useActor();

  return useMutation<BalanceSnapshot, Error, void>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.exportBalanceSnapshot();
    },
  });
}

export function useGetFeeCollector() {
  const { actor, isFetching } = useActor();

  return useQuery<FeeCollectorInfo>({
    queryKey: ["feeCollector"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getFeeCollector();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetBurnAccount() {
  const { actor, isFetching } = useActor();

  return useQuery<Account>({
    queryKey: ["burnAccount"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getBurnAccount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetLegacyBlockInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<LegacyBlockInfo>({
    queryKey: ["legacyBlockInfo"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getLegacyBlockInfo();
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
