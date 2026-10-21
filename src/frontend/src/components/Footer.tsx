import { Link } from "@tanstack/react-router";
import { FlatTokenIcon } from "./FlatTokenIcon";

const FOOTER_LINKS: Array<{ to: string; label: string; ocid: string }> = [
  { to: "/", label: "Home", ocid: "footer.home_link" },
  {
    to: "/white-paper",
    label: "White Paper",
    ocid: "footer.white_paper_link",
  },
  { to: "/buy-icp", label: "Get ICP", ocid: "footer.buy_icp_link" },
  { to: "/wallet", label: "Wallet", ocid: "footer.wallet_link" },
  { to: "/history", label: "History", ocid: "footer.history_link" },
];

const CREST_SRC = "/assets/generated/ttti-emblem.dim_1024x1024.png";

interface CrestLogoProps {
  /** Sizing and layout classes for the circular frame. */
  className?: string;
  /** Accessible name; leave empty for decorative usage. */
  alt?: string;
  loading?: "eager" | "lazy";
}

/**
 * The TTTI emblem (an antique-gold embossed medallion with a stylized face
 * above the TTTI lettering) clipped to its circular badge. The artwork sits on
 * a solid near-black square with the medallion nearly filling the frame, so a
 * light scale inside the rounded-full frame trims the dark corners while
 * keeping the outer gold rim and the TTTI lettering fully visible.
 */
export function CrestLogo({
  className = "",
  alt = "",
  loading,
}: CrestLogoProps) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}
      aria-hidden={alt ? undefined : true}
    >
      <img
        src={CREST_SRC}
        alt={alt}
        width={1024}
        height={1024}
        loading={loading}
        draggable={false}
        className="h-full w-full scale-[1.15] object-cover"
      />
    </span>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gold bg-card">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1.4fr] md:gap-12">
        <div className="flex flex-col gap-4">
          <Link
            to="/"
            className="flex w-fit items-center gap-3 rounded-md transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ocid="footer.brand_link"
          >
            <FlatTokenIcon
              alt="The Ten Thousand Immortals token"
              className="h-12 w-12"
            />
            <span className="text-imperial text-sm leading-tight text-gradient-gold">
              The Ten Thousand
              <br />
              Immortals
            </span>
          </Link>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Navigate
          </p>
          <ul className="flex flex-col gap-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex min-h-6 items-center rounded-sm text-sm text-muted-foreground transition-smooth hover:translate-x-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-ocid={link.ocid}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3" data-ocid="footer.disclaimer">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Notice
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            TTTI-T is a digital token. There is no promise of returns of any
            kind. All purchases are final. Only spend what you can afford to
            lose entirely.
          </p>
        </div>
      </div>

      <div className="divider-gold" />
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
        <p data-ocid="footer.copyright">
          © {year} The Ten Thousand Immortals. All rights reserved.
        </p>
        <img
          src="/assets/badges/on-chain-100-white.svg"
          alt="100% on-chain, on ICP"
          data-ocid="footer.onchain_badge"
          loading="lazy"
          className="h-12 w-auto object-contain opacity-90"
        />
      </div>
    </footer>
  );
}
