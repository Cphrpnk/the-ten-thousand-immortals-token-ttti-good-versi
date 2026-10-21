import { ArrowUpRight, Battery, Copy, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { TopUpStatus, WithdrawReserveResult } from "../../backend";
import {
  useCyclesStatus,
  useWithdrawReserveExcess,
  withdrawReserveMessage,
} from "../../hooks/useQueries";
import {
  RESERVE_FLOOR_E8S,
  encodeAccountText,
  formatIcpE8s,
  formatUnits,
  parseIcp,
} from "../../lib/token";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import { formatTimestamp } from "./ConversionsCard";
import { GOLD_CARD, PRIMARY_GOLD } from "./styles";

function formatCycles(cycles: bigint): string {
  return `${(Number(cycles) / 1e12).toFixed(3)} T cycles`;
}

function topUpStatusText(status: TopUpStatus): string {
  switch (status.__kind__) {
    case "transferred":
      return "Transferred, awaiting cycles notification";
    case "notified":
      return `Completed (${formatCycles(status.notified.cycles)})`;
    case "failed":
      return `Failed: ${status.failed}`;
  }
}

type Feedback = { ok: boolean; text: string } | null;

export function CyclesReserveCard() {
  const { data: status, isLoading, isError, refetch } = useCyclesStatus();
  const withdraw = useWithdrawReserveExcess();
  const [amountText, setAmountText] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const excess = status?.withdrawableExcessE8s ?? 0n;
  const floor = status?.reserveFloorE8s ?? RESERVE_FLOOR_E8S;
  const amount = amountText.trim() === "" ? null : parseIcp(amountText);
  const invalid = amountText.trim() !== "" && amount === null;
  const tooLarge = amount !== null && amount > excess;
  const disabled =
    withdraw.isPending ||
    excess === 0n ||
    amount === null ||
    amount <= 0n ||
    tooLarge;
  const accountText = status ? encodeAccountText(status.reserveAccount) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountText);
      toast.success("Reserve account copied");
    } catch {
      toast.error("The account could not be copied.");
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || amount === null) return;
    setFeedback(null);
    withdraw.mutate(amount, {
      onSuccess: (result: WithdrawReserveResult) => {
        const text = withdrawReserveMessage(result);
        const ok = result.__kind__ === "ok";
        setFeedback({ ok, text });
        if (ok) {
          setAmountText("");
          toast.success(text);
        } else {
          toast.error(text);
        }
      },
      onError: (error) => {
        const text = error.message || "The transfer failed.";
        setFeedback({ ok: false, text });
        toast.error(text);
      },
    });
  };

  return (
    <Card className={GOLD_CARD} data-ocid="admin.cycles_reserve_card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Battery className="h-5 w-5 text-primary" />
          Cycles Reserve
        </CardTitle>
        <CardDescription>
          ICP from the 1% fee, converted to cycles when the balance runs low.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton
            className="h-40 w-full"
            data-ocid="admin.cycles_reserve_loading_state"
          />
        ) : isError || !status ? (
          <Alert
            variant="destructive"
            data-ocid="admin.cycles_reserve_error_state"
          >
            <AlertDescription className="flex flex-wrap items-center gap-3">
              The cycles status could not be loaded.
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void refetch()}
                data-ocid="admin.cycles_reserve_retry_button"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reserve account</p>
              <div className="flex items-center gap-2">
                <code
                  className="min-w-0 flex-1 break-all font-mono text-xs"
                  data-ocid="admin.reserve_account"
                >
                  {accountText}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 shrink-0"
                  onClick={() => void handleCopy()}
                  aria-label="Copy reserve account"
                  data-ocid="admin.reserve_copy_button"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Reserve balance</dt>
              <dd
                className="text-right font-mono tabular-nums"
                data-ocid="admin.reserve_balance"
              >
                {formatIcpE8s(status.reserveBalanceE8s)}
              </dd>
              <dt className="text-muted-foreground">Floor</dt>
              <dd className="text-right font-mono tabular-nums">
                {formatIcpE8s(floor)}
              </dd>
              <dt className="text-muted-foreground">Withdrawable excess</dt>
              <dd
                className="text-right font-mono tabular-nums text-primary"
                data-ocid="admin.reserve_excess"
              >
                {formatIcpE8s(excess)}
              </dd>
              <dt className="text-muted-foreground">Cycles balance</dt>
              <dd
                className="text-right font-mono tabular-nums"
                data-ocid="admin.cycles_balance"
              >
                {formatCycles(status.cyclesBalance)}
              </dd>
              <dt className="text-muted-foreground">Top-up threshold</dt>
              <dd className="text-right font-mono tabular-nums">
                {formatCycles(status.topUpThreshold)}
              </dd>
            </dl>

            <div
              className="space-y-1.5 border-l border-border pl-4 text-sm"
              data-ocid="admin.last_topup"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Last top-up
              </p>
              {status.lastTopUp ? (
                <>
                  <p className="font-mono tabular-nums">
                    {formatTimestamp(status.lastTopUp.timestamp)} ·{" "}
                    {formatIcpE8s(status.lastTopUp.icpE8s)} · block{" "}
                    {status.lastTopUp.blockIndex.toString()}
                  </p>
                  <p>{topUpStatusText(status.lastTopUp.status)}</p>
                  <p className="break-words text-muted-foreground">
                    Last error:{" "}
                    {status.lastTopUp.lastError ? (
                      <span className="text-destructive">
                        {status.lastTopUp.lastError}
                      </span>
                    ) : (
                      "None"
                    )}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">None</p>
              )}
            </div>

            <div className="space-y-1.5" data-ocid="admin.reserve_withdrawals">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Withdrawals
              </p>
              {status.withdrawals.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground"
                  data-ocid="admin.reserve_withdrawals.empty_state"
                >
                  None
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {status.withdrawals.map((w, i) => (
                    <li
                      key={w.blockIndex.toString()}
                      className="flex flex-wrap justify-between gap-2 py-1.5 font-mono tabular-nums"
                      data-ocid={`admin.reserve_withdrawals.item.${i + 1}`}
                    >
                      <span className="text-muted-foreground">
                        {formatTimestamp(w.timestamp)}
                      </span>
                      <span>{formatIcpE8s(w.amountE8s)}</span>
                      <span className="text-muted-foreground">
                        block {w.blockIndex.toString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Label htmlFor="reserve-amount">Amount (ICP)</Label>
              <div className="flex gap-2">
                <Input
                  id="reserve-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  aria-invalid={invalid || tooLarge}
                  data-ocid="admin.reserve_amount_input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setAmountText(formatUnits(excess, 8, 0).replace(/,/g, ""))
                  }
                  disabled={excess === 0n}
                  data-ocid="admin.reserve_max_button"
                >
                  Max
                </Button>
              </div>
              {(invalid || tooLarge) && (
                <p
                  className="text-sm text-destructive"
                  data-ocid="admin.reserve_amount_error"
                >
                  {invalid
                    ? "Enter a valid ICP amount."
                    : "The amount exceeds the withdrawable excess."}
                </p>
              )}
              <Button
                type="submit"
                className={PRIMARY_GOLD}
                disabled={disabled}
                data-ocid="admin.reserve_withdraw_button"
              >
                {withdraw.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
                Transfer to treasury
              </Button>
              {excess === 0n && (
                <p className="text-xs text-muted-foreground">
                  No excess above the floor to transfer.
                </p>
              )}
              {feedback && (
                <p
                  className={
                    feedback.ok
                      ? "text-sm text-primary"
                      : "text-sm text-destructive"
                  }
                  aria-live="polite"
                  data-ocid={
                    feedback.ok
                      ? "admin.reserve_withdraw.success_state"
                      : "admin.reserve_withdraw.error_state"
                  }
                >
                  {feedback.text}
                </p>
              )}
            </form>
          </>
        )}
        <p
          className="flex items-start gap-2 text-xs text-muted-foreground"
          data-ocid="admin.reserve_note"
        >
          <Lock
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
            aria-hidden="true"
          />
          Transfers go only to the configured treasury account. The{" "}
          {formatIcpE8s(RESERVE_FLOOR_E8S)} floor always stays available for
          cycles.
        </p>
      </CardContent>
    </Card>
  );
}
