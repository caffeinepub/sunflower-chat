import { Toaster } from "@/components/ui/sonner";
import { useEffect, useRef, useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import AppLockScreen, { isAppLockEnabled } from "./screens/AppLockScreen";
import ChatListScreen from "./screens/ChatListScreen";
import ChatScreen from "./screens/ChatScreen";
import LoginScreen from "./screens/LoginScreen";
import SplashScreen from "./screens/SplashScreen";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms

function AppContent() {
  const { screen } = useApp();
  const [isLocked, setIsLocked] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track activity and lock after IDLE_TIMEOUT
  useEffect(() => {
    // Only apply lock when user is logged in
    if (screen !== "chatList" && screen !== "chat") {
      setIsLocked(false);
      return;
    }

    // Check if lock is enabled
    if (!isAppLockEnabled()) {
      setIsLocked(false);
      return;
    }

    function resetTimer() {
      lastActivityRef.current = Date.now();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        if (isAppLockEnabled()) {
          setIsLocked(true);
        }
      }, IDLE_TIMEOUT);
    }

    const events = ["mousedown", "touchstart", "keydown", "scroll", "click"];
    for (const evt of events) {
      window.addEventListener(evt, resetTimer, { passive: true });
    }
    resetTimer();

    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, resetTimer);
      }
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [screen]);

  if (isLocked && (screen === "chatList" || screen === "chat")) {
    return <AppLockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <>
      {screen === "splash" && <SplashScreen />}
      {screen === "login" && <LoginScreen />}
      {screen === "chatList" && <ChatListScreen />}
      {screen === "chat" && <ChatScreen />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster position="top-center" />
    </AppProvider>
  );
}
