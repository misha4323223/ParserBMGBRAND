import { AppLayout } from "@/components/layout/app-layout";
import { useAiSearchClients, useVkSearchGroups, useCollabSearch, useCreateClient, useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Sparkles, Loader2, Globe, MapPin, Building2, Phone,
  ExternalLink, Plus, CheckCircle, Send, Users, Mail, AtSign, Star, Music
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

const COLLAB_EXAMPLE_QUERIES = [
  "рэперы Москвы стрит-культура",
  "блогеры мода streetwear Россия",
  "музыканты молодёжь TikTok",
  "инфлюенсеры одежда ВКонтакте",
];

const STORAGE_KEY = "ai_search_state";
const VK_STORAGE_KEY = "vk_search_state";
const COLLAB_STORAGE_KEY = "collab_search_state_v1";

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

type CollabPerson = {
  name: string;
  type?: string | null;
  niche?: string | null;
  city?: string | null;
  followersInstagram?: string | null;
  followersVk?: string | null;
  instagram?: string | null;
  vk?: string | null;
  telegram?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  email?: string | null;
  description?: string | null;
  whyRelevant?: string | null;
};

type Manager = "m1" | "m2";

type SavedState = {
  query: string;
  results: SearchResult[];
  explanation: string;
  addedItems: string[];
};

type VkSavedState = {
  query: string;
  city: string;
  groups: VkGroup[];
  addedItems: string[];
};

type CollabSavedState = {
  query: string;
  people: CollabPerson[];
  explanation: string;
  addedItems: string[];
};

function loadFromStorage<T>(key: string, field: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed[field] ?? fallback;
  } catch {
    return fallback;
  }
}

const TYPE_COLORS: Record<string, string> = {
  артист: "border-purple-400/40 text-purple-400",
  музыкант: "border-purple-400/40 text-purple-400",
  рэпер: "border-purple-400/40 text-purple-400",
  блогер: "border-blue-400/40 text-blue-400",
  тиктокер: "border-pink-400/40 text-pink-400",
  ютубер: "border-red-400/40 text-red-400",
  стример: "border-violet-400/40 text-violet-400",
  дизайнер: "border-amber-400/40 text-amber-400",
  фотограф: "border-green-400/40 text-green-400",
  инфлюенсер: "border-cyan-400/40 text-cyan-400",
};

function getTypeColor(type?: string | null) {
  if (!type) return "border-primary/30 text-primary";
  const key = type.toLowerCase();
  return TYPE_COLORS[key] ?? "border-primary/30 text-primary";
}

