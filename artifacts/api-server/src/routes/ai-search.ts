import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { AiSearchClientsBody } from "@workspace/api-zod";
import { tavily } from "@tavily/core";

const router: IRouter = Router();

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });

router.post("/ai-search", async (req, res): Promise<void> => {
  const parsed = AiSearchClientsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query } = parsed.data;

  const searchQueries = [
    `${query} магазин одежды сайт контакты телефон`,
    `${query} vk.com группа вконтакте магазин одежды`,
    `${query} instagram магазин одежды @`,
  ];

  let allSearchContent = "";

  for (const searchQ of searchQueries) {
    try {
      const tavilyResult = await tavilyClient.search(searchQ, {
        searchDepth: "advanced",
        maxResults: 5,
        includeAnswer: true,
        includeRawContent: false,
      });

      if (tavilyResult.answer) {
        allSearchContent += `\nОтвет по запросу "${searchQ}":\n${tavilyResult.answer}\n`;
      }

      if (tavilyResult.results?.length) {
        for (const r of tavilyResult.results.slice(0, 5)) {
          allSearchContent += `\n--- Источник: ${r.url}\nЗаголовок: ${r.title}\nОписание: ${r.content?.slice(0, 600) ?? ""}\n`;
        }
      }
    } catch (err) {
      console.error("Tavily search error:", err);
    }
  }

  if (!allSearchContent) {
    res.json({
      internetResults: [],
      explanation: "Не удалось получить данные из интернета. Попробуйте другой запрос.",
      query,
    });
    return;
  }

  const systemPrompt = `Ты — AI-ассистент для CRM системы бренда Booomerangs (тульский бренд одежды).
Твоя задача: на основе данных из интернета найти потенциальных оптовых клиентов — магазины, шоурумы, бутики, стрит-шопы, которые могут быть заинтересованы в закупке одежды.

Данные из интернета:
${allSearchContent}

Для каждой найденной компании извлеки:
- companyName: название (обязательно)
- city: город
- phone: телефон (форматы: +7..., 8-..., (код)...)
- website: сайт (https://...)
- category: тип (стрит-шоп, бутик, онлайн-магазин, шоурум, маркетплейс)
- description: 1-2 предложения почему подходят Booomerangs
- sourceUrl: ссылка-источник
- instagram: ссылка или @никнейм (искать в тексте: instagram.com/..., @название)
- vk: ссылка или id группы ВКонтакте (искать: vk.com/..., vk.com/public...)
- telegram: ссылка или @никнейм телеграм (искать: t.me/..., @название)

ВАЖНО: Тщательно ищи соцсети в тексте — ссылки на vk.com, instagram.com, t.me, упоминания @никнеймов.

Верни СТРОГО JSON:
{
  "results": [
    {
      "companyName": "...",
      "city": "...",
      "phone": "...",
      "website": "...",
      "category": "...",
      "description": "...",
      "sourceUrl": "...",
      "instagram": "...",
      "vk": "...",
      "telegram": "..."
    }
  ],
  "explanation": "краткое объяснение на русском"
}

Верни 3–10 наиболее релевантных компаний. Без названия — пропусти. Пустые поля оставляй как null.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Найди потенциальных клиентов по запросу: ${query}`,
      },
    ],
    system: systemPrompt,
  });

  const block = message.content[0];
  const rawText = block.type === "text" ? block.text : "{}";

  let internetResults: Array<{
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
  let explanation = "Поиск завершён";

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      internetResults = Array.isArray(parsed.results) ? parsed.results : [];
      explanation = parsed.explanation ?? explanation;
    }
  } catch {
    explanation = "Не удалось обработать ответ ИИ";
  }

  res.json({
    internetResults,
    explanation,
    query,
  });
});

export default router;
