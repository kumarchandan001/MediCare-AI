#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  MediCare AI — Disease Prediction API Test Suite
#  Usage: bash ml/test_api.sh
# ═══════════════════════════════════════════════════════════════════════════════

BASE_URL="http://127.0.0.1:8000"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  MediCare AI — API Test Suite                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Test 1: Health Check ─────────────────────────────────────────────────────
echo "━━━ TEST 1: GET /health ━━━"
curl -s "$BASE_URL/health" | python -m json.tool
echo ""

# ── Test 2: List Symptoms ────────────────────────────────────────────────────
echo "━━━ TEST 2: GET /symptoms (first 10 shown) ━━━"
curl -s "$BASE_URL/symptoms" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f'Total symptoms: {data[\"total\"]}')
print(f'First 10: {data[\"symptoms\"][:10]}')
"
echo ""

# ── Test 3: List Diseases ────────────────────────────────────────────────────
echo "━━━ TEST 3: GET /diseases ━━━"
curl -s "$BASE_URL/diseases" | python -m json.tool
echo ""

# ── Test 4: Predict — Skin condition ─────────────────────────────────────────
echo "━━━ TEST 4: POST /predict — Skin symptoms ━━━"
curl -s -X POST "$BASE_URL/predict" \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["itching", "skin_rash", "nodal_skin_eruptions"]}' \
  | python -m json.tool
echo ""

# ── Test 5: Predict — Malaria-like symptoms ──────────────────────────────────
echo "━━━ TEST 5: POST /predict — Malaria-like ━━━"
curl -s -X POST "$BASE_URL/predict" \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["high_fever", "chills", "sweating", "headache"]}' \
  | python -m json.tool
echo ""

# ── Test 6: Predict — Cardio symptoms ───────────────────────────────────────
echo "━━━ TEST 6: POST /predict — Cardio symptoms ━━━"
curl -s -X POST "$BASE_URL/predict" \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["chest_pain", "breathlessness", "fatigue"]}' \
  | python -m json.tool
echo ""

# ── Test 7: Predict — Invalid symptom (expect 422) ──────────────────────────
echo "━━━ TEST 7: POST /predict — Invalid symptom (expect 422) ━━━"
curl -s -X POST "$BASE_URL/predict" \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["itching", "flying_pigs_syndrome"]}' \
  | python -m json.tool
echo ""

# ── Test 8: Predict — Empty list (expect 400) ───────────────────────────────
echo "━━━ TEST 8: POST /predict — Empty symptoms (expect 400) ━━━"
curl -s -X POST "$BASE_URL/predict" \
  -H "Content-Type: application/json" \
  -d '{"symptoms": []}' \
  | python -m json.tool
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  All tests complete!"
echo "═══════════════════════════════════════════════════════════════"
