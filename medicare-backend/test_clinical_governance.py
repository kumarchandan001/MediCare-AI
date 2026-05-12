"""
STEP 5 Clinical Governance & Safety Test Suite

Verifies:
1. Overconfidence prevention (confidence caps, penalties)
2. Uncertainty governance (probabilistic enforcement)
3. Escalation boundaries (emergency override, graduated levels)
4. Medical safety enforcement (diagnostic language blocking)
5. Ambiguity preservation
6. Human review triggers
7. Ethical guardrails
8. Full safety governance pipeline
9. Calm language controller
10. Escalation tone moderation
11. Anxiety reduction
12. Cognitive load balancing
13. Emotional safety pipeline
14. Clinical policy engine
15. Privacy guardrails
"""
import sys
sys.path.insert(0, ".")

from health_intelligence.clinical_governance.overconfidence_prevention_engine import OverconfidencePreventionEngine
from health_intelligence.clinical_governance.uncertainty_governor import UncertaintyGovernor
from health_intelligence.clinical_governance.escalation_boundary_manager import EscalationBoundaryManager
from health_intelligence.clinical_governance.medical_safety_enforcer import MedicalSafetyEnforcer
from health_intelligence.clinical_governance.ambiguity_preservation_engine import AmbiguityPreservationEngine
from health_intelligence.clinical_governance.human_review_trigger_engine import HumanReviewTriggerEngine
from health_intelligence.clinical_governance.ethical_reasoning_guardrails import EthicalReasoningGuardrails
from health_intelligence.clinical_governance.safety_governance_engine import SafetyGovernanceEngine
from health_intelligence.emotional_safety.calm_language_controller import CalmLanguageController
from health_intelligence.emotional_safety.escalation_tone_moderator import EscalationToneModerator
from health_intelligence.emotional_safety.anxiety_reduction_layer import AnxietyReductionLayer
from health_intelligence.emotional_safety.cognitive_load_balancer import CognitiveLoadBalancer
from health_intelligence.emotional_safety.emotional_safety_engine import EmotionalSafetyEngine
from health_intelligence.clinical_policy.policy_engine import PolicyEngine
from health_intelligence.privacy_ethics.privacy_guardrails import PrivacyGuardrails

OBS = [{"symptom": "cough", "severity": 0.6}, {"symptom": "fever", "severity": 0.7},
       {"symptom": "fatigue", "severity": 0.5}]
HYPS = [
    {"condition": "Pneumonia", "confidence": 0.92, "evidence_for": ["cough", "fever"], "evidence_against": ["rash"]},
    {"condition": "Flu", "confidence": 0.55, "evidence_for": ["fever", "fatigue"], "evidence_against": []},
]


def test_1():
    print("=== Test 1: Overconfidence prevention ===")
    e = OverconfidencePreventionEngine()
    r = e.apply_confidence_governance(HYPS, OBS, contradiction_count=2, evidence_sufficiency=0.3,
                                       wearable_trust=0.3, reasoning_stability=0.3)
    assert r["governance_applied"]
    for h in r["hypotheses"]:
        assert h["confidence"] <= 0.85, f"{h['condition']} confidence {h['confidence']} exceeds cap"
    print(f"  Adjustments: {len(r['adjustments'])}")
    for a in r["adjustments"]:
        print(f"    {a['condition']}: {a['raw']} -> {a['governed']} ({', '.join(a['reasons'][:2])})")
    print()

def test_2():
    print("=== Test 2: Uncertainty governance ===")
    e = UncertaintyGovernor()
    r = e.enforce_uncertainty(HYPS, "You have pneumonia confirmed.", evidence_sufficiency=0.3, contradiction_count=2)
    assert not r["is_safe"]
    assert r["violation_count"] > 0
    print(f"  Safe: {r['is_safe']}, Violations: {r['violation_count']}, Warnings: {r['warning_count']}")
    for v in r["violations"]:
        print(f"    - {v['type']}: {v.get('phrase', v.get('condition', ''))}")
    safe_hyps = [{"condition": "Pneumonia", "confidence": 0.55, "evidence_for": ["cough", "fever"]}]
    r2 = e.enforce_uncertainty(safe_hyps, "Investigation suggests pneumonia may be a possibility.")
    assert r2["is_safe"]
    print(f"  Safe narrative: {r2['is_safe']}")
    print()

