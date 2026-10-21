import { Principal } from "@icp-sdk/core/principal";
import { Link, useLocation } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  TrendingUp,
  Undo2,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { Conversion, PurchaseError, PurchaseResult } from "../backend";
import { ConversionStatus, PriceSource } from "../backend";
import { FlatTokenIcon } from "../components/FlatTokenIcon";
import { DeliveryAddressCard } from "../components/exchange/DeliveryAddressCard";
import { GetIcpFirstPanel } from "../components/exchange/GetIcpFirstPanel";
import { MigrationNotice } from "../components/exchange/MigrationNotice";
import { PresaleProgress } from "../components/exchange/PresaleProgress";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { useBuyFunnel } from "../hooks/useBuyFunnel";
import { useIcpApprove } from "../hooks/useIcpApprove";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { usePlug } from "../hooks/usePlug";
import {
  usePlugAcceptPurchaseAcknowledgements,
  usePlugPurchase,
  usePlugPurchaseAcknowledgement,
} from "../hooks/usePlugPurchase";
import {
  formatValidUntil,
  isSalePriceUsable,
  useAcceptPurchaseAcknowledgements,
  useConvertDeposit,
  useGetDeliveryAddress,
  useGetMyPurchaseAcknowledgement,
  useGetSaleStatus,
  usePublicTreasuryInfo,
  useWalletBalance,
} from "../hooks/useQueries";
import { ICP_LEDGER_CANISTER_ID, requiredIcpBalance } from "../lib/icpLedger";
import {
  CYCLES_FEE_LABEL,
  CYCLES_FEE_TEXT,
  ICP_DECIMALS,
  ICP_DIVISOR,
  MIN_PURCHASE,
  MIN_PURCHASE_LABEL,
  TOKEN_PRICE_LABEL,
  TTTI_SYMBOL,
  encodeAccountText,
  formatIcp,
  formatTtti,
  formatUsdE8,
  icpForTtti,
  parseIcp,
  truncateAccountText,
  tttiFromIcp,
  tttiToUsdE8,
  unitsInputValue,
} from "../lib/token";
import { cn } from "../lib/utils";

const ICP_LEDGER = Principal.fromText(ICP_LEDGER_CANISTER_ID);
const PRICE_REFUSED = "Purchase refused: no valid ICP/USD rate is set";
const PRICE_REFUSED_MESSAGE =
  "No ICP was taken. Purchases are unavailable until a rate is set.";
const NO_CACHED_RATE = "No valid ICP/USD rate for this hour";
const ACK_REQUIRED = "Acknowledgements required";
const DISPLAY_SYMBOL = "TTTI-T";
const BALANCE_POLL_MS = 5_000;
const INSUFFICIENT_ICP = "Insufficient ICP (amount + 0.0001 fee)";
const REFUNDED =
  "Delivery failed — your ICP was refunded minus the 0.0001 ICP fee";
const REFUND_FAILED = "Delivery failed and the automatic refund also failed";

/** Gold & Obsidian surface and action styles shared across this page. */
const CARD_CLASS =
  "rounded-xl border border-gold bg-gradient-surface shadow-elevated transition-smooth";
const GOLD_BUTTON =
  "min-h-12 gap-2 rounded-lg border border-gold-strong bg-gradient-primary text-base font-semibold tracking-wide text-primary-foreground shadow-gold transition-smooth hover:shadow-gold-lg hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] disabled:shadow-none";
const OUTLINE_BUTTON =
  "rounded-lg border-gold bg-transparent text-foreground transition-smooth hover:border-gold-strong hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring";
const AMOUNT_INPUT =
  "h-14 border-gold bg-background/60 pr-16 font-mono text-xl tabular-nums transition-smooth focus-visible:border-gold-strong focus-visible:ring-2 focus-visible:ring-ring";

/** Six mandatory acknowledgements, asked once at the account's first purchase. */
const ACKNOWLEDGEMENTS = [
  {
    id: "read-first",
    text: 'I have read the "Read this first" section of the whitepaper.',
  },
  {
    id: "no-rights",
    text: "I understand that TTTI has no use, no intrinsic value and gives me no rights of any kind.",
  },
  {
    id: "price-zero",
    text: "I understand that its price can fall to zero and that nobody will support it or buy it back.",
  },
  {
    id: "icp-creator",
    text: "I understand that the ICP I pay goes to the creator, who may use it as he wishes.",
  },
  {
    id: "no-profit",
    text: "I am not relying on any promise of profit, from the creator or from anyone.",
  },
  {
    id: "afford-loss",
    text: "I am spending only what I can afford to lose entirely.",
  },
] as const;
type AcknowledgementId = (typeof ACKNOWLEDGEMENTS)[number]["id"];

