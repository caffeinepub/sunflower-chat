import { useCallback, useEffect, useState } from "react";

// ─── PIN Storage helpers ──────────────────────────────────────────────────────
const PIN_KEY = "sf_app_pin";
const LOCK_KEY = "sf_app_lock_enabled";

export function getStoredPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

export function setStoredPin(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
  localStorage.setItem(LOCK_KEY, "true");
}

export function removeStoredPin(): void {
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(LOCK_KEY);
}

export function isAppLockEnabled(): boolean {
  return localStorage.getItem(LOCK_KEY) === "true";
}

// ─── PIN Numpad ───────────────────────────────────────────────────────────────
interface PinNumpadProps {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  large?: boolean;
}

const NUMPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
] as const;

function PinNumpad({ onDigit, onBackspace, large = false }: PinNumpadProps) {
  const size = large
    ? "w-[72px] h-[72px] text-2xl gap-3"
    : "w-16 h-16 text-xl gap-2";

  return (
    <div className="flex flex-col gap-2">
      {NUMPAD_ROWS.map((row) => (
        <div
          key={row.join("-")}
          className={`flex justify-center ${size.includes("gap-3") ? "gap-3" : "gap-2"}`}
        >
          {row.map((cell) => (
            <button
              key={
                cell === ""
                  ? "empty"
                  : cell === "⌫"
                    ? "backspace"
                    : `digit-${cell}`
              }
              type="button"
              onClick={() => {
                if (cell === "⌫") onBackspace();
                else if (cell !== "") onDigit(cell);
              }}
              disabled={cell === ""}
              className={`${large ? "w-[72px] h-[72px] text-2xl" : "w-16 h-16 text-xl"} rounded-2xl font-bold transition-all duration-150 active:scale-90 disabled:opacity-0`}
              style={{
                background:
                  cell === "⌫"
                    ? large
                      ? "oklch(0.9 0.04 80)"
                      : "oklch(0.94 0.03 80)"
                    : cell === ""
                      ? "transparent"
                      : large
                        ? "white"
                        : "oklch(0.97 0.04 90)",
                color:
                  cell === "⌫" ? "oklch(0.55 0.06 65)" : "oklch(0.38 0.1 65)",
                boxShadow:
                  cell && cell !== "⌫" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                border: "1.5px solid oklch(0.92 0.04 88)",
              }}
              aria-label={
                cell === "⌫"
                  ? "Backspace"
                  : cell === ""
                    ? undefined
                    : `Digit ${cell}`
              }
            >
              {cell}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── PIN Dots indicator ───────────────────────────────────────────────────────
function PinDots({
  length,
  size = "sm",
}: { length: number; size?: "sm" | "lg" }) {
  const dotSize = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <div className="flex justify-center gap-3 mb-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`${dotSize} rounded-full transition-all duration-200`}
          style={{
            background:
              i < length ? "oklch(0.72 0.155 68)" : "oklch(0.9 0.04 85)",
            transform: i < length ? "scale(1.2)" : "scale(1)",
            boxShadow:
              i < length ? "0 2px 8px oklch(0.72 0.155 68 / 0.4)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── PIN Set Prompt ───────────────────────────────────────────────────────────
interface PinSetPromptProps {
  onSet: () => void;
  onClose: () => void;
}

export function PinSetPrompt({ onSet, onClose }: PinSetPromptProps) {
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const displayPin = step === "enter" ? pin1 : pin2;

  function handleDigit(d: string) {
    setErrorMsg(null);
    if (step === "enter") {
      const next = (pin1 + d).slice(0, 4);
      setPin1(next);
      if (next.length === 4) {
        setStep("confirm");
      }
    } else {
      const next = (pin2 + d).slice(0, 4);
      setPin2(next);
      if (next.length === 4) {
        if (next === pin1) {
          setStoredPin(next);
          onSet();
        } else {
          setErrorMsg("PINs don't match. Try again.");
          setPin1("");
          setPin2("");
          setStep("enter");
        }
      }
    }
  }

  function handleBackspace() {
    setErrorMsg(null);
    if (step === "enter") {
      setPin1((p) => p.slice(0, -1));
    } else {
      setPin2((p) => p.slice(0, -1));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="w-full max-w-[320px] rounded-3xl p-8 text-center animate-scale-in"
        style={{
          background: "white",
          boxShadow: "0 20px 80px rgba(0,0,0,0.2)",
        }}
      >
        <div className="text-5xl mb-4">🔒</div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: "oklch(0.38 0.1 65)" }}
        >
          {step === "enter" ? "Set App PIN" : "Confirm PIN"}
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.62 0.05 68)" }}>
          {step === "enter"
            ? "Choose a 4-digit PIN"
            : "Enter PIN again to confirm"}
        </p>

        <PinDots length={displayPin.length} />

        {errorMsg && (
          <p
            className="text-sm mb-4 font-semibold"
            style={{ color: "oklch(0.5 0.18 25)" }}
          >
            {errorMsg}
          </p>
        )}

        <PinNumpad onDigit={handleDigit} onBackspace={handleBackspace} />
      </div>
    </div>
  );
}

// ─── App Lock Screen ──────────────────────────────────────────────────────────
interface AppLockScreenProps {
  onUnlock: () => void;
}

export default function AppLockScreen({ onUnlock }: AppLockScreenProps) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const storedPin = getStoredPin();

  const handleDigit = useCallback(
    (d: string) => {
      setPin((prev) => {
        const next = (prev + d).slice(0, 4);
        if (next.length === 4) {
          if (next === storedPin) {
            setTimeout(() => onUnlock(), 50);
          } else {
            setShake(true);
            setAttempts((a) => a + 1);
            setTimeout(() => {
              setShake(false);
              setPin("");
            }, 600);
          }
        }
        return next;
      });
    },
    [storedPin, onUnlock],
  );

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  // Keyboard support
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      if (e.key === "Backspace") handleBackspace();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleDigit, handleBackspace]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.97 0.055 88), oklch(0.93 0.09 82))",
      }}
    >
      {/* Background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, oklch(0.98 0.1 85 / 0.6), transparent 60%)",
        }}
      />
      <span
        className="absolute top-8 left-8 text-4xl opacity-20 animate-float select-none"
        aria-hidden="true"
      >
        🌻
      </span>
      <span
        className="absolute top-12 right-12 text-3xl opacity-15 animate-float select-none"
        style={{ animationDelay: "1s" }}
        aria-hidden="true"
      >
        🌻
      </span>
      <span
        className="absolute bottom-24 left-12 text-2xl opacity-10 animate-float select-none"
        style={{ animationDelay: "0.5s" }}
        aria-hidden="true"
      >
        🌻
      </span>
      <span
        className="absolute bottom-16 right-8 text-3xl opacity-15 animate-float select-none"
        style={{ animationDelay: "1.5s" }}
        aria-hidden="true"
      >
        🌻
      </span>

      <div
        className="w-full max-w-[320px] mx-4 text-center relative"
        style={{
          animation: shake ? "lockShake 0.5s ease-in-out" : "none",
        }}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
          style={{
            background: "white",
            boxShadow: "0 8px 32px oklch(0.72 0.155 68 / 0.25)",
          }}
        >
          <span className="text-4xl">🌻</span>
        </div>

        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "oklch(0.35 0.1 65)" }}
        >
          Sunflower Chat
        </h1>
        <p className="text-sm mb-8" style={{ color: "oklch(0.58 0.06 68)" }}>
          🔒 Enter your PIN to unlock
        </p>

        <PinDots length={pin.length} size="lg" />

        {/* Wrong PIN message */}
        {attempts > 0 && pin.length === 0 && (
          <p
            className="text-sm font-semibold mb-4 animate-fade-in"
            style={{ color: "oklch(0.5 0.18 25)" }}
          >
            ❌ Incorrect PIN
            {attempts > 2 ? ` (${attempts} attempts)` : ""}
          </p>
        )}

        {/* Numpad */}
        <PinNumpad onDigit={handleDigit} onBackspace={handleBackspace} large />
      </div>

      <style>{`
        @keyframes lockShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-12px); }
          30% { transform: translateX(12px); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
