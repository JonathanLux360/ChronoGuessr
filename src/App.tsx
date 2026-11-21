import { useEffect, useReducer, useRef, useState } from 'react';
import { livePool } from './data/pool';
import { planSession } from './game/selection';
import { initialSession, sessionReducer, type SessionState } from './game/session';
import { buildSessionResult } from './game/stats';
import { saveResult, type SaveOutcome } from './storage/leaderboard';
import { Home } from './ui/Home/Home';
import { Leaderboard } from './ui/Leaderboard/Leaderboard';
import { Round } from './ui/Round/Round';
import { RoundResult } from './ui/RoundResult/RoundResult';
import { Footer } from './ui/shared/Footer';
import { Summary } from './ui/Summary/Summary';

/** A page title for each screen, so screen readers and the tab bar say where you are. */
function screenTitle(state: SessionState, showLeaderboard: boolean): string {
  if (showLeaderboard && (state.status === 'idle' || state.status === 'summary')) return 'Leaderboard';
  switch (state.status) {
    case 'idle':
      return 'Guess the year';
    case 'inRound':
      return `Round ${state.roundIndex + 1} of ${state.plan.length}`;
    case 'roundResult':
      return `Round ${state.roundIndex + 1} result`;
    case 'summary':
      return 'Your result';
  }
}

export default function App() {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [outcome, setOutcome] = useState<SaveOutcome | null>(null);
  const savedFor = useRef<unknown>(null);

  // Save each finished session once. The ref stops React's development double-run from saving twice.
  useEffect(() => {
    if (state.status !== 'summary' || savedFor.current === state.results) return;
    savedFor.current = state.results;
    setOutcome(null);
    saveResult(buildSessionResult(state.results, new Date().toISOString()))
      .then(setOutcome)
      .catch(() => setOutcome({ rank: null, isNewBest: false, previousBest: null }));
  }, [state]);

  const title = screenTitle(state, showLeaderboard);
  useEffect(() => {
    document.title = `${title} | ChronoGuessr`;
  }, [title]);

  function start() {
    dispatch({ type: 'start', plan: planSession(livePool, Date.now() >>> 0) });
    setShowLeaderboard(false);
  }

  function goHome() {
    dispatch({ type: 'reset' });
    setShowLeaderboard(false);
  }

  function renderScreen() {
    if (showLeaderboard && (state.status === 'idle' || state.status === 'summary')) {
      return (
        <Leaderboard
          fromSummary={state.status === 'summary'}
          onBack={() => setShowLeaderboard(false)}
          onPlay={start}
          onHome={goHome}
        />
      );
    }

    switch (state.status) {
      case 'idle':
        return <Home onStart={start} onLeaderboard={() => setShowLeaderboard(true)} />;
      case 'inRound':
        return <Round key={state.roundIndex} state={state} dispatch={dispatch} />;
      case 'roundResult':
        return <RoundResult key={state.roundIndex} state={state} dispatch={dispatch} />;
      case 'summary':
        return (
          <Summary
            results={state.results}
            total={state.total}
            outcome={outcome}
            onPlayAgain={start}
            onLeaderboard={() => setShowLeaderboard(true)}
            onHome={goHome}
          />
        );
    }
  }

  return (
    <div className="app">
      {renderScreen()}
      <Footer />
    </div>
  );
}
