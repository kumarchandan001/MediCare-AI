/**
 * BottomSheet — Mobile-friendly modal that slides up from bottom
 * Falls back to centered modal on desktop.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { bottomSheet, modalOverlay, modalContent } from "@/animations";
import { zIndex } from "@/theme";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = "85vh",
}: BottomSheetProps) {
  const isMobile = useIsMobile();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="sheet-overlay"
            variants={modalOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              zIndex: zIndex.modal,
            }}
            onClick={onClose}
          />

          {/* Sheet / Modal */}
          <motion.div
            key="sheet-content"
            variants={isMobile ? bottomSheet : modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            className={
              isMobile
                ? "fixed left-0 right-0 bottom-0 rounded-t-2xl"
                : "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl w-full max-w-lg"
            }
            style={{
              background: theme.colors.surface[1],
              border: `1px solid ${theme.colors.border[2]}`,
              zIndex: zIndex.modal + 1,
              maxHeight,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drag Handle (mobile) */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: theme.colors.border[3] }}
                />
              </div>
            )}

            {/* Header */}
            {title && (
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: `1px solid ${theme.colors.border[1]}` }}
              >
                <span
                  className="font-bold text-sm"
                  style={{ color: theme.colors.text.primary }}
                >
                  {title}
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ color: theme.colors.text.subtle }}
                >
                  <i className="fas fa-xmark" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
