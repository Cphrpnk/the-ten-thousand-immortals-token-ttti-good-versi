import { Check, Copy } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { copyToClipboard } from "../../lib/onramper";
import { truncateAccountText } from "../../lib/token";
import { DialogTitle } from "../ui/dialog";

export const STEP_COUNT = 3;

/** Gold main action button style for the setup flow. */
export const GOLD_BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gold-strong bg-gradient-primary px-6 font-body text-base font-semibold text-primary-foreground shadow-gold transition-smooth hover:shadow-gold-lg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-4";

/** Quiet secondary button style for the setup flow. */
export const QUIET_BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-6 font-body text-base font-medium text-foreground transition-smooth hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

/** Segmented 3-step indicator with a mono counter. */
export function StepIndicator({ step }: { step: number }) {
  return (
    <div
      className="flex flex-1 items-center gap-3"
      data-ocid="setup_flow.panel"
    >
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {["wallet", "sign-in", "icp"].map((id, index) => (
          <span
            key={id}
            className="step-segment"
            data-state={
              index + 1 < step ? "done" : index + 1 === step ? "active" : "todo"
            }
          />
        ))}
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        <span className="sr-only">Step </span>
        {step} / {STEP_COUNT}
      </span>
    </div>
  );
}

/** The single serif question of a setup screen. */
export function StepQuestion({ children }: { children: ReactNode }) {
  return (
    <DialogTitle className="text-balance text-center font-display text-3xl font-normal leading-tight text-foreground md:text-4xl">
      {children}
    </DialogTitle>
  );
}

/** Shortened wallet address that copies itself on click. */
export function AddressChip({
  address,
  ocid,
}: {
  address: string;
  ocid: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(id);
  }, [copied]);

  const handleCopy = () => {
    void copyToClipboard(address).then((ok) => setCopied(ok));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="address-chip max-w-full text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        data-copied={copied}
        aria-label="Copy wallet address"
        title={address}
        data-ocid={ocid}
      >
        <span className="truncate">{truncateAccountText(address, 8, 6)}</span>
        {copied ? (
          <Check className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <Copy className="size-4 shrink-0 text-primary" aria-hidden="true" />
        )}
      </button>
      <span className="h-5 text-sm" aria-live="polite">
        {copied ? (
          <span
            className="inline-block animate-copied-pop text-success motion-reduce:animate-none"
            data-ocid={`${ocid}.success_state`}
          >
            Address copied
          </span>
        ) : null}
      </span>
    </div>
  );
}

/** Small pulsing line shown while the ICP balance is polled. */
export function WaitingForIcp() {
  return (
    <p
      className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
      data-ocid="setup.icp.loading_state"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Waiting for ICP
    </p>
  );
}
