"""
health_intelligence/normalization/symptom_normalizer.py
───────────────────────────────────────────────
Unified symptom normalization engine for the Health
Intelligence Core.

Responsibilities:
  1. Text cleanup — lowercase, strip, remove punctuation
  2. Alias resolution — map common synonyms to canonical names
  3. Fuzzy matching — tolerate minor typos
  4. Extraction — pull known symptoms from free text

The CANONICAL_SYMPTOMS list is derived directly from the
trained LightGBM model's 131 feature names. The ALIAS_MAP
is built from analysis of dataset inconsistencies across
Training.csv, Symptom-severity.csv, and Symptom2Disease.csv.
"""

import logging
import re
from difflib import get_close_matches
from typing import Optional

log = logging.getLogger(__name__)


# ── 131 canonical symptom names (from feature_names.pkl) ──────
# These are the ONLY valid symptom identifiers the ML model accepts.
# Everything else must be mapped or rejected.

CANONICAL_SYMPTOMS: list[str] = [
    "abdominal_pain", "abnormal_menstruation", "acidity",
    "acute_liver_failure", "altered_sensorium", "anxiety",
    "back_pain", "belly_pain", "blackheads", "bladder_discomfort",
    "blister", "blood_in_sputum", "bloody_stool",
    "blurred_and_distorted_vision", "breathlessness", "brittle_nails",
    "bruising", "burning_micturition", "chest_pain", "chills",
    "cold_hands_and_feets", "coma", "congestion", "constipation",
    "continuous_feel_of_urine", "continuous_sneezing", "cough",
    "cramps", "dark_urine", "dehydration", "depression", "diarrhoea",
    "dischromic__patches", "distention_of_abdomen", "dizziness",
    "drying_and_tingling_lips", "enlarged_thyroid", "excessive_hunger",
    "extra_marital_contacts", "family_history", "fast_heart_rate",
    "fatigue", "fluid_overload", "foul_smell_of_urine", "headache",
    "high_fever", "hip_joint_pain", "history_of_alcohol_consumption",
    "increased_appetite", "indigestion", "inflammatory_nails",
    "internal_itching", "irregular_sugar_level", "irritability",
    "irritation_in_anus", "itching", "joint_pain", "knee_pain",
    "lack_of_concentration", "lethargy", "loss_of_appetite",
    "loss_of_balance", "loss_of_smell", "malaise", "mild_fever",
    "mood_swings", "movement_stiffness", "mucoid_sputum",
    "muscle_pain", "muscle_wasting", "muscle_weakness", "nausea",
    "neck_pain", "nodal_skin_eruptions", "obesity",
    "pain_behind_the_eyes", "pain_during_bowel_movements",
    "pain_in_anal_region", "painful_walking", "palpitations",
    "passage_of_gases", "patches_in_throat", "phlegm", "polyuria",
    "prominent_veins_on_calf", "puffy_face_and_eyes",
    "pus_filled_pimples", "receiving_blood_transfusion",
    "receiving_unsterile_injections", "red_sore_around_nose",
    "red_spots_over_body", "redness_of_eyes", "restlessness",
    "runny_nose", "rusty_sputum", "scurring", "shivering",
    "silver_like_dusting", "sinus_pressure", "skin_peeling",
    "skin_rash", "slurred_speech", "small_dents_in_nails",
    "spinning_movements", "spotting__urination", "stiff_neck",
    "stomach_bleeding", "stomach_pain", "sunken_eyes", "sweating",
    "swelled_lymph_nodes", "swelling_joints", "swelling_of_stomach",
    "swollen_blood_vessels", "swollen_extremeties", "swollen_legs",
    "throat_irritation", "toxic_look_(typhos)", "ulcers_on_tongue",
    "unsteadiness", "visual_disturbances", "vomiting",
    "watering_from_eyes", "weakness_in_limbs",
    "weakness_of_one_body_side", "weight_gain", "weight_loss",
    "yellow_crust_ooze", "yellow_urine", "yellowing_of_eyes",
    "yellowish_skin",
]

_CANONICAL_SET: set[str] = set(CANONICAL_SYMPTOMS)


# ── Alias map ─────────────────────────────────────────────────
# Maps common synonyms, dataset inconsistencies, typos, and
# natural-language variations to canonical symptom names.
#
# Sources:
#   - Training.csv whitespace inconsistencies
#   - Symptom-severity.csv naming mismatches
#   - Symptom2Disease.csv free-text patterns
#   - Common layperson medical language

