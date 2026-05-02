"""
ai/who_engine.py
────────────────────────────────────────────
WHO Epidemiological Data Engine

Loads 19 WHO CSV datasets from medicare-ai/who_data/
and builds a country risk profile used to adjust
ML prediction confidence based on real-world disease
prevalence in the user's country.

WHO CSV columns used:
  SpatialDimValueCode  → ISO3 country code
  Location             → Country name
  Period               → Year (numeric)
  FactValueNumeric     → Numeric value
  Dim1                 → Sex (Both sexes / Male / Female)
  ParentLocationCode   → WHO region code
"""

import pickle
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────
# who_engine.py lives at: medicare-backend/ai/who_engine.py
# who_data lives at:      medicare-ai/who_data/
_HERE    = Path(__file__).parent             # medicare-backend/ai/
BASE     = _HERE.parent                      # medicare-backend/
WHO_DIR  = _HERE.parent.parent / "who_data"  # medicare-ai/who_data/
MODELS   = BASE / "ai" / "models"

CACHE_PKL = MODELS / "who_profiles.pkl"

# ── WHO file → indicator config ────────────────────
# NOTE: filenames use actual spaces as on disk
WHO_FILES = {
    "adult_mortality": {
        "file": "Adult mortality rate.csv",
        "description": "Adult mortality rate (per 1000)",
        "high_means_risk": True,
        "scale": 1000.0,
        "weight": 0.08,
    },
    "air_pollution_deaths": {
        "file": "Air pollution death rate.csv",
        "description": "Air pollution death rate (per 100k)",
        "high_means_risk": True,
        "scale": 100.0,
        "weight": 0.06,
    },
    "alcohol_consumption": {
        "file": "Alcohol consumption.csv",
        "description": "Alcohol consumption (litres/capita)",
        "high_means_risk": True,
        "scale": 20.0,
        "weight": 0.05,
    },
    "cardiovascular_mortality": {
        "file": "Cardiovascular disease mortality.csv",
        "description": "Cardiovascular disease mortality %",
        "high_means_risk": True,
        "scale": 40.0,
        "weight": 0.10,
    },
    "child_mortality": {
        "file": "Child mortality rate.csv",
        "description": "Child mortality rate (per 1000)",
        "high_means_risk": True,
        "scale": 150.0,
        "weight": 0.05,
    },
    "respiratory_mortality": {
        "file": "Chronic respiratory disease mortality.csv",
        "description": "Chronic respiratory disease mortality",
        "high_means_risk": True,
        "scale": 50.0,
        "weight": 0.07,
    },
    "diabetes_prevalence": {
        "file": "Diabetes prevalence (%).csv",
        "description": "Diabetes prevalence %",
        "high_means_risk": True,
        "scale": 25.0,
        "weight": 0.09,
    },
    "hepatitis_prevalence": {
        "file": "Hepatitis prevalence.csv",
        "description": "Hepatitis prevalence",
        "high_means_risk": True,
        "scale": 10.0,
        "weight": 0.06,
    },
    "hiv_prevalence": {
        "file": "HIV prevalence.csv",
        "description": "HIV prevalence % (15-49)",
        "high_means_risk": True,
        "scale": 30.0,
        "weight": 0.07,
    },
    "hiv_new_infections": {
        "file": "HIV infections new.csv",
        "description": "New HIV infections (per 100k)",
        "high_means_risk": True,
        "scale": 500.0,
        "weight": 0.04,
    },
    "hypertension_prevalence": {
        "file": "Hypertension prevalence.csv",
        "description": "Hypertension prevalence %",
        "high_means_risk": True,
        "scale": 50.0,
        "weight": 0.09,
    },
    "life_expectancy": {
        "file": "Life expectancy.csv",
        "description": "Healthy life expectancy (years)",
        "high_means_risk": False,  # high LE = low risk
        "scale": 80.0,
        "weight": 0.08,
    },
    "malaria_incidence": {
        "file": "Malaria incidence.csv",
        "description": "Malaria incidence (per 1000)",
        "high_means_risk": True,
        "scale": 500.0,
        "weight": 0.06,
    },
    "malaria_mortality": {
        "file": "Malaria mortality rate.csv",
        "description": "Malaria mortality rate (per 100k)",
        "high_means_risk": True,
        "scale": 100.0,
        "weight": 0.04,
    },
    "road_traffic_deaths": {
        "file": "Road traffic deaths.csv",
        "description": "Road traffic deaths (per 100k)",
        "high_means_risk": True,
        "scale": 40.0,
        "weight": 0.04,
    },
    "tobacco_use": {
        "file": "Tobacco use prevalence.csv",
        "description": "Tobacco use prevalence %",
        "high_means_risk": True,
        "scale": 60.0,
        "weight": 0.07,
    },
    "tuberculosis_incidence": {
        "file": "Tuberculosis (TB) incidence.csv",
        "description": "TB incidence (per 100k)",
        "high_means_risk": True,
        "scale": 500.0,
        "weight": 0.06,
    },
}

