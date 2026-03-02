# Sunflower Chat

## Current State
- Login/Register screen with email + password
- Backend: `register`, `login`, `getProfile` functions
- No password reset, no mobile login, no OTP system

## Requested Changes (Diff)

### Add
- **Forgot Password flow**: User enters registered email → backend generates a 6-digit OTP → OTP shown on-screen (platform cannot send real emails, so OTP is displayed in a toast/modal for the user to copy) → user enters OTP → user sets new password
- **Mobile Number Login**: User can register/login with a mobile number + OTP instead of email+password. Backend generates a 6-digit OTP → displayed on-screen (SMS gateway not available on platform) → user enters OTP to authenticate
- Backend methods: `requestPasswordReset(email)`, `verifyPasswordReset(email, otp, newPassword)`, `registerWithMobile(username, mobile)`, `loginWithMobile(mobile)`, `verifyMobileOtp(mobile, otp)`
- User model extended with optional `mobile` field and `passwordHash` for reset

### Modify
- `LoginScreen.tsx` -- add tabs/toggle for "Email Login" vs "Mobile Login", add "Forgot Password?" link, add OTP entry step UI
- Backend `User` type -- add optional `mobile: ?Text` field
- Backend storage -- add `mobileToUserId` map, `otpStore` for pending OTPs (keyed by email or mobile)

### Remove
- Nothing removed

## Implementation Plan
1. Update `main.mo`:
   - Add `mobile: ?Text` to User type
   - Add `mobileToUserId` map
   - Add `otpStore` map (key = email/mobile, value = {otp, expiresAt})
   - Add `requestPasswordReset(email)` -- returns OTP (displayed in UI since no email service)
   - Add `verifyPasswordReset(email, otp, newPassword)` -- validates OTP and resets password
   - Add `registerWithMobile(username, mobile)` -- returns OTP
   - Add `loginWithMobile(mobile)` -- returns OTP for existing users
   - Add `verifyMobileOtp(mobile, otp)` -- validates OTP, returns SessionId
2. Update `LoginScreen.tsx`:
   - Add login method toggle: Email / Mobile
   - Email tab: existing email+password form + "Forgot Password?" link
   - Mobile tab: phone number input → OTP step
   - Forgot Password flow: modal/inline step with email → OTP → new password
   - OTP display toast: show generated OTP to user (simulated, since no SMS/email gateway)
