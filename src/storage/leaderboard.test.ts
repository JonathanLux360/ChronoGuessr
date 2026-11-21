import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG_VERSION, LEADERBOARD_SIZE, STORAGE_KEY } from '../config';
import type { SessionResult } from '../game/stats';

class FakeStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

function makeResult(score: number, extra: Partial<SessionResult> = {}): SessionResult {
  return {
    score,
    playedAt: '2026-11-21T18:04:00.000Z',
    rounds: 10,
    avgYearsOff: 14.2,
    exactHits: 2,
    cluesUsed: 19,
    roundDetails: Array.from({ length: 10 }, (_, i) => ({ year: 1900 + i, guess: 1900 + i, clues: 1, points: 1000 })),
    configVersion: CONFIG_VERSION,
    ...extra,
  };
}

let storage: FakeStorage;

/** A fresh copy of the module each time, so its in-memory fallback never leaks between tests. */
async function loadModule() {
  vi.resetModules();
  return import('./leaderboard');
}

beforeEach(() => {
  storage = new FakeStorage();
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveResult and getTopResults', () => {
  it('starts with an empty board', async () => {
    const { getTopResults } = await loadModule();
    expect(await getTopResults()).toEqual([]);
  });

  it('saves a result, and it survives a reload', async () => {
    const first = await loadModule();
    await first.saveResult(makeResult(6420));
    const second = await loadModule(); // a "reload": a new module reading the same storage
    expect((await second.getTopResults()).map((r) => r.score)).toEqual([6420]);
  });

  it('writes one versioned key', async () => {
    const { saveResult } = await loadModule();
    await saveResult(makeResult(100));
    expect([...storage.data.keys()]).toEqual([STORAGE_KEY]);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).toMatchObject({ version: 1 });
  });

  it('flags the first result, and any higher one, as a new best', async () => {
    const { saveResult } = await loadModule();
    expect(await saveResult(makeResult(500))).toEqual({ rank: 1, isNewBest: true, previousBest: null });
    expect(await saveResult(makeResult(900))).toEqual({ rank: 1, isNewBest: true, previousBest: 500 });
  });

  it('reports the rank when it is not a best', async () => {
    const { saveResult } = await loadModule();
    await saveResult(makeResult(900));
    await saveResult(makeResult(700));
    const outcome = await saveResult(makeResult(800));
    expect(outcome).toEqual({ rank: 2, isNewBest: false, previousBest: 900 });
  });

  it('sorts best first and keeps only the top results', async () => {
    const { saveResult, getTopResults } = await loadModule();
    for (let i = 1; i <= LEADERBOARD_SIZE + 3; i++) await saveResult(makeResult(i * 100));
    const top = await getTopResults();
    expect(top).toHaveLength(LEADERBOARD_SIZE);
    expect(top[0].score).toBe((LEADERBOARD_SIZE + 3) * 100);
    expect(top.map((r) => r.score)).toEqual([...top.map((r) => r.score)].sort((a, b) => b - a));
  });

  it('gives no rank to a score that does not make the top results', async () => {
    const { saveResult } = await loadModule();
    for (let i = 1; i <= LEADERBOARD_SIZE; i++) await saveResult(makeResult(1000 + i));
    expect(await saveResult(makeResult(5))).toEqual({ rank: null, isNewBest: false, previousBest: 1000 + LEADERBOARD_SIZE });
  });

  it('breaks ties in favour of the earlier session', async () => {
    const { saveResult, getTopResults } = await loadModule();
    await saveResult(makeResult(700, { playedAt: '2026-01-01T10:00:00.000Z' }));
    const later = await saveResult(makeResult(700, { playedAt: '2026-02-01T10:00:00.000Z' }));
    expect(later).toMatchObject({ rank: 2, isNewBest: false });
    expect((await getTopResults()).map((r) => r.playedAt)).toEqual(['2026-01-01T10:00:00.000Z', '2026-02-01T10:00:00.000Z']);
  });

  it('respects the limit argument', async () => {
    const { saveResult, getTopResults } = await loadModule();
    await saveResult(makeResult(100));
    await saveResult(makeResult(200));
    expect((await getTopResults(1)).map((r) => r.score)).toEqual([200]);
  });

  it('keeps boards for different config versions apart, and keeps the old one', async () => {
    const { saveResult, getTopResults } = await loadModule();
    await saveResult(makeResult(9000, { configVersion: CONFIG_VERSION + 1 }));
    expect(await getTopResults()).toEqual([]);
    expect(await saveResult(makeResult(100))).toMatchObject({ rank: 1, isNewBest: true });
    const stored = JSON.parse(storage.data.get(STORAGE_KEY)!);
    expect(stored.results.map((r: SessionResult) => r.configVersion).sort()).toEqual([CONFIG_VERSION, CONFIG_VERSION + 1]);
  });
});

describe('boards saved by an earlier version', () => {
  it('still loads a board that has a list of recent years, and drops the list on the next save', async () => {
    const old = { version: 1, results: [makeResult(700)], recentYears: [1900, 1901] };
    storage.setItem(STORAGE_KEY, JSON.stringify(old));
    const { getTopResults, saveResult } = await loadModule();
    expect((await getTopResults()).map((r) => r.score)).toEqual([700]);
    await saveResult(makeResult(800));
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!)).not.toHaveProperty('recentYears');
    expect((await getTopResults()).map((r) => r.score)).toEqual([800, 700]);
  });
});

describe('resetLeaderboard', () => {
  it('clears every score, for every config version', async () => {
    const { saveResult, getTopResults, resetLeaderboard } = await loadModule();
    await saveResult(makeResult(300));
    await saveResult(makeResult(400, { configVersion: CONFIG_VERSION + 1 }));
    await resetLeaderboard();
    expect(await getTopResults()).toEqual([]);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).results).toEqual([]);
  });
});

describe('corrupt or unavailable storage', () => {
  it.each([
    ['not JSON', '{oops'],
    ['an array', '[]'],
    ['the wrong version', JSON.stringify({ version: 2, results: [] })],
    ['a missing field', JSON.stringify({ version: 1 })],
    ['a bad result', JSON.stringify({ version: 1, results: [{ score: 'lots' }] })],
    ['null', 'null'],
    ['an empty string', ''],
  ])('starts a fresh board for %s, without crashing', async (_name, raw) => {
    storage.setItem(STORAGE_KEY, raw);
    const { getTopResults, saveResult } = await loadModule();
    expect(await getTopResults()).toEqual([]);
    expect(await saveResult(makeResult(250))).toMatchObject({ rank: 1, isNewBest: true });
    expect((await getTopResults()).map((r) => r.score)).toEqual([250]);
  });

  it('works for the visit when localStorage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const { saveResult, getTopResults } = await loadModule();
    await expect(saveResult(makeResult(100))).resolves.toMatchObject({ rank: 1 });
    expect(await getTopResults()).toEqual([]);
  });

  it('works when localStorage does not exist at all', async () => {
    vi.stubGlobal('localStorage', undefined);
    const { saveResult, getTopResults } = await loadModule();
    await saveResult(makeResult(100));
    expect((await getTopResults()).map((r) => r.score)).toEqual([100]);
  });
});
