"""
ai/symptom_categories.py
──────────────────────────────────────────────
Medical categorisation of all 131 training symptoms.

Rules:
 - Each symptom appears in exactly ONE category (no duplicates)
 - Category names are short and user-friendly (shown as pill buttons)
 - Symptom strings match feature_names.pkl (snake_case)
"""

# ── Category → symptom list (all snake_case) ──────────
SYMPTOM_CATEGORIES: dict[str, list[str]] = {

    "🌡️ Fever & Infection": [
        "high_fever",
        "mild_fever",
        "fever",
        "chills",
        "sweating",
        "shivering",
        "dehydration",
        "toxic_look_(typhos)",
        "toxic_look_typhos",
    ],

    "🤕 Pain": [
        "headache",
        "chest_pain",
        "abdominal_pain",
        "back_pain",
        "joint_pain",
        "muscle_pain",
        "neck_pain",
        "knee_pain",
        "hip_joint_pain",
        "belly_pain",
        "stomach_pain",
        "cramps",
        "pain_behind_the_eyes",
        "pain_during_bowel_movements",
        "pain_in_anal_region",
    ],

    "🫁 Respiratory": [
        "cough",
        "breathlessness",
        "congestion",
        "runny_nose",
        "sinus_pressure",
        "throat_irritation",
        "phlegm",
        "blood_in_sputum",
        "continuous_sneezing",
        "mucoid_sputum",
        "rusty_sputum",
        "patches_in_throat",
    ],

    "🍽️ Digestive": [
        "nausea",
        "vomiting",
        "diarrhoea",
        "constipation",
        "acidity",
        "loss_of_appetite",
        "excessive_hunger",
        "increased_appetite",
        "bloody_stool",
        "distention_of_abdomen",
        "stomach_bleeding",
        "fluid_overload",
        "passage_of_gases",
        "swelling_of_stomach",
        "ulcers_on_tongue",
        "indigestion",
    ],

    "🧴 Skin & Nails": [
        "itching",
        "skin_rash",
        "nodal_skin_eruptions",
        "dischromic_patches",
        "blackheads",
        "skin_peeling",
        "brittle_nails",
        "yellow_crust_ooze",
        "blister",
        "bruising",
        "drying_and_tingling_lips",
        "silver_like_dusting",
        "red_sore_around_nose",
        "small_dents_in_nails",
        "inflammatory_nails",
        "pus_filled_pimples",
        "scurring",
        "red_spots_over_body",
        "internal_itching",
    ],

    "🧠 Neurological": [
        "dizziness",
        "altered_sensorium",
        "coma",
        "loss_of_balance",
        "unsteadiness",
        "lack_of_concentration",
        "slurred_speech",
        "spinning_movements",
        "movement_stiffness",
        "weakness_of_one_body_side",
        "stiff_neck",
        "loss_of_smell",
        "visual_disturbances",
    ],

    "👁️ Eyes & Vision": [
        "blurred_and_distorted_vision",
        "redness_of_eyes",
        "watering_from_eyes",
        "yellowing_of_eyes",
        "sunken_eyes",
    ],

    "🚽 Urinary": [
        "burning_micturition",
        "dark_urine",
        "yellow_urine",
        "foul_smell_of_urine",
        "continuous_feel_of_urine",
        "bladder_discomfort",
        "polyuria",
        "spotting__urination",
        "spotting_urination",
    ],

    "❤️ Heart & Circulation": [
        "fast_heart_rate",
        "palpitations",
        "prominent_veins_on_calf",
        "swollen_blood_vessels",
        "swollen_extremeties",
        "swollen_legs",
        "cold_hands_and_feets",
    ],

    "😴 Fatigue & Mental": [
        "fatigue",
        "weakness_in_limbs",
        "lethargy",
        "malaise",
        "weight_loss",
        "weight_gain",
        "muscle_weakness",
        "muscle_wasting",
        "restlessness",
        "anxiety",
        "depression",
        "mood_swings",
        "irritability",
    ],

    "🦠 Glands & Hormones": [
        "enlarged_thyroid",
        "obesity",
        "irregular_sugar_level",
        "swelled_lymph_nodes",
        "swollen_lymph_nodes",
        "swelling_joints",
        "puffy_face_and_eyes",
    ],

    "🫀 Liver & Jaundice": [
        "yellowish_skin",
        "acute_liver_failure",
        "history_of_alcohol_consumption",
    ],

    "⚠️ Risk Factors": [
        "extra_marital_contacts",
        "receiving_blood_transfusion",
        "receiving_unsterile_injections",
        "family_history",
    ],
}


def build_category_map(feature_names: list[str]) -> dict[str, list[str]]:
    """
    Match the SYMPTOM_CATEGORIES keys against actual feature_names from the
    trained model. Returns only categories that have at least 1 matched symptom.
    Uncategorised symptoms are placed in 'Other'.
    """
    feature_set = set(feature_names)
    result: dict[str, list[str]] = {}
    assigned: set[str] = set()

    for cat_name, cat_symptoms in SYMPTOM_CATEGORIES.items():
        matched = [s for s in cat_symptoms if s in feature_set]
        if matched:
            result[cat_name] = matched
            assigned.update(matched)

    # Catch any symptoms not yet assigned
    unassigned = [s for s in feature_names if s not in assigned]
    if unassigned:
        result["🔍 Other"] = sorted(unassigned)

    return result
