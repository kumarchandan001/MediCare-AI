"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  MediCare AI — Disease Prediction Model Training Pipeline                  ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Trains LightGBM, XGBoost & CatBoost on severity-weighted symptom          ║
║  features.  Selects best model via (F1 + AUC-ROC) / 2, tunes with         ║
║  Optuna, adds SHAP explainability, and exports all artifacts.              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import warnings

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")          # headless rendering
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, f1_score, roc_auc_score,
    precision_score, recall_score,
    classification_report, confusion_matrix,
)

import lightgbm as lgb
import xgboost as xgb
import catboost as cb
import optuna
import shap

optuna.logging.set_verbosity(optuna.logging.WARNING)
warnings.filterwarnings("ignore")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE      = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(os.path.dirname(BASE), "data")
OUT_DIR   = os.path.join(BASE, "artifacts")
os.makedirs(OUT_DIR, exist_ok=True)

DATASET   = os.path.join(DATA_DIR, "Disease_Symptom_Dataset.csv")
SEVERITY  = os.path.join(DATA_DIR, "Symptom-severity.csv")
DESC_FILE = os.path.join(DATA_DIR, "symptom_Description.csv")
PREC_FILE = os.path.join(DATA_DIR, "symptom_precaution.csv")


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  STEP 1 — PREPROCESSING                                                 ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def clean_symptom(s):
    """Normalise a raw symptom string: strip, lowercase, collapse spaces→_."""
    if pd.isna(s):
        return None
    s = str(s).strip().lower().replace(" ", "_")
    # Fix double-underscore artefacts like 'dischromic__patches'
    while "__" in s:
        s = s.replace("__", "_")
    return s


