import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "./context/AppContext";
import ChatListScreen from "./screens/ChatListScreen";
import ChatScreen from "./screens/ChatScreen";
import LoginScreen from "./screens/LoginScreen";
import SplashScreen from "./screens/SplashScreen";

function AppContent() {
  const { screen } = useApp();

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
