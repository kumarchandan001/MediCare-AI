/**
 * AnalyzingPhaseOverlay — Cinematic AI reasoning animation
 * Replaces the simple spinner during prediction
 */
import { useEffect, useRef } from "react";
import { useInvestigation } from "../InvestigationStateProvider";

const STAGES = [
  { label: "Evaluating symptom patterns…", duration: 800 },
  { label: "Cross-referencing evidence databases…", duration: 900 },
  { label: "Running differential reasoning…", duration: 1000 },
  { label: "Applying WHO & lifestyle context…", duration: 700 },
  { label: "Safety governance checks…", duration: 600 },
  { label: "Preparing clinical narrative…", duration: 500 },
];

export default function AnalyzingPhaseOverlay() {
  const { analyzingStage, analyzingProgress, setAnalyzingStage, setAnalyzingProgress, phase } = useInvestigation();
  const stageRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "analyzing") return;

    stageRef.current = 0;
    setAnalyzingStage(STAGES[0].label);
    setAnalyzingProgress(0);

    const advanceStage = () => {
      stageRef.current++;
      if (stageRef.current >= STAGES.length) {
        setAnalyzingProgress(100);
        return;
      }
      const pct = Math.round(((stageRef.current) / STAGES.length) * 100);
      setAnalyzingProgress(pct);
      setAnalyzingStage(STAGES[stageRef.current].label);
      timerRef.current = setTimeout(advanceStage, STAGES[stageRef.current].duration);
    };

    timerRef.current = setTimeout(advanceStage, STAGES[0].duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, setAnalyzingStage, setAnalyzingProgress]);

  if (phase !== "analyzing") return null;

  return (
    <div className="ucw-analyzing">
      <div className="ucw-analyzing-orb">
        <i className="fas fa-brain ucw-analyzing-icon" />
      </div>
      <div className="ucw-analyzing-title">Investigating Your Health</div>
      <div className="ucw-analyzing-stage">{analyzingStage}</div>
      <div className="ucw-analyzing-progress">
        <div
          className="ucw-analyzing-progress-bar"
          style={{ width: `${analyzingProgress}%` }}
        />
      </div>
    </div>
  );
}
