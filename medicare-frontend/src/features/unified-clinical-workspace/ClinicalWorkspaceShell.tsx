/**
 * ClinicalWorkspaceShell — Responsive, immersive layout shell.
 * Now mounts the LongitudinalReasoningOrchestrator instead of the
 * simple InvestigationOrchestrator, enabling idle-state intelligence.
 */
import { useEffect, useState } from "react";
import LongitudinalReasoningOrchestrator from "@/features/longitudinal-health/LongitudinalReasoningOrchestrator";
import "@/features/unified-clinical-workspace/unified-workspace.css";

export default function ClinicalWorkspaceShell() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="ucw-shell" data-mobile={isMobile}>
      <LongitudinalReasoningOrchestrator />
    </div>
  );
}
