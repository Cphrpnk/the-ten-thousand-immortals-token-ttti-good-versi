import { CYCLES_FEE_TEXT } from "../../lib/token";
import { TokenInfo } from "../TokenInfo";

const FACTS = [
  "Maximum supply: 10,000 TTTI",
  "8 decimals",
  "Smallest unit: 0.00000001 TTTI",
  "1 TTTI = 10,000 USD + 1% fee, paid in ICP",
  CYCLES_FEE_TEXT,
  "Minimum purchase: 0.0001 TTTI-T (1.01 USD)",
  "Ledger continued from earlier test versions (see Technical details)",
];

const CAP_TEXT =
  "There are never more than 10,000 TTTI. Tokens cannot be burned. Once the cap is reached, minting stops for good; transfer fees collected by the contract are issued again against ICP: when one falls, another takes his place.";

export function TokenDetailsSection() {
  return (
    <section
      id="token"
      aria-labelledby="token-title"
      className="scroll-mt-20 bg-background section-breathing"
      data-ocid="landing.token.section"
    >
      <div className="container mx-auto grid items-start gap-12 px-4 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div className="space-y-6 lg:pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            What TTTI is
          </p>
          <h2
            id="token-title"
            className="font-display text-balance text-4xl leading-tight text-foreground md:text-5xl"
          >
            TTTI is the ten thousand.
          </h2>
          <div className="max-w-md space-y-4 text-base leading-relaxed text-muted-foreground">
            <p>
              Organized. Reliable. Interchangeable by design: every unit is
              identical, every transfer settles the same way.
            </p>
            <p>
              TTTI does one thing, and does it without fail: it moves value.
            </p>
            <p>An instrument is only as good as the hand that holds it.</p>
          </div>
          <div
            className="max-w-md rounded-lg border border-gold bg-card p-6 shadow-none"
            data-ocid="landing.token.facts.panel"
          >
            <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">
              The facts
            </h3>
            <ul className="mt-4 divide-y divide-border/70 text-sm text-foreground">
              {FACTS.map((fact) => (
                <li key={fact} className="py-2.5 leading-relaxed">
                  {fact}
                </li>
              ))}
            </ul>
            <p
              className="mt-4 border-t border-border/70 pt-4 text-sm leading-relaxed text-muted-foreground"
              data-ocid="landing.token.cap_note"
            >
              {CAP_TEXT}
            </p>
          </div>
        </div>
        <div className="min-w-0">
          <TokenInfo />
        </div>
      </div>
      <div className="container mx-auto mt-10 px-4">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-5 border-t border-border/70 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Ledger standards
          </p>
          <img
            src="/assets/badges/icrc1-token-standard.png"
            alt="ICRC-1 token standard badge"
            loading="lazy"
            className="h-10 w-auto rounded object-contain"
          />
          <img
            src="/assets/badges/icrc2-token-standard.png"
            alt="ICRC-2 token standard badge"
            loading="lazy"
            className="h-10 w-auto rounded object-contain"
          />
          <img
            src="/assets/badges/icrc3-token-standard.svg"
            alt="ICRC-3 token standard badge"
            loading="lazy"
            className="h-10 w-auto rounded object-contain"
          />
        </div>
      </div>
    </section>
  );
}
