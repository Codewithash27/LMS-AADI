type CourseGaugeProps = {
  name: string;
  percentage: number;
  tone: "green" | "rose" | "violet";
};

export function CourseGauge({ name, percentage, tone }: CourseGaugeProps) {
  const radius = 46;
  const turn = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, percentage));
  return (
    <div className={`dsh-gauge ${tone}`} role="img" aria-label={`${name} ${pct}%`}>
      <svg viewBox="0 0 112 112" aria-hidden>
        <circle cx="56" cy="56" r={radius} />
        <circle cx="56" cy="56" r={radius} strokeDasharray={`${(pct / 100) * turn} ${turn}`} />
      </svg>
      <strong>{pct}%</strong>
      <span>{name}</span>
    </div>
  );
}
