"""
STEP 4 Advanced Explainability Test Suite

Verifies:
1. Layered reasoning chains (simple/intermediate/advanced)
2. Evidence landscape with causal links
3. Contradiction detection and storytelling
4. Uncertainty normalization
5. Decision transparency
6. Confidence shift tracking and stability
7. Trust indicators
8. Reasoning stability states
9. Investigation graph construction
10. Evidence pathway mapping
11. Longitudinal storytelling
12. Contradiction narrative coherence
"""
import sys
sys.path.insert(0, ".")

from health_intelligence.clinical_explainability.reasoning_explainer import ReasoningExplainer
from health_intelligence.clinical_explainability.evidence_explainer import EvidenceExplainer
from health_intelligence.clinical_explainability.contradiction_explainer import ContradictionExplainer
from health_intelligence.clinical_explainability.uncertainty_explainer import UncertaintyExplainer
from health_intelligence.clinical_explainability.decision_transparency_engine import DecisionTransparencyEngine
from health_intelligence.clinical_explainability.confidence_shift_explainer import ConfidenceShiftExplainer
from health_intelligence.clinical_explainability.trust_transparency_engine import TrustTransparencyEngine
from health_intelligence.clinical_explainability.reasoning_stability_tracker import ReasoningStabilityTracker
from health_intelligence.investigation_graph.investigation_graph_engine import InvestigationGraphEngine
from health_intelligence.investigation_graph.evidence_pathway_mapper import EvidencePathwayMapper
from health_intelligence.investigation_graph.reasoning_transition_tracker import ReasoningTransitionTracker
from health_intelligence.clinical_storytelling.investigation_story_builder import InvestigationStoryBuilder
from health_intelligence.clinical_storytelling.longitudinal_story_engine import LongitudinalStoryEngine
from health_intelligence.clinical_storytelling.contradiction_storytelling_engine import ContradictionStorytellingEngine

# Test fixtures
OBS = [{"symptom": "cough", "severity": 0.6, "duration": "5 days"},
       {"symptom": "fever", "severity": 0.7, "duration": "3 days"},
       {"symptom": "fatigue", "severity": 0.5, "duration": "7 days"}]

HYPS = [
    {"condition": "Pneumonia", "confidence": 0.55, "evidence_for": ["cough", "fever"], "evidence_against": ["rash"], "expected_symptoms": ["cough", "fever", "chest_pain", "shortness_of_breath"]},
    {"condition": "Flu", "confidence": 0.45, "evidence_for": ["fever", "fatigue"], "evidence_against": [], "expected_symptoms": ["fever", "fatigue", "body_aches", "headache"]},
    {"condition": "Bronchitis", "confidence": 0.3, "evidence_for": ["cough"], "evidence_against": ["fever"], "expected_symptoms": ["cough", "mucus", "chest_discomfort"]},
]

PREV_HYPS = [
    {"condition": "Pneumonia", "confidence": 0.4},
    {"condition": "Flu", "confidence": 0.55},
    {"condition": "Bronchitis", "confidence": 0.35},
]


def test_1():
    print("=== Test 1: Layered reasoning chains ===")
    re = ReasoningExplainer()
    for level in ("simple", "intermediate", "advanced"):
        chain = re.generate_reasoning_chain(OBS, HYPS, detail_level=level)
        assert chain["detail_level"] == level
        assert len(chain["steps"]) >= 3
        assert chain["summary"]
        print(f"  {level}: {len(chain['steps'])} steps, summary={chain['summary'][:80]}...")
    print()


def test_2():
    print("=== Test 2: Evidence landscape with causal links ===")
    ee = EvidenceExplainer()
    landscape = ee.explain_evidence_landscape(HYPS, OBS, {"heart_rate": 88}, 0.6)
    assert len(landscape["strong_evidence"]) > 0
    assert len(landscape["causal_links"]) > 0
    assert landscape["sufficiency_score"] > 0
    assert landscape["summary"]
    print(f"  Strong: {len(landscape['strong_evidence'])}, Weak: {len(landscape['weak_evidence'])}")
    print(f"  Causal links: {len(landscape['causal_links'])}, Sufficiency: {landscape['sufficiency_score']}")
    print(f"  Summary: {landscape['summary'][:80]}...")
    print()


