import { motion } from "motion/react";

const paragraphs = [
  "They were called the Immortals. Ten thousand, always ten thousand. Organized. Trained. Feared across an empire.",
  "When one fell, another stepped into his place, and no one noticed the difference. They had no names, only a number to maintain.",
  "They did not fight for anything. They fought because they were ordered to.",
];

const epilogue = [
  "480 BC. Thermopylae.",
  "Three hundred Spartans stood in a narrow pass against the largest army the world had ever seen.",
  "The Immortals came with arrogance. Ten thousand, flawless, replaceable. For two days they threw themselves against the three hundred, and for two days they broke. Discipline was not enough. Skill was not enough. Numbers were not enough.",
  "They took the pass only through a traitor's path. The three hundred did not retreat. They fell where they stood.",
  "But the three hundred had not come to win a pass. They had come for something worth more than their lives: a freedom that was theirs, a cause they shared. And by dying for it, they made a scattered people believe in it.",
  "A year later, those people stood together. At Salamis and at Plataea, the empire broke.",
  "The Immortals were never defeated by a stronger army. They were defeated by three hundred who knew why they were fighting.",
  "An army that serves can win a battle. Only people who share a cause can win a war.",
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export function StorySection() {
  return (
    <section
      id="story"
      aria-labelledby="story-title"
      className="scroll-mt-20 bg-background py-20 md:py-28"
      data-ocid="landing.story.section"
    >
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div
          {...reveal}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            The legend
          </p>
          <h2
            id="story-title"
            className="text-imperial text-balance text-3xl leading-tight text-foreground md:text-5xl"
          >
            The Ten Thousand Immortals
          </h2>
          <div className="divider-gold max-w-24" />
          <div className="space-y-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            {paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </motion.div>

        <div
          className="mt-14 space-y-3 border-t border-border pt-8 text-sm italic leading-relaxed text-muted-foreground"
          data-ocid="landing.story.epilogue"
        >
          {epilogue.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
