"""
scripts/build_who_profiles.py — Build WHO country risk profiles
Run: cd medicare-backend && python scripts/build_who_profiles.py
Output: ai/models/who_profiles.pkl
"""

import sys
from pathlib import Path
from collections import Counter

BASE = Path(__file__).parent.parent
sys.path.insert(0, str(BASE))

from ai.who_engine import build_who_profiles, list_available_countries


def main():
    print("\n" + "=" * 58)
    print("  WHO Country Profile Builder")
    print("=" * 58)

    profiles = build_who_profiles(force_rebuild=True)

    if not profiles:
        print("\n  [ERROR] No profiles built. Check that who_data/ exists")
        print("     and WHO CSV files are present.")
        sys.exit(1)

    print(f"\n  [OK] Countries loaded: {len(profiles)}")

    countries = list_available_countries(profiles)

    SAMPLE_CODES = ["IND", "USA", "GBR", "CHN", "BRA", "ZAF", "NGA", "AUS"]
    print("\n  Sample profiles:")
    for c in countries:
        if c["code"] in SAMPLE_CODES:
            print(
                f"    {c['code']:4s} {c['name']:<32s} "
                f"Risk: {c['risk_level']:<10s} "
                f"Region: {c['region']}"
            )

    risk_dist = Counter(p["risk_level"] for p in profiles.values())
    print("\n  Risk level distribution:")
    for level in ["Very High", "High", "Moderate", "Low"]:
        count = risk_dist.get(level, 0)
        print(f"    {level:<12s}: {count:3d}")

    ind_counts: dict = {}
    for p in profiles.values():
        for k in p["indicators"]:
            ind_counts[k] = ind_counts.get(k, 0) + 1
    print(f"\n  Indicator coverage (out of {len(profiles)} countries):")
    for ind, cnt in sorted(ind_counts.items(), key=lambda x: -x[1])[:5]:
        print(f"    {ind:<30s}: {cnt}")

    print(f"\n  Saved to: {BASE / 'ai' / 'models' / 'who_profiles.pkl'}")
    print("=" * 58 + "\n")


if __name__ == "__main__":
    main()
