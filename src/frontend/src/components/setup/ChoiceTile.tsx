import { ChevronRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type ChoiceTone = "default" | "primary" | "plug" | "quiet";

interface ChoiceTileProps {
  label: string;
  icon: ReactNode;
  ocid: string;
  tone?: ChoiceTone;
  /** Small pill next to the label (e.g. "Recommended"). */
  badge?: string;
  /** Replaces the default chevron on the right. */
  trailing?: ReactNode;
  /** Renders an external link opening in a new tab instead of a button. */
  href?: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const TONE_CLASS: Record<ChoiceTone, string> = {
  default: "",
  primary: "choice-tile-primary",
  plug: "choice-tile-plug",
  quiet: "!min-h-16 !py-3 text-muted-foreground hover:text-foreground",
};

const ICON_CLASS: Record<ChoiceTone, string> = {
  default: "bg-muted text-foreground",
  primary: "border border-gold bg-primary/15 text-primary",
  plug: "bg-gradient-plug text-foreground",
  quiet: "bg-muted text-muted-foreground",
};

/** Big full-width answer tile for the guided setup flow. */
export function ChoiceTile({
  label,
  icon,
  ocid,
  tone = "default",
  badge,
  trailing,
  href,
  onClick,
  loading = false,
  disabled = false,
}: ChoiceTileProps) {
  const className = cn(
    "choice-tile group active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
    TONE_CLASS[tone],
  );
  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
          tone === "quiet" ? "h-9 w-9" : "h-11 w-11",
          ICON_CLASS[tone],
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={cn(
            "font-body font-medium",
            tone === "quiet" ? "text-base" : "text-lg",
            tone === "plug" && "text-gradient-plug",
          )}
        >
          {label}
        </span>
        {badge ? (
          <span className="rounded-full border border-gold px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {badge}
          </span>
        ) : null}
      </span>
      <span
        className="shrink-0 text-muted-foreground transition-smooth group-hover:translate-x-0.5 group-hover:text-foreground [&_svg]:size-5"
        aria-hidden="true"
      >
        {loading ? (
          <Loader2 className="animate-spin text-primary" />
        ) : (
          (trailing ?? <ChevronRight />)
        )}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
        data-ocid={ocid}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      data-ocid={ocid}
    >
      {content}
    </button>
  );
}
