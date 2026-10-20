import { Plus } from "lucide-react";
import { ModuleCard, ContentEmpty } from "./ModuleCard";
import type { QuizBuilder } from "./QuizBuilder";

type ContentStepProps = {
  mode: "create" | "edit";
  loading: boolean;
  modules: {
    id: number;
    title: string;
    description?: string;
    isOpen?: boolean;
    lessons?: { id: number; title: string; contentType: "video" | "text" | "pdf" | "quiz" }[];
  }[];
  editingModuleId: number | null;
  quiz: React.ComponentProps<typeof QuizBuilder>;
  onAddModule: () => void;
  bind: (moduleId: number) => Omit<React.ComponentProps<typeof ModuleCard>, "module" | "editingModule" | "hideLessons" | "quiz">;
};

export function ContentStep({ mode, loading, modules, editingModuleId, quiz, onAddModule, bind }: ContentStepProps) {
  return (
    <div className="ced-content">
      {mode === "create" && <p className="ced-note">Modules are saved together with the course.</p>}
      <div className="ced-content-bar">
        <button type="button" className="ced-submit" onClick={onAddModule}>
          <Plus strokeWidth={2} aria-hidden />
          Add Module
        </button>
      </div>
      {loading ? (
        <div className="ced-skeletons" aria-busy="true">
          <div /><div /><div />
        </div>
      ) : modules.length === 0 ? (
        <ContentEmpty onAdd={onAddModule} />
      ) : (
        modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            editingModule={editingModuleId === module.id}
            hideLessons={editingModuleId != null}
            quiz={quiz}
            {...bind(module.id)}
          />
        ))
      )}
    </div>
  );
}
