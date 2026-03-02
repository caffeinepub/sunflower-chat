# Sunflower Chat

## Current State
ChatScreen.tsx renders all messages in a flex column. MessageBubble uses `max-w-[75%]` and `break-words` on the `<p>` tag, but the animation class `.animate-fade-in` has a 0.6s duration and the CSS lacks explicit `word-break: normal` / `white-space: normal` rules. The bubble container uses `overflow-hidden` which can cause character-level clipping. The message query fetches 50 messages and re-renders on every 1.5s poll, including a full sort on every render.

## Requested Changes (Diff)

### Add
- `word-break: normal` and `white-space: normal` explicitly on message `<p>` element
- `overflow-wrap: break-word` (CSS class) so long URLs/words wrap at word boundaries only
- Virtualized/windowed message list: render only latest 25 messages on initial load, load older messages when user scrolls to top
- Debounced input handler (300ms) to prevent rapid state updates on each keystroke
- Lightweight fade-in animation (150ms, opacity only, no transform)
- `useCallback` + `useMemo` guards on sorted messages and per-message derived values to prevent unnecessary re-renders
- Smooth `scrollIntoView` only triggered when near bottom or on initial load

### Modify
- `.animate-fade-in` in index.css: reduce duration from 0.6s to 0.15s, remove transform, opacity only
- `.chat-bubble-sent` / `.chat-bubble-received` in index.css: add `word-break: normal; overflow-wrap: break-word; white-space: normal;`
- MessageBubble `<p>` tag: remove `break-words` Tailwind class, use explicit inline style `wordBreak: 'normal', overflowWrap: 'break-word', whiteSpace: 'normal'`
- Remove `overflow-hidden` from bubble container (was hiding text that wrapped to next line inside a narrow container)
- Message list in ChatScreen: slice to latest 25 initially, expose "Load older" button at top
- Polling interval stays at 1500ms but query result comparison is memoized so re-renders only happen when message IDs actually change
- `handleInputChange`: wrap with `useCallback`, debounce the `setIsTyping` + typing timer, keep `setMessageText` immediate for responsive input

### Remove
- `overflow-hidden` on the bubble `div` (causes clipping)
- Heavy 0.6s `fadeIn` animation from message bubbles (replaced with 0.15s)

## Implementation Plan
1. Fix `.animate-fade-in` keyframe and timing in `index.css` (0.15s, opacity only)
2. Add `word-break: normal; overflow-wrap: break-word; white-space: normal;` to `.chat-bubble-sent` and `.chat-bubble-received` in `index.css`
3. In `MessageBubble`, remove `overflow-hidden` from bubble div, fix `<p>` text wrapping styles
4. In `ChatScreen`, add `useMemo` for sorted+sliced messages (latest 25), add scroll-to-top load-more button
5. Debounce `setIsTyping` in `handleInputChange` (keep `setMessageText` immediate)
6. Optimize scroll: `scrollToBottom` only fires when near bottom or initial load, use `requestAnimationFrame` to avoid layout jumping
