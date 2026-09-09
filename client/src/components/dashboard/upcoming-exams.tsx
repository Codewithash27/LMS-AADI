import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Clock, Plus, ClipboardList, FileText, Award } from "lucide-react";

type Urgency = "high" | "medium" | "low";

type ExamItem = {
  id: string | number;
  title: string;
  subtitle: string;
  urgency: Urgency;
  urgencyLabel: string;
  time: string;
};

type UpcomingExamsProps = {
  exams: ExamItem[];
  className?: string;
  onScheduleExam?: () => void;
  showScheduleButton?: boolean;
  examListHref?: string;
  scheduleLabel?: string;
  /** Stretch to parent height (equal-height rows). Default: hug content. */
  fillHeight?: boolean;
  listMaxHeightClass?: string;
};

export default function UpcomingExams({
  exams,
  className,
  onScheduleExam,
  showScheduleButton = true,
  examListHref = "/student/upcoming-exams",
  scheduleLabel = "Schedule New Exam",
  fillHeight = false,
  listMaxHeightClass,
}: UpcomingExamsProps) {
  const getUrgencyClasses = (urgency: Urgency) => {
    switch (urgency) {
      case "high":
        return "bg-rose-50 text-rose-700";
      case "medium":
        return "bg-amber-50 text-amber-700";
      case "low":
        return "bg-sky-50 text-sky-700";
    }
  };

  const getIconConfig = (urgency: Urgency) => {
    switch (urgency) {
      case "high":
        return {
          bg: "bg-gradient-to-br from-red-500 to-pink-600",
          icon: <ClipboardList className="h-3.5 w-3.5 text-white" />,
        };
      case "medium":
        return {
          bg: "bg-gradient-to-br from-amber-500 to-orange-600",
          icon: <FileText className="h-3.5 w-3.5 text-white" />,
        };
      case "low":
        return {
          bg: "bg-gradient-to-br from-blue-500 to-cyan-600",
          icon: <Award className="h-3.5 w-3.5 text-white" />,
        };
    }
  };

  return (
    <Card
      className={cn(
        "border border-white/20 bg-white/70 shadow-xl backdrop-blur-sm",
        fillHeight && "flex h-full min-h-0 flex-col",
        className
      )}
    >
      <CardHeader className="shrink-0 space-y-0 px-4 pb-2 pt-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2 shadow-md">
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          <CardTitle className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-base font-semibold text-transparent">
            Upcoming Exams
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-col px-4 pb-4 pt-1 sm:px-5",
          fillHeight && "min-h-0 flex-1"
        )}
      >
        {exams.length === 0 ? (
          <p
            className={cn(
              "py-4 text-center text-sm text-gray-500",
              fillHeight && "flex-1"
            )}
          >
            No exams yet for your assigned courses.
          </p>
        ) : (
          <div
            className={cn(
              "space-y-2",
              fillHeight && "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1",
              listMaxHeightClass
            )}
          >
            {exams.map((exam) => {
              const iconCfg = getIconConfig(exam.urgency);
              return (
                <button
                  key={exam.id}
                  type="button"
                  className="w-full rounded-xl border border-gray-200/60 bg-white/60 p-2.5 text-left transition hover:border-gray-300 hover:shadow-sm"
                  onClick={() => {
                    window.location.href = examListHref;
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className={cn("shrink-0 rounded-lg p-2 shadow-sm", iconCfg.bg)}>
                        {iconCfg.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {exam.title}
                        </p>
                        <p className="truncate text-xs text-gray-600">{exam.subtitle}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        getUrgencyClasses(exam.urgency)
                      )}
                    >
                      {exam.urgencyLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Clock className="h-3 w-3" />
                    {exam.time}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {showScheduleButton ? (
          <Button
            size="sm"
            className="group mt-auto w-full rounded-xl border-0 bg-accent-brand text-sm font-bold text-white hover:opacity-95"
            onClick={onScheduleExam}
          >
            <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
            {scheduleLabel}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="mt-auto h-8 w-full rounded-lg text-xs font-medium"
            asChild
          >
            <a href={examListHref}>
              View All Exams
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
