import { Router, type IRouter } from "express";
import { tavily } from "@tavily/core";
import { getVkUserToken } from "../lib/vk-token-store";
import { getGeminiKey } from "../lib/gemini-key-store";
import { generateWithFallback } from "../lib/gemini-client";

const router: IRouter = Router();

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

async function getGeminiApiKey(): Promise<string | null> {
  return getGeminiKey();
}

function getTavily() {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  return tavily({ apiKey: key });
}

// ─── VK helpers ─────────────────────────────────────────────────────────────

async function vkRequest(token: string, method: string, params: Record<string, string | number>) {
  const url = new URL(`${VK_API}/${method}`);
  url.searchParams.set("v", VK_VERSION);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());
  const json = await res.json() as { response?: unknown; error?: { error_msg: string } };
  if (json.error) throw new Error(`VK API: ${json.error.error_msg}`);
  return json.response;
}

interface VkGroup {
  id: number;
  name: string;
  screen_name: string;
  description?: string;
  status?: string;
  city?: { id: number; title: string };
  links?: Array<{ url: string }>;
  site?: string;
  members_count?: number;
  photo_200?: string;
}

const COLLAB_GROUP_TYPES = [
  "рэпер", "артист", "музыкант", "певец", "певица", "блогер", "blogger",
  "tiktok", "тикток", "youtube", "ютуб", "инфлюенсер", "influencer",
  "стример", "дизайнер", "фотограф", "контент", "creator", "креатор",
  "стрит", "streetwear", "streetstyle", "fashion", "мода",
];

function isCollabPage(group: VkGroup): boolean {
  const text = [group.name, group.description, group.status].join(" ").toLowerCase();
  return COLLAB_GROUP_TYPES.some(kw => text.includes(kw));
}

function extractEmail(text: string): string | null {
  const m = text.match(/[\w.+-]{2,}@[\w-]{2,}\.[a-z]{2,}/i);
  return m ? m[0] : null;
}

function extractInstagram(text: string, links: VkGroup["links"]): string | null {
  for (const link of links ?? []) {
    if (link.url?.includes("instagram.com") || link.url?.includes("instagr.am")) return link.url;
  }
  const m = text.match(/instagram\.com\/((?!p\/|reel\/)[A-Za-z0-9_.]{2,30})/i);
  if (m) return `https://instagram.com/${m[1]}`;
  const at = text.match(/(?:instagram|инстаграм|insta)[:\s@]+@?([A-Za-z0-9_.]{3,30})/i);
  if (at) return `https://instagram.com/${at[1]}`;
  return null;
}

function extractTelegram(text: string, links: VkGroup["links"]): string | null {
  for (const link of links ?? []) {
    if (link.url?.includes("t.me") || link.url?.includes("telegram.me")) return link.url;
  }
  const m = text.match(/t\.me\/([A-Za-z0-9_]{4,32})/i);
  if (m) return `https://t.me/${m[1]}`;
  return null;
}

function extractYoutube(text: string, links: VkGroup["links"]): string | null {
  for (const link of links ?? []) {
    if (link.url?.includes("youtube.com") || link.url?.includes("youtu.be")) return link.url;
  }
  const m = text.match(/(https?:\/\/(?:www\.)?youtube\.com\/(?:@[\w.]+|channel\/[\w-]+|c\/[\w-]+))/i);
  return m ? m[1] : null;
}

function extractTiktok(text: string, links: VkGroup["links"]): string | null {
  for (const link of links ?? []) {
    if (link.url?.includes("tiktok.com")) return link.url;
  }
  const m = text.match(/tiktok\.com\/@([A-Za-z0-9_.]{2,30})/i);
  if (m) return `https://tiktok.com/@${m[1]}`;
  return null;
}

function guessType(text: string): string {
  const t = text.toLowerCase();
  if (/рэп|rapper|rap|хип.хоп|hip.hop|\bmc\b|трек|альбом/.test(t)) return "рэпер";
  if (/музыкант|певец|певица|артист|исполнитель|singer|music/.test(t)) return "музыкант";
  if (/tiktok\.com|тиктокер|tiktok/.test(t)) return "тиктокер";
  if (/youtube|ютубер|youtuber/.test(t)) return "ютубер";
  if (/стример|twitch/.test(t)) return "стример";
  if (/дизайнер|design/.test(t)) return "дизайнер";
  if (/фотограф|photographer/.test(t)) return "фотограф";
  return "блогер";
}