const SOURCE_LABELS: Record<PriceSource, string> = {
  [PriceSource.coinbase]: "Coinbase",
  [PriceSource.coingecko]: "CoinGecko",
  [PriceSource.none]: "No live source",
};

type ActiveWallet = "plug" | "internetIdentity";
type Notice = { title: string; message: string; refunded?: boolean };
/** `useMax` is the input text that fills the remaining allocation. */
type Validation = Notice & { useMax?: string };
type Outcome =
  | { kind: "success"; conversion: Conversion }
  | ({ kind: "error" } & Notice);

/** USD amount scaled by 10^8 as a plain number, e.g. "4.735". */
function formatUsdPlain(usdE8: bigint): string {
  if (usdE8 <= 0n) return "—";
  return (Number(usdE8) / 100_000_000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}

function timestampToDate(timestamp: bigint): Date | null {
  if (timestamp <= 0n) return null;
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

function safePurchaseMessage(message: string | undefined): string {
  if (!message) {
    return "The purchase could not be completed for this destination. Check the recipient and try again.";
  }
  return message;
}

function describePurchaseError(err: PurchaseError): Notice {
  const ref = err.conversion
    ? ` Reference: purchase #${err.conversion.id}.`
    : "";
  const code = err.code;
  switch (code.__kind__) {
    case "salesPaused":
      return {
        title: "Sales are paused",
        message: safePurchaseMessage(err.message),
      };
    case "saleComplete":
      return {
        title: "Sale complete",
        message: safePurchaseMessage(err.message),
      };
    case "belowMinimum":
      return {
        title: "Below the minimum purchase",
        message: `The minimum is ${formatTtti(code.belowMinimum.minimumTtti)} ${DISPLAY_SYMBOL} (${MIN_PURCHASE_LABEL}); you requested ${formatTtti(code.belowMinimum.requestedTtti)} ${DISPLAY_SYMBOL}.`,
      };
    case "aboveRemaining":
      return {
        title: "Above the remaining amount",
        message: `The maximum available is ${formatTtti(code.aboveRemaining.maximumTtti)} ${DISPLAY_SYMBOL} (${formatIcp(code.aboveRemaining.maximumIcpE8s)} ICP); you requested ${formatTtti(code.aboveRemaining.requestedTtti)} ${DISPLAY_SYMBOL}.`,
      };
    case "priceUnavailable":
      return {
        title: PRICE_REFUSED,
        message: PRICE_REFUSED_MESSAGE,
      };
    case "acknowledgementRequired":
      return {
        title: ACK_REQUIRED,
        message:
          "This account has not accepted the six purchase acknowledgements. No ICP was taken.",
      };
    case "invalidAmount":
      return {
        title: "Invalid amount",
        message: safePurchaseMessage(err.message),
      };
    case "insufficientIcp":
      return {
        title: INSUFFICIENT_ICP,
        message: `${safePurchaseMessage(err.message)} Balance: ${formatIcp(code.insufficientIcp.balance)} ICP.`,
      };
    case "approvalMissing":
      return {
        title: "ICP approval missing",
        message: `${safePurchaseMessage(err.message)} Current allowance: ${formatIcp(code.approvalMissing.allowance)} ICP.`,
      };
    case "purchaseInProgress":
      return {
        title: "Purchase already in progress",
        message:
          "A purchase is already in progress for this account. Wait for it to finish, then try again. No ICP was taken for this request.",
      };
    case "deliveryFailedRefunded":
      return {
        title: REFUNDED,
        message: safePurchaseMessage(err.message) + ref,
        refunded: true,
      };
    case "deliveryFailedRefundFailed":
      return {
        title: REFUND_FAILED,
        message: `${safePurchaseMessage(err.message)}${ref} Contact the team with this reference.`,
      };
    case "icpLedgerError":
      return {
        title: "ICP ledger error",
        message: safePurchaseMessage(err.message),
      };
    case "anonymousCaller":
      return {
        title: "Sign in to buy",
        message: safePurchaseMessage(err.message),
      };
    default:
      return {
        title: "Purchase not completed",
        message: safePurchaseMessage(err.message),
      };
  }
}

function outcomeFromResult(result: PurchaseResult): Outcome {
  if (result.__kind__ === "Err") {
    return { kind: "error", ...describePurchaseError(result.Err) };
  }
  const c = result.Ok;
  const ref = ` Reference: purchase #${c.id}.`;
  if (c.status === ConversionStatus.completed) {
    return { kind: "success", conversion: c };
  }
  if (c.status === ConversionStatus.refunded) {
    return {
      kind: "error",
      title: REFUNDED,
      message: safePurchaseMessage(c.message) + ref,
      refunded: true,
    };
  }
  if (c.status === ConversionStatus.refundFailed) {
    return {
      kind: "error",
      title: REFUND_FAILED,
      message: `${safePurchaseMessage(c.message)}${ref} Contact the team with this reference.`,
    };
  }
  return {
    kind: "error",
    title: "Purchase failed",
    message: safePurchaseMessage(c.message) + ref,
  };
}

export function ExchangePage() {
  const { identity } = useInternetIdentity();
  const { principal: plugPrincipal } = usePlug();
  const { openSetup } = useBuyFunnel();
  const iiPrincipal =
    identity && !identity.getPrincipal().isAnonymous()
      ? identity.getPrincipal()
      : null;
  const wallet: ActiveWallet | null = plugPrincipal
    ? "plug"
    : iiPrincipal
      ? "internetIdentity"
      : null;
  const activePrincipal = plugPrincipal ?? iiPrincipal;
  const activePrincipalText = activePrincipal?.toText() ?? null;

  const statusQuery = useGetSaleStatus();
  const status = statusQuery.data;
  const { data: publicTreasury } = usePublicTreasuryInfo();
  const balanceQuery = useWalletBalance(
    ICP_LEDGER,
    activePrincipal ? { owner: activePrincipal } : undefined,
  );
  const { refetch: refetchBalance } = balanceQuery;
  const iiAddress = useGetDeliveryAddress();
  const approve = useIcpApprove();
  const convert = useConvertDeposit();
  const plugBuy = usePlugPurchase();
  // Acknowledgements are read and recorded by the same principal that buys.
  const iiAckQuery = useGetMyPurchaseAcknowledgement(
    wallet === "internetIdentity",
  );
  const plugAckQuery = usePlugPurchaseAcknowledgement(wallet === "plug");
  const iiAcceptAck = useAcceptPurchaseAcknowledgements();
  const plugAcceptAck = usePlugAcceptPurchaseAcknowledgements();
  const ackQuery = wallet === "plug" ? plugAckQuery : iiAckQuery;
  const acceptAck = wallet === "plug" ? plugAcceptAck : iiAcceptAck;

  const [checked, setChecked] = useState<
    Partial<Record<AcknowledgementId, boolean>>
  >({});
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<
    "idle" | "accepting" | "approving" | "buying"
  >("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [treasuryCopied, setTreasuryCopied] = useState(false);
  const busy = step !== "idle";

  useEffect(() => {
    if (!treasuryCopied) return;
    const timer = window.setTimeout(() => setTreasuryCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [treasuryCopied]);

  // Poll the ICP balance so the form appears as soon as ICP arrives.
  useEffect(() => {
    if (!activePrincipalText || busy) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refetchBalance();
    }, BALANCE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [activePrincipalText, busy, refetchBalance]);

  const locationHash = useLocation({ select: (loc) => loc.hash });
  useEffect(() => {
    const target =
      locationHash === "delivery-address" ||
      window.location.hash === "#delivery-address";
    if (!wallet || !target) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById("delivery-address")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [wallet, locationHash]);

  const price = status?.priceUsdE8 ?? 0n;
  const livePriceAvailable = price > 0n;
  const fetchedAt = status ? timestampToDate(status.priceFetchedAt) : null;
  const rateUsable = !!status && isSalePriceUsable(status);
  // Quotes use the hourly rate, the same value the backend uses for the
  // purchase; without a valid rate the purchase is refused and no ICP is taken.
  const priceAvailable =
    livePriceAvailable &&
    rateUsable &&
    status?.priceSource !== PriceSource.none;
  const hourlyRateText = status
    ? `Rate for this hour: 1 ICP = ${formatUsdPlain(price)} USD (${SOURCE_LABELS[status.priceSource]}) · valid until ${formatValidUntil(status.priceValidUntil)}`
    : "";
  const treasuryAccountText = publicTreasury
    ? encodeAccountText(publicTreasury.icpAccount)
    : "";
  const quote = (icpE8s: bigint) => tttiFromIcp(icpE8s, price);
  const icpFor = (tttiBase: bigint, roundUp: boolean) => {
    const cost = icpForTtti(tttiBase, price);
    if (roundUp || cost === 0n) return cost;
    // icpForTtti rounds up; step back one e8 when that overshoots.
    return tttiFromIcp(cost, price) > tttiBase ? cost - 1n : cost;
  };
  const minPurchase = status?.minPurchase ?? MIN_PURCHASE;
  const remaining = status?.available ?? 0n;
  const closed = !!status?.complete || !!status?.salesPaused;
  const icpBalance = balanceQuery.data;

  const parsed = parseIcp(amount);
  const hasAmount = parsed !== null && parsed > 0n;
  const tttiOut = hasAmount && priceAvailable ? quote(parsed) : 0n;
  const required = hasAmount ? requiredIcpBalance(parsed) : 0n;
  const maxIcp = priceAvailable ? icpFor(remaining, false) : 0n;

  let validation: Validation | null = null;
  if (amount.trim() !== "" && !hasAmount) {
    validation = {
      title: "Invalid amount",
      message: "Enter an ICP amount greater than 0 with up to 8 decimals.",
    };
  } else if (hasAmount && priceAvailable && tttiOut < minPurchase) {
    validation = {
      title: "Below the minimum purchase",
      message: `Minimum ${formatTtti(minPurchase)} ${DISPLAY_SYMBOL} (${MIN_PURCHASE_LABEL}), about ${formatIcp(icpFor(minPurchase, true))} ICP.`,
    };
  } else if (hasAmount && priceAvailable && tttiOut > remaining) {
    validation = {
      title: "Above the remaining amount",
      message: `Only ${formatTtti(remaining)} ${DISPLAY_SYMBOL} remain (${formatIcp(maxIcp)} ICP).`,
      useMax:
        remaining >= minPurchase
          ? unitsInputValue(maxIcp, ICP_DECIMALS)
          : undefined,
    };
  } else if (hasAmount && icpBalance !== undefined && icpBalance < required) {
    validation = {
      title: INSUFFICIENT_ICP,
      message: `You need ${formatIcp(required)} ICP including fees.`,
    };
  }

  const insufficientIcp = validation?.title === INSUFFICIENT_ICP;
  const zeroBalance = icpBalance === 0n && !busy;
  const walletAddress = activePrincipal
    ? encodeAccountText({ owner: activePrincipal })
    : "";
  const canPurchase = !!wallet && !closed && hasAmount && !validation && !busy;
  // The acknowledgement status is read for the active wallet's principal.
  const ackKnown = !!wallet && ackQuery.data !== undefined;
  const needsAck = !!wallet && ackQuery.data?.accepted === false;
  const allChecked = ACKNOWLEDGEMENTS.every((item) => checked[item.id]);
  const canSubmit = canPurchase && ackKnown && (!needsAck || allChecked);

  const resetAttempt = () => {
    setOutcome(null);
  };

  const handleBuy = async (event: FormEvent) => {
    event.preventDefault();
    if (!wallet || !canSubmit || parsed === null || parsed <= 0n) return;
    const icpAmount = parsed;
    const captured = amount;
    const restore = () => setAmount((cur) => (cur === "" ? captured : cur));
    setOutcome(null);
    setAmount("");
    try {
      if (needsAck) {
        setStep("accepting");
        await acceptAck.mutateAsync();
      }
      setStep("approving");
      const approval = await approve.mutateAsync({
        purchaseE8s: icpAmount,
        balanceE8s: icpBalance,
        wallet,
      });
      if (!approval.ok) {
        setOutcome({
          kind: "error",
          title: "ICP approval failed",
          message: approval.message,
        });
        restore();
        return;
      }
      setStep("buying");
      const result =
        wallet === "plug"
          ? await plugBuy.mutateAsync({ icpAmount })
          : await convert.mutateAsync({ recipient: null, icpAmount });
      const next = outcomeFromResult(result);
      setOutcome(next);
      if (next.kind !== "success") restore();
    } catch (error) {
      setOutcome({
        kind: "error",
        title: "Purchase not completed",
        message:
          error instanceof Error && error.message
            ? safePurchaseMessage(error.message)
            : "The purchase could not be submitted. Please try again.",
      });
      restore();
    } finally {
      setStep("idle");
      void refetchBalance();
    }
  };

  const handleCopyTreasury = async () => {
    if (!treasuryAccountText) return;
    try {
      await navigator.clipboard.writeText(treasuryAccountText);
      setTreasuryCopied(true);
    } catch {
      setTreasuryCopied(false);
    }
  };

  const buyLabel =
    step === "accepting"
      ? "Recording acknowledgements…"
      : step === "approving"
        ? "Approving ICP…"
        : step === "buying"
          ? "Buying…"
          : status?.complete
            ? "Sale complete"
            : status?.salesPaused
              ? "Sales are paused"
              : "Buy";

  const outcomeAlerts = (
    <>
      {outcome?.kind === "error" && (
        <Alert
          variant={outcome.refunded ? "default" : "destructive"}
          className={outcome.refunded ? "border-warning/50 bg-warning/10" : ""}
          data-ocid="exchange.error_state"
        >
          {outcome.refunded ? (
            <Undo2 className="h-4 w-4 text-warning" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{outcome.title}</AlertTitle>
          {outcome.message.trim() && (
            <AlertDescription>{outcome.message}</AlertDescription>
          )}
        </Alert>
      )}
      {outcome?.kind === "success" && (
        <Alert
          className="border-gold-strong bg-primary/10 shadow-gold"
          data-ocid="exchange.success_state"
        >
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle className="font-display text-base tabular-nums">
            You received {formatTtti(outcome.conversion.tttiAmount)}{" "}
            {DISPLAY_SYMBOL}
          </AlertTitle>
          <AlertDescription className="text-xs tabular-nums">
            {formatIcp(outcome.conversion.icpAmount)} ICP · #
            {outcome.conversion.id.toString()}
          </AlertDescription>
        </Alert>
      )}
    </>
  );

  const purchaseCard = !wallet ? (
    <Card className={CARD_CLASS} data-ocid="exchange.connect_card">
      <CardContent className="flex flex-col items-center gap-6 px-6 py-12 text-center">
        <FlatTokenIcon className="h-14 w-14 rounded-full" alt="" />
        <Button
          type="button"
          className={cn(GOLD_BUTTON, "w-full max-w-xs")}
          onClick={openSetup}
          data-ocid="exchange.buy_ttti.primary_button"
        >
          Buy TTTI-T
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  ) : (
    <Card className={CARD_CLASS} data-ocid="exchange.form_card">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-display text-xl">Buy</CardTitle>
          <Badge
            variant="outline"
            className="rounded-full border-gold bg-primary/10 text-primary"
            data-ocid="exchange.wallet_badge"
          >
            {wallet === "plug" ? "Plug" : "Built-in wallet"}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Balance</span>
          {balanceQuery.isLoading ? (
            <Skeleton
              className="h-5 w-28"
              data-ocid="exchange.balance.loading_state"
            />
          ) : (
            <span
              className="inline-flex items-center gap-2 font-mono font-semibold tabular-nums text-foreground"
              data-ocid="exchange.icp_balance"
            >
              {balanceQuery.isFetching && (
                <Loader2
                  className="h-3 w-3 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              {icpBalance !== undefined
                ? `${formatIcp(icpBalance)} ICP`
                : "Unavailable"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {zeroBalance && !closed ? (
          <>
            <GetIcpFirstPanel address={walletAddress} balanceE8s={0n} />
            {outcomeAlerts}
          </>
        ) : (
          <form onSubmit={handleBuy} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="icp-amount" className="text-muted-foreground">
                You pay
              </Label>
              <div className="relative">
                <Input
                  id="icp-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    resetAttempt();
                  }}
                  disabled={closed || busy}
                  autoComplete="off"
                  className={AMOUNT_INPUT}
                  aria-invalid={!!validation}
                  aria-describedby="icp-amount-preview"
                  data-ocid="exchange.amount_input"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-mono text-sm font-semibold text-muted-foreground">
                  ICP
                </span>
              </div>
              <div
                id="icp-amount-preview"
                className="flex items-baseline justify-between gap-3 px-1 pt-1"
                aria-live="polite"
                data-ocid="exchange.preview_panel"
              >
                <span className="text-sm text-muted-foreground">
                  You receive
                </span>
                <span className="min-w-0 text-right">
                  <span
                    className="inline-flex items-center gap-2 font-mono text-lg font-semibold tabular-nums text-primary"
                    data-ocid="exchange.ttti_output"
                  >
                    <FlatTokenIcon className="h-5 w-5 shrink-0" alt="" />
                    <span className="break-all">
                      {priceAvailable ? formatTtti(tttiOut) : "—"} TTTI-T
                    </span>
                  </span>
                  <span className="block text-xs tabular-nums text-muted-foreground">
                    ≈ {formatUsdE8(tttiToUsdE8(tttiOut), 2)}
                    {hasAmount && ` · ${formatIcp(required)} ICP with fees`}
                  </span>
                </span>
              </div>
            </div>

            {!statusQuery.isLoading && !priceAvailable && (
              <Alert data-ocid="exchange.price_unavailable_state">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{NO_CACHED_RATE}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Purchases are unavailable until a rate is set. The rate is
                    set once an hour; no ICP is taken without a valid rate.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn("mt-1", OUTLINE_BUTTON)}
                    onClick={() => void statusQuery.refetch()}
                    disabled={statusQuery.isFetching}
                    data-ocid="exchange.retry_button"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {validation && !insufficientIcp && (
              <Alert
                variant="destructive"
                data-ocid="exchange.validation_error"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{validation.title}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{validation.message}</p>
                  {validation.useMax !== undefined && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={OUTLINE_BUTTON}
                      onClick={() => {
                        const max = validation?.useMax;
                        if (max !== undefined) {
                          setAmount(max);
                          resetAttempt();
                        }
                      }}
                      data-ocid="exchange.use_max_button"
                    >
                      Use maximum
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {insufficientIcp && icpBalance !== undefined && (
              <GetIcpFirstPanel
                address={walletAddress}
                balanceE8s={icpBalance}
                requiredE8s={required}
              />
            )}

            {outcomeAlerts}

            {!!wallet && ackQuery.isLoading && (
              <Skeleton
                className="h-24 w-full"
                data-ocid="exchange.acknowledgements.loading_state"
              />
            )}

            {!!wallet && ackQuery.isError && (
              <Alert
                variant="destructive"
                data-ocid="exchange.acknowledgements.error_state"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acknowledgement status unavailable</AlertTitle>
                <AlertDescription>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn("mt-1", OUTLINE_BUTTON)}
                    onClick={() => void ackQuery.refetch()}
                    disabled={ackQuery.isFetching}
                    data-ocid="exchange.acknowledgements.retry_button"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {needsAck && (
              <fieldset
                className="space-y-1 rounded-lg border border-border bg-background/60 px-3 py-2"
                data-ocid="exchange.acknowledgements.panel"
              >
                <legend className="px-1 text-xs text-muted-foreground">
                  Required once, before the first purchase
                </legend>
                {ACKNOWLEDGEMENTS.map((item, index) => (
                  <label
                    key={item.id}
                    htmlFor={`exchange-ack-${item.id}`}
                    className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm"
                  >
                    <input
                      id={`exchange-ack-${item.id}`}
                      type="checkbox"
                      checked={!!checked[item.id]}
                      onChange={(event) => {
                        const value = event.target.checked;
                        setChecked((prev) => ({ ...prev, [item.id]: value }));
                      }}
                      disabled={busy || closed}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed"
                      data-ocid={`exchange.acknowledgement.checkbox.${index + 1}`}
                    />
                    <span className="min-w-0 text-muted-foreground">
                      {item.text}
                    </span>
                  </label>
                ))}
                <Link
                  to="/white-paper"
                  hash="reading-notice"
                  className="inline-block px-1 pb-1 text-xs font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-ocid="exchange.white_paper.link"
                >
                  Open the "Read this first" section
                </Link>
              </fieldset>
            )}

            {canPurchase && needsAck && !allChecked && (
              <p
                className="text-xs text-muted-foreground"
                data-ocid="exchange.acknowledgements.hint"
              >
                Tick all six statements to enable Buy.
              </p>
            )}

            <Button
              type="submit"
              className={cn(GOLD_BUTTON, "w-full")}
              disabled={!canSubmit}
              aria-busy={busy}
              data-ocid="exchange.submit_button"
            >
              {busy && (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  data-ocid="exchange.loading_state"
                />
              )}
              {buyLabel}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div
      className="mx-auto flex max-w-6xl flex-col gap-6 md:gap-10"
      data-ocid="exchange.page"
    >
      <header className="space-y-3">
        <h1 className="text-imperial text-gradient-gold text-3xl font-bold md:text-5xl">
          Buy {DISPLAY_SYMBOL}
        </h1>
        <p className="text-sm text-muted-foreground">
          1 TTTI-T ={" "}
          <span className="font-mono tabular-nums text-foreground">
            {TOKEN_PRICE_LABEL}
          </span>{" "}
          + fixed {CYCLES_FEE_LABEL} fee · Minimum {MIN_PURCHASE_LABEL}
        </p>
        <p className="text-xs text-muted-foreground">
          ICP beyond the cost of what is delivered is never taken.
        </p>
        <p
          className="text-xs text-muted-foreground"
          data-ocid="exchange.token_identity_note"
        >
          Shown as {TTTI_SYMBOL} in wallets.
        </p>
        <div className="divider-gold max-w-xs" />
      </header>

      {wallet === "internetIdentity" && iiAddress.data === null && (
        <MigrationNotice />
      )}

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
          {purchaseCard}
          {wallet && (
            <DeliveryAddressCard
              key={wallet}
              wallet={wallet}
              plugPrincipal={plugPrincipal}
            />
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <PresaleProgress status={status} isLoading={statusQuery.isLoading} />
          <Card className={CARD_CLASS} data-ocid="exchange.price_card">
            <CardHeader className="pb-3">
              <CardTitle className="text-imperial flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                ICP/USD
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {statusQuery.isLoading ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-mono text-2xl font-bold tabular-nums text-primary"
                    data-ocid="exchange.icp_price"
                  >
                    {livePriceAvailable ? formatUsdE8(price) : "—"}
                  </span>
                </div>
              )}
              {status && (
                <p
                  className="text-xs tabular-nums text-muted-foreground"
                  data-ocid="exchange.hourly_rate"
                >
                  {hourlyRateText}
                </p>
              )}
              {status && !rateUsable && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="exchange.rate_unusable_note"
                >
                  Purchases are unavailable until a rate is set.
                </p>
              )}
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">1 ICP buys</dt>
                  <dd className="font-mono tabular-nums">
                    {priceAvailable
                      ? `${formatTtti(quote(ICP_DIVISOR))} TTTI-T`
                      : "—"}
                  </dd>
                </div>
                <Separator className="bg-primary/20" />
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Source</dt>
                  <dd data-ocid="exchange.price_source">
                    {status ? SOURCE_LABELS[status.priceSource] : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Fetched</dt>
                  <dd className="text-right">
                    {fetchedAt
                      ? fetchedAt.toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Never"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Fee (fixed)</dt>
                    <dd
                      className="font-mono tabular-nums"
                      data-ocid="exchange.cycles_fee"
                    >
                      {CYCLES_FEE_LABEL}
                    </dd>
                  </div>
                  <dd
                    className="text-xs leading-relaxed text-muted-foreground"
                    data-ocid="exchange.cycles_fee_note"
                  >
                    {CYCLES_FEE_TEXT}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Treasury</dt>
                  <dd className="flex min-w-0 items-center justify-end gap-1">
                    <span
                      className="min-w-0 truncate font-mono text-xs"
                      title={treasuryAccountText || undefined}
                      data-ocid="exchange.treasury_account"
                    >
                      {treasuryAccountText
                        ? truncateAccountText(treasuryAccountText)
                        : "—"}
                    </span>
                    {treasuryAccountText && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-md text-muted-foreground transition-smooth hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => void handleCopyTreasury()}
                        aria-label={
                          treasuryCopied
                            ? "Treasury ICP account copied"
                            : "Copy treasury ICP account"
                        }
                        data-ocid="exchange.treasury_account_copy_button"
                      >
                        {treasuryCopied ? (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
