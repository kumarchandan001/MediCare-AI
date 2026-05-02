import { useRef, useEffect } from "react";
import { theme } from "@/config/theme";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isSending: boolean;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const MAX_CHARS = 2000;

export function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  isSending,
  disabled,
  inputRef,
}: ChatInputProps) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef || localRef;

  // Auto-resize textarea
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height =
      Math.min(ref.current.scrollHeight, 120) + "px";
  }, [value, ref]);

  const canSend = value.trim().length > 0 && !isSending && !disabled;

  return (
    <div
      className="p-4"
      style={{ borderTop: `1px solid ${theme.colors.border[1]}` }}
    >
      {/* Input row */}
      <div className="flex items-end gap-3">
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) {
              onChange(e.target.value);
            }
          }}
          onKeyDown={onKeyDown}
          placeholder="Ask Karuna anything about your health..."
          rows={1}
          className="flex-1 resize-none rounded-2xl px-4 py-3 outline-none leading-relaxed"
          style={{
            background: theme.colors.surface[3],
            border: `1.5px solid ${theme.colors.border[2]}`,
            color: theme.colors.text.primary,
            fontSize: theme.typography.sizes.sm,
            fontFamily: theme.typography.fonts.primary,
            maxHeight: "120px",
            overflowY: "auto",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = theme.colors.border.focus;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = theme.colors.border[2];
          }}
          disabled={disabled || isSending}
        />

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={!canSend}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:pointer-events-none"
          style={{
            background: canSend
              ? theme.colors.accent.primary
              : theme.colors.surface[4],
            color: canSend
              ? theme.colors.bg.primary
              : theme.colors.text.subtle,
            boxShadow: canSend ? theme.shadows.accent : "none",
            transform: canSend ? "scale(1)" : "scale(0.95)",
            transition: "all 0.2s",
          }}
        >
          {isSending ? (
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{
                borderColor: "rgba(255,255,255,0.3)",
                borderTopColor: "currentColor",
              }}
            />
          ) : (
            <i className="fas fa-paper-plane text-sm" />
          )}
        </button>
      </div>

      {/* Footer row: char count + hint */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span
          style={{
            fontSize: theme.typography.sizes.xxs,
            color: theme.colors.text.subtle,
          }}
        >
          Press{" "}
          <kbd
            className="px-1 py-0.5 rounded"
            style={{
              background: theme.colors.surface[4],
              fontSize: "0.6rem",
            }}
          >
            Enter
          </kbd>{" "}
          to send,{" "}
          <kbd
            className="px-1 py-0.5 rounded"
            style={{
              background: theme.colors.surface[4],
              fontSize: "0.6rem",
            }}
          >
            Shift+Enter
          </kbd>{" "}
          for new line
        </span>
        <span
          style={{
            fontSize: theme.typography.sizes.xxs,
            color:
              value.length > MAX_CHARS * 0.9
                ? theme.colors.health.warning.DEFAULT
                : theme.colors.text.subtle,
          }}
        >
          {value.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
