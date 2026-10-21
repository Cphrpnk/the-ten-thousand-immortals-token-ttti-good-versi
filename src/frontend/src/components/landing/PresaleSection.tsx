import { RefreshCw } from "lucide-react";
import { useGetSaleStatus } from "../../hooks/useQueries";
import {
  CYCLES_FEE_TEXT,
  TOKEN_PRICE_USD,
  TTTI_SYMBOL,
  formatTtti,
} from "../../lib/token";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Skeleton } from "../ui/skeleton";

const CAP_TEXT =
  "There are never more than 1 TTTI-T. Tokens cannot be burned. Once the cap is reached, minting stops for good; transfer fees collected by the contract are issued again against ICP: when one falls, another takes his place.";

export function PresaleSection() {
  const { data: status, isLoading, isError, refetch } = useGetSaleStatus();
  const percent =
    status && status.maxSupply > 0n
      ? Number((status.totalSupply * 10_000n) / status.maxSupply) / 100
      : 0;

  return (
    <section
      aria-labelledby="test-offering-title"
      className="bg-card/40 section-breathing"
      data-ocid="landing.snapshot.section"
    >
      <div className="container mx-auto px-4">
        <div className="rounded-lg border border-border bg-card px-6 py-8 md:px-10 md:py-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.23em] text-muted-foreground">
              Test release
            </p>
            <h2
              id="test-offering-title"
              className="mt-3 font-display text-3xl text-foreground md:text-4xl"
            >
              TTTI-T
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              This is a test release: one token, TTTI-T, 10,000 USD in total,
              from 1 USD. Same price as any future TTTI: no discount, no bonus,
              no advantage. If a full release ever happens, TTTI-T converts 1:1
              into TTTI. There may never be a full release.
            </p>
            <p
              className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base"
              data-ocid="landing.snapshot.cap_note"
            >
              {CAP_TEXT}
            </p>
          </div>

          {isLoading ? (
            <div
              className="mt-9 grid gap-6 border-t border-border pt-7 sm:grid-cols-3"
              data-ocid="landing.snapshot.loading_state"
            >
              {(["price", "sold", "remaining"] as const).map((id) => (
                <Skeleton key={id} className="h-16 w-full" />
              ))}
            </div>
          ) : isError || !status ? (
            <div
              className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-7"
              data-ocid="landing.snapshot.error_state"
            >
              <p className="text-sm text-muted-foreground">
                Live allocation figures are temporarily unavailable.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refetch()}
                data-ocid="landing.snapshot.retry_button"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : (
            <div
              className="mt-9 border-t border-border pt-7"
              data-ocid="landing.snapshot.panel"
            >
              <p className="mb-6 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {status.complete
                  ? "Allocation complete"
                  : status.salesPaused
                    ? "Purchases paused"
                    : "Current allocation"}
              </p>
              <dl className="grid gap-8 sm:grid-cols-3">
                <div data-ocid="landing.snapshot.price_card">
                  <dt className="text-xs text-muted-foreground">
                    Price per TTTI-T (before the 1% fee)
                  </dt>
                  <dd className="mt-2 font-display text-2xl tabular-nums text-foreground">
                    {TOKEN_PRICE_USD.toLocaleString("en-US")}{" "}
                    <span className="font-body text-xs">USD</span>
                  </dd>
                </div>
                <div data-ocid="landing.snapshot.sold_card">
                  <dt className="text-xs text-muted-foreground">
                    Total supply
                  </dt>
                  <dd className="mt-2 font-display text-2xl tabular-nums text-foreground">
                    {formatTtti(status.totalSupply)}{" "}
                    <span className="font-body text-xs">{TTTI_SYMBOL}</span>
                  </dd>
                </div>
                <div data-ocid="landing.snapshot.remaining_card">
                  <dt className="text-xs text-muted-foreground">Remaining</dt>
                  <dd className="mt-2 font-display text-2xl tabular-nums text-foreground">
                    {formatTtti(status.mintableRemaining)}{" "}
                    <span className="font-body text-xs">{TTTI_SYMBOL}</span>
                  </dd>
                </div>
              </dl>
              <p
                className="mt-5 max-w-2xl text-xs leading-relaxed text-muted-foreground"
                data-ocid="landing.snapshot.fee_note"
              >
                {CYCLES_FEE_TEXT}
              </p>
              <div className="mt-8 max-w-xl">
                <Progress
                  value={Math.min(percent, 100)}
                  aria-label={`Total supply: ${percent.toFixed(2)}% of the maximum supply`}
                  className="h-1 bg-muted [&>[data-slot=progress-indicator]]:bg-primary"
                  data-ocid="landing.snapshot.progress"
                />
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                  Total supply: {formatTtti(status.totalSupply)} /{" "}
                  {formatTtti(status.maxSupply)} {TTTI_SYMBOL} (
                  {percent.toFixed(2)}%)
                </p>
              </div>
            </div>
          )}

          <div
            className="mt-9 max-w-3xl border-t border-border pt-7"
            data-ocid="landing.snapshot.disclosures.panel"
          >
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Creator disclosures
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The ICP you pay goes to the creator, who may use it as he wishes.
              The creator does not buy back, defend a price or trade to create
              volume. He will not open a liquidity pool or list TTTI on any
              other exchange. Any market is created by holders.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              TTTI and THAT have the same creator. TTTI has no link to THAT: it
              cannot be exchanged for THAT, used inside THAT, or converted into
              anything else.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
