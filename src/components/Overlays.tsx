import { useEffect, useState } from 'react';
import { AD_H, AD_Y, BOOSTER_Y, STAGE_W } from '../layout';
import { formatClock } from './Hud';
import type { GameState } from '../game/types';

export function Toast({ toast }: { toast: GameState['toast'] }) {
  const [shown, setShown] = useState(toast);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    setLeaving(false);
    const hold = setTimeout(() => setLeaving(true), 1300);
    const gone = setTimeout(() => setShown(null), 1600);
    return () => { clearTimeout(hold); clearTimeout(gone); };
  }, [toast?.id]);           // a new toast replaces the current one

  if (!shown) return null;
  return (
    <div className={'toast' + (leaving ? ' leaving' : '')} style={{ top: BOOSTER_Y - 150 }}>
      {shown.text}
    </div>
  );
}

export function AdBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <div className="ad abs" style={{ top: AD_Y, height: AD_H }}>Ad placeholder</div>;
}

export function Confetti() {
  const bits = Array.from({ length: 34 }, (_, i) => i);
  const colours = ['#FFE066', '#FFC93F', '#F0A81B', '#FFF3C4', '#C6F04B'];
  return (
    <>
      {bits.map((i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: (i * 97) % STAGE_W,
            top: -60,
            background: colours[i % colours.length],
            animationDelay: `${(i % 12) * 0.11}s`,
            zIndex: 70,
          }}
        />
      ))}
    </>
  );
}

interface EndProps {
  state: GameState;
  onNext: () => void;
  onReplay: () => void;
  onMenu: () => void;
}

export function EndPanel({ state, onNext, onReplay, onMenu }: EndProps) {
  if (state.phase === 'playing') return null;
  const won = state.phase === 'won';
  const reward = won ? 100 + state.moves * 2 : 0;

  return (
    <div className="scrim">
      {won && <Confetti />}
      <div className="panel">
        <h2>{won ? 'LEVEL COMPLETE' : state.phase === 'lost-time' ? 'OUT OF TIME' : 'NO MOVES'}</h2>
        {won ? (
          <>
            <div className="row"><span>Time left</span><b>{formatClock(state.secondsLeft)}</b></div>
            <div className="row"><span>Moves left</span><b>{state.moves}</b></div>
            <div className="row"><span>Coins</span><b>+{reward}</b></div>
            <button className="btn" onClick={onNext}>NEXT LEVEL</button>
            <button className="btn ghost" onClick={onReplay}>REPLAY</button>
          </>
        ) : (
          <>
            <div className="row"><span>Lives left</span><b>{Math.max(0, state.lives - 1)}</b></div>
            <button className="btn" onClick={onReplay}>RETRY</button>
            <button className="btn ghost" onClick={onMenu}>MENU</button>
          </>
        )}
      </div>
    </div>
  );
}

interface MenuProps {
  open: boolean;
  sound: boolean;
  vibrate: boolean;
  onResume: () => void;
  onRestart: () => void;
  onLevels: () => void;
  onToggleSound: () => void;
  onToggleVibrate: () => void;
}

export function MenuPanel({ open, sound, vibrate, onResume, onRestart, onLevels, onToggleSound, onToggleVibrate }: MenuProps) {
  if (!open) return null;
  return (
    <div className="scrim" onClick={onResume}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <h2>PAUSED</h2>
        <div className="toggle-row">
          <span>Sound</span>
          <button className={'switch' + (sound ? ' on' : '')} onClick={onToggleSound} aria-label="sound"><i /></button>
        </div>
        <div className="toggle-row">
          <span>Vibration</span>
          <button className={'switch' + (vibrate ? ' on' : '')} onClick={onToggleVibrate} aria-label="vibration"><i /></button>
        </div>
        <button className="btn" onClick={onResume}>RESUME</button>
        <button className="btn ghost" onClick={onRestart}>RESTART LEVEL</button>
        <button className="btn ghost" onClick={onLevels}>EXIT TO LEVELS</button>
      </div>
    </div>
  );
}
