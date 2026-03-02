# Sunflower Chat

## Current State
A cute sunflower-themed chat app with splash, login, chat list, and chat screens. Users can register/login with email+password or mobile OTP. Messages are sent/received in real-time via polling. Features include mood rings, reactions, secret messages, XP levels, dark mode, and more.

**Critical Bug**: Users cannot send messages after logging in. Root cause is in the auth flow:
1. `register()` in the backend stores the user but does NOT store the password and returns `void` (no sessionId)
2. `login()` does NOT validate the password — it just checks if the email exists and creates a session
3. When registration works but then `login()` is called immediately after, the session is created but `getProfile()` can fail or return stale data
4. The result: users appear to be logged in but message sends fail with auth errors because the session/userId is mismatched

## Requested Changes (Diff)

### Add
- Password storage field on User record in backend
- `register` returns `SessionId` so the frontend doesn't need a separate `login` call after registration

### Modify
- `register(username, email, password)` → now returns `SessionId` (creates user, stores password, creates session, returns it)
- `login(email, password)` → now validates the password matches the stored hash before issuing a session
- Frontend `EmailLoginFlow`: after `register`, use the returned sessionId directly instead of calling `login` again (avoids double-session issue)
- `seedSampleData` — add passwords to seed users so they can be tested

### Remove
- Nothing

## Implementation Plan
1. Regenerate backend with password stored on User3, register returns SessionId, login validates password
2. Update frontend LoginScreen EmailLoginFlow to use sessionId from register directly (skip separate login call when registering)
