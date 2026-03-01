import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ConversationView, Profile, SessionId } from "../backend.d";

export type AppScreen = "splash" | "login" | "chatList" | "chat";

interface AppState {
  screen: AppScreen;
  sessionId: SessionId | null;
  profile: Profile | null;
  activeConversationId: string | null;
  activeConversationName: string | null;
}

interface AppContextValue extends AppState {
  navigate: (screen: AppScreen) => void;
  setSession: (sessionId: SessionId, profile: Profile) => void;
  clearSession: () => void;
  openConversation: (conversationId: string, participantName: string) => void;
  backToList: () => void;
  updateActiveConversation: (
    conversationId: string,
    participantName: string,
  ) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const SESSION_KEY = "sunflower_session";
const PROFILE_KEY = "sunflower_profile";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    const savedProfile = localStorage.getItem(PROFILE_KEY);

    if (savedSession && savedProfile) {
      try {
        return {
          screen: "chatList",
          sessionId: savedSession,
          profile: JSON.parse(savedProfile) as Profile,
          activeConversationId: null,
          activeConversationName: null,
        };
      } catch {
        // fall through
      }
    }

    return {
      screen: "splash",
      sessionId: null,
      profile: null,
      activeConversationId: null,
      activeConversationName: null,
    };
  });

  const navigate = useCallback((screen: AppScreen) => {
    setState((prev) => ({ ...prev, screen }));
  }, []);

  const setSession = useCallback((sessionId: SessionId, profile: Profile) => {
    localStorage.setItem(SESSION_KEY, sessionId);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setState((prev) => ({ ...prev, sessionId, profile, screen: "chatList" }));
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PROFILE_KEY);
    setState({
      screen: "login",
      sessionId: null,
      profile: null,
      activeConversationId: null,
      activeConversationName: null,
    });
  }, []);

  const openConversation = useCallback(
    (conversationId: string, participantName: string) => {
      setState((prev) => ({
        ...prev,
        activeConversationId: conversationId,
        activeConversationName: participantName,
        screen: "chat",
      }));
    },
    [],
  );

  const backToList = useCallback(() => {
    setState((prev) => ({
      ...prev,
      screen: "chatList",
      activeConversationId: null,
      activeConversationName: null,
    }));
  }, []);

  const updateActiveConversation = useCallback(
    (conversationId: string, participantName: string) => {
      setState((prev) => ({
        ...prev,
        activeConversationId: conversationId,
        activeConversationName: participantName,
      }));
    },
    [],
  );

  return (
    <AppContext.Provider
      value={{
        ...state,
        navigate,
        setSession,
        clearSession,
        openConversation,
        backToList,
        updateActiveConversation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
