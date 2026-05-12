"""Test STEP 3: Temporal Clinical Intelligence & Severity Reasoning."""
from health_intelligence.temporal_clinical_intelligence import LongitudinalReasoningEngine
from health_intelligence.severity_reasoning import SeverityClassifier, TriageEngine
from health_intelligence.wearable.temporal_wearable_reliability import TemporalWearableReliability
from health_intelligence.evidence_graph.temporal_evidence_mapper import TemporalEvidenceMapper
from health_intelligence.evidence_graph.progression_relationship_graph import ProgressionRelationshipGraph

print("=== Test 1: Multi-snapshot longitudinal reasoning ===")
engine = LongitudinalReasoningEngine()

# Simulate 5 clinical snapshots over time (stable -> worsening -> recovering)
snapshots = [
    (0.3, ["cough", "fatigue"], {"spo2": 97, "heart_rate": 75}),
    (0.35, ["cough", "fatigue", "fever"], {"spo2": 96, "heart_rate": 80}),
    (0.5, ["cough", "fatigue", "fever", "shortness_of_breath"], {"spo2": 93, "heart_rate": 90}),
    (0.55, ["cough", "fatigue", "fever", "shortness_of_breath", "chest_pain"], {"spo2": 91, "heart_rate": 100}),
    (0.4, ["cough", "fatigue", "fever"], {"spo2": 94, "heart_rate": 85}),
]

for sev, syms, wear in snapshots:
    engine.record_session_snapshot("s1", "user1", sev, syms, wearable=wear)

snap = engine.get_longitudinal_snapshot("s1", "user1", ["cough", "fatigue", "fever"])
print(f"  Trajectory: {snap['trajectory']['trajectory']} (stability={snap['trajectory']['stability_score']})")
print(f"  Deterioration: {snap['deterioration']['is_deteriorating']} (score={snap['deterioration']['score']})")
print(f"  Recovery: {snap['recovery']['is_recovering']} (quality={snap['recovery']['recovery_quality']})")
print(f"  Escalation: {snap['escalation']['escalation_likelihood']} ({snap['escalation']['trajectory']})")
print(f"  Follow-up: {snap['follow_up']['type']} in {snap['follow_up']['follow_up_hours']}h")
print(f"  Narrative: {snap['narrative'][:100]}...")

print("\n=== Test 2: Severity classification ===")
sev_cls = SeverityClassifier()
result = sev_cls.classify(
    ["chest_pain", "shortness_of_breath", "fever"],
    wearable={"spo2": 91, "heart_rate": 105, "temperature": 39.0},
    deterioration_score=0.4,
)
print(f"  Level: {result['severity_level']} (score={result['severity_score']})")
print(f"  Explanation: {result['explanation']}")

print("\n=== Test 3: Triage classification ===")
triage = TriageEngine()
tri = triage.classify(
    severity_score=result["severity_score"],
    severity_level=result["severity_level"],
    deterioration_score=0.4,
    escalation_likelihood=0.3,
    trajectory="deteriorating",
)
print(f"  Triage: {tri['triage_level']} (urgency={tri['urgency_score']})")
print(f"  Action: {tri['action']}")

print("\n=== Test 4: Wearable reliability ===")
wr = TemporalWearableReliability()
readings = [
    {"spo2": 97, "heart_rate": 75},
    {"spo2": 96, "heart_rate": 78},
    {"spo2": 95, "heart_rate": 80},
    {"spo2": 82, "heart_rate": 140},  # Anomalous spike
    {"spo2": 94, "heart_rate": 82},
]
for r in readings:
    wr.record_reading("s1", r)
rel = wr.assess_reliability("s1")
print(f"  Trust: {rel['trust_score']} (reliable={rel['is_reliable']})")
print(f"  Anomalies: {rel['anomalies_detected']}")
print(f"  Explanation: {rel['explanation']}")
filtered = wr.get_filtered_latest("s1")
print(f"  Filtered latest: {filtered}")

print("\n=== Test 5: Temporal evidence mapper ===")
tem = TemporalEvidenceMapper()
tem.record_evidence("s1", {"Pneumonia": 0.3, "Flu": 0.4, "Cardiac": 0.1})
tem.record_evidence("s1", {"Pneumonia": 0.5, "Flu": 0.35, "Cardiac": 0.2})
tem.record_evidence("s1", {"Pneumonia": 0.6, "Flu": 0.25, "Cardiac": 0.15})
trends = tem.analyse_trends("s1")
print(f"  Strengthening: {trends['strengthening']}")
print(f"  Weakening: {trends['weakening']}")

print("\n=== Test 6: Progression relationship graph ===")
prg = ProgressionRelationshipGraph()
graph = prg.build_graph([
    {"severity": 0.3, "trajectory": "stable"},
    {"severity": 0.5, "trajectory": "deteriorating"},
    {"severity": 0.55, "trajectory": "deteriorating"},
    {"severity": 0.4, "trajectory": "improving"},
])
print(f"  Nodes: {len(graph['nodes'])}, Edges: {len(graph['edges'])}")
print(f"  Pathways: {graph['pathways']}")
print(f"  Dominant: {graph['dominant_pathway']}")

print("\n=== Test 7: Symptom evolution ===")
evo = snap["symptom_evolution"]
print(f"  New symptoms: {evo.get('new_symptoms', [])}")
print(f"  Resolved: {evo.get('resolved_symptoms', [])}")
print(f"  Persistent: {evo.get('persistent', [])}")
print(f"  Spreading: {evo.get('spreading', False)}")

print("\n=== Test 8: Recurrence analysis ===")
rec = snap["recurrence"]
print(f"  Recurring: {rec['is_recurring']} (score={rec['recurrence_score']})")

print("\n=== ALL TESTS PASSED ===")
