import { CoinPill, LivesPill } from './Pills';
import { HUD_Y, MOVES_Y, MOVES_H, STAGE_W } from '../layout';

interface Props {
  coins: number;
  lives: number;
  secondsLeft: number;
  level: number;
  moves: number;
  movesMax: number;
  onMenu: () => void;
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Hud({ coins, lives, secondsLeft, level, moves, movesMax, onMenu }: Props) {
  const pct = Math.max(0, Math.min(100, (moves / movesMax) * 100));
  return (
    <>
      <div className="abs" style={{ left: 60, top: HUD_Y }}><CoinPill coins={coins} /></div>
      <div className="abs" style={{ left: 400, top: HUD_Y }}>
        <LivesPill lives={lives} clock={formatClock(secondsLeft)} />
      </div>
      <div className="abs hud-text level-label" style={{ left: 806, top: HUD_Y + 24 }}>
        LEVEL {level}
      </div>
      <button className="abs menu-btn" style={{ left: STAGE_W - 60 - 112, top: HUD_Y }} onClick={onMenu} aria-label="Menu">
        <i /><i /><i />
      </button>

      <div className="abs hud-text moves-label" style={{ left: 62, top: MOVES_Y + 12 }}>Moves</div>
      <div className="abs moves-track" style={{ left: 300, top: MOVES_Y, width: STAGE_W - 300 - 62, height: MOVES_H }}>
        <div className="moves-fill" style={{ width: `${pct}%` }} />
        <div className="moves-count" style={{ right: `calc(${100 - pct}% + 22px)` }}>{moves}</div>
      </div>
    </>
  );
}
