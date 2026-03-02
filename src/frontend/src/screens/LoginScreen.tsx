import { CheckCircle, ChevronLeft, Loader2, Mail, Phone } from "lucide-react";
import { useState } from "react";
import type { Profile3 } from "../backend.d";
import { useApp } from "../context/AppContext";
import { useBackend } from "../services/backendProxy";

// ─── Types ──────────────────────────────────────────────────────────────────

type LoginTab = "email" | "mobile";
type EmailMode = "login" | "register";
type ForgotStep = "enterEmail" | "verifyOtp";
type MobileStep = "enterPhone" | "enterUsername" | "verifyOtp";

// ─── OTP Display Box ────────────────────────────────────────────────────────

function OtpDisplayBox({ otp }: { otp: string }) {
  return (
    <div
      className="rounded-2xl p-4 mt-2 mb-1"
      style={{
        background: "oklch(0.975 0.04 88)",
        border: "1.5px solid oklch(0.88 0.09 80)",
      }}
      aria-live="polite"
    >
      <p
        className="text-xs font-semibold mb-1"
        style={{ color: "oklch(0.55 0.1 70)" }}
      >
        Your verification code:
      </p>
      <p
        className="text-3xl font-bold tracking-[0.25em] text-center"
        style={{ color: "oklch(0.55 0.18 65)" }}
      >
        {otp}
      </p>
      <p
        className="text-xs text-center mt-2"
        style={{ color: "oklch(0.65 0.06 70)" }}
      >
        Since this is a demo app, your OTP is shown here instead of being sent
        via SMS/email.
      </p>
    </div>
  );
}

// ─── Error Box ──────────────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-medium"
      style={{
        background: "oklch(0.96 0.025 30)",
        color: "oklch(0.5 0.15 25)",
        border: "1px solid oklch(0.88 0.06 30)",
      }}
      role="alert"
    >
      {message}
    </div>
  );
}

// ─── Success Box ────────────────────────────────────────────────────────────

function SuccessBox({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2"
      style={{
        background: "oklch(0.96 0.025 145)",
        color: "oklch(0.4 0.1 140)",
        border: "1px solid oklch(0.85 0.06 140)",
      }}
      aria-live="polite"
    >
      <CheckCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  );
}

// ─── Form Label ─────────────────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold mb-1"
      style={{ color: "oklch(0.5 0.08 65)" }}
    >
      {children}
    </label>
  );
}

// ─── Tab Pills ──────────────────────────────────────────────────────────────

