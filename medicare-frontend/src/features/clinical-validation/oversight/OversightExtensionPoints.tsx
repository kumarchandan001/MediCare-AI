/**
 * OversightExtensionPoints — Defines the hook points where external medical
 * oversight systems (hospital EMR, regulatory APIs, external review boards)
 * can integrate with the MediCare AI validation pipeline.
 */

export interface OversightExtensionPoint {
  id: string;
  name: string;
  type: "pre_escalation" | "post_diagnosis" | "periodic_audit" | "real_time_monitor";
  description: string;
  hookFn: (...args: any[]) => Promise<{ approved: boolean; notes: string }>;
}

export function createOversightExtension(
  config: Omit<OversightExtensionPoint, "hookFn">,
  handler: OversightExtensionPoint["hookFn"]
): OversightExtensionPoint {
  return { ...config, hookFn: handler };
}

// Pre-built extension point templates
export const defaultExtensionPoints: Omit<OversightExtensionPoint, "hookFn">[] = [
  {
    id: "ext-pre-esc-001",
    name: "Pre-Escalation Review Gate",
    type: "pre_escalation",
    description: "Hook invoked before any emergency escalation is shown to the patient. Allows external systems to override or modify the escalation.",
  },
  {
    id: "ext-post-diag-001",
    name: "Post-Diagnosis Audit Log",
    type: "post_diagnosis",
    description: "Hook invoked after the AI finalizes a diagnostic hypothesis. Sends a structured audit record to external compliance systems.",
  },
  {
    id: "ext-periodic-001",
    name: "Weekly Compliance Check",
    type: "periodic_audit",
    description: "Hook invoked weekly to export validation metrics to regulatory dashboards.",
  },
  {
    id: "ext-rt-001",
    name: "Real-Time Safety Monitor",
    type: "real_time_monitor",
    description: "Hook that streams all safety-relevant events to an external monitoring service in real time.",
  },
];
