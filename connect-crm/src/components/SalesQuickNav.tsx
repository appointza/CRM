import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users2,
  UserCheck,
  UsersRound,
  MapPin,
} from "lucide-react";

const LINKS = [
  { id: "dashboard" as const, to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads" as const, to: "/app/leads", label: "Leads", icon: Users2 },
  { id: "customers" as const, to: "/app/customers", label: "Customers", icon: UserCheck },
  { id: "groups" as const, to: "/app/groups", label: "Groups", icon: UsersRound },
  { id: "map" as const, to: "/app/map", label: "Map", icon: MapPin },
];

type ActiveId = (typeof LINKS)[number]["id"];

export function SalesQuickNav({ active, className }: { active?: ActiveId; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1", className)}>
      {LINKS.map(({ id, to, label, icon: Icon }) =>
        id === active ? (
          <Button key={id} variant="secondary" size="sm" className="h-8 gap-1.5 pointer-events-none">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Button>
        ) : (
          <Button key={id} variant="ghost" size="sm" className="h-8 gap-1.5" asChild>
            <Link to={to}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          </Button>
        ),
      )}
    </div>
  );
}
