import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  region: text("region"),
  category: text("category"),
  status: text("status").notNull().default("prospect"),
  notes: text("notes"),
  orderVolume: integer("order_volume"),
  lastOrderDate: timestamp("last_order_date", { withTimezone: true }),
  // Социальные сети
  instagram: text("instagram"),
  vk: text("vk"),
  telegram: text("telegram"),
  whatsapp: text("whatsapp"),
  website: text("website"),
  // Менеджер
  manager: text("manager"),
  // Реквизиты и доп. информация
  inn: text("inn"),
  discount: integer("discount"),
  deliveryAddress: text("delivery_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
