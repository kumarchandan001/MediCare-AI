import { theme } from "@/config/theme";
import type { HealthContextSummary } from "../types/chat.types";

interface HealthSnapshotProps {
  context: HealthContextSummary | undefined;
  isLoading: boolean;
}

interface MetricRowProps {
  icon: string;
  label: string;
  value: string;
  color: string;
  alert?: boolean;
}

function MetricRow({ icon, label, value, color, alert }: MetricRowProps) {
  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: `${color}15`,
          border: `1px solid ${color}25`,
        }}
      >
        <i className={`fas ${icon} text-xs`} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-bold uppercase tracking-widest"
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: theme.colors.text.subtle,
          }}
        >
          {label}
        </div>
        <div
          className="font-semibold"
          style={{
            fontSize: theme.typography.sizes.sm,
            color: alert
              ? theme.colors.health.warning.DEFAULT
              : theme.colors.text.primary,
          }}
        >
          {value}
        </div>
      </div>
      {alert && (
        <i
          className="fas fa-circle-exclamation text-xs flex-shrink-0"
          style={{ color: theme.colors.health.warning.DEFAULT }}
        />
      )}
    </div>
  );
}

export function HealthSnapshotPanel({
  context,
  isLoading,
}: HealthSnapshotProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-12 rounded-xl animate-pulse"
            style={{ background: theme.colors.surface[3] }}
          />
        ))}
      </div>
    );
  }

  if (!context) return null;

  const riskColor =
    context.risk_level === "Critical"
      ? theme.colors.health.danger.DEFAULT
      : context.risk_level === "High"
        ? "#FF6D00"
        : context.risk_level === "Moderate"
          ? theme.colors.health.warning.DEFAULT
          : theme.colors.health.recovery.DEFAULT;

  return (
    <div>
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: theme.colors.accent.primary }}
          />
          <span
            className="font-bold uppercase tracking-widest"
            style={{
              fontSize: theme.typography.sizes.xxs,
              color: theme.colors.text.subtle,
            }}
          >
            Health Context
          </span>
        </div>
        <p
          className="mt-1"
          style={{ fontSize: "0.6rem", color: theme.colors.text.subtle }}
        >
          Karuna uses this to personalize responses
        </p>
      </div>

      <div className="px-5">
        {!context.has_data ? (
          <div
            className="text-center py-8"
            style={{
              color: theme.colors.text.subtle,
              fontSize: theme.typography.sizes.xs,
            }}
          >
            <i
              className="fas fa-database text-2xl mb-3 block"
              style={{ opacity: 0.3 }}
            />
            No health data logged yet. Log vitals to get personalized AI
            responses.
          </div>
        ) : (
          <>
            {context.latest_sleep !== undefined &&
              context.latest_sleep !== null && (
                <MetricRow
                  icon="fa-moon"
                  label="Sleep"
                  value={`${context.latest_sleep.toFixed(1)}h`}
                  color={theme.colors.health.sleep.DEFAULT}
                  alert={context.latest_sleep < 6}
                />
              )}
            {context.latest_heart_rate != null && (
              <MetricRow
                icon="fa-heart-pulse"
                label="Heart Rate"
                value={`${context.latest_heart_rate} bpm`}
                color={theme.colors.health.danger.DEFAULT}
                alert={
                  context.latest_heart_rate > 100 ||
                  context.latest_heart_rate < 50
                }
              />
            )}
            {context.latest_oxygen != null && (
              <MetricRow
                icon="fa-lungs"
                label="SpO2"
                value={`${context.latest_oxygen.toFixed(1)}%`}
                color={theme.colors.health.strain.DEFAULT}
                alert={context.latest_oxygen < 95}
              />
            )}
            {context.latest_stress !== undefined &&
              context.latest_stress !== null && (
                <MetricRow
                  icon="fa-brain"
                  label="Stress"
                  value={`${context.latest_stress.toFixed(0)}/10`}
                  color={theme.colors.health.warning.DEFAULT}
                  alert={context.latest_stress >= 7}
                />
              )}
            {context.latest_steps != null && (
              <MetricRow
                icon="fa-person-walking"
                label="Steps"
                value={`${context.latest_steps.toLocaleString()}`}
                color={theme.colors.accent.primary}
                alert={context.latest_steps < 5000}
              />
            )}
            {context.latest_bmi != null && (
              <MetricRow
                icon="fa-weight-scale"
                label="BMI"
                value={`${context.latest_bmi.toFixed(1)} · ${context.bmi_category}`}
                color={theme.colors.health.recovery.DEFAULT}
              />
            )}
          </>
        )}

        {/* Risk level */}
        {context.risk_level && (
          <div
            className="mt-4 p-3 rounded-xl flex items-center gap-3"
            style={{
              background: `${riskColor}10`,
              border: `1px solid ${riskColor}20`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: riskColor }}
            />
            <div>
              <div
                className="font-bold uppercase tracking-wider"
                style={{
                  fontSize: "0.6rem",
                  color: theme.colors.text.subtle,
                }}
              >
                Health Risk
              </div>
              <div
                className="font-black"
                style={{
                  fontSize: theme.typography.sizes.sm,
                  color: riskColor,
                }}
              >
                {context.risk_level}{" "}
                <span
                  style={{
                    fontSize: theme.typography.sizes.xs,
                    color: theme.colors.text.subtle,
                    fontWeight: 400,
                  }}
                >
                  ({context.risk_score?.toFixed(0)}/100)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Last prediction */}
        {context.last_prediction && (
          <div
            className="mt-3 p-3 rounded-xl"
            style={{
              background: theme.colors.accent.subtle,
              border: `1px solid ${theme.colors.accent.border}`,
            }}
          >
            <div
              className="font-bold uppercase tracking-wider mb-1"
              style={{
                fontSize: "0.6rem",
                color: theme.colors.text.subtle,
              }}
            >
              Last AI Prediction
            </div>
            <div
              className="font-semibold"
              style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.accent.primary,
              }}
            >
              {context.last_prediction}
            </div>
            {context.prediction_confidence != null && (
              <div
                style={{
                  fontSize: "0.6rem",
                  color: theme.colors.text.subtle,
                }}
              >
                {context.prediction_confidence.toFixed(1)}% confidence
              </div>
            )}
          </div>
        )}

        {/* Medications */}
        {context.medications.length > 0 && (
          <div className="mt-3 pb-4">
            <div
              className="font-bold uppercase tracking-wider mb-2"
              style={{
                fontSize: "0.6rem",
                color: theme.colors.text.subtle,
              }}
            >
              Active Medications
            </div>
            <div className="flex flex-wrap gap-1.5">
              {context.medications.map((med) => (
                <span
                  key={med}
                  className="px-2 py-0.5 rounded-full font-medium"
                  style={{
                    fontSize: "0.6rem",
                    background: theme.colors.surface[4],
                    color: theme.colors.text.muted,
                    border: `1px solid ${theme.colors.border[2]}`,
                  }}
                >
                  {med}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
