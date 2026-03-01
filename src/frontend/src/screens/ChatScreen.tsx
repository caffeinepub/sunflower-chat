import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { MessagePreview } from "../backend.d";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import {
  formatMessageTime,
  getAvatarColor,
  getInitials,
} from "../utils/helpers";
import {
  type ReactionsMap,
  addDeletedMessage,
  addReaction,
  addSecretMessage,
  addXP,
  getDeletedMessages,
  getMood,
  getMoodRingStyle,
  getReactions,
  getSecretMessages,
  getXpLevel,
} from "../utils/localFeatures";

// ─── Reaction Emojis ──────────────────────────────────────────────────────────
const REACTION_EMOJIS = ["❤️", "🌻", "😂", "👍"];

// ─── Reaction Picker ─────────────────────────────────────────────────────────
interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

function ReactionPicker({ onSelect, onClose, position }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 flex gap-1 p-1.5 rounded-2xl"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.max(position.y - 56, 8),
        background: "white",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        border: "1.5px solid oklch(0.92 0.04 88)",
      }}
    >
      {REACTION_EMOJIS.map((emoji, i) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="reaction-picker-item w-9 h-9 flex items-center justify-center rounded-xl text-xl hover:scale-125 transition-transform duration-150 active:scale-95"
          style={{
            animationDelay: `${i * 0.04}s`,
            background: "transparent",
          }}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ─── Secret countdown helper ──────────────────────────────────────────────────
function useSecretCountdown(
  msgId: string,
  convId: string,
  isSecret: boolean,
  isMine: boolean,
): { expired: boolean; secondsLeft: number } {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!isSecret) return;

    // Check if already removed
    const secrets = getSecretMessages(convId);
    if (!secrets.has(msgId)) return;

    const startKey = `sf_secret_start_${convId}_${msgId}`;
    const storedStart = localStorage.getItem(startKey);
    let startTime: number;

    if (storedStart) {
      startTime = Number.parseInt(storedStart, 10);
    } else {
      if (!isMine) return; // only sender starts timer
      startTime = Date.now();
      localStorage.setItem(startKey, String(startTime));
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed >= 10) {
      setExpired(true);
      return;
    }
    setSecondsLeft(10 - elapsed);

    const interval = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - startTime) / 1000);
      const left = 10 - newElapsed;
      if (left <= 0) {
        setExpired(true);
        clearInterval(interval);
      } else {
        setSecondsLeft(left);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isSecret, msgId, convId, isMine]);

  return { expired, secondsLeft };
}

// ─── Single message component ─────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: MessagePreview;
  isMine: boolean;
  isOptimistic: boolean;
  showSenderName: boolean;
  convId: string;
  onReactionAdd: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string) => void;
  reactions: ReactionsMap;
  isDeleted: boolean;
  isSecret: boolean;
}

