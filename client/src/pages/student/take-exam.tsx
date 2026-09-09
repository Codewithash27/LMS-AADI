import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ExamView from "@/components/exams/exam-view";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function StudentTakeExam() {
  const [, params] = useRoute("/student/take-exam/:examId");
  const examId = Number(params?.examId);

  const { data: exam, isLoading, error } = useQuery<any>({
    queryKey: [`/api/exams/${examId}`],
    enabled: Number.isFinite(examId) && examId > 0,
  });

  if (!Number.isFinite(examId) || examId <= 0) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#1a3a4a] p-6 text-white">
        <p className="text-white/80">Invalid exam link.</p>
        <Link href="/student/upcoming-exams">
          <Button>Back to exams</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#1a3a4a]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[#1a3a4a] p-6 text-white">
        <p className="text-white/80">Could not load this exam.</p>
        <Link href="/student/upcoming-exams">
          <Button>Back to exams</Button>
        </Link>
      </div>
    );
  }

  return (
    <ExamView
      mode="page"
      exam={{
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        acceptingResponses: exam.acceptingResponses,
      }}
    />
  );
}
