import { useState } from "react";
import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { EmergencyContact } from "../types/emergency.types";

interface ContactCardProps {
  contact: EmergencyContact;
  index: number;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function ContactCard({ contact, index, onDelete, isDeleting }: ContactCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="flex items-center gap-4 p-4 rounded-2xl"
      style={{
        background: contact.is_primary ? theme.colors.accent.subtle : theme.colors.surface[2],
        border: `1px solid ${contact.is_primary ? theme.colors.accent.border : theme.colors.border[1]}`,
      }}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-black"
        style={{
          background: contact.is_primary ? theme.colors.accent.primary : theme.colors.surface[4],
          color: contact.is_primary ? theme.colors.bg.primary : theme.colors.text.muted,
          fontSize: theme.typography.sizes.sm,
        }}
      >
        {getInitials(contact.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold truncate" style={{ fontSize: theme.typography.sizes.base, color: theme.colors.text.primary }}>
            {contact.name}
          </span>
          {contact.is_primary && (
            <span
              className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
              style={{ fontSize: "0.6rem", background: theme.colors.accent.primary, color: theme.colors.bg.primary }}
            >
              Primary
            </span>
          )}
        </div>
        <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle, marginTop: "2px" }}>
          {contact.relationship}
        </div>
        <a
          href={`tel:${contact.phone}`}
          className="font-semibold block mt-1 hover:underline active:opacity-70"
          style={{
            fontSize: theme.typography.sizes.sm,
            color: contact.is_primary ? theme.colors.accent.primary : theme.colors.health.strain.DEFAULT,
            textDecoration: "none",
          }}
        >
          <i className="fas fa-phone text-xs mr-1.5" />
          {contact.phone}
        </a>
        {contact.notes && (
          <div className="mt-1 italic truncate" style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.text.subtle }}>
            {contact.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <a
          href={`tel:${contact.phone}`}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
          style={{
            background: theme.colors.health.recovery.bg,
            border: `1px solid ${theme.colors.health.recovery.border}`,
            color: theme.colors.health.recovery.DEFAULT,
          }}
        >
          <i className="fas fa-phone text-sm" />
        </a>

        {confirmDelete ? (
          <div className="flex gap-1">
            <button
              onClick={() => { onDelete(contact.id); setConfirmDelete(false); }}
              disabled={isDeleting}
              className="px-2 py-1 rounded-lg font-bold text-xs"
              style={{
                background: theme.colors.health.danger.bg,
                color: theme.colors.health.danger.DEFAULT,
                fontFamily: theme.typography.fonts.primary,
                minHeight: "32px",
              }}
            >
              <i className="fas fa-check" />
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 rounded-lg font-bold text-xs"
              style={{
                background: theme.colors.surface[4],
                color: theme.colors.text.muted,
                fontFamily: theme.typography.fonts.primary,
                minHeight: "32px",
              }}
            >
              <i className="fas fa-xmark" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: theme.colors.surface[4], color: theme.colors.text.subtle }}
          >
            <i className="fas fa-trash-can text-xs" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
