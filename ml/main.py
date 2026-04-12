"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  MediCare AI — Disease Prediction API (FastAPI)                            ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Serves the trained ML model via REST endpoints.                           ║
║  Uses SHAP for per-prediction explainability.                              ║
║                                                                            ║
║  Run: uvicorn ml.main:app --reload --port 8000                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import traceback
from contextlib import asynccontextmanager
from typing import List, Optional

import numpy as np
import joblib
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE         = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_DIR = os.path.join(BASE, "artifacts")

# ── Global state (loaded at startup) ─────────────────────────────────────────
state = {}


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  LIFESPAN — Load artifacts once at startup                               ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all ML artifacts at startup, clean up on shutdown."""
    print("[MediCare API] Loading ML artifacts...")

    state["model"] = joblib.load(os.path.join(ARTIFACT_DIR, "best_disease_model.pkl"))
    state["label_encoder"] = joblib.load(os.path.join(ARTIFACT_DIR, "label_encoder.pkl"))

    with open(os.path.join(ARTIFACT_DIR, "feature_columns.json")) as f:
        state["feature_columns"] = json.load(f)

    with open(os.path.join(ARTIFACT_DIR, "severity_dict.json")) as f:
        state["severity_dict"] = json.load(f)

    with open(os.path.join(ARTIFACT_DIR, "disease_meta.json")) as f:
        state["disease_meta"] = json.load(f)

    with open(os.path.join(ARTIFACT_DIR, "model_info.json")) as f:
        state["model_info"] = json.load(f)

    # Pre-build column index for fast lookups
    state["col_index"] = {sym: i for i, sym in enumerate(state["feature_columns"])}

    # SHAP explainer (lazy — built once)
    try:
        state["explainer"] = shap.TreeExplainer(state["model"])
        print("[MediCare API] SHAP explainer initialized ✓")
    except Exception as e:
        print(f"[MediCare API] SHAP init failed (predictions will work, explanations won't): {e}")
        state["explainer"] = None

    n_diseases = len(state["label_encoder"].classes_)
    n_symptoms = len(state["feature_columns"])
    model_name = state["model_info"]["model_name"]
    print(f"[MediCare API] Ready — {model_name} | {n_diseases} diseases | {n_symptoms} symptoms")

    yield  # App runs

    # Cleanup
    state.clear()
    print("[MediCare API] Shutdown — artifacts freed.")


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  APP SETUP                                                               ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

app = FastAPI(
    title="MediCare AI — Disease Prediction API",
    description="ML-powered disease prediction from symptoms with SHAP explainability.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS (allow all origins for dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  SCHEMAS                                                                 ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

class PredictRequest(BaseModel):
    symptoms: List[str]

    @field_validator("symptoms", mode="before")
    @classmethod
    def clean_symptoms(cls, v):
        if not isinstance(v, list):
            raise ValueError("symptoms must be a list of strings")
        return [s.strip().lower().replace(" ", "_") for s in v if isinstance(s, str)]


class PredictionItem(BaseModel):
    disease: str
    probability: float


class PredictResponse(BaseModel):
    predicted_disease: str
    confidence: float
    top_3_predictions: List[PredictionItem]
    description: str
    precautions: List[str]
    key_symptoms: List[str]


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  HELPER — SHAP explain                                                   ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def get_key_symptoms(x: np.ndarray, predicted_class: int) -> List[str]:
    """Return top 5 symptoms that drove the prediction using SHAP."""
    explainer = state.get("explainer")
    if not explainer:
        # Fallback: return input symptoms sorted by severity
        fc = state["feature_columns"]
        sd = state["severity_dict"]
        active = [fc[i] for i in range(len(fc)) if x[0, i] > 0]
        active.sort(key=lambda s: sd.get(s, 1), reverse=True)
        return active[:5]

    try:
        sv = explainer.shap_values(x)
        if isinstance(sv, list):
            class_shap = sv[predicted_class][0]
        elif sv.ndim == 3:
            class_shap = sv[0, :, predicted_class]
        else:
            class_shap = sv[0]

        fc = state["feature_columns"]
        top_idx = np.argsort(np.abs(class_shap))[-5:][::-1]
        return [fc[i] for i in top_idx if class_shap[i] != 0]
    except Exception:
        # Fallback
        fc = state["feature_columns"]
        active = [fc[i] for i in range(len(fc)) if x[0, i] > 0]
        return active[:5]


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  ENDPOINTS                                                               ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

@app.get("/health")
async def health():
    """Health check."""
    return {
        "status": "ok",
        "model": state["model_info"]["model_name"],
        "diseases": len(state["label_encoder"].classes_),
        "symptoms": len(state["feature_columns"]),
    }


@app.get("/symptoms")
async def list_symptoms():
    """Return all valid symptom names."""
    return {
        "total": len(state["feature_columns"]),
        "symptoms": state["feature_columns"],
    }


@app.get("/diseases")
async def list_diseases():
    """Return all disease names the model can predict."""
    classes = list(state["label_encoder"].classes_)
    return {
        "total": len(classes),
        "diseases": classes,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    """
    Predict disease from a list of symptoms.
    Returns top 3 predictions, description, precautions, and SHAP-based key symptoms.
    """
    symptoms = req.symptoms
    fc = state["feature_columns"]
    sd = state["severity_dict"]
    ci = state["col_index"]
    le = state["label_encoder"]
    model = state["model"]
    meta = state["disease_meta"]

    # Validate: empty list
    if not symptoms:
        raise HTTPException(status_code=400, detail="Provide at least one symptom")

    # Validate: unknown symptoms
    valid_set = set(fc)
    for sym in symptoms:
        # Also clean double underscores
        cleaned = sym
        while "__" in cleaned:
            cleaned = cleaned.replace("__", "_")
        if cleaned not in valid_set:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown symptom: '{sym}'. Check /symptoms for valid list.",
            )

    # Build feature vector
    x = np.zeros((1, len(fc)), dtype=np.float32)
    for sym in symptoms:
        cleaned = sym
        while "__" in cleaned:
            cleaned = cleaned.replace("__", "_")
        if cleaned in ci:
            x[0, ci[cleaned]] = sd.get(cleaned, 1)

    # Predict
    proba = model.predict_proba(x)[0]
    top3_idx = np.argsort(proba)[-3:][::-1]
    predicted_class = top3_idx[0]
    predicted_disease = le.inverse_transform([predicted_class])[0]

    top3 = []
    for idx in top3_idx:
        d_name = le.inverse_transform([idx])[0]
        top3.append(PredictionItem(
            disease=d_name,
            probability=round(float(proba[idx]), 4),
        ))

    # Metadata
    description = meta.get("description", {}).get(predicted_disease, "No description available.")
    precautions = meta.get("precaution", {}).get(predicted_disease, [])

    # SHAP key symptoms
    key_symptoms = get_key_symptoms(x, predicted_class)

    return PredictResponse(
        predicted_disease=predicted_disease,
        confidence=round(float(proba[predicted_class]), 4),
        top_3_predictions=top3,
        description=description,
        precautions=precautions,
        key_symptoms=key_symptoms,
    )


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  RUN                                                                     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml.main:app", host="0.0.0.0", port=8000, reload=True)
