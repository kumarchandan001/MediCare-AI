/**
 * ScenarioBenchmarkRunner — A React component that visually runs benchmark
 * suites and displays real-time progress and results of the clinical
 * validation checks.
 */
import React, { useState } from "react";
import { useClinicalValidationEngine } from "../engine/ClinicalValidationEngine";
import type { BenchmarkResult } from "./ReasoningBenchmarkFramework";

export default function ScenarioBenchmarkRunner({ 
  suites 
}: { 
  suites: (() => Promise<BenchmarkResult[]>)[] 
}) {
  const { runFullSuite, isRunning, latestResult } = useClinicalValidationEngine();
  const [hasRun, setHasRun] = useState(false);

  const handleRun = async () => {
    setHasRun(true);
    await runFullSuite(suites);
  };

  return (
    <div style={{ padding: "20px", background: "rgba(0,0,0,0.2)", borderRadius: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, color: "#fff" }}>Scenario Benchmark Runner</h3>
        <button 
          onClick={handleRun}
          disabled={isRunning}
          style={{
            padding: "8px 16px", borderRadius: "8px", border: "none",
            background: isRunning ? "#555" : "#0984e3", color: "#fff",
            cursor: isRunning ? "not-allowed" : "pointer", fontWeight: 600
          }}
        >
          {isRunning ? "Running Suite..." : "Run Benchmarks"}
        </button>
      </div>

      {isRunning && (
        <div style={{ color: "#00b894", marginBottom: "20px" }}>
          <span style={{ display: "inline-block", animation: "pulse 1.5s infinite" }}>▶ Executing temporal & contradiction scenarios...</span>
        </div>
      )}

      {hasRun && latestResult && !isRunning && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            <MetricBox label="Overall Consistency" value={`${latestResult.overallConsistencyScore.toFixed(1)}/100`} />
            <MetricBox label="Safety Score" value={`${latestResult.safetyScore.toFixed(1)}/100`} color={latestResult.safetyScore > 90 ? "#00b894" : "#ffcc00"} />
            <MetricBox label="Critical Failures" value={latestResult.criticalFailures.toString()} color={latestResult.criticalFailures === 0 ? "#00b894" : "#ff6b6b"} />
          </div>

          <h4 style={{ color: "rgba(255,255,255,0.7)", marginBottom: "12px" }}>Benchmark Details</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {latestResult.benchmarkResults.map((res, i) => (
              <div key={i} style={{ 
                padding: "12px", borderRadius: "8px", 
                background: "rgba(255,255,255,0.03)",
                borderLeft: `4px solid ${res.passed ? "#00b894" : "#ff6b6b"}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <strong style={{ color: "#fff" }}>{res.scenarioId}</strong>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{res.category}</span>
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{res.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value, color = "#fff" }: { label: string, value: string, color?: string }) {
  return (
    <div style={{ padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", textAlign: "center" }}>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
