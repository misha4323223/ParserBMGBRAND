import { AppLayout } from "@/components/layout/app-layout";
import { useListClients } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, MapPin, Phone, Download, Calendar } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [, setLocation] = useLocation();
  const { data: clients, isLoading } = useListClients({
    search: debouncedSearch || undefined,
  });

  const handleExport = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = `${base}/api/clients/export${params.toString() ? `?${params}` : ""}`;
    window.open(url, "_blank");
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Активный";
      case "prospect": return "Потенциальный";
      case "inactive": return "Неактивный";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "prospect": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "inactive": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground">Клиенты</h1>
            <p className="text-muted-foreground text-sm mt-0.5 hidden sm:block">Управление оптовыми покупателями и партнерами.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleExport}
              className="gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Экспорт Excel</span>
            </Button>
            <Button onClick={() => setLocation("/clients/new")} className="gap-2 text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Добавить клиента</span>
              <span className="sm:hidden">Добавить</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, городу, контакту..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full bg-card border-border focus-visible:ring-primary"
          />
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden flex flex-col gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 bg-card border border-border rounded-lg animate-pulse">
                <div className="h-5 w-40 bg-muted rounded mb-2" />
                <div className="h-4 w-24 bg-muted rounded mb-3" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
            ))
          ) : clients?.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Ничего не найдено</p>
            </div>
          ) : (
            clients?.map((client) => (
              <div
                key={client.id}
                className="p-4 bg-card border border-border rounded-lg cursor-pointer active:opacity-80 transition-opacity"
                onClick={() => setLocation(`/clients/${client.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-foreground leading-tight">{client.companyName}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {client.manager && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-sm border text-xs font-normal",
                          client.manager === "Менеджер 1"
                            ? "border-violet-400/40 text-violet-400"
                            : "border-amber-400/40 text-amber-400"
                        )}
                      >
                        {client.manager}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn("rounded-sm border text-xs font-normal", getStatusColor(client.status))}
                    >
                      {getStatusLabel(client.status)}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {(client.city || client.region) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{[client.city, client.region].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.lastContactDate && (
                    <div className="flex items-center gap-1.5 text-primary/80">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Контакт: {new Date(client.lastContactDate).toLocaleDateString("ru-RU")}</span>
                    </div>
                  )}
                  {client.category && (
                    <Badge variant="outline" className="w-fit rounded-sm border-border text-xs font-normal mt-1">
                      {client.category}
                    </Badge>
                  )}
                  {client.lastOrderDate && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                      <span className="text-xs text-primary/80 font-medium">
                        Контакт: {new Date(client.lastOrderDate).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block border border-border rounded-sm bg-card overflow-hidden">
          <div className="overflow-auto">
            <Table>
              <TableHeader className="bg-background/50 sticky top-0 z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-medium text-muted-foreground w-[250px]">Компания</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Статус</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Менеджер</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Локация</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Контакт</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Категория</TableHead>
                  <TableHead className="font-medium text-muted-foreground text-right">Дата контакта</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell><div className="h-5 w-32 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-28 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : clients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Ничего не найдено. Попробуйте изменить параметры поиска.
                    </TableCell>
                  </TableRow>
                ) : (
                  clients?.map((client) => (
                    <TableRow
                      key={client.id}
                      className="border-border hover:bg-background/50 cursor-pointer transition-colors group"
                      onClick={() => setLocation(`/clients/${client.id}`)}
                    >
                      <TableCell className="font-medium group-hover:text-primary transition-colors">
                        {client.companyName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("rounded-sm border font-normal", getStatusColor(client.status))}
                        >
                          {getStatusLabel(client.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.manager ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-sm border font-normal text-xs",
                              client.manager === "Менеджер 1"
                                ? "border-violet-400/40 text-violet-400"
                                : "border-amber-400/40 text-amber-400"
                            )}
                          >
                            {client.manager}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.city ? `${client.city}${client.region ? `, ${client.region}` : ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{client.contactName || "—"}</span>
                          {client.phone && <span className="text-xs">{client.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.category ? (
                          <Badge variant="outline" className="rounded-sm border-border text-xs font-normal">
                            {client.category}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {client.lastOrderDate
                          ? new Date(client.lastOrderDate).toLocaleDateString("ru-RU")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
