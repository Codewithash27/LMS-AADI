import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type StatCardProps = {
  title: string;
  value: string | number;
  change?: {
    value: string | number;
    positive: boolean;
  };
  icon: React.ReactNode;
  iconColor: 'primary' | 'accent' | 'secondary';
  delay?: number;
};

export default function StatCard({ title, value, change, icon, iconColor, delay = 0 }: StatCardProps) {
  const gradientColors = {
    primary: 'from-brand-turquoise/10 to-brand-blue/10',
    accent: 'from-brand-mint/10 to-brand-turquoise/10',
    secondary: 'from-brand-blue/10 to-brand-coral/10',
  };

  const iconGradients = {
    primary: 'bg-accent-brand',
    accent: 'bg-gradient-to-br from-brand-mint to-brand-turquoise',
    secondary: 'bg-gradient-to-br from-brand-blue to-brand-coral',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="w-full relative overflow-hidden group hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300 hover:scale-[1.02]">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          gradientColors[iconColor]
        )} />

        <CardContent className="p-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-neutral-600 text-sm font-medium">{title}</p>
              <motion.h3
                className="text-3xl font-bold text-foreground"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: delay + 0.2 }}
              >
                {value}
              </motion.h3>
              {change && (
                <motion.p
                  className="text-xs flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: delay + 0.4 }}
                >
                  <span className={cn(
                    "font-semibold px-2 py-1 rounded-lg",
                    change.positive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  )}>
                    {change.positive ? '↗' : '↘'} {change.value}
                  </span>
                  <span className="text-neutral-500">from last month</span>
                </motion.p>
              )}
            </div>
            <motion.div
              className={cn(
                "p-3 rounded-2xl shadow-lg text-white",
                iconGradients[iconColor]
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: delay + 0.1 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <div className="text-white h-6 w-6">
                {icon}
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
