import {
  type User,
  type InsertUser,
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
} from "@shared/schema";
import { db } from "./db";
import { users, leads, deals, activities, zapierWebhooks, projects, callbacks, pricingConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLeads(): Promise<Lead[]>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
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
}

export const storage = new DatabaseStorage();
