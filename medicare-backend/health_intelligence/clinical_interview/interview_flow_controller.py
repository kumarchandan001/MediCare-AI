class InterviewFlowController:
    def __init__(self):
        self.stages = [
            "initial_intake",
            "symptom_clarification",
            "severity_exploration",
            "context_refinement",
            "risk_assessment",
            "investigation_summary",
            "monitoring_recommendations"
        ]

    def determine_stage(self, completeness: float, is_escalated: bool) -> str:
        if is_escalated:
            return "risk_assessment"
        if completeness < 0.2:
            return "initial_intake"
        elif completeness < 0.5:
            return "symptom_clarification"
        elif completeness < 0.7:
            return "severity_exploration"
        elif completeness < 0.9:
            return "context_refinement"
        else:
            return "investigation_summary"
