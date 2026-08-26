/* Original CSS/SVG artwork -- no emoji, no third-party marks. */

export const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path fill="#8A5A05" d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5 6.2 20.5l1.1-6.5-4.7-4.6 6.5-.95z" />
  </svg>
);

export const HeartIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden>
    <defs>
      <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FF7A7A" /><stop offset=".55" stopColor="#E8232F" /><stop offset="1" stopColor="#B00C1C" />
      </linearGradient>
    </defs>
    <path fill="url(#hg)" stroke="#fff" strokeWidth="1.6"
      d="M12 20.6l-1.4-1.3C5.5 14.7 2.6 12.1 2.6 8.9 2.6 6.3 4.6 4.3 7.2 4.3c1.5 0 2.9.7 3.8 1.8.9-1.1 2.3-1.8 3.8-1.8 2.6 0 4.6 2 4.6 4.6 0 3.2-2.9 5.8-8 10.4z" />
    <ellipse cx="8.6" cy="9" rx="1.9" ry="1.3" fill="rgba(255,255,255,.55)" transform="rotate(-28 8.6 9)" />
  </svg>
);

export const SuitDiamond = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" aria-hidden>
    <rect x="9" y="9" width="30" height="30" rx="5" fill="none" stroke="#fff" strokeWidth="2.4" transform="rotate(45 24 24)" />
    <text x="17" y="21" fontSize="11" fill="#fff" fontFamily="sans-serif">+</text>
    <text x="27" y="21" fontSize="11" fill="#fff" fontFamily="sans-serif">&#8722;</text>
    <text x="17" y="33" fontSize="11" fill="#fff" fontFamily="sans-serif">&#215;</text>
    <text x="27" y="33" fontSize="11" fill="#fff" fontFamily="sans-serif">&#247;</text>
  </svg>
);

export const RestoreIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="#7BE04A" strokeWidth="2.6" strokeLinecap="round">
    <path d="M20 11a8 8 0 10-2.3 5.7" />
    <path d="M20 4.5V11h-6.4" />
  </svg>
);

export const JokerArt = () => (
  <svg viewBox="0 0 120 160" aria-hidden>
    <g transform="translate(60 62)">
      <path d="M-40 6c-6-16-18-22-18-34 0-8 7-13 13-9 5-14 22-18 30-6 8-12 25-8 30 6 6-4 13 1 13 9 0 12-12 18-18 34z"
        fill="#F6A21B" stroke="#8A5A05" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="-44" cy="-28" r="7" fill="#FFF0B4" stroke="#8A5A05" strokeWidth="3" />
      <circle cx="0" cy="-42" r="7" fill="#FFF0B4" stroke="#8A5A05" strokeWidth="3" />
      <circle cx="44" cy="-28" r="7" fill="#FFF0B4" stroke="#8A5A05" strokeWidth="3" />
      <rect x="-42" y="4" width="84" height="15" rx="7" fill="#FFE07A" stroke="#8A5A05" strokeWidth="4" />
    </g>
    <text x="60" y="132" textAnchor="middle" fontSize="26" fill="#5A3400"
      fontFamily="'Lilita One', sans-serif">JOKER</text>
  </svg>
);

const CardStack = ({ tilt = -12, fill = '#E8362F' }: { tilt?: number; fill?: string }) => (
  <g transform={`rotate(${tilt} 34 40)`}>
    <rect x="12" y="14" width="44" height="58" rx="8" fill={fill} stroke="#2B3A31" strokeWidth="4" />
    <rect x="18" y="20" width="32" height="46" rx="5" fill="rgba(255,255,255,.28)" />
  </g>
);

export const HintIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden>
    <CardStack />
    <g transform="translate(46 30)">
      <path d="M20 6a17 17 0 00-11 30c2 2 3 4 3 7h16c0-3 1-5 3-7A17 17 0 0020 6z"
        fill="#FFD93B" stroke="#2B3A31" strokeWidth="4" />
      <rect x="11" y="45" width="18" height="9" rx="4" fill="#C9922A" stroke="#2B3A31" strokeWidth="3.5" />
    </g>
  </svg>
);

export const UndoIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden>
    <CardStack tilt={10} fill="#EFEFEF" />
    <g transform="translate(34 26)" fill="none" stroke="#2B3A31" strokeWidth="5" strokeLinecap="round">
      <path d="M50 44a22 22 0 10-8-24" stroke="#3FBF63" strokeWidth="10" />
      <path d="M40 4v18h18" stroke="#3FBF63" strokeWidth="10" strokeLinejoin="round" />
    </g>
  </svg>
);

export const MagnetIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden>
    <CardStack tilt={-8} fill="#EFEFEF" />
    <g transform="translate(30 24)" stroke="#2B3A31" strokeWidth="4.5">
      <path d="M8 44a22 22 0 0144 0v10H40V44a10 10 0 00-20 0v10H8z" fill="#E8362F" />
      <rect x="8" y="52" width="12" height="14" rx="3" fill="#3B7BE0" />
      <rect x="40" y="52" width="12" height="14" rx="3" fill="#3B7BE0" />
    </g>
  </svg>
);

export const CalculatorIcon = () => (
  <svg viewBox="0 0 100 100" aria-hidden>
    <CardStack tilt={-14} />
    <g transform="translate(40 26)">
      <rect x="0" y="0" width="52" height="60" rx="9" fill="#FFD93B" stroke="#2B3A31" strokeWidth="4.5" />
      <rect x="7" y="7" width="38" height="14" rx="4" fill="#3F5147" />
      <g fill="#3F5147">
        <rect x="8" y="27" width="10" height="9" rx="3" /><rect x="21" y="27" width="10" height="9" rx="3" />
        <rect x="34" y="27" width="10" height="9" rx="3" /><rect x="8" y="40" width="10" height="9" rx="3" />
        <rect x="21" y="40" width="10" height="9" rx="3" /><rect x="34" y="40" width="10" height="9" rx="3" />
      </g>
    </g>
  </svg>
);
