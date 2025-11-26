import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").default(""),
  role: text("role").notNull().default("sales"),
  avatar: text("avatar"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pricingConfig = pgTable("pricing_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull().default("0"),
  pricePerSquareFoot: decimal("price_per_sq_ft", { precision: 10, scale: 2 }).default("0"),
  rules: jsonb("rules").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const addOns = pgTable("add_ons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  status: text("status").notNull().default("new"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  salesRepId: varchar("sales_rep_id").references(() => users.id),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).default("0"),
  buildingSpecs: jsonb("building_specs"),
  configuration: jsonb("configuration"),
  aiNotes: text("ai_notes"),
  aiFirstMessage: text("ai_first_message"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  projectManagerId: varchar("project_manager_id").references(() => users.id),
  status: text("status").notNull().default("planning"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const callbacks = pgTable("callbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  notes: text("notes"),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const buildingDesigns = pgTable("building_designs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  width: integer("width").notNull().default(30),
  length: integer("length").notNull().default(40),
  height: integer("height").notNull().default(12),
  wallColor: varchar("wall_color", { length: 50 }).notNull().default("#8B4513"),
  roofColor: varchar("roof_color", { length: 50 }).notNull().default("#4A4A4A"),
  trimColor: varchar("trim_color", { length: 50 }).notNull().default("#FFFFFF"),
  roofStyle: varchar("roof_style", { length: 50 }).notNull().default("gable"),
  roofPitch: integer("roof_pitch").notNull().default(3),
  hasLeanTo: boolean("has_lean_to").notNull().default(false),
  leanToWidth: integer("lean_to_width").default(10),
  leanToSide: varchar("lean_to_side", { length: 20 }).default("left"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const designPricing = pgTable("design_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  designId: varchar("design_id").references(() => buildingDesigns.id).notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull().default("0"),
  pricePerSquareFoot: decimal("price_per_sq_ft", { precision: 10, scale: 2 }).default("0"),
  rules: jsonb("rules").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignedLeads: many(leads),
  activities: many(activities),
  projects: many(projects),
  callbacks: many(callbacks),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  salesRep: one(users, {
    fields: [leads.salesRepId],
    references: [users.id],
  }),
  deals: many(deals),
  activities: many(activities),
  projects: many(projects),
  callbacks: many(callbacks),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  lead: one(leads, {
    fields: [projects.leadId],
    references: [leads.id],
  }),
  projectManager: one(users, {
    fields: [projects.projectManagerId],
    references: [users.id],
  }),
}));

export const callbacksRelations = relations(callbacks, ({ one }) => ({
  lead: one(leads, {
    fields: [callbacks.leadId],
    references: [leads.id],
  }),
  user: one(users, {
    fields: [callbacks.userId],
    references: [users.id],
  }),
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

export const buildingDesignsRelations = relations(buildingDesigns, ({ many }) => ({
  pricing: many(designPricing),
}));

export const designPricingRelations = relations(designPricing, ({ one }) => ({
  design: one(buildingDesigns, {
    fields: [designPricing.designId],
    references: [buildingDesigns.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

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

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallbackSchema = createInsertSchema(callbacks).omit({
  id: true,
  createdAt: true,
});

export const insertPricingConfigSchema = createInsertSchema(pricingConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAddOnSchema = createInsertSchema(addOns).omit({
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
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Callback = typeof callbacks.$inferSelect;
export type InsertCallback = z.infer<typeof insertCallbackSchema>;
export type PricingConfig = typeof pricingConfig.$inferSelect;
export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;
export type AddOn = typeof addOns.$inferSelect;
export type InsertAddOn = z.infer<typeof insertAddOnSchema>;
