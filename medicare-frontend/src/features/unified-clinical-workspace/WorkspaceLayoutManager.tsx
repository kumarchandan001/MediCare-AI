/**
 * WorkspaceLayoutManager — Hook managing UI panel states and progressive disclosure.
 * Controls which panels are expanded, mobile tab navigation, and focus mode.
 */
import { useState, useCallback, useMemo } from "react";

export type MobileTab = "conversation" | "reasoning" | "evidence" | "timeline" | "story";

interface LayoutState {
  // Panel expansion states
  differentialExpanded: boolean;
  evidenceExpanded: boolean;
  uncertaintyExpanded: boolean;
  contradictionExpanded: boolean;
  timelineExpanded: boolean;
  storyExpanded: boolean;
  trustExpanded: boolean;
  // Mobile
  activeMobileTab: MobileTab;
  isMobile: boolean;
}

export function useWorkspaceLayout() {
  const [differentialExpanded, setDifferentialExpanded] = useState(true);
  const [evidenceExpanded, setEvidenceExpanded] = useState(true);
  const [uncertaintyExpanded, setUncertaintyExpanded] = useState(false);
  const [contradictionExpanded, setContradictionExpanded] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(true);
  const [trustExpanded, setTrustExpanded] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("conversation");

  // Detect mobile via state (simpler than media query listener)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // Toggle helpers
  const togglePanel = useCallback((panel: string) => {
    switch (panel) {
      case "differential": setDifferentialExpanded(p => !p); break;
      case "evidence": setEvidenceExpanded(p => !p); break;
      case "uncertainty": setUncertaintyExpanded(p => !p); break;
      case "contradiction": setContradictionExpanded(p => !p); break;
      case "timeline": setTimelineExpanded(p => !p); break;
      case "story": setStoryExpanded(p => !p); break;
      case "trust": setTrustExpanded(p => !p); break;
    }
  }, []);

  // Focus mode: expand only the priority panel, collapse others
  const applyFocusMode = useCallback((priority: string) => {
    setDifferentialExpanded(priority === "reasoning");
    setEvidenceExpanded(priority === "evidence");
    setStoryExpanded(priority === "storytelling");
    setTimelineExpanded(priority === "monitoring");
    setUncertaintyExpanded(false);
    setContradictionExpanded(false);
    setTrustExpanded(false);
  }, []);

  // Expand all (for desktop users who want everything)
  const expandAll = useCallback(() => {
    setDifferentialExpanded(true);
    setEvidenceExpanded(true);
    setUncertaintyExpanded(true);
    setContradictionExpanded(true);
    setTimelineExpanded(true);
    setStoryExpanded(true);
    setTrustExpanded(true);
  }, []);

  // Collapse all
  const collapseAll = useCallback(() => {
    setDifferentialExpanded(false);
    setEvidenceExpanded(false);
    setUncertaintyExpanded(false);
    setContradictionExpanded(false);
    setTimelineExpanded(false);
    setStoryExpanded(false);
    setTrustExpanded(false);
  }, []);

  return {
    differentialExpanded, evidenceExpanded, uncertaintyExpanded,
    contradictionExpanded, timelineExpanded, storyExpanded, trustExpanded,
    togglePanel, applyFocusMode, expandAll, collapseAll,
    activeMobileTab, setActiveMobileTab,
    isMobile, setIsMobile,
  };
}
