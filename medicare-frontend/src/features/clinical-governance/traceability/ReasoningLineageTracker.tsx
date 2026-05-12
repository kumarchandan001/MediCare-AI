/**
 * ReasoningLineageTracker — Tracks the full chain of reasoning:
 * symptom input → hypothesis generation → confidence moderation →
 * governance → final output. Each link is traceable to a specific engine.
 */
import { useCallback, useRef } from "react";

export interface LineageNode {
  id: string;
  timestamp: number;
  stage: "input" | "hypothesis" | "realism" | "governance" | "output";
  engine: string;
  action: string;
  inputState: { conditions: string[]; confidences: number[]; escalation: string };
  outputState: { conditions: string[]; confidences: number[]; escalation: string };
  modifications: string[];
  parentId?: string;
}

export interface ReasoningLineage {
  investigationId: string;
  nodes: LineageNode[];
  depth: number;
  totalModifications: number;
  narrative: string;
}

export function useReasoningLineageTracker() {
  const lineagesRef = useRef<Map<string, LineageNode[]>>(new Map());

  const startLineage = useCallback((investigationId: string, symptoms: string[]) => {
    const rootNode: LineageNode = {
      id: `ln-${Date.now()}-root`,
      timestamp: Date.now(),
      stage: "input",
      engine: "SymptomInput",
      action: "Symptoms collected",
      inputState: { conditions: [], confidences: [], escalation: "none" },
      outputState: { conditions: symptoms, confidences: [], escalation: "none" },
      modifications: [`${symptoms.length} symptoms recorded`],
    };
    lineagesRef.current.set(investigationId, [rootNode]);
    return rootNode;
  }, []);

  const addNode = useCallback((investigationId: string, node: Omit<LineageNode, "id" | "timestamp">): LineageNode => {
    const full: LineageNode = {
      ...node,
      id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: Date.now(),
    };
    const existing = lineagesRef.current.get(investigationId) || [];
    existing.push(full);
    lineagesRef.current.set(investigationId, existing);
    return full;
  }, []);

  const getLineage = useCallback((investigationId: string): ReasoningLineage | null => {
    const nodes = lineagesRef.current.get(investigationId);
    if (!nodes || nodes.length === 0) return null;

    const totalMods = nodes.reduce((sum, n) => sum + n.modifications.length, 0);

    const stageLabels: Record<string, string> = {
      input: "Symptom collection",
      hypothesis: "Hypothesis generation",
      realism: "Clinical realism validation",
      governance: "Governance review",
      output: "Final output",
    };

    const narrative = nodes
      .map(n => `${stageLabels[n.stage] || n.stage}: ${n.action}${n.modifications.length > 0 ? ` (${n.modifications.length} modification${n.modifications.length > 1 ? "s" : ""})` : ""}`)
      .join(" → ");

    return {
      investigationId,
      nodes: [...nodes],
      depth: nodes.length,
      totalModifications: totalMods,
      narrative,
    };
  }, []);

  const getModificationSummary = useCallback((investigationId: string): string[] => {
    const nodes = lineagesRef.current.get(investigationId) || [];
    return nodes.flatMap(n => n.modifications);
  }, []);

  return { startLineage, addNode, getLineage, getModificationSummary };
}
