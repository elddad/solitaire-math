import { useMemo, useState } from 'react';
import { TOTAL_LEVELS, levelConfig, worldOf } from '../game/campaign';
import type { Progress } from '../game/progress';
import { totalStars } from '../game/progress';
import { STAGE_W } from '../layout';

const PER_PAGE = 50;
const PAGES = Math.ceil(TOTAL_LEVELS / PER_PAGE);

interface Props {
  progress: Progress;
  onPick: (level: number) => void;
  onClose: () => void;
}

export function LevelSelect({ progress, onPick, onClose }: Props) {
  const startPage = Math.floor((progress.current - 1) / PER_PAGE);
  const [page, setPage] = useState(Math.min(PAGES - 1, Math.max(0, startPage)));

  const levels = useMemo(() => {
    const from = page * PER_PAGE + 1;
    return Array.from({ length: Math.min(PER_PAGE, TOTAL_LEVELS - from + 1) }, (_, i) => from + i);
  }, [page]);

  const world = levelConfig(page * PER_PAGE + 1);

  return (
    <div className="scrim levels">
      <div className="levels-panel">
        <header>
          <button className="round-btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>&#8249;</button>
          <div>
            <h2>{world.worldName}</h2>
            <p>Levels {page * PER_PAGE + 1}&ndash;{Math.min(TOTAL_LEVELS, (page + 1) * PER_PAGE)}</p>
          </div>
          <button className="round-btn" onClick={() => setPage((p) => Math.min(PAGES - 1, p + 1))} disabled={page === PAGES - 1}>&#8250;</button>
        </header>

        <div className="levels-grid" style={{ width: STAGE_W - 200 }}>
          {levels.map((n) => {
            const locked = n > progress.unlocked;
            const stars = progress.stars[n] ?? 0;
            return (
              <button
                key={n}
                className={'level-chip' + (locked ? ' locked' : '') + (stars ? ' done' : '') +
                  (n === progress.unlocked && !stars ? ' next' : '')}
                disabled={locked}
                onClick={() => onPick(n)}
              >
                <b>{locked ? '●' : n}</b>
                <span>{stars ? '★'.repeat(stars) : ''}</span>
              </button>
            );
          })}
        </div>

        <div className="levels-foot">
          <span>{totalStars(progress)} &#9733;</span>
          <button className="btn" onClick={onClose}>BACK</button>
        </div>
      </div>
    </div>
  );
}

export { worldOf };
