/**
 * localBackend.ts
 *
 * A fully in-browser implementation of backendInterface using localStorage.
 * Used as a fallback when the ICP canister is unavailable/stopped.
 */

import type {
  ConversationView,
  MessageView,
  Profile3,
  SessionId,
} from "../backend.d";

// ─── Storage Keys ──────────────────────────────────────────────────────────────
const KEYS = {
  users: "sf_local_users",
  sessions: "sf_local_sessions",
  conversations: "sf_local_conversations",
  messages: "sf_local_messages",
  mobileOtps: "sf_local_mobile_otps",
  resetOtps: "sf_local_reset_otps",
  userCounter: "sf_local_user_counter",
  convCounter: "sf_local_conv_counter",
  msgCounter: "sf_local_msg_counter",
};

// ─── Internal Types ────────────────────────────────────────────────────────────
interface LocalUser {
  id: string;
  username: string;
  email: string;
  mobile: string;
  passwordHash: string;
  avatarColor: string;
  avatarUrl: string;
  isPublic: boolean;
  hideLastSeen: boolean;
  lastSeen: number; // ms
}

interface LocalConversation {
  id: string;
  participantIds: string[];
  isGroup: boolean;
  groupName: string;
  pinnedBy: string[];
}

interface LocalMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number; // ms
  edited: boolean;
  deleted: boolean;
  replyToId: string;
  replyPreview: string;
  messageType: string;
  reactions: string;
}

// ─── Simple hash (not crypto-grade, but sufficient for demo) ──────────────────
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return String(hash);
}

// ─── Storage helpers ───────────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full — ignore
  }
}

function nextId(counterKey: string, prefix: string): string {
  const current = load<number>(counterKey, 100);
  const next = current + 1;
  save(counterKey, next);
  return `${prefix}_${next}`;
}

