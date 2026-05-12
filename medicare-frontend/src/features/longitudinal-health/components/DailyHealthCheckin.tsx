/**
 * DailyHealthCheckin — Adaptive, conversational daily follow-up.
 * Adapts prompts based on prior escalation history, wearable drift,
 * unresolved symptoms, recurrence patterns, and recovery stability.
 * Avoids repetitive generic check-ins.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useTemporalHealth } from "../TemporalHealthStateProvider";
import { useLongitudinalEngine } from "../LongitudinalHealthEngine";

export default function DailyHealthCheckin() {
  const temporal = useTemporalHealth();
  const engine = useLongitudinalEngine();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<"good" | "okay" | "poor">("okay");
  const [energy, setEnergy] = useState(50);
  const [painLevel, setPainLevel] = useState(0);
  const [notes, setNotes] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const prompts = engine.getAdaptiveFollowUpPrompts();
  const alreadyCheckedIn = temporal.todayStatus?.checkinCompleted ?? false;

  const handleSubmit = useCallback(() => {
    engine.processDailyCheckin({
      mood,
      reportedSymptoms: selectedSymptoms,
      energyLevel: energy,
      sleepQuality: 70,
      painLevel,
      notes,
    });
    setSubmitted(true);
    setTimeout(() => {
      setIsOpen(false);
      setSubmitted(false);
      setStep(0);
    }, 2000);
  }, [engine, mood, selectedSymptoms, energy, painLevel, notes]);

  // Common recent symptoms for quick-select
  const recentSymptoms = temporal.dailyStatuses.slice(-7)
    .flatMap(s => s.reportedSymptoms)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const moodOptions = [
    { value: "good" as const, emoji: "😊", label: "Good" },
    { value: "okay" as const, emoji: "😐", label: "Okay" },
    { value: "poor" as const, emoji: "😔", label: "Not great" },
  ];

  if (alreadyCheckedIn && !isOpen) {
    return (
      <div className="lh-checkin-done">
        <i className="fas fa-check-circle" style={{ color: theme.colors.accent.primary, fontSize: "0.6rem" }} />
        <span>Today's check-in complete</span>
      </div>
    );
  }

  return (
    <>
      {/* Trigger button */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="lh-checkin-trigger"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          <i className="fas fa-clipboard-check" style={{ fontSize: "0.65rem" }} />
          <span>Daily Check-in</span>
          <span className="lh-checkin-prompt-preview">{prompts[0]}</span>
        </motion.button>
      )}

      {/* Check-in modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="lh-checkin-card"
          >
            {submitted ? (
              <div className="lh-checkin-success">
                <i className="fas fa-heart-pulse" style={{ fontSize: "1.2rem", color: theme.colors.accent.primary }} />
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", marginTop: 8 }}>
                  Check-in recorded
                </div>
                <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                  Your health profile has been updated
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="lh-checkin-header">
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>
                      {prompts[step] || "How are you today?"}
                    </div>
                    <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                      Quick daily update · {step + 1}/3
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="lh-checkin-close">
                    <i className="fas fa-xmark" />
                  </button>
                </div>

                {/* Step content */}
                <div className="lh-checkin-body">
                  {step === 0 && (
                    <div className="lh-checkin-step">
                      <div className="lh-checkin-mood-row">
                        {moodOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setMood(opt.value)}
                            className={`lh-checkin-mood-btn ${mood === opt.value ? "active" : ""}`}
                          >
                            <span style={{ fontSize: "1.3rem" }}>{opt.emoji}</span>
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                      {/* Energy slider */}
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                          Energy level: {energy}%
                        </div>
                        <input
                          type="range" min={0} max={100} value={energy}
                          onChange={e => setEnergy(Number(e.target.value))}
                          className="lh-checkin-slider"
                        />
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="lh-checkin-step">
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
                        Any symptoms today? {recentSymptoms.length > 0 && "(recently reported)"}
                      </div>
                      <div className="lh-checkin-symptom-chips">
                        {recentSymptoms.map(s => (
                          <button
                            key={s}
                            onClick={() => toggleSymptom(s)}
                            className={`lh-checkin-symptom-chip ${selectedSymptoms.includes(s) ? "active" : ""}`}
                          >
                            {s.replace(/_/g, " ")}
                          </button>
                        ))}
                        {recentSymptoms.length === 0 && (
                          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>
                            No recent symptoms to track
                          </div>
                        )}
                      </div>
                      {/* Pain level */}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                          Pain level: {painLevel}/10
                        </div>
                        <input
                          type="range" min={0} max={10} value={painLevel}
                          onChange={e => setPainLevel(Number(e.target.value))}
                          className="lh-checkin-slider"
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="lh-checkin-step">
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Any additional notes? (optional)"
                        className="lh-checkin-notes"
                        rows={3}
                      />
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="lh-checkin-nav">
                  {step > 0 && (
                    <button onClick={() => setStep(s => s - 1)} className="lh-checkin-nav-btn">
                      Back
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  {step < 2 ? (
                    <button onClick={() => setStep(s => s + 1)} className="lh-checkin-nav-btn lh-checkin-nav-primary">
                      Next
                    </button>
                  ) : (
                    <button onClick={handleSubmit} className="lh-checkin-nav-btn lh-checkin-nav-submit">
                      <i className="fas fa-check" style={{ marginRight: 4 }} />
                      Submit
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
