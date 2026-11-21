# ChronoGuessr — Game Specification v1

Nov 21, 2026 · @Jonathan

## Overview

ChronoGuessr is a single-player web game: the player sees clues about one year and guesses which year it is. Each year has four clues, one per category: Politics, Society, Technology, and Arts & Culture. One clue is shown for free. Each extra clue lowers the points available for that round, and each reveal costs more than the last. Points depend on how close the guess is, on a log scale, so precision near the answer matters most. A session is 10 rounds. The total is saved to a personal leaderboard so the player can try to beat it.

**Design goals**

- Reward knowledge, not luck: a near miss scores well, a wild guess scores almost nothing.
- Make every reveal a real decision: the player trades points for certainty.
- Short sessions (about 5 minutes) that invite a replay.
- Clean, professional look; no gimmicks.

**In scope for v1**

- Single player, 10-round sessions.
- Four-clue reveal system with escalating costs.
- Log-scaled accuracy scoring.
- Round results and an end-of-session summary.
- Personal leaderboard stored in the browser.
- A curated pool of at least 100 years.

**Out of scope for v1** (candidates for v2): multiplayer, a global leaderboard, a shared daily challenge, user accounts, timers, and themed packs (by region or era). The data model and code structure should not block any of these.

## Core game loop

A session is 10 rounds. In each round the player repeats one decision, guess now or pay for another clue, until they guess or all four clues are showing.

&#91;embedded content: game loop · one session of 10 rounds\]

Once all four clues are visible, the reveal option disappears and the player must guess.

**Session states** (for the reducer in `game/session.ts`)

| State | Holds | Moves to |
| --- | --- | --- |
| `idle` | Nothing; Home screen | `inRound` on Start |
| `inRound` | Round number, year, revealed categories, potential points | `inRound` on reveal; `roundResult` on guess |
| `roundResult` | Guess, years off, round score | `inRound` (next round) or `summary` after round 10 |
| `summary` | All round results, total, leaderboard rank | `idle` or a new session on Play again |

A mid-session page reload may lose the game in v1. Saving in-progress state to sessionStorage is a nice-to-have.

## Clue system

Every round starts with 1,000 potential points and one free clue; revealing all four clues cuts the potential to 400.

**Categories**

| Category | Covers | Example clue (1969) |
| --- | --- | --- |
| Politics | Elections, treaties, wars, coups, new states, leaders taking or leaving office | Golda Meir becomes Prime Minister of Israel |
| Society | Social movements, laws on daily life, disasters, sport, economy, religion | The Woodstock festival draws about 400,000 people |
| Technology | Inventions, scientific discoveries, firsts in engineering, medicine, space | The first ARPANET message is sent |
| Arts & Culture | Books, films, music, art, architecture, famous premieres | *Abbey Road* is released |

**Reveal order**

1. When the round starts, the game shows one clue picked at random.
2. The three hidden clues show their category label and the cost to reveal.
3. The player chooses which category to reveal next. This adds strategy: a player strong on technology can ask for that clue.
4. The player can guess at any point. Guessing ends the round.

**Reveal costs**

Each reveal costs 100 more points than the one before. Costs come off the round's potential points, not the running total, so a round can never score below zero.

| Clues visible | Cost of that reveal | Potential points |
| --- | --- | --- |
| 1 (free) | 0 | 1,000 |
| 2 | 100 | 900 |
| 3 | 200 | 700 |
| 4 | 300 | 400 |

The hidden-clue buttons show the cost and the new potential before the player commits, for example "Reveal Technology: −100 (900 left)".

## Scoring model

Round score = potential points × accuracy, where accuracy falls on a log scale. A perfect round is 1,000, so a perfect 10-round session is 10,000.

**Accuracy**

```latex
A(d) = \max\left(0,\; 1 - \frac{\ln(1 + d/s)}{\ln(1 + D/s)}\right)
```

- d = years off (absolute difference between guess and answer).
- D = 500, the distance at which a guess scores zero.
- s = 0.5, a steepness setting. Lower values punish small misses harder.

