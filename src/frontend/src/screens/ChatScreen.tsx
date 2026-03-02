import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronUp,
  Lock,
  Paperclip,
  Pencil,
  Reply,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { MessageView } from "../backend.d";
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
import { playReceiveSound, playSendSound } from "../utils/soundEffects";

// ─── Reaction Emojis ──────────────────────────────────────────────────────────
const REACTION_EMOJIS = ["❤️", "🌻", "😂", "👍", "😮", "😢"];

// ─── Parse backend reactions string ──────────────────────────────────────────
function parseReactions(reactionsStr: string): ReactionsMap {
  if (!reactionsStr || reactionsStr === "{}") return {};
  try {
    // Handle both JSON format and other formats
    return JSON.parse(reactionsStr) as ReactionsMap;
  } catch {
    return {};
  }
}

// ─── Merge local + backend reactions ─────────────────────────────────────────
function mergeReactions(
  local: ReactionsMap,
  backend: ReactionsMap,
): ReactionsMap {
  const merged: ReactionsMap = { ...backend };
  for (const [emoji, count] of Object.entries(local)) {
    merged[emoji] = (merged[emoji] ?? 0) + count;
  }
  return merged;
}

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
        left: Math.min(position.x, window.innerWidth - 260),
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

// ─── Context Menu ─────────────────────────────────────────────────────────────
interface MessageContextMenuProps {
  position: { x: number; y: number };
  isMine: boolean;
  onReact: () => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

function MessageContextMenu({
  position,
  isMine,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onClose,
}: MessageContextMenuProps) {
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

  const menuStyle: React.CSSProperties = {
    left: Math.min(position.x, window.innerWidth - 180),
    top: Math.max(position.y - 8, 8),
    background: "white",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    border: "1.5px solid oklch(0.92 0.04 88)",
    borderRadius: "16px",
    padding: "6px",
    minWidth: 160,
    zIndex: 51,
  };

  return (
    <div ref={ref} className="fixed" style={menuStyle}>
      <button
        type="button"
        onClick={() => {
          onReact();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-yellow-50 transition-colors text-left"
        style={{ color: "oklch(0.38 0.08 65)" }}
      >
        😊 React
      </button>
      <button
        type="button"
        onClick={() => {
          onReply();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-yellow-50 transition-colors text-left"
        style={{ color: "oklch(0.38 0.08 65)" }}
      >
        <Reply className="w-3.5 h-3.5" /> Reply
      </button>
      {isMine && onEdit && (
        <button
          type="button"
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-yellow-50 transition-colors text-left"
          style={{ color: "oklch(0.38 0.08 65)" }}
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      )}
      {isMine && onDelete && (
        <button
          type="button"
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors text-left"
          style={{ color: "oklch(0.5 0.18 25)" }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete for Everyone
        </button>
      )}
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

    const secrets = getSecretMessages(convId);
    if (!secrets.has(msgId)) return;

    const startKey = `sf_secret_start_${convId}_${msgId}`;
    const storedStart = localStorage.getItem(startKey);
    let startTime: number;

    if (storedStart) {
      startTime = Number.parseInt(storedStart, 10);
    } else {
      if (!isMine) return;
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

// ─── Message Bubble ───────────────────────────────────────────────────────────
interface MessageBubbleProps {
  msg: MessageView;
  isMine: boolean;
  isOptimistic: boolean;
  showSenderName: boolean;
  convId: string;
  onReactionAdd: (msgId: string, emoji: string) => void;
  onDelete: (msgId: string) => void;
  onEdit: (msgId: string, currentContent: string) => void;
  onReply: (msgId: string, preview: string) => void;
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
  onEdit,
  onReply,
  reactions,
  isDeleted,
  isSecret,
}: MessageBubbleProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number>(0);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const { expired, secondsLeft } = useSecretCountdown(
    msg.id,
    convId,
    isSecret,
    isMine,
  );

  // Long press for context menu
  function handlePointerDown(e: React.PointerEvent) {
    const { clientX, clientY } = e;
    longPressTimer.current = setTimeout(() => {
      setContextPos({ x: clientX, y: clientY });
      setShowContextMenu(true);
    }, 500);
  }

  function handlePointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }

  // Swipe to reply (touch)
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(false);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx > 10) {
      setIsSwiping(true);
      setSwipeX(Math.min(dx, 80));
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  }

  function handleTouchEnd() {
    if (isSwiping && swipeX > 60) {
      onReply(msg.id, msg.content.slice(0, 60));
    }
    setSwipeX(0);
    setIsSwiping(false);
  }

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // Deleted state
  if (isDeleted || msg.deleted) {
    return (
      <div
        className={`w-full flex flex-col ${isMine ? "items-end" : "items-start"}`}
      >
        <div
          className="px-4 py-2 rounded-2xl text-xs italic opacity-40"
          style={{
            background: "oklch(0.95 0.02 80)",
            color: "oklch(0.55 0.04 68)",
          }}
        >
          🗑️ This message was deleted
        </div>
      </div>
    );
  }

  const backendReactions = parseReactions(msg.reactions ?? "{}");
  const mergedReactions = mergeReactions(reactions, backendReactions);
  const reactionEntries = Object.entries(mergedReactions).filter(
    ([, count]) => count > 0,
  );

  return (
    <div
      className={`w-full flex flex-col ${isMine ? "items-end" : "items-start"} animate-fade-in`}
      style={{
        transform: `translateX(${isSwiping ? (isMine ? -swipeX : swipeX) : 0}px)`,
        transition: isSwiping ? "none" : "transform 0.2s ease-out",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {showSenderName && (
        <span
          className="text-xs font-semibold mb-1 px-1"
          style={{ color: "oklch(0.58 0.08 68)" }}
        >
          {msg.senderName}
        </span>
      )}

      <div
        className="relative flex items-end gap-1.5"
        style={{ maxWidth: "80%" }}
      >
        {/* Reply indicator during swipe */}
        {isSwiping && swipeX > 30 && (
          <div
            className="absolute flex items-center justify-center w-7 h-7 rounded-full"
            style={{
              background: "oklch(0.72 0.155 68)",
              [isMine ? "right" : "left"]: -36,
              opacity: Math.min(1, (swipeX - 30) / 30),
            }}
          >
            <Reply className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Delete button for own messages (hover) */}
        {isMine && !isOptimistic && (
          <button
            type="button"
            onClick={() => onDelete(msg.id)}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
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

        {/* Bubble */}
        <div
          ref={bubbleRef}
          className={`px-4 py-3 transition-opacity duration-300 relative group ${
            isMine ? "chat-bubble-sent" : "chat-bubble-received"
          } ${isOptimistic ? "opacity-60" : "opacity-100"}`}
          style={{
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            cursor: "default",
            minWidth: 0,
            maxWidth: "100%",
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={handleContextMenu}
        >
          {/* Reply preview */}
          {msg.replyToId && msg.replyPreview && (
            <div
              className="rounded-xl px-3 py-1.5 mb-2 text-xs border-l-[3px]"
              style={{
                background: isMine
                  ? "rgba(255,255,255,0.4)"
                  : "rgba(0,0,0,0.05)",
                borderColor: "oklch(0.72 0.155 68)",
                color: "oklch(0.5 0.06 65)",
              }}
            >
              <span className="font-semibold">↩️ </span>
              {msg.replyPreview.length > 50
                ? `${msg.replyPreview.slice(0, 50)}…`
                : msg.replyPreview}
            </div>
          )}

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

          {/* Message content by type */}
          {isSecret && expired ? (
            <p
              className="text-sm italic"
              style={{ color: "oklch(0.6 0.05 68)" }}
            >
              🔒 This message has disappeared
            </p>
          ) : msg.messageType === "image" || msg.messageType === "gif" ? (
            <img
              src={msg.content}
              alt={msg.messageType === "gif" ? "GIF" : "Image"}
              className="max-w-full rounded-xl"
              style={{ maxHeight: 240, objectFit: "cover" }}
              loading="lazy"
            />
          ) : msg.messageType === "voice" ? (
            <div
              className="flex items-center gap-3 py-1"
              style={{ minWidth: 160 }}
            >
              <span className="text-xl">🎙️</span>
              {/* biome-ignore lint/a11y/useMediaCaption: voice messages are user-recorded, no captions available */}
              <audio
                controls
                src={msg.content}
                className="h-8"
                style={{ maxWidth: 180 }}
              />
            </div>
          ) : (
            <p
              className="text-sm leading-relaxed"
              style={{
                color: isMine ? "oklch(0.38 0.1 60)" : "oklch(0.38 0.05 65)",
                wordBreak: "normal",
                overflowWrap: "break-word",
                whiteSpace: "normal",
              }}
            >
              {msg.content}
            </p>
          )}

          {/* Edited label */}
          {msg.edited && (
            <span
              className="text-xs italic opacity-60 block mt-0.5"
              style={{ color: "oklch(0.55 0.04 65)" }}
            >
              (edited)
            </span>
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

      {/* Context menu */}
      {showContextMenu && (
        <MessageContextMenu
          position={contextPos}
          isMine={isMine}
          onReact={() => {
            setPickerPos(contextPos);
            setShowReactionPicker(true);
          }}
          onReply={() => onReply(msg.id, msg.content.slice(0, 60))}
          onEdit={
            isMine && !isOptimistic
              ? () => onEdit(msg.id, msg.content)
              : undefined
          }
          onDelete={
            isMine && !isOptimistic ? () => onDelete(msg.id) : undefined
          }
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
}

// ─── Attachment Menu ──────────────────────────────────────────────────────────
interface AttachmentMenuProps {
  onImage: () => void;
  onGif: () => void;
  onVoice: () => void;
  onClose: () => void;
}

function AttachmentMenu({
  onImage,
  onGif,
  onVoice,
  onClose,
}: AttachmentMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 flex flex-col gap-1.5 p-2 rounded-2xl animate-scale-in"
      style={{
        background: "white",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        border: "1.5px solid oklch(0.92 0.04 88)",
        zIndex: 40,
      }}
    >
      <button
        type="button"
        onClick={() => {
          onImage();
          onClose();
        }}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-50 transition-colors"
        style={{ color: "oklch(0.38 0.08 65)", whiteSpace: "nowrap" }}
      >
        📷 Image / Video
      </button>
      <button
        type="button"
        onClick={() => {
          onGif();
          onClose();
        }}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-50 transition-colors"
        style={{ color: "oklch(0.38 0.08 65)", whiteSpace: "nowrap" }}
      >
        🎞️ GIF
      </button>
      <button
        type="button"
        onClick={() => {
          onVoice();
          onClose();
        }}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-50 transition-colors"
        style={{ color: "oklch(0.38 0.08 65)", whiteSpace: "nowrap" }}
      >
        🎙️ Voice
      </button>
    </div>
  );
}

// ─── GIF URL Input ────────────────────────────────────────────────────────────
interface GifInputProps {
  onSend: (url: string) => void;
  onClose: () => void;
}

function GifInput({ onSend, onClose }: GifInputProps) {
  const [url, setUrl] = useState("");

  return (
    <div
      className="flex items-center gap-2 p-2 rounded-2xl mb-2"
      style={{
        background: "oklch(0.96 0.04 90)",
        border: "1.5px solid oklch(0.88 0.06 85)",
      }}
    >
      <span className="text-base">🎞️</span>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste GIF URL…"
        className="flex-1 bg-transparent text-sm outline-none"
        style={{ color: "oklch(0.38 0.08 65)" }}
        // biome-ignore lint/a11y/noAutofocus: intentional for GIF input
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && url.trim()) {
            onSend(url.trim());
          }
          if (e.key === "Escape") onClose();
        }}
      />
      <button
        type="button"
        onClick={() => url.trim() && onSend(url.trim())}
        disabled={!url.trim()}
        className="px-3 py-1 rounded-xl text-xs font-bold disabled:opacity-40 transition-opacity"
        style={{ background: "oklch(0.72 0.155 68)", color: "white" }}
      >
        Send
      </button>
      <button
        type="button"
        onClick={onClose}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10"
        aria-label="Cancel GIF"
      >
        <X className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.06 65)" }} />
      </button>
    </div>
  );
}

// ─── Voice Recorder ───────────────────────────────────────────────────────────
interface VoiceRecorderProps {
  onSend: (dataUrl: string) => void;
  onClose: () => void;
}

function VoiceRecorder({ onSend, onClose }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            onSend(reader.result);
          }
        };
        reader.readAsDataURL(blob);
        // Stop all tracks
        for (const track of stream.getTracks()) track.stop();
      };

      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
      onClose();
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
  useEffect(() => {
    void startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-2xl mb-2"
      style={{
        background: "oklch(0.96 0.04 90)",
        border: "1.5px solid oklch(0.88 0.06 85)",
      }}
    >
      <span className="text-base">🎙️</span>
      <div
        className="flex items-center gap-1.5 flex-1"
        style={{
          color: recording ? "oklch(0.55 0.18 25)" : "oklch(0.5 0.06 65)",
        }}
      >
        {recording && (
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: "oklch(0.55 0.18 25)",
              animation: "ping 1s ease-in-out infinite",
            }}
          />
        )}
        <span className="text-sm font-semibold">
          {recording ? `Recording… ${seconds}s` : "Starting…"}
        </span>
      </div>
      {recording && (
        <button
          type="button"
          onClick={stopRecording}
          className="px-3 py-1 rounded-xl text-xs font-bold"
          style={{ background: "oklch(0.72 0.155 68)", color: "white" }}
        >
          Send
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10"
        aria-label="Cancel recording"
      >
        <X className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.06 65)" }} />
      </button>
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
  const [visibleCount, setVisibleCount] = useState(25);

  // Reply state
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);

  // Edit state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Attachment state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showGifInput, setShowGifInput] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const convId = activeConversationId ?? "";
  const participantName = activeConversationName ?? "Chat";
  const currentUserId = profile?.id ?? "";
  const currentUserName = profile?.username ?? "";

  // Debug: log currentUserId so alignment comparisons can be verified in DevTools
  useEffect(() => {
    if (currentUserId) {
      console.debug("[SunflowerChat] currentUserId =", currentUserId);
    }
  }, [currentUserId]);

  const mood = getMood(currentUserId);
  const moodRingStyle = getMoodRingStyle(mood);

  const { data: messages = [], isLoading } = useQuery<MessageView[]>({
    queryKey: ["messages", sessionId, convId],
    queryFn: async () => {
      if (!actor || !sessionId || !convId) return [];
      return actor.getMessages(sessionId, convId, 0n, 50n);
    },
    enabled: !!actor && !!sessionId && !!convId,
    refetchInterval: 1500,
  });

  // Track previous messages to detect new incoming messages for sound
  const prevMessageCountRef = useRef(0);
  const prevLastMsgIdRef = useRef<string>("");

  useEffect(() => {
    if (
      messages.length > prevMessageCountRef.current &&
      prevMessageCountRef.current > 0
    ) {
      const sorted = [...messages].sort((a, b) =>
        Number(a.timestamp - b.timestamp),
      );
      const latest = sorted[sorted.length - 1];
      if (
        latest &&
        latest.id !== prevLastMsgIdRef.current &&
        latest.senderId !== currentUserId
      ) {
        playReceiveSound();
        prevLastMsgIdRef.current = latest.id;
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, currentUserId]);

  // Update last seen on mount + every 30s
  useEffect(() => {
    if (!actor || !sessionId) return;
    void actor.updateLastSeen(sessionId);
    const interval = setInterval(() => {
      void actor.updateLastSeen(sessionId);
    }, 30000);
    return () => clearInterval(interval);
  }, [actor, sessionId]);

  const allSortedMessages = useMemo(
    () => [...messages].sort((a, b) => Number(a.timestamp - b.timestamp)),
    [messages],
  );

  const sortedMessages = useMemo(
    () => allSortedMessages.slice(-visibleCount),
    [allSortedMessages, visibleCount],
  );

  const hasOlderMessages = allSortedMessages.length > visibleCount;

  const deletedSet = getDeletedMessages(convId);
  const secretSet = getSecretMessages(convId);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _reactionsV = reactionsVersion;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _deletedV = deletedVersion;

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= 150;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  const prevMessageCountRef2 = useRef(sortedMessages.length);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally depend on message count
  useEffect(() => {
    const currentCount = sortedMessages.length;
    if (currentCount > prevMessageCountRef2.current && isNearBottom()) {
      scrollToBottom("smooth");
    }
    prevMessageCountRef2.current = currentCount;
  }, [isNearBottom, scrollToBottom, sortedMessages.length]);

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom("instant");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, scrollToBottom]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setMessageText(val);
      // Debounce typing indicator -- don't update on every keystroke
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (val.length > 0) {
        typingTimer.current = setTimeout(() => {
          setIsTyping(true);
          typingTimer.current = setTimeout(() => setIsTyping(false), 3000);
        }, 100);
      } else {
        setIsTyping(false);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  // ── Send mutation ──────────────────────────────────────────────────────────
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      replyId,
      replyPrev,
      msgType,
    }: {
      content: string;
      replyId: string | null;
      replyPrev: string | null;
      msgType: string;
    }) => {
      if (!actor || !sessionId || !convId) throw new Error("Not ready");
      await actor.sendMessage(
        sessionId,
        convId,
        content,
        replyId,
        replyPrev,
        msgType,
      );
    },
    onMutate: async ({ content, replyId, replyPrev, msgType }) => {
      await queryClient.cancelQueries({
        queryKey: ["messages", sessionId, convId],
      });

      const previousMessages = queryClient.getQueryData<MessageView[]>([
        "messages",
        sessionId,
        convId,
      ]);

      const optimisticId = `optimistic-${Date.now()}`;

      const optimisticMessage: MessageView = {
        id: optimisticId,
        content,
        senderId: currentUserId,
        senderName: currentUserName,
        timestamp: BigInt(Date.now()) * 1_000_000n,
        edited: false,
        deleted: false,
        replyToId: replyId ?? undefined,
        replyPreview: replyPrev ?? undefined,
        messageType: msgType,
        reactions: "{}",
      };

      queryClient.setQueryData<MessageView[]>(
        ["messages", sessionId, convId],
        (old) => [...(old ?? []), optimisticMessage],
      );

      if (isSecretMode && convId) {
        addSecretMessage(convId, optimisticId);
      }

      return { previousMessages, optimisticId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          ["messages", sessionId, convId],
          context.previousMessages,
        );
      }
    },
    onSuccess: (_data, _vars, _context) => {
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

      queryClient.invalidateQueries({
        queryKey: ["messages", sessionId, convId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations", sessionId] });
      setTimeout(() => scrollToBottom("smooth"), 100);
    },
  });

  // ── Edit mutation ──────────────────────────────────────────────────────────
  const editMessageMutation = useMutation({
    mutationFn: async ({
      msgId,
      newContent,
    }: { msgId: string; newContent: string }) => {
      if (!actor || !sessionId || !convId) throw new Error("Not ready");
      await actor.editMessage(sessionId, convId, msgId, newContent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", sessionId, convId],
      });
      setEditingMsgId(null);
      setEditText("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to edit message");
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMessageMutation = useMutation({
    mutationFn: async (msgId: string) => {
      if (!actor || !sessionId || !convId) throw new Error("Not ready");
      await actor.deleteMessageForEveryone(sessionId, convId, msgId);
    },
    onMutate: async (msgId) => {
      // Optimistic local delete
      addDeletedMessage(convId, msgId);
      setDeletedVersion((v) => v + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", sessionId, convId],
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete message");
    },
  });

  // ── React mutation ─────────────────────────────────────────────────────────
  const reactMutation = useMutation({
    mutationFn: async ({ msgId, emoji }: { msgId: string; emoji: string }) => {
      if (!actor || !sessionId || !convId) return;
      await actor.reactToMessage(sessionId, convId, msgId, emoji);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["messages", sessionId, convId],
      });
    },
  });

  async function handleSend(
    content?: string,
    msgType = "text",
    replyId: string | null = null,
    replyPrev: string | null = null,
  ) {
    const text = (content ?? messageText).trim();
    if (!text || isSending) return;

    if (!content) {
      setMessageText("");
      setIsTyping(false);
    }
    setReplyToId(null);
    setReplyPreview(null);

    setIsSending(true);
    if (isSecretMode) setIsSecretMode(false);

    playSendSound();

    try {
      await sendMessageMutation.mutateAsync({
        content: text,
        replyId: replyId ?? replyToId,
        replyPrev: replyPrev ?? replyPreview,
        msgType,
      });
    } finally {
      setIsSending(false);
      if (!content) inputRef.current?.focus();
    }
  }

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
      reactMutation.mutate({ msgId, emoji });
    }
  }

  function handleDeleteMessage(msgId: string) {
    deleteMessageMutation.mutate(msgId);
  }

  function handleEditMessage(msgId: string, currentContent: string) {
    setEditingMsgId(msgId);
    setEditText(currentContent);
  }

  function handleReplyTo(msgId: string, preview: string) {
    setReplyToId(msgId);
    setReplyPreview(preview);
    inputRef.current?.focus();
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        void handleSend(reader.result, "image");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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

          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${participantColorClass}`}
          >
            {participantInitials}
          </div>

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
            <div className="flex flex-col gap-1.5">
              {hasOlderMessages && (
                <div className="flex justify-center py-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 25)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 hover:opacity-80 active:scale-95"
                    style={{
                      background: "oklch(0.93 0.06 85)",
                      color: "oklch(0.45 0.1 65)",
                      border: "1px solid oklch(0.88 0.06 80)",
                    }}
                  >
                    <ChevronUp className="w-3 h-3" />
                    Load older messages
                  </button>
                </div>
              )}
              {sortedMessages.map((msg, index) => {
                const isMine = msg.senderId === currentUserId;
                // Debug: log ID comparison for first few messages
                if (index < 3) {
                  console.debug(
                    `[SunflowerChat] msg[${index}] senderId="${msg.senderId}" currentUserId="${currentUserId}" isMine=${isMine}`,
                  );
                }
                const isOptimistic = msg.id.startsWith("optimistic-");
                const prevMsg = index > 0 ? sortedMessages[index - 1] : null;
                const showSenderName =
                  !isMine && (!prevMsg || prevMsg.senderId !== msg.senderId);
                const isDeleted = deletedSet.has(msg.id) || msg.deleted;
                const isSecret = secretSet.has(msg.id);
                const localReactions = getReactions(convId, msg.id);

                // Inline edit mode
                if (editingMsgId === msg.id && isMine) {
                  return (
                    <div
                      key={msg.id}
                      className={`w-full flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div className="max-w-[75%] w-full">
                        <div
                          className="flex items-center gap-2 p-2 rounded-2xl"
                          style={{
                            background: "oklch(0.97 0.04 90)",
                            border: "1.5px solid oklch(0.82 0.1 85)",
                          }}
                        >
                          <Pencil
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: "oklch(0.65 0.1 70)" }}
                          />
                          <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none"
                            style={{ color: "oklch(0.38 0.08 65)" }}
                            // biome-ignore lint/a11y/noAutofocus: intentional for edit input
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                editMessageMutation.mutate({
                                  msgId: msg.id,
                                  newContent: editText.trim(),
                                });
                              }
                              if (e.key === "Escape") {
                                setEditingMsgId(null);
                                setEditText("");
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              editMessageMutation.mutate({
                                msgId: msg.id,
                                newContent: editText.trim(),
                              })
                            }
                            className="px-2.5 py-1 rounded-xl text-xs font-bold"
                            style={{
                              background: "oklch(0.72 0.155 68)",
                              color: "white",
                            }}
                            disabled={editMessageMutation.isPending}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMsgId(null);
                              setEditText("");
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10"
                            aria-label="Cancel edit"
                          >
                            <X
                              className="w-3.5 h-3.5"
                              style={{ color: "oklch(0.55 0.06 65)" }}
                            />
                          </button>
                        </div>
                        <p
                          className="text-xs mt-1 px-1"
                          style={{ color: "oklch(0.65 0.06 70)" }}
                        >
                          Press Enter to save, Esc to cancel
                        </p>
                      </div>
                    </div>
                  );
                }

                // Add extra spacing when sender changes
                const senderChanged =
                  prevMsg !== null && prevMsg.senderId !== msg.senderId;

                return (
                  <div
                    key={msg.id}
                    style={{ marginTop: senderChanged ? 8 : 0 }}
                  >
                    <MessageBubble
                      msg={msg}
                      isMine={isMine}
                      isOptimistic={isOptimistic}
                      showSenderName={showSenderName}
                      convId={convId}
                      onReactionAdd={handleReactionAdd}
                      onDelete={handleDeleteMessage}
                      onEdit={handleEditMessage}
                      onReply={handleReplyTo}
                      reactions={localReactions}
                      isDeleted={isDeleted}
                      isSecret={isSecret}
                    />
                  </div>
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
          {/* Reply bar */}
          {replyToId && replyPreview && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-2xl mb-2"
              style={{
                background: "oklch(0.96 0.04 90)",
                border: "1.5px solid oklch(0.88 0.06 85)",
                borderLeft: "3px solid oklch(0.72 0.155 68)",
              }}
            >
              <Reply
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: "oklch(0.72 0.155 68)" }}
              />
              <p
                className="text-xs flex-1 truncate"
                style={{ color: "oklch(0.5 0.06 65)" }}
              >
                <span
                  className="font-semibold"
                  style={{ color: "oklch(0.45 0.1 68)" }}
                >
                  Replying:{" "}
                </span>
                {replyPreview}
              </p>
              <button
                type="button"
                onClick={() => {
                  setReplyToId(null);
                  setReplyPreview(null);
                }}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-black/10"
                aria-label="Cancel reply"
              >
                <X
                  className="w-3 h-3"
                  style={{ color: "oklch(0.55 0.06 65)" }}
                />
              </button>
            </div>
          )}

          {/* GIF input */}
          {showGifInput && (
            <GifInput
              onSend={(url) => {
                setShowGifInput(false);
                void handleSend(url, "gif");
              }}
              onClose={() => setShowGifInput(false)}
            />
          )}

          {/* Voice recorder */}
          {showVoiceRecorder && (
            <VoiceRecorder
              onSend={(dataUrl) => {
                setShowVoiceRecorder(false);
                void handleSend(dataUrl, "voice");
              }}
              onClose={() => setShowVoiceRecorder(false)}
            />
          )}

          <div className="flex items-center gap-2 relative">
            {/* Attachment button */}
            <div className="relative flex-shrink-0">
              {showAttachMenu && (
                <AttachmentMenu
                  onImage={() => imageInputRef.current?.click()}
                  onGif={() => setShowGifInput(true)}
                  onVoice={() => setShowVoiceRecorder(true)}
                  onClose={() => setShowAttachMenu(false)}
                />
              )}
              <button
                type="button"
                onClick={() => setShowAttachMenu((v) => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 active:scale-90"
                style={{
                  background: showAttachMenu
                    ? "oklch(0.72 0.155 68)"
                    : "oklch(0.92 0.04 88)",
                }}
                aria-label="Attach file"
              >
                <Paperclip
                  className="w-4 h-4"
                  style={{
                    color: showAttachMenu ? "white" : "oklch(0.65 0.08 70)",
                  }}
                />
              </button>
            </div>

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
                isSecretMode ? "Secret mode on" : "Toggle secret mode"
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

      {/* Hidden image input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        onChange={handleImageSelect}
        tabIndex={-1}
      />

      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes ping {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