function guessNiche(query: string): string {
  const q = query.toLowerCase();
  if (/хип.хоп|рэп|rap/.test(q)) return "хип-хоп, рэп";
  if (/streetwear|стрит|уличн/.test(q)) return "стрит-культура, мода";
  if (/мода|fashion|style|стиль/.test(q)) return "мода, стиль";
  if (/спорт|фитнес|sport/.test(q)) return "спорт, фитнес";
  if (/музык|artis|певец|рэп/.test(q)) return "музыка";
  return "лайфстайл";
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ─── Brand context for Gemini ────────────────────────────────────────────────

const BOOOMERANGS_BRAND_CONTEXT = `
=== БРЕНД BOOOMERANGS ===
Booomerangs — российский молодёжный бренд из Тулы. Производит и продаёт одежду (толстовки, свитшоты, футболки, брюки, куртки, шорты), носки, аксессуары (кружки, ремни, сумки, шапки), а также авторский мерч для партнёров. Сайт: booomerangs.ru. Аудитория: 18–30 лет.

=== КОЛЛАБОРАЦИЯ — КАК РАБОТАЕТ (ГЛАВНОЕ ПРЕДЛОЖЕНИЕ) ===
Booomerangs предлагает артистам, музыкантам, блогерам и медийным личностям создать совместный авторский мерч:
- Мы берём весь цикл производства на себя — БЕСПЛАТНО для партнёра
- Вместе обговариваем детали и дизайны (партнёр участвует в создании)
- Готовый мерч продаётся на booomerangs.ru на персональной странице партнёра
- Партнёр зарабатывает комиссию с каждой продажи (ставка обсуждается индивидуально)

ЧТО ПОЛУЧАЕТ ПАРТНЁР:
- Своя именная страница: booomerangs.ru/@никнейм (персональный лендинг: фото, описание, соцсети, галерея)
- Витрина мерча — все товары коллаборации на одной странице
- Именной промокод со скидкой для подписчиков
- Аналитика в реальном времени: просмотры, заказы, выручка
- Виджет с товарами — встраивается на любой сайт или соцсеть
- Выплаты официально: самозанятый / ИП / ООО, на карту или расчётный счёт

ПРОГРЕССИВНАЯ КОМИССИЯ:
- До 10 000 ₽ оборота в месяц — 15%
- 10 000–19 999 ₽ — 20%
- От 20 000 ₽ — 25%
При росте оборота ставка пересчитывается ретроактивно за весь месяц.

=== ДЛЯ КОГО ПРЕДЛОЖЕНИЕ ===
Целевые партнёры: артисты, музыканты, блогеры, инфлюенсеры, паблики с большой аудиторией.
Подходит любая ниша — музыка, юмор, авто, геймеры, спорт, аниме, путешествия, кулинария — главное, что аудитория молодая (18-30 лет) и активная.
НЕ упоминать тематику стрита, уличной одежды или streetwear — это не наш фокус в питче.

=== КАК СЧИТАТЬ fitScore (1-10) ===
+3 если аудитория молодёжная (18-30 лет), активная
+2 если большая аудитория или высокая вовлечённость (артист, блогер, паблик)
+2 если есть ВКонтакте/Telegram/Инстаграм (основные каналы Booomerangs)
+1 если аудитория из России (выше конверсия)
+1 если человек уже связан с творчеством, музыкой, медиа — есть потенциал для авторского мерча
-2 если аудитория явно не молодёжная (дети или 50+)
-1 если нет явных соцсетей или контактов

=== КАК ПИСАТЬ ПИТЧ ===
Питч пишется ОТ ИМЕНИ Booomerangs, обращаясь лично к человеку/сообществу.
Обязательно:
- Упомяни их конкретный контент/деятельность — покажи, что мы знаем кто они
- Предложи коллаборацию: мы берём производство мерча на себя бесплатно, вместе обсуждаем дизайны; мерч продаётся на их странице booomerangs.ru/@никнейм, плюс они могут разместить виджет с кнопкой «Купить» прямо на своём сайте или соцсетях — комиссия идёт с каждой продажи
- Заканчивай вопросом — интересно ли им это предложение? Скажи, что если да — мы сами поможем со всем и всё объясним. Ссылку на регистрацию НЕ давать.
НЕ упоминать streetwear, уличный стиль, уличную культуру.
Тон: живой, дружелюбный, как будто пишет живой человек. Не более 4 предложений.
`;

// ─── Types ───────────────────────────────────────────────────────────────────

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
  fitScore?: number | null;
  pitch?: string | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ─── Gemini: PRIMARY search — generates real candidates directly ──────────────

async function geminiDirectSearch(query: string, excludeNames: string[]): Promise<CollabPerson[]> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) return [];

  const excludeBlock = excludeNames.length > 0
    ? `\nУЖЕ ПОКАЗАНЫ — НЕ ВКЛЮЧАЙ ИХ НИ В КАКОМ ВИДЕ:\n${excludeNames.slice(0, 60).join("\n")}\n`
    : "";

  const prompt = `${BOOOMERANGS_BRAND_CONTEXT}
Ты — эксперт по российскому интернету, блогосфере и музыкальной индустрии.

Запрос менеджера по коллаборациям: "${query}"
${excludeBlock}
Найди ровно 12 РЕАЛЬНЫХ людей / аккаунтов / групп, которые максимально подходят под этот запрос.
Это должны быть реальные персонажи с реальными страницами в соцсетях.
Будь конкретным — указывай реальные никнеймы и ссылки которые ты знаешь.
Разнообразь результаты: разные масштабы (микро и крупные), разные платформы, разные города.

Верни ТОЛЬКО валидный JSON массив без markdown и без пояснений:
[
  {
    "name": "Полное имя или название группы/аккаунта",
    "type": "рэпер|музыкант|блогер|тиктокер|ютубер|артист|стример|дизайнер|фотограф|инфлюенсер",
    "niche": "краткое описание ниши (2-5 слов)",
    "city": "город (если знаешь, иначе null)",
    "vk": "https://vk.com/nickname или null",
    "instagram": "https://instagram.com/nickname или null",
    "telegram": "https://t.me/nickname или null",
    "youtube": "https://youtube.com/@nickname или null",
    "tiktok": "https://tiktok.com/@nickname или null",
    "followersInstagram": "примерное число: '50K', '1.2M' или null",
    "followersVk": "примерное число участников сообщества или null",
    "description": "1-2 предложения кто это и чем занимается"
  }
]`;

  const doSearch = async (): Promise<CollabPerson[]> => {
    const text = await generateWithFallback(apiKey, prompt);
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const items = JSON.parse(match[0]) as Array<{
      name: string; type?: string; niche?: string; city?: string;
      vk?: string; instagram?: string; telegram?: string; youtube?: string; tiktok?: string;
      followersInstagram?: string; followersVk?: string; description?: string;
    }>;

    const excludeSet = new Set(excludeNames.map(n => n.toLowerCase().trim()));

    return items
      .filter(item => item.name && !excludeSet.has(item.name.toLowerCase().trim()))
      .map(item => ({
        name: item.name,
        type: item.type ?? null,
        niche: item.niche ?? null,
        city: item.city ?? null,
        vk: item.vk ?? null,
        instagram: item.instagram ?? null,
        telegram: item.telegram ?? null,
        youtube: item.youtube ?? null,
        tiktok: item.tiktok ?? null,
        followersInstagram: item.followersInstagram ?? null,
        followersVk: item.followersVk ?? null,
        email: null,
        description: item.description ?? null,
        whyRelevant: null,
        fitScore: null,
        pitch: null,
      }));
  };

  try {
    return await withTimeout(doSearch(), 30_000, []);
  } catch (err) {
    console.error("Gemini direct search error:", err);
    return [];
  }
}