function TabPills({
  tab,
  onChange,
}: {
  tab: LoginTab;
  onChange: (t: LoginTab) => void;
}) {
  return (
    <div
      className="flex rounded-2xl p-1 mb-5 gap-1"
      style={{ background: "oklch(0.955 0.022 88)" }}
      role="tablist"
      aria-label="Login method"
    >
      {(["email", "mobile"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={tab === t}
          onClick={() => onChange(t)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
          style={
            tab === t
              ? {
                  background: "oklch(0.72 0.155 68)",
                  color: "white",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }
              : { color: "oklch(0.6 0.08 68)" }
          }
        >
          {t === "email" ? (
            <Mail className="w-3.5 h-3.5" />
          ) : (
            <Phone className="w-3.5 h-3.5" />
          )}
          {t === "email" ? "Email" : "Mobile"}
        </button>
      ))}
    </div>
  );
}

// ─── Forgot Password Flow ───────────────────────────────────────────────────

function ForgotPasswordFlow({ onBack }: { onBack: () => void }) {
  const backend = useBackend();
  const [step, setStep] = useState<ForgotStep>("enterEmail");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [displayOtp, setDisplayOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const receivedOtp = await backend.requestPasswordReset(email.trim());
      setDisplayOtp(receivedOtp);
      setStep("verifyOtp");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Could not find an account with that email.");
    } finally {
      setLoading(false);
    }
  };

  const verifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await backend.verifyPasswordReset(email.trim(), otp.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Invalid OTP or password too short.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <SuccessBox message="Password reset successful! You can now sign in." />
        <button
          type="button"
          onClick={onBack}
          className="sunflower-btn-primary w-full flex items-center justify-center gap-2 mt-1"
          style={{ background: "oklch(0.72 0.155 68)", color: "white" }}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium mb-3 hover:opacity-75 transition-opacity self-start"
        style={{ color: "oklch(0.62 0.15 65)" }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Sign In
      </button>

      <h2
        className="text-lg font-bold mb-1"
        style={{ color: "oklch(0.45 0.1 65)" }}
      >
        {step === "enterEmail" ? "Reset Password 🌻" : "Verify & Reset"}
      </h2>
      <p className="text-sm mb-4" style={{ color: "oklch(0.65 0.07 75)" }}>
        {step === "enterEmail"
          ? "Enter your email to receive a reset code."
          : "Enter the code and your new password."}
      </p>

      {step === "enterEmail" ? (
        <form onSubmit={requestReset} className="flex flex-col gap-3">
          <div>
            <FieldLabel htmlFor="reset-email">Email Address</FieldLabel>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@sunflower.chat"
              required
              className="sunflower-input w-full text-sm"
              autoComplete="email"
            />
          </div>
          {error && <ErrorBox message={error} />}
          <button
            type="submit"
            disabled={loading}
            className="sunflower-btn-primary w-full flex items-center justify-center gap-2 mt-1"
            style={{
              background: loading
                ? "oklch(0.82 0.08 72)"
                : "oklch(0.72 0.155 68)",
              color: "white",
            }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Sending..." : "Get Reset Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyReset} className="flex flex-col gap-3">
          {displayOtp && <OtpDisplayBox otp={displayOtp} />}
          <div>
            <FieldLabel htmlFor="reset-otp">Enter OTP Code</FieldLabel>
            <input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              maxLength={6}
              required
              className="sunflower-input w-full text-sm tracking-widest"
              autoComplete="one-time-code"
            />
          </div>
          <div>
            <FieldLabel htmlFor="reset-newpass">New Password</FieldLabel>
            <input
              id="reset-newpass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
              className="sunflower-input w-full text-sm"
              autoComplete="new-password"
            />
          </div>
          {error && <ErrorBox message={error} />}
          <button
            type="submit"
            disabled={loading}
            className="sunflower-btn-primary w-full flex items-center justify-center gap-2 mt-1"
            style={{
              background: loading
                ? "oklch(0.82 0.08 72)"
                : "oklch(0.72 0.155 68)",
              color: "white",
            }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Email Login Flow ────────────────────────────────────────────────────────

function EmailLoginFlow({
  onSuccess,
}: {
  onSuccess: (sessionId: string, profile: Profile3) => void;
}) {
  const backend = useBackend();
  const [mode, setMode] = useState<EmailMode>("login");
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let sessionId: string;
      if (mode === "register") {
        sessionId = await backend.register(
          username.trim(),
          email.trim(),
          password,
        );
      } else {
        sessionId = await backend.login(email.trim(), password);
      }
      try {
        await backend.seedSampleData();
      } catch {
        // Not critical
      }
      const profile = await backend.getProfile(sessionId);
      onSuccess(sessionId, profile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
    setEmail("");
    setPassword("");
    setUsername("");
  };

  if (showForgot) {
    return (
      <ForgotPasswordFlow
        onBack={() => {
          setShowForgot(false);
          setError(null);
        }}
      />
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "register" && (
          <div>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="sunflower_lover"
              required
              minLength={2}
              className="sunflower-input w-full text-sm"
              autoComplete="username"
            />
          </div>
        )}

        <div>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@sunflower.chat"
            required
            className="sunflower-input w-full text-sm"
            autoComplete="email"
          />
        </div>

        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="sunflower-input w-full text-sm"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
          {mode === "login" && (
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs font-semibold hover:opacity-75 transition-opacity"
                style={{ color: "oklch(0.62 0.15 65)" }}
              >
                Forgot Password?
              </button>
            </div>
          )}
        </div>

        {error && <ErrorBox message={error} />}

        <button
          type="submit"
          disabled={loading}
          className="sunflower-btn-primary w-full flex items-center justify-center gap-2 mt-1"
          style={{
            background: loading
              ? "oklch(0.82 0.08 72)"
              : "oklch(0.72 0.155 68)",
            color: "white",
          }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      <p
        className="text-sm text-center mt-5"
        style={{ color: "oklch(0.65 0.06 70)" }}
      >
        {mode === "login"
          ? "Don't have an account?"
          : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={toggleMode}
          className="font-semibold underline underline-offset-2 hover:opacity-75 transition-opacity"
          style={{ color: "oklch(0.62 0.15 65)" }}
        >
          {mode === "login" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </>
  );
}

// ─── Mobile Login Flow ───────────────────────────────────────────────────────

function MobileLoginFlow({
  onSuccess,
}: {
  onSuccess: (sessionId: string, profile: Profile3) => void;
}) {
  const backend = useBackend();
  const [step, setStep] = useState<MobileStep>("enterPhone");
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [displayOtp, setDisplayOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRegister, setNeedsRegister] = useState(false);

  const handleGetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const receivedOtp = await backend.loginWithMobile(mobile.trim());
      setDisplayOtp(receivedOtp);
      setNeedsRegister(false);
      setStep("verifyOtp");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If user doesn't exist, offer registration
      if (
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("user") ||
        msg.toLowerCase().includes("exist")
      ) {
        setNeedsRegister(true);
        setError(
          "No account found with this number. Would you like to register?",
        );
      } else {
        setError(msg || "Failed to send OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const receivedOtp = await backend.registerWithMobile(
        username.trim(),
        mobile.trim(),
      );
      setDisplayOtp(receivedOtp);
      setNeedsRegister(false);
      setStep("verifyOtp");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sessionId = await backend.verifyMobileOtp(
        mobile.trim(),
        otp.trim(),
      );
      const profile = await backend.getProfile(sessionId);
      onSuccess(sessionId, profile);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step: Enter phone + optionally username ────────────────────────────────
  if (step === "enterPhone") {
    return (
      <div className="flex flex-col gap-3">
        <form onSubmit={handleGetOtp} className="flex flex-col gap-3">
          <div>
            <FieldLabel htmlFor="mobile-number">Mobile Number</FieldLabel>
            <input
              id="mobile-number"
              type="tel"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setNeedsRegister(false);
                setError(null);
              }}
              placeholder="+91 XXXXX XXXXX"
              required
              className="sunflower-input w-full text-sm"
              autoComplete="tel"
            />
          </div>

          {!needsRegister && error && <ErrorBox message={error} />}

          {!needsRegister && (
            <button
              type="submit"
              disabled={loading}
              className="sunflower-btn-primary w-full flex items-center justify-center gap-2"
              style={{
                background: loading
                  ? "oklch(0.82 0.08 72)"
                  : "oklch(0.72 0.155 68)",
                color: "white",
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Checking..." : "Get OTP"}
            </button>
          )}
        </form>

        {needsRegister && (
          <>
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                background: "oklch(0.975 0.04 88)",
                border: "1px solid oklch(0.88 0.09 80)",
                color: "oklch(0.5 0.1 65)",
              }}
            >
              📱 No account found. Enter a username to register with this
              number.
            </div>
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <div>
                <FieldLabel htmlFor="mobile-username">
                  Choose a Username
                </FieldLabel>
                <input
                  id="mobile-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sunflower_lover"
                  required
                  minLength={2}
                  className="sunflower-input w-full text-sm"
                  autoComplete="username"
                />
              </div>
              {error && needsRegister && <ErrorBox message={error} />}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNeedsRegister(false);
                    setError(null);
                  }}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-semibold border-2 transition-all duration-200 hover:opacity-80"
                  style={{
                    borderColor: "oklch(0.88 0.06 70)",
                    color: "oklch(0.6 0.08 68)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sunflower-btn-primary flex items-center justify-center gap-2"
                  style={{
                    background: loading
                      ? "oklch(0.82 0.08 72)"
                      : "oklch(0.72 0.155 68)",
                    color: "white",
                  }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Registering..." : "Register with Mobile"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    );
  }

  // ── Step: Verify OTP ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => {
          setStep("enterPhone");
          setOtp("");
          setDisplayOtp(null);
          setError(null);
        }}
        className="flex items-center gap-1 text-sm font-medium hover:opacity-75 transition-opacity self-start"
        style={{ color: "oklch(0.62 0.15 65)" }}
      >
        <ChevronLeft className="w-4 h-4" />
        Change Number
      </button>

      <p className="text-sm" style={{ color: "oklch(0.6 0.07 70)" }}>
        Sending OTP to{" "}
        <span className="font-semibold" style={{ color: "oklch(0.5 0.1 65)" }}>
          {mobile}
        </span>
      </p>

      {displayOtp && <OtpDisplayBox otp={displayOtp} />}

      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
        <div>
          <FieldLabel htmlFor="mobile-otp">Enter 6-digit OTP</FieldLabel>
          <input
            id="mobile-otp"
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            maxLength={6}
            required
            className="sunflower-input w-full text-sm tracking-widest text-center"
            autoComplete="one-time-code"
          />
        </div>

        {error && <ErrorBox message={error} />}

        <button
          type="submit"
          disabled={loading || otp.length < 6}
          className="sunflower-btn-primary w-full flex items-center justify-center gap-2 mt-1"
          style={{
            background:
              loading || otp.length < 6
                ? "oklch(0.82 0.08 72)"
                : "oklch(0.72 0.155 68)",
            color: "white",
          }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setStep("enterPhone");
          setOtp("");
          setDisplayOtp(null);
          setError(null);
        }}
        className="text-xs text-center hover:opacity-75 transition-opacity"
        style={{ color: "oklch(0.65 0.08 68)" }}
      >
        Didn't receive the OTP? Resend
      </button>
    </div>
  );
}

// ─── Main LoginScreen ────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { setSession } = useApp();
  const [tab, setTab] = useState<LoginTab>("email");

  const handleSuccess = (sessionId: string, profile: Profile3) => {
    setSession(sessionId, profile);
  };

  const handleTabChange = (t: LoginTab) => {
    setTab(t);
  };

  return (
    <div
      className="sunflower-page flex flex-col items-center justify-center px-4 py-8"
      style={{ minHeight: "100dvh" }}
    >
      {/* Background decoration */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25"
          style={{
            background:
              "radial-gradient(circle, oklch(0.92 0.12 85), transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.88 0.08 145), transparent 70%)",
          }}
        />
      </div>

      {/* Corner decorations */}
      <img
        src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
        alt=""
        aria-hidden="true"
        className="absolute top-4 right-4 opacity-35 animate-float"
        style={{ width: 28, height: 28 }}
      />
      <img
        src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
        alt=""
        aria-hidden="true"
        className="absolute bottom-4 left-4 opacity-25 animate-float"
        style={{ width: 24, height: 24, animationDelay: "1.2s" }}
      />

      {/* Card */}
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-card p-8 animate-fade-in-up relative"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}
      >
        {/* Sunflower icon */}
        <div className="flex justify-center mb-4">
          <img
            src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
            alt="Sunflower"
            className="animate-float"
            style={{ width: 80, height: 80, objectFit: "contain" }}
          />
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold text-center mb-1"
          style={{ color: "oklch(0.45 0.1 65)" }}
        >
          Welcome Back 🌻
        </h1>
        <p
          className="text-sm text-center mb-5"
          style={{ color: "oklch(0.65 0.07 75)" }}
        >
          Sign in to Sunflower Chat
        </p>

        {/* Tab pills */}
        <TabPills tab={tab} onChange={handleTabChange} />

        {/* Tab content */}
        {tab === "email" ? (
          <EmailLoginFlow onSuccess={handleSuccess} />
        ) : (
          <MobileLoginFlow onSuccess={handleSuccess} />
        )}
      </div>

      {/* Footer hint */}
      <p
        className="text-xs text-center mt-6 animate-fade-in delay-300"
        style={{ color: "oklch(0.7 0.05 70)" }}
      >
        🌻 Where conversations bloom
      </p>
    </div>
  );
}
