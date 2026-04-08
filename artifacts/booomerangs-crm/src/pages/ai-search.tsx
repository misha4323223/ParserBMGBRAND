import { AppLayout } from "@/components/layout/app-layout";
import { useAiSearchClients, useVkSearchGroups, useGisSearchPlaces, useCreateClient } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Sparkles, Loader2, Globe, MapPin, Building2, Phone,
  ExternalLink, Plus, CheckCircle, Send, Users, Mail, AtSign
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const EXAMPLE_QUERIES = [
  "Стрит-шопы Москвы",
  "Оптовые магазины одежды Екатеринбург",
  "Бутики молодёжной одежды Санкт-Петербург",
  "Шоурумы одежды Новосибирск",
];

const VK_EXAMPLE_QUERIES = [
  "streetwear магазин одежды",
  "молодёжная одежда бутик",
  "шоурум одежда опт",
  "стрит-шоп одежда",
];

const GIS_EXAMPLE_QUERIES = [
  "магазин уличной одежды",
  "стрит-шоп одежда",
  "молодёжная одежда бутик",
  "шоурум одежды",
];

const STORAGE_KEY = "ai_search_state";
const VK_STORAGE_KEY = "vk_search_state";
const GIS_STORAGE_KEY = "gis_search_state";

type SearchResult = {
  companyName: string;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  instagram?: string | null;
  vk?: string | null;
  telegram?: string | null;
};

type VkGroup = {
  id: number;
  name: string;
  vkUrl: string;
  description?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  membersCount?: number | null;
  photo?: string | null;
};

type SavedState = {
  query: string;
  results: SearchResult[];
  explanation: string;
  addedItems: number[];
};

type VkSavedState = {
  query: string;
  city: string;
  groups: VkGroup[];
  addedItems: number[];
};

type GisPlace = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  category?: string | null;
  gisUrl?: string | null;
};

type GisSavedState = {
  query: string;
  city: string;
  places: GisPlace[];
  addedItems: string[];
};

