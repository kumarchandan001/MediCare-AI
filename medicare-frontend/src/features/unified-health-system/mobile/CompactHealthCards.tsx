/**
 * CompactHealthCards — A mobile-optimized grid of health domain cards.
 * Uses progressive disclosure to show only the most critical information
 * until expanded.
 */
import React from "react";
import { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import type { HealthDomain } from "../UnifiedHealthEngine";

export default function CompactHealthCards() {
  const ctx = useUnifiedHealthContext();

  if (!ctx.unifiedState) return null;

  const domains = Array.from(ctx.unifiedState.domainSignals.entries());

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>
          Domain Overview
        </h3>
      </div>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", 
        gap: "12px" 
      }}>
        {domains.map(([domain, signal]) => (
          <DomainCard key={domain} domain={domain} score={signal.score} trend={signal.trend} />
        ))}
      </div>
    </div>
  );
}

function DomainCard({ domain, score, trend }: { domain: HealthDomain, score: number, trend: string }) {
  const isWarning = score < 50;
  
  const getIcon = (d: HealthDomain) => {
    switch (d) {
      case "sleep": return "🌙";
      case "activity": return "🏃";
      case "emotional": return "🧠";
      case "recovery": return "💚";
      case "medication": return "💊";
      case "nutrition": return "🥗";
      case "wearable": return "⌚";
      case "preventive": return "🛡️";
      case "disease_intelligence": return "🔬";
      case "wellness": return "✨";
      case "coaching": return "🗣️";
      default: return "📊";
    }
  };

  const formatDomain = (d: string) => d.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div style={{
      padding: "12px", borderRadius: "12px",
      background: isWarning ? "rgba(255,107,107,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${isWarning ? "rgba(255,107,107,0.2)" : "rgba(255,255,255,0.05)"}`,
      display: "flex", flexDirection: "column", gap: "8px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "16px" }}>{getIcon(domain)}</span>
        <span style={{ 
          fontSize: "12px", 
          color: trend === "improving" ? "#00b894" : trend === "declining" ? "#ff6b6b" : "rgba(255,255,255,0.4)" 
        }}>
          {trend === "improving" ? "↑" : trend === "declining" ? "↓" : "→"}
        </span>
      </div>
      
      <div>
        <div style={{ 
          fontSize: "18px", fontWeight: 700, 
          color: isWarning ? "#ff6b6b" : "rgba(255,255,255,0.9)" 
        }}>
          {score}
        </div>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {formatDomain(domain)}
        </div>
      </div>
    </div>
  );
}
