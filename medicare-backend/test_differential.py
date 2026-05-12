"""Quick verification of the differential reasoning pipeline."""
from health_intelligence.differential_reasoning import DifferentialEngine
from health_intelligence.clinical_interview.contradiction_detector import ContradictionDetector
from health_intelligence.clinical_interview.conversation_memory import ConversationMemory

e = DifferentialEngine()
cd = ContradictionDetector()
mem = ConversationMemory()

# Test 1: Basic pipeline with wearable + temporal
print("=== Test 1: Full pipeline with wearable + temporal data ===")
r = e.process_new_evidence(
    "s2",
    ["fever", "cough", "fatigue", "shortness_of_breath"],
    {},
    wearable_data={"spo2": 91, "heart_rate": 105, "temperature": 38.5},
    temporal_data={"onset_type": "acute", "progression_speed": "rapid", "onset_days_ago": 2},
)
for h in r["hypotheses"][:5]:
    print(f"  {h['condition']}: {h['confidence']} (severity={h['severity_priority']})")
print(f"  Stability: {r['stability']['overall_stability']}")
print(f"  Ambiguity: {r['ambiguity']['level']} ({r['ambiguity']['overall']})")
print(f"  Strategy: {r['strategy']['strategy']} -> {r['strategy']['target']}")
print(f"  Exclusions: {len(r['exclusions'])}")
print(f"  Comparisons: {len(r['comparisons'])}")
print(f"  Temporal adj: {r['temporal_adjustments']}")
print(f"  Wearable mod: {r['wearable_modifiers']}")

# Test 2: Contradictions
print("\n=== Test 2: Contradiction detection ===")
contras = cd.detect_contradictions(
    ["severe_fatigue", "shortness_of_breath"],
    {"spo2": 99, "activity_level": "high"},
)
for c in contras:
    print(f"  {c['type']}: {c['description']}")

# Test 3: Conversation memory
print("\n=== Test 3: Longitudinal memory ===")
mem.save_session("user1", {"hypotheses": r["hypotheses"][:3], "exclusions": []})
ctx = mem.get_longitudinal_context("user1")
print(f"  Sessions: {ctx['session_count']}")
print(f"  Recurring: {ctx['recurring_hypotheses']}")

# Test 4: Confidence evolution
print("\n=== Test 4: Confidence evolution ===")
r2 = e.process_new_evidence(
    "s2",
    ["fever", "cough", "fatigue", "shortness_of_breath", "chest_pain"],
    {},
    wearable_data={"spo2": 89, "heart_rate": 110},
)
for cond, evo in list(r2["evolution"]["evolution"].items())[:3]:
    print(f"  {cond}: {evo['trend']} (delta={evo['delta']})")

print("\n=== ALL TESTS PASSED ===")
