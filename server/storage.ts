import {
  type User,
  type InsertUser,
  type RefreshToken,
  type InsertRefreshToken,
  type Contact,
  type InsertContact,
  type PipelineStage,
  type InsertPipelineStage,
  type CrmDeal,
  type InsertCrmDeal,
  type DealNote,
  type InsertDealNote,
  type Task,
  type InsertTask,
  type DealActivity,
  type InsertDealActivity,
  type Setting,
  type InsertSetting,
  type Lead,
  type InsertLead,
  type Deal,
  type InsertDeal,
  type Activity,
  type InsertActivity,
  type ZapierWebhook,
  type InsertZapierWebhook,
  type Project,
  type InsertProject,
  type Callback,
  type InsertCallback,
  type PricingConfig,
  type InsertPricingConfig,
  type LeadQuote,
  type InsertLeadQuote,
  type LeadHistory,
  type InsertLeadHistory,
} from "@shared/schema";
import { db } from "./db";
import { 
  users, 
  refreshTokens,
  contacts,
  pipelineStages,
  crmDeals,
  dealNotes,
  tasks,
  dealActivities,
  settings,
  leads, 
  deals, 
  activities, 
  zapierWebhooks, 
  projects, 
  callbacks, 
  pricingConfig,
  leadQuotes,
  leadHistory
} from "@shared/schema";
import { eq, and, gte, lte, ilike, or, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<boolean>;
  deleteUserRefreshTokens(userId: string): Promise<void>;
  
  getContacts(search?: string): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  
  getPipelineStages(): Promise<PipelineStage[]>;
  getPipelineStage(id: string): Promise<PipelineStage | undefined>;
  createPipelineStage(stage: InsertPipelineStage): Promise<PipelineStage>;
  updatePipelineStage(id: string, updates: Partial<PipelineStage>): Promise<PipelineStage | undefined>;
  deletePipelineStage(id: string): Promise<boolean>;
  
  getCrmDeals(filters?: { stageId?: string; ownerId?: string; fromDate?: Date; toDate?: Date }): Promise<CrmDeal[]>;
  getCrmDeal(id: string): Promise<CrmDeal | undefined>;
  createCrmDeal(deal: InsertCrmDeal): Promise<CrmDeal>;
  updateCrmDeal(id: string, updates: Partial<CrmDeal>): Promise<CrmDeal | undefined>;
  deleteCrmDeal(id: string): Promise<boolean>;
  
  getDealNotes(dealId: string): Promise<DealNote[]>;
  createDealNote(note: InsertDealNote): Promise<DealNote>;
  
  getTasks(filters?: { status?: string; assignedToId?: string; fromDate?: Date; toDate?: Date }): Promise<Task[]>;
  getTasksByDeal(dealId: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  
  getDealActivities(dealId: string): Promise<DealActivity[]>;
  createDealActivity(activity: InsertDealActivity): Promise<DealActivity>;
  
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  upsertSetting(key: string, value: any): Promise<Setting>;
  
  getLeads(userId?: string): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  
  getDeals(): Promise<Deal[]>;
  getDeal(id: string): Promise<Deal | undefined>;
  getDealByLeadId(leadId: string): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  
  getActivities(leadId: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  getWebhooks(): Promise<ZapierWebhook[]>;
  createWebhook(webhook: InsertZapierWebhook): Promise<ZapierWebhook>;
  
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  
  getCallbacks(): Promise<Callback[]>;
  getCallback(id: string): Promise<Callback | undefined>;
  createCallback(callback: InsertCallback): Promise<Callback>;
  updateCallback(id: string, updates: Partial<Callback>): Promise<Callback | undefined>;
  
  getPricingConfig(): Promise<PricingConfig | undefined>;
  createPricingConfig(pricing: InsertPricingConfig): Promise<PricingConfig>;
  updatePricingConfig(id: string, updates: Partial<PricingConfig>): Promise<PricingConfig | undefined>;

  getLeadQuotes(leadId: string): Promise<LeadQuote[]>;
  createLeadQuote(quote: InsertLeadQuote): Promise<LeadQuote>;

  getLeadHistory(leadId: string): Promise<LeadHistory[]>;
  createLeadHistory(entry: InsertLeadHistory): Promise<LeadHistory>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.name));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, id));
    await db.delete(leads).where(eq(leads.assignedTo, id));
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async createRefreshToken(insertToken: InsertRefreshToken): Promise<RefreshToken> {
    const [token] = await db.insert(refreshTokens).values(insertToken).returning();
    return token;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token));
    return refreshToken || undefined;
  }

  async deleteRefreshToken(token: string): Promise<boolean> {
    const result = await db.delete(refreshTokens).where(eq(refreshTokens.token, token)).returning();
    return result.length > 0;
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  async getContacts(search?: string): Promise<Contact[]> {
    if (search) {
      return await db.select().from(contacts).where(
        or(
          ilike(contacts.name, `%${search}%`),
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.company, `%${search}%`)
        )
      ).orderBy(desc(contacts.createdAt));
    }
    return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(insertContact).returning();
    return contact;
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | undefined> {
    const [contact] = await db
      .update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return contact || undefined;
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id)).returning();
    return result.length > 0;
  }

  async getPipelineStages(): Promise<PipelineStage[]> {
    return await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order));
  }

  async getPipelineStage(id: string): Promise<PipelineStage | undefined> {
    const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, id));
    return stage || undefined;
  }

  async createPipelineStage(insertStage: InsertPipelineStage): Promise<PipelineStage> {
    const [stage] = await db.insert(pipelineStages).values(insertStage).returning();
    return stage;
  }

  async updatePipelineStage(id: string, updates: Partial<PipelineStage>): Promise<PipelineStage | undefined> {
    const [stage] = await db
      .update(pipelineStages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pipelineStages.id, id))
      .returning();
    return stage || undefined;
  }

  async deletePipelineStage(id: string): Promise<boolean> {
    const result = await db.delete(pipelineStages).where(eq(pipelineStages.id, id)).returning();
    return result.length > 0;
  }

  async getCrmDeals(filters?: { stageId?: string; ownerId?: string; fromDate?: Date; toDate?: Date }): Promise<CrmDeal[]> {
    let query = db.select().from(crmDeals);
    const conditions = [];
    
    if (filters?.stageId) {
      conditions.push(eq(crmDeals.stageId, filters.stageId));
    }
    if (filters?.ownerId) {
      conditions.push(eq(crmDeals.ownerId, filters.ownerId));
    }
    if (filters?.fromDate) {
      conditions.push(gte(crmDeals.createdAt, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(crmDeals.createdAt, filters.toDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(crmDeals).where(and(...conditions)).orderBy(desc(crmDeals.createdAt));
    }
    return await db.select().from(crmDeals).orderBy(desc(crmDeals.createdAt));
  }

  async getCrmDeal(id: string): Promise<CrmDeal | undefined> {
    const [deal] = await db.select().from(crmDeals).where(eq(crmDeals.id, id));
    return deal || undefined;
  }

  async createCrmDeal(insertDeal: InsertCrmDeal): Promise<CrmDeal> {
    const [deal] = await db.insert(crmDeals).values(insertDeal).returning();
    return deal;
  }

  async updateCrmDeal(id: string, updates: Partial<CrmDeal>): Promise<CrmDeal | undefined> {
    const [deal] = await db
      .update(crmDeals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(crmDeals.id, id))
      .returning();
    return deal || undefined;
  }

  async deleteCrmDeal(id: string): Promise<boolean> {
    await db.delete(dealNotes).where(eq(dealNotes.dealId, id));
    await db.delete(tasks).where(eq(tasks.dealId, id));
    await db.delete(dealActivities).where(eq(dealActivities.dealId, id));
    const result = await db.delete(crmDeals).where(eq(crmDeals.id, id)).returning();
    return result.length > 0;
  }

  async getDealNotes(dealId: string): Promise<DealNote[]> {
    return await db.select().from(dealNotes).where(eq(dealNotes.dealId, dealId)).orderBy(desc(dealNotes.createdAt));
  }

  async createDealNote(insertNote: InsertDealNote): Promise<DealNote> {
    const [note] = await db.insert(dealNotes).values(insertNote).returning();
    return note;
  }

  async getTasks(filters?: { status?: string; assignedToId?: string; fromDate?: Date; toDate?: Date }): Promise<Task[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    if (filters?.assignedToId) {
      conditions.push(eq(tasks.assignedToId, filters.assignedToId));
    }
    if (filters?.fromDate) {
      conditions.push(gte(tasks.dueDate, filters.fromDate));
    }
    if (filters?.toDate) {
      conditions.push(lte(tasks.dueDate, filters.toDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.dueDate));
    }
    return await db.select().from(tasks).orderBy(asc(tasks.dueDate));
  }

  async getTasksByDeal(dealId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.dealId, dealId)).orderBy(asc(tasks.dueDate));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const updateData: any = { ...updates };
    if (updates.status === "DONE" && !updates.completedAt) {
      updateData.completedAt = new Date();
    }
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async getDealActivities(dealId: string): Promise<DealActivity[]> {
    return await db.select().from(dealActivities).where(eq(dealActivities.dealId, dealId)).orderBy(desc(dealActivities.createdAt));
  }

  async createDealActivity(insertActivity: InsertDealActivity): Promise<DealActivity> {
    const [activity] = await db.insert(dealActivities).values(insertActivity).returning();
    return activity;
  }

  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async upsertSetting(key: string, value: any): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(settings).values({ key, value }).returning();
      return created;
    }
  }

  async getLeads(userId?: string): Promise<Lead[]> {
    if (userId) {
      return await db.select().from(leads).where(eq(leads.assignedTo, userId)).orderBy(desc(leads.createdAt));
    }
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db.insert(leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async deleteLead(id: string): Promise<boolean> {
    await db.delete(activities).where(eq(activities.leadId, id));
    await db.delete(callbacks).where(eq(callbacks.leadId, id));
    await db.delete(projects).where(eq(projects.leadId, id));
    await db.delete(deals).where(eq(deals.leadId, id));
    
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result.length > 0;
  }

  async getDeals(): Promise<Deal[]> {
    return await db.select().from(deals);
  }

  async getDeal(id: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }

  async getDealByLeadId(leadId: string): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.leadId, leadId));
    return deal || undefined;
  }

  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const [deal] = await db.insert(deals).values(insertDeal).returning();
    return deal;
  }

  async getActivities(leadId: string): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.leadId, leadId));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  async getWebhooks(): Promise<ZapierWebhook[]> {
    return await db.select().from(zapierWebhooks);
  }

  async createWebhook(insertWebhook: InsertZapierWebhook): Promise<ZapierWebhook> {
    const [webhook] = await db.insert(zapierWebhooks).values(insertWebhook).returning();
    return webhook;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async getCallbacks(): Promise<Callback[]> {
    return await db.select().from(callbacks);
  }

  async getCallback(id: string): Promise<Callback | undefined> {
    const [callback] = await db.select().from(callbacks).where(eq(callbacks.id, id));
    return callback || undefined;
  }

  async createCallback(insertCallback: InsertCallback): Promise<Callback> {
    const [callback] = await db.insert(callbacks).values(insertCallback).returning();
    return callback;
  }

  async updateCallback(id: string, updates: Partial<Callback>): Promise<Callback | undefined> {
    const [callback] = await db
      .update(callbacks)
      .set(updates)
      .where(eq(callbacks.id, id))
      .returning();
    return callback || undefined;
  }

  async getPricingConfig(): Promise<PricingConfig | undefined> {
    const [pricing] = await db.select().from(pricingConfig).limit(1);
    return pricing || undefined;
  }

  async createPricingConfig(insertPricing: InsertPricingConfig): Promise<PricingConfig> {
    const [pricing] = await db.insert(pricingConfig).values(insertPricing).returning();
    return pricing;
  }

  async updatePricingConfig(id: string, updates: Partial<PricingConfig>): Promise<PricingConfig | undefined> {
    const [pricing] = await db
      .update(pricingConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pricingConfig.id, id))
      .returning();
    return pricing || undefined;
  }

  async getLeadQuotes(leadId: string): Promise<LeadQuote[]> {
    return await db
      .select()
      .from(leadQuotes)
      .where(eq(leadQuotes.leadId, leadId))
      .orderBy(desc(leadQuotes.createdAt));
  }

  async createLeadQuote(insertQuote: InsertLeadQuote): Promise<LeadQuote> {
    const [quote] = await db.insert(leadQuotes).values(insertQuote).returning();
    return quote;
  }

  async getLeadHistory(leadId: string): Promise<LeadHistory[]> {
    return await db
      .select()
      .from(leadHistory)
      .where(eq(leadHistory.leadId, leadId))
      .orderBy(desc(leadHistory.createdAt));
  }

  async createLeadHistory(insertHistory: InsertLeadHistory): Promise<LeadHistory> {
    const [history] = await db.insert(leadHistory).values(insertHistory).returning();
    return history;
  }

  async getLeadQuoteWithDetails(quoteId: string, leadId: string) {
    const quote = await db
      .select({
        quote: leadQuotes,
        lead: leads,
        user: users,
      })
      .from(leadQuotes)
      .leftJoin(leads, eq(leadQuotes.leadId, leads.id))
      .leftJoin(users, eq(leadQuotes.createdByUserId, users.id))
      .where(and(eq(leadQuotes.id, quoteId), eq(leadQuotes.leadId, leadId)))
      .limit(1);
    
    return quote.length > 0 ? quote[0] : null;
  }
}

export const storage = new DatabaseStorage();
