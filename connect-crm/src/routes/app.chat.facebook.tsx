import { createFileRoute } from "@tanstack/react-router";
import { ChatChannelPage } from "@/components/ChatChannelPage";

export const Route = createFileRoute("/app/chat/facebook")({
  component: () => <ChatChannelPage channel="facebook" />,
});
