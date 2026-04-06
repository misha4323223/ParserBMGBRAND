import { AppLayout } from "@/components/layout/app-layout";
import { useAiSearchClients, useCreateClient } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Sparkles, Loader2, Globe, MapPin, Building2, Phone, ExternalLink, Plus, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const EXAMPLE_QUERIES = [
  "Стрит-шопы Москвы",
  "Оптовые магазины одежды Екатеринбург",
  "Бутики молодёжной одежды Санкт-Петербург",
  "Шоурумы одежды Новосибирск",
];

export default function AiSearchPage() {
  const [query, setQuery] = useState("");
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const searchClients = useAiSearchClients();
  const createClient = useCreateClient();

  const handleSearch = (e?: React.FormEvent, q?: string) => {
    e?.preventDefault();
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    if (q) setQuery(q);
    setAddedItems(new Set());
    searchClients.mutate({ data: { query: searchQuery } });
  };

  const handleAddToCRM = (index: number, result: {
    companyName: string;
    city?: string | null;
    phone?: string | null;
    website?: string | null;
    category?: string | null;
    description?: string | null;
    instagram?: string | null;
  }) => {
    createClient.mutate(
      {
        data: {
          companyName: result.companyName,
          city: result.city ?? undefined,
          phone: result.phone ?? undefined,
          website: result.website ?? undefined,
          category: result.category ?? undefined,
          notes: result.description ?? undefined,
          instagram: result.instagram ?? undefined,
          status: "prospect",
        },
      },
      {
        onSuccess: () => {
          setAddedItems((prev) => new Set(prev).add(index));
          toast.success(`${result.companyName} добавлен в CRM как потенциальный клиент`);
        },
        onError: () => {
          toast.error("Не удалось добавить клиента");
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 md:gap-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center text-center pt-2 md:pt-6">
          <div className="h-12 w-12 md:h-16 md:w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Globe className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-4xl font-display font-bold tracking-tight text-foreground mb-2">
            Поиск клиентов в интернете
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl px-2">
            ИИ ищет магазины и компании в интернете — найденных можно сразу добавить в CRM
          </p>
        </div>

        <Card className="bg-card border-primary/20 rounded-lg overflow-hidden">
          <CardContent className="p-2">
            <form onSubmit={handleSearch} className="relative">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Например: стрит-шопы Москвы, бутики молодёжной одежды..."
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
                  Найти
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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

        {searchClients.isPending && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Ищу в интернете...</p>
            <p className="text-xs opacity-60">Это может занять 10–20 секунд</p>
          </div>
        )}

        {searchClients.isSuccess && searchClients.data && (
          <div className="flex flex-col gap-4 md:gap-6 pb-4">
            <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg flex gap-3">
              <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-accent mb-1">Результат поиска</h3>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {searchClients.data.explanation}
                </p>
              </div>
            </div>

            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Найдено в интернете ({searchClients.data.internetResults.length})
            </h3>

            {searchClients.data.internetResults.length === 0 ? (
              <div className="py-12 border border-dashed border-border rounded-lg text-center text-muted-foreground flex flex-col items-center gap-3 bg-card/50">
                <Search className="h-10 w-10 opacity-20" />
                <p className="text-sm">Ничего не найдено по этому запросу.</p>
                <p className="text-xs opacity-70">Попробуйте другой запрос — например, укажите город или тип магазина.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {searchClients.data.internetResults.map((result, index) => {
                  const isAdded = addedItems.has(index);
                  return (
                    <Card key={index} className="bg-card border-border h-full shadow-none rounded-sm">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold font-display text-base leading-tight line-clamp-2">
                            {result.companyName}
                          </h4>
                          {result.category && (
                            <Badge variant="outline" className="shrink-0 rounded-sm text-xs border-primary/30 text-primary">
                              {result.category}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground flex flex-col gap-1.5">
                          {result.city && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>{result.city}</span>
                            </div>
                          )}
                          {result.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span>{result.phone}</span>
                            </div>
                          )}
                          {result.website && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              <a
                                href={result.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {result.website.replace(/^https?:\/\//, "")}
                              </a>
                            </div>
                          )}
                        </div>

                        {result.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {result.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                          {result.sourceUrl && (
                            <a
                              href={result.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Источник
                            </a>
                          )}
                          <div className="ml-auto">
                            {isAdded ? (
                              <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Добавлен в CRM
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 rounded-sm"
                                onClick={() => handleAddToCRM(index, result)}
                                disabled={createClient.isPending}
                              >
                                <Plus className="h-3 w-3" />
                                В CRM
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
