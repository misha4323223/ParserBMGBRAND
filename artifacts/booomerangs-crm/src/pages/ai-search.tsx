import { AppLayout } from "@/components/layout/app-layout";
import { useAiSearchClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Sparkles, Loader2, Users, MapPin, Building2, Phone } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EXAMPLE_QUERIES = [
  "Активные клиенты с Урала",
  "Кто брал больше 200 тысяч?",
  "Потенциальные из Поволжья",
  "Стрит-шопы Москвы и Питера",
];

export default function AiSearchPage() {
  const [query, setQuery] = useState("");
  const searchClients = useAiSearchClients();

  const handleSearch = (e?: React.FormEvent, q?: string) => {
    e?.preventDefault();
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    if (q) setQuery(q);
    searchClients.mutate({ data: { query: searchQuery } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "prospect": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "inactive": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Активный";
      case "prospect": return "Потенциальный";
      case "inactive": return "Неактивный";
      default: return status;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 md:gap-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center pt-2 md:pt-6">
          <div className="h-12 w-12 md:h-16 md:w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-4xl font-display font-bold tracking-tight text-foreground mb-2">
            AI Поиск Клиентов
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl px-2">
            Спросите на русском языке — ИИ найдёт нужных клиентов
          </p>
        </div>

        {/* Search Box */}
        <Card className="bg-card border-primary/20 rounded-lg overflow-hidden">
          <CardContent className="p-2">
            <form onSubmit={handleSearch} className="relative">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Например: активные клиенты из Москвы..."
                className="min-h-[90px] md:min-h-[110px] w-full resize-none border-0 bg-transparent py-3 pl-4 pr-4 pb-14 md:pb-4 md:pr-36 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch(e);
                  }
                }}
              />
              <div className="absolute right-3 bottom-3">
                <Button
                  type="submit"
                  disabled={!query.trim() || searchClients.isPending}
                  className="rounded-full w-full md:w-auto gap-2 font-medium"
                >
                  {searchClients.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Поиск
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Example chips */}
        {!searchClients.isSuccess && (
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handleSearch(undefined, q)}
                className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-card"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {searchClients.isPending && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Ищу в интернете и анализирую базу клиентов...</p>
          </div>
        )}

        {/* Results */}
        {searchClients.isSuccess && searchClients.data && (
          <div className="flex flex-col gap-4 md:gap-6 pb-4">
            {/* AI Explanation */}
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg flex gap-3">
              <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-accent mb-1">Анализ запроса</h3>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {searchClients.data.explanation}
                </p>
              </div>
            </div>

            {/* Results count */}
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Результаты ({searchClients.data.clients.length})
            </h3>

            {searchClients.data.clients.length === 0 ? (
              <div className="py-12 border border-dashed border-border rounded-lg text-center text-muted-foreground flex flex-col items-center gap-3 bg-card/50">
                <Search className="h-10 w-10 opacity-20" />
                <p className="text-sm">По вашему запросу ничего не найдено.</p>
                <p className="text-xs opacity-70">Попробуйте сформулировать иначе.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {searchClients.data.clients.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`}>
                    <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer h-full group shadow-none rounded-sm">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold font-display text-base group-hover:text-primary transition-colors leading-tight line-clamp-2">
                            {client.companyName}
                          </h4>
                          <Badge
                            variant="outline"
                            className={cn("shrink-0 rounded-sm font-medium px-2 py-0.5 border text-xs", getStatusColor(client.status))}
                          >
                            {getStatusLabel(client.status)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-col gap-1">
                          {client.city && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>{client.city}{client.region ? `, ${client.region}` : ""}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.category && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              <span>{client.category}</span>
                            </div>
                          )}
                        </div>
                        {client.orderVolume ? (
                          <div className="pt-2 border-t border-border/50 text-sm font-medium">
                            Объем:{" "}
                            {new Intl.NumberFormat("ru-RU", {
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
        )}
      </div>
    </AppLayout>
  );
}