# Regional file (separate handling — no country codes)
REGIONAL_FILE = "Infectious disease prevalence by region.csv"

# WHO region display names
WHO_REGIONS = {
    "AFR":  "African Region",
    "AMR":  "Region of the Americas",
    "EMR":  "Eastern Mediterranean Region",
    "EUR":  "European Region",
    "SEAR": "South-East Asia Region",
    "WPR":  "Western Pacific Region",
}

# Disease → relevant WHO indicator weights
# Extra multipliers stacked on top of base indicator weights
DISEASE_WHO_WEIGHTS = {
    "Diabetes": {
        "diabetes_prevalence": 1.5,
        "hypertension_prevalence": 0.8,
        "alcohol_consumption": 0.5,
    },
    "Hypertension": {
        "hypertension_prevalence": 1.5,
        "cardiovascular_mortality": 1.0,
        "tobacco_use": 0.8,
    },
    "Tuberculosis": {
        "tuberculosis_incidence": 1.5,
        "hiv_prevalence": 0.9,
        "adult_mortality": 0.6,
    },
    "Malaria": {
        "malaria_incidence": 1.5,
        "malaria_mortality": 1.2,
        "child_mortality": 0.5,
    },
    "HIV/AIDS": {
        "hiv_prevalence": 1.5,
        "hiv_new_infections": 1.2,
        "adult_mortality": 0.6,
    },
    "Hepatitis": {
        "hepatitis_prevalence": 1.5,
        "adult_mortality": 0.5,
    },
    "Heart Disease": {
        "cardiovascular_mortality": 1.5,
        "hypertension_prevalence": 0.9,
        "tobacco_use": 0.7,
    },
    "Chronic Respiratory": {
        "respiratory_mortality": 1.5,
        "air_pollution_deaths": 1.2,
        "tobacco_use": 0.8,
    },
    "Bronchial Asthma": {
        "respiratory_mortality": 1.2,
        "air_pollution_deaths": 1.0,
        "tobacco_use": 0.6,
    },
    "Pneumonia": {
        "air_pollution_deaths": 0.8,
        "child_mortality": 0.6,
        "adult_mortality": 0.5,
    },
    "Dengue": {
        "malaria_incidence": 0.5,
    },
    "Alcoholic Hepatitis": {
        "alcohol_consumption": 1.5,
        "hepatitis_prevalence": 0.8,
    },
}


# ── Internal CSV loader ────────────────────────────

