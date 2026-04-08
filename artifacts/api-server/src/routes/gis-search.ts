import { Router, type IRouter } from "express";

const router: IRouter = Router();

const TWOGIS_API = "https://catalog.api.2gis.com/3.0/items";

function getToken(): string {
  return process.env.TWOGIS_API_KEY ?? "";
}

interface GisContact {
  type: string;
  value: string;
}

interface GisContactGroup {
  contacts: GisContact[];
}

interface GisItem {
  id: string;
  name: string;
  address?: { name?: string; components?: Array<{ type: string; value?: string; comment?: string }> };
  contact_groups?: GisContactGroup[];
  rubrics?: Array<{ name: string; kind?: string }>;
  point?: { lon: number; lat: number };
  url?: string;
}

function extractContacts(groups: GisContactGroup[] = []) {
  const phones: string[] = [];
  const websites: string[] = [];
  const emails: string[] = [];

  for (const group of groups) {
    for (const contact of group.contacts ?? []) {
      if (contact.type === "phone") phones.push(contact.value);
      else if (contact.type === "website") websites.push(contact.value);
      else if (contact.type === "email") emails.push(contact.value);
    }
  }

  return {
    phone: phones[0] ?? null,
    website: websites[0] ?? null,
    email: emails[0] ?? null,
  };
}

router.post("/gis-search", async (req, res): Promise<void> => {
  const token = getToken();
  if (!token) {
    res.status(503).json({ error: "TWOGIS_API_KEY не установлен" });
    return;
  }

  const { query, city, page = 1 } = req.body as {
    query: string;
    city?: string | null;
    page?: number;
  };

  if (!query?.trim()) {
    res.status(400).json({ error: "Поле query обязательно" });
    return;
  }

  const searchQuery = city ? `${query} ${city}` : query;

  try {
    const params = new URLSearchParams({
      q: searchQuery,
      fields: "items.point,items.address,items.contact_groups,items.rubrics,items.url",
      key: token,
      page_size: "10",
      page: String(page),
      locale: "ru_RU",
    });

    const response = await fetch(`${TWOGIS_API}?${params}`);
    if (!response.ok) {
      throw new Error(`2GIS API error: ${response.status}`);
    }

    const data = await response.json() as {
      result?: { items?: GisItem[]; total?: number };
      meta?: { code?: number; error?: { message: string } };
    };

    if (data.meta?.error) {
      throw new Error(data.meta.error.message);
    }

    const items: GisItem[] = data.result?.items ?? [];
    const total: number = data.result?.total ?? 0;

    const results = items.map((item) => {
      const { phone, website, email } = extractContacts(item.contact_groups);

      // Build address from components or use name field
      let address: string | null = item.address?.name ?? null;
      if (!address && item.address?.components?.length) {
        const parts = item.address.components
          .map((c) => c.value ?? c.comment)
          .filter(Boolean);
        address = parts.join(", ") || null;
      }

      // Prefer primary rubric
      const primaryRubric = item.rubrics?.find((r) => r.kind === "primary") ?? item.rubrics?.[0];

      return {
        id: item.id,
        name: item.name,
        address,
        phone,
        website,
        email,
        category: primaryRubric?.name ?? null,
        gisUrl: item.url ?? null,
      };
    });

    const PAGE_SIZE = 10;
    const hasMore = page * PAGE_SIZE < total;

    res.json({ results, query, total, hasMore, page });
  } catch (err) {
    console.error("2GIS search error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Ошибка 2ГИС API" });
  }
});

export default router;
