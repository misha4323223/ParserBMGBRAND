import { AppLayout } from "@/components/layout/app-layout";
import { useGetClientsStats, useListClients } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Target, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useGetClientsStats();
  const { data: recentClients, isLoading: isLoadingClients } = useListClients({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Активный";
      case "prospect": return "Потенциальный";
      case "inactive": return "Неактивный";
      default: return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    if (status === "active") return "default";
    if (status === "prospect") return "secondary";
    return "destructive";
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 md:gap-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground">Сводка</h1>
          <p className="text-muted-foreground text-sm mt-1">Вот что происходит с базой клиентов.</p>
        </div>

        {/* Stats Cards */}
        {isLoadingStats ? (
          <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card border-border shadow-none rounded-sm animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-4 w-4 bg-muted rounded-full" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-7 w-12 bg-muted rounded mb-1" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Всего</CardTitle>
                <Users className="h-4 w-4 text-primary shrink-0" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl md:text-3xl font-display font-bold text-foreground">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">В базе данных</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Активные</CardTitle>
                <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl md:text-3xl font-display font-bold text-foreground">{stats.active}</div>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Заказывают регулярно</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Потенц.</CardTitle>
                <Target className="h-4 w-4 text-amber-500 shrink-0" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl md:text-3xl font-display font-bold text-foreground">{stats.prospect}</div>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">В воронке продаж</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none rounded-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-1 p-4">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Неактивные</CardTitle>
                <UserX className="h-4 w-4 text-destructive shrink-0" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl md:text-3xl font-display font-bold text-foreground">{stats.inactive}</div>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Нет заказов</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Bottom Section */}
        <div className="grid gap-4 md:gap-8 grid-cols-1 xl:grid-cols-3">
          {/* Recent Clients */}
          <Card className="xl:col-span-2 bg-card border-border shadow-none rounded-sm">
            <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
              <CardTitle className="font-display text-base md:text-lg">Недавние клиенты</CardTitle>
              <Link
                href="/clients"
                className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                Все <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {isLoadingClients ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-border/50 rounded-sm animate-pulse">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : recentClients?.length ? (
                <div className="flex flex-col gap-2">
                  {recentClients.slice(0, 5).map((client) => (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      className="group flex items-center justify-between p-3 border border-border bg-background/50 rounded-sm hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                          {client.companyName}
                        </span>
                        {client.city && (
                          <span className="text-xs text-muted-foreground">{client.city}</span>
                        )}
                      </div>
                      <Badge
                        variant={getStatusVariant(client.status)}
                        className="rounded-sm shrink-0 ml-2 text-xs"
                      >
                        {getStatusLabel(client.status)}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-10 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-sm">
                  Нет добавленных клиентов
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regional Stats */}
          <Card className="xl:col-span-1 bg-card border-border shadow-none rounded-sm">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="font-display text-base md:text-lg">По регионам</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {stats?.byRegion && stats.byRegion.length > 0 ? (
                <div className="space-y-3">
                  {stats.byRegion.map((region) => (
                    <div key={region.region} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate mr-2">{region.region || "Не указан"}</span>
                      <span className="text-sm text-muted-foreground shrink-0">{region.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">Недостаточно данных</div>
              )}

              {stats?.totalOrderVolume ? (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Общий объем заказов</div>
                  <div className="text-xl md:text-2xl font-display font-bold text-primary">
                    {formatCurrency(stats.totalOrderVolume)}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
