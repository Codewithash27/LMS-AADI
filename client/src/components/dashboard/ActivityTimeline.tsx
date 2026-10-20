type ActivityItem = {
  id: string | number;
  title: string;
  description: string;
  time: string;
  tone?: "lime" | "cyan" | "amber" | "rose" | "violet" | "green";
};

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="dsh-time">
      {items.map((item) => (
        <li key={item.id} className={item.tone || "violet"}>
          <strong>{item.title}</strong>
          <time>{item.time}</time>
          <p>{item.description}</p>
        </li>
      ))}
    </ol>
  );
}
