import type { Destination, GameState, Source } from '../game/types';
import { movableCount } from '../game/rules';
import { CardView } from './Card';
import { JokerArt, RestoreIcon } from './Icons';
import {
  CARD_H, CARD_W, COL_X, FOUNDATION_H, FOUNDATION_W, FOUNDATION_Y,
  STACK_STEP, STACK_STEP_UP, TABLEAU_Y, TRAY_H, TRAY_R, TRAY_W, TRAY_X, TRAY_Y,
} from '../layout';

export interface BoardProps {
  state: GameState;
  showValues: boolean;
  jokerArmed: boolean;
  shakingId: string | null;
  flippingIds: Set<string>;
  /** A tap on a tableau pile. source is null when that card cannot be lifted. */
  onTapPile: (col: number, source: Source | null) => void;
  onTapSource: (source: Source) => void;
  onTapFoundation: (slot: number) => void;
  onTapStock: () => void;
  onTapJoker: () => void;
}

const sameSource = (a: Source | null, b: Source) =>
  !!a && a.from === b.from &&
  (a.from === 'waste' || (b.from === 'column' && a.col === b.col && a.count === b.count));

const hintedSource = (h: GameState['hint'], b: Source) => sameSource(h ? h.source : null, b);

function isHintDest(hint: GameState['hint'], d: Destination) {
  if (!hint) return false;
  const dest = hint.destination;
  return dest.to === d.to &&
    (dest.to === 'column' ? dest.col === (d as { col: number }).col
      : dest.slot === (d as { slot: number }).slot);
}

export function Board(props: BoardProps) {
  const { state } = props;
  return (
    <>
      <Foundations {...props} />
      <Tableau {...props} />
      <div className="tray abs" style={{ left: TRAY_X, top: TRAY_Y, width: TRAY_W, height: TRAY_H, borderRadius: TRAY_R }} />
      <Joker {...props} />
      <Waste {...props} />
      <Stock {...props} />
      {state.phase !== 'playing' && <div className="abs" style={{ inset: 0, zIndex: 50 }} />}
    </>
  );
}

