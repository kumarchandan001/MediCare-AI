import os
from typing import Dict, Any

class FeatureFlags:
    """
    Centralized Feature Flag System.
    Safely controls production feature rollout and experimental routing.
    Loads from environment variables dynamically.
    """
    
    def __init__(self):
        # Default fallback states if environment variables are not set
        self._defaults = {
            "ENABLE_EXPERIMENTAL_SIMULATION": False,
            "ENABLE_ADVANCED_ANALYTICS": False,
            "ENABLE_NEW_DASHBOARD": False,
            "ENABLE_DEBUG_ROUTES": False,
        }

    def is_enabled(self, flag_name: str) -> bool:
        """Check if a specific feature flag is enabled."""
        env_val = os.getenv(f"FEATURE_FLAG_{flag_name}")
        if env_val is not None:
            return env_val.lower() in ("true", "1", "yes")
        return self._defaults.get(flag_name, False)

    def get_all_flags(self) -> Dict[str, bool]:
        """Returns the current state of all known feature flags."""
        return {
            flag: self.is_enabled(flag)
            for flag in self._defaults.keys()
        }

feature_flags = FeatureFlags()

def is_feature_enabled(flag_name: str) -> bool:
    """Convenience method to check a feature flag."""
    return feature_flags.is_enabled(flag_name)
