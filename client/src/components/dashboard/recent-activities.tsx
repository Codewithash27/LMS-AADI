import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Edit,
  CheckCircle,
  Clock,
  UserPlus,
  ArrowRight,
  BookOpen,
  GraduationCap,
  ClipboardList,
  Activity,
} from "lucide-react";

type ActivityType = "new-course" | "exam-results" | "deadline" | "new-students" | "progress";

type ActivityItem = {
  id: string | number;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
  colorIndex?: number;
};

type RecentActivitiesProps = {
  activities: ActivityItem[];
  className?: string;
  viewAllHref?: string;
  /** Stretch to parent height (admin equal-height rows). Default: hug content. */
  fillHeight?: boolean;
  listMaxHeightClass?: string;
};

const COURSE_PALETTES = [
  {
    bg: "bg-gradient-to-br from-[#0F766E] to-[#0E7490]",
    icon: <BookOpen className="h-3.5 w-3.5 text-white" />,
  },
  {
    bg: "bg-gradient-to-br from-[#0E7490] to-[#155E75]",
    icon: <Edit className="h-3.5 w-3.5 text-white" />,
  },
  {
    bg: "bg-gradient-to-br from-pink-500 to-rose-600",
    icon: <GraduationCap className="h-3.5 w-3.5 text-white" />,
  },
  {
    bg: "bg-gradient-to-br from-amber-500 to-orange-600",
    icon: <ClipboardList className="h-3.5 w-3.5 text-white" />,
  },
  {
    bg: "bg-gradient-to-br from-[#0E7490] to-[#155E75]",
    icon: <BookOpen className="h-3.5 w-3.5 text-white" />,
  },
];

export default function RecentActivities({
  activities,
  className,
  viewAllHref = "/student/my-courses",
  fillHeight = false,
  listMaxHeightClass,
}: RecentActivitiesProps) {
  const getActivityConfig = (type: ActivityType, colorIndex = 0) => {
    switch (type) {
      case "new-course":
        return COURSE_PALETTES[colorIndex % COURSE_PALETTES.length];
      case "exam-results":
        return {
          bg: "bg-gradient-to-br from-green-500 to-emerald-600",
          icon: <CheckCircle className="h-3.5 w-3.5 text-white" />,
        };
      case "deadline":
        return {
          bg: "bg-gradient-to-br from-amber-500 to-orange-600",
          icon: <Clock className="h-3.5 w-3.5 text-white" />,
        };
      case "progress":
        return {
          bg: "bg-gradient-to-br from-cyan-500 to-teal-600",
          icon: <Activity className="h-3.5 w-3.5 text-white" />,
        };
      case "new-students":
        return {
          bg: "bg-gradient-to-br from-[#14B8A6] to-[#0E7490]",
          icon: <UserPlus className="h-3.5 w-3.5 text-white" />,
        };
      default:
        return COURSE_PALETTES[0];
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
          <div className="rounded-xl bg-gradient-to-br from-[#0F766E] to-[#0E7490] p-2 shadow-md">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <CardTitle className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-base font-semibold text-transparent">
            Recent Activities
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "px-4 pb-4 pt-1 sm:px-5",
          fillHeight && "flex min-h-0 flex-1 flex-col"
        )}
      >
        {activities.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No recent activity yet. Assigned courses and exam updates will appear here.
          </p>
        ) : (
          <>
            <div
              className={cn(
                "divide-y divide-gray-100",
                fillHeight && "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1",
                listMaxHeightClass
              )}
            >
              {activities.map((activity, index) => {
                const { bg, icon } = getActivityConfig(
                  activity.type,
                  activity.colorIndex ?? index
                );
                return (
                  <div
                    key={activity.id}
                    className="flex min-w-0 items-start gap-2.5 py-2 first:pt-0 last:pb-0"
                  >
                    <div className={cn("mt-0.5 shrink-0 rounded-lg p-1.5 shadow-sm", bg)}>
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {activity.title}
                      </p>
                      <p className="truncate text-xs text-gray-600">{activity.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                      {activity.time}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="group mt-2 w-full justify-between rounded-xl text-sm font-medium text-gray-700 hover:bg-white/50"
              asChild
            >
              <a href={viewAllHref}>
                View All Activities
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
