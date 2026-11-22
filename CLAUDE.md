# ChronoGuessr

A single-player web game. The player sees clues about a mystery year and guesses it. Four clues per year (Politics, Society, Technology, Arts & Culture). One is free; each extra clue costs more points. Closer guesses score more, on a log scale. Tolerance scales with how long ago the year was: recent years are scored strictly, ancient years kindly. Consecutive accurate rounds build a streak bonus. A session is 10 rounds, and results go to a personal leaderboard.


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
| ERA_REFERENCE_YEAR | 2026 |
| ERA_MAX_TOLERANCE | 1.9 |
| ERA_HALF_AGE | 128 |
| ERA_MIN_TOLERANCE | 0.1 |
| ERA_NAMES | ancient, medieval, early modern, modern (only for the result-screen note) |
| STREAK_BONUS_STEP | 0.10 (0 switches streaks off) |
| STREAK_BONUS_CAP | 0.30 |
| STREAK_HIT_ACCURACY | 0.65 |
| STREAK_HOLD_ACCURACY | 0.45 |
| YEAR_MIN / YEAR_MAX | -3000 / 2026 |
| MAX_BCE_GUESS | 9999 |
| LEADERBOARD_SIZE | 10 |
| CONFIG_VERSION | 3 (v1.1 scoring: tolerance curve and streak bands; 2 was the published square-root version) |

## Scoring (do not change without asking)

```
a             = ERA_REFERENCE_YEAR - y
T(y)          = max(ERA_MIN_TOLERANCE, ERA_MAX_TOLERANCE × a / (a + ERA_HALF_AGE))
accuracy(d,y) = max(0, 1 - ln(1 + d / (s * T(y))) / ln(1 + D / s))     s = 0.5, D = 500
roundScore    = round(potential × accuracy(d,y) × streakMultiplier)
potential     = 1000, 900, 700, 400 after 1, 2, 3, 4 clues
```

`d` is the absolute number of years off. `y` is the answer year (never the guess), so the guess cannot change `T`. `T` is low for recent years and flattens out before about 1800: T is about 1 at 1884, 0.71 at 1950, 0.1 at 2020 (the floor), 1.51 at 1526, 1.8 at 180 BCE. The zero-score distance is D × T. `ERA_REFERENCE_YEAR` is a fixed constant, never today's date. An exact guess always scores the full potential.

Streak:

- Hit: accuracy of `STREAK_HIT_ACCURACY` (0.65) or more extends the streak by 1. Near miss: accuracy from `STREAK_HOLD_ACCURACY` (0.45) up to 0.65 holds it. Below 0.45 resets it to 0. Judged on accuracy, not clues used.
- In whole years off, a hit is within 0 years for 2020 (exact only), 3 for 1950, 5 for 1884, 7 for 1526 and 9 for 180 BCE. A near miss reaches 2, 15, 21, 33 and 39 years for the same answers.
- `streakMultiplier = 1 + min(n × STREAK_BONUS_STEP, STREAK_BONUS_CAP)`, where n is the streak entering the round. Round 1 is always ×1.0. A streak never carries between sessions.
- Show the multiplier before the player guesses. The summary shows base score, streak bonus and longest streak separately. Save `streakBonus` and `longestStreak` with each result.
- Round the final round score once, after the multiplier. Max session score is 10,000 base, 12,400 with a full streak.
- Header chip: a line flame icon (no emoji) plus "Streak 2 · +20%". Three states: none (grey outline), building (gold tint), capped (dark gold fill, white text). The result screen says what happened: "Streak extended to 4. Next round: +30%.", "Near miss. Streak held at 3.", "Streak lost. Next round: no bonus."

Unit-test these values (1 clue, no streak unless stated):

- Exact guess, any year: 1000 (check 2020, 1884 and 480 BCE)
- Answer 1884 (T about 1): 10 years off = 559, 100 = 232, 500 or more = 0; 4 clues, 10 years off = 224
- Answer 2020: 1 year off = 559, 10 = 232, 50 or more = 0
- Answer 1990: 10 years off = 437. Answer 1950: 10 years off = 511, 100 = 183
- Answer 1650: 10 years off = 607. Answer 1526: 616. Answer 1000 CE: 10 years off = 631, 100 = 308
- Answer 180 BCE (-179, T about 1.80): 10 years off = 639, 50 = 416, 100 = 317, 895 or more = 0. Answer 480 BCE (-479): 10 years off = 640, 100 = 317
- Streak on an exact guess: streak 0 = 1000, 1 = 1100, 2 = 1200, 3 or more = 1300. 10 years off at streak 3 (answer 1884) = 727
- Streak transitions: accuracy 0.65 extends, 0.45 holds, 0.44 resets. Ten exact one-clue rounds = 12,400

When the tolerance is not about 1, the round result screen says how strictly the round was graded, as a percentage against a tolerance of 1 (|T - 1|), for example "This is a modern year, so it was graded 58% more harshly than average." ("leniently" for old years; the era name is ancient, medieval, early modern or modern.)

## Analytics

GoatCounter (anonymous, cookieless) counts visits and a few events. All tracking sits in `src/analytics.ts`, called from `src/App.tsx`; `src/game/` never touches it. Events: `session-start`, `session-complete`, `reveal-politics`, `reveal-society`, `reveal-technology`, `reveal-arts`, and `reveal-first-<category>` for the first clue chosen in a round. Send events only, never guesses, years or scores. Use `window.goatcounter?.count(...)` inside a try/catch: ad blockers stop the script, and the game must never break. Every screen shows the footer note "This site uses GoatCounter for anonymous, cookieless analytics." under the copyright line. Ask before adding any other tracking.

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
| Streak gold | base `#B07D1A`, text `#6E4F0E`, tint `#F7EBCB`, border `#DDC48A`, capped fill `#7A560F` |
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
2. Write tests alongside the code, including the tolerance and streak values above. Run lint, type checks and tests before saying a milestone is done.
3. Do not add features beyond the spec. Out of scope for v1: streak carry-over between sessions, multiplayer, global leaderboard, daily challenge, accounts, timers, themed packs. Ask first.
4. Keep commits small, with clear messages.
