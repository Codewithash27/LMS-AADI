import { Check, ClipboardList, FileText, Lock, Video } from "lucide-react";

type LessonRowProps = {
  title: string;
  contentType: string;
  current: boolean;
  complete: boolean;
  locked?: boolean;
  onSelect: () => void;
};

function TypeIcon({ contentType }: { contentType: string }) {
  const kind = contentType.toLowerCase();
  if (kind === "video") return <Video className="scp-type video" strokeWidth={2} aria-hidden />;
  if (kind === "quiz") return <ClipboardList className="scp-type quiz" strokeWidth={2} aria-hidden />;
  return <FileText className="scp-type doc" strokeWidth={2} aria-hidden />;
}

export function LessonRow({ title, contentType, current, complete, locked, onSelect }: LessonRowProps) {
  return (
    <button
      type="button"
      className={current ? "scp-lesson on" : "scp-lesson"}
      aria-current={current ? "true" : undefined}
      aria-label={locked ? `${title}, locked` : undefined}
      onClick={onSelect}
    >
      <TypeIcon contentType={contentType} />
      <span>{title}</span>
      {locked ? <Lock className="scp-lock" strokeWidth={2} aria-hidden /> : null}
      {complete ? <Check className="scp-check" strokeWidth={2.4} aria-hidden /> : null}
    </button>
  );
}
