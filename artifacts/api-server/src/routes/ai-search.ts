import { Router, type IRouter } from "express";
import { AiSearchClientsBody } from "@workspace/api-zod";
import { tavily } from "@tavily/core";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: IRouter = Router();

function getTavilyClient() {
  return tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

async function generateSearchQueries(query: string): Promise<string[]> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Ты помощник для поиска B2B клиентов в сфере оптовой торговли одеждой.
Пользователь ищет: "${query}"

Сгенерируй 3 поисковых запроса на русском языке для поиска магазинов, бутиков и шоурумов в этой нише.
Запросы должны помочь найти контакты (телефоны, сайты, соцсети).

Верни ТОЛЬКО JSON массив строк, без пояснений:
["запрос 1", "запрос 2", "запрос 3"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const queries = JSON.parse(jsonMatch[0]) as string[];
      return queries.slice(0, 3);
    }
  } catch (err) {
    console.error("Gemini query generation error:", err);
  }
  return [
    `${query} магазин одежды сайт контакты`,
    `${query} vk.com instagram магазин`,
    `${query} шоурум бутик телефон`,
  ];
}

async function extractWithGemini(results: Array<{ title: string; content: string; url: string }>, query: string) {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const rawData = results.map((r, i) =>
      `[${i}] Заголовок: ${r.title}\nURL: ${r.url}\nТекст: ${r.content.slice(0, 500)}`
    ).join("\n\n---\n\n");

    const prompt = `Ты помощник для извлечения контактных данных компаний из текстов.
Ниша поиска: "${query}"

Из каждого фрагмента извлеки данные о компании. Верни ТОЛЬКО JSON массив объектов:

${rawData}

Формат каждого объекта:
{
  "companyName": "название компании (не сайт, не URL)",
  "city": "город или null",
  "phone": "номер телефона в формате +7... или null",
  "website": "URL сайта или null",
  "category": "тип бизнеса (магазин/бутик/шоурум/оптовик) или null",
  "description": "краткое описание до 150 символов или null",
  "sourceUrl": "исходный URL",
  "instagram": "https://instagram.com/... или null",
  "vk": "https://vk.com/... или null",
  "telegram": "https://t.me/... или null"
}

Верни ТОЛЬКО JSON массив, без пояснений. Пропускай нерелевантные результаты (агрегаторы, маркетплейсы без конкретной компании).`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Array<{
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
      }>;
    }
  } catch (err) {
    console.error("Gemini extraction error:", err);
  }
  return null;
}

router.post("/ai-search", async (req, res): Promise<void> => {
  const parsed = AiSearchClientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query } = parsed.data;
  const client = getTavilyClient();

  const searchQueries = await generateSearchQueries(query);

  const seen = new Set<string>();
  const rawResults: Array<{ title: string; content: string; url: string }> = [];

  for (const searchQ of searchQueries) {
    try {
      const result = await client.search(searchQ, {
        searchDepth: "basic",
        maxResults: 5,
        includeAnswer: false,
        includeRawContent: false,
      });

      for (const r of (result.results ?? [])) {
        if (seen.has(r.url)) continue;
        seen.add(r.url);
        rawResults.push({
          title: r.title ?? "",
          content: r.content ?? "",
          url: r.url ?? "",
        });
      }
    } catch (err) {
      console.error("Tavily search error:", err);
    }
  }

  const geminiResults = rawResults.length > 0
    ? await extractWithGemini(rawResults, query)
    : null;

  const internetResults = geminiResults ?? rawResults.map(r => {
    const instagramMatch = r.content.match(/instagram\.com\/([\w.]+)/i);
    const vkMatch = r.content.match(/vk\.com\/([\w.]+)/i);
    const tgMatch = r.content.match(/t\.me\/([\w.]+)/i);
    const phoneMatch = r.content.match(/(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
    const cityPatterns = ["Москва", "Санкт-Петербург", "Екатеринбург", "Новосибирск", "Казань", "Тула", "Краснодар", "Нижний Новгород"];
    const city = cityPatterns.find(c => r.content.includes(c) || r.title.includes(c)) ?? null;
    return {
      companyName: r.title.replace(/\s*[-|–]\s*.+$/, "").trim() || "Без названия",
      city,
      phone: phoneMatch ? phoneMatch[0] : null,
      website: r.url.startsWith("http") ? r.url : null,
      category: "магазин одежды",
      description: r.content.slice(0, 200) || null,
      sourceUrl: r.url || null,
      instagram: instagramMatch ? `https://instagram.com/${instagramMatch[1]}` : null,
      vk: vkMatch ? `https://vk.com/${vkMatch[1]}` : null,
      telegram: tgMatch ? `https://t.me/${tgMatch[1]}` : null,
    };
  });

  res.json({
    internetResults: internetResults.slice(0, 10),
    explanation: internetResults.length > 0
      ? `Найдено ${internetResults.length} результатов по запросу «${query}» (обработано Gemini AI)`
      : "Ничего не найдено. Попробуйте другой запрос.",
    query,
    searchQueries,
  });
});

export default router;
