import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  LogOut,
  MessageCircle,
  Moon,
  Pin,
  Radio,
  RefreshCw,
  Sun,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ConversationView, MessageView } from "../backend.d";
import DailySurpriseModal from "../components/DailySurpriseModal";
import ProfileModal from "../components/ProfileModal";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";
import { generateFriendCode, useFriends } from "../hooks/useFriends";
import type { FriendEntry } from "../hooks/useFriends";
import {
  formatRelativeTime,
  getAvatarColor,
  getInitials,
} from "../utils/helpers";
import {
  getDailySurpriseShown,
  getDarkMode,
  getMood,
  getMoodRingStyle,
  getXP,
  getXpLevel,
  setDailySurpriseShown,
  setDarkMode,
} from "../utils/localFeatures";
import {
  playFriendAddSound,
  playFriendRemoveSound,
} from "../utils/soundEffects";

// ─── Unread badge tracking ────────────────────────────────────────────────────
type UnreadMap = Record<string, number>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getParticipantInfo(
  conversation: ConversationView,
  currentUserId: string,
): { name: string; id: string } {
  // If it's a group, return group name
  if (conversation.isGroup) {
    return {
      name:
        conversation.groupName ??
        `Group (${conversation.participantIds.length})`,
      id: conversation.id,
    };
  }

  const otherMsg = [...conversation.messages]
    .reverse()
    .find((m: MessageView) => m.senderId !== currentUserId);
  if (otherMsg) return { name: otherMsg.senderName, id: otherMsg.senderId };

  const myMsg = conversation.messages[0];
  if (myMsg && myMsg.senderId === currentUserId) {
    return { name: `Chat ${conversation.id.slice(0, 6)}`, id: conversation.id };
  }

  return { name: "Unknown", id: conversation.id };
}

function getLastMessage(conversation: ConversationView): MessageView | null {
  if (!conversation.messages.length) return null;
  return [...conversation.messages].sort((a, b) =>
    Number(b.timestamp - a.timestamp),
  )[0];
}

function isCloseFriend(
  conversation: ConversationView,
  currentUserId: string,
): boolean {
  if (conversation.isGroup) return false;
  const msgs = conversation.messages;
  if (msgs.length <= 20) return false;
  const hasMine = msgs.some((m) => m.senderId === currentUserId);
  const hasOther = msgs.some((m) => m.senderId !== currentUserId);
  return hasMine && hasOther;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface FriendCodeBadgeProps {
  code: string;
}

function FriendCodeBadge({ code }: FriendCodeBadgeProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCopy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast.success("Friend code copied!");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy your friend code"
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all duration-200 hover:opacity-80 active:scale-95 select-none"
      style={{
        background: "oklch(0.94 0.06 90)",
        color: "oklch(0.45 0.1 75)",
        border: "1.5px solid oklch(0.82 0.1 85)",
      }}
    >
      <span>🌻</span>
      <span>{code}</span>
      {copied ? (
        <Check className="w-3 h-3" style={{ color: "oklch(0.5 0.15 145)" }} />
      ) : (
        <Copy className="w-3 h-3 opacity-60" />
      )}
    </button>
  );
}

// ─── Add Friend Modal ─────────────────────────────────────────────────────────

interface AddFriendModalProps {
  myCode: string;
  onAdd: (entry: FriendEntry) => void;
  onClose: () => void;
}

