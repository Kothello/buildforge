import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").default("user"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source").notNull(),
  temperature: text("temperature").notNull().default("cold"),
  stage: text("stage").notNull().default("new"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  buildingSpecs: jsonb("building_specs"),
  aiNotes: text("ai_notes"),
  aiFirstMessage: text("ai_first_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  buildingWidth: integer("building_width"),
  buildingLength: integer("building_length"),
  buildingHeight: integer("building_height"),
  roofStyle: text("roof_style"),
  color: text("color"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  margin: decimal("margin", { precision: 5, scale: 2 }),
  contractStatus: text("contract_status").default("pending"),
  depositPaid: boolean("deposit_paid").default(false),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  screenshot3d: text("screenshot_3d"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const zapierWebhooks = pgTable("zapier_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  event: text("event").notNull(),
  url: text("url").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignedLeads: many(leads),
  activities: many(activities),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  deals: many(deals),
  activities: many(activities),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  lead: one(leads, {
    fields: [deals.leadId],
    references: [leads.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = z.infer<typeof insertUserSchema> & { id: string };

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertZapierWebhookSchema = createInsertSchema(zapierWebhooks).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ZapierWebhook = typeof zapierWebhooks.$inferSelect;
export type InsertZapierWebhook = z.infer<typeof insertZapierWebhookSchema>;
