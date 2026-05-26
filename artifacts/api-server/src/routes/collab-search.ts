import { Router, type IRouter } from "express";
import { tavily } from "@tavily/core";

const router: IRouter = Router();

function getTavilyClient() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });
}

router.post("/collab-search", async (req, res): Promise<void> => {
  const { query } = req.body as { query?: string };

  if (!query?.trim()) {
    res.status(400).json({ error: "Поле query обязательно" });
    return;
  }

  const client = getTavilyClient();

  const searchQueries = [
    `${query} блогер артист россия instagram vk`,
    `${query} инфлюенсер тиктокер ютубер россия`,
  ];

  const seen = new Set<string>();
  const results: Array<{
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
  }> = [];

  for (const searchQ of searchQueries) {
    try {
      const result = await client.search(searchQ, {
        searchDepth: "basic",
        maxResults: 7,
        includeAnswer: false,
        includeRawContent: false,
      });

      for (const r of (result.results ?? [])) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);

        const title = r.title ?? "";
        const content = r.content ?? "";
        const url = r.url ?? "";

        const instagramMatch = content.match(/instagram\.com\/([\w.]+)/i) ?? title.match(/instagram\.com\/([\w.]+)/i);
        const vkMatch = content.match(/vk\.com\/([\w.]+)/i);
        const tgMatch = content.match(/t\.me\/([\w.]+)/i);
        const ytMatch = content.match(/youtube\.com\/(channel|@[\w.]+|c\/[\w.]+)/i) ?? url.match(/youtube\.com\//i);
        const ttMatch = content.match(/tiktok\.com\/@([\w.]+)/i);
        const emailMatch = content.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);

        const cityPatterns = ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань", "Тула", "Краснодар", "Нижний Новгород"];
        const city = cityPatterns.find(c => content.includes(c) || title.includes(c)) ?? null;

        const typeKeywords: Record<string, string> = {
          рэпер: "рэпер", rapper: "рэпер", музыкант: "музыкант", singer: "музыкант",
          блогер: "блогер", blogger: "блогер", тиктокер: "тиктокер", tiktok: "тиктокер",
          ютубер: "ютубер", youtube: "ютубер", стример: "стример", stream: "стример",
          дизайнер: "дизайнер", фотограф: "фотограф",
        };
        const combined = (title + " " + content).toLowerCase();
        const type = Object.entries(typeKeywords).find(([k]) => combined.includes(k))?.[1] ?? "блогер";

        const followersMatch = content.match(/(\d[\d\s.,]+[kKкKмM]?\s*(подписчик|follower|subscriber))/i);

        results.push({
          name: title.replace(/\s*[-|–]\s*.+$/, "").trim() || "Без имени",
          type,
          niche: query.toLowerCase().includes("мода") ? "мода, стиль" :
                 query.toLowerCase().includes("хип") ? "хип-хоп, музыка" :
                 query.toLowerCase().includes("стрит") ? "стрит-культура" : "лайфстайл",
          city,
          followersInstagram: null,
          followersVk: null,
          instagram: instagramMatch ? `https://instagram.com/${instagramMatch[1]}` : null,
          vk: vkMatch ? `https://vk.com/${vkMatch[1]}` : null,
          telegram: tgMatch ? `https://t.me/${tgMatch[1]}` : null,
          youtube: ytMatch ? url : null,
          tiktok: ttMatch ? `https://tiktok.com/@${ttMatch[1]}` : null,
          email: emailMatch ? emailMatch[0] : null,
          description: content.slice(0, 200) || null,
          whyRelevant: "Возможная аудитория, близкая к целевой аудитории Booomerangs",
        });
      }
    } catch (err) {
      console.error("Tavily collab search error:", err);
    }
  }

  res.json({
    results: results.slice(0, 12),
    explanation: results.length > 0
      ? `Найдено ${results.length} результатов по запросу «${query}»`
      : "Ничего не найдено. Попробуйте другой запрос.",
    query,
  });
});

export default router;
