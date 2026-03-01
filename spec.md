# Sunflower Chat

## Current State
A sunflower-themed real-time chat app with:
- User registration/login with sessions
- 1-to-1 conversations with message polling (1.5s)
- Friend code system (local storage)
- Message reactions, delete, secret mode (local)
- Mood ring, XP/level, daily surprise (local)
- Dark mode, profile modal
- Optimistic message sending

## Requested Changes (Diff)

### Add
- **Group Chat**: Create a group with name + multiple participants; send/receive messages in group
- **Message Edit**: Edit your own sent messages (update content, mark as edited)
- **Message Delete for Everyone**: Backend-side delete so other participants also see it gone
- **Message Reply**: Reply to a specific message (store replyToId + replyPreview in message)
- **Message Reactions**: Store reactions in backend per message (emoji + count)
- **Chat Pin Feature**: Pin a conversation to the top of chat list
- **Broadcast Message**: Send a message to multiple selected friends at once
- **Typing Indicator**: Persist typing state in backend so other user sees "typing..."
- **Last Seen**: Store last seen timestamp per user; show in chat header
- **Online Status**: Track last active time; show green dot if active < 60s ago
- **Voice Message**: Frontend-only recording using MediaRecorder, store as base64 text
- **Image/GIF Share**: Frontend image picker; send image URL or base64 as message content with type flag
- **Swipe to Reply**: Swipe gesture on mobile triggers reply-to
- **Sound effects**: Play soft sound on send, on message receive, on friend add/remove
- **Loading shimmer**: Already partially exists; ensure shimmer on all loading states
- **Pull to Refresh**: Pull-down gesture refreshes chat list
- **Smooth splash animation**: Already exists; refine with sunflower petal animation
- **App Lock (PIN)**: Frontend-only PIN lock screen after inactivity
- **Private/Public Account**: Toggle on profile whether account is discoverable
- **Last Seen Hide Option**: Toggle to hide last seen from others

### Modify
- **Message type**: Add `edited`, `deleted`, `replyToId`, `replyPreview`, `messageType` (text/image/voice/gif), `reactions` fields
- **User type**: Add `lastSeen`, `isPublic`, `hideLastSeen` fields
- **Conversation type**: Add `isPinned`, `isGroup`, `groupName` fields
- **Backend sendMessage**: Accept optional replyToId and messageType
- **Backend updateProfile**: Accept lastSeen, isPublic, hideLastSeen
- **getConversations**: Return pinned conversations first

### Remove
- Nothing removed; all existing features preserved

## Implementation Plan
1. Update Motoko backend:
   - Extend Message type with: edited bool, deleted bool, replyToId opt Text, replyPreview opt Text, messageType Text, reactions as JSON text
   - Extend User type with: lastSeen Time, isPublic bool, hideLastSeen bool
   - Extend Conversation type with: isPinned bool, isGroup bool, groupName opt Text
   - Add `editMessage(sessionId, convId, msgId, newContent)` endpoint
   - Add `deleteMessageForEveryone(sessionId, convId, msgId)` endpoint
   - Add `reactToMessage(sessionId, convId, msgId, emoji)` endpoint
   - Add `createGroupConversation(sessionId, groupName, participantUsernames[])` endpoint
   - Add `pinConversation(sessionId, convId, pinned)` endpoint
   - Add `updateLastSeen(sessionId)` endpoint
   - Modify `sendMessage` to accept replyToId opt, messageType Text
   - Modify `updateProfile` to accept lastSeen, isPublic, hideLastSeen
   - Order conversations: pinned first, then by last message time

2. Update frontend:
   - ChatScreen: reply-to UI (swipe/button), message edit (inline), image/voice/gif send buttons
   - ChatScreen: render replied-to message preview inside bubble
   - ChatScreen: render image/gif content, voice player UI
   - ChatScreen: sound effects on send/receive
   - ChatListScreen: pin button on conversation cards, pinned indicator
   - ChatListScreen: broadcast message modal (select friends, send same message to all)
   - ChatListScreen: pull-to-refresh gesture
   - ProfileModal: add isPublic toggle, hideLastSeen toggle
   - AppLock: PIN lock screen after 5min inactivity (localStorage)
   - Online/last seen: show in chat header based on lastSeen field
