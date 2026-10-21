import {
  AlertCircle,
  Coins,
  Landmark,
  Loader2,
  Lock,
  Percent,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { PriceSource } from "../backend";
import {
  ConversionsCard,
  formatTimestamp,
} from "../components/admin/ConversionsCard";
import { CyclesReserveCard } from "../components/admin/CyclesReserveCard";
import { IcpAccountCard } from "../components/admin/IcpAccountCard";
import { LaunchControls } from "../components/admin/LaunchControls";
import { SnapshotExport } from "../components/admin/SnapshotExport";
import { TransferFeeCard } from "../components/admin/TransferFeeCard";
import { GOLD_CARD, SECONDARY_GOLD } from "../components/admin/styles";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import {
  useGetFee,
  useGetFeeCollector,
  useGetIcpPrice,
  useGetMaxSupply,
  useIsCallerAdmin,
  useRefreshIcpPrice,
  useTokenInfo,
} from "../hooks/useQueries";
import { TTTI_SYMBOL, formatTtti, formatUsdE8 } from "../lib/token";

const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  [PriceSource.coinbase]: "Coinbase",
  [PriceSource.coingecko]: "CoinGecko",
  [PriceSource.none]: "No source",
};

function toHex(bytes: Uint8Array | undefined): string {
  if (!bytes) return "";
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function AdminOnlyNotice() {
  return (
    <Card
      className="w-full max-w-2xl mx-auto rounded-lg border-destructive/40 bg-card"
      data-ocid="admin.denied_card"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg text-destructive">
          <ShieldAlert className="h-5 w-5" />
          Admins Only
        </CardTitle>
        <CardDescription>
          Your principal does not have administrator access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" data-ocid="admin.denied_state">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access denied</AlertTitle>
          <AlertDescription>
            Sign in with an administrator identity to pause sales, refresh the
            rate, set the test transfer fee, set the ICP receiving account, or
            export the balance snapshot.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export function AdminPage() {
  const { data: isAdmin, isLoading: isAdminLoading } = useIsCallerAdmin();
  const { data: tokenInfo, isLoading: isTokenLoading } = useTokenInfo();
  const { data: maxSupply } = useGetMaxSupply();
  const { data: currentFee, isLoading: isFeeLoading } = useGetFee();
  const { data: feeCollector, isLoading: isCollectorLoading } =
    useGetFeeCollector();
  const {
    data: icpPrice,
    isLoading: isPriceLoading,
    isError: isPriceError,
  } = useGetIcpPrice();
  const refreshPrice = useRefreshIcpPrice();

  if (isAdminLoading) {
    return (
      <div
        className="w-full max-w-2xl mx-auto space-y-4"
        data-ocid="admin.loading_state"
      >
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6" data-ocid="admin.page">
        <AdminOnlyNotice />
      </div>
    );
  }

  const handleRefreshPrice = () => {
    refreshPrice.mutate(undefined, {
      onSuccess: (result) => {
        if (result.__kind__ === "Ok") {
          toast.success("ICP/USD rate refreshed");
        } else {
          toast.error(result.Err || "The rate refresh failed.");
        }
      },
      onError: (error) => {
        toast.error(error.message || "The rate refresh failed.");
      },
    });
  };

  const totalSupply = tokenInfo?.totalSupply ?? 0n;
  const supplyCap = maxSupply ?? tokenInfo?.maxSupply ?? 0n;
  const usedPercent =
    supplyCap > 0n ? Number((totalSupply * 10000n) / supplyCap) / 100 : 0;
  const usedPercentText =
    totalSupply > 0n && usedPercent < 0.01
      ? "<0.01%"
      : `${usedPercent.toFixed(2)}%`;

  return (
    <div
      className="mx-auto flex max-w-6xl flex-col gap-12 md:gap-16"
      data-ocid="admin.page"
    >
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-imperial text-gradient-gold text-2xl leading-tight md:text-3xl">
            Admin Panel
          </h1>
          <Badge variant="secondary" className="gap-1 border-gold text-primary">
            <ShieldAlert className="w-3 h-3" />
            Admin
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Pause sales, refresh the rate, set the test transfer fee and the ICP
          receiving account, and export the balance snapshot.
        </p>
      </header>

      <section
        className="grid gap-x-8 gap-y-6 border-t border-border pt-8 sm:grid-cols-3"
        data-ocid="admin.supply_section"
      >
        <StatCard
          icon={<Coins className="w-4 h-4" />}
          label="Total Supply"
          value={
            isTokenLoading ? null : `${formatTtti(totalSupply)} ${TTTI_SYMBOL}`
          }
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Max Supply"
          value={
            isTokenLoading ? null : `${formatTtti(supplyCap)} ${TTTI_SYMBOL}`
          }
        />
        <StatCard
          icon={<Percent className="w-4 h-4" />}
          label="Transfer Fee"
          value={
            isFeeLoading
              ? null
              : `${formatTtti(currentFee ?? 0n)} ${TTTI_SYMBOL}`
          }
        />
      </section>

      <section className="space-y-2" data-ocid="admin.supply_progress">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Supply used</span>
          <span className="font-mono tabular-nums text-primary">
            {usedPercentText}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all"
            style={{ width: `${Math.min(usedPercent, 100)}%` }}
          />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Card className={GOLD_CARD} data-ocid="admin.fee_collector_card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Landmark className="w-5 h-5 text-primary" />
              Fee Account
            </CardTitle>
            <CardDescription>
              Collected transfer fees accrue here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol
              className="space-y-1.5 border-l border-border pl-4 text-sm text-muted-foreground"
              data-ocid="admin.delivery_order"
            >
              <li>
                1. New {TTTI_SYMBOL} tokens are minted first, up to the{" "}
                {supplyCap > 0n ? `${formatTtti(supplyCap)} ` : ""}
                {TTTI_SYMBOL} cap.
              </li>
              <li>
                2. Once the cap is reached, collected transfer fees are
                delivered from the fee account.
              </li>
            </ol>
            <p
              className="flex items-center gap-2 text-sm text-foreground"
              data-ocid="admin.fee_account_locked"
            >
              <Lock
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              The fee account cannot be withdrawn by anyone, admin included.
            </p>
            {isCollectorLoading || !feeCollector ? (
              <Skeleton
                className="h-24 w-full"
                data-ocid="admin.fee_collector_loading_state"
              />
            ) : (
              <>
                <SupplyRow
                  label="Balance"
                  value={`${formatTtti(feeCollector.balance)} ${TTTI_SYMBOL}`}
                />
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                  <dt className="text-muted-foreground">Owner</dt>
                  <dd
                    className="font-mono break-all"
                    data-ocid="admin.fee_collector_owner"
                  >
                    {feeCollector.account.owner.toText()}
                  </dd>
                  <dt className="text-muted-foreground">Subaccount</dt>
                  <dd className="font-mono break-all">
                    {toHex(feeCollector.account.subaccount) || "Default"}
                  </dd>
                </dl>
              </>
            )}
          </CardContent>
        </Card>
        <CyclesReserveCard />
      </div>

      <LaunchControls />

      <Card className={GOLD_CARD} data-ocid="admin.oracle_card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            ICP/USD Rate
          </CardTitle>
          <CardDescription>
            The rate is set once an hour from Coinbase, or from CoinGecko if
            Coinbase is unavailable. Manual refresh is allowed only when the
            rate is expired or absent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPriceLoading ? (
            <Skeleton className="h-9 w-48" />
          ) : isPriceError || !icpPrice ? (
            <Alert variant="destructive" data-ocid="admin.oracle_error_state">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The ICP/USD rate could not be loaded. Refresh it to try again.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <p
                className="text-2xl font-semibold tracking-tight font-mono tabular-nums text-primary"
                data-ocid="admin.oracle_price"
              >
                {formatUsdE8(icpPrice.usdE8)}
              </p>
              <Badge variant="outline" data-ocid="admin.oracle_source">
                {PRICE_SOURCE_LABELS[icpPrice.source]}
              </Badge>
              <Badge
                variant={icpPrice.usable ? "default" : "destructive"}
                data-ocid="admin.oracle_status"
              >
                {icpPrice.usable ? "Usable" : "Expired"}
              </Badge>
            </div>
          )}

          {icpPrice && !isPriceError && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Fetched at</dt>
              <dd
                className="font-mono tabular-nums"
                data-ocid="admin.oracle_fetched_at"
              >
                {icpPrice.fetchedAt > 0n
                  ? formatTimestamp(icpPrice.fetchedAt)
                  : "—"}
              </dd>
              <dt className="text-muted-foreground">Valid until</dt>
              <dd
                className="font-mono tabular-nums"
                data-ocid="admin.oracle_valid_until"
              >
                {icpPrice.validUntil > 0n
                  ? formatTimestamp(icpPrice.validUntil)
                  : "—"}
              </dd>
              <dt className="text-muted-foreground">Last success</dt>
              <dd
                className="font-mono tabular-nums"
                data-ocid="admin.oracle_last_success"
              >
                {icpPrice.lastSuccessAt !== undefined &&
                icpPrice.lastSuccessAt !== null
                  ? formatTimestamp(icpPrice.lastSuccessAt)
                  : "None"}
              </dd>
              <dt className="text-muted-foreground">Last error</dt>
              <dd data-ocid="admin.oracle_last_error">
                {icpPrice.lastError ? (
                  <>
                    <span className="break-words text-destructive">
                      {icpPrice.lastError.message}
                    </span>
                    <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                      {formatTimestamp(icpPrice.lastError.at)}
                    </span>
                  </>
                ) : (
                  "None"
                )}
              </dd>
            </dl>
          )}

          <Button
            type="button"
            variant="secondary"
            className={SECONDARY_GOLD}
            onClick={handleRefreshPrice}
            disabled={refreshPrice.isPending || !!icpPrice?.usable}
            data-ocid="admin.oracle_refresh_button"
          >
            {refreshPrice.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh rate
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-10 lg:grid-cols-2">
        <TransferFeeCard />
        <IcpAccountCard />
      </div>

      <SnapshotExport />

      <ConversionsCard className={GOLD_CARD} />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card
      className="surface-open gap-2 rounded-none border-l border-border py-2 pl-4 shadow-none"
      data-ocid="admin.stat_card"
    >
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground [&_svg]:text-primary">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-widest">
            {label}
          </span>
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-xl font-semibold tracking-tight font-mono tabular-nums text-foreground">
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SupplyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 border-l border-border pl-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tracking-tight font-mono tabular-nums">
        {value}
      </p>
    </div>
  );
}
