import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Дашборд", href: "/", icon: LayoutDashboard },
  { name: "Клиенты", href: "/clients", icon: Users },
  { name: "AI Поиск", href: "/ai-search", icon: Search },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-border safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {navigation.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));

          return (
            <Link key={item.name} href={item.href} className="flex-1">
              <span
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    isActive ? "text-primary scale-110" : "text-muted-foreground"
                  )}
                />
                <span className={cn(isActive ? "text-primary" : "text-muted-foreground")}>
                  {item.name}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
