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
  role: text("role").notNull().default("REP"),
  avatar: text("avatar"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  isClosed: boolean("is_closed").default(false).notNull(),
  isWon: boolean("is_won").default(false).notNull(),
  color: text("color").default("#6B7280"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  lastDisposition: text("last_disposition"),
  lastDispositionAt: timestamp("last_disposition_at"),
  stageEnteredAt: timestamp("stage_entered_at").defaultNow(),
  nextCallbackAt: timestamp("next_callback_at"),
  projectStatus: text("project_status"),
  projectTargetDeliveryDate: timestamp("project_target_delivery_date"),
  projectNotes: text("project_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadHistory = pgTable("lead_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  type: text("type").notNull(),
  disposition: text("disposition"),
  prevStage: text("prev_stage"),
  newStage: text("new_stage"),
  note: text("note"),
  nextCallbackAt: timestamp("next_callback_at"),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const crmDeals = pgTable("crm_deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  stageId: varchar("stage_id").references(() => pipelineStages.id),
  ownerId: varchar("owner_id").references(() => users.id),
  contactId: varchar("contact_id").references(() => contacts.id),
  leadId: varchar("lead_id").references(() => leads.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dealNotes = pgTable("deal_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  dealId: varchar("deal_id").references(() => crmDeals.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  status: text("status").notNull().default("OPEN"),
  dueDate: timestamp("due_date"),
  dealId: varchar("deal_id").references(() => crmDeals.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const dealActivities = pgTable("deal_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => crmDeals.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  type: text("type").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
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

export const leadQuotes = pgTable("lead_quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leads.id).notNull(),
  createdByUserId: varchar("created_by_user_id").references(() => users.id),
  source: text("source").notNull().default("crm"),
  buildingSpecs: jsonb("building_specs"),
  configuration: jsonb("configuration"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull().default("0"),
  marginPercent: decimal("margin_percent", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignedLeads: many(leads),
  activities: many(activities),
  projects: many(projects),
  callbacks: many(callbacks),
  refreshTokens: many(refreshTokens),
  ownedDeals: many(crmDeals),
  tasks: many(tasks),
  dealNotes: many(dealNotes),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  deals: many(crmDeals),
}));

export const pipelineStagesRelations = relations(pipelineStages, ({ many }) => ({
  deals: many(crmDeals),
}));

export const crmDealsRelations = relations(crmDeals, ({ one, many }) => ({
  stage: one(pipelineStages, {
    fields: [crmDeals.stageId],
    references: [pipelineStages.id],
  }),
  owner: one(users, {
    fields: [crmDeals.ownerId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [crmDeals.contactId],
    references: [contacts.id],
  }),
  lead: one(leads, {
    fields: [crmDeals.leadId],
    references: [leads.id],
  }),
  notes: many(dealNotes),
  tasks: many(tasks),
  activities: many(dealActivities),
}));

export const dealNotesRelations = relations(dealNotes, ({ one }) => ({
  author: one(users, {
    fields: [dealNotes.authorId],
    references: [users.id],
  }),
  deal: one(crmDeals, {
    fields: [dealNotes.dealId],
    references: [crmDeals.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  deal: one(crmDeals, {
    fields: [tasks.dealId],
    references: [crmDeals.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
}));

export const dealActivitiesRelations = relations(dealActivities, ({ one }) => ({
  deal: one(crmDeals, {
    fields: [dealActivities.dealId],
    references: [crmDeals.id],
  }),
  user: one(users, {
    fields: [dealActivities.userId],
    references: [users.id],
  }),
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
  crmDeals: many(crmDeals),
  activities: many(activities),
  projects: many(projects),
  callbacks: many(callbacks),
  quotes: many(leadQuotes),
  history: many(leadHistory),
}));

export const leadHistoryRelations = relations(leadHistory, ({ one }) => ({
  lead: one(leads, {
    fields: [leadHistory.leadId],
    references: [leads.id],
  }),
  createdByUser: one(users, {
    fields: [leadHistory.createdByUserId],
    references: [users.id],
  }),
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

export const leadQuotesRelations = relations(leadQuotes, ({ one }) => ({
  lead: one(leads, {
    fields: [leadQuotes.leadId],
    references: [leads.id],
  }),
  createdByUser: one(users, {
    fields: [leadQuotes.createdByUserId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmDealSchema = createInsertSchema(crmDeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDealNoteSchema = createInsertSchema(dealNotes).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDealActivitySchema = createInsertSchema(dealActivities).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertBuildingDesignSchema = createInsertSchema(buildingDesigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDesignPricingSchema = createInsertSchema(designPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadQuoteSchema = createInsertSchema(leadQuotes).omit({
  id: true,
  createdAt: true,
});

export const insertLeadHistorySchema = createInsertSchema(leadHistory).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type CrmDeal = typeof crmDeals.$inferSelect;
export type InsertCrmDeal = z.infer<typeof insertCrmDealSchema>;
export type DealNote = typeof dealNotes.$inferSelect;
export type InsertDealNote = z.infer<typeof insertDealNoteSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type DealActivity = typeof dealActivities.$inferSelect;
export type InsertDealActivity = z.infer<typeof insertDealActivitySchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
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
export type BuildingDesign = typeof buildingDesigns.$inferSelect;
export type InsertBuildingDesign = z.infer<typeof insertBuildingDesignSchema>;
export type DesignPricing = typeof designPricing.$inferSelect;
export type InsertDesignPricing = z.infer<typeof insertDesignPricingSchema>;
export type LeadQuote = typeof leadQuotes.$inferSelect;
export type InsertLeadQuote = z.infer<typeof insertLeadQuoteSchema>;
export type LeadHistory = typeof leadHistory.$inferSelect;
export type InsertLeadHistory = z.infer<typeof insertLeadHistorySchema>;

// Disposition and Stage type enums
export const DISPOSITIONS = [
  'LEFT_VOICEMAIL',
  'NO_ANSWER',
  'NO_SHOW',
  'SPOKE_WITH',
  'BOOKED_CALL',
  'SENT_QUOTE',
  'FOLLOW_UP',
  'NOT_INTERESTED',
  'COMPETITOR',
  'SOLD',
  'CANCELED',
] as const;

export type Disposition = typeof DISPOSITIONS[number];

export const STAGES = [
  'new',
  'working',
  'callback',
  'welcome',
  'quote_sent',
  'negotiating',
  'storage',
  'building_prep',
  'pending_delivery',
  'sold',
  'canceled',
] as const;

export type Stage = typeof STAGES[number];
