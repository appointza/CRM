import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Users2, UserCheck, Megaphone, FileText, BarChart3,
  Wallet, Settings, UserCog, Sparkles, Building2, MessageCircle, Mail, MessageSquare,
  ChevronLeft, ChevronRight, UsersRound, Facebook, MapPin,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ChatMobileNavProvider, useChatMobileNav } from "@/context/ChatMobileNavContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Sales",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/leads", label: "Leads", icon: Users2, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/customers", label: "Customers", icon: UserCheck, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/groups", label: "Groups", icon: UsersRound, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/map", label: "Map", icon: MapPin, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/ai", label: "AI Assistant", icon: Sparkles, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/business-profile", label: "Business Profile", icon: Building2, roles: ["super_admin", "org_admin"] },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/app/campaigns", label: "Campaigns", icon: Megaphone, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/chat/whatsapp", label: "WhatsApp", icon: MessageCircle, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/chat/facebook", label: "Facebook", icon: Facebook, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/chat/email", label: "Email", icon: Mail, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/chat/sms", label: "SMS", icon: MessageSquare, roles: ["super_admin", "org_admin", "staff"] },
      { to: "/app/templates", label: "Templates", icon: FileText, roles: ["super_admin", "org_admin"] },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/app/reports", label: "Reports", icon: BarChart3, roles: ["super_admin", "org_admin", "staff"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/app/tenants", label: "Tenants", icon: Building2, roles: ["super_admin"] },
      { to: "/app/users", label: "Users", icon: UserCog, roles: ["super_admin", "org_admin"] },
      { to: "/app/billing", label: "Billing", icon: Wallet, roles: ["super_admin", "org_admin"] },
      { to: "/app/settings", label: "Settings", icon: Settings, roles: ["super_admin", "org_admin"] },
    ],
  },
];

function isNavActive(path: string, to: string) {
  return to === "/app" ? path === "/app" : path.startsWith(to);
}

function filterNavForRole(role: string) {
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  const flat = groups.flatMap((group) => group.items);
  return { groups, flat };
}

function SidebarNavLink({
  item,
  active,
  collapsed,
  tooltip,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  tooltip?: string;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      to={item.to}
      className={cn(
        "flex items-center rounded-lg py-2 text-sm transition-colors",
        collapsed ? "justify-center px-2" : "gap-3 px-3",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        {tooltip ?? item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, organization, hydrated } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  };

  if (!hydrated) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    if (typeof window !== "undefined") navigate({ to: "/login" });
    return null;
  }

  return (
    <ChatMobileNavProvider>
      <AppLayoutFrame
        path={path}
        user={user}
        organization={organization}
        collapsed={collapsed}
        toggleSidebar={toggleSidebar}
      >
        {children}
      </AppLayoutFrame>
    </ChatMobileNavProvider>
  );
}

function AppLayoutFrame({
  children,
  path,
  user,
  organization,
  collapsed,
  toggleSidebar,
}: {
  children: ReactNode;
  path: string;
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  organization: ReturnType<typeof useAuth>["organization"];
  collapsed: boolean;
  toggleSidebar: () => void;
}) {
  const { threadOpen, setThreadOpen } = useChatMobileNav();

  useEffect(() => {
    if (!path.startsWith("/app/chat/")) {
      setThreadOpen(false);
    }
  }, [path, setThreadOpen]);

  const { groups: visibleGroups, flat: visibleNav } = filterNavForRole(user.role);
  const isSettingsPage = path.startsWith("/app/settings");
  const isMapPage = path.startsWith("/app/map");
  const isMobileChatScreen = path.startsWith("/app/chat/");
  const hideMobileBottomNav = isMobileChatScreen && threadOpen;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--gradient-subtle)]">
      <TooltipProvider delayDuration={collapsed ? 0 : 300}>
        <aside
          className={cn(
            "hidden lg:flex shrink-0 flex-col border-r border-border bg-card/80 backdrop-blur transition-[width] duration-200 ease-in-out",
            collapsed ? "w-[4.5rem]" : "w-64",
          )}
        >
          <div
            className={cn(
              "flex h-16 shrink-0 items-center border-b border-border",
              collapsed ? "justify-center px-2" : "gap-2 px-5",
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">PulseCRM</TooltipContent>
              )}
            </Tooltip>
            {!collapsed && (
              <div className="min-w-0 leading-tight">
                <div className="text-sm font-semibold">PulseCRM</div>
                <div className="text-[11px] text-muted-foreground">Multi-channel SaaS</div>
              </div>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2">
            {visibleGroups.map((group, index) => (
              <div key={group.label} className={cn(index > 0 && (collapsed ? "mt-3" : "mt-5"))}>
                {collapsed ? (
                  index > 0 && <div className="mx-auto mb-2 h-px w-6 bg-border" />
                ) : (
                  <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((n) => (
                    <SidebarNavLink
                      key={n.to}
                      item={n}
                      active={isNavActive(path, n.to)}
                      collapsed={collapsed}
                      tooltip={collapsed ? `${group.label} · ${n.label}` : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-border p-2 space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size={collapsed ? "icon" : "sm"}
                  className={cn("w-full", !collapsed && "justify-start gap-2")}
                  onClick={toggleSidebar}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <>
                      <ChevronLeft className="h-4 w-4" />
                      Collapse
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">Expand sidebar</TooltipContent>
              )}
            </Tooltip>

            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center rounded-lg bg-muted/50 p-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <div className="font-medium">{organization?.name ?? "All Organizations"}</div>
                  <div className="text-primary-foreground/80">{user.role.replace("_", " ")}</div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 text-xs">
                  <div className="truncate font-medium">{organization?.name ?? "All Organizations"}</div>
                  <div className="text-muted-foreground">{user.role.replace("_", " ")}</div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </TooltipProvider>

      <div className="flex min-h-0 flex-1 flex-col min-w-0">
        {!isSettingsPage && !isMobileChatScreen && !isMapPage && (
        <header className="lg:hidden h-16 shrink-0 border-b border-border bg-card/70 backdrop-blur flex items-center px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold">PulseCRM</span>
          </div>
        </header>
        )}
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-4 lg:p-8",
            isMapPage && "overflow-hidden p-0 lg:p-0 max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
            !isMapPage &&
              (isMobileChatScreen
                ? threadOpen
                  ? "max-lg:overflow-hidden max-lg:p-0"
                  : "max-lg:overflow-hidden max-lg:p-0 max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
                : "max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"),
          )}
        >
          {children}
        </main>

        <nav
          className={cn(
            "lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/80 backdrop-blur",
            hideMobileBottomNav && "max-lg:hidden",
          )}
        >
          <div className="flex gap-1 overflow-x-auto overscroll-x-contain px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
            {visibleNav.map((n) => {
              const active = isNavActive(path, n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 min-w-[4.5rem] text-[11px] leading-none",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate max-w-[4.5rem]">{n.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