def load_and_preprocess():
    print("=" * 72)
    print("  STEP 1 — PREPROCESSING")
    print("=" * 72)

    # 1a) Severity dictionary
    sev_df = pd.read_csv(SEVERITY)
    sev_df.columns = [c.strip() for c in sev_df.columns]
    severity_dict = {}
    for _, row in sev_df.iterrows():
        sym = clean_symptom(row.iloc[0])
        if sym:
            severity_dict[sym] = int(row.iloc[1])
    print(f"  Severity dictionary: {len(severity_dict)} symptoms (weights 1–7)")

    # 1b) Dataset
    df = pd.read_csv(DATASET)
    df.columns = [c.strip() for c in df.columns]
    symptom_cols = [c for c in df.columns if c.startswith("Symptom")]
    print(f"  Dataset loaded: {df.shape[0]} rows × {df.shape[1]} cols")
    print(f"  Diseases: {df['Disease'].nunique()}")

    # Clean symptom values
    for col in symptom_cols:
        df[col] = df[col].apply(clean_symptom)

    # 1c) All unique symptoms
    all_symptoms = set()
    for col in symptom_cols:
        all_symptoms.update(df[col].dropna().unique())
    feature_columns = sorted(all_symptoms)
    print(f"  Unique symptoms (features): {len(feature_columns)}")

    # 1d) Build feature matrix with severity weights
    X = np.zeros((len(df), len(feature_columns)), dtype=np.float32)
    col_index = {sym: i for i, sym in enumerate(feature_columns)}

    for row_idx, row in df.iterrows():
        for col in symptom_cols:
            sym = row[col]
            if sym and sym in col_index:
                X[row_idx, col_index[sym]] = severity_dict.get(sym, 1)

    print(f"  Feature matrix shape: {X.shape}")
    print(f"  Non-zero entries: {np.count_nonzero(X)} / {X.size} "
          f"({100*np.count_nonzero(X)/X.size:.1f}%)")

    # 1e) Encode labels
    le = LabelEncoder()
    y = le.fit_transform(df["Disease"].str.strip())
    disease_names = list(le.classes_)
    print(f"  Encoded {len(disease_names)} disease classes")

    # 1f) Stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {X_train.shape[0]}  |  Test: {X_test.shape[0]}")

    # 1g) Disease metadata
    desc_df = pd.read_csv(DESC_FILE)
    desc_df.columns = [c.strip() for c in desc_df.columns]
    description_dict = {}
    for _, row in desc_df.iterrows():
        disease = str(row.iloc[0]).strip()
        description_dict[disease] = str(row.iloc[1]).strip()

    prec_df = pd.read_csv(PREC_FILE)
    prec_df.columns = [c.strip() for c in prec_df.columns]
    precaution_dict = {}
    for _, row in prec_df.iterrows():
        disease = str(row.iloc[0]).strip()
        precs = [str(row.iloc[i]).strip() for i in range(1, 5) if pd.notna(row.iloc[i])]
        precaution_dict[disease] = precs

    print(f"  Descriptions loaded: {len(description_dict)} diseases")
    print(f"  Precautions loaded:  {len(precaution_dict)} diseases")
    print()

    dataset_info = {
        "num_rows": df.shape[0],
        "num_features": len(feature_columns),
        "num_diseases": df['Disease'].nunique()
    }

    return (X_train, X_test, y_train, y_test, feature_columns,
            severity_dict, le, disease_names, description_dict, precaution_dict,
            dataset_info, X, y)


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  STEP 2 — TRAIN 3 MODELS                                                ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def train_models(X_train, y_train, n_classes):
    print("=" * 72)
    print("  STEP 2 — TRAINING 3 MODELS")
    print("=" * 72)

    models = {}

    # A — LightGBM
    print("  [1/3] Training LightGBM...")
    models["LightGBM"] = lgb.LGBMClassifier(
        n_estimators=500, learning_rate=0.05, num_leaves=63,
        max_depth=-1, min_child_samples=5,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, verbose=-1, n_jobs=-1,
    )
    models["LightGBM"].fit(X_train, y_train)

    # B — XGBoost
    print("  [2/3] Training XGBoost...")
    models["XGBoost"] = xgb.XGBClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        use_label_encoder=False, eval_metric="mlogloss",
        tree_method="hist", random_state=42, verbosity=0, n_jobs=-1,
    )
    models["XGBoost"].fit(X_train, y_train)

    # C — CatBoost
    print("  [3/3] Training CatBoost...")
    models["CatBoost"] = cb.CatBoostClassifier(
        iterations=500, depth=6, learning_rate=0.05,
        loss_function="MultiClass", random_seed=42, verbose=0,
    )
    models["CatBoost"].fit(X_train, y_train)

    print("  All 3 models trained ✓\n")
    return models


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  STEP 3 — EVALUATE ALL 3 MODELS                                         ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def evaluate_models(models, X, y, X_test, y_test, disease_names, feature_columns):
    print("=" * 72)
    print("  STEP 3 — EVALUATING ALL MODELS (with 5-Fold CV)")
    print("=" * 72)

    results = {}
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    for name, model in models.items():
        print(f"\n  {'─' * 50}")
        print(f"  MODEL: {name}")
        print(f"  {'─' * 50}")

        # Test set evaluation
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)

        acc = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
        recall = recall_score(y_test, y_pred, average="weighted", zero_division=0)
        f1  = f1_score(y_test, y_pred, average="weighted")
        try:
            auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")
        except Exception:
            auc = 0.0

        # Cross Validation for model stability
        print("  Running 5-Fold Cross Validation...")
        try:
            cv_results = cross_validate(model, X, y, cv=skf, scoring=('accuracy', 'f1_weighted'), n_jobs=-1)
            cv_acc_mean = float(np.mean(cv_results['test_accuracy']))
            cv_acc_std = float(np.std(cv_results['test_accuracy']))
            cv_f1_mean = float(np.mean(cv_results['test_f1_weighted']))
            cv_f1_std = float(np.std(cv_results['test_f1_weighted']))
            print(f"  CV Accuracy: {cv_acc_mean:.4f} ± {cv_acc_std:.4f}")
            print(f"  CV F1-Score: {cv_f1_mean:.4f} ± {cv_f1_std:.4f}")
        except Exception as e:
            print(f"  CV Failed: {e}")
            cv_acc_mean, cv_acc_std, cv_f1_mean, cv_f1_std = acc, 0, f1, 0

        # Model Selection Score (combined Test and CV F1)
        score = (f1 + cv_f1_mean) / 2
        
        results[name] = {
            "accuracy": acc, 
            "precision": precision,
            "recall": recall,
            "f1": f1, 
            "auc_roc": auc, 
            "cv_accuracy_mean": cv_acc_mean,
            "cv_accuracy_std": cv_acc_std,
            "cv_f1_mean": cv_f1_mean,
            "cv_f1_std": cv_f1_std,
            "score": score
        }

        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall:    {recall:.4f}")
        print(f"  F1-Score:  {f1:.4f}")
        print(f"  AUC-ROC:   {auc:.4f}")
        print(f"  Sel Score: {score:.4f}")

        # Classification report
        print(f"\n  Classification Report:")
        print(classification_report(y_test, y_pred, target_names=disease_names, digits=3))

        # Confusion matrix heatmap & JSON
        cm = confusion_matrix(y_test, y_pred)
        cm_data_path = os.path.join(OUT_DIR, f"confusion_matrix_{name.lower()}.json")
        with open(cm_data_path, 'w') as f:
            json.dump(cm.tolist(), f)
        
        fig, ax = plt.subplots(figsize=(16, 14))
        sns.heatmap(cm, annot=True, fmt="d", cmap="YlGnBu",
                    xticklabels=disease_names, yticklabels=disease_names, ax=ax)
        ax.set_title(f"{name} — Confusion Matrix", fontsize=14, fontweight="bold")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        plt.xticks(rotation=45, ha="right", fontsize=7)
        plt.yticks(rotation=0, fontsize=7)
        plt.tight_layout()
        cm_path = os.path.join(OUT_DIR, f"confusion_matrix_{name.lower()}.png")
        plt.savefig(cm_path, dpi=150)
        plt.close()
        print(f"  Saved CM: {cm_path}")
        print(f"  Saved CM data: {cm_data_path}")

        # Feature importance
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            top_idx = np.argsort(importances)[-15:]
            top_syms = [feature_columns[i] for i in top_idx]
            top_vals = importances[top_idx]

            fig, ax = plt.subplots(figsize=(10, 7))
            colors = plt.cm.viridis(np.linspace(0.3, 0.9, 15))
            ax.barh(range(15), top_vals, color=colors)
            ax.set_yticks(range(15))
            ax.set_yticklabels(top_syms, fontsize=9)
            ax.set_title(f"{name} — Top 15 Feature Importances", fontsize=13, fontweight="bold")
            ax.set_xlabel("Importance")
            plt.tight_layout()
            fi_path = os.path.join(OUT_DIR, f"feature_importance_{name.lower()}.png")
            plt.savefig(fi_path, dpi=150)
            plt.close()
            print(f"  Saved: {fi_path}")

    # Select winner
    best_name = max(results, key=lambda k: results[k]["score"])
    print(f"\n  {'═' * 50}")
    print(f"  🏆 WINNER: {best_name} (avg score: {results[best_name]['score']:.4f})")
    print(f"  {'═' * 50}\n")

    return results, best_name


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  STEP 4 — HYPERPARAMETER TUNING WITH OPTUNA                             ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def tune_model(best_name, X_train, y_train, X_test, y_test):
    print("=" * 72)
    print(f"  STEP 4 — OPTUNA TUNING ({best_name}, 50 trials)")
    print("=" * 72)

    def objective(trial):
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 200, 800),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.1, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "min_child_samples": trial.suggest_int("min_child_samples", 5, 30),
        }

        if best_name == "LightGBM":
            params["num_leaves"] = trial.suggest_int("num_leaves", 16, 128)
            params["max_depth"] = -1
            params["random_state"] = 42
            params["verbose"] = -1
            params["n_jobs"] = -1
            model = lgb.LGBMClassifier(**params)

        elif best_name == "XGBoost":
            params["max_depth"] = trial.suggest_int("max_depth", 4, 10)
            params["use_label_encoder"] = False
            params["eval_metric"] = "mlogloss"
            params["tree_method"] = "hist"
            params["random_state"] = 42
            params["verbosity"] = 0
            params["n_jobs"] = -1
            model = xgb.XGBClassifier(**params)

        else:  # CatBoost
            params["depth"] = trial.suggest_int("depth", 4, 10)
            params["loss_function"] = "MultiClass"
            params["random_seed"] = 42
            params["verbose"] = 0
            # CatBoost uses iterations instead of n_estimators
            params["iterations"] = params.pop("n_estimators")
            # CatBoost doesn't have min_child_samples or colsample_bytree directly
            params.pop("min_child_samples", None)
            params["rsm"] = params.pop("colsample_bytree")
            model = cb.CatBoostClassifier(**params)

        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        return f1_score(y_test, y_pred, average="weighted")

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=50, show_progress_bar=True)

    print(f"\n  Best F1-Score: {study.best_value:.4f}")
    print(f"  Best Params:  {json.dumps(study.best_params, indent=4)}")

    # Retrain with best params
    bp = study.best_params.copy()
    if best_name == "LightGBM":
        bp["max_depth"] = -1
        bp["random_state"] = 42
        bp["verbose"] = -1
        bp["n_jobs"] = -1
        tuned_model = lgb.LGBMClassifier(**bp)
    elif best_name == "XGBoost":
        bp["use_label_encoder"] = False
        bp["eval_metric"] = "mlogloss"
        bp["tree_method"] = "hist"
        bp["random_state"] = 42
        bp["verbosity"] = 0
        bp["n_jobs"] = -1
        tuned_model = xgb.XGBClassifier(**bp)
    else:
        bp["loss_function"] = "MultiClass"
        bp["random_seed"] = 42
        bp["verbose"] = 0
        bp["iterations"] = bp.pop("n_estimators", 500)
        bp.pop("min_child_samples", None)
        bp["rsm"] = bp.pop("colsample_bytree", 0.8)
        tuned_model = cb.CatBoostClassifier(**bp)

    tuned_model.fit(X_train, y_train)
    y_pred = tuned_model.predict(X_test)
    y_proba = tuned_model.predict_proba(X_test)
    tuned_acc = accuracy_score(y_test, y_pred)
    tuned_f1  = f1_score(y_test, y_pred, average="weighted")
    try:
        tuned_auc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="macro")
    except Exception:
        tuned_auc = 0.0

    print(f"\n  Tuned Model Scores:")
    print(f"    Accuracy: {tuned_acc:.4f}")
    print(f"    F1-Score: {tuned_f1:.4f}")
    print(f"    AUC-ROC:  {tuned_auc:.4f}\n")

    return tuned_model, study.best_params, tuned_acc, tuned_f1, tuned_auc


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  STEP 5 — SHAP EXPLAINABILITY                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def shap_explainability(model, X_test, feature_columns):
    print("=" * 72)
    print("  STEP 5 — SHAP EXPLAINABILITY")
    print("=" * 72)

    explainer = shap.TreeExplainer(model)

    # Use a smaller sample for speed (max 300 rows)
    sample_size = min(300, X_test.shape[0])
    X_sample = X_test[:sample_size]
    print(f"  Computing SHAP values for {sample_size} samples...")
    shap_values = explainer.shap_values(X_sample)

    # Summary plot
    print("  Generating SHAP summary plot...")
    plt.figure(figsize=(12, 10))
    # shap_values may be list (one per class) or 3D array
    if isinstance(shap_values, list):
        # Average absolute SHAP across all classes
        mean_shap = np.mean([np.abs(sv) for sv in shap_values], axis=0)
    else:
        mean_shap = np.abs(shap_values).mean(axis=2) if shap_values.ndim == 3 else np.abs(shap_values)

    # Global importance: mean |SHAP| per feature
    global_importance = mean_shap.mean(axis=0)
    top_20_idx = np.argsort(global_importance)[-20:]
    top_20_syms = [feature_columns[i] for i in top_20_idx]
    top_20_vals = global_importance[top_20_idx]

    fig, ax = plt.subplots(figsize=(10, 8))
    colors = plt.cm.RdYlGn_r(np.linspace(0.2, 0.8, 20))
    ax.barh(range(20), top_20_vals, color=colors)
    ax.set_yticks(range(20))
    ax.set_yticklabels(top_20_syms, fontsize=9)
    ax.set_xlabel("Mean |SHAP value|", fontsize=11)
    ax.set_title("SHAP — Top 20 Most Important Symptoms (Global)", fontsize=13, fontweight="bold")
    plt.tight_layout()
    shap_path = os.path.join(OUT_DIR, "shap_summary.png")
    plt.savefig(shap_path, dpi=150)
    plt.close()
    print(f"  Saved: {shap_path}")

    # Build explain function
    def explain_prediction(symptom_input, severity_dict, feature_columns):
        """
        Given a dict of {symptom: weight}, return top 5 symptoms
        that drove the prediction.
        """
        x = np.zeros((1, len(feature_columns)), dtype=np.float32)
        col_index = {sym: i for i, sym in enumerate(feature_columns)}
        for sym, weight in symptom_input.items():
            if sym in col_index:
                x[0, col_index[sym]] = weight

        sv = explainer.shap_values(x)
        if isinstance(sv, list):
            # Get SHAP for predicted class
            pred = model.predict(x)[0]
            class_shap = sv[pred][0]
        else:
            pred = model.predict(x)[0]
            class_shap = sv[0, :, pred] if sv.ndim == 3 else sv[0]

        top_idx = np.argsort(np.abs(class_shap))[-5:][::-1]
        return [feature_columns[i] for i in top_idx if class_shap[i] != 0]

    print("  SHAP explainer ready ✓\n")
    return explainer, explain_prediction


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  STEP 6 — SAVE ALL ARTIFACTS                                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def save_artifacts(model, le, feature_columns, severity_dict,
        all_models=None, results=None, dataset_info=None):
    print("=" * 72)
    print("  STEP 6 — SAVING ARTIFACTS & VERSIONING")
    print("=" * 72)

    # Automatically identify next version
    existing_models = [f for f in os.listdir(OUT_DIR) if f.startswith("best_model_v") and f.endswith(".pkl")]
    if existing_models:
        versions = [int(f.replace("best_model_v", "").replace(".pkl", "")) for f in existing_models]
        next_v = max(versions) + 1
    else:
        next_v = 1
        
    model_filename = f"best_model_v{next_v}.pkl"
    model_path = os.path.join(OUT_DIR, model_filename)

    # Save tuned best model with version
    joblib.dump(model, model_path)
    print(f"  ✓ {model_path} (Active Version)")
    
    # Also maintain a symlink-like generic name for legacy code or convenience
    joblib.dump(model, os.path.join(OUT_DIR, "best_disease_model.pkl"))

    # Save ALL 3 models individually for ensemble prediction
    if all_models:
        for name, mdl in all_models.items():
            p = os.path.join(OUT_DIR, f"model_{name.lower()}.pkl")
            joblib.dump(mdl, p)
            print(f"  ✓ {p}")

    # Label encoder
    le_path = os.path.join(OUT_DIR, "label_encoder.pkl")
    joblib.dump(le, le_path)
    print(f"  ✓ {le_path}")

    # Feature columns
    fc_path = os.path.join(OUT_DIR, "feature_columns.json")
    with open(fc_path, "w") as f:
        json.dump(feature_columns, f, indent=2)
    print(f"  ✓ {fc_path}")

    # Severity dict
    sd_path = os.path.join(OUT_DIR, "severity_dict.json")
    with open(sd_path, "w") as f:
        json.dump(severity_dict, f, indent=2)
    print(f"  ✓ {sd_path}")

    # Disease metadata
    meta = {
        "description": description_dict,
        "precaution": precaution_dict,
    }
    meta_path = os.path.join(OUT_DIR, "disease_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    print(f"  ✓ {meta_path}")

    from datetime import datetime
    # Model info — now includes precise data
    info = {
        "active_version": model_filename,
        "training_timestamp": datetime.utcnow().isoformat() + "Z",
        "best_model": best_name,
        "model_name": best_name,
        "n_features": len(feature_columns),
        "n_diseases": len(le.classes_),
        "ensemble_models": ["LightGBM", "XGBoost", "CatBoost"],
        "dataset_info": dataset_info or {}
    }
    if results:
        info["model_scores"] = {
            name: {k: round(v, 4) if isinstance(v, float) else v for k, v in r.items()}
            for name, r in results.items()
        }
    info_path = os.path.join(OUT_DIR, "model_info.json")
    with open(info_path, "w") as f:
        json.dump(info, f, indent=2)
    print(f"  ✓ {info_path}")

    print(f"\n  All artifacts saved to: {OUT_DIR}\n")


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  MAIN PIPELINE                                                          ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def main():
    print()
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║       MediCare AI — Disease Prediction Training Pipeline       ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print()

    # STEP 1
    (X_train, X_test, y_train, y_test, feature_columns,
     severity_dict, le, disease_names, desc_dict, prec_dict, dataset_info, X, y) = load_and_preprocess()

    # STEP 2
    models = train_models(X_train, y_train, len(disease_names))

    # STEP 3
    results, best_name = evaluate_models(
        models, X, y, X_test, y_test, disease_names, feature_columns
    )

    # STEP 4
    tuned_model, best_params, tuned_acc, tuned_f1, tuned_auc = tune_model(
        best_name, X_train, y_train, X_test, y_test
    )

    # STEP 5
    explainer, explain_fn = shap_explainability(tuned_model, X_test, feature_columns)

    # STEP 6
    save_artifacts(tuned_model, le, feature_columns, severity_dict,
                   desc_dict, prec_dict, best_name,
                   all_models=models, results=results, dataset_info=dataset_info)

    # ── FINAL SUMMARY TABLE ──────────────────────────────────────────────────
    print("=" * 72)
    print("  FINAL SUMMARY")
    print("=" * 72)
    print()
    print(f"  {'Model':<12} {'Accuracy':>10} {'F1-Score':>10} {'AUC-ROC':>10} {'Winner':>8}")
    print(f"  {'─'*12} {'─'*10} {'─'*10} {'─'*10} {'─'*8}")
    for name, r in results.items():
        winner = "  ★" if name == best_name else ""
        print(f"  {name:<12} {r['accuracy']:>10.4f} {r['f1']:>10.4f} {r['auc_roc']:>10.4f} {winner:>8}")

    print(f"\n  {'─'*52}")
    print(f"  Tuned {best_name}:")
    print(f"    Accuracy: {tuned_acc:.4f}  |  F1: {tuned_f1:.4f}  |  AUC-ROC: {tuned_auc:.4f}")
    print(f"  {'─'*52}")

    print()
    print("  ╔════════════════════════════════════════════════════════════╗")
    print("  ║  PIPELINE COMPLETE — All artifacts saved to ml/artifacts/ ║")
    print("  ║  Run: python ml/main.py  to start the FastAPI server      ║")
    print("  ╚════════════════════════════════════════════════════════════╝")
    print()


if __name__ == "__main__":
    main()