def test_3():
    print("=== Test 3: Contradiction detection and storytelling ===")
    ce = ContradictionExplainer()
    hyps_with_conflict = [
        {"condition": "Pneumonia", "confidence": 0.55, "evidence_for": ["cough", "fever"], "evidence_against": ["rash"]},
        {"condition": "Flu", "confidence": 0.50, "evidence_for": ["fever", "fatigue"], "evidence_against": []},
    ]
    obs_with_conflict = OBS + [{"symptom": "rash", "severity": 0.3}]
    result = ce.detect_and_explain(hyps_with_conflict, obs_with_conflict,
                                   wearable_data={"spo2": 94}, wearable_trust=0.3,
                                   trajectory_data={"volatility": 0.5})
    assert result["contradiction_count"] > 0
    assert result["summary"]
    print(f"  Contradictions: {result['contradiction_count']}, Impact: {result['overall_impact']}")
    for c in result["contradictions"]:
        print(f"    - {c['type']}: {c['explanation'][:70]}...")

    cse = ContradictionStorytellingEngine()
    story = cse.narrate_contradictions(result)
    assert story["has_contradictions"]
    assert "natural" in story["narrative"] or "normal" in story["narrative"] or "thorough" in story["narrative"]
    print(f"  Story: {story['narrative'][:100]}...")
    print()


def test_4():
    print("=== Test 4: Calm uncertainty normalization ===")
    ue = UncertaintyExplainer()
    result = ue.explain_uncertainty(HYPS, evidence_sufficiency=0.3, wearable_trust=0.3, trajectory_stability=0.3)
    assert result["uncertainty_level"] in ("moderate", "elevated", "high")
    assert len(result["sources"]) > 0
    msg = result["normalization_message"].lower()
    assert any(w in msg for w in ("investigation", "uncertain", "observation", "evidence", "complex", "monitoring")), f"Unexpected msg: {msg}"
    print(f"  Level: {result['uncertainty_level']}, Score: {result['uncertainty_score']}")
    print(f"  Sources: {len(result['sources'])}")
    print(f"  Normalization: {result['normalization_message']}")
    print()


def test_5():
    print("=== Test 5: Decision transparency ===")
    dte = DecisionTransparencyEngine()
    hyps_with_shift = [{"condition": "Pneumonia", "confidence": 0.55, "previous_confidence": 0.4},
                       {"condition": "Flu", "confidence": 0.4, "previous_confidence": 0.55}]
    result = dte.explain_decisions(hyps_with_shift,
                                   severity_data={"severity_level": "moderate", "severity_score": 0.4},
                                   trajectory_data={"trajectory": "fluctuating"})
    assert len(result["decisions"]) > 0
    assert result["summary"]
    print(f"  Decisions: {len(result['decisions'])}")
    for d in result["decisions"]:
        print(f"    - {d['type']}: {d['explanation'][:70]}...")
    print()


def test_6():
    print("=== Test 6: Confidence shift tracking ===")
    cse = ConfidenceShiftExplainer()
    result = cse.explain_shifts(HYPS, PREV_HYPS)
    assert result["stability"] in ("stable", "adjusting", "unstable", "rapidly_shifting")
    assert result["stability_score"] > 0
    print(f"  Stability: {result['stability']} (score={result['stability_score']})")
    for s in result["shifts"]:
        print(f"    - {s['condition']}: {s['previous']}% -> {s['current']}% ({s['direction']})")
    print()


def test_7():
    print("=== Test 7: Trust indicators ===")
    tte = TrustTransparencyEngine()
    result = tte.calculate_trust_indicators(HYPS, OBS, evidence_sufficiency=0.6,
                                             wearable_trust=0.7, reasoning_stability=0.8, contradiction_count=1)
    assert len(result["indicators"]) == 5
    assert result["overall_trust"] > 0
    print(f"  Overall trust: {result['overall_trust']}")
    for ind in result["indicators"]:
        print(f"    - {ind['label']}: {ind['status']} ({ind['value']})")
    print()


