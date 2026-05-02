import { theme } from "@/config/theme";
import { MetricCardSkeleton } from "@/shared/components/skeleton/MetricCardSkeleton";

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  sublabel: string;
}

function StatCard({ label, value, icon, color, sublabel }: StatCardProps) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="font-bold uppercase tracking-widest"
          style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
        >
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <i className={`fas ${icon} text-xs`} style={{ color }} />
        </div>
      </div>
      <div
        className="font-black leading-none mb-1"
        style={{
          fontSize: theme.typography.sizes.metricLG,
          color: theme.colors.text.primary,
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>{sublabel}</div>
    </div>
  );
}

interface HealthStatCardsProps {
  summary: Record<string, number> | undefined | null;
  isLoading: boolean;
}

export function HealthStatCards({ summary, isLoading }: HealthStatCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const STATS: StatCardProps[] = [
    {
      label: "Avg Sleep",
      value: summary?.sleep ? `${summary.sleep.toFixed(1)}h` : "--",
      icon: "fa-moon",
      color: theme.colors.health.sleep.DEFAULT,
      sublabel: "7-day average",
    },
    {
      label: "Avg Heart Rate",
      value: summary?.heart_rate ? `${summary.heart_rate}` : "--",
      icon: "fa-heart-pulse",
      color: theme.colors.health.danger.DEFAULT,
      sublabel: "bpm average",
    },
    {
      label: "Daily Steps",
      value: summary?.steps
        ? summary.steps > 999
          ? `${(summary.steps / 1000).toFixed(1)}k`
          : String(summary.steps)
        : "--",
      icon: "fa-person-walking",
      color: theme.colors.health.strain.DEFAULT,
      sublabel: "7-day average",
    },
    {
      label: "Avg Stress",
      value: summary?.stress ? `${summary.stress.toFixed(1)}` : "--",
      icon: "fa-brain",
      color: theme.colors.health.warning.DEFAULT,
      sublabel: "out of 10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {STATS.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
