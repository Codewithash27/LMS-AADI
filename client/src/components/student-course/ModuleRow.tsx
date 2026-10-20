import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { LessonRow } from "./LessonRow";

export type PanelLesson = {
  id: number;
  title: string;
  contentType: string;
  completed: boolean;
  locked?: boolean;
};

type ModuleRowProps = {
  moduleId: number;
  index: number;
  title: string;
  open: boolean;
  current: boolean;
  complete: boolean;
  lessons: PanelLesson[];
  activeLessonId: number | null;
  onOpen: () => void;
  onSelectLesson: (lessonId: number) => void;
};

export function ModuleRow({
  moduleId,
  index,
  title,
  open,
  current,
  complete,
  lessons,
  activeLessonId,
  onOpen,
  onSelectLesson,
}: ModuleRowProps) {
  return (
    <article className={current ? "scp-mod on" : "scp-mod"} data-module={moduleId} id={`scp-mod-${moduleId}`}>
      <button
        type="button"
        className="scp-mod-btn"
        aria-expanded={open}
        aria-current={current ? "true" : undefined}
        onClick={onOpen}
      >
        <span className="scp-num">{index}</span>
        <span className="scp-mod-title">{title}</span>
        {complete ? <Check className="scp-check" strokeWidth={2.4} aria-hidden /> : null}
        {open ? <ChevronUp strokeWidth={2} aria-hidden /> : <ChevronDown strokeWidth={2} aria-hidden />}
      </button>
      {open ? (
        <div className="scp-lessons">
          {lessons.length === 0 ? (
            <p className="scp-empty">No lessons yet</p>
          ) : (
            lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                title={lesson.title}
                contentType={lesson.contentType || "text"}
                current={lesson.id === activeLessonId}
                complete={lesson.completed}
                locked={lesson.locked}
                onSelect={() => onSelectLesson(lesson.id)}
              />
            ))
          )}
        </div>
      ) : null}
    </article>
  );
}
