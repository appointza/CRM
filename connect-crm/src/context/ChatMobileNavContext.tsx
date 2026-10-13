import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type ChatMobileNavContextValue = {
  threadOpen: boolean;
  setThreadOpen: (open: boolean) => void;
};

const ChatMobileNavContext = createContext<ChatMobileNavContextValue | null>(null);

export function ChatMobileNavProvider({ children }: { children: ReactNode }) {
  const [threadOpen, setThreadOpen] = useState(false);
  const value = useMemo(
    () => ({ threadOpen, setThreadOpen }),
    [threadOpen],
  );
  return (
    <ChatMobileNavContext.Provider value={value}>
      {children}
    </ChatMobileNavContext.Provider>
  );
}

export function useChatMobileNav() {
  const ctx = useContext(ChatMobileNavContext);
  if (!ctx) {
    throw new Error("useChatMobileNav must be used within ChatMobileNavProvider");
  }
  return ctx;
}