def _load_single_who_file(
    file_path: Path,
    indicator_key: str,
) -> pd.DataFrame:
    """
    Load one WHO CSV and extract the latest value
    per country (preferring Both sexes dimension).
    Returns DataFrame with columns:
      country_code, country_name, value, year, region, indicator
    """
    try:
        df = pd.read_csv(file_path, low_memory=False)
    except Exception as e:
        log.warning(f"Cannot read {file_path.name}: {e}")
        return pd.DataFrame()

    required = ["SpatialDimValueCode", "Location", "Period", "FactValueNumeric"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        log.warning(f"{file_path.name}: missing columns {missing}")
        return pd.DataFrame()

    # Drop rows with no numeric value
    df = df.dropna(subset=["FactValueNumeric"])
    df["FactValueNumeric"] = pd.to_numeric(df["FactValueNumeric"], errors="coerce")
    df = df.dropna(subset=["FactValueNumeric"])

    # Coerce to string first (some files store code as numeric/mixed)
    df["SpatialDimValueCode"] = df["SpatialDimValueCode"].astype(str)
    # Filter out aggregate rows (keep only real ISO3 codes: 3 uppercase letters)
    df = df[df["SpatialDimValueCode"].str.match(r"^[A-Z]{3}$", na=False)]

    # Prefer "Both sexes" rows where sex dimension exists
    if "Dim1" in df.columns:
        df["Dim1"] = df["Dim1"].astype(str)
        both = df[df["Dim1"].str.contains(
            r"Both|both|BTSX|Total|total|All", na=False, regex=True
        )]
        if not both.empty:
            df = both

    # Numeric period; keep latest year per country
    df["Period"] = pd.to_numeric(df["Period"], errors="coerce")
    df = df.dropna(subset=["Period"])
    df = df.sort_values("Period", ascending=False)
    df = df.drop_duplicates(subset=["SpatialDimValueCode"], keep="first")

    result = df[["SpatialDimValueCode", "Location", "FactValueNumeric", "Period"]].copy()
    result.columns = ["country_code", "country_name", "value", "year"]

    result["region"] = (
        df["ParentLocationCode"].values
        if "ParentLocationCode" in df.columns
        else "UNKNOWN"
    )
    result["indicator"] = indicator_key
    result["country_code"] = result["country_code"].astype(str).str.strip().str.upper()

    return result


# ── Profile builder ───────────────────────────────

def build_who_profiles(force_rebuild: bool = False) -> dict:
    """
    Load all WHO CSVs and build a country profile dict:
    {
      "IND": {
        "country_name": "India",
        "region": "SEAR",
        "region_name": "South-East Asia Region",
        "indicators": {"diabetes_prevalence": 9.8, ...},
        "risk_score": 0.62,
        "risk_level": "High",
        "n_indicators": 15,
      },
      ...
    }
    """
    if not force_rebuild and CACHE_PKL.exists():
        try:
            with open(CACHE_PKL, "rb") as f:
                profiles = pickle.load(f)
            log.info(f"Loaded WHO profiles from cache ({len(profiles)} countries)")
            return profiles
        except Exception:
            pass  # cache corrupt, rebuild

    log.info("Building WHO country profiles...")

    if not WHO_DIR.exists():
        log.error(f"who_data directory not found: {WHO_DIR}")
        return {}

    # Load each indicator file
    all_data: list[pd.DataFrame] = []
    for indicator_key, config in WHO_FILES.items():
        fp = WHO_DIR / config["file"]
        if not fp.exists():
            log.warning(f"  WHO file not found: {config['file']}")
            continue
        df = _load_single_who_file(fp, indicator_key)
        if not df.empty:
            all_data.append(df)
            log.info(f"  {indicator_key}: {len(df)} countries")

    if not all_data:
        log.error("No WHO data loaded. Check who_data/ directory.")
        return {}

    combined = pd.concat(all_data, ignore_index=True)

    # Build per-country profile dict
    profiles: dict = {}
    for country_code, grp in combined.groupby("country_code"):
        country_name = grp["country_name"].iloc[0]
        region = str(grp["region"].iloc[0]) if "region" in grp.columns else "UNKNOWN"

        indicators = {
            row["indicator"]: float(row["value"])
            for _, row in grp.iterrows()
        }

        risk_score = _compute_country_risk_score(indicators)

        if risk_score >= 0.70:
            risk_level = "Very High"
        elif risk_score >= 0.50:
            risk_level = "High"
        elif risk_score >= 0.30:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        profiles[str(country_code)] = {
            "country_name":  country_name,
            "region":        region,
            "region_name":   WHO_REGIONS.get(region, region),
            "indicators":    indicators,
            "risk_score":    round(risk_score, 4),
            "risk_level":    risk_level,
            "n_indicators":  len(indicators),
        }

    log.info(f"Built profiles for {len(profiles)} countries")

    # Cache to disk
    MODELS.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PKL, "wb") as f:
        pickle.dump(profiles, f)
    log.info(f"Saved WHO profiles to {CACHE_PKL}")

    return profiles


def _compute_country_risk_score(indicators: dict) -> float:
    """Composite 0-1 risk score weighted across all available indicators."""
    total_w = 0.0
    weighted_sum = 0.0

    for key, config in WHO_FILES.items():
        if key not in indicators:
            continue
        val = indicators[key]
        normalized = min(val / config["scale"], 1.0)
        if not config["high_means_risk"]:
            normalized = 1.0 - normalized
        w = config["weight"]
        weighted_sum += normalized * w
        total_w += w

    return (weighted_sum / total_w) if total_w > 0 else 0.5


def _compute_disease_specific_risk(
    indicators: dict,
    disease_weights: dict,
) -> float:
    """Risk score weighted specifically for one disease's relevant indicators."""
    total_w = 0.0
    weighted = 0.0

    for ind_key, extra_w in disease_weights.items():
        if ind_key not in indicators:
            continue
        config = WHO_FILES.get(ind_key)
        if not config:
            continue
        val = indicators[ind_key]
        normalized = min(val / config["scale"], 1.0)
        if not config["high_means_risk"]:
            normalized = 1.0 - normalized
        w = config["weight"] * extra_w
        weighted += normalized * w
        total_w += w

    return min(weighted / total_w, 1.0) if total_w > 0 else 0.5


