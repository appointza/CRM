import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/chat")({
  beforeLoad: ({ location }) => {
    if (
      location.pathname === "/app/chat" ||
      location.pathname === "/app/chat/"
    ) {
      throw redirect({ to: "/app/chat/whatsapp" });
    }
  },
  component: () => <Outlet />,
});