Because the curve is logarithmic, the first years of error cost the most. Going from exact to 10 years off loses 44% of the points. Going from 10 to 100 years off loses a further 33%. This meets the brief: the first 10 years cost more than the next 90.

**Round score**

```latex
\text{round score} = \operatorname{round}\big(P_k \times A(d)\big)
```

P is the potential points after k clues: 1,000, 900, 700 or 400. Multiplying (rather than subtracting) keeps every round between 0 and 1,000. It also means a wild guess with four clues scores close to zero, so revealing clues only pays if it improves the guess.

&#91;embedded content: computed from the formula above · s = 0.5, D = 500\]

The trade-off this creates: a guess 10 years off with one clue (559) beats an exact guess after revealing all four (400). Players are rewarded for committing early when they are fairly sure.

**Session score.** The sum of the 10 round scores, out of 10,000. No streak bonuses in v1, so the score stays easy to understand.

## Content and data model

Content lives in one JSON file of year records, validated against a schema on every build. v1 needs at least 100 live years. A year is live when every category has at least one verified clue.

**More than one clue per category.** A category can hold several clues. The game picks the year first, then draws one clue at random from each category, using the seeded generator. The same year can therefore be a different puzzle each time it comes up. Years do not need the same number of clues, and the clues in a category should be about different events that year. Every clue must pass the content rules on its own.

**Year range.** v1 covers 1500 to 2026. Before 1500, finding four well-dated events per category gets hard, and players' knowledge thins out. The schema still supports earlier years so the range can grow later.

**BCE years.** Store them as negative integers using astronomical numbering (1 BCE = 0, 2 BCE = −1). Distance is then simple subtraction. Display converts back, so −43 shows as "44 BCE".

**Schema** (one record per year)

```json
{
  "year": 1969,
  "clues": {
    "politics": [
      {
        "text": "Golda Meir becomes Prime Minister of Israel.",
        "context": "She was Israel's first and so far only female prime minister.",
        "region": "Middle East",
        "difficulty": 2,
        "source": "https://en.wikipedia.org/wiki/Golda_Meir",
        "verified": true
      }
    ],
    "society": [ { "...": "one or more clues, same fields" } ],
    "technology": [ { "...": "one or more clues, same fields" } ],
    "arts_culture": [ { "...": "one or more clues, same fields" } ]
  }
}
```

| Field | Type | Rule |
| --- | --- | --- |
| year | integer | Unique across the file; within the configured range |
| clues | object | All four category keys required. Each holds a list of one or more clues |
| text | string | The clue shown during play; 140 characters max |
| context | string | One line shown on the result screen; optional |
| region | string | Broad region. Informational only: no rule or feature uses it in v1 |
| difficulty | 1–3 | 1 = well known, 3 = obscure. Informational only in v1: it does not affect which clue is shown first |
| source | URL | Where the date was checked |
| verified | boolean | On each clue. Only verified clues are ever shown, and a year is live only if every category has a verified clue |

**Content rules** (each clue must pass all of these)

- The event happened in that year, not across a span. "The Thirty Years' War" fails; "the Peace of Westphalia is signed" passes.
- No numbers that give the year away: no dates, decades, centuries, ages, or anniversaries.
- No single clue should be a giveaway on its own (for example, "the Berlin Wall falls"). Use a lesser-known event from that year instead.
- Neutral, factual wording; under 140 characters.
- Written in the present tense ("Spanish adventurers … are received by Aztec emperor Moctezuma II").
- Specific: name the people, places and nationalities involved (for example "Hernán Cortés", "Tenochtitlan", "Spanish"). Detail that does not fit in the clue goes in the `context` line.
- Numbers belong in `context`, never in the clue text (a title such as "Luna 9" becomes "a Soviet space probe").

**Building the pool with AI.** Claude can draft candidate years in bulk against these rules. Each clue then needs a human check of the date against its source before its `verified` flag is set to true. An unverified clue is never shown, so extra clues can be drafted for a live year without affecting play. A validation script should flag clues that contain digits, exceed the length limit, or miss a category, and report how many years are live.

