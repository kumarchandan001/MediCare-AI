import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useProfileStore } from "../store/profileStore";
import { useToast } from "@/store/toastStore";
import { BLOOD_TYPES, COMMON_CONDITIONS } from "../types/profile.types";
import type { BloodType } from "../types/profile.types";

export default function HealthProfileSection() {
  const {
    healthProfile, setHealthProfile,
    addCondition, removeCondition,
    addAllergy, removeAllergy,
    addMedication, removeMedication,
    markSaved,
  } = useProfileStore();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [heightDraft, setHeightDraft] = useState(healthProfile.height || 0);
  const [weightDraft, setWeightDraft] = useState(healthProfile.weight || 0);
  const [bloodDraft, setBloodDraft] = useState<BloodType>(healthProfile.blood_type);

  const bmi = heightDraft && weightDraft
    ? (weightDraft / ((heightDraft / 100) ** 2)).toFixed(1)
    : null;

  const getBMIColor = (bmiVal: number) => {
    if (bmiVal < 18.5) return theme.colors.health.warning.DEFAULT;
    if (bmiVal < 25) return theme.colors.health.recovery.DEFAULT;
    if (bmiVal < 30) return theme.colors.health.warning.DEFAULT;
    return theme.colors.health.danger.DEFAULT;
  };

  const getBMILabel = (bmiVal: number) => {
    if (bmiVal < 18.5) return "Underweight";
    if (bmiVal < 25) return "Normal";
    if (bmiVal < 30) return "Overweight";
    return "Obese";
  };

  const handleSave = useCallback(() => {
    setHealthProfile({
      height: heightDraft,
      weight: weightDraft,
      blood_type: bloodDraft,
    });
    markSaved();
    setIsEditing(false);
    toast.success("Health profile updated");
  }, [heightDraft, weightDraft, bloodDraft, setHealthProfile, markSaved, toast]);

  const handleEdit = () => {
    setHeightDraft(healthProfile.height);
    setWeightDraft(healthProfile.weight);
    setBloodDraft(healthProfile.blood_type);
    setIsEditing(true);
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim()) {
      addAllergy(newAllergy.trim());
      setNewAllergy("");
      markSaved();
    }
  };

  const handleAddMedication = () => {
    if (newMedication.trim()) {
      addMedication(newMedication.trim());
      setNewMedication("");
      markSaved();
    }
  };

  const handleToggleCondition = (condition: string) => {
    if (healthProfile.conditions.includes(condition)) {
      removeCondition(condition);
    } else {
      addCondition(condition);
    }
    markSaved();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: theme.colors.surface[1],
        border: `1px solid ${theme.colors.border[1]}`,
      }}
    >
      {/* Header — compact */}
      <div
        className="flex items-center justify-between px-3.5 py-3 sm:px-5 sm:py-4"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
            style={{
              background: theme.colors.health.recovery.bg,
              border: `1px solid ${theme.colors.health.recovery.border}`,
            }}
          >
            <i className="fas fa-heartbeat text-[10px] sm:text-xs" style={{ color: theme.colors.health.recovery.DEFAULT }} />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm" style={{ color: theme.colors.text.primary }}>
              Health Profile
            </h3>
            <p className="text-[9px] sm:text-[10px] hidden sm:block" style={{ color: theme.colors.text.subtle }}>
              Body metrics, blood type & conditions
            </p>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95"
            style={{
              fontSize: theme.typography.sizes.xxs,
              background: theme.colors.surface[3],
              color: theme.colors.health.recovery.DEFAULT,
              border: `1px solid ${theme.colors.health.recovery.border}`,
              minHeight: "32px",
            }}
          >
            <i className="fas fa-pen text-[10px]" /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsEditing(false)}
              className="px-2.5 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95"
              style={{
                fontSize: theme.typography.sizes.xxs,
                color: theme.colors.text.subtle,
                background: theme.colors.surface[3],
                border: `1px solid ${theme.colors.border[2]}`,
                minHeight: "32px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all active:scale-95"
              style={{
                fontSize: theme.typography.sizes.xxs,
                background: theme.colors.health.recovery.DEFAULT,
                color: theme.colors.bg.primary,
                minHeight: "32px",
              }}
            >
              <i className="fas fa-check text-[10px]" /> Save
            </button>
          </div>
        )}
      </div>

      <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-6">
        {/* Body Metrics Row — always 4 cols, compact on mobile */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {/* Height */}
          <div
            className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
          >
            <div
              className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-1 sm:mb-2"
              style={{ color: theme.colors.text.subtle }}
            >
              Height
            </div>
            {isEditing ? (
              <input
                type="number"
                value={heightDraft || ""}
                onChange={(e) => setHeightDraft(+e.target.value)}
                placeholder="cm"
                className="w-full text-center text-sm sm:text-lg font-bold rounded-lg px-1 py-1 sm:px-2 sm:py-1.5 outline-none"
                style={{
                  background: theme.colors.surface[3],
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border[2]}`,
                  fontFamily: theme.typography.fonts.primary,
                }}
              />
            ) : (
              <div className="text-base sm:text-xl font-black" style={{ color: theme.colors.text.primary }}>
                {healthProfile.height || "—"}
                <span className="text-[9px] sm:text-xs font-medium ml-0.5" style={{ color: theme.colors.text.subtle }}>cm</span>
              </div>
            )}
          </div>

          {/* Weight */}
          <div
            className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center"
            style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
          >
            <div
              className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-1 sm:mb-2"
              style={{ color: theme.colors.text.subtle }}
            >
              Weight
            </div>
            {isEditing ? (
              <input
                type="number"
                value={weightDraft || ""}
                onChange={(e) => setWeightDraft(+e.target.value)}
                placeholder="kg"
                className="w-full text-center text-sm sm:text-lg font-bold rounded-lg px-1 py-1 sm:px-2 sm:py-1.5 outline-none"
                style={{
                  background: theme.colors.surface[3],
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border[2]}`,
                  fontFamily: theme.typography.fonts.primary,
                }}
              />
            ) : (
              <div className="text-base sm:text-xl font-black" style={{ color: theme.colors.text.primary }}>
                {healthProfile.weight || "—"}
                <span className="text-[9px] sm:text-xs font-medium ml-0.5" style={{ color: theme.colors.text.subtle }}>kg</span>
              </div>
            )}
          </div>

          {/* Blood Type */}
          <div
            className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center"
            style={{
              background: theme.colors.surface[2],
              border: `1px solid ${theme.colors.health.danger.border}`,
            }}
          >
            <div
              className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-1 sm:mb-2"
              style={{ color: theme.colors.text.subtle }}
            >
              Blood
            </div>
            {isEditing ? (
              <select
                value={bloodDraft}
                onChange={(e) => setBloodDraft(e.target.value as BloodType)}
                className="w-full text-center text-sm sm:text-lg font-bold rounded-lg px-1 py-1 sm:px-2 sm:py-1.5 outline-none"
                style={{
                  background: theme.colors.surface[3],
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border[2]}`,
                  fontFamily: theme.typography.fonts.primary,
                }}
              >
                <option value="">—</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            ) : (
              <div className="text-base sm:text-xl font-black" style={{ color: theme.colors.health.danger.DEFAULT }}>
                {healthProfile.blood_type || "—"}
              </div>
            )}
          </div>

          {/* BMI */}
          <div
            className="rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center"
            style={{
              background: theme.colors.surface[2],
              border: `1px solid ${bmi ? `${getBMIColor(+bmi)}30` : theme.colors.border[1]}`,
            }}
          >
            <div
              className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-1 sm:mb-2"
              style={{ color: theme.colors.text.subtle }}
            >
              BMI
            </div>
            <div
              className="text-base sm:text-xl font-black"
              style={{ color: bmi ? getBMIColor(+bmi) : theme.colors.text.subtle }}
            >
              {bmi || "—"}
            </div>
            {bmi && (
              <div className="text-[8px] sm:text-[10px] font-semibold mt-0.5" style={{ color: getBMIColor(+bmi) }}>
                {getBMILabel(+bmi)}
              </div>
            )}
          </div>
        </div>

        {/* Medical Conditions — compact */}
        <div>
          <div
            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-2 sm:mb-3 flex items-center gap-2"
            style={{ color: theme.colors.text.subtle }}
          >
            <i className="fas fa-stethoscope opacity-60" />
            Conditions
            <span
              className="ml-auto px-2 py-0.5 rounded-full"
              style={{ background: theme.colors.surface[3], color: theme.colors.text.muted, fontSize: "9px" }}
            >
              {healthProfile.conditions.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {COMMON_CONDITIONS.map((condition) => {
              const isActive = healthProfile.conditions.includes(condition);
              return (
                <button
                  key={condition}
                  onClick={() => handleToggleCondition(condition)}
                  className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: isActive ? theme.colors.health.warning.bg : theme.colors.surface[3],
                    color: isActive ? theme.colors.health.warning.DEFAULT : theme.colors.text.muted,
                    border: `1px solid ${isActive ? theme.colors.health.warning.border : theme.colors.border[1]}`,
                  }}
                >
                  {isActive && <i className="fas fa-check mr-0.5 text-[8px] sm:text-[10px]" />}
                  {condition}
                </button>
              );
            })}
          </div>
        </div>

        {/* Allergies — compact */}
        <div>
          <div
            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-2 flex items-center gap-2"
            style={{ color: theme.colors.text.subtle }}
          >
            <i className="fas fa-allergies opacity-60" />
            Allergies
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3">
            {healthProfile.allergies.length === 0 && (
              <span className="text-[10px] sm:text-xs" style={{ color: theme.colors.text.subtle }}>
                No allergies recorded
              </span>
            )}
            <AnimatePresence>
              {healthProfile.allergies.map((allergy) => (
                <motion.span
                  key={allergy}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium"
                  style={{
                    background: theme.colors.health.danger.bg,
                    color: theme.colors.health.danger.DEFAULT,
                    border: `1px solid ${theme.colors.health.danger.border}`,
                  }}
                >
                  {allergy}
                  <button
                    onClick={() => { removeAllergy(allergy); markSaved(); }}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                  >
                    <i className="fas fa-xmark text-[8px] sm:text-[10px]" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddAllergy()}
              placeholder="Add allergy..."
              className="flex-1 rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs outline-none transition-all placeholder:text-white/20"
              style={{
                background: theme.colors.surface[3],
                border: `1px solid ${theme.colors.border[1]}`,
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fonts.primary,
              }}
            />
            <button
              onClick={handleAddAllergy}
              disabled={!newAllergy.trim()}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all active:scale-95 disabled:opacity-30"
              style={{
                background: theme.colors.surface[4],
                color: theme.colors.text.muted,
                border: `1px solid ${theme.colors.border[2]}`,
              }}
            >
              <i className="fas fa-plus" />
            </button>
          </div>
        </div>

        {/* Medications — compact */}
        <div>
          <div
            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] mb-2 flex items-center gap-2"
            style={{ color: theme.colors.text.subtle }}
          >
            <i className="fas fa-pills opacity-60" />
            Medications
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3">
            {healthProfile.medications.length === 0 && (
              <span className="text-[10px] sm:text-xs" style={{ color: theme.colors.text.subtle }}>
                No medications recorded
              </span>
            )}
            <AnimatePresence>
              {healthProfile.medications.map((med) => (
                <motion.span
                  key={med}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="inline-flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium"
                  style={{
                    background: theme.colors.health.strain.bg,
                    color: theme.colors.health.strain.DEFAULT,
                    border: `1px solid ${theme.colors.health.strain.border}`,
                  }}
                >
                  <i className="fas fa-capsules text-[8px] sm:text-[10px]" />
                  {med}
                  <button
                    onClick={() => { removeMedication(med); markSaved(); }}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                  >
                    <i className="fas fa-xmark text-[8px] sm:text-[10px]" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <input
              type="text"
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMedication()}
              placeholder="Add medication..."
              className="flex-1 rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs outline-none transition-all placeholder:text-white/20"
              style={{
                background: theme.colors.surface[3],
                border: `1px solid ${theme.colors.border[1]}`,
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fonts.primary,
              }}
            />
            <button
              onClick={handleAddMedication}
              disabled={!newMedication.trim()}
              className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all active:scale-95 disabled:opacity-30"
              style={{
                background: theme.colors.surface[4],
                color: theme.colors.text.muted,
                border: `1px solid ${theme.colors.border[2]}`,
              }}
            >
              <i className="fas fa-plus" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export { HealthProfileSection };
