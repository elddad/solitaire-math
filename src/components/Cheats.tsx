import { useState } from 'react';
import { TOTAL_LEVELS } from '../game/campaign';
import * as Progress from '../game/progress';
import type { GameState } from '../game/types';

interface Props {
  state: GameState;
  progress: Progress.Progress;
  reveal: boolean;
  showAd: boolean;
  onProgress: (p: Progress.Progress) => void;
  onCheat: (patch: Partial<GameState>) => void;
  onGoToLevel: (level: number) => void;
  onToggleReveal: () => void;
  onToggleAd: () => void;
  onClose: () => void;
}

export function Cheats({
  state, progress, reveal, showAd,
  onProgress, onCheat, onGoToLevel, onToggleReveal, onToggleAd, onClose,
}: Props) {
  const [jump, setJump] = useState(String(state.level));

  const full = { hint: 9, undo: 9, magnet: 9, calculator: 9, joker: 9 };

  return (
    <div className="scrim cheats" onClick={onClose}>
      <div className="cheats-panel" onClick={(e) => e.stopPropagation()}>
        <h2>CHEATS</h2>
        <p className="cheat-sub">
          Level {state.level} &middot; unlocked {progress.unlocked}/{TOTAL_LEVELS} &middot;
          {' '}{Progress.totalStars(progress)} &#9733; &middot; {progress.coins} coins
        </p>

        <div className="cheat-jump">
          <input
            type="number" min={1} max={TOTAL_LEVELS} value={jump}
            onChange={(e) => setJump(e.target.value)}
            aria-label="level number"
          />
          <button className="cheat-btn go" onClick={() => {
            const n = Math.max(1, Math.min(TOTAL_LEVELS, Number(jump) || 1));
            onProgress(Progress.unlockAll());
            onGoToLevel(n);
          }}>JUMP</button>
        </div>

        <div className="cheat-grid">
          <button className="cheat-btn" onClick={() => onProgress(Progress.unlockAll())}>Unlock all 500</button>
          <button className="cheat-btn" onClick={() => onProgress(Progress.starAll())}>3 stars on all</button>
          <button className="cheat-btn" onClick={() => onProgress(Progress.addCoins(10000))}>+10,000 coins</button>
          <button className="cheat-btn" onClick={() => onProgress(Progress.setLives(9))}>Refill lives</button>

          <button className="cheat-btn" onClick={() => onCheat({ moves: state.moves + 50, movesMax: state.movesMax + 50 })}>+50 moves</button>
          <button className="cheat-btn" onClick={() => onCheat({ secondsLeft: state.secondsLeft + 300 })}>+5 minutes</button>
          <button className="cheat-btn" onClick={() => onCheat({ boosters: full })}>Max boosters</button>
          <button className="cheat-btn" onClick={() => onCheat({ phase: 'won' })}>Win this level</button>

          <button className={'cheat-btn toggle' + (reveal ? ' on' : '')} onClick={onToggleReveal}>
            X-ray cards: {reveal ? 'ON' : 'OFF'}
          </button>
          <button className={'cheat-btn toggle' + (showAd ? ' on' : '')} onClick={onToggleAd}>
            Ad banner: {showAd ? 'ON' : 'OFF'}
          </button>
          <button className="cheat-btn danger" onClick={() => {
            onProgress(Progress.resetAll());
            onGoToLevel(1);
          }}>Reset progress</button>
          <button className="cheat-btn" onClick={onClose}>Close</button>
        </div>

        <p className="cheat-hint">Reopen from Menu &rarr; CHEATS, by tapping the LEVEL label, or with ?cheats=1</p>
      </div>
    </div>
  );
}
