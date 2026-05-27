import { Router, type IRouter } from "express";
import { tavily } from "@tavily/core";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVkUserToken } from "../lib/vk-token-store";
import { getGeminiKey } from "../lib/gemini-key-store";

const router: IRouter = Router();

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

async function getGemini() {
  const key = await getGeminiKey();
  if (!key) return null;
  return new GoogleGenerativeAI(key);
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

function extractPhone(text: string): string | null {
  const m = text.match(/(?:\+7|8)[\s(]?\d{3}[)\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
  return m ? m[0] : null;
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

// ─── Fast local query expansion (no AI needed) ──────────────────────────────

function generateCollabQueries(query: string): string[] {
  const q = query.trim();
  // Build 3 targeted search queries from the user's input
  const suffixes = ["блогер инфлюенсер", "TikTok Instagram", "артист музыкант streetwear"];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const sfx of suffixes) {
    const candidate = `${q} ${sfx}`;
    if (!seen.has(candidate)) { seen.add(candidate); result.push(candidate); }
  }
  return result;
}

// ─── Brand context for Gemini ────────────────────────────────────────────────

const BOOOMERANGS_BRAND_CONTEXT = `
=== БРЕНД BOOOMERANGS ===
Booomerangs — российский молодёжный streetwear бренд из Тулы. Продаёт одежду (толстовки, свитшоты, футболки, брюки, куртки, шорты), носки, аксессуары (кружки, ремни, сумки, шапки), а также мерч по лицензии (рэп-артисты, аниме, JDM, уличная культура). Сайт: booomerangs.ru. Целевая аудитория: 18–30 лет, фанаты хип-хопа, стрит-культуры, аниме, автокультуры, молодёжной моды.

=== ПАРТНЁРСКАЯ ПРОГРАММА — КАК РАБОТАЕТ ===
Любой блогер, артист или медийный человек может стать партнёром Booomerangs:
1. Регистрируется на booomerangs.ru/partner/register (Самозанятый / ИП / ООО)
2. Получает персональную страницу на сайте: booomerangs.ru/p/[его-никнейм]
3. Получает уникальную реферальную ссылку и QR-код
4. Зарабатывает комиссию с каждой продажи через его ссылку — прогрессивно: чем больше продаж, тем выше процент
5. Выплата: на карту / СБП / расчётный счёт. Самозанятые загружают чек «Мой налог», ИП/ООО — акт

КЛЮЧЕВЫЕ ПРЕИМУЩЕСТВА ДЛЯ ПАРТНЁРА:
- Своя страница на сайте бренда с личным URL
- Прогрессивная комиссия — растёт с объёмом продаж
- Виджет с товарами — встраивается на любой сайт или в соцсети
- Поддержка через Telegram и VK
- Официальное оформление (договор), полная легальность

=== ПРОГРАММА ДЛЯ АРТИСТОВ (ARTIST PROGRAM) ===
Отдельная программа для музыкантов, рэперов, певцов, творческих личностей:
- Артист создаёт собственный мерч под брендом Booomerangs (коллаборация)
- Получает процент (artistRate) от ВСЕГО оборота своих товаров — не только с реферальных, а со всех продаж
- Своя страница-витрина со своими товарами на сайте
- Совместные промо-материалы, фото, видео
- Идеально для рэперов и музыкантов с лояльной аудиторией

=== ДЛЯ КОГО ПАРТНЁРКА ПОДХОДИТ ЛУЧШЕ ВСЕГО ===
БЛОГЕРЫ (высокий fitScore 8-10): лайфстайл, мода, streetwear, хип-хоп, аниме, авто-культура, молодёжный контент — аудитория 18-30 лет
АРТИСТЫ/МУЗЫКАНТЫ (особенно рэперы): могут создать свой мерч и зарабатывать с его продаж
ТИКТОКЕРЫ/ЮТУБЕРЫ: активная молодая аудитория = высокая конверсия в продажи одежды
СТРИМЕРЫ: мерч + аудитория геймеров которые носят streetwear
ФОТОГРАФЫ/ДИЗАЙНЕРЫ: создание контента, коллаборации по дизайну
МЕДИЙНЫЕ ЛИЧНОСТИ: любой человек с аудиторией 18-30 лет

МЕНЕЕ РЕЛЕВАНТНЫ: детский контент, 50+ аудитория, узкоспециализированные ниши без пересечения с молодёжной модой

=== КАК СЧИТАТЬ fitScore (1-10) ===
+3 если аудитория совпадает с 18-30 лет, мода/стрит/хип-хоп/молодёжь
+2 если много подписчиков или высокая активность
+2 если есть ВКонтакте/Telegram (основные каналы Booomerangs)
+1 если рэпер/артист (может войти в Artist Program)
+1 если город = Россия (выше конверсия)
-2 если совсем не молодёжная аудитория
-1 если нет явных соцсетей

=== КАК ПИСАТЬ ПИТЧ ===
Питч пишется ОТ ИМЕНИ Booomerangs, обращаясь по имени к конкретному человеку/бренду.
Обязательно упомяни:
- Что мы предлагаем (партнёрка или artist program — в зависимости от типа)
- Личная страница на booomerangs.ru/p/[slug]
- Комиссия с продаж (не раскрывай конкретный %)
- Почему именно ОНИ подходят нам (их нишу, аудиторию, стиль)
- Призыв: "Зарегистрируйся на booomerangs.ru/partner/register"
Тон: дружелюбный, уличный, без официоза. Не более 4 предложений.
`;

// ─── Gemini: score & pitch each person ──────────────────────────────────────

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

async function enrichWithGemini(people: CollabPerson[], query: string): Promise<CollabPerson[]> {
  const genAI = await getGemini();
  if (!genAI || people.length === 0) return people;

  const doEnrich = async (): Promise<CollabPerson[]> => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const shortList = people.slice(0, 8).map((p, i) => ({
      i,
      name: p.name,
      type: p.type,
      niche: p.niche,
      followers: p.followersVk || p.followersInstagram,
      description: p.description?.slice(0, 120),
    }));

    const prompt = `${BOOOMERANGS_BRAND_CONTEXT}

=== ТВОЯ ЗАДАЧА ===
Ты — менеджер по коллаборациям Booomerangs. Оцени каждого кандидата и напиши персональный питч.

Поисковый запрос менеджера CRM: "${query}"

Кандидаты (найдены через ВКонтакте / интернет):
${JSON.stringify(shortList, null, 2)}

ВАЖНО:
- Для рэперов/музыкантов — упомяни Artist Program (мерч со своим именем, % от оборота)
- Для блогеров/тиктокеров/ютуберов — упомяни партнёрскую программу (реферальная ссылка, личная страница, % с продаж)
- whyRelevant — объясни конкретно: почему их аудитория совпадает с Booomerangs
- pitch — пиши живо, как будто реально пишешь DM человеку. Упомяни его нишу/контент, предложи конкретную программу
- Используй критерии fitScore из контекста выше

Верни ТОЛЬКО валидный JSON массив (без markdown, без комментариев):
[{"i":0,"fitScore":8,"whyRelevant":"...","pitch":"..."}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
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

// ─── VK groups search ────────────────────────────────────────────────────────

async function searchVkCollab(token: string, queries: string[], niche: string): Promise<CollabPerson[]> {
  const FIELDS = "description,city,links,site,members_count,photo_200,status";
  const seen = new Set<number>();
  const groups: VkGroup[] = [];

  for (const q of queries) {
    try {
      const res = await vkRequest(token, "groups.search", {
        q, type: "page", count: 12, offset: 0, fields: FIELDS,
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

// ─── Tavily fallback ──────────────────────────────────────────────────────────

async function tavilyFallback(queries: string[], niche: string): Promise<CollabPerson[]> {
  const client = getTavily();
  if (!client) return [];

  const seen = new Set<string>();
  const results: CollabPerson[] = [];

  for (const sq of queries) {
    if (results.length >= 10) break;
    try {
      const tr = await client.search(`${sq} блогер артист vk.com инстаграм`, { searchDepth: "basic", maxResults: 6 });
      for (const r of tr.results ?? []) {
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
  }
  return results;
}

// ─── route ──────────────────────────────────────────────────────────────────

router.post("/collab-search", async (req, res): Promise<void> => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) {
    res.status(400).json({ error: "Поле query обязательно" });
    return;
  }

  const niche = guessNiche(query);

  // Query expansion is instant (local), fetch VK token in parallel with nothing to wait for
  const searchQueries = generateCollabQueries(query);
  const token = await getVkUserToken();

  // Run VK and Tavily searches in parallel
  const [vkResults, tavilyResults] = await Promise.all([
    token
      ? searchVkCollab(token, searchQueries, niche).catch(err => {
          console.error("VK collab search failed:", err);
          return [] as CollabPerson[];
        })
      : Promise.resolve([] as CollabPerson[]),
    tavilyFallback(searchQueries, niche).catch(err => {
      console.error("Tavily collab search failed:", err);
      return [] as CollabPerson[];
    }),
  ]);

  // Merge: VK first, then Tavily de-duped by VK link
  const existingVk = new Set(vkResults.map(r => r.vk?.toLowerCase()).filter(Boolean));
  const merged: CollabPerson[] = [...vkResults];
  for (const t of tavilyResults) {
    if (t.vk && existingVk.has(t.vk.toLowerCase())) continue;
    merged.push(t);
  }

  const sources: string[] = [];
  if (vkResults.length > 0) sources.push("ВКонтакте");
  if (tavilyResults.length > 0) sources.push("интернет");
  const source = sources.join(" + ") || "интернет";

  const sliced = merged.slice(0, 12);

  const enriched = await enrichWithGemini(sliced, query);

  const sorted = enriched.sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));

  res.json({
    results: sorted,
    explanation: sorted.length > 0
      ? `Найдено ${sorted.length} кандидатов по запросу «${query}» (${source}, оценено Gemini AI)`
      : "Ничего не найдено. Попробуйте другой запрос — укажите нишу, город или платформу.",
    query,
    searchQueries,
  });
});

export default router;
