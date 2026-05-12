/**
 * HolisticHealthTimeline — A visual component that renders the unified
 * health narrative alongside specific milestones and interventions from
 * the user's history.
 */
import React from "react";
import { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import { useUnifiedHealthNarrator } from "./UnifiedHealthNarrator";

export default function HolisticHealthTimeline() {
  const ctx = useUnifiedHealthContext();
  const narrator = useUnifiedHealthNarrator();

  if (!ctx.unifiedState) return null;

  const narrative = narrator.generateNarrative(
    ctx.unifiedState.domainSignals,
    [] // We'd pass recent memory here ideally
  );

  return (
    <div style={{
      padding: "24px", borderRadius: "16px",
      background: "linear-gradient(180deg, rgba(26,26,46,0.9) 0%, rgba(26,26,46,0.95) 100%)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <h2 style={{ margin: "0 0 20px", color: "#fff", fontSize: "18px" }}>
        📖 Your Health Story
      </h2>

      {/* Primary Story */}
      <div style={{
        padding: "20px", borderRadius: "12px", marginBottom: "20px",
        background: "rgba(255,255,255,0.03)",
        borderLeft: `4px solid ${
          narrative.primaryStory.emotionalTone === "celebratory" ? "#00b894" :
          narrative.primaryStory.emotionalTone === "cautious" ? "#fdcb6e" :
          narrative.primaryStory.emotionalTone === "encouraging" ? "#a29bfe" : "#0984e3"
        }`
      }}>
        <h3 style={{ margin: "0 0 8px", color: "#fff", fontSize: "16px" }}>
          {narrative.primaryStory.title}
        </h3>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "14px", lineHeight: 1.6 }}>
          {narrative.primaryStory.content}
        </p>
      </div>

      {/* Supporting Stories */}
      {narrative.supportingStories.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.5)", fontSize: "12px", textTransform: "uppercase" }}>
            Also in focus
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {narrative.supportingStories.map((story, i) => (
              <div key={i} style={{
                padding: "12px 16px", borderRadius: "8px",
                background: "rgba(255,255,255,0.02)",
                display: "flex", gap: "12px", alignItems: "flex-start"
              }}>
                <span style={{ fontSize: "16px" }}>
                  {story.type === "preventive" ? "🛡️" : story.type === "recovery" ? "💚" : "✨"}
                </span>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.5 }}>
                  {story.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Closing */}
      <div style={{
        textAlign: "center", padding: "16px", borderRadius: "8px",
        background: "rgba(0,184,148,0.1)", color: "#00b894",
        fontSize: "14px", fontWeight: 500
      }}>
        💡 {narrative.actionableClosing}
      </div>
    </div>
  );
}
