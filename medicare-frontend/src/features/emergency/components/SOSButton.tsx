import { motion, AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";

interface SOSButtonProps {
  onPress: () => void;
  isActive: boolean;
}

export function SOSButton({ onPress, isActive }: SOSButtonProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Outer pulse rings */}
      <div className="relative flex items-center justify-center mb-5">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "220px", height: "220px",
            border: `2px solid ${theme.colors.health.danger.DEFAULT}`,
            opacity: 0.2,
          }}
          animate={{ scale: [1, 1.2, 1.2], opacity: [0.2, 0, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "200px", height: "200px",
            border: `2px solid ${theme.colors.health.danger.DEFAULT}`,
            opacity: 0.3,
          }}
          animate={{ scale: [1, 1.15, 1.15], opacity: [0.3, 0, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
        />

        <motion.button
          onClick={onPress}
          className="relative flex flex-col items-center justify-center rounded-full select-none focus:outline-none"
          style={{
            width: "160px", height: "160px",
            background: isActive ? "#FF0000" : theme.colors.health.danger.DEFAULT,
            boxShadow: `0 0 0 6px rgba(255,61,90,0.15), 0 8px 40px rgba(255,61,90,0.4), 0 0 80px rgba(255,61,90,0.15)`,
            touchAction: "manipulation",
          }}
          whileTap={{ scale: 0.94 }}
          animate={isActive ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.4, repeat: isActive ? Infinity : 0 }}
        >
          <motion.i
            className="fas fa-phone-volume text-white mb-2"
            style={{ fontSize: "2.2rem" }}
            animate={isActive ? { rotate: [-10, 10, -10] } : {}}
            transition={{ duration: 0.3, repeat: isActive ? Infinity : 0 }}
          />
          <span className="text-white font-black uppercase tracking-widest" style={{ fontSize: "0.875rem" }}>
            SOS
          </span>
          <span className="text-white font-medium uppercase tracking-wider" style={{ fontSize: "0.55rem", opacity: 0.8 }}>
            {isActive ? "CALLING..." : "HOLD TO CALL"}
          </span>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {isActive ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: theme.colors.health.danger.DEFAULT, animation: "pulse-dot 0.8s infinite" }}
            />
            <span
              className="font-bold uppercase tracking-widest"
              style={{ fontSize: theme.typography.sizes.xxs, color: theme.colors.health.danger.DEFAULT }}
            >
              Emergency SOS Active
            </span>
          </motion.div>
        ) : (
          <motion.p
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.text.subtle, textAlign: "center", lineHeight: 1.5 }}
          >
            Press in case of a medical emergency.
            <br />Contacts & services will be alerted.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