function genSessionId(): string {
  return `local_sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function genOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Get helpers ───────────────────────────────────────────────────────────────
function getUsers(): LocalUser[] {
  return load<LocalUser[]>(KEYS.users, []);
}

function getSessions(): Record<string, string> {
  return load<Record<string, string>>(KEYS.sessions, {});
}

function getConversations(): LocalConversation[] {
  return load<LocalConversation[]>(KEYS.conversations, []);
}

function getMessages(): LocalMessage[] {
  return load<LocalMessage[]>(KEYS.messages, []);
}

// ─── Auth helpers ──────────────────────────────────────────────────────────────
function getUserIdFromSession(sessionId: string): string {
  const sessions = getSessions();
  const userId = sessions[sessionId];
  if (!userId) throw new Error("Session expired. Please log in again.");
  return userId;
}

function getUserById(id: string): LocalUser | undefined {
  return getUsers().find((u) => u.id === id);
}

// ─── Seed sample data guard ────────────────────────────────────────────────────
let seeded = false;

// ─── Convert to API types ─────────────────────────────────────────────────────
function toProfile3(user: LocalUser): Profile3 {
  return {
    id: user.id,
    username: user.username,
    email: user.email || undefined,
    mobile: user.mobile || undefined,
    avatarColor: user.avatarColor || undefined,
    avatarUrl: user.avatarUrl || undefined,
    isPublic: user.isPublic,
    hideLastSeen: user.hideLastSeen,
    lastSeen: BigInt(user.lastSeen) * 1_000_000n,
  };
}

function toMessageView(msg: LocalMessage): MessageView {
  return {
    id: msg.id,
    content: msg.content,
    senderId: msg.senderId,
    senderName: msg.senderName,
    timestamp: BigInt(msg.timestamp) * 1_000_000n,
    edited: msg.edited,
    deleted: msg.deleted,
    replyToId: msg.replyToId || undefined,
    replyPreview: msg.replyPreview || undefined,
    messageType: msg.messageType || "text",
    reactions: msg.reactions || "{}",
  };
}

function toConversationView(
  conv: LocalConversation,
  userId: string,
): ConversationView {
  const allMessages = getMessages();
  const convMessages = allMessages
    .filter((m) => m.conversationId === conv.id && !m.deleted)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20)
    .map(toMessageView);

  return {
    id: conv.id,
    participantIds: conv.participantIds,
    isGroup: conv.isGroup,
    groupName: conv.groupName || undefined,
    isPinned: conv.pinnedBy.includes(userId),
    messages: convMessages.reverse(),
  };
}

// ─── Local Backend Implementation ─────────────────────────────────────────────
export const localBackend = {
  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<SessionId> {
    const users = getUsers();
    const lEmail = email.toLowerCase().trim();
    const lUsername = username.toLowerCase().trim();

    if (users.some((u) => u.email.toLowerCase() === lEmail)) {
      throw new Error("An account with this email already exists.");
    }
    if (users.some((u) => u.username.toLowerCase() === lUsername)) {
      throw new Error("Username already taken. Try a different one.");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const newUser: LocalUser = {
      id: nextId(KEYS.userCounter, "local_user"),
      username: username.trim(),
      email: lEmail,
      mobile: "",
      passwordHash: simpleHash(password),
      avatarColor: "",
      avatarUrl: "",
      isPublic: true,
      hideLastSeen: false,
      lastSeen: Date.now(),
    };

    users.push(newUser);
    save(KEYS.users, users);

    const sessionId = genSessionId();
    const sessions = getSessions();
    sessions[sessionId] = newUser.id;
    save(KEYS.sessions, sessions);

    return sessionId;
  },

  async login(email: string, password: string): Promise<SessionId> {
    const users = getUsers();
    const lEmail = email.toLowerCase().trim();
    const user = users.find((u) => u.email.toLowerCase() === lEmail);

    if (!user) {
      throw new Error(
        "No account found with this email. Please register first.",
      );
    }
    if (user.passwordHash !== simpleHash(password)) {
      throw new Error("Incorrect password. Please try again.");
    }

    const sessionId = genSessionId();
    const sessions = getSessions();
    sessions[sessionId] = user.id;
    save(KEYS.sessions, sessions);

    // Update last seen
    user.lastSeen = Date.now();
    save(KEYS.users, users);

    return sessionId;
  },

  async loginWithMobile(mobile: string): Promise<string> {
    const users = getUsers();
    const user = users.find((u) => u.mobile === mobile.trim());
    if (!user) {
      throw new Error("No account found with this mobile number.");
    }
    const otp = genOtp();
    const otps = load<Record<string, string>>(KEYS.mobileOtps, {});
    otps[mobile.trim()] = otp;
    save(KEYS.mobileOtps, otps);
    return otp;
  },

  async registerWithMobile(username: string, mobile: string): Promise<string> {
    const users = getUsers();
    const lUsername = username.toLowerCase().trim();
    if (users.some((u) => u.username.toLowerCase() === lUsername)) {
      throw new Error("Username already taken.");
    }
    if (users.some((u) => u.mobile === mobile.trim())) {
      throw new Error("Mobile number already registered.");
    }

    const newUser: LocalUser = {
      id: nextId(KEYS.userCounter, "local_user"),
      username: username.trim(),
      email: "",
      mobile: mobile.trim(),
      passwordHash: "",
      avatarColor: "",
      avatarUrl: "",
      isPublic: true,
      hideLastSeen: false,
      lastSeen: Date.now(),
    };
    users.push(newUser);
    save(KEYS.users, users);

    const otp = genOtp();
    const otps = load<Record<string, string>>(KEYS.mobileOtps, {});
    otps[mobile.trim()] = otp;
    save(KEYS.mobileOtps, otps);
    return otp;
  },

  async verifyMobileOtp(mobile: string, otp: string): Promise<SessionId> {
    const otps = load<Record<string, string>>(KEYS.mobileOtps, {});
    if (otps[mobile.trim()] !== otp.trim()) {
      throw new Error("Invalid OTP. Please try again.");
    }
    delete otps[mobile.trim()];
    save(KEYS.mobileOtps, otps);

    const users = getUsers();
    const user = users.find((u) => u.mobile === mobile.trim());
    if (!user) throw new Error("User not found.");

    const sessionId = genSessionId();
    const sessions = getSessions();
    sessions[sessionId] = user.id;
    save(KEYS.sessions, sessions);
    return sessionId;
  },

  async requestPasswordReset(email: string): Promise<string> {
    const users = getUsers();
    const lEmail = email.toLowerCase().trim();
    const user = users.find((u) => u.email.toLowerCase() === lEmail);
    if (!user) throw new Error("No account found with this email.");

    const otp = genOtp();
    const otps = load<Record<string, string>>(KEYS.resetOtps, {});
    otps[lEmail] = otp;
    save(KEYS.resetOtps, otps);
    return otp;
  },

  async verifyPasswordReset(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> {
    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    const otps = load<Record<string, string>>(KEYS.resetOtps, {});
    const lEmail = email.toLowerCase().trim();
    if (otps[lEmail] !== otp.trim()) {
      throw new Error("Invalid or expired OTP.");
    }

    const users = getUsers();
    const user = users.find((u) => u.email.toLowerCase() === lEmail);
    if (!user) throw new Error("User not found.");

    user.passwordHash = simpleHash(newPassword);
    delete otps[lEmail];
    save(KEYS.resetOtps, otps);
    save(KEYS.users, users);
  },

  async getProfile(sessionId: SessionId): Promise<Profile3> {
    const userId = getUserIdFromSession(sessionId);
    const user = getUserById(userId);
    if (!user) throw new Error("User not found.");
    return toProfile3(user);
  },

  async updateProfile(
    sessionId: SessionId,
    username: string,
    avatarColor: string | null,
    isPublic: boolean,
    hideLastSeen: boolean,
  ): Promise<void> {
    const userId = getUserIdFromSession(sessionId);
    const users = getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error("User not found.");

    const lUsername = username.toLowerCase().trim();
    const conflict = users.find(
      (u) => u.username.toLowerCase() === lUsername && u.id !== userId,
    );
    if (conflict) throw new Error("Username already taken.");

    users[userIndex] = {
      ...users[userIndex],
      username: username.trim(),
      avatarColor: avatarColor ?? users[userIndex].avatarColor,
      isPublic,
      hideLastSeen,
    };
    save(KEYS.users, users);
  },

  async updateProfilePicture(
    sessionId: SessionId,
    avatarUrl: string,
  ): Promise<void> {
    const userId = getUserIdFromSession(sessionId);
    const users = getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error("User not found.");
    users[userIndex].avatarUrl = avatarUrl;
    save(KEYS.users, users);
  },

  async updateLastSeen(sessionId: SessionId): Promise<void> {
    try {
      const userId = getUserIdFromSession(sessionId);
      const users = getUsers();
      const userIndex = users.findIndex((u) => u.id === userId);
      if (userIndex >= 0) {
        users[userIndex].lastSeen = Date.now();
        save(KEYS.users, users);
      }
    } catch {
      // Non-critical
    }
  },

  async createConversation(
    sessionId: SessionId,
    participantUsername: string,
  ): Promise<string> {
    const userId = getUserIdFromSession(sessionId);
    const users = getUsers();

    let target = users.find(
      (u) =>
        u.username.toLowerCase() === participantUsername.toLowerCase().trim(),
    );

    // If user not found locally, create a stub entry so the conversation can be created.
    // This handles friends who registered on the canister but are not in local storage.
    if (!target) {
      target = {
        id: `stub_${participantUsername.toLowerCase().trim()}`,
        username: participantUsername.trim(),
        email: "",
        mobile: "",
        passwordHash: "",
        avatarColor: "",
        avatarUrl: "",
        isPublic: true,
        hideLastSeen: false,
        lastSeen: Date.now(),
      };
      users.push(target);
      save(KEYS.users, users);
    }

    if (target.id === userId) {
      throw new Error("You can't start a conversation with yourself.");
    }

    // Check if 1:1 conversation already exists
    const conversations = getConversations();
    const existing = conversations.find(
      (c) =>
        !c.isGroup &&
        c.participantIds.includes(userId) &&
        c.participantIds.includes(target.id) &&
        c.participantIds.length === 2,
    );
    if (existing) return existing.id;

    const newConv: LocalConversation = {
      id: nextId(KEYS.convCounter, "local_conv"),
      participantIds: [userId, target.id],
      isGroup: false,
      groupName: "",
      pinnedBy: [],
    };
    conversations.push(newConv);
    save(KEYS.conversations, conversations);
    return newConv.id;
  },

  async createGroupConversation(
    sessionId: SessionId,
    groupName: string,
    participantUsernames: string[],
  ): Promise<string> {
    const userId = getUserIdFromSession(sessionId);
    const users = getUsers();

    const participantIds = [userId];
    for (const uname of participantUsernames) {
      const target = users.find(
        (u) => u.username.toLowerCase() === uname.toLowerCase().trim(),
      );
      if (target && !participantIds.includes(target.id)) {
        participantIds.push(target.id);
      }
    }

    const newConv: LocalConversation = {
      id: nextId(KEYS.convCounter, "local_conv"),
      participantIds,
      isGroup: true,
      groupName: groupName.trim(),
      pinnedBy: [],
    };
    const conversations = getConversations();
    conversations.push(newConv);
    save(KEYS.conversations, conversations);
    return newConv.id;
  },

  async getConversations(sessionId: SessionId): Promise<ConversationView[]> {
    const userId = getUserIdFromSession(sessionId);
    const conversations = getConversations();
    return conversations
      .filter((c) => c.participantIds.includes(userId))
      .map((c) => toConversationView(c, userId));
  },

  async getMessages(
    sessionId: SessionId,
    conversationId: string,
    page: bigint,
    pageSize: bigint,
  ): Promise<MessageView[]> {
    getUserIdFromSession(sessionId); // Validate session
    const allMessages = getMessages();
    const convMessages = allMessages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp - b.timestamp);

    const pageNum = Number(page);
    const size = Number(pageSize);
    const start = Math.max(0, convMessages.length - size * (pageNum + 1));
    const end = convMessages.length - size * pageNum;
    return convMessages.slice(start, end).map(toMessageView);
  },

  async sendMessage(
    sessionId: SessionId,
    conversationId: string,
    content: string,
    replyToId: string | null,
    replyPreview: string | null,
    messageType: string,
  ): Promise<void> {
    const userId = getUserIdFromSession(sessionId);
    const user = getUserById(userId);
    if (!user) throw new Error("User not found.");

    // Verify user is in conversation
    const conversations = getConversations();
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) throw new Error("Conversation not found.");
    if (!conv.participantIds.includes(userId)) {
      throw new Error("You are not a participant in this conversation.");
    }

    const messages = getMessages();
    const newMsg: LocalMessage = {
      id: nextId(KEYS.msgCounter, "local_msg"),
      conversationId,
      senderId: userId,
      senderName: user.username,
      content,
      timestamp: Date.now(),
      edited: false,
      deleted: false,
      replyToId: replyToId ?? "",
      replyPreview: replyPreview ?? "",
      messageType: messageType || "text",
      reactions: "{}",
    };
    messages.push(newMsg);
    save(KEYS.messages, messages);
  },

  async editMessage(
    sessionId: SessionId,
    conversationId: string,
    messageId: string,
    newContent: string,
  ): Promise<void> {
    const userId = getUserIdFromSession(sessionId);
    const messages = getMessages();
    const idx = messages.findIndex(
      (m) => m.id === messageId && m.conversationId === conversationId,
    );
    if (idx === -1) throw new Error("Message not found.");
    if (messages[idx].senderId !== userId) {
      throw new Error("You can only edit your own messages.");
    }
    messages[idx].content = newContent;
    messages[idx].edited = true;
    save(KEYS.messages, messages);
  },

  async deleteMessageForEveryone(
    sessionId: SessionId,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    const userId = getUserIdFromSession(sessionId);
    const messages = getMessages();
    const idx = messages.findIndex(
      (m) => m.id === messageId && m.conversationId === conversationId,
    );
    if (idx === -1) throw new Error("Message not found.");
    if (messages[idx].senderId !== userId) {
      throw new Error("You can only delete your own messages.");
    }
    messages[idx].deleted = true;
    messages[idx].content = "";
    save(KEYS.messages, messages);
  },

  async reactToMessage(
    sessionId: SessionId,
    conversationId: string,
    messageId: string,
    emoji: string,
  ): Promise<void> {
    getUserIdFromSession(sessionId); // Validate session
    const messages = getMessages();
    const idx = messages.findIndex(
      (m) => m.id === messageId && m.conversationId === conversationId,
    );
    if (idx === -1) return; // Silent fail for reactions

    let reactions: Record<string, number> = {};
    try {
      reactions = JSON.parse(messages[idx].reactions || "{}") as Record<
        string,
        number
      >;
    } catch {
      reactions = {};
    }
    reactions[emoji] = (reactions[emoji] ?? 0) + 1;
    messages[idx].reactions = JSON.stringify(reactions);
    save(KEYS.messages, messages);
  },

  async pinConversation(
    sessionId: SessionId,
    conversationId: string,
    pinned: boolean,
  ): Promise<void> {
    const userId = getUserIdFromSession(sessionId);
    const conversations = getConversations();
    const idx = conversations.findIndex((c) => c.id === conversationId);
    if (idx === -1) return;

    if (pinned && !conversations[idx].pinnedBy.includes(userId)) {
      conversations[idx].pinnedBy.push(userId);
    } else if (!pinned) {
      conversations[idx].pinnedBy = conversations[idx].pinnedBy.filter(
        (id) => id !== userId,
      );
    }
    save(KEYS.conversations, conversations);
  },

  async broadcastMessage(
    sessionId: SessionId,
    participantUsernames: string[],
    content: string,
  ): Promise<void> {
    const userId = getUserIdFromSession(sessionId);
    const user = getUserById(userId);
    if (!user) throw new Error("User not found.");

    const users = getUsers();
    const messages = getMessages();
    const conversations = getConversations();

    for (const uname of participantUsernames) {
      const target = users.find(
        (u) => u.username.toLowerCase() === uname.toLowerCase().trim(),
      );
      if (!target) continue;

      // Find or create 1:1 conversation
      let conv = conversations.find(
        (c) =>
          !c.isGroup &&
          c.participantIds.includes(userId) &&
          c.participantIds.includes(target.id) &&
          c.participantIds.length === 2,
      );

      if (!conv) {
        conv = {
          id: nextId(KEYS.convCounter, "local_conv"),
          participantIds: [userId, target.id],
          isGroup: false,
          groupName: "",
          pinnedBy: [],
        };
        conversations.push(conv);
      }

      const newMsg: LocalMessage = {
        id: nextId(KEYS.msgCounter, "local_msg"),
        conversationId: conv.id,
        senderId: userId,
        senderName: user.username,
        content,
        timestamp: Date.now(),
        edited: false,
        deleted: false,
        replyToId: "",
        replyPreview: "",
        messageType: "text",
        reactions: "{}",
      };
      messages.push(newMsg);
    }

    save(KEYS.conversations, conversations);
    save(KEYS.messages, messages);
  },

  async seedSampleData(): Promise<void> {
    if (seeded) return;
    seeded = true;

    const users = getUsers();
    const alreadySeeded = users.some((u) =>
      ["alice", "bob", "charlie"].includes(u.username.toLowerCase()),
    );
    if (alreadySeeded) return;

    // Create sample users
    const seedUsers: LocalUser[] = [
      {
        id: "seed_user_alice",
        username: "alice",
        email: "alice@sunflower.chat",
        mobile: "",
        passwordHash: simpleHash("demo123"),
        avatarColor: "bg-pink-100 text-pink-700",
        avatarUrl: "",
        isPublic: true,
        hideLastSeen: false,
        lastSeen: Date.now() - 60000,
      },
      {
        id: "seed_user_bob",
        username: "bob",
        email: "bob@sunflower.chat",
        mobile: "",
        passwordHash: simpleHash("demo123"),
        avatarColor: "bg-blue-100 text-blue-700",
        avatarUrl: "",
        isPublic: true,
        hideLastSeen: false,
        lastSeen: Date.now() - 120000,
      },
      {
        id: "seed_user_charlie",
        username: "charlie",
        email: "charlie@sunflower.chat",
        mobile: "",
        passwordHash: simpleHash("demo123"),
        avatarColor: "bg-green-100 text-green-700",
        avatarUrl: "",
        isPublic: true,
        hideLastSeen: false,
        lastSeen: Date.now() - 180000,
      },
    ];

    users.push(...seedUsers);
    save(KEYS.users, users);
  },
};
