import { createFileRoute } from "@tanstack/react-router";
import { ChatChannelPage } from "@/components/ChatChannelPage";

export const Route = createFileRoute("/app/chat/email")({
  component: () => <ChatChannelPage channel="email" />,
});
