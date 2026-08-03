import { clsx } from "clsx";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  iconColor = "text-gold-500",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-silver p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-stone uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-obsidian mt-1">{value}</p>
        </div>
        <div className={clsx("p-2.5 rounded-lg bg-pearl", iconColor)}>
          <Icon size={18} />
        </div>
      </div>

      {change && trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={clsx(
              "flex items-center gap-1 text-xs font-medium",
              trend === "up" ? "text-success" : "text-danger"
            )}
          >
            {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change}
          </span>
          <span className="text-[11px] text-stone">vs last month</span>
        </div>
      )}
    </div>
  );
}
