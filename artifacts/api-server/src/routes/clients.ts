import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { db, clientsTable } from "@workspace/db";
import * as XLSX from "xlsx";
import {
  ListClientsQueryParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/clients/export", async (req, res): Promise<void> => {
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, status, region, category } = parsed.data;
  const conditions = [];

  if (search) {
    conditions.push(
      sql`(${ilike(clientsTable.companyName, `%${search}%`)} OR ${ilike(clientsTable.contactName!, `%${search}%`)} OR ${ilike(clientsTable.city!, `%${search}%`)})`
    );
  }
  if (status) conditions.push(eq(clientsTable.status, status));
  if (region) conditions.push(eq(clientsTable.region!, region));
  if (category) conditions.push(eq(clientsTable.category!, category));

  const clients = await db
    .select()
    .from(clientsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(clientsTable.createdAt));

  const statusLabel = (s: string) => ({ active: "Активный", prospect: "Потенциальный", inactive: "Неактивный" }[s] ?? s);

  const rows = clients.map((c) => ({
    "Компания": c.companyName,
    "Статус": statusLabel(c.status),
    "Контактное лицо": c.contactName ?? "",
    "Телефон": c.phone ?? "",
    "Email": c.email ?? "",
    "Город": c.city ?? "",
    "Регион": c.region ?? "",
    "Категория": c.category ?? "",
    "Сайт": c.website ?? "",
    "ВКонтакте": c.vk ?? "",
    "Instagram": c.instagram ?? "",
    "Telegram": c.telegram ?? "",
    "Объём заказов": c.orderVolume ?? "",
    "Скидка (%)": c.discount ?? "",
    "Адрес доставки": c.deliveryAddress ?? "",
    "ИНН": c.inn ?? "",
    "Заметки": c.notes ?? "",
    "Дата последнего заказа": c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString("ru-RU") : "",
    "Дата добавления": c.createdAt ? new Date(c.createdAt).toLocaleDateString("ru-RU") : "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = [
    { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 16 }, { wch: 25 },
    { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 25 },
    { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 30 },
    { wch: 14 }, { wch: 40 }, { wch: 18 }, { wch: 18 },
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Клиенты");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="booomerangs-clients-${date}.xlsx"`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.send(buf);
});

router.get("/clients/stats", async (_req, res): Promise<void> => {
  const all = await db.select().from(clientsTable);

  const total = all.length;
  const active = all.filter((c) => c.status === "active").length;
  const inactive = all.filter((c) => c.status === "inactive").length;
  const prospect = all.filter((c) => c.status === "prospect").length;
  const totalOrderVolume = all.reduce((sum, c) => sum + (c.orderVolume ?? 0), 0);

  const regionMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();

  for (const c of all) {
    if (c.region) {
      regionMap.set(c.region, (regionMap.get(c.region) ?? 0) + 1);
    }
    if (c.category) {
      categoryMap.set(c.category, (categoryMap.get(c.category) ?? 0) + 1);
    }
  }

  const byRegion = Array.from(regionMap.entries()).map(([region, count]) => ({ region, count }));
  const byCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count }));

  res.json({ total, active, inactive, prospect, byRegion, byCategory, totalOrderVolume });
});

router.get("/clients", async (req, res): Promise<void> => {
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, status, region, category } = parsed.data;
  const conditions = [];

  if (search) {
    conditions.push(
      sql`(${ilike(clientsTable.companyName, `%${search}%`)} OR ${ilike(clientsTable.contactName!, `%${search}%`)} OR ${ilike(clientsTable.city!, `%${search}%`)})`
    );
  }
  if (status) {
    conditions.push(eq(clientsTable.status, status));
  }
  if (region) {
    conditions.push(eq(clientsTable.region!, region));
  }
  if (category) {
    conditions.push(eq(clientsTable.category!, category));
  }

  const clients = await db
    .select()
    .from(clientsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(clientsTable.createdAt));

  res.json(clients);
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db.insert(clientsTable).values(parsed.data).returning();
  res.status(201).json(client);
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.id));

  if (!client) {
    res.status(404).json({ error: "Клиент не найден" });
    return;
  }

  res.json(client);
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db
    .update(clientsTable)
    .set(parsed.data)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Клиент не найден" });
    return;
  }

  res.json(client);
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .delete(clientsTable)
    .where(eq(clientsTable.id, params.data.id))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Клиент не найден" });
    return;
  }

  res.sendStatus(204);
});

export default router;
