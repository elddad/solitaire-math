import { BOOSTER_SIZE, BOOSTER_Y, STAGE_W } from '../layout';
import { CalculatorIcon, HintIcon, MagnetIcon, UndoIcon } from './Icons';
import type { Boosters as Counts } from '../game/types';

interface Props {
  counts: Counts;
  canUndo: boolean;
  canMagnet: boolean;
  onHint: () => void;
  onUndo: () => void;
  onMagnet: () => void;
  onCalculator: () => void;
}

export function BoosterRow({ counts, canUndo, canMagnet, onHint, onUndo, onMagnet, onCalculator }: Props) {
  const items = [
    { key: 'hint', icon: <HintIcon />, n: counts.hint, on: counts.hint > 0, run: onHint },
    { key: 'undo', icon: <UndoIcon />, n: counts.undo, on: counts.undo > 0 && canUndo, run: onUndo },
    { key: 'magnet', icon: <MagnetIcon />, n: counts.magnet, on: counts.magnet > 0 && canMagnet, run: onMagnet },
    { key: 'calc', icon: <CalculatorIcon />, n: counts.calculator, on: counts.calculator > 0, run: onCalculator },
  ];
  const gap = 42;
  const total = items.length * BOOSTER_SIZE + (items.length - 1) * gap;
  const left = (STAGE_W - total) / 2;

  return (
    <>
      {items.map((item, i) => (
        <button
          key={item.key}
          className="booster"
          style={{ left: left + i * (BOOSTER_SIZE + gap), top: BOOSTER_Y }}
          disabled={!item.on}
          onClick={item.run}
          aria-label={item.key}
        >
          {item.icon}
          <span className="count">{item.n}</span>
        </button>
      ))}
    </>
  );
}
