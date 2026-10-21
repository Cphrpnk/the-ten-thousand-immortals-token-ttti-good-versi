# Design Brief

## Direction

Gold & Obsidian, guided-setup edition — extend the existing presale system with a calm, one-question-per-screen onboarding flow (wallet → ICP → buy TTTI-T).

## Tone

Numismatic restraint: warm black framing, generous space, gold reserved for the recommended path and primary actions; one off-palette violet→magenta accent reserved solely for Plug.

## Differentiation

A ceremonial three-step setup where each screen asks one question with big answer tiles; the built-in wallet glows gold as the default, Plug alone wears its brand-like gradient frame.

## Color Palette

| Token | OKLCH | Role |
| --- | --- | --- |
| background / foreground | 0.13 0.008 60 / 0.94 0.025 85 | existing obsidian and warm ivory |
| card / border | 0.155 0.01 60 / 0.265 0.024 70 | quiet chrome and hairlines |
| primary / accent | 0.79 0.13 82 / 0.63 0.1 58 | gold (recommended path, CTAs, active step) / bronze |
| choice-surface / -hover | 0.17 0.012 60 / 0.2 0.018 65 | answer tile fill |
| step-inactive | 0.3 0.02 65 | upcoming step segments |
| plug / plug-soft | 0.68 0.19 330 / 0.24 0.06 320 | Plug-only accent; `--gradient-plug` 295→335→10 |
| success | 0.72 0.14 150 | "Address copied" confirmation |
| reading-* | unchanged | white-paper parchment only |

## Typography

- Display: Fraunces — the single question per screen, `text-3xl md:text-4xl`, balanced.
- Body: Satoshi — tile labels `text-lg font-medium`, sub-labels `text-sm text-muted-foreground` (one short line max).
- Mono: JetBrains Mono — step counter `1 / 3`, shortened address, amounts.

## Elevation & Depth

Setup flow sits in one dialog (`bg-popover`, `border-gold`, `shadow-elevated`); tiles are flat surfaces; only `.choice-tile-primary` carries the inner gold light and soft gold drop.

## Structural Zones

| Zone | Background | Border | Notes |
| --- | --- | --- | --- |
| Header | existing `bg-background/90 backdrop-blur` | `border-b border-border` | menu gains "Setup wallet" entry to relaunch flow |
| Setup dialog | `bg-popover` | `border-gold` | emblem (CrestLogo, small) → step bar → question → tiles → Skip |
| Step bar | transparent | none | 3 `.step-segment` with `data-state` active/done/todo + mono `n / 3` |
| Purchase page | existing dark surfaces | `.divider-gold` | one ICP field, live TTTI-T preview, one-line acknowledgement, one gold Buy |
| Footer | existing `bg-card` | `border-t border-border` | unchanged |

## Spacing & Rhythm

Dialog `max-w-lg`, `p-8 md:p-10`; 32px between step bar, question and tiles; 12px between tiles; tiles min 88px tall; 44px minimum touch targets.

## Component Patterns

- Answer tile: `.choice-tile` (icon left, label, optional chevron right); whole tile is the button.
- Recommended: `.choice-tile-primary` + tiny gold "Recommended" pill; always the built-in wallet.
- Plug: `.choice-tile-plug` frame + `.text-gradient-plug` name; listed first among wallets to create; other wallets as smaller plain `.choice-tile`.
- Address: `.address-chip` (dashed gold pill, mono, copy icon); `data-copied="true"` turns it success-green with `animate-copied-pop` "Address copied".
- Buy ICP: single `bg-gradient-primary` button; copies address then opens Onramper.
- Skip: quiet `text-muted-foreground` text link, bottom-center of every step; Back: ghost icon top-left from step 2.
- Buy TTTI-T: one identical gold button on every entry surface.

## Motion

- Step change: `animate-step-in` forward, `animate-step-back` backward; honor reduced motion.
- Hover: `transition-smooth` border/fill shift on tiles; no scale bounce.
- Feedback: `animate-copied-pop` for copy confirmation only; no shimmer inside the dialog.

## Constraints

- Preserve dark default, `.light` variant, crest, flat token icon usage, fonts and existing gold utilities.
- Violet/magenta appears only on Plug elements — never on CTAs, step bar or text.
- Minimal English text, no blockchain jargon beyond "wallet" and "ICP"; semantic tokens only; visible focus rings.

## Signature Detail

A three-segment gold step bar above a single serif question — the flow feels like turning pages of a ledger, with Plug as the lone flash of colour.