ALIAS_MAP: dict[str, str] = {
    # ── Dataset inconsistencies ──────────────────────────────
    "dischromic_patches": "dischromic__patches",
    "dischromic _patches": "dischromic__patches",
    "spotting_urination": "spotting__urination",
    "spotting_ urination": "spotting__urination",
    "foul_smell_ofurine": "foul_smell_of_urine",
    "foul_smell_of urine": "foul_smell_of_urine",
    "toxic_look_typhos": "toxic_look_(typhos)",
    "toxic_look_typhus": "toxic_look_(typhos)",
    "swollen_lymph_nodes": "swelled_lymph_nodes",
    "fluid_overload.1": "fluid_overload",

    # ── Natural-language aliases ─────────────────────────────
    # Fever & temperature
    "fever": "high_fever",
    "temperature": "high_fever",
    "body_hot": "high_fever",
    "high_temperature": "high_fever",
    "burning_up": "high_fever",
    "low_grade_fever": "mild_fever",
    "slight_fever": "mild_fever",

    # Pain
    "stomach_ache": "stomach_pain",
    "tummy_pain": "belly_pain",
    "tummy_ache": "belly_pain",
    "lower_back_pain": "back_pain",
    "body_ache": "muscle_pain",
    "body_pain": "muscle_pain",
    "aches": "muscle_pain",
    "sore_joints": "joint_pain",
    "pain_in_joints": "joint_pain",

    # Respiratory
    "difficulty_breathing": "breathlessness",
    "shortness_of_breath": "breathlessness",
    "short_of_breath": "breathlessness",
    "stuffy_nose": "congestion",
    "nasal_congestion": "congestion",
    "blocked_nose": "congestion",
    "sneezing": "continuous_sneezing",
    "running_nose": "runny_nose",
    "nose_running": "runny_nose",
    "sore_throat": "throat_irritation",
    "throat_pain": "throat_irritation",
    "mucus": "phlegm",
    "sputum": "phlegm",

    # Digestive
    "throwing_up": "vomiting",
    "puking": "vomiting",
    "feeling_sick": "nausea",
    "queasy": "nausea",
    "loose_stool": "diarrhoea",
    "loose_motion": "diarrhoea",
    "diarrhea": "diarrhoea",
    "no_appetite": "loss_of_appetite",
    "not_hungry": "loss_of_appetite",
    "bloating": "swelling_of_stomach",
    "gas": "passage_of_gases",
    "flatulence": "passage_of_gases",
    "heartburn": "acidity",
    "acid_reflux": "acidity",

    # Skin
    "rash": "skin_rash",
    "spots": "red_spots_over_body",
    "itchy": "itching",
    "itchy_skin": "itching",
    "peeling_skin": "skin_peeling",
    "blisters": "blister",

    # Neurological
    "vertigo": "dizziness",
    "lightheaded": "dizziness",
    "light_headed": "dizziness",
    "fainting": "dizziness",
    "cant_concentrate": "lack_of_concentration",
    "brain_fog": "lack_of_concentration",
    "speech_difficulty": "slurred_speech",

    # Cardiovascular
    "rapid_heartbeat": "fast_heart_rate",
    "racing_heart": "fast_heart_rate",
    "tachycardia": "fast_heart_rate",
    "heart_pounding": "palpitations",
    "heart_flutter": "palpitations",
    "swollen_feet": "swollen_legs",
    "edema": "swollen_legs",

    # General
    "tired": "fatigue",
    "tiredness": "fatigue",
    "exhaustion": "fatigue",
    "exhausted": "fatigue",
    "weakness": "weakness_in_limbs",
    "weak": "weakness_in_limbs",
    "sluggish": "lethargy",
    "lazy": "lethargy",
    "no_energy": "lethargy",
    "sleepless": "restlessness",
    "cant_sleep": "restlessness",
    "insomnia": "restlessness",
    "weight_change": "weight_loss",
    "losing_weight": "weight_loss",
    "gaining_weight": "weight_gain",

    # Eyes
    "blurred_vision": "blurred_and_distorted_vision",
    "blurry_vision": "blurred_and_distorted_vision",
    "red_eyes": "redness_of_eyes",
    "watery_eyes": "watering_from_eyes",
    "yellow_eyes": "yellowing_of_eyes",

    # Urinary
    "frequent_urination": "polyuria",
    "burning_urination": "burning_micturition",
    "painful_urination": "burning_micturition",
    "dark_pee": "dark_urine",
    "blood_in_urine": "dark_urine",

    # Mental
    "sad": "depression",
    "sadness": "depression",
    "anxious": "anxiety",
    "nervous": "anxiety",
    "irritable": "irritability",
    "mood_changes": "mood_swings",
    "emotional": "mood_swings",

    # Dehydration
    "thirsty": "dehydration",
    "dry_mouth": "dehydration",
    "excessive_thirst": "dehydration",
}


