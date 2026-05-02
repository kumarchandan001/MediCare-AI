import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { FormField, StyledInput, StyledSelect } from "./FormField";
import { SpinnerLoader } from "@/shared/components/loading/SpinnerLoader";
import type { Medication, MedicationListData } from "../types/health.types";

const FREQUENCIES = [
  "Daily", "Twice Daily", "Weekly",
  "Every 8 Hours", "Every 12 Hours", "As Needed",
];

interface MedicationManagerProps {
  data: MedicationListData | undefined;
  isLoading: boolean;
  onAdd: (data: Record<string, unknown>) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  isAdding: boolean;
}

export function MedicationManager({ data, isLoading, onAdd, onToggle, onDelete, isAdding }: MedicationManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    medicine_name: "",
    dosage: "",
    reminder_time: "",
    frequency: "Daily",
    instructions: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicine_name.trim()) return;
    onAdd({
      ...form,
      dosage: form.dosage || undefined,
      reminder_time: form.reminder_time || undefined,
      instructions: form.instructions || undefined,
    });
    setForm({ medicine_name: "", dosage: "", reminder_time: "", frequency: "Daily", instructions: "" });
    setShowForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.colors.surface[2], border: `1px solid ${theme.colors.border[1]}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: theme.colors.health.sleep.bg,
              border: `1px solid ${theme.colors.health.sleep.border}`,
            }}
          >
            <i className="fas fa-pills" style={{ color: theme.colors.health.sleep.DEFAULT }} />
          </div>
          <div>
            <h3
              className="font-black tracking-tight"
              style={{ fontSize: theme.typography.sizes.h3, color: theme.colors.text.primary, letterSpacing: "-0.02em" }}
            >
              Medication Reminders
            </h3>
            <p style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}>
              {data?.active || 0} active · {data?.count || 0} total
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((p) => !p)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all"
          style={{
            fontSize: theme.typography.sizes.xxs,
            fontFamily: theme.typography.fonts.primary,
            background: showForm ? theme.colors.surface[4] : theme.colors.accent.primary,
            color: showForm ? theme.colors.text.muted : theme.colors.bg.primary,
          }}
        >
          <i className={`fas fa-${showForm ? "xmark" : "plus"}`} />
          {showForm ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="p-6"
              style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <FormField label="Medication Name" required>
                  <StyledInput
                    type="text"
                    value={form.medicine_name}
                    onChange={(e) => setForm((p) => ({ ...p, medicine_name: e.target.value }))}
                    placeholder="e.g. Metformin"
                  />
                </FormField>

                <FormField label="Dosage" hint="e.g. 500mg">
                  <StyledInput
                    type="text"
                    value={form.dosage}
                    onChange={(e) => setForm((p) => ({ ...p, dosage: e.target.value }))}
                    placeholder="500mg"
                  />
                </FormField>

                <FormField label="Reminder Time" hint="HH:MM format">
                  <StyledInput
                    type="time"
                    value={form.reminder_time}
                    onChange={(e) => setForm((p) => ({ ...p, reminder_time: e.target.value }))}
                  />
                </FormField>

                <FormField label="Frequency">
                  <StyledSelect
                    value={form.frequency}
                    onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))}
                  >
                    {FREQUENCIES.map((f) => (
                      <option
                        key={f}
                        value={f}
                        style={{ background: theme.colors.surface[3], color: theme.colors.text.primary }}
                      >
                        {f}
                      </option>
                    ))}
                  </StyledSelect>
                </FormField>
              </div>

              <FormField label="Instructions (Optional)">
                <StyledInput
                  type="text"
                  value={form.instructions}
                  onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                  placeholder="Take with food..."
                />
              </FormField>

              <button
                type="submit"
                disabled={isAdding || !form.medicine_name.trim()}
                className="mt-5 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: theme.colors.accent.primary,
                  color: theme.colors.bg.primary,
                  fontFamily: theme.typography.fonts.primary,
                }}
              >
                {isAdding ? <SpinnerLoader size="sm" /> : (<><i className="fas fa-plus" /> Add Medication</>)}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medication list */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl animate-pulse"
                style={{ background: theme.colors.surface[3], animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : !data || data.count === 0 ? (
          <div className="text-center py-10" style={{ color: theme.colors.text.subtle }}>
            <i className="fas fa-pills text-3xl mb-3 block" style={{ opacity: 0.3 }} />
            <p style={{ fontSize: theme.typography.sizes.sm }}>No medications added yet.</p>
            <p style={{ fontSize: theme.typography.sizes.xs, marginTop: "4px" }}>
              Click "Add" to add your first medication reminder.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {data.medications.map((med, i) => (
                <MedItem key={med.id} med={med} index={i} onToggle={onToggle} onDelete={onDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MedItem({
  med,
  index,
  onToggle,
  onDelete,
}: {
  med: Medication;
  index: number;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 p-4 rounded-xl transition-colors"
      style={{
        background: med.is_active ? theme.colors.surface[3] : "rgba(255,255,255,0.02)",
        border: `1px solid ${med.is_active ? theme.colors.border[2] : theme.colors.border[1]}`,
        opacity: med.is_active ? 1 : 0.6,
      }}
    >
      {/* Toggle */}
      <button
        onClick={() => onToggle(med.id)}
        className="relative w-10 h-6 rounded-full flex-shrink-0 transition-all"
        style={{
          background: med.is_active ? theme.colors.accent.primary : theme.colors.surface[4],
          border: `1px solid ${med.is_active ? theme.colors.accent.border : theme.colors.border[2]}`,
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
          style={{
            left: med.is_active ? "calc(100% - 22px)" : "2px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>

      {/* Med info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate" style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text.primary }}>
          {med.medicine_name}
        </div>
        <div
          className="flex items-center gap-2 mt-0.5 flex-wrap"
          style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle }}
        >
          {med.dosage && <span>{med.dosage}</span>}
          {med.dosage && med.frequency && <span>·</span>}
          <span>{med.frequency}</span>
          {med.reminder_time && (
            <>
              <span>·</span>
              <span>
                <i className="fas fa-clock text-xs mr-1" />
                {med.reminder_time}
              </span>
            </>
          )}
        </div>
        {med.instructions && (
          <div
            className="mt-0.5 truncate italic"
            style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}
          >
            {med.instructions}
          </div>
        )}
      </div>

      {/* Delete */}
      <div>
        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                onDelete(med.id);
                setConfirmDelete(false);
              }}
              className="px-3 py-1 rounded-lg font-bold text-xs transition-colors"
              style={{
                background: theme.colors.health.danger.bg,
                color: theme.colors.health.danger.DEFAULT,
                fontFamily: theme.typography.fonts.primary,
              }}
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded-lg font-bold text-xs"
              style={{
                background: theme.colors.surface[4],
                color: theme.colors.text.muted,
                fontFamily: theme.typography.fonts.primary,
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: theme.colors.surface[4], color: theme.colors.text.subtle }}
          >
            <i className="fas fa-trash-can text-xs" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