/* ------------------------------------------------------------ foundations */
function Foundations({ state, onTapFoundation, jokerArmed }: BoardProps) {
  return (
    <>
      {state.foundations.map((f, slot) => {
        const dest: Destination = { to: 'foundation', slot };
        const armed =
          (jokerArmed && f.card && f.progress < f.quota) || isHintDest(state.hint, dest);
        const x = COL_X[slot];
        return (
          <div
            key={slot}
            className={'slot abs' + (armed ? ' droppable' : '') + (f.completing ? ' completing' : '')}
            style={{ left: x, top: FOUNDATION_Y, width: FOUNDATION_W, height: FOUNDATION_H }}
            onClick={() => onTapFoundation(slot)}
          >
            {f.card && f.progress === 0 && (
              <div className="face gold" style={{ position: 'absolute', inset: 0 }}>
                <div className="gold-diamond" />
                <div className="gold-value">{f.value}</div>
                <div className="gold-quota">0 / {f.quota}</div>
              </div>
            )}
            {f.card && f.progress > 0 && (
              <>
                <div className="found-tab">{f.value}</div>
                <div className="found-top">{f.value}</div>
              </>
            )}
            {f.card && (
              <div className="dots">
                {Array.from({ length: f.quota }, (_, i) => (
                  <span key={i} className={'dot' + (i < f.progress ? ' on' : '')} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* --------------------------------------------------------------- tableau */
function Tableau({ state, showValues, onTapPile, shakingId, flippingIds }: BoardProps) {
  const available = TRAY_Y - 40 - TABLEAU_Y;
  return (
    <>
      {state.columns.map((column, col) => {
        const groupSize = movableCount(state, col);
        const n = column.cards.length;

        // lay the stack out, squeezing the overlap if the column grows tall
        const steps: number[] = [];
        for (let i = 0; i < n - 1; i++) steps.push(i < column.downCount ? STACK_STEP : STACK_STEP_UP);
        const raw = steps.reduce((a, b) => a + b, 0);
        const squeeze = raw + CARD_H > available ? Math.max(0.34, (available - CARD_H) / Math.max(1, raw)) : 1;

        let y = 0;
        const tops = steps.map((s) => { const at = y; y += s * squeeze; return at; });
        tops.push(y);

        return (
          <div key={col}>
            {n === 0 && (
              <div
                className={'slot abs' + (isHintDest(state.hint, { to: 'column', col }) ? ' droppable' : '')}
                style={{ left: COL_X[col], top: TABLEAU_Y, width: CARD_W, height: CARD_H, opacity: .55 }}
                onClick={() => onTapPile(col, null)}
              />
            )}
            {column.cards.map((card, i) => {
              const faceDown = i < column.downCount;
              const inGroup = i >= n - groupSize && groupSize > 0 && !faceDown;
              const source: Source = { from: 'column', col, count: n - i };
              const canLift = inGroup;
              return (
                <CardView
                  key={card.id}
                  card={card}
                  faceDown={faceDown}
                  x={COL_X[col]}
                  y={TABLEAU_Y + tops[i]}
                  z={10 + i}
                  showValue={
                    card.kind === 'equation' &&
                    ((inGroup && groupSize > 1) || (showValues && !faceDown))
                  }
                  selected={sameSource(state.selected, source)}
                  hinted={hintedSource(state.hint, source)}
                  shaking={shakingId === card.id}
                  flipping={flippingIds.has(card.id)}
                  onClick={() => onTapPile(col, canLift ? source : null)}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ tray */
const TRAY_CARD_Y = TRAY_Y + (TRAY_H - CARD_H) / 2;
const JOKER_X = TRAY_X + 26;
const STOCK_X = TRAY_X + TRAY_W - 26 - CARD_W;
const WASTE_X = TRAY_X + 380;
const SLIVER = 38;

function Joker({ state, jokerArmed, onTapJoker }: BoardProps) {
  const spent = state.boosters.joker <= 0;
  return (
    <div
      className={'card abs' + (jokerArmed ? ' selected' : '')}
      style={{
        transform: `translate(${JOKER_X}px, ${TRAY_CARD_Y}px)`,
        zIndex: 20, opacity: spent ? .4 : 1, pointerEvents: spent ? 'none' : 'auto',
      }}
      onClick={onTapJoker}
    >
      <div className="face gold"><JokerArt /></div>
      <div className="joker-badge" style={{ right: -18, top: -18 }}>{state.boosters.joker}</div>
    </div>
  );
}

function Waste({ state, showValues, onTapSource, shakingId }: BoardProps) {
  const shown = state.waste.slice(0, 7);
  return (
    <>
      {shown.map((card, i) => (
        <CardView
          key={card.id}
          card={card}
          x={WASTE_X + i * SLIVER}
          y={TRAY_CARD_Y}
          z={30 - i}
          showValue={showValues && card.kind === 'equation'}
          selected={i === 0 && sameSource(state.selected, { from: 'waste' })}
          hinted={i === 0 && hintedSource(state.hint, { from: 'waste' })}
          shaking={shakingId === card.id}
          onClick={i === 0 ? () => onTapSource({ from: 'waste' }) : undefined}
        />
      ))}
    </>
  );
}

function Stock({ state, onTapStock }: BoardProps) {
  const depth = Math.min(state.stock.length, 5);
  if (!state.stock.length) {
    const canRestore = state.waste.length > 1;
    return (
      <button
        className="restore-btn"
        style={{ left: STOCK_X, top: TRAY_CARD_Y, opacity: canRestore ? 1 : .45 }}
        onClick={onTapStock}
        disabled={!canRestore}
      >
        <RestoreIcon />
        <span>RESTORE<br />STOCK</span>
      </button>
    );
  }
  return (
    <>
      {Array.from({ length: depth }, (_, i) => (
        <CardView
          key={'stockback' + i}
          faceDown
          x={STOCK_X}
          y={TRAY_CARD_Y - (depth - 1 - i) * 3}
          z={20 + i}
          onClick={i === depth - 1 ? onTapStock : undefined}
        />
      ))}
      <div className="stock-count abs" style={{ left: STOCK_X - 26, top: TRAY_CARD_Y + CARD_H - 74, zIndex: 40 }}>
        {state.stock.length}
      </div>
    </>
  );
}
