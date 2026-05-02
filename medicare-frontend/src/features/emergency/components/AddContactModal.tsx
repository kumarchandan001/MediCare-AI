import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { ContactForm } from "./ContactForm";
import type { CreateContactPayload } from "../types/emergency.types";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateContactPayload) => void;
  isSaving: boolean;
}

export function AddContactModal({ isOpen, onClose, onSubmit, isSaving }: AddContactModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed z-50 left-0 right-0 bottom-0 sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
            style={{ background: theme.colors.surface[2], borderRadius: "24px 24px 0 0" }}
          >
            {/* Handle bar (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: theme.colors.border[2] }} />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
            >
              <h3
                className="font-black tracking-tight"
                style={{ fontSize: theme.typography.sizes.h3, color: theme.colors.text.primary, letterSpacing: "-0.02em" }}
              >
                Add Emergency Contact
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: theme.colors.surface[4], color: theme.colors.text.muted }}
              >
                <i className="fas fa-xmark" />
              </button>
            </div>

            {/* Form — reuses ContactForm component */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <ContactForm
                onSubmit={onSubmit}
                isSaving={isSaving}
                submitLabel="Add Contact"
              />
              <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
