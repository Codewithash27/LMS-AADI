import { ClipboardList, PenLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AddQuizDialogProps = {
  open: boolean;
  parsing: boolean;
  onOpenChange: (open: boolean) => void;
  onManual: () => void;
  onUpload: () => void;
};

export function AddQuizDialog({ open, parsing, onOpenChange, onManual, onUpload }: AddQuizDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ced-quiz-dialog">
        <DialogHeader>
          <DialogTitle className="ced-quiz-title">
            <ClipboardList strokeWidth={2} aria-hidden />
            Add quiz lesson
          </DialogTitle>
          <DialogDescription>
            Build MCQ questions manually or import from the same PDF/Word format used for exams.
          </DialogDescription>
        </DialogHeader>
        <div className="ced-quiz-modes">
          <button type="button" onClick={onManual}>
            <PenLine strokeWidth={2} aria-hidden />
            <b>Manual</b>
            <span>Type each question and mark the correct option.</span>
          </button>
          <button type="button" onClick={onUpload} disabled={parsing}>
            <Upload strokeWidth={2} aria-hidden />
            <b>Upload document</b>
            <span>Parse MCQs with options and Answer: line from PDF or Word.</span>
          </button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
