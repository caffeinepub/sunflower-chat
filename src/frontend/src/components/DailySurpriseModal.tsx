import { useEffect, useState } from "react";

const QUOTES = [
  "Every day is a fresh start 🌻",
  "You are sunshine in someone's day",
  "Grow where you are planted",
  "Bloom at your own pace 🌿",
  "Be like a sunflower — always face the light",
  "Small steps lead to big changes 🌻",
  "Your kindness is your superpower",
  "Today is going to be a beautiful day",
];

interface DailySurpriseModalProps {
  onClose: () => void;
}

export default function DailySurpriseModal({
  onClose,
}: DailySurpriseModalProps) {
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  function handleCollect() {
    setVisible(false);
    setTimeout(onClose, 350);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-8 text-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.985 0.06 92), oklch(0.96 0.09 85))",
          boxShadow: "0 20px 80px rgba(245,158,11,0.3)",
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.85) translateY(20px)",
          transition: "transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 70% 20%, oklch(0.95 0.12 85 / 0.5), transparent 60%)",
          }}
        />

        {/* Corner sunflowers */}
        <span
          className="absolute top-3 left-3 text-2xl opacity-30"
          aria-hidden="true"
          style={{ animation: "floatBounce 3s ease-in-out infinite" }}
        >
          🌻
        </span>
        <span
          className="absolute top-3 right-3 text-2xl opacity-30"
          aria-hidden="true"
          style={{
            animation: "floatBounce 3s ease-in-out infinite",
            animationDelay: "1s",
          }}
        >
          🌻
        </span>
        <span
          className="absolute bottom-16 left-3 text-xl opacity-20"
          aria-hidden="true"
          style={{
            animation: "floatBounce 3s ease-in-out infinite",
            animationDelay: "0.5s",
          }}
        >
          🌻
        </span>

        {/* Giant spinning sunflower */}
        <div
          className="text-7xl mb-4 relative z-10"
          style={{
            animation: "sunflowerSpin 4s linear infinite",
            display: "inline-block",
            filter: "drop-shadow(0 4px 16px rgba(245,158,11,0.4))",
          }}
        >
          🌻
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold mb-1 relative z-10"
          style={{ color: "oklch(0.38 0.1 65)" }}
        >
          Daily Surprise! 🎁
        </h2>
        <p
          className="text-sm mb-5 relative z-10"
          style={{ color: "oklch(0.55 0.08 68)" }}
        >
          Your daily dose of sunshine ☀️
        </p>

        {/* Quote card */}
        <div
          className="rounded-2xl px-5 py-4 mb-6 relative z-10"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: "1.5px solid oklch(0.88 0.1 85)",
          }}
        >
          <p
            className="text-base font-semibold leading-relaxed"
            style={{ color: "oklch(0.38 0.08 65)" }}
          >
            "{quote}"
          </p>
        </div>

        {/* Virtual gift */}
        <div
          className="flex items-center justify-center gap-3 mb-6 relative z-10"
          style={{
            background: "rgba(255,255,255,0.5)",
            borderRadius: "16px",
            padding: "10px 16px",
          }}
        >
          <span
            className="text-2xl"
            style={{ animation: "floatBounce 2s ease-in-out infinite" }}
          >
            🌟
          </span>
          <span
            style={{
              color: "oklch(0.48 0.1 68)",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            +1 Virtual Sunflower Gift
          </span>
          <span
            className="text-2xl"
            style={{
              animation: "floatBounce 2s ease-in-out infinite",
              animationDelay: "0.3s",
            }}
          >
            🌟
          </span>
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={handleCollect}
          className="w-full py-3.5 rounded-2xl font-bold text-base relative z-10 transition-all duration-200 active:scale-95 hover:opacity-90"
          style={{
            background: "oklch(0.72 0.155 68)",
            color: "white",
            boxShadow: "0 6px 24px oklch(0.72 0.155 68 / 0.4)",
          }}
        >
          Collect your gift 🌻
        </button>
      </div>

      <style>{`
        @keyframes sunflowerSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(15deg) scale(1.1); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-15deg) scale(1.1); }
          100% { transform: rotate(0deg) scale(1); }
        }
      `}</style>
    </div>
  );
}
