# ChronoGuessr

A single-player web game. The player sees clues about a mystery year and guesses it. Four clues per year (Politics, Society, Technology, Arts & Culture). One is free; each extra clue costs more points. Closer guesses score more, on a log scale. A session is 10 rounds, and results go to a personal leaderboard.


## Source of truth

- `docs/SPEC.md` is the full specification. Read it before starting any milestone.
- `docs/mockup.png` is the target look for the round screen.
- If the code and the spec disagree, or the spec is unclear, ask. Do not guess.
- Use the defaults in the spec's open questions. Ask before changing any of them.

## Stack

- Vite, React and TypeScript (strict mode). No backend.
- Plain CSS modules or Tailwind. No heavy UI kit.
- Zod validates the content file and anything read from localStorage.
- Vitest for unit tests. One Playwright test that plays a full session.

Expected scripts (add them in milestone 1, then keep this list current):
`npm run dev`, `npm run build`, `npm test`, `npm run lint`, `npm run validate-content`, `npm run validate-content:release` (also fails if fewer than 100 years are live; `npm run build` runs it), `npm run test:e2e` (the Playwright session test; uses the Chrome on your machine).

## Architecture rules

- Game logic lives in `src/game/` as pure TypeScript. No React, no localStorage, no `Math.random()`. Use a seeded random generator so a daily challenge is possible later.
- Every tunable value lives in `src/config.ts`. Never hard-code them elsewhere.
- Session state is a reducer in `game/session.ts`. States: `idle`, `inRound`, `roundResult`, `summary`.
- Storage sits behind two functions, `saveResult` and `getTopResults` (plus `resetLeaderboard`). A server-backed version must be able to replace it later without touching game code.
- localStorage key: `chronoguessr:v1:leaderboard`. Missing or corrupt data starts a fresh board and never crashes the app.

Config values for v1:

| Constant | Value |
| --- | --- |
| ROUNDS_PER_SESSION | 10 |
| MAX_ROUND_POINTS | 1000 |
| REVEAL_COSTS | [100, 200, 300] |
| SCALE_S | 0.5 |
| MAX_DISTANCE | 500 |
| YEAR_MIN / YEAR_MAX | -3000 / 2026 |
| MAX_BCE_GUESS | 9999 |
| LEADERBOARD_SIZE | 10 |
| CONFIG_VERSION | 1 |

## Scoring (do not change without asking)

```
accuracy(d) = max(0, 1 - ln(1 + d / s) / ln(1 + D / s))     s = 0.5, D = 500
roundScore  = round(potential × accuracy(d))
potential   = 1000, 900, 700, 400 after 1, 2, 3, 4 clues
```

`d` is the absolute number of years off. A session is the sum of 10 rounds (max 10,000). No bonuses in v1.

Unit-test these values:

- Exact guess, 1 clue: 1000
- 10 years off, 1 clue: 559
- 100 years off, 1 clue: 232
- 10 years off, 4 clues: 224
- 500 or more years off: 0

## Content rules

Years live in `src/data/years.json`, checked against a Zod schema. Each year has four categories: `politics`, `society`, `technology`, `arts_culture`. Each category holds one or more clues, and the game draws one at random per category.

- Each clue is one event that happened in that year, not across a span.
- Clue text is 140 characters or fewer and contains no digits (no dates, decades, centuries or anniversaries).
- Clues are in the present tense and name the people, places and nationalities involved. Extra detail goes in `context`, and any numbers go there too, never in the clue text.
- No clue should give the year away on its own.
- Every clue needs a `source` URL and a `verified` flag. Only verified clues are ever shown, and a year is live only if every category has a verified clue.
- Never set `verified` to true unless the date has been checked against its source. AI-drafted clues stay `verified: false` until a human checks them. Extra clues for a live year can be drafted unverified.
- `scripts/validate-content.ts` must fail the build on any breach.
- Each session picks 10 live years at random (no era quotas, no exclusion of recently played years, no repeats within a session), then one clue per category at random, using the seeded generator. The free first clue is also picked at random, never by difficulty.
- `region` is informational only. There is no regional balance rule.
- BCE years are negative integers (astronomical numbering: 1 BCE is 0, so 480 BCE is -479). The content pool may hold any year from `YEAR_MIN` (3001 BCE) to `YEAR_MAX`, and the guess field accepts any CE year from 1 to `YEAR_MAX` and any BCE year up to `MAX_BCE_GUESS`. Dates before 1500 are often approximate: use the traditional date and say so in the `context` line.

## Design

Calm, professional and slightly classical, inspired by the Civilization games. No confetti, flashing, sound, emoji or gradients. Motion is limited to short fades.

| Token | Value |
| --- | --- |
| Page background | `#FAF9F6` |
| Surface | `#FFFFFF` |
| Text | `#1A1A1A` |
| Muted text | `#5E5E5E` |
| Gold rules | `#CBB98A`, `#DDD3B8` |
| Font | Lora (Google Fonts), then Georgia, serif |

| Category | Base (icons, fills) | Dark (text) | Tint (header) | Border |
| --- | --- | --- | --- | --- |
| Politics (red) | `#B33A33` | `#8C2A25` | `#F8E8E6` | `#D9A19D` |
| Society (green) | `#3F7D4E` | `#2C5E39` | `#E5F0E7` | `#9CC3A5` |
| Technology (blue) | `#2F6DB0` | `#1F4E88` | `#E4EEF8` | `#9DBEE0` |
| Arts & Culture (pink-purple) | `#9B4F96` | `#7A3A76` | `#F4E6F2` | `#CFA3CB` |

- Revealed clue: tinted header with a solid icon medallion, white card body.
- Hidden clue: dashed border, outlined icon, and a reveal button showing the cost.
- The potential points figure is the largest number on the round screen.
- Accessibility: WCAG AA contrast, real `<button>` and `<input>` elements, full keyboard play (Enter to guess, keys 1 to 4 to reveal), touch targets of 44px or more. Never rely on colour alone: every category has an icon and a label.
- Responsive from 360px wide.

## Copy and style

- Plain, direct, slightly conversational. Short sentences. No jargon.
- British spelling in copy, comments and docs.

## How to work

1. Build in the five milestones from the spec. Make a plan first, and stop after each milestone for review.
2. Write tests alongside the code. Run lint, type checks and tests before saying a milestone is done.
3. Do not add features beyond the spec. Out of scope for v1: multiplayer, global leaderboard, daily challenge, accounts, timers, themed packs. Ask first.
4. Keep commits small, with clear messages.
