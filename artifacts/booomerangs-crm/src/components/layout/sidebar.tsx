import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Search, Settings, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Дашборд", href: "/", icon: LayoutDashboard },
  { name: "Клиенты", href: "/clients", icon: Users },
  { name: "AI Поиск", href: "/ai-search", icon: Search },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar px-4 py-6">
      <div className="flex items-center gap-3 px-2 mb-8 text-primary">
        <Building2 className="h-8 w-8" />
        <span className="text-xl font-display font-bold tracking-tight">BOOOMERANGS</span>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));

          return (
            <Link key={item.name} href={item.href} onClick={onNavigate} className="group">
              <span
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-accent"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent"
                  )}
                />
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8">
        <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-accent cursor-not-allowed opacity-50">
          <Settings className="h-5 w-5" />
          Настройки
        </div>
      </div>
    </div>
  );
}
