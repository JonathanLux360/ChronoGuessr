import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Plays a whole session using the keyboard only, and checks the things a player relies on:
 * clue reveals, scoring, input checks, the summary, the leaderboard and saving across a reload.
 * Accessibility scans (WCAG A and AA) run on each kind of screen along the way.
 */

const ROUNDS = 10;

/** The live years and clues, counted straight from the content file, as the Home screen should show them. */
function liveContent() {
  type Clue = { verified: boolean };
  const years = JSON.parse(readFileSync('src/data/years.json', 'utf8')) as { clues: Record<string, Clue[]> }[];
  let liveYears = 0;
  let liveClues = 0;
  for (const year of years) {
    const lists = Object.values(year.clues);
    if (lists.every((list) => list.some((clue) => clue.verified))) {
      liveYears++;
      liveClues += lists.reduce((sum, list) => sum + list.filter((clue) => clue.verified).length, 0);
    }
  }
  return { liveYears, liveClues };
}

// Clue cards fade in. Reduced motion turns the fade off, so the accessibility scans never catch a
// half-faded card and report a false contrast problem. It also checks the reduced-motion path.
test.use({ reducedMotion: 'reduce' });

/** The scoring formula, written out again here so the test does not just trust the app. */
function expectedRound(yearsOff: number, cluesShown: number, answer: number, streak: number) {
  const potential = [1000, 900, 700, 400][cluesShown - 1];
  const age = 2026 - answer;
  const tolerance = Math.max(0.1, (1.9 * age) / (age + 128));
  const accuracy = Math.max(0, 1 - Math.log(1 + yearsOff / (0.5 * tolerance)) / Math.log(1 + 500 / 0.5));
  const multiplier = 1 + Math.min(streak * 0.1, 0.3);
  const nextStreak = accuracy >= 0.65 ? streak + 1 : accuracy >= 0.45 ? streak : 0;
  return { score: Math.round(potential * accuracy * multiplier), multiplier, nextStreak };
}

async function scan(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(summary, `accessibility problems on the ${name} screen`).toEqual([]);
}

const FOOTER = '© 2026 ChronoGuessr. Created by Jonathan Topaz. All rights reserved.';
const ANALYTICS_NOTE = 'This site uses GoatCounter for anonymous, cookieless analytics.';

/** Every screen ends with the same small copyright line and analytics note. */
async function expectFooter(page: Page) {
  await expect(page.getByRole('contentinfo')).toContainText(FOOTER);
  await expect(page.getByRole('contentinfo')).toContainText(ANALYTICS_NOTE);
}

async function potentialPoints(page: Page): Promise<number> {
  const text = await page.locator('[aria-live="polite"][aria-atomic="true"]').innerText();
  return Number(text.replace(/,/g, ''));
}