// ─── Gemini: score & pitch each person ──────────────────────────────────────

async function enrichWithGemini(people: CollabPerson[], query: string): Promise<CollabPerson[]> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey || people.length === 0) return people;

  const doEnrich = async (): Promise<CollabPerson[]> => {
    const shortList = people.slice(0, 12).map((p, i) => ({
      i,
      name: p.name,
      type: p.type,
      niche: p.niche,
      city: p.city,
      followers: p.followersVk || p.followersInstagram,
      socials: [p.vk, p.instagram, p.telegram].filter(Boolean).join(", "),
      description: p.description?.slice(0, 120),
    }));

    const prompt = `${BOOOMERANGS_BRAND_CONTEXT}

=== ТВОЯ ЗАДАЧА ===
Ты — менеджер по коллаборациям Booomerangs. Оцени каждого кандидата и напиши персональный питч.

Поисковый запрос менеджера CRM: "${query}"

Кандидаты:
${JSON.stringify(shortList, null, 2)}

ВАЖНО:
- whyRelevant — объясни конкретно почему их аудитория и тематика совпадают с Booomerangs
- pitch — пиши живо, как будто реально пишешь DM человеку. Упомяни их конкретную тему/контент, предложи партнёрку или творческую коллаборацию в зависимости от того, кто они
- fitScore считай строго по критериям из контекста выше — не завышай всем подряд
- Не привязывайся к жанрам и направлениям — мы работаем со всеми

Верни ТОЛЬКО валидный JSON массив (без markdown, без комментариев):
[{"i":0,"fitScore":8,"whyRelevant":"...","pitch":"..."}]`;

    const text = await generateWithFallback(apiKey, prompt);
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return people;

    const enriched = JSON.parse(match[0]) as Array<{ i: number; fitScore: number; whyRelevant: string; pitch: string }>;
    const map = new Map(enriched.map(e => [e.i, e]));
    return people.map((p, i) => {
      const e = map.get(i);
      if (!e) return p;
      return { ...p, fitScore: e.fitScore, whyRelevant: e.whyRelevant, pitch: e.pitch };
    });
  };

  try {
    return await withTimeout(doEnrich(), 50_000, people);
  } catch (err) {
    console.error("Gemini enrich error:", err);
    return people;
  }
}