class SymptomNormalizer:
    """
    Normalizes raw symptom input into canonical symptom identifiers
    compatible with the trained LightGBM model.

    Normalization pipeline:
      1. clean_text()        — lowercase, strip, remove punctuation
      2. _resolve_alias()    — check ALIAS_MAP
      3. _fuzzy_match()      — difflib close-match as last resort
      4. normalize_symptoms()— orchestrate for a list of inputs
    """

    def __init__(
        self,
        fuzzy_cutoff: float = 0.78,
        max_fuzzy_matches: int = 1,
    ):
        self.canonical_set = _CANONICAL_SET
        self.canonical_list = CANONICAL_SYMPTOMS
        self.alias_map = ALIAS_MAP
        self.fuzzy_cutoff = fuzzy_cutoff
        self.max_fuzzy_matches = max_fuzzy_matches

    # ── Text cleaning ────────────────────────────────────────

    @staticmethod
    def clean_text(raw: str) -> str:
        """
        Normalize raw symptom text:
          - lowercase
          - strip whitespace
          - collapse multiple spaces / underscores
          - remove non-alphanumeric characters (keep underscores and parens for legacy)
        """
        text = raw.strip().lower()
        # Replace spaces with underscores for matching
        text = text.replace(" ", "_")
        # Collapse multiple underscores
        text = re.sub(r"_+", "_", text)
        # Remove everything except word chars, underscores, and parens
        text = re.sub(r"[^\w_()]", "", text)
        # Strip leading/trailing underscores
        text = text.strip("_")
        return text

    # ── Alias resolution ─────────────────────────────────────

    def _resolve_alias(self, cleaned: str) -> Optional[str]:
        """Look up a cleaned string in the alias map."""
        return self.alias_map.get(cleaned)

    # ── Fuzzy matching ───────────────────────────────────────

    def _fuzzy_match(self, cleaned: str) -> Optional[str]:
        """
        Use difflib to find the closest canonical symptom
        if the cleaned string is not an exact or alias match.
        """
        matches = get_close_matches(
            cleaned,
            self.canonical_list,
            n=self.max_fuzzy_matches,
            cutoff=self.fuzzy_cutoff,
        )
        if matches:
            log.info(
                "Fuzzy-matched '%s' → '%s' (cutoff=%.2f)",
                cleaned, matches[0], self.fuzzy_cutoff,
            )
            return matches[0]
        return None

    # ── Single symptom normalization ─────────────────────────

    def normalize_one(self, raw: str) -> Optional[str]:
        """
        Normalize a single raw symptom string to a canonical name.
        Returns None if no match is found.
        """
        cleaned = self.clean_text(raw)
        if not cleaned:
            return None

        # 1. Exact canonical match
        if cleaned in self.canonical_set:
            return cleaned

        # 2. Alias lookup
        alias_result = self._resolve_alias(cleaned)
        if alias_result and alias_result in self.canonical_set:
            return alias_result

        # 3. Try without parentheses (legacy names)
        no_parens = re.sub(r"[()]", "", cleaned)
        if no_parens in self.canonical_set:
            return no_parens

        # 4. Substring match (either direction)
        for canonical in self.canonical_list:
            if cleaned in canonical or canonical in cleaned:
                return canonical

        # 5. Fuzzy match
        fuzzy = self._fuzzy_match(cleaned)
        if fuzzy:
            return fuzzy

        log.warning("Symptom '%s' (cleaned: '%s') could not be resolved", raw, cleaned)
        return None

    # ── Batch normalization ──────────────────────────────────

    def normalize_symptoms(
        self, raw_symptoms: list[str],
    ) -> tuple[list[str], list[str]]:
        """
        Normalize a list of raw symptom strings.

        Returns:
            (matched, unmatched) — lists of canonical names and
            raw strings that couldn't be resolved.
        """
        matched: list[str] = []
        unmatched: list[str] = []
        seen: set[str] = set()

        for raw in raw_symptoms:
            if not raw or not raw.strip():
                continue
            result = self.normalize_one(raw)
            if result and result not in seen:
                matched.append(result)
                seen.add(result)
            elif result is None:
                unmatched.append(raw.strip())

        return matched, unmatched

    # ── Free-text extraction ─────────────────────────────────

    def extract_known_symptoms(self, text: str) -> list[str]:
        """
        Extract known canonical symptoms from a free-text
        description (e.g., NLP symptom narratives).

        Scans the text for any substring matching a canonical
        symptom name (underscore-replaced with spaces).
        """
        text_lower = text.lower()
        found: list[str] = []

        for symptom in self.canonical_list:
            # Check both underscore and space variants
            if symptom in text_lower:
                found.append(symptom)
            else:
                spaced = symptom.replace("_", " ")
                if spaced in text_lower:
                    found.append(symptom)

        return sorted(set(found))

    # ── Utility ──────────────────────────────────────────────

    def get_all_canonical(self) -> list[str]:
        """Return the full list of canonical symptom names."""
        return list(self.canonical_list)

    def is_valid_symptom(self, name: str) -> bool:
        """Check if a string is a valid canonical symptom."""
        return self.clean_text(name) in self.canonical_set