# ── Public API ────────────────────────────────────

def get_country_profile(
    country_code: str,
    profiles: Optional[dict] = None,
) -> Optional[dict]:
    """Get WHO profile for an ISO3 country code."""
    if profiles is None:
        profiles = build_who_profiles()
    return profiles.get(country_code.strip().upper())


def get_who_adjustment(
    predicted_disease: str,
    country_code: str,
    base_confidence: float,
    profiles: Optional[dict] = None,
) -> dict:
    """
    Compute WHO-adjusted confidence for a predicted disease in a country.

    Returns dict with:
      adjusted_confidence, who_risk_score, who_risk_level,
      country_name, region, relevant_indicators,
      adjustment_factor, adjustment_reason
    """
    if profiles is None:
        profiles = build_who_profiles()

    profile = get_country_profile(country_code, profiles)
    if not profile:
        return {
            "adjusted_confidence":  base_confidence,
            "who_risk_score":       None,
            "who_risk_level":       "Unknown",
            "country_name":         country_code,
            "region":               "Unknown",
            "relevant_indicators":  {},
            "adjustment_factor":    1.0,
            "adjustment_reason":    "No WHO data available for this country.",
        }

    indicators   = profile["indicators"]
    country_risk = profile["risk_score"]

    # Find disease-specific weights (case-insensitive partial match)
    disease_weights = None
    disease_lower = predicted_disease.lower()
    for dis_key, weights in DISEASE_WHO_WEIGHTS.items():
        if dis_key.lower() in disease_lower or disease_lower in dis_key.lower():
            disease_weights = weights
            break

    # Blend general + disease-specific risk
    if disease_weights:
        disease_risk = _compute_disease_specific_risk(indicators, disease_weights)
        final_risk = country_risk * 0.3 + disease_risk * 0.7
    else:
        final_risk = country_risk

    # Compute adjustment factor (±20% max)
    if final_risk >= 0.60:
        adjustment = 1.0 + (final_risk - 0.6) * 0.5
        reason = (
            f"Country has elevated {predicted_disease} burden — "
            f"confidence boosted by WHO data."
        )
    elif final_risk <= 0.25:
        adjustment = 1.0 - (0.25 - final_risk) * 0.4
        reason = (
            f"Low disease burden in {profile['country_name']} — "
            f"confidence slightly adjusted."
        )
    else:
        adjustment = 1.0
        reason = f"{profile['country_name']} shows moderate disease risk."

    adjustment = max(0.80, min(1.20, adjustment))
    adjusted = round(min(99.0, max(10.0, base_confidence * adjustment)), 1)

    # Collect relevant indicators for display
    relevant: dict = {}
    if disease_weights:
        for ind_key in disease_weights:
            if ind_key in indicators:
                desc = WHO_FILES[ind_key]["description"]
                relevant[desc] = round(indicators[ind_key], 2)
    else:
        # Top 5 by weight
        top = sorted(WHO_FILES.items(), key=lambda x: x[1]["weight"], reverse=True)[:5]
        for k, cfg in top:
            if k in indicators:
                relevant[cfg["description"]] = round(indicators[k], 2)

    return {
        "adjusted_confidence":  adjusted,
        "who_risk_score":       round(final_risk, 3),
        "who_risk_level":       profile["risk_level"],
        "country_name":         profile["country_name"],
        "region":               profile["region_name"],
        "relevant_indicators":  relevant,
        "adjustment_factor":    round(adjustment, 3),
        "adjustment_reason":    reason,
    }


def get_regional_infectious_context(region: str) -> dict:
    """Get infectious disease burden for a WHO region."""
    fp = WHO_DIR / REGIONAL_FILE
    if not fp.exists():
        return {}
    try:
        df = pd.read_csv(fp, low_memory=False)
        if "ParentLocationCode" in df.columns:
            sub = df[df["ParentLocationCode"] == region]
            if not sub.empty and "FactValueNumeric" in df.columns:
                avg = pd.to_numeric(sub["FactValueNumeric"], errors="coerce").mean()
                if not np.isnan(avg):
                    return {"region_infectious_burden": round(float(avg), 2)}
    except Exception:
        pass
    return {}


def list_available_countries(profiles: Optional[dict] = None) -> list:
    """Return sorted list of countries with WHO data for frontend dropdown."""
    if profiles is None:
        profiles = build_who_profiles()
    return sorted(
        [
            {
                "code":       code,
                "name":       p["country_name"],
                "region":     p["region_name"],
                "risk_level": p["risk_level"],
            }
            for code, p in profiles.items()
        ],
        key=lambda x: x["name"],
    )
