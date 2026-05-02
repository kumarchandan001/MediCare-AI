import { motion } from "framer-motion";
import { theme } from "@/config/theme";

const HOSPITALS = [
  {
    name: "Jain Global Campus",
    type: "Campus Health Centre",
    location: "Himalaya Hostel Block, Bengaluru",
    timing: "10:00 AM — 5:00 PM",
    days: "Monday to Saturday",
    mapUrl:
      "https://maps.google.com/maps?q=Jain+Global+Campus+Bengaluru",
    color: theme.colors.health.recovery.DEFAULT,
    icon: "fa-hospital-user",
    openStart: 10,
    openEnd: 17,
  },
  {
    name: "Dayananda Sagar Hospital",
    type: "Multi-Specialty Hospital",
    location: "Shavige Malleshwara Hills, Bengaluru",
    timing: "8:00 AM — 8:00 PM",
    days: "Monday to Sunday",
    mapUrl:
      "https://maps.google.com/maps?q=Dayananda+Sagar+Hospital+Bengaluru",
    color: theme.colors.health.strain.DEFAULT,
    icon: "fa-hospital",
    openStart: 8,
    openEnd: 20,
  },
];

function isOpen(start: number, end: number): boolean {
  const h = new Date().getHours();
  return h >= start && h < end;
}

export function ConsultSection() {
  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: theme.colors.health.recovery.bg,
            border: `1px solid ${theme.colors.health.recovery.border}`,
          }}
        >
          <i
            className="fas fa-user-doctor"
            style={{ color: theme.colors.health.recovery.DEFAULT }}
          />
        </div>
        <div>
          <h3
            className="font-black tracking-tight"
            style={{
              fontSize: theme.typography.sizes.h3,
              color: theme.colors.text.primary,
            }}
          >
            Consult a Doctor
          </h3>
          <p
            style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.subtle,
            }}
          >
            AI predictions are not a substitute for professional diagnosis
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl mb-4"
        style={{
          background: theme.colors.health.warning.bg,
          border: `1px solid ${theme.colors.health.warning.border}`,
          borderLeft: `4px solid ${theme.colors.health.warning.DEFAULT}`,
        }}
      >
        <i
          className="fas fa-triangle-exclamation flex-shrink-0 mt-0.5"
          style={{ color: theme.colors.health.warning.DEFAULT }}
        />
        <p
          style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.text.muted,
            lineHeight: 1.6,
          }}
        >
          Always consult a qualified healthcare professional for proper
          diagnosis and treatment. This AI prediction is for
          informational purposes only.
        </p>
      </div>

      {/* Hospital cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {HOSPITALS.map((h, i) => {
          const open = isOpen(h.openStart, h.openEnd);
          return (
            <motion.div
              key={h.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl overflow-hidden"
              style={{
                background: theme.colors.surface[3],
                border: `1px solid ${theme.colors.border[1]}`,
              }}
            >
              {/* Colored header */}
              <div
                className="p-4 flex items-center justify-between"
                style={{
                  background: `${h.color}12`,
                  borderBottom: `1px solid ${h.color}20`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${h.color}20` }}
                >
                  <i
                    className={`fas ${h.icon}`}
                    style={{ color: h.color }}
                  />
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full font-bold uppercase tracking-wider"
                  style={{
                    fontSize: "0.6rem",
                    background: open
                      ? theme.colors.health.recovery.bg
                      : theme.colors.surface[4],
                    color: open
                      ? theme.colors.health.recovery.DEFAULT
                      : theme.colors.text.subtle,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: open
                        ? theme.colors.health.recovery.DEFAULT
                        : theme.colors.text.subtle,
                      animation: open
                        ? "pulse-dot 2s infinite"
                        : "none",
                    }}
                  />
                  {open ? "Open Now" : "Closed"}
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <span
                  className="inline-block px-2 py-0.5 rounded-full font-bold uppercase tracking-wider mb-2"
                  style={{
                    fontSize: "0.6rem",
                    background: theme.colors.accent.subtle,
                    color: theme.colors.accent.primary,
                  }}
                >
                  {h.type}
                </span>
                <h4
                  className="font-bold mb-2"
                  style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.text.primary,
                  }}
                >
                  {h.name}
                </h4>
                <p
                  className="flex items-start gap-1.5 mb-3"
                  style={{
                    fontSize: theme.typography.sizes.xs,
                    color: theme.colors.text.subtle,
                  }}
                >
                  <i
                    className="fas fa-location-dot flex-shrink-0 mt-0.5"
                    style={{ color: theme.colors.accent.primary }}
                  />
                  {h.location}
                </p>

                {/* Info rows */}
                {[
                  {
                    icon: "fa-clock",
                    label: "Timings",
                    value: h.timing,
                    color: theme.colors.accent.primary,
                  },
                  {
                    icon: "fa-calendar-days",
                    label: "Days",
                    value: h.days,
                    color: theme.colors.health.recovery.DEFAULT,
                  },
                ].map((info) => (
                  <div
                    key={info.label}
                    className="flex items-center gap-3 mb-2"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <i
                        className={`fas ${info.icon} text-xs`}
                        style={{ color: info.color }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.6rem",
                          color: theme.colors.text.subtle,
                        }}
                      >
                        {info.label}
                      </div>
                      <div
                        className="font-semibold"
                        style={{
                          fontSize: theme.typography.sizes.xs,
                          color: theme.colors.text.muted,
                        }}
                      >
                        {info.value}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Directions button */}
                <a
                  href={h.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl font-semibold transition-all hover:opacity-80"
                  style={{
                    background: `${h.color}15`,
                    border: `1px solid ${h.color}25`,
                    color: h.color,
                    fontSize: theme.typography.sizes.xs,
                    textDecoration: "none",
                    display: "flex",
                  }}
                >
                  <i className="fas fa-map-location-dot" />
                  Get Directions
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Emergency bar */}
      <div
        className="flex items-center justify-between p-4 rounded-xl flex-wrap gap-4"
        style={{
          background: theme.colors.surface[3],
          border: `1px solid ${theme.colors.border[1]}`,
        }}
      >
        <div className="flex items-center gap-3">
          <i
            className="fas fa-triangle-exclamation text-xl"
            style={{ color: theme.colors.health.warning.DEFAULT }}
          />
          <div>
            <div
              className="font-bold"
              style={{
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.text.primary,
              }}
            >
              Medical Emergency?
            </div>
            <div
              style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.subtle,
              }}
            >
              Call immediately — don't wait
            </div>
          </div>
        </div>

        {/* Emergency numbers */}
        <div className="flex gap-3">
          {[
            {
              num: "112",
              label: "Emergency",
              color: theme.colors.health.danger.DEFAULT,
              href: "tel:112",
            },
            {
              num: "108",
              label: "Ambulance",
              color: "#FF6D00",
              href: "tel:108",
            },
            {
              num: "104",
              label: "Health",
              color: theme.colors.accent.primary,
              href: "tel:104",
            },
          ].map((em) => (
            <a
              key={em.num}
              href={em.href}
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl font-black transition-all hover:scale-105"
              style={{
                background: `${em.color}15`,
                border: `1px solid ${em.color}25`,
                color: em.color,
                fontSize: "1.1rem",
                textDecoration: "none",
                minWidth: "70px",
                textAlign: "center",
              }}
            >
              {em.num}
              <span
                style={{
                  fontSize: "0.55rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  opacity: 0.75,
                }}
              >
                {em.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
