type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
  tone: "violet" | "cyan" | "amber";
};

export function StatCard({ label, value, hint, tone }: StatCardProps) {
  return (
    <article className={`dsh-kpi ${tone}`}>
      <span className="k">{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
      <span className="dsh-kpi-ring" aria-hidden />
    </article>
  );
}
