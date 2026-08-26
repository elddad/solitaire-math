import { HeartIcon, StarIcon } from './Icons';

export function CoinPill({ coins }: { coins: number }) {
  return (
    <div className="pill">
      <span className="coin"><StarIcon /></span>
      <span>{coins}</span>
      <span className="plus">+</span>
    </div>
  );
}

export function LivesPill({ lives, clock }: { lives: number; clock: string }) {
  return (
    <div className="pill">
      <HeartIcon className="heart" />
      <span>{lives}</span>
      <span className="timer">{clock}</span>
      <span className="plus">+</span>
    </div>
  );
}
