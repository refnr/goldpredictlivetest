import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: ReactNode;
  className?: string;
  delay?: number;
}

export function MetricCard({ 
  title, 
  value, 
  subValue, 
  trend, 
  trendValue, 
  icon, 
  className 
}: MetricCardProps) {
  return (
    <div className={cn(
      "glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300",
      className
    )}>
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
        {icon}
      </div>
      
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
      
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-display font-bold text-foreground tracking-tight">
          {value}
        </span>
        {subValue && (
          <span className="text-sm text-muted-foreground">{subValue}</span>
        )}
      </div>

      {trendValue && (
        <div className={cn(
          "mt-4 flex items-center gap-1.5 text-sm font-medium w-fit px-2.5 py-1 rounded-full border",
          trend === "up" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
          trend === "down" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
          "bg-white/5 text-muted-foreground border-white/10"
        )}>
          {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"} {trendValue}
        </div>
      )}
    </div>
  );
}
