import { useEffect } from "react";
import { useApp } from "../context/AppContext";

export default function SplashScreen() {
  const { navigate } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("login");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="sunflower-page flex flex-col items-center justify-center relative overflow-hidden"
      style={{ minHeight: "100dvh" }}
    >
      {/* Background decorative blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, oklch(0.92 0.1 85), transparent 70%)",
            transform: "translate(-30%, -30%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.88 0.08 142), transparent 70%)",
            transform: "translate(30%, 30%)",
          }}
        />
      </div>

      {/* Corner sunflower decorations */}
      <img
        src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
        alt=""
        aria-hidden="true"
        className="absolute top-4 left-4 opacity-40 animate-float"
        style={{ width: 32, height: 32, animationDelay: "0s" }}
      />
      <img
        src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
        alt=""
        aria-hidden="true"
        className="absolute bottom-6 right-6 opacity-30 animate-float"
        style={{ width: 28, height: 28, animationDelay: "1s" }}
      />
      <img
        src="/assets/generated/sunflower-icon-transparent.dim_120x120.png"
        alt=""
        aria-hidden="true"
        className="absolute top-1/4 right-6 opacity-20 animate-float"
        style={{ width: 20, height: 20, animationDelay: "1.5s" }}
      />

      {/* Main content */}
      <div className="flex flex-col items-center gap-6 px-8 text-center">
        {/* Sunflower illustration */}
        <div className="animate-scale-in">
          <img
            src="/assets/generated/sunflower-hero-transparent.dim_400x400.png"
            alt="Sunflower illustration"
            className="animate-float"
            style={{
              width: 200,
              height: 200,
              objectFit: "contain",
              filter: "drop-shadow(0 12px 32px rgba(255,179,0,0.25))",
            }}
          />
        </div>

        {/* App name */}
        <div className="animate-fade-in-up delay-200">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: "oklch(0.45 0.1 65)" }}
          >
            Sunflower Chat
          </h1>
          <p
            className="text-base mt-2 font-medium"
            style={{ color: "oklch(0.65 0.07 75)" }}
          >
            Where conversations bloom
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-2 mt-4 animate-fade-in delay-400">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: "oklch(0.72 0.155 68)",
                animation: `floatBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
