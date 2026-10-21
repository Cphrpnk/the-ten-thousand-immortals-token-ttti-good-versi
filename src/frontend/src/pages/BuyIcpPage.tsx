import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { SiInternetcomputer } from "react-icons/si";
import { Button } from "../components/ui/button";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  ONRAMPER_BUY_URL,
  copyAddressAndOpenOnramper,
  copyToClipboard,
} from "../lib/onramper";
import { encodeAccountText } from "../lib/token";

const ctaClass =
  "group h-12 gap-2 rounded-md border border-gold-strong bg-gradient-primary px-10 text-base font-semibold tracking-wide text-primary-foreground shadow-gold transition-smooth hover:shadow-gold-lg hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function shorten(address: string): string {
  return address.length > 18
    ? `${address.slice(0, 8)}…${address.slice(-6)}`
    : address;
}

export function BuyIcpPage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const address = isAuthenticated
    ? encodeAccountText({ owner: identity.getPrincipal() })
    : null;
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");

  const handleBuy = () => {
    if (!address) {
      window.open(ONRAMPER_BUY_URL, "_blank", "noopener,noreferrer");
      return;
    }
    void copyAddressAndOpenOnramper(address).then((ok) =>
      setCopied(ok ? "ok" : "failed"),
    );
  };

  const handleCopy = () => {
    if (!address) return;
    void copyToClipboard(address).then((ok) => setCopied(ok ? "ok" : "failed"));
  };

  return (
    <div
      className="mx-auto flex max-w-md flex-col items-center gap-10 py-12 text-center md:py-20"
      data-ocid="buy_icp.page"
    >
      <header className="animate-fade-up space-y-4">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-strong bg-primary/10 text-primary">
          <SiInternetcomputer className="h-6 w-6" />
        </span>
        <h1 className="text-imperial text-3xl leading-tight text-foreground md:text-4xl">
          Get <span className="text-gradient-gold">ICP</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          {address
            ? "Pick ICP, then paste your address on Onramper."
            : "Via Onramper."}
        </p>
      </header>

      <div className="flex w-full flex-col items-center gap-4">
        <Button
          type="button"
          onClick={handleBuy}
          className={ctaClass}
          aria-label="Buy ICP on Onramper (opens in a new tab)"
          data-ocid="buy_icp.onramper_primary_button"
        >
          Buy ICP
          <ExternalLink className="h-4 w-4" />
        </Button>

        {address && (
          <button
            type="button"
            onClick={handleCopy}
            title={address}
            aria-label="Copy wallet address"
            className="flex min-h-11 items-center gap-2 rounded-md border border-gold bg-card px-4 py-2 font-mono text-sm text-foreground transition-smooth hover:border-gold-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid="buy_icp.address_button"
          >
            {shorten(address)}
            {copied === "ok" ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}

        <p className="min-h-5 text-xs" aria-live="polite">
          {copied === "ok" && (
            <span
              className="text-primary"
              data-ocid="buy_icp.copy_success_state"
            >
              Address copied
            </span>
          )}
          {copied === "failed" && (
            <span
              className="text-destructive"
              data-ocid="buy_icp.copy_error_state"
            >
              Copy failed — click the address
            </span>
          )}
        </p>
      </div>

      <Link
        to="/exchange"
        className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-smooth hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        data-ocid="buy_icp.back_link"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
        Back to purchase
      </Link>
    </div>
  );
}
