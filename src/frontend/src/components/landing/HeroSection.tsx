import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useGetSaleStatus } from "../../hooks/useQueries";
import { CrestLogo } from "../Footer";
import { Skeleton } from "../ui/skeleton";

interface HeroSectionProps {
  id: string;
}

const ease = [0.22, 1, 0.36, 1] as const;

const TRUST_BADGES = [
  {
    src: "/assets/badges/on-chain-100-white.svg",
    alt: "100% on-chain, on ICP",
    rounded: false,
    sizeClass: "h-16",
    opacityClass: "opacity-90",
  },
  {
    src: "/assets/badges/icrc1-token-standard.png",
    alt: "ICRC-1 token standard badge",
    rounded: true,
    sizeClass: "h-8",
    opacityClass: "opacity-70",
  },
  {
    src: "/assets/badges/icrc2-token-standard.png",
    alt: "ICRC-2 token standard badge",
    rounded: true,
    sizeClass: "h-8",
    opacityClass: "opacity-70",
  },
  {
    src: "/assets/badges/icrc3-token-standard.svg",
    alt: "ICRC-3 token standard badge",
    rounded: true,
    sizeClass: "h-8",
    opacityClass: "opacity-70",
  },
] as const;

export function HeroSection({ id }: HeroSectionProps) {
  const { data: status, isLoading } = useGetSaleStatus();

  const eyebrow = status?.complete
    ? "Test allocation complete"
    : status?.salesPaused
      ? "Test purchases paused"
      : "TTTI-T is open";
  const eyebrowDot = status?.complete
    ? "bg-primary"
    : status?.salesPaused
      ? "bg-warning"
      : "bg-success animate-pulse-subtle";

  return (
    <section
      id={id}
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-background"
      data-ocid="landing.hero.section"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-pattern-imperial [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_75%)]"
      />
      <div className="container relative mx-auto grid min-h-[calc(100svh-4rem)] items-center gap-10 px-4 py-14 md:min-h-[calc(100svh-4.5rem)] md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <motion.div
          className="relative order-1 mx-auto flex aspect-square w-64 items-center justify-center sm:w-80 lg:order-2 lg:w-full lg:max-w-[30rem]"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease }}
        >
          <div
            aria-hidden="true"
            className="absolute -inset-[30%] glow-crest motion-safe:animate-glow-pulse"
          />
          <div
            aria-hidden="true"
            className="absolute inset-[6%] rounded-full border border-gold"
          />
          <div
            aria-hidden="true"
            className="absolute inset-[1%] rounded-full border border-gold opacity-40"
          />
          <CrestLogo
            alt="The Ten Thousand Immortals emblem: a gold winged helmet above the TTTI wordmark"
            className="h-[84%] w-[84%] shadow-gold-lg"
          />
        </motion.div>

        <div className="order-2 flex flex-col items-start gap-6 lg:order-1">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.1 }}
            className="min-h-5"
          >
            {isLoading ? (
              <Skeleton
                className="h-4 w-44"
                data-ocid="landing.hero.loading_state"
              />
            ) : (
              <p
                className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-primary"
                data-ocid="landing.hero.status"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${eyebrowDot}`}
                />
                {eyebrow}
              </p>
            )}
          </motion.div>

          <motion.h1
            id="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.18 }}
            className="text-imperial text-balance text-[2.6rem] leading-[1.02] tracking-[0.06em] text-foreground sm:text-6xl lg:text-7xl xl:text-[5.25rem]"
          >
            Ten Thousand <span className="text-gradient-gold">Immortals.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.28 }}
            className="flex max-w-xl flex-col gap-3"
          >
            <p className="text-balance text-base font-medium leading-relaxed text-foreground md:text-lg">
              Fast. Secure. Unbreakable in formation.
            </p>
            <p className="text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
              TTTI is exchange money in its purest form. It takes what the
              Internet Computer does best: transfers in seconds, secured
              on-chain, nearly free. It has all the qualities of ICP, plus a
              fixed maximum supply of 10,000 units. And it never gets in the
              way.
            </p>
            <p className="text-sm italic text-muted-foreground">
              Start with{" "}
              <Link
                to="/white-paper"
                className="text-primary underline-offset-4 transition-colors duration-200 hover:underline focus-visible:underline focus-visible:outline-none"
                data-ocid="landing.hero.white_paper_link"
              >
                the whitepaper
              </Link>
              .
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.38 }}
            className="mt-1 flex flex-wrap items-center justify-start gap-3 pt-2"
            data-ocid="landing.hero.trust_row"
          >
            {TRUST_BADGES.map((badge) => (
              <img
                key={badge.src}
                src={badge.src}
                alt={badge.alt}
                className={`${badge.sizeClass} w-auto object-contain ${badge.opacityClass} transition-opacity duration-200 hover:opacity-100 ${badge.rounded ? "rounded" : ""}`}
                loading="eager"
                decoding="async"
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