## Leaderboard and persistence

v1 keeps a personal top 10 in the browser's localStorage, with no accounts and no server.

**What is saved per session**

| Field | Example | Purpose |
| --- | --- | --- |
| score | 6,420 | Ranking |
| playedAt | 2026-11-21T18:04Z | Display and tie-break (earlier wins) |
| rounds | 10 | Future-proofs for other session lengths |
| avgYearsOff | 14.2 | Shown as a skill stat |
| exactHits | 2 | Shown as a skill stat |
| cluesUsed | 19 of 40 | Shown as a skill stat |
| roundDetails | year, guess, clues, points per round | Lets the player review a past game |
| configVersion | 1 | Keeps scores comparable if rules change |

**Behaviour**

- After each session, insert the result and keep the top 10 by score.
- If the session is a new personal best, say so on the summary screen.
- If it makes the top 10 but is not a best, show its rank ("3rd best").
- Store one key, `chronoguessr:v1:leaderboard`, as a versioned JSON object. If the data is missing or corrupt, start a fresh board and do not crash.
- Only compare scores with the same `configVersion`. If scoring rules change, start a new board and keep the old one readable.
- A "Reset leaderboard" control, with a confirm step. There is no settings screen in v1, so it sits at the bottom of the Leaderboard screen. It clears all saved scores.

**Path to v2.** Keep storage behind a small interface (`saveResult`, `getTopResults`). A server-backed version (for a global board or daily challenge) can then replace the localStorage one without touching game code.

## UI/UX

Five screens, one primary action each, so the player always knows what to do next.

| Screen | Shows | Primary action |
| --- | --- | --- |
| Home | Title, one-line pitch, personal best, "How to play" link | Start game |
| Round | Round x of 10, running total, potential points for this round, four clue cards (revealed or hidden), year input | Guess, or reveal a clue |
| Round result | Correct year, your guess, years off, points scored, and only the clues the player saw, each with its context line. Unrevealed clues stay hidden so the year is still fresh if it comes up again | Next round |
| Session summary | Total score, rank on leaderboard, per-round table, stats (average years off, exact hits, clues used) | Play again |
| Leaderboard | Top 10 sessions with date and stats; best highlighted | Back / play again |

**Round screen details**

- Clue cards sit in a 2×2 grid on desktop and stack on mobile. A hidden card shows its category and "Reveal: −100 (900 left)".
- The potential points figure is the most prominent number on screen and updates the moment a clue is revealed.
- Year input: a number field with a CE / BCE switch beside it (CE on the left, BCE on the right, CE by default). CE accepts 1 to the latest year; BCE accepts 1 to 9999. Keystrokes that are not plain digits (letters, symbols, spaces, a leading zero, a fifth digit) are refused as they are typed. Whether the number fits the chosen era is checked on submit, so the player can type first and flip the switch afterwards. Every invalid guess shows the same inline message, "Invalid answer" (the range is never stated).
- Keyboard: Enter submits the guess; keys 1–4 reveal a category.

**Round result details**

- Show the distance in words: "Exact!", "3 years off", "112 years off".
- A simple timeline bar marks the guess and the correct year, so the size of the miss is visible.
- Each clue the player saw links to its source for players who want to read more.

**Design principles**

- Clean and professional: neutral palette, one accent colour, generous white space, a readable serif or humanist sans for clue text.
- No confetti, flashing, or sound by default. Motion is limited to short fades on reveal.
- Clear, plain copy that sounds like a smart friend, not a game show.
- Accessible: WCAG AA contrast, full keyboard play, screen-reader labels on clue cards and scores.
- Responsive from 360 px wide upward.

## Technical architecture and config

A static front-end app with no backend: Vite, React and TypeScript, deployed free on Vercel, Netlify or GitHub Pages.

**Stack**

- Vite + React + TypeScript (strict mode).
- Plain CSS modules or Tailwind; no heavy UI kit.
- Zod to validate the content file and stored leaderboard data.
- Vitest for unit tests; Playwright for one end-to-end run of a full session.

