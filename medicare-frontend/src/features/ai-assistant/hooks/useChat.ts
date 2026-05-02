import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../api/chatApi";
import { useToast } from "@/shared/hooks/useToast";
import type { ChatMessage } from "../types/chat.types";

export function useChat() {
  const toast = useToast();
  const qc = useQueryClient();

  // ── State ────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [useHealthContext, setUseContext] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load history ─────────────────────
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["chat", "history"],
    queryFn: () => chatApi.getHistory(20),
  });

  // Initialize messages from history
  useEffect(() => {
    if (historyData?.messages) {
      setMessages(historyData.messages);
    }
  }, [historyData]);

  // ── Suggested questions ──────────────
  const { data: suggestedData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["chat", "suggested"],
    queryFn: chatApi.getSuggestedQuestions,
    staleTime: 10 * 60 * 1000,
  });

  // ── Health context ───────────────────
  const { data: healthContext, isLoading: contextLoading } = useQuery({
    queryKey: ["chat", "context"],
    queryFn: chatApi.getHealthContext,
    staleTime: 5 * 60 * 1000,
  });

  // ── Auto-scroll ──────────────────────
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior });
      }, 50);
    },
    []
  );

  useEffect(() => {
    scrollToBottom("instant");
  }, [historyData, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // ── Send message mutation ────────────
  const sendMutation = useMutation({
    mutationFn: chatApi.sendMessage,
    onMutate: (variables) => {
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: variables.message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsTyping(true);
      scrollToBottom();
    },
    onSuccess: (data) => {
      setIsTyping(false);
      const aiMsg: ChatMessage = {
        id: data.message_id,
        role: "assistant",
        content: data.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => {
        const withoutTemp = prev.filter(
          (m) => !String(m.id).startsWith("temp-")
        );
        const lastUserMsg = prev.find(
          (m) => String(m.id).startsWith("temp-") && m.role === "user"
        );
        if (lastUserMsg) {
          return [
            ...withoutTemp,
            { ...lastUserMsg, id: Date.now() },
            aiMsg,
          ];
        }
        return [...withoutTemp, aiMsg];
      });
      scrollToBottom();
    },
    onError: () => {
      setIsTyping(false);
      setMessages((prev) =>
        prev.filter((m) => !String(m.id).startsWith("temp-"))
      );
      toast.error("Failed to send message. Try again.");
    },
  });

  // ── Clear history mutation ───────────
  const clearMutation = useMutation({
    mutationFn: chatApi.clearHistory,
    onSuccess: () => {
      setMessages([]);
      qc.invalidateQueries({ queryKey: ["chat", "history"] });
      toast.success("Chat history cleared.");
    },
  });

  // ── Actions ──────────────────────────
  const sendMessage = useCallback(() => {
    const msg = inputValue.trim();
    if (!msg || sendMutation.isPending) return;
    sendMutation.mutate({
      message: msg,
      include_health_context: useHealthContext,
    });
  }, [inputValue, sendMutation, useHealthContext]);

  const sendSuggested = useCallback(
    (question: string) => {
      if (sendMutation.isPending) return;
      sendMutation.mutate({
        message: question,
        include_health_context: useHealthContext,
      });
    },
    [sendMutation, useHealthContext]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return {
    // State
    messages,
    inputValue,
    setInputValue,
    isTyping,
    useHealthContext,
    setUseContext,

    // Data
    suggestedQuestions: suggestedData?.questions || [],
    healthContext,
    contextLoading,
    historyLoading,
    suggestionsLoading,

    // Refs
    bottomRef,
    inputRef,

    // Actions
    sendMessage,
    sendSuggested,
    handleKeyDown,
    clearHistory: clearMutation.mutate,
    isSending: sendMutation.isPending,
    isClearing: clearMutation.isPending,
  };
}
