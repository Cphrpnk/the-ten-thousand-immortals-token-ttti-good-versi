import { AlertCircle, CheckCircle2, Loader2, Percent } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFeeBounds, useGetFee, useSetFee } from "../../hooks/useQueries";
import {
  TTTI_DECIMALS,
  TTTI_SYMBOL,
  formatTtti,
  parseTtti,
} from "../../lib/token";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
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
import { GOLD_CARD, SECONDARY_GOLD } from "./styles";

/** Transfer fee setting, within the backend bounds. Test TTTI-T version only. */
export function TransferFeeCard() {
  const { data: currentFee, isLoading: isFeeLoading } = useGetFee();
  const { data: feeBounds } = useFeeBounds();
  const setFee = useSetFee();

  const [feeInput, setFeeInput] = useState("");
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSuccess, setFeeSuccess] = useState<string | null>(null);

  const feeMin = feeBounds?.min ?? 0n;
  const feeMax = feeBounds?.max;
  const feeBoundsLabel =
    feeMax === undefined
      ? null
      : `${formatTtti(feeMin)} – ${formatTtti(feeMax)} ${TTTI_SYMBOL} (${feeMin.toString()}–${feeMax.toString()} base units)`;
  const feeParsed = parseTtti(feeInput);
  const feeInlineError =
    feeInput.trim() === ""
      ? null
      : feeParsed === null
        ? `Enter a fee with up to ${TTTI_DECIMALS} decimals, e.g. 0.000001.`
        : feeParsed < feeMin || (feeMax !== undefined && feeParsed > feeMax)
          ? `The fee must be between ${feeBoundsLabel ?? "the allowed bounds"}.`
          : null;

  const handleSetFee = (e: React.FormEvent) => {
    e.preventDefault();
    setFeeError(null);
    setFeeSuccess(null);

    const fee = parseTtti(feeInput);
    if (fee === null || fee < 0n) {
      setFeeError(
        `Enter a fee of 0 or more with up to ${TTTI_DECIMALS} decimals.`,
      );
      return;
    }
    if (feeInlineError) return;

    const capturedFee = feeInput;
    setFeeInput("");

    setFee.mutate(fee, {
      onSuccess: () => {
        setFeeSuccess(
          `Transfer fee updated to ${formatTtti(fee)} ${TTTI_SYMBOL}.`,
        );
        toast.success("Fee updated");
      },
      onError: (error) => {
        setFeeError(error.message || "Failed to update the fee.");
        toast.error(error.message || "Failed to update the fee.");
        setFeeInput((current) => (current === "" ? capturedFee : current));
      },
    });
  };

  return (
    <Card className={GOLD_CARD} data-ocid="admin.fee_card">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 font-display text-lg">
          <Percent className="w-5 h-5 text-primary" />
          Transfer Fee
          <Badge variant="secondary" className="border-gold text-primary">
            Test {TTTI_SYMBOL} version only
          </Badge>
        </CardTitle>
        <CardDescription>
          The fee charged on every token transfer. It can be changed only in
          this test version, within the current bounds. Current fee:{" "}
          {isFeeLoading
            ? "…"
            : `${formatTtti(currentFee ?? 0n)} ${TTTI_SYMBOL}`}
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSetFee} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fee-amount">New Fee ({TTTI_SYMBOL})</Label>
            <Input
              id="fee-amount"
              type="text"
              inputMode="decimal"
              placeholder={formatTtti(currentFee ?? 0n)}
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              autoComplete="off"
              aria-invalid={!!feeInlineError}
              aria-describedby="fee-amount-hint"
              className={
                feeInlineError
                  ? "border-destructive focus-visible:ring-destructive"
                  : undefined
              }
              data-ocid="admin.fee_input"
            />
            {feeInlineError ? (
              <p
                id="fee-amount-hint"
                className="text-xs text-destructive"
                role="alert"
                data-ocid="admin.fee_field_error"
              >
                {feeInlineError}
              </p>
            ) : (
              <p id="fee-amount-hint" className="text-xs text-muted-foreground">
                Up to {TTTI_DECIMALS} decimals, e.g. 0.000001.
                {feeBoundsLabel
                  ? ` Allowed range: ${feeBoundsLabel}.`
                  : " Loading allowed range…"}
              </p>
            )}
          </div>

          {feeError && (
            <Alert variant="destructive" data-ocid="admin.fee_error_state">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{feeError}</AlertDescription>
            </Alert>
          )}

          {feeSuccess && (
            <Alert
              className="border-primary/40 bg-primary/5"
              data-ocid="admin.fee_success_state"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>{feeSuccess}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            variant="secondary"
            className={`w-full ${SECONDARY_GOLD}`}
            disabled={
              setFee.isPending ||
              !!feeInlineError ||
              feeInput.trim() === "" ||
              feeMax === undefined
            }
            data-ocid="admin.fee_submit_button"
          >
            {setFee.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Percent className="w-4 h-4" />
                Update Fee
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