export default function AiSearchPage() {
  const [query, setQuery] = useState("");
  const [savedResults, setSavedResults] = useState<SearchResult[] | null>(null);
  const [savedExplanation, setSavedExplanation] = useState<string>("");
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());

  const [vkQuery, setVkQuery] = useState("");
  const [vkCity, setVkCity] = useState("");
  const [vkGroups, setVkGroups] = useState<VkGroup[] | null>(null);
  const [vkAddedItems, setVkAddedItems] = useState<Set<number>>(new Set());
  const [vkHasMore, setVkHasMore] = useState(false);
  const [vkTotalCount, setVkTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [gisQuery, setGisQuery] = useState("");
  const [gisCity, setGisCity] = useState("");
  const [gisPlaces, setGisPlaces] = useState<GisPlace[] | null>(null);
  const [gisAddedItems, setGisAddedItems] = useState<Set<string>>(new Set());
  const [gisHasMore, setGisHasMore] = useState(false);
  const [gisTotalCount, setGisTotalCount] = useState(0);
  const [gisPage, setGisPage] = useState(1);
  const [gisLoadingMore, setGisLoadingMore] = useState(false);

  const searchClients = useAiSearchClients();
  const vkSearch = useVkSearchGroups();
  const gisSearch = useGisSearchPlaces();
  const createClient = useCreateClient();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: SavedState = JSON.parse(raw);
        setQuery(saved.query ?? "");
        setSavedResults(saved.results ?? null);
        setSavedExplanation(saved.explanation ?? "");
        setAddedItems(new Set(saved.addedItems ?? []));
      }
      const vkRaw = localStorage.getItem(VK_STORAGE_KEY);
      if (vkRaw) {
        const saved: VkSavedState = JSON.parse(vkRaw);
        setVkQuery(saved.query ?? "");
        setVkCity(saved.city ?? "");
        setVkGroups(saved.groups ?? null);
        setVkAddedItems(new Set(saved.addedItems ?? []));
      }
      const gisRaw = localStorage.getItem(GIS_STORAGE_KEY);
      if (gisRaw) {
        const saved: GisSavedState = JSON.parse(gisRaw);
        setGisQuery(saved.query ?? "");
        setGisCity(saved.city ?? "");
        setGisPlaces(saved.places ?? null);
        setGisAddedItems(new Set(saved.addedItems ?? []));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (searchClients.isSuccess && searchClients.data) {
      const data = searchClients.data;
      setSavedResults(data.internetResults);
      setSavedExplanation(data.explanation);
      try {
        const toSave: SavedState = {
          query: data.query,
          results: data.internetResults,
          explanation: data.explanation,
          addedItems: [...addedItems],
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
    }
  }, [searchClients.isSuccess, searchClients.data]);

  useEffect(() => {
    if (vkSearch.isSuccess && vkSearch.data) {
      const data = vkSearch.data;
      const newGroups = data.groups as VkGroup[];
      const incoming = data.offset ?? 0;

      setVkGroups((prev) => incoming === 0 ? newGroups : [...(prev ?? []), ...newGroups]);
      setVkHasMore(data.hasMore ?? false);
      setVkTotalCount(data.totalCount ?? 0);
      setIsLoadingMore(false);

      try {
        const merged = incoming === 0 ? newGroups : [...(vkGroups ?? []), ...newGroups];
        const toSave: VkSavedState = {
          query: data.query,
          city: vkCity,
          groups: merged,
          addedItems: [...vkAddedItems],
        };
        localStorage.setItem(VK_STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
    }
  }, [vkSearch.isSuccess, vkSearch.data]);

  useEffect(() => {
    if (gisSearch.isSuccess && gisSearch.data) {
      const data = gisSearch.data;
      const newPlaces = data.results as GisPlace[];
      const incoming = (data.page ?? 1) === 1;
      setGisPlaces((prev) => incoming ? newPlaces : [...(prev ?? []), ...newPlaces]);
      setGisHasMore(data.hasMore ?? false);
      setGisTotalCount(data.total ?? 0);
      setGisPage(data.page ?? 1);
      setGisLoadingMore(false);
      try {
        const merged = incoming ? newPlaces : [...(gisPlaces ?? []), ...newPlaces];
        const toSave: GisSavedState = {
          query: data.query,
          city: gisCity,
          places: merged,
          addedItems: [...gisAddedItems],
        };
        localStorage.setItem(GIS_STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
    }
  }, [gisSearch.isSuccess, gisSearch.data]);

  const handleSearch = (e?: React.FormEvent, q?: string) => {
    e?.preventDefault();
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    if (q) setQuery(q);
    setAddedItems(new Set());
    setSavedResults(null);
    searchClients.mutate({ data: { query: searchQuery } });
  };

  const handleVkSearch = (e?: React.FormEvent, q?: string) => {
    e?.preventDefault();
    const searchQuery = q ?? vkQuery;
    if (!searchQuery.trim()) return;
    if (q) setVkQuery(q);
    setVkAddedItems(new Set());
    setVkGroups(null);
    setVkHasMore(false);
    setVkTotalCount(0);
    setIsLoadingMore(false);
    vkSearch.mutate({ data: { query: searchQuery, city: vkCity || null, offset: 0 } });
  };

  const handleLoadMore = () => {
    if (!vkQuery.trim() || vkSearch.isPending) return;
    const offset = vkGroups?.length ?? 0;
    setIsLoadingMore(true);
    vkSearch.mutate({ data: { query: vkQuery, city: vkCity || null, offset } });
  };

  const handleGisSearch = (e?: React.FormEvent, q?: string) => {
    e?.preventDefault();
    const searchQuery = q ?? gisQuery;
    if (!searchQuery.trim()) return;
    if (q) setGisQuery(q);
    setGisAddedItems(new Set());
    setGisPlaces(null);
    setGisHasMore(false);
    setGisTotalCount(0);
    setGisPage(1);
    setGisLoadingMore(false);
    gisSearch.mutate({ data: { query: searchQuery, city: gisCity || null, page: 1 } });
  };

  const handleGisLoadMore = () => {
    if (!gisQuery.trim() || gisSearch.isPending) return;
    setGisLoadingMore(true);
    gisSearch.mutate({ data: { query: gisQuery, city: gisCity || null, page: gisPage + 1 } });
  };

  const handleAddGisToCRM = (id: string, place: GisPlace) => {
    createClient.mutate(
      {
        data: {
          companyName: place.name,
          phone: place.phone ?? undefined,
          website: place.website ?? undefined,
          email: place.email ?? undefined,
          category: place.category ?? undefined,
          notes: place.address ? `Адрес: ${place.address}` : undefined,
          status: "prospect",
        },
      },
      {
        onSuccess: () => {
          const next = new Set(gisAddedItems).add(id);
          setGisAddedItems(next);
          try {
            const raw = localStorage.getItem(GIS_STORAGE_KEY);
            if (raw) {
              const saved: GisSavedState = JSON.parse(raw);
              saved.addedItems = [...next];
              localStorage.setItem(GIS_STORAGE_KEY, JSON.stringify(saved));
            }
          } catch {}
          toast.success(`${place.name} добавлен в CRM`);
        },
        onError: () => {
          toast.error("Не удалось добавить клиента");
        },
      }
    );
  };

  const handleAddToCRM = (index: number, result: SearchResult) => {
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
          vk: result.vk ?? undefined,
          telegram: result.telegram ?? undefined,
          status: "prospect",
        },
      },
      {
        onSuccess: () => {
          const next = new Set(addedItems).add(index);
          setAddedItems(next);
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const saved: SavedState = JSON.parse(raw);
              saved.addedItems = [...next];
              localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
            }
          } catch {}
          toast.success(`${result.companyName} добавлен в CRM`);
        },
        onError: () => {
          toast.error("Не удалось добавить клиента");
        },
      }
    );
  };

  const handleAddVkToCRM = (index: number, group: VkGroup) => {
    createClient.mutate(
      {
        data: {
          companyName: group.name,
          city: group.city ?? undefined,
          phone: group.phone ?? undefined,
          email: group.email ?? undefined,
          website: group.website ?? undefined,
          instagram: group.instagram ?? undefined,
          telegram: group.telegram ?? undefined,
          notes: group.description ?? undefined,
          vk: group.vkUrl,
          status: "prospect",
        },
      },
      {
        onSuccess: () => {
          const next = new Set(vkAddedItems).add(index);
          setVkAddedItems(next);
          try {
            const raw = localStorage.getItem(VK_STORAGE_KEY);
            if (raw) {
              const saved: VkSavedState = JSON.parse(raw);
              saved.addedItems = [...next];
              localStorage.setItem(VK_STORAGE_KEY, JSON.stringify(saved));
            }
          } catch {}
          toast.success(`${group.name} добавлен в CRM`);
        },
        onError: () => {
          toast.error("Не удалось добавить клиента");
        },
      }
    );
  };

  const displayResults = savedResults;
  const hasResults = displayResults !== null;
  const hasVkResults = vkGroups !== null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 md:gap-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center text-center pt-2 md:pt-6">
          <div className="h-12 w-12 md:h-16 md:w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Globe className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-4xl font-display font-bold tracking-tight text-foreground mb-2">
            Поиск клиентов
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl px-2">
            ИИ ищет магазины через интернет или ВКонтакте — найденных можно сразу добавить в CRM
          </p>
        </div>

        <Tabs defaultValue="internet" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-2">
            <TabsTrigger value="internet" className="gap-1 text-xs sm:text-sm">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Интернет + </span>ИИ
            </TabsTrigger>
            <TabsTrigger value="vk" className="gap-1 text-xs sm:text-sm">
              <span className="font-bold text-blue-400">VK</span>
              <span className="hidden sm:inline">ВКонтакте</span>
            </TabsTrigger>
            <TabsTrigger value="gis" className="gap-1 text-xs sm:text-sm">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400" />
              2ГИС
            </TabsTrigger>
          </TabsList>

          {/* === INTERNET TAB === */}
          <TabsContent value="internet" className="flex flex-col gap-5">
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

            {!hasResults && !searchClients.isPending && (
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

            {hasResults && !searchClients.isPending && (
              <div className="flex flex-col gap-4 md:gap-6 pb-4">
                <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg flex gap-3">
                  <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-accent mb-1">Результат поиска</h3>
                    <p className="text-sm text-foreground/90 leading-relaxed">{savedExplanation}</p>
                  </div>
                </div>

                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Найдено в интернете ({displayResults!.length})
                </h3>

                {displayResults!.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-lg text-center text-muted-foreground flex flex-col items-center gap-3 bg-card/50">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Ничего не найдено по этому запросу.</p>
                    <p className="text-xs opacity-70">Попробуйте другой запрос — укажите город или тип магазина.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {displayResults!.map((result, index) => {
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
                                  <a href={result.website} target="_blank" rel="noopener noreferrer"
                                    className="text-primary hover:underline truncate">
                                    {result.website.replace(/^https?:\/\//, "")}
                                  </a>
                                </div>
                              )}
                              {result.instagram && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-pink-500 shrink-0">IG</span>
                                  <a
                                    href={result.instagram.startsWith("http") ? result.instagram : `https://instagram.com/${result.instagram.replace("@", "")}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-pink-500 hover:underline truncate text-sm">
                                    {result.instagram.startsWith("@") ? result.instagram : `@${result.instagram.replace(/.*instagram\.com\//, "").replace(/\/$/, "")}`}
                                  </a>
                                </div>
                              )}
                              {result.vk && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-blue-400 shrink-0">VK</span>
                                  <a
                                    href={result.vk.startsWith("http") ? result.vk : `https://vk.com/${result.vk.replace("@", "")}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline truncate text-sm">
                                    {result.vk.replace(/.*vk\.com\//, "vk.com/").replace(/\/$/, "")}
                                  </a>
                                </div>
                              )}
                              {result.telegram && (
                                <div className="flex items-center gap-1.5">
                                  <Send className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                                  <a
                                    href={result.telegram.startsWith("http") ? result.telegram : `https://t.me/${result.telegram.replace("@", "")}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-sky-400 hover:underline truncate text-sm">
                                    {result.telegram.startsWith("@") ? result.telegram : `@${result.telegram.replace(/.*t\.me\//, "").replace(/\/$/, "")}`}
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
                                <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                                  <ExternalLink className="h-3 w-3" />
                                  Источник
                                </a>
                              )}
                              <div className="ml-auto">
                                {isAdded ? (
                                  <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    В CRM
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
          </TabsContent>

          {/* === VK TAB === */}
          <TabsContent value="vk" className="flex flex-col gap-5">
            <Card className="bg-card border-blue-400/20 rounded-lg overflow-hidden">
              <CardContent className="p-3 flex flex-col gap-2">
                <form onSubmit={handleVkSearch} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={vkQuery}
                        onChange={(e) => setVkQuery(e.target.value)}
                        placeholder="Что искать: стрит-шоп, бутик одежды..."
                        className="pl-9 border-blue-400/30 focus-visible:ring-blue-400/30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleVkSearch(e);
                          }
                        }}
                      />
                    </div>
                    <div className="relative w-36">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={vkCity}
                        onChange={(e) => setVkCity(e.target.value)}
                        placeholder="Город"
                        className="pl-9 border-blue-400/30 focus-visible:ring-blue-400/30"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={!vkQuery.trim() || vkSearch.isPending}
                    className="w-full gap-2 font-medium bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {vkSearch.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Найти группы ВК
                  </Button>
                </form>
              </CardContent>
            </Card>

            {!hasVkResults && !vkSearch.isPending && (
              <div className="flex flex-wrap gap-2 justify-center">
                {VK_EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleVkSearch(undefined, q)}
                    className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-blue-400/30 text-muted-foreground hover:border-blue-400 hover:text-blue-400 transition-colors bg-card"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {vkSearch.isPending && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm font-medium">Ищу группы ВКонтакте...</p>
                <p className="text-xs opacity-60">Это займёт несколько секунд</p>
              </div>
            )}

            {vkSearch.isError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {vkSearch.error?.message?.includes("VK_ACCESS_TOKEN")
                  ? "VK токен не настроен. Добавьте VK_ACCESS_TOKEN в секреты."
                  : "Ошибка поиска ВКонтакте. Проверьте токен и попробуйте снова."}
              </div>
            )}

            {hasVkResults && (
              <div className="flex flex-col gap-4 pb-4">
                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <span className="text-base font-bold text-blue-400">VK</span>
                  Найдено групп ({vkGroups!.length}
                  {vkTotalCount > 0 && ` из ${vkTotalCount.toLocaleString("ru")}`})
                </h3>

                {vkGroups!.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-lg text-center text-muted-foreground flex flex-col items-center gap-3 bg-card/50">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Группы не найдены.</p>
                    <p className="text-xs opacity-70">Попробуйте изменить запрос или город.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {vkGroups!.map((group, index) => {
                      const isAdded = vkAddedItems.has(index);
                      return (
                        <Card key={`${group.id}-${index}`} className="bg-card border-border h-full shadow-none rounded-sm">
                          <CardContent className="p-4 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                              {group.photo && (
                                <img
                                  src={group.photo}
                                  alt={group.name}
                                  className="w-10 h-10 rounded-full shrink-0 object-cover border border-border"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold font-display text-base leading-tight line-clamp-2">
                                  {group.name}
                                </h4>
                                {group.membersCount && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                    <Users className="h-3 w-3" />
                                    <span>{group.membersCount.toLocaleString("ru")} подписчиков</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-sm text-muted-foreground flex flex-col gap-1.5">
                              {group.city && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span>{group.city}</span>
                                </div>
                              )}
                              {group.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <span>{group.phone}</span>
                                </div>
                              )}
                              {group.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{group.email}</span>
                                </div>
                              )}
                              {group.website && (
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                                  <a href={group.website.startsWith("http") ? group.website : `https://${group.website}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-primary hover:underline truncate">
                                    {group.website.replace(/^https?:\/\//, "")}
                                  </a>
                                </div>
                              )}
                              {group.instagram && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-pink-500 shrink-0">IG</span>
                                  <a
                                    href={group.instagram.startsWith("http") ? group.instagram : `https://instagram.com/${group.instagram.replace("@", "")}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-pink-500 hover:underline truncate text-sm">
                                    {group.instagram.replace(/.*instagram\.com\//, "@").replace(/\/$/, "")}
                                  </a>
                                </div>
                              )}
                              {group.telegram && (
                                <div className="flex items-center gap-1.5">
                                  <Send className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                                  <a
                                    href={group.telegram.startsWith("http") ? group.telegram : `https://t.me/${group.telegram.replace("@", "")}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-sky-400 hover:underline truncate text-sm">
                                    {group.telegram.replace(/.*t\.me\//, "@").replace(/\/$/, "")}
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-blue-400 shrink-0">VK</span>
                                <a href={group.vkUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline truncate text-sm">
                                  {group.vkUrl.replace("https://", "")}
                                </a>
                              </div>
                            </div>

                            {group.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                {group.description}
                              </p>
                            )}

                            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                              <a href={group.vkUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-blue-400 flex items-center gap-1 transition-colors">
                                <ExternalLink className="h-3 w-3" />
                                Открыть VK
                              </a>
                              <div className="ml-auto">
                                {isAdded ? (
                                  <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    В CRM
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 rounded-sm"
                                    onClick={() => handleAddVkToCRM(index, group)}
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

                {vkHasMore && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto gap-2 border-blue-400/40 text-blue-400 hover:bg-blue-400/10 hover:border-blue-400"
                      onClick={handleLoadMore}
                      disabled={vkSearch.isPending}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Загружаю...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Загрузить ещё 20
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Показано {vkGroups?.length ?? 0} из {vkTotalCount.toLocaleString("ru")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          {/* === 2GIS TAB === */}
          <TabsContent value="gis" className="flex flex-col gap-5">
            <Card className="bg-card border-green-400/20 rounded-lg overflow-hidden">
              <CardContent className="p-3 flex flex-col gap-2">
                <form onSubmit={handleGisSearch} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={gisQuery}
                        onChange={(e) => setGisQuery(e.target.value)}
                        placeholder="Что искать: магазин одежды, стрит-шоп..."
                        className="pl-9 border-green-400/30 focus-visible:ring-green-400/30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleGisSearch(e); }
                        }}
                      />
                    </div>
                    <div className="relative w-36">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={gisCity}
                        onChange={(e) => setGisCity(e.target.value)}
                        placeholder="Город"
                        className="pl-9 border-green-400/30 focus-visible:ring-green-400/30"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={!gisQuery.trim() || gisSearch.isPending}
                    className="w-full gap-2 font-medium bg-green-600 hover:bg-green-700 text-white"
                  >
                    {gisSearch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Найти в 2ГИС
                  </Button>
                </form>
              </CardContent>
            </Card>

            {!gisPlaces && !gisSearch.isPending && (
              <div className="flex flex-wrap gap-2 justify-center">
                {GIS_EXAMPLE_QUERIES.map((q) => (
                  <button key={q} onClick={() => handleGisSearch(undefined, q)}
                    className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-green-400/30 text-muted-foreground hover:border-green-400 hover:text-green-400 transition-colors bg-card">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {gisSearch.isPending && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-green-400" />
                <p className="text-sm font-medium">Ищу в 2ГИС...</p>
              </div>
            )}

            {gisSearch.isError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {gisSearch.error?.message?.includes("TWOGIS_API_KEY")
                  ? "Ключ 2ГИС не настроен. Добавьте TWOGIS_API_KEY в секреты."
                  : "Ошибка 2ГИС API. Проверьте ключ и попробуйте снова."}
              </div>
            )}

            {gisPlaces && (
              <div className="flex flex-col gap-4 pb-4">
                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-400" />
                  Найдено ({gisPlaces.length}
                  {gisTotalCount > 0 && ` из ${gisTotalCount.toLocaleString("ru")}`})
                </h3>

                {gisPlaces.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-lg text-center text-muted-foreground flex flex-col items-center gap-3 bg-card/50">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Ничего не найдено.</p>
                    <p className="text-xs opacity-70">Попробуйте изменить запрос или город.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {gisPlaces.map((place) => {
                      const isAdded = gisAddedItems.has(place.id);
                      return (
                        <Card key={place.id} className="bg-card border-border h-full shadow-none rounded-sm">
                          <CardContent className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold font-display text-base leading-tight line-clamp-2">
                                {place.name}
                              </h4>
                              {place.category && (
                                <Badge variant="outline" className="shrink-0 rounded-sm text-xs border-green-400/30 text-green-400">
                                  {place.category}
                                </Badge>
                              )}
                            </div>

                            <div className="text-sm text-muted-foreground flex flex-col gap-1.5">
                              {place.address && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="line-clamp-1">{place.address}</span>
                                </div>
                              )}
                              {place.phone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  <span>{place.phone}</span>
                                </div>
                              )}
                              {place.email && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{place.email}</span>
                                </div>
                              )}
                              {place.website && (
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                                  <a href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-primary hover:underline truncate">
                                    {place.website.replace(/^https?:\/\//, "")}
                                  </a>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                              {place.gisUrl && (
                                <a href={place.gisUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-green-400 flex items-center gap-1 transition-colors">
                                  <ExternalLink className="h-3 w-3" />
                                  Открыть 2ГИС
                                </a>
                              )}
                              <div className="ml-auto">
                                {isAdded ? (
                                  <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    В CRM
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline"
                                    className="h-7 text-xs gap-1 rounded-sm"
                                    onClick={() => handleAddGisToCRM(place.id, place)}
                                    disabled={createClient.isPending}>
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

                {gisHasMore && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <Button variant="outline"
                      className="w-full sm:w-auto gap-2 border-green-400/40 text-green-400 hover:bg-green-400/10 hover:border-green-400"
                      onClick={handleGisLoadMore}
                      disabled={gisSearch.isPending}>
                      {gisLoadingMore ? <><Loader2 className="h-4 w-4 animate-spin" />Загружаю...</> : <><Plus className="h-4 w-4" />Загрузить ещё</>}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Показано {gisPlaces?.length ?? 0} из {gisTotalCount.toLocaleString("ru")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
