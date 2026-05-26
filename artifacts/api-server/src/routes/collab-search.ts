import { Router, type IRouter } from "express";
import { tavily } from "@tavily/core";
import { getVkUserToken } from "../lib/vk-token-store";

const router: IRouter = Router();

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

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

// ─── VK groups search for bloggers ──────────────────────────────────────────

async function searchVkCollab(token: string, query: string, niche: string) {
  const FIELDS = "description,city,links,site,members_count,photo_200,status";
  const seen = new Set<number>();
  const groups: VkGroup[] = [];

  // Несколько запросов под разные платформы/роли
  const queries = [
    query,
    `${query} блогер`,
    `${query} артист`,
  ];

  for (const q of queries) {
    try {
      const res = await vkRequest(token, "groups.search", {
        q,
        type: "page",        // публичные страницы (паблики артистов/блогеров)
        count: 15,
        offset: 0,
        fields: FIELDS,
      }) as { items: VkGroup[] } | null;

      for (const g of res?.items ?? []) {
        if (!seen.has(g.id)) {
          seen.add(g.id);
          groups.push(g);
        }
      }
    } catch (err) {
      console.error("VK groups.search error:", q, err);
    }
  }

  // Фильтруем: только страницы, которые выглядят как блогер/артист
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
      phone: extractPhone(fullText),
      description: (g.description ?? g.status ?? "").slice(0, 200) || null,
      sourceUrl: `https://vk.com/${g.screen_name}`,
    };
  });
}

// ─── Tavily fallback (когда VK не подключён) ─────────────────────────────────

async function tavilyFallback(query: string, niche: string) {
  const client = getTavily();
  if (!client) return [];

  const seen = new Set<string>();
  type R = Awaited<ReturnType<typeof searchVkCollab>>[number];
  const results: R[] = [];

  for (const sq of [
    `${query} блогер артист vk.com инстаграм`,
    `site:vk.com ${query} артист блогер`,
  ]) {
    if (results.length >= 10) break;
    try {
      const tr = await client.search(sq, { searchDepth: "basic", maxResults: 8 });
      for (const r of tr.results ?? []) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);

        const allText = `${r.title ?? ""} ${r.content ?? ""}`;

        // Извлекаем VK ссылку только если это чистый профиль
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

        // Имя: чистим тайтл
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
          phone: extractPhone(allText),
          description: (r.content ?? "").slice(0, 180) || null,
          sourceUrl: r.url,
        });
      }
    } catch (err) {
      console.error("Tavily collab error:", err);
    }
  }
  return results;
}

function getTavily() {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  return tavily({ apiKey: key });
}

// ─── route ──────────────────────────────────────────────────────────────────

router.post("/collab-search", async (req, res): Promise<void> => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) {
    res.status(400).json({ error: "Поле query обязательно" });
    return;
  }

  const niche = guessNiche(query);
  type R = Awaited<ReturnType<typeof searchVkCollab>>[number];
  let results: R[] = [];
  let source = "интернет";

  const token = await getVkUserToken();

  if (token) {
    try {
      results = await searchVkCollab(token, query, niche);
      source = "ВКонтакте";
    } catch (err) {
      console.error("VK collab search failed:", err);
    }
  }

  // Дополняем Tavily если VK дал мало результатов
  if (results.length < 6) {
    const tavilyRes = await tavilyFallback(query, niche);
    const existingVk = new Set(results.map(r => r.vk?.toLowerCase()).filter(Boolean));
    for (const t of tavilyRes) {
      if (t.vk && existingVk.has(t.vk.toLowerCase())) continue;
      results.push(t);
    }
    if (tavilyRes.length > 0 && results.length > 0) source = token ? "ВКонтакте + интернет" : "интернет";
  }

  const final = results.slice(0, 15);

  res.json({
    results: final,
    explanation: final.length > 0
      ? `Найдено ${final.length} результатов по запросу «${query}» (${source})`
      : "Ничего не найдено. Попробуйте другой запрос — укажите нишу, город или платформу.",
    query,
  });
});

export default router;