export default function AiSearchPage() {
  const [query, setQuery] = useState<string>(() => loadFromStorage(STORAGE_KEY, "query", ""));
  const [savedResults, setSavedResults] = useState<SearchResult[] | null>(() => loadFromStorage(STORAGE_KEY, "results", null));
  const [savedExplanation, setSavedExplanation] = useState<string>(() => loadFromStorage(STORAGE_KEY, "explanation", ""));
  const [addedItems, setAddedItems] = useState<Set<string>>(() => new Set(loadFromStorage<string[]>(STORAGE_KEY, "addedItems", [])));

  const [vkQuery, setVkQuery] = useState<string>(() => loadFromStorage(VK_STORAGE_KEY, "query", ""));
  const [vkCity, setVkCity] = useState<string>(() => loadFromStorage(VK_STORAGE_KEY, "city", ""));
  const [vkGroups, setVkGroups] = useState<VkGroup[] | null>(() => loadFromStorage(VK_STORAGE_KEY, "groups", null));
  const [vkAddedItems, setVkAddedItems] = useState<Set<string>>(() => new Set(loadFromStorage<string[]>(VK_STORAGE_KEY, "addedItems", [])));
  const [vkConnected, setVkConnected] = useState<boolean | null>(null);
  const [vkTokenInput, setVkTokenInput] = useState("");
  const [vkTokenSaving, setVkTokenSaving] = useState(false);

  const [collabQuery, setCollabQuery] = useState<string>(() => loadFromStorage(COLLAB_STORAGE_KEY, "query", ""));
  const [collabPeople, setCollabPeople] = useState<CollabPerson[] | null>(() => loadFromStorage(COLLAB_STORAGE_KEY, "people", null));
  const [collabExplanation, setCollabExplanation] = useState<string>(() => loadFromStorage(COLLAB_STORAGE_KEY, "explanation", ""));
  const [collabAddedItems, setCollabAddedItems] = useState<Set<string>>(() => new Set(loadFromStorage<string[]>(COLLAB_STORAGE_KEY, "addedItems", [])));

  const searchClients = useAiSearchClients();
  const vkSearch = useVkSearchGroups();
  const collabSearch = useCollabSearch();
  const createClient = useCreateClient();
  const clientsList = useListClients();

  const vkCrmUrls = new Set(
    (clientsList.data ?? [])
      .map((c: { vk?: string | null }) => c.vk?.toLowerCase().replace(/\/$/, "") ?? "")
      .filter(Boolean)
  );

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
      setVkGroups(newGroups);
      try {
        const toSave: VkSavedState = {
          query: data.query,
          city: vkCity,
          groups: newGroups,
          addedItems: [...vkAddedItems],
        };
        localStorage.setItem(VK_STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
    }
  }, [vkSearch.isSuccess, vkSearch.data]);

  useEffect(() => {
    if (collabSearch.isSuccess && collabSearch.data) {
      const data = collabSearch.data;
      const newPeople = data.results as CollabPerson[];
      setCollabPeople(newPeople);
      setCollabExplanation(data.explanation);
      try {
        const toSave: CollabSavedState = {
          query: data.query,
          people: newPeople,
          explanation: data.explanation,
          addedItems: [...collabAddedItems],
        };
        localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(toSave));
      } catch {}
    }
  }, [collabSearch.isSuccess, collabSearch.data]);

  useEffect(() => {
    fetch("/api/vk-oauth/status")
      .then((r) => r.json())
      .then((d: { connected: boolean }) => setVkConnected(d.connected))
      .catch(() => setVkConnected(false));
  }, []);

  const handleVkSaveToken = async () => {
    const token = vkTokenInput.trim();
    if (!token) return;
    setVkTokenSaving(true);
    try {
      const r = await fetch("/api/vk-oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.ok) {
        setVkConnected(true);
        setVkTokenInput("");
        toast.success("ВКонтакте успешно подключён!");
      } else {
        toast.error("Не удалось сохранить токен");
      }
    } catch {
      toast.error("Ошибка соединения с сервером");
    } finally {
      setVkTokenSaving(false);
    }
  };

  const handleVkDisconnect = async () => {
    await fetch("/api/vk-oauth/disconnect", { method: "POST" });
    setVkConnected(false);
    toast.success("ВКонтакте отключён");
  };

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
    vkSearch.mutate({ data: { query: searchQuery, city: vkCity || null, offset: 0 } });
  };

  const handleCollabSearch = (e?: React.FormEvent, q?: string) => {
    e?.preventDefault();
    const searchQuery = q ?? collabQuery;
    if (!searchQuery.trim()) return;
    if (q) setCollabQuery(q);
    setCollabAddedItems(new Set());
    setCollabPeople(null);
    collabSearch.mutate({ data: { query: searchQuery } });
  };

  const MANAGERS: Record<Manager, { label: string; color: string }> = {
    m1: { label: "Менеджер 1", color: "violet" },
    m2: { label: "Менеджер 2", color: "amber" },
  };

  const handleAddToCRM = (index: number, result: SearchResult, manager: Manager) => {
    const key = `${index}:${manager}`;
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
          manager: MANAGERS[manager].label,
          status: "prospect",
        },
      },
      {
        onSuccess: () => {
          const next = new Set(addedItems).add(key);
          setAddedItems(next);
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const saved: SavedState = JSON.parse(raw);
              saved.addedItems = [...next];
              localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
            }
          } catch {}
          toast.success(`${result.companyName} добавлен в CRM (${MANAGERS[manager].label})`);
        },
        onError: () => {
          toast.error("Не удалось добавить клиента");
        },
      }
    );
  };

  const handleAddVkToCRM = (index: number, group: VkGroup, manager: Manager) => {
    const key = `${index}:${manager}`;
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
          manager: MANAGERS[manager].label,
          status: "prospect",
        },
      },
      {
        onSuccess: () => {
          const next = new Set(vkAddedItems).add(key);
          setVkAddedItems(next);
          clientsList.refetch();
          try {
            const raw = localStorage.getItem(VK_STORAGE_KEY);
            if (raw) {
              const saved: VkSavedState = JSON.parse(raw);
              saved.addedItems = [...next];
              localStorage.setItem(VK_STORAGE_KEY, JSON.stringify(saved));
            }
          } catch {}
          toast.success(`${group.name} добавлен в CRM (${MANAGERS[manager].label})`);
        },
        onError: () => {
          toast.error("Не удалось добавить клиента");
        },
      }
    );
  };

  const handleAddCollabToCRM = (index: number, person: CollabPerson, manager: Manager) => {
    const key = `${index}:${manager}`;
    createClient.mutate(
      {
        data: {
          companyName: person.name,
          city: person.city ?? undefined,
          email: person.email ?? undefined,
          instagram: person.instagram ?? undefined,
          vk: person.vk ?? undefined,
          telegram: person.telegram ?? undefined,
          category: person.type ?? "коллаборация",
          notes: [
            person.niche ? `Ниша: ${person.niche}` : null,
            person.followersInstagram ? `Instagram: ${person.followersInstagram}` : null,
            person.followersVk ? `VK: ${person.followersVk}` : null,
            person.youtube ? `YouTube: ${person.youtube}` : null,
            person.tiktok ? `TikTok: ${person.tiktok}` : null,
            person.whyRelevant ? `Почему подходит: ${person.whyRelevant}` : null,
            person.description ?? null,
          ].filter(Boolean).join("\n") || undefined,
          manager: MANAGERS[manager].label,
          status: "prospect",
        },
      },
      {
        onSuccess: () => {
          const next = new Set(collabAddedItems).add(key);
          setCollabAddedItems(next);
          try {
            const raw = localStorage.getItem(COLLAB_STORAGE_KEY);
            if (raw) {
              const saved: CollabSavedState = JSON.parse(raw);
              saved.addedItems = [...next];
              localStorage.setItem(COLLAB_STORAGE_KEY, JSON.stringify(saved));
            }
          } catch {}
          toast.success(`${person.name} добавлен в CRM (${MANAGERS[manager].label})`);
        },
        onError: () => {
          toast.error("Не удалось добавить в CRM");
        },
      }
    );
  };

  const displayResults = savedResults;
  const hasResults = displayResults !== null;
  const hasVkResults = vkGroups !== null;
  const hasCollabResults = collabPeople !== null;

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
            ИИ ищет магазины и блогеров — найденных можно сразу добавить в CRM
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
            <TabsTrigger value="collab" className="gap-1 text-xs sm:text-sm">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
              <span>Блогеры</span>
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
                    {displayResults!.map((result, index) => (
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
                                <a href={result.vk.startsWith("http") ? result.vk : `https://vk.com/${result.vk}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline truncate text-sm">
                                  {result.vk.replace(/.*vk\.com\//, "").replace(/\/$/, "")}
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
                                  {result.telegram}
                                </a>
                              </div>
                            )}
                            {result.description && (
                              <p className="text-xs leading-relaxed mt-0.5 opacity-80">{result.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            {result.sourceUrl && (
                              <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                                <ExternalLink className="h-3 w-3" />
                                Источник
                              </a>
                            )}
                            <div className="ml-auto flex items-center gap-1.5">
                              {addedItems.has(`${index}:m1`) ? (
                                <div className="flex items-center gap-1 text-xs text-violet-400 font-medium">
                                  <CheckCircle className="h-3.5 w-3.5" />М1
                                </div>
                              ) : (
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs gap-1 rounded-sm border-violet-400/40 text-violet-400 hover:bg-violet-400/10 hover:border-violet-400"
                                  onClick={() => handleAddToCRM(index, result, "m1")}
                                  disabled={createClient.isPending}>
                                  <Plus className="h-3 w-3" />М1
                                </Button>
                              )}
                              {addedItems.has(`${index}:m2`) ? (
                                <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                                  <CheckCircle className="h-3.5 w-3.5" />М2
                                </div>
                              ) : (
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs gap-1 rounded-sm border-amber-400/40 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400"
                                  onClick={() => handleAddToCRM(index, result, "m2")}
                                  disabled={createClient.isPending}>
                                  <Plus className="h-3 w-3" />М2
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* === VK TAB === */}
          <TabsContent value="vk" className="flex flex-col gap-5">
            {vkConnected === false && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-400 text-lg">VK</span>
                  <p className="text-sm font-semibold text-foreground">Подключите ВКонтакте</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Для поиска групп ВКонтакте нужен токен. Получите его на{" "}
                  <a href="https://vkhost.github.io/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">vkhost.github.io</a>{" "}
                  (выберите Kate Mobile → разрешить).
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={vkTokenInput}
                    onChange={(e) => setVkTokenInput(e.target.value)}
                    placeholder="Вставьте токен VK..."
                    className="flex-1 h-9 rounded-sm border border-border bg-background px-3 text-sm focus:outline-none focus:border-blue-400"
                  />
                  <Button size="sm" onClick={handleVkSaveToken} disabled={!vkTokenInput.trim() || vkTokenSaving}
                    className="bg-blue-500 hover:bg-blue-600 text-white h-9 px-4">
                    {vkTokenSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сохранить"}
                  </Button>
                </div>
              </div>
            )}

            {vkConnected === true && (
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <CheckCircle className="h-4 w-4" />
                  ВКонтакте подключён
                </div>
                <button onClick={handleVkDisconnect} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  Отключить
                </button>
              </div>
            )}

            <Card className="bg-card border-primary/20 rounded-lg overflow-hidden">
              <CardContent className="p-2">
                <form onSubmit={handleVkSearch} className="flex flex-col gap-2 p-2">
                  <input
                    value={vkQuery}
                    onChange={(e) => setVkQuery(e.target.value)}
                    placeholder="Что ищем? (например: streetwear магазин одежды)"
                    className="w-full h-10 border-0 bg-transparent text-base focus:outline-none placeholder:text-muted-foreground"
                    onKeyDown={(e) => { if (e.key === "Enter") handleVkSearch(e); }}
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      value={vkCity}
                      onChange={(e) => setVkCity(e.target.value)}
                      placeholder="Город (необязательно)"
                      className="flex-1 h-8 border border-border rounded-sm bg-background px-3 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <Button type="submit" disabled={!vkQuery.trim() || vkSearch.isPending}
                      className="rounded-full gap-2 font-medium bg-blue-500 hover:bg-blue-600 text-white h-8 px-4">
                      {vkSearch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Найти
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {!hasVkResults && !vkSearch.isPending && (
              <div className="flex flex-wrap gap-2 justify-center">
                {VK_EXAMPLE_QUERIES.map((q) => (
                  <button key={q} onClick={() => handleVkSearch(undefined, q)}
                    className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-blue-400 hover:text-blue-400 transition-colors bg-card">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {vkSearch.isPending && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm font-medium">Ищу в ВКонтакте...</p>
              </div>
            )}

            {vkSearch.isError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                Ошибка VK API. Проверьте токен и попробуйте снова.
              </div>
            )}

            {hasVkResults && !vkSearch.isPending && (
              <div className="flex flex-col gap-4 pb-4">
                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <span className="font-bold text-blue-400">VK</span>
                  Найдено групп ({vkGroups!.length})
                </h3>

                {vkGroups!.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-lg text-center text-muted-foreground flex flex-col items-center gap-3 bg-card/50">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Ничего не найдено.</p>
                    <p className="text-xs opacity-70">Попробуйте другой запрос.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {vkGroups!.map((group, index) => {
                      const alreadyInCrm = vkCrmUrls.has(group.vkUrl.toLowerCase().replace(/\/$/, ""));
                      return (
                        <Card key={group.id} className="bg-card border-border h-full shadow-none rounded-sm">
                          <CardContent className="p-4 flex flex-col gap-3">
                            <div className="flex gap-3 items-start">
                              {group.photo && (
                                <img src={group.photo} alt={group.name}
                                  className="h-10 w-10 rounded-sm object-cover shrink-0 bg-muted" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold font-display text-base leading-tight line-clamp-2">{group.name}</h4>
                                {group.membersCount && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                    <Users className="h-3 w-3" />
                                    {group.membersCount.toLocaleString("ru")} подписчиков
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
                              {group.description && (
                                <p className="text-xs leading-relaxed mt-0.5 opacity-70 line-clamp-2">{group.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                              <a href={group.vkUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors border border-blue-400/40 hover:border-blue-400 rounded-sm px-2 py-1">
                                <ExternalLink className="h-3 w-3" />
                                Открыть VK
                              </a>
                              {alreadyInCrm ? (
                                <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                                  В CRM
                                </div>
                              ) : (
                                <div className="ml-auto flex items-center gap-1.5">
                                  {vkAddedItems.has(`${index}:m1`) ? (
                                    <div className="flex items-center gap-1 text-xs text-violet-400 font-medium">
                                      <CheckCircle className="h-3.5 w-3.5" />М1
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline"
                                      className="h-7 text-xs gap-1 rounded-sm border-violet-400/40 text-violet-400 hover:bg-violet-400/10 hover:border-violet-400"
                                      onClick={() => handleAddVkToCRM(index, group, "m1")}
                                      disabled={createClient.isPending}>
                                      <Plus className="h-3 w-3" />М1
                                    </Button>
                                  )}
                                  {vkAddedItems.has(`${index}:m2`) ? (
                                    <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                                      <CheckCircle className="h-3.5 w-3.5" />М2
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline"
                                      className="h-7 text-xs gap-1 rounded-sm border-amber-400/40 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400"
                                      onClick={() => handleAddVkToCRM(index, group, "m2")}
                                      disabled={createClient.isPending}>
                                      <Plus className="h-3 w-3" />М2
                                    </Button>
                                  )}
                                </div>
                              )}
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

          {/* === COLLAB TAB === */}
          <TabsContent value="collab" className="flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="flex items-center gap-2 text-yellow-400">
                <Star className="h-5 w-5" />
                <Music className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                ИИ ищет артистов, музыкантов и блогеров России для коллабораций с брендом
              </p>
            </div>

            <Card className="bg-card border-yellow-400/20 rounded-lg overflow-hidden">
              <CardContent className="p-2">
                <form onSubmit={handleCollabSearch} className="relative">
                  <Textarea
                    value={collabQuery}
                    onChange={(e) => setCollabQuery(e.target.value)}
                    placeholder="Например: рэперы Москвы, блогеры streetwear, музыканты TikTok..."
                    className="min-h-[90px] md:min-h-[110px] w-full resize-none border-0 bg-transparent py-3 pl-4 pr-4 pb-14 md:pb-4 md:pr-36 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCollabSearch(e);
                      }
                    }}
                  />
                  <div className="absolute right-3 bottom-3">
                    <Button
                      type="submit"
                      disabled={!collabQuery.trim() || collabSearch.isPending}
                      className="rounded-full w-full md:w-auto gap-2 font-medium bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      {collabSearch.isPending ? (
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

            {!hasCollabResults && !collabSearch.isPending && (
              <div className="flex flex-wrap gap-2 justify-center">
                {COLLAB_EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleCollabSearch(undefined, q)}
                    className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-yellow-400 hover:text-yellow-400 transition-colors bg-card"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {collabSearch.isPending && (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
                <p className="text-sm font-medium">Ищу артистов и блогеров...</p>
                <p className="text-xs opacity-60">Это может занять 10–20 секунд</p>
              </div>
            )}

            {collabSearch.isError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                Ошибка поиска. Попробуйте снова.
              </div>
            )}

            {hasCollabResults && !collabSearch.isPending && (
              <div className="flex flex-col gap-4 md:gap-6 pb-4">
                <div className="p-4 bg-yellow-400/5 border border-yellow-400/20 rounded-lg flex gap-3">
                  <Sparkles className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-400 mb-1">Результат поиска</h3>
                    <p className="text-sm text-foreground/90 leading-relaxed">{collabExplanation}</p>
                  </div>
                </div>

                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  Найдено для коллаборации ({collabPeople!.length})
                </h3>

                {collabPeople!.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-lg text-center text-muted-foreground flex flex-col items-center gap-3 bg-card/50">
                    <Search className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Ничего не найдено.</p>
                    <p className="text-xs opacity-70">Попробуйте другой запрос.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {collabPeople!.map((person, index) => (
                      <Card key={index} className="bg-card border-border h-full shadow-none rounded-sm">
                        <CardContent className="p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold font-display text-base leading-tight line-clamp-2">
                              {person.name}
                            </h4>
                            {person.type && (
                              <Badge variant="outline" className={`shrink-0 rounded-sm text-xs ${getTypeColor(person.type)}`}>
                                {person.type}
                              </Badge>
                            )}
                          </div>

                          {person.niche && (
                            <p className="text-xs text-muted-foreground bg-muted/30 rounded-sm px-2 py-1">
                              🎯 {person.niche}
                            </p>
                          )}

                          <div className="text-sm text-muted-foreground flex flex-col gap-1.5">
                            {person.city && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span>{person.city}</span>
                              </div>
                            )}
                            {(person.followersInstagram || person.followersVk) && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {person.followersInstagram && (
                                  <span className="text-xs bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full">
                                    IG {person.followersInstagram}
                                  </span>
                                )}
                                {person.followersVk && (
                                  <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                                    VK {person.followersVk}
                                  </span>
                                )}
                              </div>
                            )}
                            {person.instagram && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-pink-500 shrink-0">IG</span>
                                <a
                                  href={person.instagram.startsWith("http") ? person.instagram : `https://instagram.com/${person.instagram.replace("@", "")}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-pink-500 hover:underline truncate text-sm">
                                  {person.instagram.startsWith("@") ? person.instagram : `@${person.instagram.replace(/.*instagram\.com\//, "").replace(/\/$/, "")}`}
                                </a>
                              </div>
                            )}
                            {person.vk && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-blue-400 shrink-0">VK</span>
                                <a href={person.vk.startsWith("http") ? person.vk : `https://vk.com/${person.vk}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline truncate text-sm">
                                  {person.vk.replace(/.*vk\.com\//, "").replace(/\/$/, "")}
                                </a>
                              </div>
                            )}
                            {person.telegram && (
                              <div className="flex items-center gap-1.5">
                                <Send className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                                <a
                                  href={person.telegram.startsWith("http") ? person.telegram : `https://t.me/${person.telegram.replace("@", "")}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-sky-400 hover:underline truncate text-sm">
                                  {person.telegram}
                                </a>
                              </div>
                            )}
                            {person.youtube && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-red-500 shrink-0">YT</span>
                                <a href={person.youtube} target="_blank" rel="noopener noreferrer"
                                  className="text-red-500 hover:underline truncate text-sm">
                                  YouTube
                                </a>
                              </div>
                            )}
                            {person.tiktok && (
                              <div className="flex items-center gap-1.5">
                                <AtSign className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
                                <a
                                  href={person.tiktok.startsWith("http") ? person.tiktok : `https://tiktok.com/@${person.tiktok.replace("@", "")}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-foreground/70 hover:underline truncate text-sm">
                                  {person.tiktok}
                                </a>
                              </div>
                            )}
                            {person.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{person.email}</span>
                              </div>
                            )}
                            {person.whyRelevant && (
                              <p className="text-xs leading-relaxed mt-0.5 opacity-80 italic">
                                💡 {person.whyRelevant}
                              </p>
                            )}
                            {person.description && (
                              <p className="text-xs leading-relaxed opacity-70">{person.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            <div className="ml-auto flex items-center gap-1.5">
                              {collabAddedItems.has(`${index}:m1`) ? (
                                <div className="flex items-center gap-1 text-xs text-violet-400 font-medium">
                                  <CheckCircle className="h-3.5 w-3.5" />М1
                                </div>
                              ) : (
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs gap-1 rounded-sm border-violet-400/40 text-violet-400 hover:bg-violet-400/10 hover:border-violet-400"
                                  onClick={() => handleAddCollabToCRM(index, person, "m1")}
                                  disabled={createClient.isPending}>
                                  <Plus className="h-3 w-3" />М1
                                </Button>
                              )}
                              {collabAddedItems.has(`${index}:m2`) ? (
                                <div className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                                  <CheckCircle className="h-3.5 w-3.5" />М2
                                </div>
                              ) : (
                                <Button size="sm" variant="outline"
                                  className="h-7 text-xs gap-1 rounded-sm border-amber-400/40 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400"
                                  onClick={() => handleAddCollabToCRM(index, person, "m2")}
                                  disabled={createClient.isPending}>
                                  <Plus className="h-3 w-3" />М2
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
