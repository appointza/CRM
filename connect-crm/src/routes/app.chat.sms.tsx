import { createFileRoute } from "@tanstack/react-router";
import { ChatChannelPage } from "@/components/ChatChannelPage";

export const Route = createFileRoute("/app/chat/sms")({
  component: () => <ChatChannelPage channel="sms" />,
});
