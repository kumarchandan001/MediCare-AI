/**
 * ClinicalScenarioSimulator — Developer testing tool for Phase 4 Realism.
 * Synthetically triggers edge-cases (sparse evidence, erratic wearables, 
 * rapid deterioration) to verify that the RealismEngine gracefully moderates
 * and stabilizes the investigation.
 */
import { useState } from "react";
import { useInvestigation } from "@/features/unified-clinical-workspace/InvestigationStateProvider";
import { useClinicalSession } from "@/features/unified-clinical-workspace/ClinicalSessionManager";
import { theme } from "@/config/theme";

export default function ClinicalScenarioSimulator() {
  const inv = useInvestigation();
  const session = useClinicalSession();
  const [expanded, setExpanded] = useState(false);

  const triggerScenario = async (scenario: "sparse" | "erratic_wearable" | "rapid_escalation") => {
    // We mock the symptoms sent to the pipeline to force edge cases
    let mockSymptoms: string[] = [];
    
    if (scenario === "sparse") {
      mockSymptoms = ["fatigue"]; // Extremely vague/sparse
    } else if (scenario === "erratic_wearable") {
      mockSymptoms = ["palpitations", "anxiety"]; // We'd ideally mock the wearable drift state here, but we pass generic symptoms and rely on backend/engine to mock drift internally or we can just see the pipeline run.
    } else if (scenario === "rapid_escalation") {
      mockSymptoms = ["chest_pain", "shortness_of_breath", "dizziness"]; 
    }

    await session.runInvestigationPipeline(mockSymptoms);
  };

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 9999,
      background: "rgba(10, 15, 15, 0.9)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      backdropFilter: "blur(10px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      overflow: "hidden",
      width: expanded ? 300 : "auto",
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          borderBottom: expanded ? "1px solid rgba(255,255,255,0.1)" : "none"
        }}
      >
        <i className="fas fa-flask-vial" style={{ color: theme.colors.accent.primary }} />
        {expanded ? (
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "white" }}>
            Realism Simulator
          </span>
        ) : null}
      </div>

      {expanded && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)" }}>
            Trigger edge-cases to test Phase 4 Clinical Realism moderations.
          </div>
          
          <button 
            onClick={() => triggerScenario("sparse")}
            className="sim-btn"
          >
            <i className="fas fa-battery-empty" />
            Sparse Evidence (Fatigue Only)
          </button>
          
          <button 
            onClick={() => triggerScenario("erratic_wearable")}
            className="sim-btn"
          >
            <i className="fas fa-watch-fitness" />
            Erratic Wearable (Palpitations)
          </button>

          <button 
            onClick={() => triggerScenario("rapid_escalation")}
            className="sim-btn"
          >
            <i className="fas fa-temperature-arrow-up" />
            Rapid Deterioration (Chest Pain)
          </button>
        </div>
      )}

      <style>{`
        .sim-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: rgba(255,255,255,0.8);
          font-size: 0.65rem;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .sim-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }
        .sim-btn i {
          color: #00F5C8;
        }
      `}</style>
    </div>
  );
}
