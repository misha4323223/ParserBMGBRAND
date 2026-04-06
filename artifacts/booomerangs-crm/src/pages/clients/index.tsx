import { AppLayout } from "@/components/layout/app-layout";
import { useListClients } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [, setLocation] = useLocation();

  const { data: clients, isLoading } = useListClients({
    search: debouncedSearch || undefined,
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'prospect': return 'Потенциальный';
      case 'inactive': return 'Неактивный';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'prospect': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'inactive': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Клиенты</h1>
            <p className="text-muted-foreground mt-1">Управление оптовыми покупателями и партнерами.</p>
          </div>
          
          <Button onClick={() => setLocation("/clients/new")} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Добавить клиента
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-card border border-border rounded-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, городу, контакту..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full bg-background border-border focus-visible:ring-primary"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto shrink-0 gap-2 border-border text-foreground hover:bg-accent/10 hover:text-accent">
            <Filter className="h-4 w-4" />
            Фильтры
          </Button>
        </div>

        <div className="border border-border rounded-sm bg-card overflow-hidden flex-1 flex flex-col">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-background/50 sticky top-0 z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-medium text-muted-foreground w-[250px]">Компания</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Статус</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Локация</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Контакт</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Категория</TableHead>
                  <TableHead className="font-medium text-muted-foreground text-right">Посл. заказ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell><div className="h-5 w-32 bg-muted animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-5 w-28 bg-muted animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : clients?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
                        <Badge variant="outline" className={cn("rounded-sm border font-normal", getStatusColor(client.status))}>
                          {getStatusLabel(client.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.city ? `${client.city}${client.region ? `, ${client.region}` : ''}` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{client.contactName || '—'}</span>
                          {client.phone && <span className="text-xs">{client.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.category ? (
                          <Badge variant="outline" className="rounded-sm border-border text-xs font-normal">
                            {client.category}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {client.lastOrderDate ? new Date(client.lastOrderDate).toLocaleDateString('ru-RU') : '—'}
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

// Need a simple debounce hook
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
