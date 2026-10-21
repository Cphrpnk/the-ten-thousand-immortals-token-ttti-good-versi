import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import type { Account, TechnicalDetails } from "../backend";
import {
  useCyclesStatus,
  useTechnicalDetails,
  useTokenInfo,
} from "../hooks/useQueries";
import {
  CYCLES_FEE_TEXT,
  PRICE_SCALE,
  TOKEN_PRICE_USD,
  TTTI_DECIMALS,
  TTTI_SYMBOL,
  encodeAccountText,
  formatBps,
  formatIcpE8s,
  formatTtti,
  formatUnits,
  formatUsdE8,
  tttiToBuyerUsdE8,
  tttiToUsdE8,
} from "../lib/token";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

const shellClass = "w-full rounded-lg border border-gold bg-card shadow-none";
const skeletonIds = ["maximum", "total", "price", "fee"];
const detailSkeletonIds = ["a", "b", "c", "d", "e", "f"];
const NOT_PUBLISHED = "Not yet published";
const NOT_READ = "Not yet read";

const STATIC_ROWS: DetailRow[] = [
  { label: "Source code", value: NOT_PUBLISHED },
  {
    label: "TTTI-T to TTTI conversion",
    value: "No conversion function exists yet",
    wide: true,
  },
];

type DetailRow = {
  label: string;
  value: string;
  wide?: boolean;
  mono?: boolean;
};

function usd(whole: bigint): string {
  return `${whole.toLocaleString("en-US")} USD`;
}

function buildRows(d: TechnicalDetails): DetailRow[] {
  const sym = d.tokenSymbol || TTTI_SYMBOL;
  const dec = d.decimals;
  const ttti = (v: bigint) => `${formatTtti(v, dec)} ${sym}`;
  return [
    { label: "Token name", value: d.tokenName, mono: true },
    { label: "Symbol", value: sym, mono: true },
    { label: "Decimals", value: dec.toString(), mono: true },
    {
      label: "Smallest unit",
      value: `${d.smallestUnit.toString()} base unit = ${formatUnits(d.smallestUnit, dec, 0)} ${sym}`,
    },
    { label: "Maximum supply", value: ttti(d.maxSupply) },
    { label: "Total supply", value: ttti(d.totalSupply) },
    {
      label: "Transfer fee",
      value: `${formatUnits(d.transferFee, dec, 0)} ${sym} (${d.transferFee.toString()} base units)`,
    },
    { label: "Price per token", value: usd(d.tokenPriceUsd) },
    { label: "Buyer price incl. fee", value: usd(d.buyerPriceUsd) },
    { label: "Cycles fee", value: formatBps(d.cyclesFeeBps) },
    {
      label: "Minimum purchase",
      value: `${ttti(d.minPurchase)} (${formatUsdE8(tttiToBuyerUsdE8(d.minPurchase), 2)} incl. fee)`,
    },
    {
      label: "TTTI-T ledger canister ID",
      value: d.ledgerCanisterId.toText(),
      mono: true,
    },
    {
      label: "Index canister",
      value: d.ledgerCanisterId.toText(),
      mono: true,
    },
    {
      label: "ICP ledger canister ID",
      value: d.icpLedgerCanisterId.toText(),
      mono: true,
    },
    { label: "Standards", value: d.standards.join(" · ") },
    { label: "Price sources", value: d.oracleSources.join(" · "), wide: true },
    {
      label: "Maximum rate age",
      value: `${d.maxRateAgeSeconds.toString()} seconds`,
    },
    { label: "Rate refresh policy", value: d.refreshPolicy, wide: true },
    { label: "Rounding rule", value: d.roundingRule, wide: true },
    {
      label: "Excess payment handling",
      value: d.excessPaymentHandling,
      wide: true,
    },
    { label: "Delivery order", value: d.deliveryOrder, wide: true },
    {
      label: "Controllers",
      value: d.controllers
        ? d.controllers.length > 0
          ? d.controllers.map((p) => p.toText()).join(", ")
          : "None"
        : NOT_READ,
      wide: true,
      mono: d.controllers !== undefined && d.controllers.length > 0,
    },
    {
      label: "Build hash",
      value: d.moduleHash || NOT_READ,
      wide: true,
      mono: Boolean(d.moduleHash),
    },
    {
      label: "Legacy block boundary",
      value: d.legacyBlockBoundary.toString(),
      mono: true,
    },
  ];
}

