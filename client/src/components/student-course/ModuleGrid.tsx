import { Check } from "lucide-react";

type ModuleGridProps = {
  modules: { id: number; title: string; complete: boolean }[];
  activeModuleId: number | null;
  onSelect: (moduleId: number) => void;
};

export function ModuleGrid({ modules, activeModuleId, onSelect }: ModuleGridProps) {
  return (
    <div className="scp-grid">
      {modules.map((module, index) => {
        const current = module.id === activeModuleId;
        const tone = current ? "on" : module.complete ? "done" : "";
        return (
          <button
            key={module.id}
            type="button"
            className={`scp-tile ${tone}`}
            title={module.title}
            aria-label={module.title}
            aria-current={current ? "true" : undefined}
            data-module={module.id}
            onClick={() => onSelect(module.id)}
          >
            <span>{index + 1}</span>
            {module.complete && !current ? <Check strokeWidth={2.4} aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}
