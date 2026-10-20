import { useId } from "react";

type TickRingProps = {
  value: number;
  size: number;
  figure: string;
  caption: string;
  label: string;
};

export function TickRing({ value, size, figure, caption, label }: TickRingProps) {
  const id = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className="dsh-ring" style={{ width: size, height: size }} role="img" aria-label={`${label} ${pct}%`}>
      <svg viewBox="0 0 120 120" aria-hidden>
        <defs>
          <mask id={`lit-${id}`}>
            <rect width="120" height="120" fill="black" />
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke="white"
              strokeWidth="18"
              pathLength="100"
              strokeDasharray={`${pct} ${100 - pct}`}
              transform="rotate(-90 60 60)"
            />
          </mask>
        </defs>
        <g fill="none" strokeWidth="8" transform="rotate(-90 60 60)">
          <circle className="dsh-ticks" cx="60" cy="60" r="46" pathLength="60" strokeDasharray="0.4 0.6" />
          <circle className="dsh-ticks-lit" cx="60" cy="60" r="46" pathLength="60" strokeDasharray="0.4 0.6" mask={`url(#lit-${id})`} />
        </g>
      </svg>
      <div className="dsh-ring-center">
        <strong>{figure}</strong>
        <span>{caption}</span>
      </div>
    </div>
  );
}
