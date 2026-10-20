import { ChevronDown, ChevronRight, ClipboardList, Edit, FileText, Plus, Trash2, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LessonRow } from "./LessonRow";
import type { QuizBuilder } from "./QuizBuilder";

type Lesson = {
  id: number;
  title: string;
  contentType: "video" | "text" | "pdf" | "quiz";
};

type Module = {
  id: number;
  title: string;
  description?: string;
  isOpen?: boolean;
  lessons?: Lesson[];
};

type ModuleCardProps = {
  module: Module;
  editingModule: boolean;
  hideLessons: boolean;
  editTitle: string;
  editDescription: string;
  savingModule: boolean;
  editingLessonId: number | null;
  editLessonTitle: string;
  editLessonContent: string;
  savingLesson: boolean;
  quiz?: React.ComponentProps<typeof QuizBuilder>;
  onToggle: () => void;
  onStartModule: () => void;
  onCancelModule: () => void;
  onSaveModule: () => void;
  onModuleTitle: (value: string) => void;
  onModuleDescription: (value: string) => void;
  onStartLesson: (lessonId: number) => void;
  onCancelLesson: () => void;
  onSaveLesson: () => void;
  onDeleteLesson: (lessonId: number) => void;
  onDeleteModule: () => void;
  onLessonTitle: (value: string) => void;
  onLessonContent: (value: string) => void;
  onAdd: (type: "text" | "video" | "pdf") => void;
  onAddQuiz: () => void;
};

export function ModuleCard(props: ModuleCardProps) {
  const { module } = props;
  const count = module.lessons?.length || 0;

  return (
    <article className="ced-module">
      {props.editingModule ? (
        <div className="ced-edit">
          <Input className="ced-input" value={props.editTitle} placeholder="Module title" onChange={(event) => props.onModuleTitle(event.target.value)} />
          <Textarea className="ced-input ced-area" rows={2} value={props.editDescription} placeholder="Module description (optional)" onChange={(event) => props.onModuleDescription(event.target.value)} />
          <div className="ced-edit-actions">
            <button type="button" className="ced-cancel" onClick={props.onCancelModule}>Cancel</button>
            <button type="button" className="ced-submit" onClick={props.onSaveModule} disabled={props.savingModule}>
              {props.savingModule ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="ced-module-head">
          <button type="button" className="ced-chev" aria-label={module.isOpen ? "Collapse module" : "Expand module"} onClick={props.onToggle}>
            {module.isOpen ? <ChevronDown strokeWidth={2} /> : <ChevronRight strokeWidth={2} />}
          </button>
          <div>
            <h3>{module.title}</h3>
            <p>{count === 1 ? "1 lesson" : `${count} lessons`}</p>
          </div>
          <button type="button" aria-label="Edit module" onClick={props.onStartModule}><Edit strokeWidth={2} /></button>
          <button type="button" className="rose" aria-label="Delete module" onClick={props.onDeleteModule}><Trash2 strokeWidth={2} /></button>
        </div>
      )}
      {module.isOpen && !props.hideLessons && (
        <div className="ced-module-body">
          {module.lessons?.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              editing={props.editingLessonId === lesson.id}
              editTitle={props.editLessonTitle}
              editContent={props.editLessonContent}
              onTitle={props.onLessonTitle}
              onContent={props.onLessonContent}
              onStart={() => props.onStartLesson(lesson.id)}
              onCancel={props.onCancelLesson}
              onSave={props.onSaveLesson}
              onDelete={() => props.onDeleteLesson(lesson.id)}
              saving={props.savingLesson}
              quiz={lesson.contentType === "quiz" ? props.quiz : undefined}
            />
          ))}
          <div className="ced-add-lessons">
            <button type="button" onClick={() => props.onAdd("text")}><FileText strokeWidth={2} aria-hidden /> Add text</button>
            <button type="button" onClick={() => props.onAdd("video")}><Video strokeWidth={2} aria-hidden /> Add video</button>
            <button type="button" onClick={() => props.onAdd("pdf")}><FileText strokeWidth={2} aria-hidden /> Add PDF</button>
            <button type="button" onClick={props.onAddQuiz}><ClipboardList strokeWidth={2} aria-hidden /> Add quiz</button>
          </div>
        </div>
      )}
    </article>
  );
}

export function ContentEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="ced-empty">
      <p>No modules added yet.</p>
      <button type="button" className="ced-submit" onClick={onAdd}><Plus strokeWidth={2} aria-hidden /> Add Module</button>
    </div>
  );
}
