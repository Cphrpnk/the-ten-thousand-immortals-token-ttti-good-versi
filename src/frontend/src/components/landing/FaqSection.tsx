import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CYCLES_FEE_TEXT } from "../../lib/token";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

const linkClass =
  "font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-smooth hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm";

const faqs: { id: string; question: string; answer: ReactNode }[] = [
  {
    id: "what",
    question: "What is TTTI-T?",
    answer: (
      <>
        TTTI-T is the test release of TTTI, an exchange currency on the Internet
        Computer. The ledger uses 8 decimals, and this test release contains one
        token. The price is 10,000 USD per token plus a fee, paid in ICP.{" "}
        {CYCLES_FEE_TEXT} Purchases start from 1.01 USD. There is no promise of
        returns of any kind.
      </>
    ),
  },
  {
    id: "icp",
    question: "How do I get ICP?",
    answer: (
      <>
        TTTI-T is bought with ICP. If you do not hold any yet, visit{" "}
        <Link
          to="/buy-icp"
          className={linkClass}
          data-ocid="landing.faq.buy_icp_link"
        >
          Get ICP first
        </Link>{" "}
        for trusted ways to buy ICP and send it to your wallet, then come back
        to complete your purchase.
      </>
    ),
  },
  {
    id: "rate",
    question: "How is the ICP/USD rate set?",
    answer: (
      <>
        The ICP/USD rate is set once an hour from Coinbase, or from CoinGecko if
        Coinbase is unavailable, and applies to every purchase in that hour. If
        no valid rate exists, the purchase is refused and no ICP is taken.
      </>
    ),
  },
  {
    id: "wallets",
    question: "Which wallets are supported?",
    answer: (
      <>
        You can sign in with Internet Identity or with the Plug wallet. Both
        keep you in control: the app reads your balances and you sign every
        transfer yourself.
      </>
    ),
  },
  {
    id: "where",
    question: "Where do my purchased tokens appear?",
    answer: (
      <>
        Your TTTI-T purchase is delivered to the account you signed in with. It
        appears under TTTI-T on the{" "}
        <Link
          to="/wallet"
          className={linkClass}
          data-ocid="landing.faq.wallet_link"
        >
          Wallet page
        </Link>
        . If you prefer, you can add an optional delivery address (a Principal
        ID) before buying — it is never required.
      </>
    ),
  },
  {
    id: "supply",
    question: "How many tokens can exist?",
    answer: (
      <>
        TTTI is the future version; TTTI-T is the live test. There are never
        more than 10,000 TTTI. Tokens cannot be burned. Once the cap is reached,
        minting stops for good; transfer fees collected by the contract are
        issued again against ICP: when one falls, another takes his place. There
        are never more than 1 TTTI-T. Tokens cannot be burned. Once the cap is
        reached, minting stops for good; transfer fees collected by the contract
        are issued again against ICP: when one falls, another takes his place.
      </>
    ),
  },
  {
    id: "privacy",
    question: "What is public, and what does the app keep?",
    answer: (
      <>
        Every purchase and transfer is recorded publicly and permanently on the
        ICP and TTTI-T ledgers. Anyone can see the amounts, the accounts and the
        times. Beyond that, the app keeps only your purchase records, your
        delivery address and the date you accepted the purchase terms.
      </>
    ),
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="section-breathing scroll-mt-20 bg-card/40"
      data-ocid="landing.faq.section"
    >
      <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Questions
          </p>
          <h2
            id="faq-title"
            className="text-imperial text-balance text-3xl leading-tight text-foreground md:text-5xl"
          >
            Before you buy
          </h2>
          <p className="text-base text-muted-foreground">
            Clear answers on the token, the wallets and how a purchase works.
          </p>
        </div>
        <Accordion
          type="single"
          collapsible
          className="surface-open border-t border-border"
          data-ocid="landing.faq.list"
        >
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="border-border"
              data-ocid={`landing.faq.item.${index + 1}`}
            >
              <AccordionTrigger
                className="py-6 text-left font-display text-lg text-foreground transition-smooth hover:text-primary hover:no-underline md:py-7 md:text-xl [&[data-state=open]]:text-primary"
                data-ocid={`landing.faq.toggle.${index + 1}`}
              >
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-7 text-base leading-relaxed text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
