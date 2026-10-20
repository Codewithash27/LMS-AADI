import { ClipboardList, Edit, FileText, Trash2, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuizBuilder } from "./QuizBuilder";

type Lesson = {
  id: number;
  title: string;
  contentType: "video" | "text" | "pdf" | "quiz";
};

const TYPE_ICON = {
  text: FileText,
  video: Video,
  pdf: FileText,
  quiz: ClipboardList,
} as const;

function TypeTile({ type }: { type: Lesson["contentType"] }) {
  const Icon = TYPE_ICON[type] ?? FileText;
  return (
    <span className={`ced-type ced-type-${type}`} aria-hidden>
      <Icon strokeWidth={2} />
    </span>
  );
}

type LessonRowProps = {
  lesson: Lesson;
  editing: boolean;
  editTitle: string;
  editContent: string;
  onTitle: (value: string) => void;
  onContent: (value: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  quiz?: React.ComponentProps<typeof QuizBuilder>;
};

export function LessonRow({
  lesson,
  editing,
  editTitle,
  editContent,
  onTitle,
  onContent,
  onStart,
  onCancel,
  onSave,
  onDelete,
  saving,
  quiz,
}: LessonRowProps) {
  return (
    <div className="ced-lesson">
      {editing ? (
        <div className="ced-edit">
          <div className="ced-lesson-edit-title">
            <TypeTile type={lesson.contentType} />
            <Input className="ced-input" value={editTitle} placeholder="Lesson title" onChange={(event) => onTitle(event.target.value)} />
          </div>
          {lesson.contentType === "quiz" && quiz ? (
            <QuizBuilder {...quiz} />
          ) : (
            <Textarea
              className="ced-input ced-area"
              value={editContent}
              rows={4}
              placeholder={
                lesson.contentType === "video" ? "Video URL" : lesson.contentType === "pdf" ? "PDF URL or notes" : "Lesson content"
              }
              onChange={(event) => onContent(event.target.value)}
            />
          )}
          <div className="ced-edit-actions">
            <button type="button" className="ced-cancel" onClick={onCancel}>Cancel</button>
            <button type="button" className="ced-submit" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      ) : (
        <div className="ced-lesson-row">
          <TypeTile type={lesson.contentType} />
          <span className="ced-lesson-name">{lesson.title}</span>
          <button type="button" aria-label="Edit lesson" onClick={onStart}><Edit strokeWidth={2} /></button>
          <button type="button" className="rose" aria-label="Delete lesson" onClick={onDelete}><Trash2 strokeWidth={2} /></button>
        </div>
      )}
    </div>
  );
}
