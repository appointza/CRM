import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  return (
    <AuthProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </AuthProvider>
  );
}
