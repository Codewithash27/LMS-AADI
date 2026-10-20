import { ArrowRight, Check } from "lucide-react";

type LessonActionsProps = {
  completed: boolean;
  showComplete: boolean;
  pending: boolean;
  atStart: boolean;
  atEnd: boolean;
  onComplete: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function LessonActions({
  completed,
  showComplete,
  pending,
  atStart,
  atEnd,
  onComplete,
  onPrevious,
  onNext,
}: LessonActionsProps) {
  return (
    <div className="scp-actions">
      {completed ? (
        <span className="scp-done">
          <Check strokeWidth={2.4} aria-hidden />
          Completed
        </span>
      ) : showComplete ? (
        <button type="button" className="scp-mark" onClick={onComplete} disabled={pending}>
          <Check strokeWidth={2.4} aria-hidden />
          {pending ? "Saving..." : "Mark as complete"}
        </button>
      ) : (
        <span />
      )}
      <div className="scp-nav">
        <button type="button" className="scp-prev" onClick={onPrevious} disabled={atStart}>
          Previous
        </button>
        <button type="button" className="scp-next" onClick={onNext} disabled={atEnd}>
          Next lesson
          <ArrowRight strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