function AddFriendModal({ myCode, onAdd, onClose }: AddFriendModalProps) {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function copyMyCode() {
    void navigator.clipboard.writeText(myCode).then(() => {
      setCodeCopied(true);
      toast.success("Your code copied!");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedUsername || !trimmedCode) return;

    const expected = generateFriendCode(trimmedUsername);
    const normalize = (c: string) => c.toUpperCase().replace(/[-\s]/g, "");
    if (normalize(trimmedCode) !== normalize(expected)) {
      setError("Code doesn't match that username. Please check and try again.");
      return;
    }

    onAdd({
      username: trimmedUsername,
      friendCode: expected,
      addedAt: Date.now(),
    });
    toast.success(`${trimmedUsername} added as a friend! 🌻`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-6 animate-scale-in"
        style={{ boxShadow: "0 16px 60px rgba(0,0,0,0.15)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <img
              src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
              alt=""
              style={{ width: 28, height: 28 }}
            />
            <h2
              className="text-lg font-bold"
              style={{ color: "oklch(0.38 0.08 65)" }}
            >
              Add a Friend
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* My code display */}
        <div
          className="rounded-2xl p-4 mb-5"
          style={{
            background: "oklch(0.97 0.04 90)",
            border: "1.5px dashed oklch(0.82 0.1 85)",
          }}
        >
          <p
            className="text-xs font-semibold mb-1.5"
            style={{ color: "oklch(0.6 0.07 75)" }}
          >
            Your friend code — share this!
          </p>
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xl font-bold tracking-widest"
              style={{ color: "oklch(0.42 0.12 70)" }}
            >
              {myCode}
            </span>
            <button
              type="button"
              onClick={copyMyCode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 hover:opacity-80 active:scale-95"
              style={{ background: "oklch(0.72 0.155 68)", color: "white" }}
            >
              {codeCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex-1 h-px"
            style={{ background: "oklch(0.9 0.04 85)" }}
          />
          <span className="text-xs" style={{ color: "oklch(0.7 0.05 70)" }}>
            add someone
          </span>
          <div
            className="flex-1 h-px"
            style={{ background: "oklch(0.9 0.04 85)" }}
          />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="friend-username"
              className="block text-sm font-semibold mb-1"
              style={{ color: "oklch(0.5 0.08 65)" }}
            >
              Friend's username
            </label>
            <input
              id="friend-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="e.g. sunflowerfan"
              required
              className="sunflower-input w-full text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="friend-code"
              className="block text-sm font-semibold mb-1"
              style={{ color: "oklch(0.5 0.08 65)" }}
            >
              Friend's code
            </label>
            <input
              id="friend-code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="e.g. SUN-AB3K"
              required
              className="sunflower-input w-full text-sm font-mono tracking-wider"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <div
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: "oklch(0.96 0.025 30)",
                color: "oklch(0.5 0.15 25)",
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="sunflower-btn-primary w-full flex items-center justify-center gap-2 mt-1"
            style={{ background: "oklch(0.72 0.155 68)", color: "white" }}
          >
            <UserPlus className="w-4 h-4" />
            Add Friend 🌻
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Group Chat Modal ─────────────────────────────────────────────────────────

interface GroupChatModalProps {
  friends: FriendEntry[];
  onClose: () => void;
  onCreated: (convId: string, groupName: string) => void;
  sessionId: string;
}

function GroupChatModal({
  friends,
  onClose,
  onCreated,
  sessionId,
}: GroupChatModalProps) {
  const { actor } = useActor();
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  function toggleFriend(username: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!actor || selected.size < 1 || !groupName.trim()) return;
    setCreating(true);
    try {
      const convId = await actor.createGroupConversation(
        sessionId,
        groupName.trim(),
        [...selected],
      );
      toast.success(`Group "${groupName}" created! 👥`);
      onCreated(convId, groupName.trim());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create group",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-6 animate-scale-in"
        style={{
          boxShadow: "0 16px 60px rgba(0,0,0,0.15)",
          maxHeight: "85dvh",
          overflowY: "auto",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users
              className="w-5 h-5"
              style={{ color: "oklch(0.72 0.155 68)" }}
            />
            <h2
              className="text-lg font-bold"
              style={{ color: "oklch(0.38 0.08 65)" }}
            >
              New Group Chat
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="group-name-input"
              className="block text-sm font-semibold mb-1"
              style={{ color: "oklch(0.5 0.08 65)" }}
            >
              Group name
            </label>
            <input
              id="group-name-input"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Sunflower Squad 🌻"
              required
              className="sunflower-input w-full text-sm"
              autoComplete="off"
            />
          </div>

          <div>
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: "oklch(0.5 0.08 65)" }}
            >
              Select friends ({selected.size} selected)
            </p>
            {friends.length === 0 ? (
              <p
                className="text-xs text-center py-4"
                style={{ color: "oklch(0.65 0.05 70)" }}
              >
                Add friends first to create a group
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {friends.map((friend) => (
                  <label
                    key={friend.username}
                    className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-yellow-50 transition-colors"
                    style={{
                      background: selected.has(friend.username)
                        ? "oklch(0.96 0.06 88)"
                        : "transparent",
                      border: selected.has(friend.username)
                        ? "1.5px solid oklch(0.82 0.1 85)"
                        : "1.5px solid transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(friend.username)}
                      onChange={() => toggleFriend(friend.username)}
                      className="sr-only"
                    />
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(friend.username)}`}
                    >
                      {getInitials(friend.username)}
                    </div>
                    <span
                      className="flex-1 text-sm font-semibold truncate"
                      style={{ color: "oklch(0.38 0.08 65)" }}
                    >
                      {friend.username}
                    </span>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: selected.has(friend.username)
                          ? "oklch(0.72 0.155 68)"
                          : "oklch(0.82 0.06 85)",
                        background: selected.has(friend.username)
                          ? "oklch(0.72 0.155 68)"
                          : "transparent",
                      }}
                    >
                      {selected.has(friend.username) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={creating || selected.size < 1 || !groupName.trim()}
            className="sunflower-btn-primary w-full flex items-center justify-center gap-2"
            style={{ background: "oklch(0.72 0.155 68)", color: "white" }}
          >
            {creating ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            Create Group
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Broadcast Modal ──────────────────────────────────────────────────────────

interface BroadcastModalProps {
  friends: FriendEntry[];
  onClose: () => void;
  sessionId: string;
}

function BroadcastModal({ friends, onClose, sessionId }: BroadcastModalProps) {
  const { actor } = useActor();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function toggleFriend(username: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!actor || selected.size < 1 || !message.trim()) return;
    setSending(true);
    try {
      await actor.broadcastMessage(sessionId, [...selected], message.trim());
      toast.success(`📢 Broadcast sent to ${selected.size} friends!`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to broadcast");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-6 animate-scale-in"
        style={{
          boxShadow: "0 16px 60px rgba(0,0,0,0.15)",
          maxHeight: "85dvh",
          overflowY: "auto",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Radio
              className="w-5 h-5"
              style={{ color: "oklch(0.72 0.155 68)" }}
            />
            <h2
              className="text-lg font-bold"
              style={{ color: "oklch(0.38 0.08 65)" }}
            >
              Broadcast Message
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleBroadcast} className="flex flex-col gap-4">
          <div>
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: "oklch(0.5 0.08 65)" }}
            >
              Select recipients ({selected.size} selected)
            </p>
            {friends.length === 0 ? (
              <p
                className="text-xs text-center py-4"
                style={{ color: "oklch(0.65 0.05 70)" }}
              >
                Add friends first to broadcast
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {friends.map((friend) => (
                  <label
                    key={friend.username}
                    className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-yellow-50 transition-colors"
                    style={{
                      background: selected.has(friend.username)
                        ? "oklch(0.96 0.06 88)"
                        : "transparent",
                      border: selected.has(friend.username)
                        ? "1.5px solid oklch(0.82 0.1 85)"
                        : "1.5px solid transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(friend.username)}
                      onChange={() => toggleFriend(friend.username)}
                      className="sr-only"
                    />
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${getAvatarColor(friend.username)}`}
                    >
                      {getInitials(friend.username)}
                    </div>
                    <span
                      className="flex-1 text-sm font-semibold truncate"
                      style={{ color: "oklch(0.38 0.08 65)" }}
                    >
                      {friend.username}
                    </span>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{
                        borderColor: selected.has(friend.username)
                          ? "oklch(0.72 0.155 68)"
                          : "oklch(0.82 0.06 85)",
                        background: selected.has(friend.username)
                          ? "oklch(0.72 0.155 68)"
                          : "transparent",
                      }}
                    >
                      {selected.has(friend.username) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="broadcast-message-input"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: "oklch(0.5 0.08 65)" }}
            >
              Message
            </label>
            <textarea
              id="broadcast-message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your broadcast message… 📢"
              rows={3}
              maxLength={500}
              required
              className="sunflower-input w-full text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={sending || selected.size < 1 || !message.trim()}
            className="sunflower-btn-primary w-full flex items-center justify-center gap-2"
            style={{ background: "oklch(0.72 0.155 68)", color: "white" }}
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Radio className="w-4 h-4" />
            )}
            Broadcast 📢
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ActiveTab = "chats" | "friends";

export default function ChatListScreen() {
  const { actor } = useActor();
  const {
    sessionId,
    profile,
    openConversation,
    clearSession,
    activeConversationId,
  } = useApp();
  const queryClient = useQueryClient();

  const userId = profile?.id ?? "";
  const myFriendCode = profile?.username
    ? generateFriendCode(profile.username)
    : "";

  const friendsHook = useFriends(userId || undefined);
  const [_friendsVersion, setFriendsVersion] = useState(0);
  const friends = friendsHook.getFriends();

  const [activeTab, setActiveTab] = useState<ActiveTab>("chats");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDailySurprise, setShowDailySurprise] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [darkMode, setDarkModeState] = useState(() => getDarkMode());

  // XP + level state
  const [xp, setXpState] = useState(() => getXP(userId));
  const level = getXpLevel(xp);

  // Mood
  const [mood, setMoodState] = useState(() => getMood(userId));

  // Pull to refresh
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number>(0);
  const mainRef = useRef<HTMLDivElement>(null);

  // Long press for pin
  const [contextConvId, setContextConvId] = useState<string | null>(null);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [darkMode]);

  // Check daily surprise
  useEffect(() => {
    if (userId && !getDailySurpriseShown(userId)) {
      const timer = setTimeout(() => setShowDailySurprise(true), 800);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  // Update last seen on mount + every 30s
  useEffect(() => {
    if (!actor || !sessionId) return;
    void actor.updateLastSeen(sessionId);
    const interval = setInterval(() => {
      void actor.updateLastSeen(sessionId);
    }, 30000);
    return () => clearInterval(interval);
  }, [actor, sessionId]);

  function handleToggleDarkMode() {
    const newVal = !darkMode;
    setDarkModeState(newVal);
    setDarkMode(newVal);
  }

  // ── Unread counts ──────────────────────────────────────────────────────────
  const lastSeenMessageCount = useRef<UnreadMap>({});
  const [unreadCounts, setUnreadCounts] = useState<UnreadMap>({});

  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useQuery<ConversationView[]>({
    queryKey: ["conversations", sessionId],
    queryFn: async () => {
      if (!actor || !sessionId) return [];
      return actor.getConversations(sessionId);
    },
    enabled: !!actor && !!sessionId,
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (!conversations.length) return;

    setUnreadCounts((prev) => {
      const next = { ...prev };
      for (const conv of conversations) {
        const currentCount = conv.messages.length;
        const seen = lastSeenMessageCount.current[conv.id];

        if (seen === undefined) {
          lastSeenMessageCount.current[conv.id] = currentCount;
          next[conv.id] = 0;
          continue;
        }

        if (activeConversationId === conv.id) {
          lastSeenMessageCount.current[conv.id] = currentCount;
          next[conv.id] = 0;
          continue;
        }

        const newMsgs = Math.max(0, currentCount - seen);
        next[conv.id] = newMsgs;
      }
      return next;
    });
  }, [conversations, activeConversationId]);

  function markConversationRead(convId: string) {
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      lastSeenMessageCount.current[convId] = conv.messages.length;
    }
    setUnreadCounts((prev) => ({ ...prev, [convId]: 0 }));
  }

  // ── Pin conversation ───────────────────────────────────────────────────────
  const pinMutation = useMutation({
    mutationFn: async ({
      convId,
      pinned,
    }: { convId: string; pinned: boolean }) => {
      if (!actor || !sessionId) throw new Error("Not authenticated");
      await actor.pinConversation(sessionId, convId, pinned);
    },
    onSuccess: (_, { pinned }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", sessionId] });
      toast.success(
        pinned ? "📌 Conversation pinned!" : "Conversation unpinned",
      );
      setContextConvId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to pin conversation");
    },
  });

  const createConversation = useMutation({
    mutationFn: async (participantUsername: string) => {
      if (!actor || !sessionId) throw new Error("Not authenticated");
      const convId = await actor.createConversation(
        sessionId,
        participantUsername.trim(),
      );
      return { convId, participantUsername: participantUsername.trim() };
    },
    onSuccess: ({ convId, participantUsername }) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", sessionId] });
      markConversationRead(convId);
      openConversation(convId, participantUsername);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Couldn't start conversation");
    },
  });

  // Sort: pinned first, then by last message time
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const lastA = getLastMessage(a);
    const lastB = getLastMessage(b);
    if (!lastA && !lastB) return 0;
    if (!lastA) return 1;
    if (!lastB) return -1;
    return Number(lastB.timestamp - lastA.timestamp);
  });

  const currentUserId = profile?.id ?? "";
  const avatarInitials = profile ? getInitials(profile.username) : "?";
  const moodRingStyle = getMoodRingStyle(mood);

  function handleAddFriend(entry: FriendEntry) {
    friendsHook.addFriend(entry);
    setFriendsVersion((v) => v + 1);
    playFriendAddSound();
  }

  function handleRemoveFriend(username: string) {
    friendsHook.removeFriend(username);
    setFriendsVersion((v) => v + 1);
    playFriendRemoveSound();
    toast.success(`${username} removed from friends`);
  }

  function handleOpenFriendChat(friendUsername: string) {
    createConversation.mutate(friendUsername);
  }

  function handleDailySurpriseClose() {
    if (userId) setDailySurpriseShown(userId);
    setShowDailySurprise(false);
  }

  function handleProfileUpdated() {
    setMoodState(getMood(userId));
    setXpState(getXP(userId));
    setShowProfile(false);
  }

  // ── Pull to refresh ────────────────────────────────────────────────────────
  function handlePullTouchStart(e: React.TouchEvent) {
    const scrollEl = mainRef.current;
    if (!scrollEl || scrollEl.scrollTop > 0) return;
    pullStartY.current = e.touches[0].clientY;
    setIsPulling(true);
  }

  function handlePullTouchMove(e: React.TouchEvent) {
    if (!isPulling) return;
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) setPullY(Math.min(dy, 100));
  }

  async function handlePullTouchEnd() {
    if (pullY > 80) {
      setIsRefreshing(true);
      await refetch();
      setIsRefreshing(false);
    }
    setPullY(0);
    setIsPulling(false);
  }

  // ── Conversation long press for pin context menu ───────────────────────────
  function handleConvPointerDown(e: React.PointerEvent, convId: string) {
    const { clientX, clientY } = e;
    longPressTimer.current = setTimeout(() => {
      setContextConvId(convId);
      setContextPos({ x: clientX, y: clientY });
    }, 500);
  }

  function handleConvPointerUp() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextConvId) return;
    function handleClick() {
      setContextConvId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextConvId]);

  const contextConv = contextConvId
    ? conversations.find((c) => c.id === contextConvId)
    : null;

  return (
    <div
      className="sunflower-page flex flex-col"
      style={{ minHeight: "100dvh" }}
    >
      <div className="w-full max-w-[480px] mx-auto flex flex-col flex-1">
        {/* ── Header ── */}
        <header
          className="sticky top-0 z-10 px-4 pt-4 pb-3"
          style={{
            background: "oklch(var(--sunflower-bg) / 0.95)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
                alt="Sunflower Chat"
                style={{ width: 28, height: 28 }}
              />
              <span
                className="text-lg font-bold"
                style={{ color: "oklch(0.45 0.1 65)" }}
              >
                Sunflower Chat
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Broadcast button */}
              <button
                type="button"
                onClick={() => setShowBroadcast(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label="Broadcast message"
                title="Broadcast message"
              >
                <Radio
                  className="w-4 h-4"
                  style={{ color: "oklch(0.65 0.08 70)" }}
                />
              </button>

              {/* Group chat button */}
              <button
                type="button"
                onClick={() => setShowGroupModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label="Create group chat"
                title="New group chat"
              >
                <Users
                  className="w-4 h-4"
                  style={{ color: "oklch(0.65 0.08 70)" }}
                />
              </button>

              {/* Dark mode toggle */}
              <button
                type="button"
                onClick={handleToggleDarkMode}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                title={darkMode ? "Light mode" : "Dark mode"}
              >
                {darkMode ? (
                  <Sun
                    className="w-4 h-4"
                    style={{ color: "oklch(0.72 0.155 68)" }}
                  />
                ) : (
                  <Moon
                    className="w-4 h-4"
                    style={{ color: "oklch(0.65 0.08 70)" }}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => void refetch()}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  style={{ color: "oklch(0.65 0.08 70)" }}
                />
              </button>

              {/* Avatar with mood ring */}
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold hover:opacity-80 transition-opacity ${getAvatarColor(profile?.username ?? "")}`}
                title={`${profile?.username ?? "Profile"} — Edit profile`}
                style={moodRingStyle}
              >
                {avatarInitials}
              </button>

              <button
                type="button"
                onClick={clearSession}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut
                  className="w-4 h-4"
                  style={{ color: "oklch(0.65 0.08 70)" }}
                />
              </button>
            </div>
          </div>

          {/* Greeting row */}
          <div className="mt-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1
                className="text-xl font-bold"
                style={{ color: "oklch(0.38 0.08 65)" }}
              >
                Messages 🌻
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-sm" style={{ color: "oklch(0.65 0.06 70)" }}>
                  Hi, {profile?.username ?? "there"}!
                </p>
                {myFriendCode && <FriendCodeBadge code={myFriendCode} />}
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: `${level.color}22`,
                    color: level.color,
                    border: `1px solid ${level.color}66`,
                  }}
                >
                  {level.emoji} {level.name}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddFriend(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95 flex-shrink-0"
              style={{
                background: "oklch(0.72 0.155 68)",
                color: "white",
                boxShadow: "0 4px 16px oklch(0.72 0.155 68 / 0.3)",
              }}
            >
              <UserPlus className="w-4 h-4" />
              Add Friend
            </button>
          </div>

          {/* Tabs */}
          <div
            className="mt-3 flex rounded-2xl p-1 gap-1"
            style={{ background: "oklch(0.94 0.04 90)" }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("chats")}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                activeTab === "chats"
                  ? {
                      background: "white",
                      color: "oklch(0.42 0.1 68)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }
                  : { color: "oklch(0.6 0.06 70)" }
              }
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chats
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("friends")}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                activeTab === "friends"
                  ? {
                      background: "white",
                      color: "oklch(0.42 0.1 68)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }
                  : { color: "oklch(0.6 0.06 70)" }
              }
            >
              <UserPlus className="w-3.5 h-3.5" />
              Friends
              {friends.length > 0 && (
                <span
                  className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: "oklch(0.72 0.155 68)",
                    color: "white",
                    fontSize: "10px",
                  }}
                >
                  {friends.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* ── Main content ── */}
        <main
          ref={mainRef}
          className="flex-1 px-4 pb-6"
          onTouchStart={handlePullTouchStart}
          onTouchMove={handlePullTouchMove}
          onTouchEnd={() => void handlePullTouchEnd()}
        >
          {/* Pull to refresh indicator */}
          {(pullY > 0 || isRefreshing) && (
            <div
              className="flex items-center justify-center py-3 transition-all"
              style={{ height: isRefreshing ? 48 : Math.max(pullY * 0.5, 0) }}
            >
              <span
                className="text-2xl"
                style={{
                  display: "inline-block",
                  animation: isRefreshing
                    ? "sunflowerSpin 1s linear infinite"
                    : "none",
                  opacity: pullY > 30 ? 1 : pullY / 30,
                }}
              >
                🌻
              </span>
            </div>
          )}

          {/* ── Chats tab ── */}
          {activeTab === "chats" && (
            <div>
              {isLoading ? (
                <div className="flex flex-col gap-3 mt-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-[20px] p-4 shadow-card animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-100 rounded-full w-32 mb-2" />
                          <div className="h-3 bg-gray-100 rounded-full w-48" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                  <img
                    src="/assets/generated/sunflower-hero-transparent.dim_400x400.png"
                    alt="No conversations"
                    style={{ width: 120, height: 120, opacity: 0.4 }}
                  />
                  <h3
                    className="text-lg font-bold mt-4"
                    style={{ color: "oklch(0.5 0.08 65)" }}
                  >
                    No conversations yet!
                  </h3>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "oklch(0.65 0.06 70)" }}
                  >
                    Add a friend and start chatting 🌻
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddFriend(true)}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-2xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{
                      background: "oklch(0.72 0.155 68)",
                      color: "white",
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-2">
                  {sortedConversations.map((conv, index) => {
                    const participant = getParticipantInfo(conv, currentUserId);
                    const lastMsg = getLastMessage(conv);
                    const colorClass = getAvatarColor(participant.name);
                    const initials = getInitials(participant.name);
                    const unreadCount = unreadCounts[conv.id] ?? 0;
                    const closeFriend = isCloseFriend(conv, currentUserId);

                    return (
                      <div
                        key={conv.id}
                        className="relative"
                        onPointerDown={(e) => handleConvPointerDown(e, conv.id)}
                        onPointerUp={handleConvPointerUp}
                        onPointerLeave={handleConvPointerUp}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            markConversationRead(conv.id);
                            openConversation(conv.id, participant.name);
                          }}
                          className="w-full text-left bg-white rounded-[20px] p-4 shadow-card hover:shadow-card-hover transition-all duration-200 active:scale-[0.98] animate-fade-in-up"
                          style={{
                            animationDelay: `${index * 0.05}s`,
                            border: conv.isPinned
                              ? "1.5px solid oklch(0.82 0.12 80)"
                              : "1.5px solid transparent",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${colorClass}`}
                              >
                                {initials}
                              </div>
                              {unreadCount > 0 && (
                                <span
                                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white font-bold"
                                  style={{
                                    background: "oklch(0.6 0.22 28)",
                                    fontSize: "10px",
                                    padding: "0 4px",
                                    boxShadow: "0 0 0 2px white",
                                  }}
                                >
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {/* Pin indicator */}
                                  {conv.isPinned && (
                                    <Pin
                                      className="w-3 h-3 flex-shrink-0"
                                      style={{ color: "oklch(0.72 0.155 68)" }}
                                    />
                                  )}
                                  <span
                                    className="font-bold text-sm truncate"
                                    style={{
                                      color:
                                        unreadCount > 0
                                          ? "oklch(0.3 0.1 65)"
                                          : "oklch(0.35 0.06 65)",
                                    }}
                                  >
                                    {participant.name}
                                  </span>
                                  {/* Group badge */}
                                  {conv.isGroup && (
                                    <span
                                      className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
                                      style={{
                                        background: "oklch(0.94 0.05 240)",
                                        color: "oklch(0.42 0.12 240)",
                                        fontSize: "10px",
                                      }}
                                    >
                                      <Users className="w-2.5 h-2.5" /> Group
                                    </span>
                                  )}
                                  {/* Close friend badge */}
                                  {closeFriend && (
                                    <span
                                      className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                      style={{
                                        background: "oklch(0.96 0.08 88)",
                                        color: "oklch(0.52 0.12 68)",
                                        fontSize: "10px",
                                      }}
                                    >
                                      🌻 Best
                                    </span>
                                  )}
                                </div>
                                {lastMsg && (
                                  <span
                                    className="text-xs flex-shrink-0"
                                    style={{ color: "oklch(0.72 0.04 70)" }}
                                  >
                                    {formatRelativeTime(lastMsg.timestamp)}
                                  </span>
                                )}
                              </div>
                              {lastMsg ? (
                                <p
                                  className="text-xs mt-0.5 truncate"
                                  style={{
                                    color:
                                      unreadCount > 0
                                        ? "oklch(0.42 0.08 65)"
                                        : "oklch(0.6 0.05 70)",
                                    fontWeight: unreadCount > 0 ? 600 : 400,
                                  }}
                                >
                                  {lastMsg.deleted ? (
                                    "🗑️ Message deleted"
                                  ) : (
                                    <>
                                      {lastMsg.senderId === currentUserId
                                        ? "You: "
                                        : ""}
                                      {lastMsg.messageType === "image"
                                        ? "📷 Image"
                                        : lastMsg.messageType === "voice"
                                          ? "🎙️ Voice"
                                          : lastMsg.messageType === "gif"
                                            ? "🎞️ GIF"
                                            : lastMsg.content}
                                    </>
                                  )}
                                </p>
                              ) : (
                                <p
                                  className="text-xs mt-0.5 italic"
                                  style={{ color: "oklch(0.72 0.04 70)" }}
                                >
                                  No messages yet
                                </p>
                              )}
                            </div>

                            {conv.isGroup ? (
                              <Users
                                className="w-4 h-4 flex-shrink-0 opacity-40"
                                style={{ color: "oklch(0.72 0.155 68)" }}
                              />
                            ) : (
                              <MessageCircle
                                className="w-4 h-4 flex-shrink-0 opacity-40"
                                style={{ color: "oklch(0.72 0.155 68)" }}
                              />
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Friends tab ── */}
          {activeTab === "friends" && (
            <div className="mt-2">
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "oklch(0.94 0.06 90)" }}
                  >
                    <UserPlus
                      className="w-9 h-9"
                      style={{ color: "oklch(0.65 0.12 75)" }}
                    />
                  </div>
                  <h3
                    className="text-lg font-bold"
                    style={{ color: "oklch(0.5 0.08 65)" }}
                  >
                    No friends yet!
                  </h3>
                  <p
                    className="text-sm mt-1 max-w-[220px]"
                    style={{ color: "oklch(0.65 0.06 70)" }}
                  >
                    Share your friend code and start growing your sunflower
                    garden 🌻
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddFriend(true)}
                    className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-2xl font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{
                      background: "oklch(0.72 0.155 68)",
                      color: "white",
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add your first friend
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {friends.map((friend, index) => {
                    const colorClass = getAvatarColor(friend.username);
                    const initials = getInitials(friend.username);
                    const isPending = createConversation.isPending;

                    return (
                      <div
                        key={friend.username}
                        className="bg-white rounded-[20px] p-4 shadow-card animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colorClass}`}
                          >
                            {initials}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span
                              className="font-bold text-sm block truncate"
                              style={{ color: "oklch(0.35 0.06 65)" }}
                            >
                              {friend.username}
                            </span>
                            <span
                              className="text-xs font-mono"
                              style={{ color: "oklch(0.65 0.08 75)" }}
                            >
                              {friend.friendCode}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenFriendChat(friend.username)
                              }
                              disabled={isPending}
                              title={`Chat with ${friend.username}`}
                              className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:opacity-80 active:scale-95"
                              style={{
                                background: "oklch(0.72 0.155 68)",
                                color: "white",
                              }}
                            >
                              {isPending ? (
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <MessageCircle className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveFriend(friend.username)
                              }
                              title={`Remove ${friend.username}`}
                              className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-red-50 active:scale-95"
                              style={{ color: "oklch(0.6 0.08 25)" }}
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="pb-4 px-4 text-center">
          <p className="text-xs" style={{ color: "oklch(0.72 0.04 70)" }}>
            © {new Date().getFullYear()}. Built with 🌻 using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-75"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>

      {/* Context menu for pin/unpin */}
      {contextConvId && contextConv && (
        <div
          className="fixed z-50 bg-white rounded-2xl p-2 shadow-2xl"
          style={{
            left: Math.min(contextPos.x, window.innerWidth - 180),
            top: Math.min(contextPos.y, window.innerHeight - 120),
            border: "1.5px solid oklch(0.92 0.04 88)",
            minWidth: 160,
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") setContextConvId(null);
          }}
        >
          <button
            type="button"
            onClick={() =>
              pinMutation.mutate({
                convId: contextConvId,
                pinned: !contextConv.isPinned,
              })
            }
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-yellow-50 transition-colors text-left"
            style={{ color: "oklch(0.38 0.08 65)" }}
          >
            <Pin className="w-3.5 h-3.5" />
            {contextConv.isPinned ? "Unpin Chat" : "📌 Pin Chat"}
          </button>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <AddFriendModal
          myCode={myFriendCode}
          onAdd={handleAddFriend}
          onClose={() => setShowAddFriend(false)}
        />
      )}

      {/* Group Chat Modal */}
      {showGroupModal && sessionId && (
        <GroupChatModal
          friends={friends}
          sessionId={sessionId}
          onClose={() => setShowGroupModal(false)}
          onCreated={(convId, groupName) => {
            setShowGroupModal(false);
            queryClient.invalidateQueries({
              queryKey: ["conversations", sessionId],
            });
            openConversation(convId, groupName);
          }}
        />
      )}

      {/* Broadcast Modal */}
      {showBroadcast && sessionId && (
        <BroadcastModal
          friends={friends}
          sessionId={sessionId}
          onClose={() => setShowBroadcast(false)}
        />
      )}

      {/* Profile Modal */}
      {showProfile && profile && sessionId && (
        <ProfileModal
          profile={profile}
          sessionId={sessionId}
          onClose={() => setShowProfile(false)}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* Daily Surprise Modal */}
      {showDailySurprise && (
        <DailySurpriseModal onClose={handleDailySurpriseClose} />
      )}

      <style>{`
        @keyframes sunflowerSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
