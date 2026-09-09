import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight, TrendingUp, BookOpen } from "lucide-react";

type CoursePerformanceData = {
  name: string;
  percentage: number;
};

type PerformanceMetricsProps = {
  courses: CoursePerformanceData[];
  className?: string;
  reportHref?: string;
  /** Stretch to parent height (admin equal-height rows). Default: hug content. */
  fillHeight?: boolean;
  listMaxHeightClass?: string;
};

const COURSE_ICON_COLORS = [
  "bg-gradient-to-br from-[#0F766E] to-[#0E7490]",
  "bg-gradient-to-br from-[#0E7490] to-[#155E75]",
  "bg-gradient-to-br from-amber-500 to-orange-600",
  "bg-gradient-to-br from-pink-500 to-rose-600",
  "bg-gradient-to-br from-[#0E7490] to-[#155E75]",
];

export default function PerformanceMetrics({
  courses,
  className,
  reportHref = "/student/results",
  fillHeight = false,
  listMaxHeightClass,
}: PerformanceMetricsProps) {
  const getColorClasses = (percentage: number) => {
    if (percentage >= 80) return "from-green-500 to-emerald-600";
    if (percentage >= 60) return "from-yellow-500 to-amber-600";
    return "from-red-500 to-pink-600";
  };

  const getTextColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100 text-green-700";
    if (percentage >= 60) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  const scrollClass =
    listMaxHeightClass ?? (fillHeight ? "" : undefined);

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
          <div className="rounded-xl bg-gradient-to-br from-[#0E7490] to-[#155E75] p-2 shadow-md">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <CardTitle className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-base font-semibold text-transparent">
            Course Performance
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-col px-4 pb-4 pt-1 sm:px-5",
          fillHeight && "min-h-0 flex-1"
        )}
      >
        {courses.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No enrolled courses yet. Progress will show here after courses are assigned.
          </p>
        ) : (
          <>
            <div
              className={cn(
                "space-y-3",
                fillHeight && "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1",
                scrollClass
              )}
            >
              {courses.map((course, index) => (
                <div key={`${course.name}-${index}`} className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm",
                          COURSE_ICON_COLORS[index % COURSE_ICON_COLORS.length]
                        )}
                      >
                        <BookOpen className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="truncate text-sm font-medium text-gray-900">
                        {course.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                        getTextColor(course.percentage)
                      )}
                    >
                      {course.percentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={cn(
                        "h-2 rounded-full bg-gradient-to-r",
                        getColorClasses(course.percentage)
                      )}
                      style={{ width: `${Math.max(course.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "group w-full rounded-xl border-gray-300 bg-white/50 text-sm font-medium text-gray-700",
                fillHeight ? "mt-auto" : "mt-3"
              )}
              asChild
            >
              <a href={reportHref}>
                View Detailed Report
                <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