def test_3():
    print("=== Test 3: Escalation boundaries ===")
    e = EscalationBoundaryManager()
    # Emergency override
    r = e.evaluate_escalation([{"symptom": "chest_pain"}, {"symptom": "difficulty_breathing"}], 0.8, 0.7)
    assert r["is_emergency"]
    assert r["bypass_reasoning"]
    print(f"  Emergency: {r['is_emergency']}, Symptoms: {r.get('emergency_symptoms')}")
    # Normal
    r2 = e.evaluate_escalation(OBS, 0.4, 0.3)
    assert not r2["is_emergency"]
    print(f"  Normal: level={r2['escalation_level']}, action={r2['action'][:60]}...")
    print()

def test_4():
    print("=== Test 4: Medical safety enforcement ===")
    e = MedicalSafetyEnforcer()
    r = e.enforce_safety("You have been diagnosed with pneumonia.", HYPS)
    assert not r["is_safe"]
    assert e.REQUIRED_DISCLAIMER in r["safe_text"]
    print(f"  Unsafe text remediated: {len(r['violations'])} violations")
    r2 = e.enforce_safety("Investigation suggests pneumonia may be a possibility.")
    assert r2["is_safe"]
    print(f"  Safe text passed: {r2['is_safe']}")
    print()

def test_5():
    print("=== Test 5: Ambiguity preservation ===")
    e = AmbiguityPreservationEngine()
    r = e.evaluate_ambiguity(HYPS, evidence_sufficiency=0.2, contradiction_count=3, reasoning_stability=0.3)
    assert r["should_preserve"]
    assert r["ambiguity_level"] in ("moderate", "elevated", "high")
    print(f"  Level: {r['ambiguity_level']}, Score: {r['ambiguity_score']}, Preserve: {r['should_preserve']}")
    print()

def test_6():
    print("=== Test 6: Human review triggers ===")
    e = HumanReviewTriggerEngine()
    low_conf = [{"condition": "A", "confidence": 0.2}, {"condition": "B", "confidence": 0.15}, {"condition": "C", "confidence": 0.1}]
    r = e.evaluate_review_need(low_conf, OBS, severity_score=0.7, deterioration_score=0.7,
                                contradiction_count=4, reasoning_stability=0.2,
                                escalation_level="urgent")
    assert r["should_recommend_review"]
    assert r["urgency"] == "high"
    print(f"  Triggers: {r['trigger_count']}, Urgency: {r['urgency']}")
    for t in r["triggers"]:
        print(f"    - {t['type']}: {t['reason'][:60]}...")
    print()

def test_7():
    print("=== Test 7: Ethical guardrails ===")
    e = EthicalReasoningGuardrails()
    r = e.evaluate_ethics("You have pneumonia. Take this medication immediately.", has_disclaimer=False)
    assert not r["is_ethical"]
    print(f"  Ethical: {r['is_ethical']}, Violations: {r['violation_count']}")
    r2 = e.evaluate_ethics("Investigation suggests pneumonia may be a possibility.", has_disclaimer=True)
    assert r2["is_ethical"]
    print(f"  Clean text: {r2['is_ethical']}")
    print()

def test_8():
    print("=== Test 8: Full safety governance pipeline ===")
    e = SafetyGovernanceEngine()
    r = e.run_governance_pipeline(
        HYPS, OBS, narrative_text="Investigation suggests pneumonia may be a possibility.",
        severity_score=0.4, deterioration_score=0.3, contradiction_count=2,
        evidence_sufficiency=0.4, wearable_trust=0.5, reasoning_stability=0.6,
    )
    for h in r["governed_hypotheses"]:
        assert h["confidence"] <= 0.85
    print(f"  Safe: {r['is_safe']}")
    print(f"  Escalation: {r['escalation']['escalation_level']}")
    print(f"  Human review: {r['human_review']['should_recommend_review']}")
    print(f"  Summary: {r['summary']}")
    print()

