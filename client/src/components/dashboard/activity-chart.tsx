import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

type ActivityData = {
  day: string;
  percentage: number;
  count?: number;
  isCurrentDay?: boolean;
};

type Timeframe = "weekly" | "monthly" | "yearly";

type ActivityChartProps = {
  data: ActivityData[];
  changePercentage: string;
  isPositiveChange: boolean;
  className?: string;
  /** Controlled timeframe — when set with onTimeframeChange, parent owns the series */
  timeframe?: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
  emptyMessage?: string;
};

export default function ActivityChart({
  data,
  changePercentage,
  isPositiveChange,
  className,
  timeframe: controlledTimeframe,
  onTimeframeChange,
  emptyMessage = "No activity yet for this period.",
}: ActivityChartProps) {
  const [internalTimeframe, setInternalTimeframe] = useState<Timeframe>("weekly");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const timeframe = controlledTimeframe ?? internalTimeframe;
  const setTimeframe = (tf: Timeframe) => {
    onTimeframeChange?.(tf);
    if (controlledTimeframe === undefined) setInternalTimeframe(tf);
  };

  const hasBars = data.some((d) => (d.count ?? d.percentage) > 0);

  return (
    <Card className={cn("flex h-full flex-col border border-white/20 bg-white/70 shadow-xl backdrop-blur-sm", className)}>
      <CardHeader className="shrink-0 px-4 pb-0 pt-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-gradient-to-br from-[#0F766E] to-[#0E7490] p-2 text-white shadow-md">
              <Activity className="h-4 w-4" />
            </div>
            <CardTitle className="bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text font-heading text-base font-semibold text-transparent">
              Student Activity
            </CardTitle>
          </div>
          <div className="flex space-x-1 rounded-lg border border-white/20 bg-white/50 p-1">
            {(["weekly", "monthly", "yearly"] as const).map((time) => (
              <Button
                key={time}
                variant={timeframe === time ? "default" : "ghost"}
                onClick={() => setTimeframe(time)}
                size="sm"
                className={cn(
                  "h-7 rounded-md px-2 text-xs transition-all duration-200",
                  timeframe === time
                    ? "bg-accent-brand text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {time.charAt(0).toUpperCase() + time.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-5">
        {!hasBars ? (
          <div className="flex min-h-[140px] flex-1 items-center justify-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="relative flex min-h-[140px] flex-1 items-end space-x-2 sm:space-x-3">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[0, 25, 50, 75, 100].map((line) => (
                <div key={line} className="border-t border-gray-200/40" />
              ))}
            </div>

            {data.map((item, index) => {
              const barPct = Math.max(item.percentage || 0, item.count ? 8 : 0);
              return (
                <div key={`${item.day}-${index}`} className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                  <div className="flex w-full flex-1 items-end justify-center pb-1">
                    <motion.div
                      className={cn(
                        "relative w-full max-w-[24px] cursor-pointer overflow-hidden rounded-t-md",
                        item.isCurrentDay
                          ? "bg-accent-brand shadow-md"
                          : "bg-gradient-to-t from-[#0F766E] to-[#0E7490]"
                      )}
                      style={{ height: `${barPct}%` }}
                      initial={{ height: 0 }}
                      animate={{ height: `${barPct}%` }}
                      transition={{ duration: 0.6, delay: index * 0.05 }}
                      onHoverStart={() => setHoveredIndex(index)}
                      onHoverEnd={() => setHoveredIndex(null)}
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                      {hoveredIndex === index && (
                        <motion.div
                          className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs font-medium text-white"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {item.count != null
                            ? `${item.count} events`
                            : `${item.percentage}% activity`}
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-[10px] font-medium",
                      item.isCurrentDay ? "font-semibold text-blue-600" : "text-gray-500"
                    )}
                  >
                    {item.day}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex shrink-0 items-center justify-between border-t border-gray-200/50 pt-2.5">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {timeframe === "weekly"
                ? "This week"
                : timeframe === "monthly"
                  ? "Recent weeks"
                  : "Last 6 months"}
            </p>
            <p className="text-[11px] text-gray-500">vs previous period</p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold",
              isPositiveChange ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}
          >
            {isPositiveChange ? "↗" : "↘"} {changePercentage}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
