"""
health_intelligence/intervention/intervention_sequencer.py
───────────────────────────────────────────────
Multi-step intervention sequencing — builds staged,
progressive recovery and habit improvement plans.

Supports:
  - Staged recovery plans (easy → moderate → full)
  - Progressive habit improvement
  - Escalation / de-escalation logic
  - Intervention dependencies
  - Adaptive recovery pathways

Avoids isolated one-time recommendations.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class InterventionStep:
    """A single step in a multi-step plan."""
    step_number: int
    action: str
    category: str
    description: str
    duration_minutes: int
    difficulty: str          # easy | moderate | advanced
    depends_on: Optional[int] = None   # step_number dependency
    completed: bool = False
    skipped: bool = False


@dataclass
class InterventionSequence:
    """A multi-step progressive intervention plan."""
    sequence_id: str
    user_id: int
    goal: str
    root_cause: str
    steps: list[InterventionStep]
    current_step: int = 1
    status: str = "active"        # active | completed | abandoned | paused
    created_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


# Pre-built recovery pathways
RECOVERY_PATHWAYS = {
    "sleep_debt": {
        "goal": "Reduce sleep debt and restore recovery capacity",
        "steps": [
            InterventionStep(1, "screen_reduction", "sleep_hygiene",
                             "Reduce screen time 30 minutes before bed", 5, "easy"),
            InterventionStep(2, "breathing", "stress_management",
                             "5-minute box breathing before sleep", 5, "easy"),
            InterventionStep(3, "sleep_schedule", "sleep_hygiene",
                             "Set consistent bedtime (±30 min)", 0, "moderate",
                             depends_on=1),
            InterventionStep(4, "sleep_hygiene", "sleep_hygiene",
                             "Create a cool, dark sleep environment", 10, "moderate",
                             depends_on=2),
            InterventionStep(5, "recovery_protocol", "recovery_protocol",
                             "Full evening wind-down routine", 20, "advanced",
                             depends_on=3),
        ],
    },
    "stress_overload": {
        "goal": "Break the stress accumulation cycle",
        "steps": [
            InterventionStep(1, "breathing", "breathing",
                             "2-minute breathing reset", 2, "easy"),
            InterventionStep(2, "movement_break", "movement_break",
                             "5-minute walk or stretch", 5, "easy"),
            InterventionStep(3, "stress_management", "stress_management",
                             "10-minute guided relaxation", 10, "moderate",
                             depends_on=1),
            InterventionStep(4, "exercise", "exercise",
                             "20-minute moderate exercise session", 20, "moderate",
                             depends_on=2),
            InterventionStep(5, "meditation", "meditation",
                             "Daily 10-minute meditation practice", 10, "advanced",
                             depends_on=3),
        ],
    },
    "fatigue_spiral": {
        "goal": "Break the fatigue-inactivity cycle",
        "steps": [
            InterventionStep(1, "hydration", "hydration",
                             "Drink a glass of water now", 1, "easy"),
            InterventionStep(2, "movement_break", "movement_break",
                             "3-minute gentle stretch", 3, "easy"),
            InterventionStep(3, "exercise", "exercise",
                             "10-minute light walk", 10, "moderate",
                             depends_on=2),
            InterventionStep(4, "sleep_hygiene", "sleep_hygiene",
                             "Prioritize 8 hours tonight", 0, "moderate",
                             depends_on=1),
            InterventionStep(5, "recovery_protocol", "recovery_protocol",
                             "Full rest-and-recover day plan", 30, "advanced",
                             depends_on=3),
        ],
    },
    "burnout_prevention": {
        "goal": "Prevent burnout through sustainable recovery",
        "steps": [
            InterventionStep(1, "breathing", "breathing",
                             "Pause and take 3 deep breaths", 1, "easy"),
            InterventionStep(2, "screen_reduction", "screen_reduction",
                             "Take a 15-minute screen break", 15, "easy"),
            InterventionStep(3, "social", "social",
                             "Connect with someone you trust", 15, "moderate",
                             depends_on=1),
            InterventionStep(4, "exercise", "exercise",
                             "Light, enjoyable physical activity", 20, "moderate",
                             depends_on=2),
            InterventionStep(5, "recovery_protocol", "recovery_protocol",
                             "Full burnout recovery protocol (rest + boundaries)", 30,
                             "advanced", depends_on=3),
        ],
    },
}


class InterventionSequencer:
    """
    Manages multi-step progressive intervention plans.
    """

    def __init__(self):
        # user_id → list of sequences
        self._sequences: dict[int, list[InterventionSequence]] = {}
        self._counter = 0

    def create_sequence(
        self,
        user_id: int,
        root_cause: str,
        custom_steps: Optional[list[InterventionStep]] = None,
    ) -> InterventionSequence:
        """
        Create a multi-step intervention sequence.
        Uses pre-built pathways or custom steps.
        """
        self._counter += 1
        seq_id = f"seq-{user_id}-{self._counter}"

        if custom_steps:
            pathway_goal = f"Custom intervention for {root_cause}"
            steps = custom_steps
        else:
            pathway = RECOVERY_PATHWAYS.get(root_cause, RECOVERY_PATHWAYS["stress_overload"])
            pathway_goal = pathway["goal"]
            # Deep copy steps
            steps = [
                InterventionStep(
                    step_number=s.step_number,
                    action=s.action,
                    category=s.category,
                    description=s.description,
                    duration_minutes=s.duration_minutes,
                    difficulty=s.difficulty,
                    depends_on=s.depends_on,
                )
                for s in pathway["steps"]
            ]

        seq = InterventionSequence(
            sequence_id=seq_id,
            user_id=user_id,
            goal=pathway_goal,
            root_cause=root_cause,
            steps=steps,
        )

        if user_id not in self._sequences:
            self._sequences[user_id] = []
        self._sequences[user_id].append(seq)

        return seq

    def advance_step(
        self,
        user_id: int,
        sequence_id: str,
        completed: bool = True,
    ) -> Optional[dict]:
        """
        Mark current step as complete and advance.
        Returns the next step info or completion status.
        """
        seq = self._find_sequence(user_id, sequence_id)
        if not seq or seq.status != "active":
            return None

        # Mark current step
        for step in seq.steps:
            if step.step_number == seq.current_step:
                step.completed = completed
                step.skipped = not completed
                break

        # Find next available step
        next_step = None
        for step in seq.steps:
            if step.step_number > seq.current_step and not step.completed:
                # Check dependency
                if step.depends_on:
                    dep = next(
                        (s for s in seq.steps if s.step_number == step.depends_on),
                        None,
                    )
                    if dep and not dep.completed:
                        continue
                next_step = step
                break

        if next_step:
            seq.current_step = next_step.step_number
            return {
                "status": "advanced",
                "next_step": {
                    "step_number": next_step.step_number,
                    "action": next_step.action,
                    "description": next_step.description,
                    "difficulty": next_step.difficulty,
                    "duration_minutes": next_step.duration_minutes,
                },
                "progress": self._compute_progress(seq),
            }
        else:
            seq.status = "completed"
            return {
                "status": "completed",
                "goal": seq.goal,
                "progress": 1.0,
                "message": f"Congratulations! You completed the {seq.root_cause} recovery plan.",
            }

    def get_current_step(
        self,
        user_id: int,
        sequence_id: str,
    ) -> Optional[dict]:
        """Get the current step in a sequence."""
        seq = self._find_sequence(user_id, sequence_id)
        if not seq:
            return None

        current = next(
            (s for s in seq.steps if s.step_number == seq.current_step),
            None,
        )
        if not current:
            return None

        return {
            "sequence_id": seq.sequence_id,
            "goal": seq.goal,
            "current_step": {
                "step_number": current.step_number,
                "action": current.action,
                "description": current.description,
                "difficulty": current.difficulty,
                "duration_minutes": current.duration_minutes,
            },
            "progress": self._compute_progress(seq),
            "total_steps": len(seq.steps),
            "status": seq.status,
        }

    def get_active_sequences(self, user_id: int) -> list[dict]:
        """Get all active sequences for a user."""
        sequences = self._sequences.get(user_id, [])
        return [
            {
                "sequence_id": s.sequence_id,
                "goal": s.goal,
                "root_cause": s.root_cause,
                "current_step": s.current_step,
                "total_steps": len(s.steps),
                "progress": self._compute_progress(s),
                "status": s.status,
            }
            for s in sequences
            if s.status == "active"
        ]

    # ── Internal ─────────────────────────────────────────────

    def _find_sequence(
        self, user_id: int, seq_id: str,
    ) -> Optional[InterventionSequence]:
        for seq in self._sequences.get(user_id, []):
            if seq.sequence_id == seq_id:
                return seq
        return None

    @staticmethod
    def _compute_progress(seq: InterventionSequence) -> float:
        completed = sum(1 for s in seq.steps if s.completed)
        return round(completed / max(len(seq.steps), 1), 3)
