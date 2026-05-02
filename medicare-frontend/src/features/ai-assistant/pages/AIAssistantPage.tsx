import { AnimatePresence } from "framer-motion";
import { theme } from "@/config/theme";
import { ErrorBoundary } from "@/shared/components/error/ErrorBoundary";
import { useChat } from "../hooks/useChat";
import { ChatBubble } from "../components/ChatBubble";
import { TypingIndicator } from "../components/TypingIndicator";
import { SuggestedQuestions } from "../components/SuggestedQuestions";
import { HealthSnapshotPanel } from "../components/HealthSnapshotPanel";
import { WelcomeMessage } from "../components/WelcomeMessage";
import { ChatInput } from "../components/ChatInput";

export default function AIAssistantPage() {
  const {
    messages,
    inputValue,
    setInputValue,
    isTyping,
    useHealthContext,
    setUseContext,
    suggestedQuestions,
    healthContext,
    contextLoading,
    historyLoading,
    suggestionsLoading,
    bottomRef,
    inputRef,
    sendMessage,
    sendSuggested,
    handleKeyDown,
    clearHistory,
    isSending,
    isClearing,
  } = useChat();

  const isEmpty = messages.length === 0;

  return (
    <ErrorBoundary>
      <div className="animate-page-in h-full">
        {/* ── Page Header ──────────────── */}
        <div
          className="flex items-center gap-4 p-5 rounded-2xl mb-5"
          style={{
            background: theme.colors.surface[2],
            border: `1px solid ${theme.colors.accent.border}`,
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: theme.colors.accent.subtle,
              border: `1px solid ${theme.colors.accent.border}`,
            }}
          >
            <i
              className="fas fa-robot text-lg"
              style={{ color: theme.colors.accent.primary }}
            />
          </div>
          <div className="flex-1">
            <h1
              className="font-black tracking-tight"
              style={{
                fontSize: theme.typography.sizes.h2,
                color: theme.colors.text.primary,
                letterSpacing: "-0.02em",
              }}
            >
              Karuna — Health AI
            </h1>
            <p
              style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.subtle,
              }}
            >
              Powered by Gemini · Knows your health data
            </p>
          </div>

          {/* Status + Context toggle */}
          <div className="flex items-center gap-3">
            {/* Health context toggle */}
            <div className="flex items-center gap-2">
              <span
                className="font-bold uppercase tracking-wider hidden sm:block"
                style={{
                  fontSize: theme.typography.sizes.xxs,
                  color: theme.colors.text.subtle,
                }}
              >
                Health Context
              </span>
              <button
                onClick={() => setUseContext(!useHealthContext)}
                className="relative w-10 h-6 rounded-full transition-all"
                style={{
                  background: useHealthContext
                    ? theme.colors.accent.primary
                    : theme.colors.surface[4],
                  border: `1px solid ${
                    useHealthContext
                      ? theme.colors.accent.border
                      : theme.colors.border[2]
                  }`,
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{
                    left: useHealthContext ? "calc(100% - 22px)" : "2px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }}
                />
              </button>
            </div>

            {/* Clear button */}
            {!isEmpty && (
              <button
                onClick={() => clearHistory()}
                disabled={isClearing}
                className="px-3 py-1.5 rounded-xl font-semibold transition-all disabled:opacity-40 flex items-center gap-2"
                style={{
                  background: theme.colors.surface[3],
                  border: `1px solid ${theme.colors.border[2]}`,
                  color: theme.colors.text.muted,
                  fontSize: theme.typography.sizes.xs,
                  fontFamily: theme.typography.fonts.primary,
                }}
              >
                <i className="fas fa-trash-can text-xs" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            {/* Live status */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider"
              style={{
                fontSize: "0.6rem",
                background: theme.colors.health.recovery.bg,
                color: theme.colors.health.recovery.DEFAULT,
                border: `1px solid ${theme.colors.health.recovery.border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: theme.colors.health.recovery.DEFAULT,
                  animation: "pulse-dot 2s infinite",
                }}
              />
              <span className="hidden sm:inline">Online</span>
            </div>
          </div>
        </div>

        {/* ── Main Layout ──────────────── */}
        <div
          className="ai-layout grid gap-5"
          style={{
            gridTemplateColumns: "1fr 280px",
            height: "calc(100vh - 240px)",
            minHeight: "500px",
          }}
        >
          {/* ── Chat Column ─────────────── */}
          <div
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: theme.colors.surface[2],
              border: `1px solid ${theme.colors.border[1]}`,
            }}
          >
            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: `${theme.colors.surface[4]} transparent`,
              }}
            >
              {historyLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${
                        i % 2 === 0 ? "flex-row-reverse" : ""
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full animate-pulse flex-shrink-0"
                        style={{ background: theme.colors.surface[4] }}
                      />
                      <div
                        className="animate-pulse rounded-2xl"
                        style={{
                          width: i % 2 === 0 ? "200px" : "280px",
                          height: "60px",
                          background: theme.colors.surface[3],
                          animationDelay: `${i * 150}ms`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : isEmpty ? (
                <WelcomeMessage
                  onSuggestion={sendSuggested}
                  suggestions={suggestedQuestions}
                />
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <ChatBubble key={msg.id} message={msg} index={i} />
                  ))}
                </>
              )}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && <TypingIndicator />}
              </AnimatePresence>

              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={sendMessage}
              onKeyDown={handleKeyDown}
              isSending={isSending}
              inputRef={inputRef}
            />
          </div>

          {/* ── Right Sidebar ────────────── */}
          <div
            className="ai-sidebar flex flex-col gap-5 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Health Snapshot */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: theme.colors.surface[2],
                border: `1px solid ${theme.colors.border[1]}`,
              }}
            >
              <HealthSnapshotPanel
                context={healthContext}
                isLoading={contextLoading}
              />
            </div>

            {/* Suggested Questions */}
            {!isEmpty && (
              <div
                className="rounded-2xl p-5"
                style={{
                  background: theme.colors.surface[2],
                  border: `1px solid ${theme.colors.border[1]}`,
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: theme.colors.accent.primary }}
                  />
                  <span
                    className="font-bold uppercase tracking-widest"
                    style={{
                      fontSize: theme.typography.sizes.xxs,
                      color: theme.colors.text.subtle,
                    }}
                  >
                    Ask Karuna
                  </span>
                </div>
                <SuggestedQuestions
                  questions={suggestedQuestions}
                  onSelect={sendSuggested}
                  isLoading={suggestionsLoading}
                  isDisabled={isSending}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Responsive: Hide right sidebar on mobile ── */}
        <style>{`
          @media (max-width: 768px) {
            .ai-layout {
              grid-template-columns: 1fr !important;
            }
            .ai-sidebar {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}
