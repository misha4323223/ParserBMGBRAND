import { Router, type IRouter } from "express";
import { VkSearchGroupsBody } from "@workspace/api-zod";

const router: IRouter = Router();

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

function getToken(): string {
  return process.env.VK_ACCESS_TOKEN ?? "";
}

interface VkGroup {
  id: number;
  name: string;
  screen_name: string;
  description?: string;
  city?: { id: number; title: string };
  links?: Array<{ url: string; name?: string }>;
  site?: string;
  members_count?: number;
  photo_200?: string;
  status?: string;
}

async function vkRequest(method: string, params: Record<string, string | number>) {
  const token = getToken().trim();
  const url = new URL(`${VK_API}/${method}`);
  url.searchParams.set("v", VK_VERSION);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const isNewFormat = token.startsWith("vk1.");

  let res: Response;
  if (isNewFormat) {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
  } else {
    url.searchParams.set("access_token", token);
    res = await fetch(url.toString());
  }

  const json = await res.json() as { response?: unknown; error?: { error_msg: string } };
  if (json.error) throw new Error(`VK API error: ${json.error.error_msg}`);
  return json.response;
}

router.post("/vk-search", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(503).json({ error: "VK_ACCESS_TOKEN не установлен" });
    return;
  }

  const parsed = VkSearchGroupsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, city, offset = 0 } = parsed.data;
  const searchQuery = city ? `${query} ${city}` : query;
  const PAGE_SIZE = 20;

  try {
    const FIELDS = "description,city,links,site,members_count,photo_200,status";

    const searchRes = await vkRequest("groups.search", {
      q: searchQuery,
      type: "group",
      count: PAGE_SIZE,
      offset: offset,
      fields: FIELDS,
    }) as { items: VkGroup[]; count: number };

    const groups: VkGroup[] = searchRes?.items ?? [];
    const totalCount: number = searchRes?.count ?? 0;

    if (groups.length === 0) {
      res.json({ groups: [], query, total: 0, totalCount: 0, hasMore: false, offset });
      return;
    }

    const ids = groups.map((g) => g.id).join(",");
    const detailRes = await vkRequest("groups.getById", {
      group_ids: ids,
      fields: FIELDS,
    }) as { groups: VkGroup[] };

    const detailed: VkGroup[] = detailRes?.groups ?? groups;

    const result = detailed.map((g) => ({
      id: g.id,
      name: g.name,
      vkUrl: `https://vk.com/${g.screen_name}`,
      description: (g.description || g.status)?.slice(0, 300) ?? null,
      city: g.city?.title ?? null,
      phone: null,
      email: null,
      website: g.site ?? g.links?.[0]?.url ?? null,
      membersCount: g.members_count ?? null,
      photo: g.photo_200 ?? null,
    }));

    const nextOffset = offset + result.length;
    const hasMore = nextOffset < totalCount;

    res.json({ groups: result, query, total: result.length, totalCount, hasMore, offset });
  } catch (err) {
    console.error("VK search error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Ошибка VK API" });
  }
});

export default router;
