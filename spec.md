# Sunflower Chat

## Current State
A working chat app with:
- Splash, Login/Register, Chat List, Chat screens
- Real-time messaging (polling every 1.5s)
- Friend code system (localStorage-based)
- User profiles with avatarColor
- Unread badge tracking
- Optimistic message sending

## Requested Changes (Diff)

### Add
1. **Mood Ring System** -- Profile has a mood field (Happy/Calm/Sleepy). User can set their mood from profile page. Avatar circle glows with mood color (yellow, green, soft brown).
2. **Daily Surprise** -- On first login each day, show a modal with a random sunflower quote, a virtual sunflower gift animation, and a positive message.
3. **Message Reactions** -- Tap/long-press a message to react with ❤️🌻😂👍. Reactions shown below the bubble with count.
4. **Typing Indicator** -- When user is typing, show animated dots in the chat header area (simulated via polling).
5. **Dark Mode (Sunset Sunflower theme)** -- Toggle in header. Switches to warm dark palette (deep amber, dark cream, sunset hues).
6. **Profile Page** -- New screen/modal. Shows: bio (short text), username, custom status line (e.g. "Feeling Happy 🌻"), birthday field. Can edit these.
7. **Secret Message Mode** -- Per-message: sender can mark as secret (auto-deletes after 10 seconds on receiver side). Visual countdown shown.
8. **Close Friends Badge** -- Track per-conversation message count. If > 20 messages exchanged, show "Best Sunflower 🌻" badge on the conversation card.
9. **XP Level System** -- Sending a message earns XP (stored locally). Levels: Seedling (0), Sprout (10), Bloom (30), Sunflower (60), Golden (100). Show level badge in header next to username.
10. **Message Delete** -- Long press / context menu on own messages: delete for me (removes from view locally).
11. **Typing sound effect** -- Optional subtle click sound when sending message.
12. **Pull to Refresh** -- On Chat List, pull down triggers refetch.

### Modify
- Profile type in backend: add `bio`, `status`, `mood`, `birthday` fields
- Message reactions stored locally (per conversation, per message)
- XP stored in localStorage
- Daily surprise: check localStorage for last-seen date

### Remove
- Nothing removed

## Implementation Plan
1. Update Motoko backend: extend User type with bio, status, mood, birthday. Update updateProfile to accept these fields. Add getProfile returning all fields.
2. Update frontend backend.d.ts to reflect new Profile fields.
3. Create ProfileModal component -- shows/edits bio, status, mood, birthday. Mood selector with 3 options + glow preview.
4. Create DailySurpriseModal component -- random quote + animated sunflower emoji + positive message. Gate behind localStorage date check.
5. Add Dark Mode toggle + CSS variables for sunset theme.
6. Add message reactions: ReactionPicker overlay on long press, store in localStorage keyed by convId+msgId, render below bubbles.
7. Add typing indicator: when user is typing (input non-empty), set a localStorage flag + show animated dots in header.
8. Add XP system: local state, increment on send, show level badge in ChatListScreen header.
9. Add secret message: checkbox/toggle when composing. After send, start 10s countdown timer, then hide message text.
10. Add Close Friends badge: count messages in conversation, show badge if > 20.
11. Add pull-to-refresh gesture on ChatListScreen.
12. Add mood glow to avatars based on current user's mood setting.
