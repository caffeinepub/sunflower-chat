/**
 * Generate a pastel avatar color based on a string (name/id)
 */
export function getAvatarColor(str: string): string {
  const colors = [
    "bg-yellow-200 text-yellow-800",
    "bg-pink-200 text-pink-800",
    "bg-purple-200 text-purple-800",
    "bg-blue-200 text-blue-800",
    "bg-green-200 text-green-800",
    "bg-orange-200 text-orange-800",
    "bg-teal-200 text-teal-800",
    "bg-red-200 text-red-800",
    "bg-indigo-200 text-indigo-800",
    "bg-rose-200 text-rose-800",
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from a username
 */
export function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

/**
 * Format a timestamp (bigint nanoseconds) to a relative time string
 */
export function formatRelativeTime(timestamp: bigint): string {
  const msTimestamp = Number(timestamp) / 1_000_000;
  const now = Date.now();
  const diff = now - msTimestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  return new Date(msTimestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Format timestamp for individual message
 */
export function formatMessageTime(timestamp: bigint): string {
  const msTimestamp = Number(timestamp) / 1_000_000;
  return new Date(msTimestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
