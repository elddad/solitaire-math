import type { Card } from '../game/types';
import { SuitDiamond } from './Icons';
import { CARD_H, CARD_W } from '../layout';

export interface CardViewProps {
  card?: Card;
  faceDown?: boolean;
  x: number;
  y: number;
  z?: number;
  /** Show the answer instead of the expression (matched stacks, calculator). */
  showValue?: boolean;
  selected?: boolean;
  hinted?: boolean;
  shaking?: boolean;
  flipping?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export function CardView({
  card, faceDown, x, y, z = 0, showValue, selected, hinted, shaking, flipping, onClick, style,
}: CardViewProps) {
  const classes = ['card'];
  if (selected) classes.push('selected');
  if (hinted) classes.push('hinted');
  if (shaking) classes.push('shaking');
  if (flipping) classes.push('flipping');
  if (!onClick) classes.push('static');

  return (
    <div
      className={classes.join(' ')}
      style={{ transform: `translate(${x}px, ${y}px)`, zIndex: z, width: CARD_W, height: CARD_H, ...style }}
      onClick={onClick}
    >
      {faceDown || !card ? (
        <div className="back"><SuitDiamond className="back-mark" /></div>
      ) : card.kind === 'category' ? (
        <GoldFace card={card} />
      ) : (
        <div className="face">
          <span className={'expr' + (showValue ? ' solved' : (card.expression!.length > 4 ? ' small' : ''))}>
            {showValue ? card.value : card.expression}
          </span>
        </div>
      )}
    </div>
  );
}

function GoldFace({ card, progress }: { card: Card; progress?: number }) {
  return (
    <div className="face gold">
      <Sparkles />
      <div className="gold-diamond" />
      <div className="gold-value">{card.value}</div>
      <div className="gold-quota">{progress ?? 0} / {card.quota}</div>
    </div>
  );
}

/** Faint star texture on gold cards. */
function Sparkles() {
  const stars = [
    [40, 52, 9], [206, 88, 7], [58, 268, 8], [196, 250, 6], [126, 40, 6], [120, 300, 7],
  ];
  return (
    <svg className="sparkle" viewBox={`0 0 ${CARD_W} ${CARD_H}`} aria-hidden>
      {stars.map(([cx, cy, r], i) => (
        <path key={i} fill="rgba(255,255,255,.75)"
          d={`M${cx} ${cy - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}z`} />
      ))}
    </svg>
  );
}

export { GoldFace };