**Code layout**

```text
src/
  config.ts            all tunable constants (table below)
  data/years.json      the content pool
  data/schema.ts       Zod schema for year records
  game/scoring.ts      pure functions: accuracy, potential, round score
  game/session.ts      session state as a reducer (see the game loop)
  game/selection.ts    picks years for a session, seeded random
  storage/leaderboard.ts  saveResult, getTopResults (and resetLeaderboard)
  ui/                  one folder per screen + shared components
scripts/validate-content.ts  checks the content rules
```

Keep game logic pure and separate from React. Scoring and session state should be testable without rendering anything.

**Year selection.** Pick 10 live years at random, then draw one verified clue per category for each, and a random free clue. There are no era quotas and no exclusions: every live year has the same chance, including one played in the last session. A year never repeats within a session. Use a seeded random generator, so a future daily challenge can give every player the same years and clues from one seed.

**Config constants**

| Constant | v1 value | Meaning |
| --- | --- | --- |
| ROUNDS\_PER\_SESSION | 10 | Rounds in a game |
| MAX\_ROUND\_POINTS | 1000 | Potential points with one clue |
| REVEAL\_COSTS | \[100, 200, 300\] | Cost of the 2nd, 3rd and 4th clue |
| SCALE\_S | 0.5 | Steepness of the scoring curve (lower = harsher on small misses) |
| MAX\_DISTANCE | 500 | Years off at which a guess scores zero |
| YEAR\_MIN / YEAR\_MAX | 1500 / 2026 | Range the content pool covers, and the latest year the player can guess |
| MAX\_BCE\_GUESS | 9999 | Furthest back the player can guess, in years BCE |
| LEADERBOARD\_SIZE | 10 | Sessions kept |
| CONFIG\_VERSION | 1 | Bump when scoring rules change |

## Build plan, acceptance criteria and open questions

Build in five steps. Each one ends with something playable, so you can test and redirect early.

**Milestones for Claude Code**

1. **Skeleton and scoring.** Scaffold the project, write `config.ts` and `scoring.ts`, and unit-test the scoring against the spot values below.
2. **Core loop.** Session reducer, Round and Round result screens, using 15 hand-written sample years.
3. **Session end and leaderboard.** Summary screen, localStorage leaderboard, Home and Leaderboard screens.
4. **Content pool.** Zod schema, validation script, and at least 100 verified years (drafted with AI, checked by hand).
5. **Polish and ship.** Responsive layout, keyboard play, accessibility pass, Playwright test, deploy.

**Acceptance criteria**

- [ ] A full 10-round session can be played start to finish with keyboard only.
- [ ] Round 1 shows exactly one clue; the other three show category and reveal cost.
- [ ] Potential points read 1,000 → 900 → 700 → 400 as clues are revealed.
- [ ] Scoring unit tests pass: exact with 1 clue = 1,000; 10 years off with 1 clue = 559; 100 years off with 1 clue = 232; 10 years off with 4 clues = 224; 500+ years off = 0.
- [ ] No year repeats within a session.
- [ ] Clues come only from the verified clues in each category, and a year with several clues in a category can show a different one in a later session.
- [ ] The session total equals the sum of round scores.
- [ ] A new best is saved, survives a page reload, and is flagged on the summary screen.
- [ ] Corrupt or missing localStorage data does not crash the app.
- [ ] The validation script fails the build if any clue contains a digit, exceeds 140 characters, or a category is missing.
- [ ] Layout works at 360 px and 1440 px wide.

**Open questions**

- ~~Name~~ Decided: the game is called ChronoGuessr.
- Should the year range reach back before 1500 in v1, or wait for a content pack?
- Should the player choose which clue to reveal (current spec), or should the order be fixed from hardest to easiest?
- Exact-guess bonus (for example +100), or is 1,000 for a perfect guess enough?
- ~~Should the first clue be the hardest one of the four?~~ Decided: no. The free clue is always random.
- Optional per-round timer for a later "hard mode"?