def test_8():
    print("=== Test 8: Reasoning stability states ===")
    rst = ReasoningStabilityTracker()
    # Simulate stable reasoning
    for _ in range(3):
        rst.record_state(HYPS, contradiction_count=0, evidence_sufficiency=0.6)
    state = rst.get_stability_state()
    assert state["state"] in ("stable", "adjusting")
    print(f"  Stable scenario: state={state['state']}, score={state['stability_score']}")

    # Simulate unstable reasoning
    rst2 = ReasoningStabilityTracker()
    shifting_hyps = [
        [{"condition": "A", "confidence": 0.6}, {"condition": "B", "confidence": 0.2}],
        [{"condition": "A", "confidence": 0.2}, {"condition": "B", "confidence": 0.7}],
        [{"condition": "A", "confidence": 0.5}, {"condition": "B", "confidence": 0.3}],
        [{"condition": "A", "confidence": 0.1}, {"condition": "B", "confidence": 0.8}],
        [{"condition": "A", "confidence": 0.7}, {"condition": "B", "confidence": 0.1}],
    ]
    for h in shifting_hyps:
        rst2.record_state(h, contradiction_count=3, evidence_sufficiency=0.3)
    state2 = rst2.get_stability_state()
    assert state2["state"] in ("unstable", "rapidly_shifting", "high_ambiguity")
    print(f"  Unstable scenario: state={state2['state']}, score={state2['stability_score']}")
    print()


def test_9():
    print("=== Test 9: Investigation graph ===")
    ige = InvestigationGraphEngine()
    graph = ige.build_graph(HYPS, OBS, trajectory_data={"trajectory": "stable", "stability_score": 0.8},
                            escalation_data={"escalation_likelihood": 0.2})
    assert len(graph["nodes"]) >= 3
    assert len(graph["edges"]) >= 1
    assert graph["focus_node"]
    print(f"  Nodes: {len(graph['nodes'])}, Edges: {len(graph['edges'])}, Focus: {graph['focus_node']}")
    print()


def test_10():
    print("=== Test 10: Evidence pathway mapping ===")
    epm = EvidencePathwayMapper()
    result = epm.map_pathways(HYPS, OBS, wearable_data={"heart_rate": 88})
    assert len(result["pathways"]) > 0
    assert result["strongest_pathway"]
    print(f"  Pathways: {len(result['pathways'])}, Strongest: {result['strongest_pathway']['condition']}")
    print()


def test_11():
    print("=== Test 11: Longitudinal storytelling ===")
    lse = LongitudinalStoryEngine()
    lse.record_session(PREV_HYPS, [{"symptom": "cough"}, {"symptom": "fever"}], "mild", "stable")
    lse.record_session(HYPS, OBS, "moderate", "fluctuating")
    narrative = lse.generate_longitudinal_narrative()
    assert narrative["sessions_analyzed"] >= 2
    assert len(narrative["narrative"]) > 20
    assert narrative["continuity_score"] >= 0
    print(f"  Sessions: {narrative['sessions_analyzed']}, Continuity: {narrative['continuity_score']}")
    print(f"  Narrative: {narrative['narrative'][:120]}...")
    print()


def test_12():
    print("=== Test 12: Investigation story builder ===")
    isb = InvestigationStoryBuilder()
    story = isb.build_story(HYPS, OBS, severity_data={"severity_level": "moderate"},
                             trajectory_data={"trajectory": "fluctuating"})
    assert story["tone"] == "calm"
    assert len(story["narrative"]) > 30
    # Verify calm language
    alarming_words = ["danger", "emergency", "critical failure", "fatal", "dying"]
    for word in alarming_words:
        assert word not in story["narrative"].lower(), f"Alarming word '{word}' found in narrative"
    print(f"  Tone: {story['tone']}")
    print(f"  Narrative: {story['narrative'][:120]}...")
    print()


if __name__ == "__main__":
    test_1()
    test_2()
    test_3()
    test_4()
    test_5()
    test_6()
    test_7()
    test_8()
    test_9()
    test_10()
    test_11()
    test_12()
    print("=== ALL 12 TESTS PASSED ===")
