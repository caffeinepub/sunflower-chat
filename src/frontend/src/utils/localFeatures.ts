// ─── Types ────────────────────────────────────────────────────────────────────

export type Mood = "happy" | "calm" | "sleepy";

export interface ReactionsMap {
  [emoji: string]: number;
}

// ─── Keys ────────────────────────────────────────────────────────────────────

const key = {
  mood: (uid: string) => `sf_mood_${uid}`,
  bio: (uid: string) => `sf_bio_${uid}`,
  status: (uid: string) => `sf_status_${uid}`,
  birthday: (uid: string) => `sf_birthday_${uid}`,
  darkMode: () => "sf_dark_mode",
  xp: (uid: string) => `sf_xp_${uid}`,
  dailySurprise: (uid: string) => `sf_daily_surprise_${uid}`,
  reactions: (convId: string, msgId: string) =>
    `sf_reactions_${convId}_${msgId}`,
  secretMessages: (convId: string) => `sf_secret_msgs_${convId}`,
  deletedMessages: (convId: string) => `sf_deleted_msgs_${convId}`,
};

// ─── Mood ─────────────────────────────────────────────────────────────────────

export function getMood(userId: string): Mood | null {
  return (localStorage.getItem(key.mood(userId)) as Mood | null) ?? null;
}

export function setMood(userId: string, mood: Mood | null): void {
  if (mood) {
    localStorage.setItem(key.mood(userId), mood);
  } else {
    localStorage.removeItem(key.mood(userId));
  }
}

// ─── Bio ─────────────────────────────────────────────────────────────────────

export function getBio(userId: string): string {
  return localStorage.getItem(key.bio(userId)) ?? "";
}

export function setBio(userId: string, bio: string): void {
  localStorage.setItem(key.bio(userId), bio);
}

// ─── Status ──────────────────────────────────────────────────────────────────

export function getStatus(userId: string): string {
  return localStorage.getItem(key.status(userId)) ?? "";
}

export function setStatus(userId: string, status: string): void {
  localStorage.setItem(key.status(userId), status);
}

// ─── Birthday ────────────────────────────────────────────────────────────────

export function getBirthday(userId: string): string {
  return localStorage.getItem(key.birthday(userId)) ?? "";
}

export function setBirthday(userId: string, birthday: string): void {
  localStorage.setItem(key.birthday(userId), birthday);
}

// ─── Dark Mode ───────────────────────────────────────────────────────────────

export function getDarkMode(): boolean {
  return localStorage.getItem(key.darkMode()) === "true";
}

export function setDarkMode(enabled: boolean): void {
  localStorage.setItem(key.darkMode(), String(enabled));
  if (enabled) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

// ─── XP / Level ──────────────────────────────────────────────────────────────

export interface XpLevel {
  name: string;
  minXp: number;
  maxXp: number;
  color: string;
  emoji: string;
}

export const XP_LEVELS: XpLevel[] = [
  { name: "Seedling", minXp: 0, maxXp: 9, color: "#4ade80", emoji: "🌱" },
  { name: "Sprout", minXp: 10, maxXp: 29, color: "#a3e635", emoji: "🌿" },
  { name: "Bloom", minXp: 30, maxXp: 59, color: "#facc15", emoji: "🌼" },
  { name: "Sunflower", minXp: 60, maxXp: 99, color: "#f59e0b", emoji: "🌻" },
  {
    name: "Golden",
    minXp: 100,
    maxXp: Number.POSITIVE_INFINITY,
    color: "#eab308",
    emoji: "✨",
  },
];

export function getXP(userId: string): number {
  return Number.parseInt(localStorage.getItem(key.xp(userId)) ?? "0", 10);
}

export function addXP(userId: string, amount: number): number {
  const current = getXP(userId);
  const newTotal = current + amount;
  localStorage.setItem(key.xp(userId), String(newTotal));
  return newTotal;
}

export function getXpLevel(xp: number): XpLevel {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) return XP_LEVELS[i];
  }
  return XP_LEVELS[0];
}

export function getXpProgress(xp: number): number {
  const level = getXpLevel(xp);
  const nextLevel = XP_LEVELS.find((l) => l.minXp > level.minXp);
  if (!nextLevel) return 100;
  const range = nextLevel.minXp - level.minXp;
  const progress = xp - level.minXp;
  return Math.min(100, Math.round((progress / range) * 100));
}

// ─── Daily Surprise ──────────────────────────────────────────────────────────

export function getDailySurpriseShown(userId: string): boolean {
  const stored = localStorage.getItem(key.dailySurprise(userId));
  const today = new Date().toDateString();
  return stored === today;
}

export function setDailySurpriseShown(userId: string): void {
  localStorage.setItem(key.dailySurprise(userId), new Date().toDateString());
}

// ─── Reactions ───────────────────────────────────────────────────────────────

export function getReactions(convId: string, msgId: string): ReactionsMap {
  try {
    const raw = localStorage.getItem(key.reactions(convId, msgId));
    return raw ? (JSON.parse(raw) as ReactionsMap) : {};
  } catch {
    return {};
  }
}

export function addReaction(
  convId: string,
  msgId: string,
  emoji: string,
): ReactionsMap {
  const current = getReactions(convId, msgId);
  const updated = { ...current, [emoji]: (current[emoji] ?? 0) + 1 };
  localStorage.setItem(key.reactions(convId, msgId), JSON.stringify(updated));
  return updated;
}

// ─── Secret Messages ─────────────────────────────────────────────────────────

export function getSecretMessages(convId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key.secretMessages(convId));
    return raw
      ? new Set<string>(JSON.parse(raw) as string[])
      : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export function addSecretMessage(convId: string, msgId: string): void {
  const set = getSecretMessages(convId);
  set.add(msgId);
  localStorage.setItem(key.secretMessages(convId), JSON.stringify([...set]));
}

export function removeSecretMessage(convId: string, msgId: string): void {
  const set = getSecretMessages(convId);
  set.delete(msgId);
  localStorage.setItem(key.secretMessages(convId), JSON.stringify([...set]));
}

// ─── Deleted Messages ────────────────────────────────────────────────────────

export function getDeletedMessages(convId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key.deletedMessages(convId));
    return raw
      ? new Set<string>(JSON.parse(raw) as string[])
      : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export function addDeletedMessage(convId: string, msgId: string): void {
  const set = getDeletedMessages(convId);
  set.add(msgId);
  localStorage.setItem(key.deletedMessages(convId), JSON.stringify([...set]));
}

// ─── Mood Ring helpers ────────────────────────────────────────────────────────

export function getMoodRingStyle(mood: Mood | null): React.CSSProperties {
  switch (mood) {
    case "happy":
      return { boxShadow: "0 0 0 3px oklch(0.85 0.2 85)" };
    case "calm":
      return { boxShadow: "0 0 0 3px oklch(0.78 0.15 145)" };
    case "sleepy":
      return { boxShadow: "0 0 0 3px oklch(0.6 0.08 55)" };
    default:
      return {};
  }
}

// Need React import for CSSProperties
import type React from "react";
