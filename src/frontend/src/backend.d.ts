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
export interface MessagePreview {
    id: string;
    content: string;
    timestamp: Time;
    senderName: string;
    senderId: UserId;
}
export interface Message {
    id: string;
    content: string;
    timestamp: Time;
    senderName: string;
    senderId: UserId;
}
export type SessionId = string;
export interface Profile {
    id: UserId;
    username: string;
    email: Email;
    avatarColor?: string;
}
export interface ConversationView {
    id: string;
    messages: Array<Message>;
    participantIds: Array<UserId>;
}
export type Email = string;
export interface backendInterface {
    createConversation(sessionId: SessionId, participantUsername: string): Promise<string>;
    getConversations(sessionId: SessionId): Promise<Array<ConversationView>>;
    getMessages(sessionId: SessionId, conversationId: string, page: bigint, pageSize: bigint): Promise<Array<MessagePreview>>;
    getProfile(sessionId: SessionId): Promise<Profile>;
    login(email: string, password: string): Promise<SessionId>;
    register(username: string, email: string, password: string): Promise<void>;
    seedSampleData(): Promise<void>;
    sendMessage(sessionId: SessionId, conversationId: string, content: string): Promise<void>;
    updateProfile(sessionId: SessionId, username: string, avatarColor: string | null): Promise<void>;
}
