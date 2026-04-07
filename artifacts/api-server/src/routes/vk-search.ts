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
  city?: { title: string };
  contacts?: Array<{
    user_id?: number;
    desc?: string;
    phone?: string;
    email?: string;
  }>;
  links?: Array<{ url: string; name?: string }>;
  site?: string;
  members_count?: number;
  photo_200?: string;
}

async function vkRequest(method: string, params: Record<string, string | number>) {
  const token = getToken();
  const url = new URL(`${VK_API}/${method}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("v", VK_VERSION);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
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

  const { query, city } = parsed.data;
  const searchQuery = city ? `${query} ${city}` : query;

  try {
    const searchRes = await vkRequest("groups.search", {
      q: searchQuery,
      type: "group,page,event",
      count: 20,
      fields: "description,city,contacts,links,site,members_count,photo_200",
    }) as { items: VkGroup[]; count: number };

    const groups: VkGroup[] = searchRes?.items ?? [];

    if (groups.length === 0) {
      res.json({ groups: [], query, total: 0 });
      return;
    }

    const ids = groups.map((g) => g.id).join(",");
    const detailRes = await vkRequest("groups.getById", {
      group_ids: ids,
      fields: "description,city,contacts,links,site,members_count,photo_200",
    }) as { groups: VkGroup[] };

    const detailed: VkGroup[] = detailRes?.groups ?? groups;

    const result = detailed.map((g) => ({
      id: g.id,
      name: g.name,
      vkUrl: `https://vk.com/${g.screen_name}`,
      description: g.description?.slice(0, 300) ?? null,
      city: g.city?.title ?? null,
      phone: g.contacts?.find((c) => c.phone)?.phone ?? null,
      email: g.contacts?.find((c) => c.email)?.email ?? null,
      website: g.site ?? g.links?.[0]?.url ?? null,
      membersCount: g.members_count ?? null,
      photo: g.photo_200 ?? null,
    }));

    res.json({ groups: result, query, total: result.length });
  } catch (err) {
    console.error("VK search error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Ошибка VK API" });
  }
});

export default router;
