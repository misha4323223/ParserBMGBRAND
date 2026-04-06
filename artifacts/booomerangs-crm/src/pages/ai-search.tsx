import { AppLayout } from "@/components/layout/app-layout";
import { useAiSearchClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Sparkles, Loader2, Users, MapPin, Building2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function AiSearchPage() {
  const [query, setQuery] = useState("");
  const searchClients = useAiSearchClients();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    searchClients.mutate({ data: { query } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'prospect': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'inactive': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'prospect': return 'Потенциальный';
      case 'inactive': return 'Неактивный';
      default: return status;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 h-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center text-center mt-8 mb-4">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
            AI Поиск Клиентов
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Задайте вопрос естественным языком. Например: "Покажи активных клиентов из Москвы" или "Кто давно ничего не заказывал на юге?"
          </p>
        </div>

        <Card className="bg-card border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.05)] rounded-lg overflow-hidden">
          <CardContent className="p-2">
            <form onSubmit={handleSearch} className="relative">
              <Textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Что вы хотите найти?..."
                className="min-h-[100px] w-full resize-none border-0 bg-transparent py-4 pl-4 pr-32 text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch(e);
                  }
                }}
              />
              <div className="absolute right-4 bottom-4">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={!query.trim() || searchClients.isPending}
                  className="rounded-full shadow-md font-medium"
                >
                  {searchClients.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" />
                      Поиск
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {searchClients.isSuccess && searchClients.data && (
          <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 bg-accent/5 border border-accent/20 rounded-lg flex gap-4">
              <Sparkles className="h-6 w-6 text-accent shrink-0 mt-1" />
              <div className="space-y-1">
                <h3 className="font-display font-semibold text-accent">Анализ запроса</h3>
                <p className="text-foreground/90 leading-relaxed text-sm md:text-base">
                  {searchClients.data.explanation}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                Результаты ({searchClients.data.clients.length})
              </h3>
              
              {searchClients.data.clients.length === 0 ? (
                <div className="p-12 border border-dashed border-border rounded-lg text-center text-muted-foreground flex flex-col items-center justify-center bg-card/50">
                  <Search className="h-10 w-10 mb-4 opacity-20" />
                  <p>По вашему запросу ничего не найдено.</p>
                  <p className="text-sm mt-2 opacity-70">Попробуйте сформулировать иначе.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {searchClients.data.clients.map((client) => (
                    <Link key={client.id} href={`/clients/${client.id}`}>
                      <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer h-full group shadow-none rounded-sm hover-elevate">
                        <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold font-display text-lg group-hover:text-primary transition-colors line-clamp-2">
                                {client.companyName}
                              </h4>
                              <Badge variant="outline" className={`rounded-sm shrink-0 font-medium px-2 py-0.5 border ${getStatusColor(client.status)}`}>
                                {getStatusLabel(client.status)}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-muted-foreground flex flex-col gap-1.5">
                              {client.city && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{client.city}{client.region ? `, ${client.region}` : ''}</span>
                                </div>
                              )}
                              {client.category && (
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3.5 w-3.5" />
                                  <span>{client.category}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {client.orderVolume ? (
                            <div className="pt-3 border-t border-border/50 text-sm font-medium text-foreground">
                              Объем: {new Intl.NumberFormat("ru-RU", {
                                style: "currency",
                                currency: "RUB",
                                maximumFractionDigits: 0,
                              }).format(client.orderVolume)}
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
