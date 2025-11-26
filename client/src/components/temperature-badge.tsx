import { Flame, Snowflake, Thermometer, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TemperatureBadgeProps {
  temperature: "cold" | "warm" | "hot" | "fire";
  className?: string;
}

const tempConfig = {
  cold: {
    icon: Snowflake,
    label: "Cold",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  warm: {
    icon: Thermometer,
    label: "Warm",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  hot: {
    icon: TrendingUp,
    label: "Hot",
    className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  fire: {
    icon: Flame,
    label: "On Fire",
    className: "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse",
  },
};

export function TemperatureBadge({ temperature, className }: TemperatureBadgeProps) {
  const config = tempConfig[temperature];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`gap-1.5 ${config.className} ${className || ""}`}
      data-testid={`badge-temperature-${temperature}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
