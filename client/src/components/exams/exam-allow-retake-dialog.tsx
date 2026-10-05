import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";

type ExamSummary = {
  id: number;
  title: string;
  courseId?: number;
};

type Props = {
  exam: ExamSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select one student (e.g. from grading row). */
  initialUserId?: number;
};

export function ExamAllowRetakeDialog({
  exam,
  open,
  onOpenChange,
  initialUserId,
}: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"student" | "batch">(initialUserId ? "student" : "student");
  const [studentId, setStudentId] = useState<string>(
    initialUserId ? String(initialUserId) : ""
  );
  const [batchId, setBatchId] = useState<string>("");
  const [pending, setPending] = useState(false);

  const { data: users = [] } = useQuery<{ id: number; firstName?: string; lastName?: string; username: string; role: string }[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const { data: batches = [] } = useQuery<
    { id: number; name: string; batchCode?: string }[]
  >({
    queryKey: ["/api/batches"],
    enabled: open,
  });

  const students = users.filter((u) => u.role === "student");

  useEffect(() => {
    if (open && initialUserId) {
      setMode("student");
      setStudentId(String(initialUserId));
    }
  }, [open, initialUserId]);

  const submit = async () => {
    if (!exam) return;
    setPending(true);
    try {
      const body =
        mode === "batch"
          ? { batchId: parseInt(batchId, 10) }
          : { userId: parseInt(studentId, 10) };

      const res = await apiRequest("POST", `/api/exams/${exam.id}/allow-retake`, body);
      const data = await res.json();
      toast({
        title: "Retake allowed",
        description: data.message || "Students can start this exam again.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exam-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exam-attempts/user"] });
      onOpenChange(false);
      setStudentId("");
      setBatchId("");
    } catch (err: unknown) {
      toast({
        title: "Could not allow retake",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  };

  const canSubmit =
    mode === "student"
      ? studentId !== "" && Number.isFinite(parseInt(studentId, 10))
      : batchId !== "" && Number.isFinite(parseInt(batchId, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
            <RotateCcw className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Allow exam retake</DialogTitle>
          <DialogDescription className="text-center">
            {exam ? (
              <>
                Clears previous attempt(s) for{" "}
                <span className="font-semibold text-foreground">{exam.title}</span> so
                selected student(s) can start again. Ensure the exam is{" "}
                <span className="font-medium">published</span> if they could not access it.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "student" ? "default" : "outline"}
              className="h-10 rounded-xl"
              onClick={() => setMode("student")}
            >
              One student
            </Button>
            <Button
              type="button"
              variant={mode === "batch" ? "default" : "outline"}
              className="h-10 rounded-xl"
              onClick={() => setMode("batch")}
            >
              Whole batch
            </Button>
          </div>

          {mode === "student" ? (
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {[s.firstName, s.lastName].filter(Boolean).join(" ") || s.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                      {b.batchCode ? ` (${b.batchCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All active students in this batch get a fresh attempt for this exam.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit || pending || !exam}>
            {pending ? "Saving..." : "Allow retake"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