export function TokenInfo() {
  const { data: tokenInfo, isLoading, isError } = useTokenInfo();
  const technical = useTechnicalDetails();

  if (isLoading) {
    return (
      <Card className={shellClass} data-ocid="token.loading_state">
        <CardHeader>
          <Skeleton className="h-8 w-2/3" />
        </CardHeader>
        <CardContent className="grid gap-8 sm:grid-cols-2">
          {skeletonIds.map((id) => (
            <Skeleton key={id} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError || !tokenInfo) {
    return (
      <Card className={shellClass} data-ocid="token.error_state">
        <CardHeader>
          <CardTitle className="font-display text-xl text-foreground">
            Token details are unavailable
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            The ledger could not be reached just now. Please try again in a
            moment.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const decimals = tokenInfo.decimals || TTTI_DECIMALS;
  const symbol = tokenInfo.symbol || TTTI_SYMBOL;
  const feeUsd = Number(tttiToUsdE8(tokenInfo.fee)) / Number(PRICE_SCALE);
  const feeUsdText = feeUsd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const details = technical.data;

  return (
    <Card className={shellClass} data-ocid="token.card">
      <CardHeader className="space-y-3 px-6 pb-4 pt-8 md:px-9 md:pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">
          The ledger
        </p>
        <CardTitle
          className="font-display text-2xl text-foreground md:text-3xl"
          data-ocid="token.name"
        >
          TTTI-T
        </CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Live figures from the TTTI-T ledger.
        </p>
      </CardHeader>
      <CardContent className="px-6 pb-8 md:px-9 md:pb-10">
        <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          <Metric
            label="Maximum supply"
            value={formatTtti(tokenInfo.maxSupply, decimals)}
            unit={symbol}
          />
          <Metric
            label="Total supply"
            value={formatTtti(tokenInfo.totalSupply, decimals)}
            unit={symbol}
          />
          <Metric
            label="Reference price"
            value={TOKEN_PRICE_USD.toLocaleString("en-US")}
            unit="USD"
          />
          <Metric
            label="Transfer fee"
            value={formatUnits(tokenInfo.fee, decimals, 0)}
            unit={symbol}
            note={`≈ ${feeUsdText} USD`}
          />
        </dl>

        <p className="border-t border-border/70 py-5 text-xs tracking-wide text-muted-foreground">
          Ledger standards: ICRC-1 · ICRC-2 · ICRC-3
        </p>

        <details
          className="group border-t border-border/70 pt-5"
          data-ocid="token.technical.panel"
        >
          <summary
            className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
            data-ocid="token.technical.toggle"
          >
            Technical details
            <span
              aria-hidden="true"
              className="text-primary transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          {technical.isLoading ? (
            <div
              className="grid gap-5 pb-2 pt-5 sm:grid-cols-2"
              data-ocid="token.technical.loading_state"
            >
              {detailSkeletonIds.map((id) => (
                <Skeleton key={id} className="h-10 w-full" />
              ))}
            </div>
          ) : !details ? (
            <p
              className="pt-5 text-sm text-muted-foreground"
              data-ocid="token.technical.error_state"
            >
              Technical details are unavailable right now. Please try again in a
              moment.
            </p>
          ) : null}
          <dl className="grid gap-5 pb-2 pt-5 sm:grid-cols-2">
            {details &&
              buildRows(details).map((row) => (
                <Detail key={row.label} row={row} />
              ))}
            {details && (
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                  Fee account
                </dt>
                <dd className="mt-2">
                  <FeeAccount account={details.feeAccount} />
                </dd>
                <p className="mt-2 text-xs text-muted-foreground">
                  Fee account balance:{" "}
                  {formatTtti(details.feeAccountBalance, details.decimals)}{" "}
                  {details.tokenSymbol || TTTI_SYMBOL}
                </p>
              </div>
            )}
            {details && <CyclesReserve details={details} />}
            {STATIC_ROWS.map((row) => (
              <Detail key={row.label} row={row} />
            ))}
          </dl>
        </details>
      </CardContent>
    </Card>
  );
}

function Detail({ row }: { row: DetailRow }) {
  return (
    <div className={`min-w-0 ${row.wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
        {row.label}
      </dt>
      <dd
        className={`mt-2 break-words text-sm text-foreground ${row.mono ? "font-mono break-all" : ""}`}
      >
        {row.value || "Unavailable"}
      </dd>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  note,
}: { label: string; value: string; unit: string; note?: string }) {
  return (
    <div className="min-w-0 border-b border-border/70 py-6 first:pt-3 sm:[&:nth-child(-n+2)]:pt-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.17em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="min-w-0 break-all font-display text-2xl tabular-nums text-foreground md:text-[1.7rem]">
          {value}
        </span>
        <span className="text-xs font-medium tracking-wider text-primary">
          {unit}
        </span>
      </dd>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function formatNs(ns: bigint): string {
  const date = new Date(Number(ns / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CyclesReserve({ details }: { details: TechnicalDetails }) {
  const { data: cycles, isLoading } = useCyclesStatus();
  const lastTopUp = cycles?.lastTopUp;
  const balanceText = isLoading
    ? "Loading…"
    : cycles
      ? formatIcpE8s(cycles.reserveBalanceE8s)
      : "Unavailable";
  const topUpText = isLoading
    ? "Loading…"
    : lastTopUp
      ? `${formatIcpE8s(lastTopUp.icpE8s)} · ${formatNs(lastTopUp.timestamp)}`
      : cycles
        ? "None yet"
        : "Unavailable";

  return (
    <div
      className="min-w-0 sm:col-span-2"
      data-ocid="token.cycles_reserve.panel"
    >
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
        Cycles reserve
      </dt>
      <dd className="mt-2 space-y-3">
        <AccountCopy
          account={details.cyclesReserveAccount}
          name="Cycles reserve account"
          ocid="token.cycles_reserve_account"
        />
        <p
          className="text-sm leading-relaxed text-foreground"
          data-ocid="token.cycles_reserve.rule"
        >
          {details.reserveRule || CYCLES_FEE_TEXT}
        </p>
        <div className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
          <p>
            Floor:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatIcpE8s(details.reserveFloorE8s)}
            </span>
          </p>
          <p data-ocid="token.cycles_reserve.balance">
            Reserve balance:{" "}
            <span className="font-mono tabular-nums text-foreground">
              {balanceText}
            </span>
          </p>
          <p data-ocid="token.cycles_reserve.last_top_up">
            Last top-up:{" "}
            <span className="tabular-nums text-foreground">{topUpText}</span>
          </p>
        </div>
      </dd>
    </div>
  );
}

function FeeAccount({ account }: { account: Account }) {
  return (
    <AccountCopy
      account={account}
      name="Fee account"
      ocid="token.fee_collector_account"
    />
  );
}

function AccountCopy({
  account,
  name,
  ocid,
}: { account: Account; name: string; ocid: string }) {
  const [copied, setCopied] = useState(false);
  const fullText = encodeAccountText(account);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex min-w-0 items-center gap-2" data-ocid={ocid}>
      <span
        className="min-w-0 truncate font-mono text-xs text-foreground"
        title={fullText}
        aria-label={`${name}: ${fullText}`}
      >
        {fullText}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary"
        aria-label={copied ? `${name} copied` : `Copy ${name.toLowerCase()}`}
        onClick={() =>
          void navigator.clipboard
            .writeText(fullText)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }
        data-ocid={`${ocid}_copy_button`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
