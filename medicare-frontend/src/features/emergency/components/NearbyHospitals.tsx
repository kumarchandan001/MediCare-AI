import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import { NEARBY_HOSPITALS } from "../types/emergency.types";

const H_COLORS: Record<string, string> = {
  recovery: theme.colors.health.recovery.DEFAULT,
  strain: theme.colors.health.strain.DEFAULT,
  warning: theme.colors.health.warning.DEFAULT,
  accent: theme.colors.accent.primary,
};

function isOpen(start: number, end: number): boolean {
  const h = new Date().getHours();
  if (end === 24) return true;
  return h >= start && h < end;
}

export function NearbyHospitals() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.health.strain.DEFAULT }} />
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
          >
            Nearby Hospitals
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {NEARBY_HOSPITALS.map((h, i) => {
          const open = isOpen(h.openStart, h.openEnd);
          const color = H_COLORS[h.color] || theme.colors.accent.primary;

          return (
            <motion.div
              key={h.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl overflow-hidden"
              style={{ background: theme.colors.surface[3], border: `1px solid ${theme.colors.border[1]}` }}
            >
              {/* Hospital header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: `${color}08`, borderBottom: `1px solid ${color}15` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}20` }}
                  >
                    <i className={`fas ${h.icon} text-sm`} style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold truncate" style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary }}>
                      {h.name}
                    </div>
                    <div style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
                      {h.type}
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
                  style={{
                    fontSize: "0.6rem",
                    background: open ? theme.colors.health.recovery.bg : theme.colors.surface[4],
                    color: open ? theme.colors.health.recovery.DEFAULT : theme.colors.text.subtle,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: open ? theme.colors.health.recovery.DEFAULT : theme.colors.text.subtle,
                      animation: open ? "pulse-dot 2s infinite" : "none",
                    }}
                  />
                  {open ? "Open" : "Closed"}
                </div>
              </div>

              {/* Hospital body */}
              <div className="px-4 py-3">
                <div className="flex items-start gap-2 mb-2">
                  <i className="fas fa-location-dot text-xs mt-0.5 flex-shrink-0" style={{ color }} />
                  <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted, lineHeight: 1.4 }}>
                    {h.address}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <i className="fas fa-clock text-xs" style={{ color }} />
                    <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted }}>{h.timing}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <i className="fas fa-calendar text-xs" style={{ color }} />
                    <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.muted }}>{h.days}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${h.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-semibold transition-all active:scale-95"
                    style={{
                      background: `${color}12`, border: `1px solid ${color}25`, color,
                      fontSize: theme.typography.sizes.xs, fontFamily: theme.typography.fonts.primary,
                      textDecoration: "none", minHeight: "40px",
                    }}
                  >
                    <i className="fas fa-phone text-xs" /> Call
                  </a>
                  <a
                    href={h.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-semibold transition-all active:scale-95"
                    style={{
                      background: theme.colors.surface[4], border: `1px solid ${theme.colors.border[2]}`,
                      color: theme.colors.text.muted, fontSize: theme.typography.sizes.xs,
                      fontFamily: theme.typography.fonts.primary, textDecoration: "none", minHeight: "40px",
                    }}
                  >
                    <i className="fas fa-map-location-dot text-xs" /> Directions
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
