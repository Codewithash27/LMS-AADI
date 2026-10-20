import type { ReactNode } from "react";
import { BookOpen, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { StepRail, type EditorStep } from "./StepRail";

type EditorShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  step: EditorStep;
  stepErrors: Partial<Record<EditorStep, boolean>>;
  onStep: (step: EditorStep) => void;
  isPending: boolean;
  pendingLabel: string;
  submitLabel: string;
  formId: string;
  preview: ReactNode;
  children: ReactNode;
};

const TITLES: Record<EditorStep, { k: string; word: string }> = {
  details: { k: "Course", word: "details" },
  content: { k: "Course", word: "content" },
  thumbnail: { k: "Course", word: "thumbnail" },
};

export function EditorShell({
  open,
  onOpenChange,
  mode,
  step,
  stepErrors,
  onStep,
  isPending,
  pendingLabel,
  submitLabel,
  formId,
  preview,
  children,
}: EditorShellProps) {
  const stepIndex = step === "details" ? 1 : step === "content" ? 2 : 3;
  const heading = TITLES[step];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ced">
        <header className="ced-head">
          <span className="ced-mark" aria-hidden>
            <BookOpen strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <DialogTitle className="ced-h1">
              {mode === "edit" ? "Edit" : "Create"} <i>course</i>
            </DialogTitle>
            <DialogDescription className="ced-sub">
              {mode === "edit"
                ? "Update course details, content, and thumbnail."
                : "Set up a new course with modules, lessons, and a cover image."}
            </DialogDescription>
          </div>
          <button type="button" className="ced-close" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X strokeWidth={2} />
          </button>
        </header>
        <div className="ced-body">
          <StepRail step={step} errors={stepErrors} onChange={onStep} />
          <div className="ced-main">
            <p className="k">Step {stepIndex} of 3</p>
            <h2 className="ced-step-h">
              {heading.k} <i>{heading.word}</i>
            </h2>
            <div className="ced-scroll">{children}</div>
          </div>
          <aside className="ced-preview">{preview}</aside>
        </div>
        <footer className="ced-foot">
          <button type="button" className="ced-cancel" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </button>
          <button type="submit" form={formId} className="ced-submit" disabled={isPending}>
            <Check strokeWidth={2.4} aria-hidden />
            {isPending ? pendingLabel : submitLabel}
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