/** Types a guess with the keyboard and submits it. Assumes focus is on the page, not in the field. */
async function guess(page: Page, text: string) {
  await page.keyboard.press('Tab'); // Tab from the page goes straight to the guess field
  await expect(page.locator('#guess')).toBeFocused();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

test('plays a full session with the keyboard and saves the result', async ({ page }) => {
  const points: number[] = [];

  // Keep the real GoatCounter script out of the test, and record the events the game sends instead.
  await page.route('**/gc.zgo.at/**', (route) => route.abort());
  await page.addInitScript(() => {
    const events: string[] = [];
    (window as unknown as { __events: string[] }).__events = events;
    (window as unknown as { goatcounter: unknown }).goatcounter = { count: (vars: { path: string }) => events.push(vars.path) };
  });
  let longest = 0;
  let streak = 0; // hits in a row, tracked here from the formula

  await test.step('home screen', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'ChronoGuessr' })).toBeVisible();
    await expect(page.getByText('No score yet')).toBeVisible();
    await expect(page.getByRole('img', { name: /Four illustrated scenes/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start game' })).toBeFocused();
    // The counters show how many live years and clues there are, and match the content file.
    const { liveYears, liveClues } = liveContent();
    const counters = page.getByRole('group', { name: 'What is in the game' }).or(page.locator('dl[aria-label="What is in the game"]'));
    await expect(counters).toContainText(liveYears.toLocaleString('en-GB'));
    await expect(counters).toContainText(liveClues.toLocaleString('en-GB'));
    await expectFooter(page);
    await scan(page, 'home');
    await page.keyboard.press('Enter');
  });

  for (let round = 1; round <= ROUNDS; round++) {
    await test.step(`round ${round}`, async () => {
      await expect(page).toHaveTitle(new RegExp(`Round ${round} of ${ROUNDS}`));

      // Exactly one clue is showing, the other three are hidden with a reveal button.
      await expect(page.locator('article[aria-label$="clue"]')).toHaveCount(1);
      await expect(page.locator('article[aria-label$="clue, hidden"]')).toHaveCount(3);
      expect(await potentialPoints(page)).toBe(1000);
      // The streak chip shows this round's bonus before the guess.
      const chip = page.locator('[data-streak-state]');
      await expect(chip).toContainText(streak === 0 ? 'No streak' : `Streak ${streak} · +${Math.min(streak * 10, 30)}%`);

      let cluesShown = 1;
      // Reveal a clue with the number keys in some rounds, to check 1,000 -> 900 -> 700 -> 400.
      const reveals = round === 1 ? 0 : round === 2 ? 1 : round === 3 ? 2 : round === 4 ? 3 : 0;
      for (let i = 0; i < reveals; i++) {
        const key = await page.locator('button[aria-keyshortcuts]').first().getAttribute('aria-keyshortcuts');
        await page.keyboard.press(key!);
        cluesShown++;
        expect(await potentialPoints(page)).toBe([1000, 900, 700, 400][cluesShown - 1]);
      }
      await expect(page.locator('article[aria-label$="clue, hidden"]')).toHaveCount(4 - cluesShown);

      if (round === 1) {
        await expectFooter(page);
        await scan(page, 'round');
      }

      if (round === 5) {
        // The field refuses anything that is not a plain number, and says so on submit.
        await page.keyboard.press('Tab');
        await expect(page.locator('#guess')).toBeFocused();
        await page.keyboard.type('abc 0-');
        await expect(page.locator('#guess')).toHaveValue('');
        await page.keyboard.press('Enter');
        await expect(page.getByRole('alert')).toHaveText('Invalid answer');
        await page.keyboard.type('2027'); // a number, so it is typed, but it is not a valid CE year
        await page.keyboard.press('Enter');
        await expect(page.getByRole('alert')).toHaveText('Invalid answer');
        await expect(page.getByText('Your guess')).toBeVisible(); // still on the round screen
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type('1850');
        await page.keyboard.press('Enter');
      } else if (round === 6) {
        // BCE: type the number, switch the CE / BCE switch with the arrow keys, then submit.
        await page.keyboard.press('Tab');
        await page.keyboard.type('2541');
        await page.keyboard.press('Tab');
        await expect(page.getByRole('radio', { name: 'CE', exact: true })).toBeFocused();
        await page.keyboard.press('ArrowRight');
        await expect(page.getByRole('radio', { name: 'BCE' })).toBeChecked();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Enter');
      } else {
        await guess(page, round % 2 === 0 ? '1900' : '1969');
      }

      // Result screen: the answer is shown, the score follows the formula, and only seen clues appear.
      await expect(page).toHaveTitle(new RegExp(`Round ${round} result`));
      const result = await page.getByRole('region', { name: 'Result' }).innerText();
      // BCE answers read like "480 BCE" and are stored as negative numbers (1 BCE is 0).
      const shown = /the year was\s*(\d+)( BCE)?/i.exec(result)!;
      const answer = shown[2] ? 1 - Number(shown[1]) : Number(shown[1]);
      const scored = Number(/\+([\d,]+)\s*points/i.exec(result)![1].replace(/,/g, ''));
      const guessed = round === 6 ? -2540 : round === 5 ? 1850 : round % 2 === 0 ? 1900 : 1969;
      const expected = expectedRound(Math.abs(guessed - answer), cluesShown, answer, streak);
      expect(scored).toBe(expected.score);
      streak = expected.nextStreak;
      longest = Math.max(longest, streak);
      await expect(page.getByText(/Streak extended|Close\.|Streak lost|No streak yet/)).toBeVisible();
      await expect(page.locator('article')).toHaveCount(cluesShown);
      if (round === 1) {
        await expectFooter(page);
        await scan(page, 'round result');
      }
      points.push(scored);

      await expect(page.getByRole('button', { name: round === ROUNDS ? 'See your results' : 'Next round' })).toBeFocused();
      await page.keyboard.press('Enter');
    });
  }

  const total = points.reduce((a, b) => a + b, 0);

  await test.step('summary screen', async () => {
    await expect(page).toHaveTitle(/Your result/);
    await expect(page.getByRole('region', { name: 'Your result' })).toContainText(total.toLocaleString('en-GB'));
    await expect(page.getByText('New personal best!')).toBeVisible();
    await expect(page.getByText('Longest streak').locator('xpath=..')).toContainText(String(longest));
    await expect(page.getByText(/Base score .* streak bonus/)).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(ROUNDS);
    // The total in the table footer is the sum of the ten round scores.
    await expect(page.locator('tfoot')).toContainText(total.toLocaleString('en-GB'));
    const cells = await page.locator('tbody tr td:last-child').allInnerTexts();
    expect(cells.map((c) => Number(c.replace(/,/g, '')))).toEqual(points);
    await expectFooter(page);
    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
    await scan(page, 'summary');
  });

  await test.step('analytics events', async () => {
    // Rounds 2, 3 and 4 reveal one, two and three clues, so six reveals, and three of them are first reveals.
    const events = await page.evaluate(() => (window as unknown as { __events: string[] }).__events);
    expect(events.filter((name) => name === 'session-start')).toHaveLength(1);
    expect(events.filter((name) => name === 'session-complete')).toHaveLength(1);
    expect(events.filter((name) => /^reveal-(politics|society|technology|arts)$/.test(name))).toHaveLength(6);
    expect(events.filter((name) => name.startsWith('reveal-first-'))).toHaveLength(3);
  });

  await test.step('leaderboard', async () => {
    await page.getByRole('button', { name: 'Leaderboard' }).click();
    await expect(page).toHaveTitle(/Leaderboard/);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr').first()).toContainText(total.toLocaleString('en-GB'));
    await expect(page.locator('tbody tr').first()).toContainText('Best');
    await expectFooter(page);
    await scan(page, 'leaderboard');
    await page.getByRole('button', { name: 'Back to results' }).click();
    await expect(page.getByRole('region', { name: 'Your result' })).toBeVisible();
  });

  await test.step('the Home buttons', async () => {
    // From the summary, Home goes to the start screen, with the picture and the saved best score.
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page).toHaveTitle(/Guess the year/);
    await expect(page.getByRole('img', { name: /Four illustrated scenes/ })).toBeVisible();
    await expect(page.getByText(`Your best: ${total.toLocaleString('en-GB')}`)).toBeVisible();
    await expectFooter(page);

    // Opened from Home, the leaderboard has no "Back to results", and Home leads back again.
    await page.getByRole('button', { name: 'Leaderboard' }).click();
    await expect(page.getByText('Your best games')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to results' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Home' }).click();
    await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
  });

  await test.step('the best score survives a reload', async () => {
    await page.reload();
    await expect(page.getByText(`Your best: ${total.toLocaleString('en-GB')}`)).toBeVisible();
  });

  await test.step('a corrupt saved board does not crash the app', async () => {
    await page.evaluate(() => localStorage.setItem('chronoguessr:v1:leaderboard', '{corrupt'));
    await page.reload();
    await expect(page.getByText('No score yet')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
  });
});