def test_9():
    print("=== Test 9: Calm language controller ===")
    e = CalmLanguageController()
    r = e.apply_calm_language("This is a dangerous and alarming situation. The patient is suffering.")
    assert r["was_modified"]
    assert "dangerous" not in r["calm_text"].lower()
    assert "alarming" not in r["calm_text"].lower()
    print(f"  Modified: {r['modifications_made']} words")
    print(f"  Calm: {r['calm_text'][:80]}...")
    print()

def test_10():
    print("=== Test 10: Escalation tone moderation ===")
    e = EscalationToneModerator()
    for level in ("routine", "watchful", "elevated", "urgent", "emergency"):
        r = e.moderate_escalation_tone(level)
        assert r["moderated_message"]
        print(f"  {level}: {r['moderated_message'][:70]}...")
    # Fear word fallback
    r2 = e.moderate_escalation_tone("urgent", "You are dying! Panic immediately!")
    assert "dying" not in r2["moderated_message"].lower()
    print(f"  Fear fallback: {r2['moderated_message'][:70]}...")
    print()

def test_11():
    print("=== Test 11: Anxiety reduction ===")
    e = AnxietyReductionLayer()
    r = e.reduce_anxiety("Don't delay going to the doctor. This can kill you in worst case scenario.")
    assert r["reductions_made"] > 0
    assert "kill" not in r["reduced_text"].lower()
    print(f"  Reductions: {r['reductions_made']}")
    print(f"  Safe: {r['reduced_text'][:80]}...")
    print()

def test_12():
    print("=== Test 12: Cognitive load balancing ===")
    e = CognitiveLoadBalancer()
    data = {"hypotheses": [{"c": i} for i in range(10)], "contradictions": [{"c": i} for i in range(8)],
            "narrative": "x" * 700, "nodes": [{"n": i} for i in range(15)]}
    r = e.balance_output(data)
    assert len(r["trimmed_items"]) > 0
    assert len(r["balanced_data"]["hypotheses"]) <= 4
    print(f"  Trimmed: {len(r['trimmed_items'])} sections")
    print(f"  Load: {r['cognitive_load_score']}")
    print()

def test_13():
    print("=== Test 13: Emotional safety pipeline ===")
    e = EmotionalSafetyEngine()
    r = e.apply_emotional_safety(
        "This is a dangerous alarming situation. The patient is suffering greatly.",
        escalation_level="elevated",
        output_data={"hypotheses": HYPS, "contradictions": []},
    )
    assert r["is_emotionally_safe"]
    assert "dangerous" not in r["safe_narrative"].lower()
    print(f"  Score: {r['emotional_safety_score']}")
    print(f"  Safe narrative: {r['safe_narrative'][:80]}...")
    print()

def test_14():
    print("=== Test 14: Clinical policy engine ===")
    policies = PolicyEngine.get_all_policies()
    assert "confidence" in policies
    assert "escalation" in policies
    assert policies["confidence"]["absolute_cap"] == 0.85
    assert len(policies["escalation"]["emergency_keywords"]) > 5
    print(f"  Policy categories: {list(policies.keys())}")
    print(f"  Confidence cap: {policies['confidence']['absolute_cap']}")
    print()

def test_15():
    print("=== Test 15: Privacy guardrails ===")
    e = PrivacyGuardrails()
    r = e.scan_for_pii("Patient email: john@example.com, SSN: 123-45-6789")
    assert r["has_pii"]
    masked = e.mask_pii("Patient email: john@example.com, SSN: 123-45-6789")
    assert "john@example.com" not in masked
    assert "123-45-6789" not in masked
    print(f"  PII found: {r['pii_types']}")
    print(f"  Masked: {masked[:60]}...")
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
    test_13()
    test_14()
    test_15()
    print("=== ALL 15 TESTS PASSED ===")
