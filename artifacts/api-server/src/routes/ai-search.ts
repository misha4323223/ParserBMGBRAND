import { Router, type IRouter } from "express";
import { AiSearchClientsBody } from "@workspace/api-zod";
import { tavily } from "@tavily/core";

const router: IRouter = Router();

function getTavilyClient() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });
}

router.post("/ai-search", async (req, res): Promise<void> => {
  const parsed = AiSearchClientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query } = parsed.data;
  const client = getTavilyClient();

  const searchQueries = [
    `${query} магазин одежды сайт контакты`,
    `${query} vk.com instagram магазин`,
  ];

  const seen = new Set<string>();
  const internetResults: Array<{
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
        const vkMatch = content.match(/vk\.com\/([\w.]+)/i) ?? title.match(/vk\.com\/([\w.]+)/i);
        const tgMatch = content.match(/t\.me\/([\w.]+)/i);
        const phoneMatch = content.match(/(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);

        const cityPatterns = ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань", "Тула", "Краснодар", "Нижний Новгород"];
        const city = cityPatterns.find(c => content.includes(c) || title.includes(c)) ?? null;

        internetResults.push({
          companyName: title.replace(/\s*[-|–]\s*.+$/, "").trim() || "Без названия",
          city,
          phone: phoneMatch ? phoneMatch[0] : null,
          website: url.startsWith("http") ? url : null,
          category: query.toLowerCase().includes("бутик") ? "бутик" : query.toLowerCase().includes("шоурум") ? "шоурум" : "магазин одежды",
          description: content.slice(0, 200) || null,
          sourceUrl: url || null,
          instagram: instagramMatch ? `https://instagram.com/${instagramMatch[1]}` : null,
          vk: vkMatch ? `https://vk.com/${vkMatch[1]}` : null,
          telegram: tgMatch ? `https://t.me/${tgMatch[1]}` : null,
        });
      }
    } catch (err) {
      console.error("Tavily search error:", err);
    }
  }

  res.json({
    internetResults: internetResults.slice(0, 10),
    explanation: internetResults.length > 0
      ? `Найдено ${internetResults.length} результатов по запросу «${query}»`
      : "Ничего не найдено. Попробуйте другой запрос.",
    query,
  });
});

export default router;
