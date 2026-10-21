import { Coins, Sparkles, Wallet } from "lucide-react";
import { motion } from "motion/react";

const steps = [
  {
    icon: Wallet,
    title: "Pick a wallet",
    text: "Use the built-in wallet in one tap, or bring your own.",
  },
  {
    icon: Coins,
    title: "Add ICP",
    text: "Buy ICP by card, or transfer what you already hold.",
  },
  {
    icon: Sparkles,
    title: "Buy TTTI-T",
    text: "One button. Your tokens land in your wallet.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="scroll-mt-20 bg-card/40 py-20 md:py-28"
      data-ocid="landing.how_it_works.section"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Three steps
          </p>
          <h2
            id="how-title"
            className="text-imperial text-balance text-3xl leading-tight text-foreground md:text-5xl"
          >
            How it works
          </h2>
        </div>

        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="divider-gold absolute left-[16%] right-[16%] top-8 hidden w-auto md:block"
          />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.1 * index,
                }}
                className="relative flex flex-col items-center text-center"
                data-ocid={`landing.how_it_works.item.${index + 1}`}
              >
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-gold-strong bg-background text-primary shadow-gold">
                  <step.icon className="h-6 w-6" aria-hidden="true" />
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-primary font-display text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                </span>
                <h3 className="mt-6 font-display text-xl text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
