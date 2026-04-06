import { AppLayout } from "@/components/layout/app-layout";
import { useGetClientsStats, useListClients } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Target, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useGetClientsStats();
  const { data: recentClients, isLoading: isLoadingClients } = useListClients(
    {}, 
    { request: { headers: { "X-Limit": "5" } } } // Assuming standard limit header or sorting handled by backend if no explicit param
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 h-full">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Сводка</h1>
          <p className="text-muted-foreground mt-2">Доброе утро. Вот что происходит с базой клиентов.</p>
        </div>

        {isLoadingStats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card border-border shadow-none rounded-sm animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="h-4 w-24 bg-muted rounded"></div>
                  <div className="h-4 w-4 bg-muted rounded-full"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-muted rounded mb-2"></div>
                  <div className="h-3 w-32 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card border-border shadow-none rounded-sm hover-elevate transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Всего клиентов</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-foreground">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">В базе данных</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none rounded-sm hover-elevate transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Активные</CardTitle>
                <UserCheck className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-foreground">{stats.active}</div>
                <p className="text-xs text-muted-foreground mt-1">Делают заказы регулярно</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none rounded-sm hover-elevate transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Потенциальные</CardTitle>
                <Target className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-foreground">{stats.prospect}</div>
                <p className="text-xs text-muted-foreground mt-1">В воронке продаж</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-none rounded-sm hover-elevate transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Неактивные</CardTitle>
                <UserX className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-display font-bold text-foreground">{stats.inactive}</div>
                <p className="text-xs text-muted-foreground mt-1">Давно не было заказов</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="grid gap-8 grid-cols-1 xl:grid-cols-3 flex-1 pb-10">
          <Card className="col-span-1 xl:col-span-2 bg-card border-border shadow-none rounded-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Недавние клиенты</CardTitle>
              <Link href="/clients" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Все клиенты <ArrowRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="flex-1">
              {isLoadingClients ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-border/50 rounded-sm animate-pulse">
                      <div className="h-5 w-32 bg-muted rounded"></div>
                      <div className="h-5 w-16 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : recentClients?.length ? (
                <div className="flex flex-col gap-2">
                  {recentClients.slice(0, 5).map((client) => (
                    <Link key={client.id} href={`/clients/${client.id}`} className="group flex items-center justify-between p-4 border border-border bg-background/50 rounded-sm hover:border-primary/50 hover:bg-primary/5 transition-all">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium group-hover:text-primary transition-colors">{client.companyName}</span>
                        {client.city && <span className="text-xs text-muted-foreground">{client.city}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={client.status === 'active' ? 'default' : client.status === 'prospect' ? 'secondary' : 'destructive'} className="rounded-xs">
                          {client.status === 'active' ? 'Активный' : client.status === 'prospect' ? 'Потенциальный' : 'Неактивный'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-[200px] flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-sm">
                  Нет добавленных клиентов
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 bg-card border-border shadow-none rounded-sm">
            <CardHeader>
              <CardTitle className="font-display">Статистика по регионам</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.byRegion && stats.byRegion.length > 0 ? (
                <div className="space-y-4">
                  {stats.byRegion.map((region) => (
                    <div key={region.region} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{region.region || 'Не указан'}</span>
                      <span className="text-sm text-muted-foreground">{region.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">Недостаточно данных</div>
              )}
              
              {stats?.totalOrderVolume && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="text-sm font-medium text-muted-foreground mb-1">Общий объем заказов</div>
                  <div className="text-2xl font-display font-bold text-primary">{formatCurrency(stats.totalOrderVolume)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
