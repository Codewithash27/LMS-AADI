type CapsuleRow = { id: number; name: string; percentage: number };

export function CapsuleProgress({ rows, average }: { rows: CapsuleRow[]; average: number }) {
  const mark = Math.max(0, Math.min(100, average));
  return (
    <div className="dsh-batch" style={{ ["--mark" as string]: String(mark / 100) }}>
      {rows.map((row) => {
        const pct = Math.max(0, Math.min(100, row.percentage));
        return (
          <div key={row.id} className="dsh-cap">
            <span>{row.name}</span>
            <div className="dsh-track">
              <span className={pct <= 0 ? "stub" : "fill"} style={pct <= 0 ? undefined : { width: `${pct}%` }} />
            </div>
            <b>{pct}%</b>
          </div>
        );
      })}
      {rows.length > 0 ? <i className="dsh-marker" aria-hidden /> : null}
    </div>
  );
}