// ─── VK: validate and fix Gemini's VK links ──────────────────────────────────

async function resolveVkScreenName(
  token: string,
  screenName: string,
): Promise<{ type: string; object_id: number } | null> {
  try {
    const r = await vkRequest(token, "utils.resolveScreenName", { screen_name: screenName });
    if (!r || typeof r !== "object") return null;
    const obj = r as Record<string, unknown>;
    if (!obj.object_id) return null;
    return { type: String(obj.type ?? "group"), object_id: Number(obj.object_id) };
  } catch {
    return null;
  }
}

async function searchVkGroupByName(
  token: string,
  name: string,
): Promise<{ screen_name: string; members_count: number } | null> {
  try {
    const r = await vkRequest(token, "groups.search", {
      q: name, count: 3, sort: 0, fields: "members_count",
    }) as { count: number; items: Array<{ screen_name: string; members_count?: number }> };
    if (r?.items?.length > 0) {
      const g = r.items[0];
      return { screen_name: g.screen_name, members_count: g.members_count ?? 0 };
    }
  } catch {}
  return null;
}

async function validateAndFixVkLinks(
  people: CollabPerson[],
  token: string,
): Promise<CollabPerson[]> {
  return Promise.all(
    people.map(async (person): Promise<CollabPerson> => {
      if (!person.vk) return person;

      const screenName = person.vk
        .replace(/https?:\/\/vk\.com\//, "")
        .replace(/\/$/, "")
        .trim();

      if (!screenName) return person;

      // 1. Проверяем ссылку через VK API
      const resolved = await resolveVkScreenName(token, screenName);
      if (resolved?.object_id) {
        // Ссылка валидна — для группы подтягиваем реальное кол-во участников
        if (resolved.type === "group" || resolved.type === "page") {
          try {
            const gr = await vkRequest(token, "groups.getById", {
              group_id: resolved.object_id,
              fields: "members_count,screen_name",
            }) as { groups?: Array<{ screen_name: string; members_count?: number }> } | Array<{ screen_name: string; members_count?: number }>;
            const items = Array.isArray(gr)
              ? gr
              : ((gr as { groups?: Array<{ screen_name: string; members_count?: number }> }).groups ?? []);
            const g = items[0];
            if (g) {
              return {
                ...person,
                vk: `https://vk.com/${g.screen_name}`,
                followersVk: g.members_count ? formatFollowers(g.members_count) : person.followersVk,
              };
            }
          } catch {}
        }
        return person;
      }

      // 2. Ссылка невалидна — ищем группу по имени артиста
      const found = await searchVkGroupByName(token, person.name);
      if (found) {
        return {
          ...person,
          vk: `https://vk.com/${found.screen_name}`,
          followersVk: found.members_count > 0 ? formatFollowers(found.members_count) : person.followersVk,
        };
      }

      // 3. Ничего не найдено — убираем неверную ссылку
      return { ...person, vk: null };
    }),
  );
}

// ─── VK groups search ────────────────────────────────────────────────────────

async function searchVkCollab(token: string, queries: string[], niche: string): Promise<CollabPerson[]> {
  const FIELDS = "description,city,links,site,members_count,photo_200,status";
  const seen = new Set<number>();
  const groups: VkGroup[] = [];

  for (const q of queries) {
    try {
      const res = await vkRequest(token, "groups.search", {
        q, type: "page", count: 10, offset: 0, fields: FIELDS,
      }) as { items: VkGroup[] } | null;

      for (const g of res?.items ?? []) {
        if (!seen.has(g.id)) { seen.add(g.id); groups.push(g); }
      }
    } catch (err) {
      console.error("VK groups.search error:", q, err);
    }
  }

  const filtered = groups.filter(g => isCollabPage(g));

  return filtered.map(g => {
    const fullText = [g.name, g.description, g.status].filter(Boolean).join(" ");
    return {
      name: g.name,
      type: guessType(fullText),
      niche,
      city: g.city?.title ?? null,
      followersInstagram: null,
      followersVk: g.members_count ? formatFollowers(g.members_count) : null,
      instagram: extractInstagram(fullText, g.links),
      vk: `https://vk.com/${g.screen_name}`,
      telegram: extractTelegram(fullText, g.links),
      youtube: extractYoutube(fullText, g.links),
      tiktok: extractTiktok(fullText, g.links),
      email: extractEmail(fullText),
      description: (g.description ?? g.status ?? "").slice(0, 200) || null,
      whyRelevant: null,
      fitScore: null,
      pitch: null,
    };
  });
}

// ─── Tavily supplemental search ───────────────────────────────────────────────

async function tavilySearch(query: string, niche: string): Promise<CollabPerson[]> {
  const client = getTavily();
  if (!client) return [];

  const seen = new Set<string>();
  const results: CollabPerson[] = [];

  const searchQuery = `${query} блогер артист vk.com инстаграм`;
  try {
    const tr = await client.search(searchQuery, { searchDepth: "basic", maxResults: 8 });
    for (const r of tr.results ?? []) {
      if (results.length >= 8) break;
      if (seen.has(r.url)) continue;
      seen.add(r.url);

      const allText = `${r.title ?? ""} ${r.content ?? ""}`;

      let vk: string | null = null;
      try {
        const u = new URL(r.url);
        if (u.hostname.replace(/^www\./, "") === "vk.com") {
          const seg = u.pathname.replace(/\/$/, "").split("/").filter(Boolean)[0];
          if (seg && !/^(wall|video|photo|album|doc|feed|login|away)/.test(seg) && !seg.includes("_")) {
            vk = `https://vk.com/${seg}`;
          }
        }
      } catch {}

      const instagram = extractInstagram(allText, []);
      const tg = extractTelegram(allText, []);
      const yt = extractYoutube(allText, []);
      const tt = extractTiktok(allText, []);

      let name = (r.title ?? "")
        .replace(/\s*[-|–—•·:]\s*.{0,80}$/, "")
        .replace(/\s*\|\s*(ВКонтакте|VK|TikTok|YouTube).*$/i, "")
        .replace(/\s*•\s*Instagram.*$/i, "")
        .trim();

      if (!name || name.length < 3 || name.length > 60) continue;
      if (name.includes("#") || /^(как|когда|что|вот|мой|топ\b|это )/i.test(name)) continue;
      if (name.split(/\s+/).length > 6) continue;

      const dedup = vk ?? instagram ?? name.toLowerCase();
      if (seen.has(`dd:${dedup}`)) continue;
      seen.add(`dd:${dedup}`);

      results.push({
        name,
        type: guessType(allText),
        niche,
        city: null,
        followersInstagram: null,
        followersVk: null,
        instagram,
        vk,
        telegram: tg,
        youtube: yt,
        tiktok: tt,
        email: extractEmail(allText),
        description: (r.content ?? "").slice(0, 180) || null,
        whyRelevant: null,
        fitScore: null,
        pitch: null,
      });
    }
  } catch (err) {
    console.error("Tavily collab error:", err);
  }
  return results;
}

// ─── route ──────────────────────────────────────────────────────────────────

router.post("/collab-search", async (req, res): Promise<void> => {
  const { query, excludeNames = [] } = req.body as { query?: string; excludeNames?: string[] };
  if (!query?.trim()) {
    res.status(400).json({ error: "Поле query обязательно" });
    return;
  }

  const niche = guessNiche(query);
  const token = await getVkUserToken();

  // VK queries for supplemental search
  const vkQueries = [
    `${query} блогер инфлюенсер`,
    `${query} TikTok Instagram`,
  ];

  // Run ALL sources in parallel: Gemini (primary) + VK + Tavily (supplemental)
  const [geminiResults, vkResults, tavilyResults] = await Promise.all([
    geminiDirectSearch(query, excludeNames).catch(err => {
      console.error("Gemini direct search failed:", err);
      return [] as CollabPerson[];
    }),
    token
      ? searchVkCollab(token, vkQueries, niche).catch(err => {
          console.error("VK collab search failed:", err);
          return [] as CollabPerson[];
        })
      : Promise.resolve([] as CollabPerson[]),
    tavilySearch(query, niche).catch(err => {
      console.error("Tavily collab search failed:", err);
      return [] as CollabPerson[];
    }),
  ]);

  // Валидируем VK-ссылки из Gemini (AI часто галлюцинирует screen_name)
  const validatedGemini = token
    ? await validateAndFixVkLinks(geminiResults, token).catch(() => geminiResults)
    : geminiResults;

  // Merge: Gemini first (primary), then VK, then Tavily — deduplicate by name & vk link
  const seenNames = new Set<string>(excludeNames.map(n => n.toLowerCase().trim()));
  const seenVk = new Set<string>(validatedGemini.map(r => r.vk?.toLowerCase()).filter(Boolean) as string[]);

  const merged: CollabPerson[] = [...validatedGemini];
  seenNames.clear();
  for (const p of validatedGemini) seenNames.add(p.name.toLowerCase().trim());

  for (const p of [...vkResults, ...tavilyResults]) {
    const nameLow = p.name.toLowerCase().trim();
    if (seenNames.has(nameLow)) continue;
    if (p.vk && seenVk.has(p.vk.toLowerCase())) continue;
    // Also skip if name matches any excludeNames
    if (excludeNames.some(ex => ex.toLowerCase().trim() === nameLow)) continue;
    seenNames.add(nameLow);
    if (p.vk) seenVk.add(p.vk.toLowerCase());
    merged.push(p);
  }

  const sources: string[] = [];
  if (geminiResults.length > 0) sources.push("Gemini AI");
  if (vkResults.length > 0) sources.push("ВКонтакте");
  if (tavilyResults.length > 0) sources.push("интернет");
  const source = sources.join(" + ") || "Gemini AI";

  // Enrich top results with fitScore and pitch
  const sliced = merged.slice(0, 12);
  const enriched = await enrichWithGemini(sliced, query);
  const sorted = enriched.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));

  const isRepeat = excludeNames.length > 0;
  res.json({
    results: sorted,
    explanation: sorted.length > 0
      ? isRepeat
        ? `Найдено ещё ${sorted.length} новых кандидатов по запросу «${query}» (${source})`
        : `Найдено ${sorted.length} кандидатов по запросу «${query}» (${source})`
      : "Ничего не найдено. Попробуйте другой запрос — укажите нишу, город или платформу.",
    query,
  });
});

export default router;
