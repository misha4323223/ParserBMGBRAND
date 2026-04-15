import { Router, type IRouter } from "express";
import { VkSearchGroupsBody } from "@workspace/api-zod";
import { getVkUserToken } from "../lib/vk-token-store";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

interface VkGroup {
  id: number;
  name: string;
  screen_name: string;
  description?: string;
  city?: { id: number; title: string };
  links?: Array<{ url: string; name?: string; desc?: string }>;
  site?: string;
  members_count?: number;
  photo_200?: string;
  status?: string;
}

function extractPhone(text: string): string | null {
  const m = text.match(/(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/);
  return m ? m[0].replace(/\s/g, "") : null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function extractInstagram(text: string, links: VkGroup["links"]): string | null {
  for (const link of links ?? []) {
    if (link.url?.includes("instagram.com") || link.url?.includes("instagr.am")) {
      return link.url;
    }
  }
  const m = text.match(/instagram\.com\/([A-Za-z0-9_.]+)\/?/);
  if (m) return `https://instagram.com/${m[1]}`;
  const at = text.match(/(?:instagram|insta|ig)[:\s]+@?([A-Za-z0-9_.]{3,30})/i);
  if (at) return `https://instagram.com/${at[1]}`;
  return null;
}

function extractTelegram(text: string, links: VkGroup["links"]): string | null {
  for (const link of links ?? []) {
    if (link.url?.includes("t.me") || link.url?.includes("telegram.me")) {
      return link.url;
    }
  }
  const m = text.match(/t\.me\/([A-Za-z0-9_]+)\/?/);
  if (m) return `https://t.me/${m[1]}`;
  const at = text.match(/telegram[:\s]+@?([A-Za-z0-9_]{4,32})/i);
  if (at) return `https://t.me/${at[1]}`;
  return null;
}

function extractWebsite(g: VkGroup): string | null {
  if (g.site) return g.site;
  for (const link of g.links ?? []) {
    const u = link.url ?? "";
    if (!u.includes("vk.com") && !u.includes("instagram.com") && !u.includes("t.me") && !u.includes("facebook.com")) {
      return u;
    }
  }
  return null;
}

async function vkRequest(token: string, method: string, params: Record<string, string | number>) {
  const url = new URL(`${VK_API}/${method}`);
  url.searchParams.set("v", VK_VERSION);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString());

  const json = await res.json() as { response?: unknown; error?: { error_msg: string } };
  if (json.error) throw new Error(`VK API error: ${json.error.error_msg}`);
  return json.response;
}

async function getCityId(token: string, cityName: string): Promise<number | null> {
  try {
    const res = await vkRequest(token, "database.getCities", {
      country_id: 1,
      q: cityName,
      need_all: 0,
      count: 1,
    }) as { items: Array<{ id: number; title: string }> };
    const found = res?.items?.[0];
    if (found) {
      console.log(`VK city lookup: "${cityName}" → id=${found.id} (${found.title})`);
      return found.id;
    }
  } catch (err) {
    console.error("City lookup failed:", err);
  }
  return null;
}

async function buildVkSearchQueries(userQuery: string, city: string | null): Promise<string[]> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Пользователь ищет группы ВКонтакте для CRM магазинов одежды. Его запрос: "${userQuery}"${city ? `, город: ${city}` : ""}.

Сгенерируй 3 поисковых запроса для VK API groups.search. Каждый запрос — короткие ключевые слова на русском (и/или английском), максимум 4 слова. Они должны точно отражать тип бизнеса (магазины одежды, шоурумы, бутики и т.п.).

Верни ТОЛЬКО JSON массив строк, без объяснений:
["запрос1", "запрос2", "запрос3"]`,
        },
      ],
    });

    const block = message.content[0];
    const rawText = block.type === "text" ? block.text : "[]";
    const match = rawText.match(/\[[\s\S]*\]/);
    if (match) {
      const queries = JSON.parse(match[0]) as string[];
      if (Array.isArray(queries) && queries.length > 0) {
        return queries.slice(0, 3);
      }
    }
  } catch (err) {
    console.error("AI query build error:", err);
  }

  const base = city ? `${userQuery} ${city}` : userQuery;
  return [base];
}

async function filterChunk(
  chunk: Array<{ id: number; name: string; description: string | null }>,
  userQuery: string
): Promise<Set<number>> {
  try {
    const list = chunk
      .map((g, i) => `${i + 1}. "${g.name}" — ${g.description?.slice(0, 150) ?? "нет описания"}`)
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Booomerangs — тульский бренд streetwear одежды. Ищем оптовых клиентов: магазины одежды, шоурумы, бутики, стрит-шопы.

Запрос пользователя: "${userQuery}"

Вот группы ВКонтакте (номер, название, описание):
${list}

Верни ТОЛЬКО JSON массив номеров (1-based) релевантных групп — только магазины/бутики/шоурумы одежды. Исключи: игрушки, парфюмерию, еду, технику, услуги, развлечения и всё не связанное с одеждой.

Пример: [1, 3, 5]`,
        },
      ],
    });

    const block = message.content[0];
    const rawText = block.type === "text" ? block.text : "[]";
    const match = rawText.match(/\[[\s\S]*?\]/);
    if (match) {
      const indices = JSON.parse(match[0]) as number[];
      return new Set(indices.map((i) => chunk[i - 1]?.id).filter(Boolean));
    }
  } catch (err) {
    console.error("AI filter chunk error:", err);
  }
  return new Set(chunk.map((g) => g.id));
}

