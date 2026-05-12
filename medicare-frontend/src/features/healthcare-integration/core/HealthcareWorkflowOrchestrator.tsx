/**
 * HealthcareWorkflowOrchestrator — Coordinates real-world clinical
 * workflows including referral pathways, care coordination, and
 * longitudinal treatment plan management.
 */
import { useCallback, useRef } from "react";

export interface ClinicalWorkflow {
  id: string;
  type: "referral" | "care_plan" | "medication_review" | "lab_order" | "follow_up" | "escalation";
  status: "draft" | "pending" | "active" | "completed" | "cancelled";
  priority: "routine" | "urgent" | "stat";
  participants: { role: string; status: string }[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface WorkflowTemplate {
  type: ClinicalWorkflow["type"];
  steps: { name: string; required: boolean; estimatedDuration: string }[];
  requiredRoles: string[];
  disclaimer: string;
}

export function useHealthcareWorkflowOrchestrator() {
  const workflows = useRef<Map<string, ClinicalWorkflow>>(new Map());

  const createWorkflow = useCallback((type: ClinicalWorkflow["type"], priority: ClinicalWorkflow["priority"] = "routine"): ClinicalWorkflow => {
    const wf: ClinicalWorkflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, type, status: "draft", priority,
      participants: [], createdAt: Date.now(), updatedAt: Date.now(), metadata: {},
    };
    workflows.current.set(wf.id, wf);
    return wf;
  }, []);

  const advanceWorkflow = useCallback((id: string): ClinicalWorkflow | null => {
    const wf = workflows.current.get(id);
    if (!wf) return null;
    const progression: Record<string, ClinicalWorkflow["status"]> = { draft: "pending", pending: "active", active: "completed" };
    wf.status = progression[wf.status] || wf.status;
    wf.updatedAt = Date.now();
    return wf;
  }, []);

  const getTemplates = useCallback((): WorkflowTemplate[] => [
    { type: "referral", steps: [{ name: "Prepare summary", required: true, estimatedDuration: "5 min" }, { name: "Select specialist", required: true, estimatedDuration: "2 min" }, { name: "Submit referral", required: true, estimatedDuration: "1 min" }], requiredRoles: ["patient", "provider"], disclaimer: "Referral workflow preparation — requires healthcare provider completion" },
    { type: "care_plan", steps: [{ name: "Review health data", required: true, estimatedDuration: "10 min" }, { name: "Define goals", required: true, estimatedDuration: "5 min" }, { name: "Assign interventions", required: true, estimatedDuration: "5 min" }], requiredRoles: ["patient", "care_team"], disclaimer: "Care plan templates — clinical validation required before activation" },
    { type: "follow_up", steps: [{ name: "Schedule appointment", required: true, estimatedDuration: "2 min" }, { name: "Prepare health summary", required: false, estimatedDuration: "3 min" }], requiredRoles: ["patient"], disclaimer: "Follow-up scheduling assistance — does not replace clinical scheduling systems" },
  ], []);

  return { createWorkflow, advanceWorkflow, getTemplates, getWorkflows: () => Array.from(workflows.current.values()) };
}
