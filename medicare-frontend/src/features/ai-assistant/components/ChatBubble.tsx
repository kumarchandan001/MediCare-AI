import { motion } from "framer-motion";
import { theme } from "@/config/theme";
import type { ChatMessage } from "../types/chat.types";

interface ChatBubbleProps {
  message: ChatMessage;
  index: number;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

export function ChatBubble({ message, index }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      className={`flex items-end gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
        style={{
          background: isUser
            ? theme.colors.surface[4]
            : theme.colors.accent.subtle,
          border: `1px solid ${
            isUser ? theme.colors.border[2] : theme.colors.accent.border
          }`,
          color: isUser
            ? theme.colors.text.muted
            : theme.colors.accent.primary,
        }}
      >
        {isUser ? (
          <i className="fas fa-user text-xs" />
        ) : (
          <i className="fas fa-robot text-xs" />
        )}
      </div>

      {/* Bubble + timestamp */}
      <div
        className={`flex flex-col gap-1 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className="max-w-[75%] px-4 py-3 rounded-2xl leading-relaxed"
          style={{
            background: isUser
              ? theme.colors.accent.primary
              : theme.colors.surface[3],
            border: isUser
              ? "none"
              : `1px solid ${theme.colors.border[2]}`,
            borderBottomRightRadius: isUser ? "6px" : "18px",
            borderBottomLeftRadius: isUser ? "18px" : "6px",
            color: isUser
              ? theme.colors.bg.primary
              : theme.colors.text.secondary,
            fontSize: theme.typography.sizes.sm,
            fontWeight: isUser ? 500 : 400,
          }}
        >
          {message.content.split("\n").map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </div>

        {/* Timestamp */}
        <span
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: theme.colors.text.subtle,
            paddingLeft: isUser ? 0 : "4px",
            paddingRight: isUser ? "4px" : 0,
          }}
        >
          {timeAgo(message.created_at)}
        </span>
      </div>
    </motion.div>
  );
}