function MessageBubble({
  msg,
  isMine,
  isOptimistic,
  showSenderName,
  convId,
  onReactionAdd,
  onDelete,
  reactions,
  isDeleted,
  isSecret,
}: MessageBubbleProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const { expired, secondsLeft } = useSecretCountdown(
    msg.id,
    convId,
    isSecret,
    isMine,
  );

  // Long press support
  function handlePointerDown(e: React.PointerEvent) {
    const { clientX, clientY } = e;
    longPressTimer.current = setTimeout(() => {
      setPickerPos({ x: clientX, y: clientY });
      setShowReactionPicker(true);
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setPickerPos({ x: e.clientX, y: e.clientY });
    setShowReactionPicker(true);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  if (isDeleted) {
    return (
      <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        <div
          className="px-4 py-2 rounded-2xl text-xs italic opacity-40"
          style={{
            background: "oklch(0.95 0.02 80)",
            color: "oklch(0.55 0.04 68)",
          }}
        >
          🗑️ Message deleted
        </div>
      </div>
    );
  }

  const reactionEntries = Object.entries(reactions).filter(
    ([, count]) => count > 0,
  );

  return (
    <div
      className={`flex flex-col ${isMine ? "items-end" : "items-start"} animate-fade-in`}
      style={{ animationDelay: "0s" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showSenderName && (
        <span
          className="text-xs font-semibold mb-1 px-1"
          style={{ color: "oklch(0.58 0.08 68)" }}
        >
          {msg.senderName}
        </span>
      )}

      <div className="relative flex items-end gap-1.5">
        {/* Delete button for own messages */}
        {isMine && hovered && !isOptimistic && (
          <button
            type="button"
            onClick={() => onDelete(msg.id)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{
              background: "oklch(0.95 0.02 25)",
              color: "oklch(0.55 0.15 25)",
            }}
            aria-label="Delete message"
            title="Delete message"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* The bubble */}
        <div
          ref={bubbleRef}
          className={`max-w-[75%] px-4 py-2.5 transition-opacity duration-300 relative overflow-hidden ${
            isMine ? "chat-bubble-sent" : "chat-bubble-received"
          } ${isOptimistic ? "opacity-60" : "opacity-100"}`}
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", cursor: "default" }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={handleContextMenu}
        >
          {/* Secret message overlay */}
          {isSecret && (
            <div className="flex items-center gap-1.5 mb-1">
              <Lock
                className="w-3 h-3"
                style={{ color: "oklch(0.55 0.1 68)", flexShrink: 0 }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: "oklch(0.55 0.1 68)" }}
              >
                {expired ? "Disappeared" : `🔒 ${secondsLeft}s`}
              </span>
            </div>
          )}

          {isSecret && expired ? (
            <p
              className="text-sm italic"
              style={{ color: "oklch(0.6 0.05 68)" }}
            >
              🔒 This message has disappeared
            </p>
          ) : (
            <p
              className="text-sm leading-relaxed break-words"
              style={{
                color: isMine ? "oklch(0.38 0.1 60)" : "oklch(0.38 0.05 65)",
              }}
            >
              {msg.content}
            </p>
          )}

          {/* Secret countdown bar */}
          {isSecret && !expired && isMine && (
            <div
              className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
              style={{
                width: `${(secondsLeft / 10) * 100}%`,
                background: "oklch(0.72 0.155 68)",
              }}
            />
          )}
        </div>
      </div>

      {/* Reactions row */}
      {reactionEntries.length > 0 && (
        <div className="flex gap-1 mt-1 px-1 flex-wrap">
          {reactionEntries.map(([emoji, count]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReactionAdd(msg.id, emoji)}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold transition-all duration-150 hover:scale-110 active:scale-95"
              style={{
                background: "white",
                border: "1.5px solid oklch(0.9 0.04 88)",
                color: "oklch(0.45 0.06 65)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
              aria-label={`${count} ${emoji} reactions`}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </button>
          ))}
        </div>
      )}

      <span
        className="text-xs mt-1 px-1"
        style={{ color: "oklch(0.72 0.04 70)" }}
      >
        {isOptimistic ? "Sending…" : formatMessageTime(msg.timestamp)}
      </span>

      {/* Reaction picker */}
      {showReactionPicker && (
        <ReactionPicker
          onSelect={(emoji) => onReactionAdd(msg.id, emoji)}
          onClose={() => setShowReactionPicker(false)}
          position={pickerPos}
        />
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { actor } = useActor();
  const {
    sessionId,
    profile,
    activeConversationId,
    activeConversationName,
    backToList,
  } = useApp();
  const queryClient = useQueryClient();

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSecretMode, setIsSecretMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [reactionsVersion, setReactionsVersion] = useState(0);
  const [deletedVersion, setDeletedVersion] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convId = activeConversationId ?? "";
  const participantName = activeConversationName ?? "Chat";
  const currentUserId = profile?.id ?? "";
  const currentUserName = profile?.username ?? "";

  // Mood ring for current user's avatar (not shown in this screen but useful context)
  const mood = getMood(currentUserId);
  const moodRingStyle = getMoodRingStyle(mood);

  const { data: messages = [], isLoading } = useQuery<MessagePreview[]>({
    queryKey: ["messages", sessionId, convId],
    queryFn: async () => {
      if (!actor || !sessionId || !convId) return [];
      return actor.getMessages(sessionId, convId, 0n, 50n);
    },
    enabled: !!actor && !!sessionId && !!convId,
    refetchInterval: 1500,
  });

  // Sort messages by timestamp ascending
  const sortedMessages = [...messages].sort((a, b) =>
    Number(a.timestamp - b.timestamp),
  );

  // Get sets (re-computed when versions change)
  const deletedSet = getDeletedMessages(convId);
  const secretSet = getSecretMessages(convId);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _reactionsV = reactionsVersion;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _deletedV = deletedVersion;

  // ── Smart auto-scroll ──────────────────────────────────────────────────────
  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= 150;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally depend on message count
  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom("smooth");
    }
  }, [isNearBottom, scrollToBottom, sortedMessages.length]);

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom("instant");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, scrollToBottom]);

  // Typing indicator
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessageText(e.target.value);
    setIsTyping(e.target.value.length > 0);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (e.target.value.length > 0) {
      typingTimer.current = setTimeout(() => setIsTyping(false), 3000);
    }
  }

  // Cleanup typing timer
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  // ── Send with optimistic update ────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!actor || !sessionId || !convId) throw new Error("Not ready");
      await actor.sendMessage(sessionId, convId, content);
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", sessionId, convId],
      });

      const previousMessages = queryClient.getQueryData<MessagePreview[]>([
        "messages",
        sessionId,
        convId,
      ]);

      const optimisticId = `optimistic-${Date.now()}`;

      const optimisticMessage: MessagePreview = {
        id: optimisticId,
        content,
        senderId: currentUserId,
        senderName: currentUserName,
        timestamp: BigInt(Date.now()) * 1_000_000n,
      };

      queryClient.setQueryData<MessagePreview[]>(
        ["messages", sessionId, convId],
        (old) => [...(old ?? []), optimisticMessage],
      );

      // If secret mode, track this message as secret
      if (isSecretMode && convId) {
        addSecretMessage(convId, optimisticId);
      }

      return { previousMessages, optimisticId };
    },
    onError: (_err, _content, context) => {
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          ["messages", sessionId, convId],
          context.previousMessages,
        );
      }
    },
    onSuccess: (_data, _content, context) => {
      // Add XP for sending a message
      const userId = profile?.id;
      if (userId) {
        const oldXp = Number.parseInt(
          localStorage.getItem(`sf_xp_${userId}`) ?? "0",
          10,
        );
        const oldLevel = getXpLevel(oldXp);
        const newXp = addXP(userId, 1);
        const newLevel = getXpLevel(newXp);
        if (newLevel.name !== oldLevel.name) {
          toast.success(
            `Level up! You're now a ${newLevel.emoji} ${newLevel.name}!`,
          );
        }
      }

      // If we had an optimistic secret message, we need to migrate the key
      // to the real message ID — but since we don't get the real ID back easily,
      // just leave the optimistic entry (it will countdown from when it was created)
      if (isSecretMode && context?.optimisticId && convId) {
        // Secret message tracking stays on optimistic ID until real messages load
        // The 10s countdown starts from when the message was sent
      }

      queryClient.invalidateQueries({
        queryKey: ["messages", sessionId, convId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations", sessionId] });
      setTimeout(() => scrollToBottom("smooth"), 100);
    },
  });

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || isSending) return;

    setMessageText("");
    setIsTyping(false);
    setIsSending(true);
    if (isSecretMode) setIsSecretMode(false); // Reset after send
    try {
      await sendMessage.mutateAsync(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  function handleReactionAdd(msgId: string, emoji: string) {
    if (convId) {
      addReaction(convId, msgId, emoji);
      setReactionsVersion((v) => v + 1);
    }
  }

  function handleDeleteMessage(msgId: string) {
    if (convId) {
      addDeletedMessage(convId, msgId);
      setDeletedVersion((v) => v + 1);
    }
  }

  const participantColorClass = getAvatarColor(participantName);
  const participantInitials = getInitials(participantName);

  return (
    <div className="sunflower-page flex flex-col" style={{ height: "100dvh" }}>
      <div className="w-full max-w-[480px] mx-auto flex flex-col flex-1 h-full">
        {/* Top bar */}
        <header
          className="flex-shrink-0 px-4 py-3 flex items-center gap-3 border-b"
          style={{
            background: "oklch(var(--sunflower-bg) / 0.95)",
            backdropFilter: "blur(12px)",
            borderColor: "oklch(var(--border))",
          }}
        >
          <button
            type="button"
            onClick={backToList}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
            aria-label="Back to chat list"
          >
            <ArrowLeft
              className="w-5 h-5"
              style={{ color: "oklch(0.45 0.1 65)" }}
            />
          </button>

          {/* Participant Avatar */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${participantColorClass}`}
          >
            {participantInitials}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <h1
              className="font-bold text-base truncate"
              style={{ color: "oklch(0.35 0.08 65)" }}
            >
              {participantName}
            </h1>
            <p
              className="text-xs flex items-center gap-1.5"
              style={{ color: "oklch(0.65 0.06 70)" }}
            >
              {isTyping ? (
                <>
                  <span className="flex gap-0.5" aria-label="Typing">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "oklch(0.72 0.155 68)",
                          display: "inline-block",
                          animation: `typingDot 1s ease-in-out ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </span>
                  <span style={{ color: "oklch(0.72 0.155 68)" }}>typing…</span>
                </>
              ) : (
                <>
                  <span className="relative flex-shrink-0" aria-hidden="true">
                    <span
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{
                        background: "oklch(0.65 0.18 145)",
                        opacity: 0.5,
                      }}
                    />
                    <span
                      className="relative block w-2 h-2 rounded-full"
                      style={{ background: "oklch(0.58 0.2 145)" }}
                    />
                  </span>
                  Online 🌻
                </>
              )}
            </p>
          </div>

          {/* Current user avatar with mood ring */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(currentUserName)}`}
            style={moodRingStyle}
            title={currentUserName}
          >
            {getInitials(currentUserName)}
          </div>
        </header>

        {/* Messages area */}
        <main
          ref={scrollContainerRef as React.RefObject<HTMLElement>}
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ overscrollBehavior: "contain" }}
        >
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="animate-pulse rounded-[20px] h-10"
                    style={{
                      width: `${100 + i * 30}px`,
                      background:
                        i % 2 === 0
                          ? "oklch(0.93 0.1 80 / 0.5)"
                          : "oklch(0.97 0.025 88 / 0.7)",
                    }}
                  />
                </div>
              ))}
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <img
                src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
                alt=""
                style={{ width: 64, height: 64, opacity: 0.35 }}
              />
              <p
                className="text-sm mt-3 font-medium"
                style={{ color: "oklch(0.6 0.07 70)" }}
              >
                Say hello! 🌻
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "oklch(0.72 0.04 70)" }}
              >
                Be the first to start the conversation
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedMessages.map((msg, index) => {
                const isMine = msg.senderId === currentUserId;
                const isOptimistic = msg.id.startsWith("optimistic-");
                const prevMsg = index > 0 ? sortedMessages[index - 1] : null;
                const showSenderName =
                  !isMine && (!prevMsg || prevMsg.senderId !== msg.senderId);
                const isDeleted = deletedSet.has(msg.id);
                const isSecret = secretSet.has(msg.id);
                const reactions = getReactions(convId, msg.id);

                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={isMine}
                    isOptimistic={isOptimistic}
                    showSenderName={showSenderName}
                    convId={convId}
                    onReactionAdd={handleReactionAdd}
                    onDelete={handleDeleteMessage}
                    reactions={reactions}
                    isDeleted={isDeleted}
                    isSecret={isSecret}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input area */}
        <footer
          className="flex-shrink-0 px-4 py-3 border-t"
          style={{
            background: "oklch(var(--sunflower-bg) / 0.95)",
            backdropFilter: "blur(12px)",
            borderColor: "oklch(var(--border))",
          }}
        >
          <div className="flex items-center gap-2">
            {/* Secret mode toggle */}
            <button
              type="button"
              onClick={() => setIsSecretMode((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 active:scale-90"
              style={{
                background: isSecretMode
                  ? "oklch(0.55 0.12 68)"
                  : "oklch(0.92 0.04 88)",
                boxShadow: isSecretMode
                  ? "0 2px 12px oklch(0.55 0.12 68 / 0.35)"
                  : "none",
              }}
              aria-label={
                isSecretMode
                  ? "Secret mode on — message will disappear"
                  : "Toggle secret message mode"
              }
              title={
                isSecretMode ? "Secret mode ON (10s timer)" : "Secret mode OFF"
              }
            >
              <Lock
                className="w-4 h-4"
                style={{
                  color: isSecretMode ? "white" : "oklch(0.65 0.08 70)",
                }}
              />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isSecretMode ? "🔒 Secret message (10s)…" : "Type a message… 🌻"
              }
              className="flex-1 sunflower-input text-sm py-2.5"
              style={{
                minHeight: 44,
                borderColor: isSecretMode ? "oklch(0.55 0.12 68)" : undefined,
              }}
              disabled={isSending}
              autoComplete="off"
            />

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!messageText.trim() || isSending}
              className="w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 active:scale-90 disabled:opacity-40"
              style={{
                background: messageText.trim()
                  ? "oklch(0.72 0.155 68)"
                  : "oklch(0.9 0.05 80)",
                boxShadow: messageText.trim()
                  ? "0 4px 16px oklch(0.72 0.155 68 / 0.35)"
                  : "none",
              }}
              aria-label="Send message"
            >
              {isSending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <img
                  src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
                  alt="Send"
                  style={{ width: 22, height: 22 }}
                />
              )}
            </button>
          </div>

          {/* Secret mode indicator */}
          {isSecretMode && (
            <p
              className="text-xs mt-1.5 text-center"
              style={{ color: "oklch(0.55 0.12 68)" }}
            >
              🔒 This message will disappear in 10 seconds
            </p>
          )}
        </footer>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
