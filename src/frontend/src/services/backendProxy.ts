/**
 * backendProxy.ts
 *
 * A proxy hook that wraps the real ICP actor with fallback to localBackend.
 * When any canister call fails (stopped, not a function, network error),
 * it automatically falls back to the in-browser localStorage backend.
 *
 * Usage:
 *   const backend = useBackend();
 *   await backend.sendMessage(sessionId, convId, text, null, null, "text");
 */

import type { backendInterface } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { localBackend } from "./localBackend";

// ─── Error detection ───────────────────────────────────────────────────────────
function shouldFallback(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lmsg = msg.toLowerCase();
  return (
    lmsg.includes("is not a function") ||
    lmsg.includes("is stopped") ||
    lmsg.includes("ic0508") ||
    lmsg.includes("rejected") ||
    lmsg.includes("replica returned") ||
    lmsg.includes("canister") ||
    lmsg.includes("network") ||
    lmsg.includes("failed to fetch") ||
    lmsg.includes("timeout") ||
    msg === "null" ||
    msg === "undefined"
  );
}

// ─── Proxy wrapper ─────────────────────────────────────────────────────────────
function createProxy(actor: backendInterface | null): backendInterface {
  async function tryCall<T>(
    methodName: string,
    actorFn: () => Promise<T>,
    localFn: () => Promise<T>,
  ): Promise<T> {
    // If actor is not available, go straight to local
    if (!actor) {
      console.warn(
        `[BackendProxy] actor not ready, using local backend for ${methodName}`,
      );
      return localFn();
    }

    try {
      return await actorFn();
    } catch (err: unknown) {
      if (shouldFallback(err)) {
        console.warn(
          `[BackendProxy] Canister call failed for ${methodName}, falling back to local backend:`,
          err instanceof Error ? err.message : err,
        );
        return localFn();
      }
      // Re-throw app-level errors (like "User not found", "Invalid credentials")
      throw err;
    }
  }

  return {
    register: (username, email, password) =>
      tryCall(
        "register",
        () => actor!.register(username, email, password),
        () => localBackend.register(username, email, password),
      ),

    login: (email, password) =>
      tryCall(
        "login",
        () => actor!.login(email, password),
        () => localBackend.login(email, password),
      ),

    loginWithMobile: (mobile) =>
      tryCall(
        "loginWithMobile",
        () => actor!.loginWithMobile(mobile),
        () => localBackend.loginWithMobile(mobile),
      ),

    registerWithMobile: (username, mobile) =>
      tryCall(
        "registerWithMobile",
        () => actor!.registerWithMobile(username, mobile),
        () => localBackend.registerWithMobile(username, mobile),
      ),

    verifyMobileOtp: (mobile, otp) =>
      tryCall(
        "verifyMobileOtp",
        () => actor!.verifyMobileOtp(mobile, otp),
        () => localBackend.verifyMobileOtp(mobile, otp),
      ),

    requestPasswordReset: (email) =>
      tryCall(
        "requestPasswordReset",
        () => actor!.requestPasswordReset(email),
        () => localBackend.requestPasswordReset(email),
      ),

    verifyPasswordReset: (email, otp, newPassword) =>
      tryCall(
        "verifyPasswordReset",
        () => actor!.verifyPasswordReset(email, otp, newPassword),
        () => localBackend.verifyPasswordReset(email, otp, newPassword),
      ),

    getProfile: (sessionId) =>
      tryCall(
        "getProfile",
        () => actor!.getProfile(sessionId),
        () => localBackend.getProfile(sessionId),
      ),

    updateProfile: (sessionId, username, avatarColor, isPublic, hideLastSeen) =>
      tryCall(
        "updateProfile",
        () =>
          actor!.updateProfile(
            sessionId,
            username,
            avatarColor,
            isPublic,
            hideLastSeen,
          ),
        () =>
          localBackend.updateProfile(
            sessionId,
            username,
            avatarColor,
            isPublic,
            hideLastSeen,
          ),
      ),

    updateProfilePicture: (sessionId, avatarUrl) =>
      tryCall(
        "updateProfilePicture",
        () => actor!.updateProfilePicture(sessionId, avatarUrl),
        () => localBackend.updateProfilePicture(sessionId, avatarUrl),
      ),

    updateLastSeen: (sessionId) =>
      tryCall(
        "updateLastSeen",
        () => actor!.updateLastSeen(sessionId),
        () => localBackend.updateLastSeen(sessionId),
      ),

    createConversation: (sessionId, participantUsername) =>
      tryCall(
        "createConversation",
        () => actor!.createConversation(sessionId, participantUsername),
        () => localBackend.createConversation(sessionId, participantUsername),
      ),

    createGroupConversation: (sessionId, groupName, participantUsernames) =>
      tryCall(
        "createGroupConversation",
        () =>
          actor!.createGroupConversation(
            sessionId,
            groupName,
            participantUsernames,
          ),
        () =>
          localBackend.createGroupConversation(
            sessionId,
            groupName,
            participantUsernames,
          ),
      ),

    getConversations: (sessionId) =>
      tryCall(
        "getConversations",
        () => actor!.getConversations(sessionId),
        () => localBackend.getConversations(sessionId),
      ),

    getMessages: (sessionId, conversationId, page, pageSize) =>
      tryCall(
        "getMessages",
        () => actor!.getMessages(sessionId, conversationId, page, pageSize),
        () =>
          localBackend.getMessages(sessionId, conversationId, page, pageSize),
      ),

    sendMessage: (
      sessionId,
      conversationId,
      content,
      replyToId,
      replyPreview,
      messageType,
    ) =>
      tryCall(
        "sendMessage",
        () =>
          actor!.sendMessage(
            sessionId,
            conversationId,
            content,
            replyToId,
            replyPreview,
            messageType,
          ),
        () =>
          localBackend.sendMessage(
            sessionId,
            conversationId,
            content,
            replyToId,
            replyPreview,
            messageType,
          ),
      ),

    editMessage: (sessionId, conversationId, messageId, newContent) =>
      tryCall(
        "editMessage",
        () =>
          actor!.editMessage(sessionId, conversationId, messageId, newContent),
        () =>
          localBackend.editMessage(
            sessionId,
            conversationId,
            messageId,
            newContent,
          ),
      ),

    deleteMessageForEveryone: (sessionId, conversationId, messageId) =>
      tryCall(
        "deleteMessageForEveryone",
        () =>
          actor!.deleteMessageForEveryone(sessionId, conversationId, messageId),
        () =>
          localBackend.deleteMessageForEveryone(
            sessionId,
            conversationId,
            messageId,
          ),
      ),

    reactToMessage: (sessionId, conversationId, messageId, emoji) =>
      tryCall(
        "reactToMessage",
        () =>
          actor!.reactToMessage(sessionId, conversationId, messageId, emoji),
        () =>
          localBackend.reactToMessage(
            sessionId,
            conversationId,
            messageId,
            emoji,
          ),
      ),

    pinConversation: (sessionId, conversationId, pinned) =>
      tryCall(
        "pinConversation",
        () => actor!.pinConversation(sessionId, conversationId, pinned),
        () => localBackend.pinConversation(sessionId, conversationId, pinned),
      ),

    broadcastMessage: (sessionId, participantUsernames, content) =>
      tryCall(
        "broadcastMessage",
        () => actor!.broadcastMessage(sessionId, participantUsernames, content),
        () =>
          localBackend.broadcastMessage(
            sessionId,
            participantUsernames,
            content,
          ),
      ),

    seedSampleData: () =>
      tryCall(
        "seedSampleData",
        () => actor!.seedSampleData(),
        () => localBackend.seedSampleData(),
      ),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBackend(): backendInterface {
  const { actor } = useActor();
  return createProxy(actor);
}