async function filterRelevantGroups(
  groups: Array<{ id: number; name: string; description: string | null }>,
  userQuery: string
): Promise<Set<number>> {
  if (groups.length === 0) return new Set();

  const CHUNK_SIZE = 100;
  const chunks: Array<typeof groups> = [];
  for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
    chunks.push(groups.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.all(chunks.map((chunk) => filterChunk(chunk, userQuery)));
  const merged = new Set<number>();
  for (const set of results) {
    for (const id of set) merged.add(id);
  }
  return merged;
}

router.post("/vk-search", async (req, res): Promise<void> => {
  const token = await getVkUserToken();
  if (!token) {
    res.status(503).json({ error: "VK не подключён. Пожалуйста, авторизуйтесь через ВКонтакте." });
    return;
  }

  const parsed = VkSearchGroupsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, city } = parsed.data;
  const PAGE_SIZE = 100;
  const FIELDS = "description,city,links,site,members_count,photo_200,status";

  try {
    let groups: VkGroup[] = [];

    const cityId = city ? await getCityId(token, city) : null;
    const cityParams = cityId ? { city_id: cityId } : {};

    const searchQueries = await buildVkSearchQueries(query, cityId ? null : (city ?? null));
    console.log("VK search queries from AI:", searchQueries, cityId ? `city_id=${cityId}` : "без фильтра по городу");

    const seenIds = new Set<number>();

    for (const q of searchQueries) {
      try {
        const searchRes = await vkRequest(token, "groups.search", {
          q,
          type: "group",
          count: PAGE_SIZE,
          offset: 0,
          fields: FIELDS,
          ...cityParams,
        }) as { items: VkGroup[]; count: number };

        for (const g of searchRes?.items ?? []) {
          if (!seenIds.has(g.id)) {
            seenIds.add(g.id);
            groups.push(g);
          }
        }
      } catch (err) {
        console.error("VK search query failed:", q, err);
      }
    }

    if (groups.length === 0) {
      res.json({ groups: [], query, total: 0 });
      return;
    }

    const DETAIL_BATCH = 200;
    const allIds = groups.map((g) => g.id);
    const detailBatches: VkGroup[] = [];
    for (let i = 0; i < allIds.length; i += DETAIL_BATCH) {
      const batchIds = allIds.slice(i, i + DETAIL_BATCH).join(",");
      try {
        const detailRes = await vkRequest(token, "groups.getById", {
          group_ids: batchIds,
          fields: FIELDS,
        }) as { groups: VkGroup[] };
        detailBatches.push(...(detailRes?.groups ?? []));
      } catch (err) {
        console.error("groups.getById batch error:", err);
      }
    }

    const detailed: VkGroup[] = detailBatches.length > 0 ? detailBatches : groups;

    const forFilter = detailed.map((g) => ({
      id: g.id,
      name: g.name,
      description: [g.description, g.status].filter(Boolean).join(" ") || null,
    }));

    const relevantIds = await filterRelevantGroups(forFilter, query);

    const result = detailed
      .filter((g) => relevantIds.has(g.id))
      .map((g) => {
        const fullText = [g.description, g.status].filter(Boolean).join(" ");
        return {
          id: g.id,
          name: g.name,
          vkUrl: `https://vk.com/${g.screen_name}`,
          description: fullText.slice(0, 300) || null,
          city: g.city?.title ?? null,
          phone: extractPhone(fullText),
          email: extractEmail(fullText),
          website: extractWebsite(g),
          instagram: extractInstagram(fullText, g.links),
          telegram: extractTelegram(fullText, g.links),
          membersCount: g.members_count ?? null,
          photo: g.photo_200 ?? null,
        };
      });

    res.json({ groups: result, query, total: result.length });
  } catch (err) {
    console.error("VK search error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Ошибка VK API" });
  }
});

export default router;
