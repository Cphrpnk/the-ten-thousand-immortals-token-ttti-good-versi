import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  copyAddressAndOpenOnramper,
  copyToClipboard,
} from "../../lib/onramper";
import { formatIcp } from "../../lib/token";
import { Button } from "../ui/button";

interface GetIcpFirstPanelProps {
  /** Wallet address that receives ICP (copied for Onramper). */
  address: string;
  /** Current ICP balance in e8s. */
  balanceE8s: bigint;
  /** ICP (e8s) needed for the typed purchase, when known. */
  requiredE8s?: bigint;
}

type CopyState = "idle" | "ok" | "failed";

function shorten(address: string): string {
  return address.length > 18
    ? `${address.slice(0, 8)}…${address.slice(-6)}`
    : address;
}

/** Shown when the wallet holds no ICP or too little: one Onramper action. */
export function GetIcpFirstPanel({
  address,
  balanceE8s,
  requiredE8s,
}: GetIcpFirstPanelProps) {
  const [copied, setCopied] = useState<CopyState>("idle");
  const shortfall =
    requiredE8s !== undefined && requiredE8s > balanceE8s
      ? requiredE8s - balanceE8s
      : null;

  useEffect(() => {
    if (copied === "idle") return;
    const timer = window.setTimeout(() => setCopied("idle"), 4000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleBuyIcp = () => {
    void copyAddressAndOpenOnramper(address).then((ok) =>
      setCopied(ok ? "ok" : "failed"),
    );
  };

  const handleCopy = () => {
    void copyToClipboard(address).then((ok) => setCopied(ok ? "ok" : "failed"));
  };

  return (
    <section
      aria-label="Add ICP"
      className="flex flex-col items-center gap-4 rounded-xl border border-gold-strong bg-background/60 px-5 py-6 text-center"
      data-ocid="exchange.get_icp.panel"
    >
      <p className="text-sm text-muted-foreground">
        {shortfall !== null ? (
          <>
            Add{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatIcp(shortfall)} ICP
            </span>
          </>
        ) : (
          "Add ICP to buy"
        )}
      </p>

      <Button
        type="button"
        onClick={handleBuyIcp}
        className="h-12 w-full max-w-xs gap-2 rounded-lg border border-gold-strong bg-gradient-primary text-base font-semibold tracking-wide text-primary-foreground shadow-gold transition-smooth hover:shadow-gold-lg hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99]"
        aria-label="Buy ICP on Onramper (copies your address, opens in a new tab)"
        data-ocid="exchange.get_icp.primary_button"
      >
        Buy ICP
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </Button>

      <button
        type="button"
        onClick={handleCopy}
        title={address}
        aria-label="Copy wallet address"
        className="flex min-h-11 items-center gap-2 rounded-md border border-gold bg-card px-4 py-2 font-mono text-sm text-foreground transition-smooth hover:border-gold-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-ocid="exchange.get_icp.copy_button"
      >
        {shorten(address)}
        {copied === "ok" ? (
          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      <p className="min-h-5 text-xs" aria-live="polite">
        {copied === "ok" && (
          <span
            className="text-primary"
            data-ocid="exchange.get_icp.copy_success_state"
          >
            Address copied
          </span>
        )}
        {copied === "failed" && (
          <span
            className="text-destructive"
            data-ocid="exchange.get_icp.copy_error_state"
          >
            Copy failed — click the address
          </span>
        )}
        {copied === "idle" && (
          <span
            className="inline-flex items-center gap-1.5 text-muted-foreground"
            data-ocid="exchange.get_icp.loading_state"
          >
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Balance: {formatIcp(balanceE8s)} ICP
          </span>
        )}
      </p>
    </section>
  );
}
