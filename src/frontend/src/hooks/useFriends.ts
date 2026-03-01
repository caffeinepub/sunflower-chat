export interface FriendEntry {
  username: string;
  friendCode: string;
  addedAt: number; // Date.now()
}

/**
 * Generates a deterministic friend code from a username.
 * Format: SUN-XXXX where X is from a safe character set.
 */
export function generateFriendCode(username: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  let code = "SUN-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.abs((hash >> (i * 5)) & 31) % chars.length];
  }
  return code;
}

/**
 * Normalize a friend code for comparison:
 * uppercases, strips dashes/spaces so "sun1234" matches "SUN-1234"
 */
function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[-\s]/g, "");
}

function getStorageKey(userId: string): string {
  return `sunflower_friends_${userId}`;
}

export function useFriends(userId: string | undefined) {
  const key = userId ? getStorageKey(userId) : null;

  function getFriends(): FriendEntry[] {
    if (!key) return [];
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      return JSON.parse(raw) as FriendEntry[];
    } catch {
      return [];
    }
  }

  function saveFriends(friends: FriendEntry[]): void {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(friends));
  }

  function addFriend(entry: FriendEntry): void {
    const friends = getFriends();
    // Avoid duplicates by username
    if (friends.some((f) => f.username === entry.username)) return;
    saveFriends([...friends, entry]);
  }

  function removeFriend(username: string): void {
    saveFriends(getFriends().filter((f) => f.username !== username));
  }

  function isFriend(username: string): boolean {
    return getFriends().some((f) => f.username === username);
  }

  function getFriendByCode(code: string): FriendEntry | null {
    const normalized = normalizeCode(code);
    return (
      getFriends().find((f) => normalizeCode(f.friendCode) === normalized) ??
      null
    );
  }

  return {
    getFriends,
    addFriend,
    removeFriend,
    isFriend,
    getFriendByCode,
    generateFriendCode,
    normalizeCode,
  };
}
