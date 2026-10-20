import type { ReactNode } from "react";

type ExamCardProps = {
  title: string;
  detail: string;
  open: boolean;
  status?: string;
  action?: ReactNode;
};

export function ExamCard({ title, detail, open, status, action }: ExamCardProps) {
  return (
    <article className="dsh-exam">
      <span className={open ? "dsh-open" : "dsh-status"}>{open ? "Open" : status || "Closed"}</span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </article>
  );
}
