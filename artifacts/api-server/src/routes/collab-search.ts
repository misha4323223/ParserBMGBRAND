import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { tavily } from "@tavily/core";

const router: IRouter = Router();

const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });

router.post("/collab-search", async (req, res): Promise<void> => {
  const { query } = req.body as { query?: string };

  if (!query?.trim()) {
    res.status(400).json({ error: "Поле query обязательно" });
    return;
  }

  const searchQueries = [
    `${query} артист блогер россия instagram vk контакты`,
    `${query} тиктокер ютубер инфлюенсер россия коллаборация`,
  ];

  let allSearchContent = "";

  for (const searchQ of searchQueries) {
    try {
      const tavilyResult = await tavilyClient.search(searchQ, {
        searchDepth: "advanced",
        maxResults: 7,
        includeAnswer: true,
        includeRawContent: false,
      });

      if (tavilyResult.answer) {
        allSearchContent += `\nОтвет по запросу "${searchQ}":\n${tavilyResult.answer}\n`;
      }

      if ((tavilyResult.results as unknown[])?.length) {
        for (const r of tavilyResult.results.slice(0, 7)) {
          allSearchContent += `\n--- Источник: ${r.url}\nЗаголовок: ${r.title}\nОписание: ${r.content?.slice(0, 1200) ?? ""}\n`;
        }
      }
    } catch (err) {
      console.error("Tavily collab search error:", err);
    }
  }

  const systemPrompt = `Ты — AI-ассистент для CRM бренда Booomerangs (тульский стрит-бренд одежды).
Твоя задача: найти российских артистов, музыкантов, блогеров, стримеров, тиктокеров и инфлюенсеров для потенциальной коллаборации с брендом одежды.

${allSearchContent ? `Данные из интернета:\n${allSearchContent}` : "Используй свои знания о российских артистах и блогерах."}

Ищи людей которые:
- Активны в России
- Связаны со стрит-культурой, молодёжной аудиторией, модой, музыкой, лайфстайлом
- Имеют аудиторию в ВКонтакте, Instagram, Telegram, TikTok или YouTube

Для каждого найденного человека укажи:
- name: имя / псевдоним (обязательно)
- type: тип (артист, музыкант, блогер, стример, тиктокер, ютубер, рэпер, дизайнер, фотограф)
- niche: ниша / тематика (мода, стрит-культура, хип-хоп, лайфстайл, геймер, спорт и т.д.)
- city: город (если известен)
- followersInstagram: примерная аудитория Instagram (например "150K", "2.3M")
- followersVk: примерная аудитория ВКонтакте
- instagram: ссылка или @никнейм
- vk: ссылка ВКонтакте
- telegram: ссылка или @никнейм
- youtube: ссылка на канал
- tiktok: ссылка или @никнейм
- email: контактный email (если известен)
- description: краткое описание 1-2 предложения
- whyRelevant: почему подходит для Booomerangs (1-2 предложения)

Верни СТРОГО JSON:
{
  "results": [
    {
      "name": "...",
      "type": "...",
      "niche": "...",
      "city": "...",
      "followersInstagram": "...",
      "followersVk": "...",
      "instagram": "...",
      "vk": "...",
      "telegram": "...",
      "youtube": "...",
      "tiktok": "...",
      "email": "...",
      "description": "...",
      "whyRelevant": "..."
    }
  ],
  "explanation": "краткое объяснение на русском"
}

Верни 5–12 наиболее релевантных людей. Пустые поля оставляй как null.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Найди артистов и блогеров для коллаборации по запросу: ${query}`,
      },
    ],
    system: systemPrompt,
  });

  const block = message.content[0];
  const rawText = block.type === "text" ? block.text : "{}";

  let results: Array<{
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
  let explanation = "Поиск завершён";

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      results = Array.isArray(parsed.results) ? parsed.results : [];
      explanation = parsed.explanation ?? explanation;
    }
  } catch {
    explanation = "Не удалось обработать ответ ИИ";
  }

  res.json({ results, explanation, query });
});

export default router;
