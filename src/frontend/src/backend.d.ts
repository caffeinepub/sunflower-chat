import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type UserId = string;
export type Time = bigint;
export type MessageId = string;
export interface MessageView {
    id: MessageId;
    deleted: boolean;
    content: string;
    edited: boolean;
    replyPreview?: string;
    messageType: string;
    timestamp: Time;
    senderName: string;
    replyToId?: string;
    reactions: string;
    senderId: UserId;
}
export interface ConversationView {
    id: ConversationId;
    messages: Array<MessageView>;
    isGroup: boolean;
    participantIds: Array<UserId>;
    groupName?: string;
    isPinned: boolean;
}
export type SessionId = string;
export interface Profile {
    id: UserId;
    username: string;
    email: Email;
    avatarColor?: string;
    hideLastSeen: boolean;
    isPublic: boolean;
    lastSeen: Time;
}
export type Email = string;
export type ConversationId = string;
export interface backendInterface {
    broadcastMessage(sessionId: SessionId, participantUsernames: Array<string>, content: string): Promise<void>;
    createConversation(sessionId: SessionId, participantUsername: string): Promise<ConversationId>;
    createGroupConversation(sessionId: SessionId, groupName: string, participantUsernames: Array<string>): Promise<ConversationId>;
    deleteMessageForEveryone(sessionId: SessionId, conversationId: ConversationId, messageId: MessageId): Promise<void>;
    editMessage(sessionId: SessionId, conversationId: ConversationId, messageId: MessageId, newContent: string): Promise<void>;
    getConversations(sessionId: SessionId): Promise<Array<ConversationView>>;
    getMessages(sessionId: SessionId, conversationId: ConversationId, page: bigint, pageSize: bigint): Promise<Array<MessageView>>;
    getProfile(sessionId: SessionId): Promise<Profile>;
    login(email: string, password: string): Promise<SessionId>;
    pinConversation(sessionId: SessionId, conversationId: ConversationId, pinned: boolean): Promise<void>;
    reactToMessage(sessionId: SessionId, conversationId: ConversationId, messageId: MessageId, emoji: string): Promise<void>;
    register(username: string, email: string, password: string): Promise<void>;
    seedSampleData(): Promise<void>;
    sendMessage(sessionId: SessionId, conversationId: ConversationId, content: string, replyToId: string | null, replyPreview: string | null, messageType: string): Promise<void>;
    updateLastSeen(sessionId: SessionId): Promise<void>;
    updateProfile(sessionId: SessionId, username: string, avatarColor: string | null, isPublic: boolean, hideLastSeen: boolean): Promise<void>;
}
