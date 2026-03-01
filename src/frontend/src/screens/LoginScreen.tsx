import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { Profile } from "../backend.d";
import { useApp } from "../context/AppContext";
import { useActor } from "../hooks/useActor";

type Mode = "login" | "register";

export default function LoginScreen() {
  const { actor } = useActor();
  const { setSession } = useApp();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;

    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        await actor.register(username.trim(), email.trim(), password);
      }

      const sessionId = await actor.login(email.trim(), password);

      // Seed sample data for a richer first experience
      try {
        await actor.seedSampleData();
      } catch {
        // Not critical
      }

      const profile = await actor.getProfile(sessionId);
      setSession(sessionId, profile);
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
          {mode === "login" ? "Welcome Back 🌻" : "Join Sunflower Chat 🌻"}
        </h1>
        <p
          className="text-sm text-center mb-6"
          style={{ color: "oklch(0.65 0.07 75)" }}
        >
          {mode === "login"
            ? "Good to see you again!"
            : "Start your sunny journey"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold mb-1"
                style={{ color: "oklch(0.5 0.08 65)" }}
              >
                Username
              </label>
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
            <label
              htmlFor="email"
              className="block text-sm font-semibold mb-1"
              style={{ color: "oklch(0.5 0.08 65)" }}
            >
              Email
            </label>
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
            <label
              htmlFor="password"
              className="block text-sm font-semibold mb-1"
              style={{ color: "oklch(0.5 0.08 65)" }}
            >
              Password
            </label>
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
          </div>

          {/* Error message */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                background: "oklch(0.96 0.025 30)",
                color: "oklch(0.5 0.15 25)",
                border: "1px solid oklch(0.88 0.06 30)",
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Submit button */}
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

        {/* Toggle */}
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
