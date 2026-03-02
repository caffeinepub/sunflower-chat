import { Eye, EyeOff, Globe, KeyRound, Loader2, Lock, X } from "lucide-react";
import { useState } from "react";
import type { Profile3 as Profile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import {
  PinSetPrompt,
  getStoredPin,
  isAppLockEnabled,
  removeStoredPin,
} from "../screens/AppLockScreen";
import {
  type Mood,
  XP_LEVELS,
  getBio,
  getBirthday,
  getMood,
  getStatus,
  getXP,
  getXpLevel,
  getXpProgress,
  setBio,
  setBirthday,
  setMood,
  setStatus,
} from "../utils/localFeatures";

interface ProfileModalProps {
  profile: Profile;
  sessionId: string;
  onClose: () => void;
  onProfileUpdated?: (updated: Profile) => void;
}

const MOOD_OPTIONS: {
  value: Mood;
  label: string;
  emoji: string;
  ring: string;
}[] = [
  { value: "happy", label: "Happy", emoji: "😊", ring: "oklch(0.85 0.2 85)" },
  { value: "calm", label: "Calm", emoji: "🌿", ring: "oklch(0.78 0.15 145)" },
  { value: "sleepy", label: "Sleepy", emoji: "🌙", ring: "oklch(0.6 0.08 55)" },
];

function formatLastSeen(lastSeen: bigint): string {
  if (!lastSeen || lastSeen === 0n) return "Never";
  const ms = Number(lastSeen) / 1_000_000;
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ProfileModal({
  profile,
  sessionId,
  onClose,
  onProfileUpdated,
}: ProfileModalProps) {
  const { actor } = useActor();
  const userId = profile.id;

  const [username, setUsername] = useState(profile.username);
  const [bio, setBioState] = useState(() => getBio(userId));
  const [status, setStatusState] = useState(() => getStatus(userId));
  const [birthday, setBirthdayState] = useState(() => getBirthday(userId));
  const [mood, setMoodState] = useState<Mood | null>(() => getMood(userId));
  const [isPublic, setIsPublic] = useState(profile.isPublic ?? true);
  const [hideLastSeen, setHideLastSeen] = useState(
    profile.hideLastSeen ?? false,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(isAppLockEnabled);

  const xp = getXP(userId);
  const level = getXpLevel(xp);
  const progress = getXpProgress(xp);
  const nextLevel = XP_LEVELS.find((l) => l.minXp > level.minXp);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) return;
    setError(null);
    setSaving(true);

    try {
      await actor.updateProfile(
        sessionId,
        username.trim(),
        profile.avatarColor ?? null,
        isPublic,
        hideLastSeen,
      );

      setBio(userId, bio);
      setStatus(userId, status);
      setBirthday(userId, birthday);
      setMood(userId, mood);

      if (onProfileUpdated) {
        onProfileUpdated({
          ...profile,
          username: username.trim(),
          isPublic,
          hideLastSeen,
        });
      }

      setSaved(true);
      setTimeout(onClose, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
        style={{ maxHeight: "90dvh", overflowY: "auto" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.97 0.06 90), oklch(0.95 0.04 88))",
            borderBottom: "1.5px solid oklch(0.92 0.04 88)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🌻</span>
            <h2
              className="text-lg font-bold"
              style={{ color: "oklch(0.38 0.1 65)" }}
            >
              My Profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" style={{ color: "oklch(0.55 0.06 65)" }} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-5">
          {/* Avatar + XP Level */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 relative"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.93 0.1 80), oklch(0.88 0.12 75))",
                boxShadow: mood
                  ? mood === "happy"
                    ? "0 0 0 3px oklch(0.85 0.2 85)"
                    : mood === "calm"
                      ? "0 0 0 3px oklch(0.78 0.15 145)"
                      : "0 0 0 3px oklch(0.6 0.08 55)"
                  : undefined,
              }}
            >
              {profile.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{level.emoji}</span>
                <span
                  className="font-bold text-sm"
                  style={{ color: "oklch(0.4 0.1 68)" }}
                >
                  {level.name}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: `${level.color}33`,
                    color: level.color,
                    border: `1px solid ${level.color}66`,
                  }}
                >
                  {xp} XP
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "oklch(0.93 0.04 88)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${level.color}, oklch(0.72 0.155 68))`,
                  }}
                />
              </div>
              {nextLevel && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "oklch(0.65 0.05 70)" }}
                >
                  {nextLevel.minXp - xp} XP to {nextLevel.name}
                </p>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <label
              htmlFor="profile-username"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: "oklch(0.48 0.08 65)" }}
            >
              Username
            </label>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="sunflower-input w-full text-sm"
              minLength={2}
              required
              autoComplete="username"
            />
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="profile-bio"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: "oklch(0.48 0.08 65)" }}
            >
              Bio
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBioState(e.target.value)}
              placeholder="Tell the world about yourself 🌻"
              rows={3}
              maxLength={160}
              className="sunflower-input w-full text-sm resize-none"
              style={{ lineHeight: "1.5" }}
            />
            <p
              className="text-xs mt-1 text-right"
              style={{ color: "oklch(0.7 0.04 70)" }}
            >
              {bio.length}/160
            </p>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="profile-status"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: "oklch(0.48 0.08 65)" }}
            >
              Status
            </label>
            <input
              id="profile-status"
              type="text"
              value={status}
              onChange={(e) => setStatusState(e.target.value)}
              placeholder="Feeling happy 🌻"
              maxLength={60}
              className="sunflower-input w-full text-sm"
              autoComplete="off"
            />
          </div>

          {/* Birthday */}
          <div>
            <label
              htmlFor="profile-birthday"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: "oklch(0.48 0.08 65)" }}
            >
              Birthday 🎂
            </label>
            <input
              id="profile-birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthdayState(e.target.value)}
              className="sunflower-input w-full text-sm"
            />
          </div>

          {/* Mood selector */}
          <div>
            <p
              className="text-sm font-semibold mb-2.5"
              style={{ color: "oklch(0.48 0.08 65)" }}
            >
              Mood Ring 💫
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMoodState(null)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95"
                style={{
                  background:
                    mood === null
                      ? "oklch(0.93 0.06 88)"
                      : "oklch(0.97 0.02 88)",
                  border:
                    mood === null
                      ? "2px solid oklch(0.78 0.08 75)"
                      : "2px solid transparent",
                  color: "oklch(0.55 0.05 70)",
                }}
              >
                <span className="text-lg">😶</span>
                None
              </button>
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMoodState(opt.value)}
                  className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95"
                  style={{
                    background:
                      mood === opt.value
                        ? `${opt.ring}22`
                        : "oklch(0.97 0.02 88)",
                    border:
                      mood === opt.value
                        ? `2px solid ${opt.ring}`
                        : "2px solid transparent",
                    boxShadow:
                      mood === opt.value ? `0 0 12px ${opt.ring}55` : "none",
                    color: "oklch(0.45 0.08 65)",
                  }}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy section */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: "oklch(0.97 0.025 90)",
              border: "1.5px solid oklch(0.92 0.04 88)",
            }}
          >
            <p
              className="text-sm font-bold"
              style={{ color: "oklch(0.42 0.08 65)" }}
            >
              Privacy Settings 🔒
            </p>

            {/* Public account toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "oklch(0.65 0.08 70)" }}
                />
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "oklch(0.42 0.06 65)" }}
                  >
                    Public Account
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.04 68)" }}
                  >
                    Others can find you by username
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic((v) => !v)}
                className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
                style={{
                  background: isPublic
                    ? "oklch(0.72 0.155 68)"
                    : "oklch(0.82 0.04 80)",
                  boxShadow: isPublic
                    ? "0 2px 8px oklch(0.72 0.155 68 / 0.4)"
                    : "none",
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: isPublic ? "calc(100% - 22px)" : 2 }}
                />
              </button>
            </div>

            {/* Hide last seen toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {hideLastSeen ? (
                  <EyeOff
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "oklch(0.65 0.08 70)" }}
                  />
                ) : (
                  <Eye
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "oklch(0.65 0.08 70)" }}
                  />
                )}
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "oklch(0.42 0.06 65)" }}
                  >
                    Hide Last Seen
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.04 68)" }}
                  >
                    {hideLastSeen
                      ? "Others can't see when you were last active"
                      : "Others can see your last seen time"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={hideLastSeen}
                onClick={() => setHideLastSeen((v) => !v)}
                className="w-11 h-6 rounded-full relative transition-all duration-200 flex-shrink-0"
                style={{
                  background: hideLastSeen
                    ? "oklch(0.72 0.155 68)"
                    : "oklch(0.82 0.04 80)",
                  boxShadow: hideLastSeen
                    ? "0 2px 8px oklch(0.72 0.155 68 / 0.4)"
                    : "none",
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                  style={{ left: hideLastSeen ? "calc(100% - 22px)" : 2 }}
                />
              </button>
            </div>

            {/* Last seen info */}
            {!hideLastSeen && profile.lastSeen && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: "white" }}
              >
                <Lock
                  className="w-3 h-3"
                  style={{ color: "oklch(0.65 0.06 70)" }}
                />
                <p className="text-xs" style={{ color: "oklch(0.58 0.05 68)" }}>
                  Last seen: {formatLastSeen(profile.lastSeen)}
                </p>
              </div>
            )}
          </div>

          {/* App Lock section */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: "oklch(0.97 0.025 90)",
              border: "1.5px solid oklch(0.92 0.04 88)",
            }}
          >
            <p
              className="text-sm font-bold"
              style={{ color: "oklch(0.42 0.08 65)" }}
            >
              App Lock 🔐
            </p>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "oklch(0.65 0.08 70)" }}
                />
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "oklch(0.42 0.06 65)" }}
                  >
                    PIN Lock
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "oklch(0.65 0.04 68)" }}
                  >
                    {pinEnabled
                      ? "App locks after 5 min idle"
                      : "Protect your chats with a PIN"}
                  </p>
                </div>
              </div>
              {pinEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    removeStoredPin();
                    setPinEnabled(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{
                    background: "oklch(0.95 0.03 25)",
                    color: "oklch(0.5 0.15 25)",
                  }}
                >
                  Remove PIN
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPinPrompt(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                  style={{ background: "oklch(0.72 0.155 68)", color: "white" }}
                >
                  Set PIN
                </button>
              )}
            </div>
            {pinEnabled && getStoredPin() && (
              <p className="text-xs" style={{ color: "oklch(0.55 0.1 140)" }}>
                ✅ PIN is set and active
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{
                background: "oklch(0.96 0.025 30)",
                color: "oklch(0.5 0.15 25)",
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Save button */}
          <button
            type="submit"
            disabled={saving || saved}
            className="sunflower-btn-primary w-full flex items-center justify-center gap-2"
            style={{
              background: saved
                ? "oklch(0.65 0.15 145)"
                : "oklch(0.72 0.155 68)",
              color: "white",
            }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Profile 🌻"}
          </button>
        </form>
      </div>

      {/* PIN Set Prompt overlay */}
      {showPinPrompt && (
        <PinSetPrompt
          onSet={() => {
            setPinEnabled(true);
            setShowPinPrompt(false);
          }}
          onClose={() => setShowPinPrompt(false)}
        />
      )}
    </div>
  );
}
