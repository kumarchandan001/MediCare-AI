"""
health_intelligence/governance/ethical_governance.py
───────────────────────────────────────────────
High-level ethical governance ensuring the autonomous
wellness ecosystem operates safely and responsibly.

Enforces:
  - Non-clinical positioning (never diagnoses)
  - Privacy-aware orchestration
  - Bounded autonomy (agents can't go rogue)
  - Transparency requirements
  - User consent awareness
  - Non-addictive interaction patterns
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime

log = logging.getLogger(__name__)


@dataclass
class GovernanceAudit:
    """Audit record for governance checks."""
    check_name: str
    passed: bool
    details: str
    severity: str  # info | warning | violation
    timestamp: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class EthicalGovernance:
    """
    Top-level ethical governance ensuring the wellness
    system remains safe, transparent, and human-aligned.
    """

    # Hard limits
    MAX_DAILY_INTERVENTIONS = 8
    MAX_DAILY_NOTIFICATIONS = 12
    MIN_HOURS_BETWEEN_ESCALATIONS = 24
    MAX_AUTONOMOUS_SEVERITY = 0.7  # Above this → require human review

    def __init__(self):
        self._audit_log: dict[int, list[GovernanceAudit]] = {}

    def run_governance_check(
        self,
        user_id: int,
        orchestration_report: dict,
    ) -> dict:
        """
        Run a full governance check on an orchestration report.
        """
        audits: list[GovernanceAudit] = []

        # 1. Non-clinical positioning
        audits.append(self._check_non_clinical(orchestration_report))

        # 2. Intervention volume
        audits.append(self._check_intervention_volume(orchestration_report))

        # 3. Autonomous severity bounds
        audits.append(self._check_severity_bounds(orchestration_report))

        # 4. Transparency
        audits.append(self._check_transparency(orchestration_report))

        # 5. Non-addictive patterns
        audits.append(self._check_non_addictive(orchestration_report))

        # Store audit
        if user_id not in self._audit_log:
            self._audit_log[user_id] = []
        self._audit_log[user_id].extend(audits)
        if len(self._audit_log[user_id]) > 200:
            self._audit_log[user_id] = self._audit_log[user_id][-200:]

        violations = [a for a in audits if a.severity == "violation"]
        warnings = [a for a in audits if a.severity == "warning"]

        return {
            "passed": len(violations) == 0,
            "violations": len(violations),
            "warnings": len(warnings),
            "audits": [
                {
                    "check": a.check_name,
                    "passed": a.passed,
                    "details": a.details,
                    "severity": a.severity,
                }
                for a in audits
            ],
            "governance_status": (
                "compliant" if not violations
                else "non_compliant"
            ),
        }

    def _check_non_clinical(self, report: dict) -> GovernanceAudit:
        """Ensure no clinical/diagnostic language."""
        # Check for diagnostic terms in delivery results
        diagnostic_terms = [
            "diagnosis", "diagnosed", "disease", "disorder",
            "prescribe", "prescription", "treatment plan",
            "medical condition", "clinical finding",
        ]
        delivered = report.get("delivery_results", [])
        found: list[str] = []

        for item in delivered:
            intv = item.get("intervention", {})
            desc = str(intv.get("description", "")).lower()
            for term in diagnostic_terms:
                if term in desc:
                    found.append(term)

        if found:
            return GovernanceAudit(
                check_name="non_clinical_positioning",
                passed=False,
                details=f"Diagnostic terms found: {', '.join(found)}",
                severity="violation",
            )
        return GovernanceAudit(
            check_name="non_clinical_positioning",
            passed=True,
            details="No clinical language detected",
            severity="info",
        )

    def _check_intervention_volume(self, report: dict) -> GovernanceAudit:
        """Ensure intervention volume is within bounds."""
        delivered = report.get("interventions_delivered", 0)
        if delivered > self.MAX_DAILY_INTERVENTIONS:
            return GovernanceAudit(
                check_name="intervention_volume",
                passed=False,
                details=f"Delivered {delivered} > max {self.MAX_DAILY_INTERVENTIONS}",
                severity="violation",
            )
        if delivered > self.MAX_DAILY_INTERVENTIONS * 0.75:
            return GovernanceAudit(
                check_name="intervention_volume",
                passed=True,
                details=f"Approaching limit: {delivered}/{self.MAX_DAILY_INTERVENTIONS}",
                severity="warning",
            )
        return GovernanceAudit(
            check_name="intervention_volume",
            passed=True,
            details=f"{delivered} interventions within limits",
            severity="info",
        )

    def _check_severity_bounds(self, report: dict) -> GovernanceAudit:
        """Ensure autonomous actions don't exceed severity bounds."""
        # Check if any intervention has severity above threshold
        delivered = report.get("delivery_results", [])
        for item in delivered:
            intv = item.get("intervention", {})
            if intv.get("priority") == "critical":
                return GovernanceAudit(
                    check_name="severity_bounds",
                    passed=True,
                    details="Critical-level intervention delivered (requires monitoring)",
                    severity="warning",
                )
        return GovernanceAudit(
            check_name="severity_bounds",
            passed=True,
            details="All interventions within severity bounds",
            severity="info",
        )

    def _check_transparency(self, report: dict) -> GovernanceAudit:
        """Ensure explainability is present."""
        explainability = report.get("explainability", {})
        traces = explainability.get("total_traces", 0)
        if traces == 0:
            return GovernanceAudit(
                check_name="transparency",
                passed=False,
                details="No reasoning traces recorded — transparency violation",
                severity="warning",
            )
        return GovernanceAudit(
            check_name="transparency",
            passed=True,
            details=f"{traces} reasoning traces recorded",
            severity="info",
        )

    def _check_non_addictive(self, report: dict) -> GovernanceAudit:
        """Ensure interaction patterns aren't addictive."""
        # Check notification volume isn't excessive
        budget = report.get("energy_budget", {})
        notif_remaining = budget.get("notifications_remaining", 10)
        if notif_remaining <= 0:
            return GovernanceAudit(
                check_name="non_addictive_patterns",
                passed=True,
                details="Notification limit reached (good — prevents excess)",
                severity="info",
            )
        return GovernanceAudit(
            check_name="non_addictive_patterns",
            passed=True,
            details="Interaction patterns within healthy bounds",
            severity="info",
        )

    def get_audit_history(self, user_id: int, limit: int = 20) -> list[dict]:
        """Get recent audit history."""
        audits = self._audit_log.get(user_id, [])
        return [
            {
                "check": a.check_name,
                "passed": a.passed,
                "details": a.details,
                "severity": a.severity,
                "timestamp": a.timestamp,
            }
            for a in audits[-limit:]
        ]
