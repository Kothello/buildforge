import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { 
  insertLeadSchema, 
  insertDealSchema, 
  insertActivitySchema, 
  insertZapierWebhookSchema, 
  insertProjectSchema, 
  insertCallbackSchema, 
  insertPricingConfigSchema,
  insertContactSchema,
  insertPipelineStageSchema,
  insertCrmDealSchema,
  insertDealNoteSchema,
  insertTaskSchema,
  insertDealActivitySchema,
} from "@shared/schema";
import { parseLeadFromText, generateFirstMessage, generateCallSummary, generateUnstickSuggestion, generateMorningBrief } from "./ai";
import { triggerWebhook } from "./webhooks";
import pricingRoutes from "./pricingRoutes";
import designRoutes from "./designRoutes";
import { 
  hashPassword, 
  comparePassword, 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  getRefreshTokenExpiry,
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  type AuthenticatedRequest
} from "./auth";
import { db } from "./db";
import { crmDeals, pipelineStages, users } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());
  
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/designs", designRoutes);

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, role = "REP" } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        passwordHash,
        role,
        active: true,
      });

      const tokenPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, accessToken });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.active) {
        return res.status(401).json({ error: "Account is inactive" });
      }

      const tokenPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpiry(),
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, accessToken });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await storage.deleteRefreshToken(refreshToken);
      }

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: "No refresh token" });
      }

      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      const storedToken = await storage.getRefreshToken(refreshToken);
      if (!storedToken || storedToken.expiresAt < new Date()) {
        return res.status(401).json({ error: "Token expired" });
      }

      const user = await storage.getUser(payload.userId);
      if (!user || !user.active) {
        return res.status(401).json({ error: "User not found or inactive" });
      }

      const tokenPayload = { userId: user.id, email: user.email, role: user.role };
      const newAccessToken = generateAccessToken(tokenPayload);

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      res.status(500).json({ error: "Token refresh failed" });
    }
  });

  app.get("/api/auth/me", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { passwordHash: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.get("/api/users", async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const usersWithoutPasswords = allUsers.map(({ passwordHash, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const { name, email, password, role = "REP" } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        passwordHash,
        role,
        active: true,
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.password) {
        updates.passwordHash = await hashPassword(updates.password);
        delete updates.password;
      }
      
      const user = await storage.updateUser(req.params.id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireRole("ADMIN"), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.params.id;
      
      if (userId === req.user!.id) {
        return res.status(400).json({ error: "Cannot delete your own user account" });
      }
      
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/contacts", async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const allContacts = await storage.getContacts(search);
      res.json(allContacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const contact = await storage.createContact(validatedData);
      res.json(contact);
    } catch (error) {
      res.status(400).json({ error: "Invalid contact data" });
    }
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/admin/pipeline-stages", async (req, res) => {
    try {
      const stages = await storage.getPipelineStages();
      res.json(stages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pipeline stages" });
    }
  });

  app.post("/api/admin/pipeline-stages", async (req, res) => {
    try {
      const validatedData = insertPipelineStageSchema.parse(req.body);
      const stage = await storage.createPipelineStage(validatedData);
      res.json(stage);
    } catch (error) {
      res.status(400).json({ error: "Invalid pipeline stage data" });
    }
  });

  app.patch("/api/admin/pipeline-stages/:id", async (req, res) => {
    try {
      const stage = await storage.updatePipelineStage(req.params.id, req.body);
      if (!stage) {
        return res.status(404).json({ error: "Pipeline stage not found" });
      }
      res.json(stage);
    } catch (error) {
      res.status(500).json({ error: "Failed to update pipeline stage" });
    }
  });

  app.delete("/api/admin/pipeline-stages/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePipelineStage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Pipeline stage not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete pipeline stage" });
    }
  });

  app.get("/api/crm/deals", async (req, res) => {
    try {
      const { stageId, ownerId, from, to } = req.query;
      const filters: any = {};
      if (stageId) filters.stageId = stageId as string;
      if (ownerId) filters.ownerId = ownerId as string;
      if (from) filters.fromDate = new Date(from as string);
      if (to) filters.toDate = new Date(to as string);
      
      const allDeals = await storage.getCrmDeals(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(allDeals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  app.get("/api/crm/deals/:id", async (req, res) => {
    try {
      const deal = await storage.getCrmDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deal" });
    }
  });

  app.post("/api/crm/deals", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertCrmDealSchema.parse(req.body);
      const deal = await storage.createCrmDeal(validatedData);
      
      await storage.createDealActivity({
        dealId: deal.id,
        userId: req.user?.id,
        type: "DEAL_CREATED",
        data: { title: deal.title, amount: deal.amount },
      });
      
      res.json(deal);
    } catch (error) {
      res.status(400).json({ error: "Invalid deal data" });
    }
  });

  app.patch("/api/crm/deals/:id", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const existingDeal = await storage.getCrmDeal(req.params.id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const deal = await storage.updateCrmDeal(req.params.id, req.body);
      
      if (req.body.stageId && req.body.stageId !== existingDeal.stageId) {
        await storage.createDealActivity({
          dealId: deal!.id,
          userId: req.user?.id,
          type: "STAGE_CHANGED",
          data: { oldStageId: existingDeal.stageId, newStageId: req.body.stageId },
        });
      }
      
      res.json(deal);
    } catch (error) {
      res.status(500).json({ error: "Failed to update deal" });
    }
  });

  app.patch("/api/crm/deals/:id/stage", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const { stageId } = req.body;
      if (!stageId) {
        return res.status(400).json({ error: "stageId is required" });
      }

      const existingDeal = await storage.getCrmDeal(req.params.id);
      if (!existingDeal) {
        return res.status(404).json({ error: "Deal not found" });
      }

      const deal = await storage.updateCrmDeal(req.params.id, { stageId });
      
      await storage.createDealActivity({
        dealId: deal!.id,
        userId: req.user?.id,
        type: "STAGE_CHANGED",
        data: { oldStageId: existingDeal.stageId, newStageId: stageId },
      });
      
      res.json(deal);
    } catch (error) {
      res.status(500).json({ error: "Failed to update deal stage" });
    }
  });

  app.delete("/api/crm/deals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCrmDeal(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Deal not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete deal" });
    }
  });

  app.get("/api/crm/deals/:dealId/notes", async (req, res) => {
    try {
      const notes = await storage.getDealNotes(req.params.dealId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/crm/deals/:dealId/notes", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const noteData = {
        ...req.body,
        dealId: req.params.dealId,
        authorId: req.body.authorId || req.user?.id,
      };
      const validatedData = insertDealNoteSchema.parse(noteData);
      const note = await storage.createDealNote(validatedData);
      
      await storage.createDealActivity({
        dealId: req.params.dealId,
        userId: req.user?.id,
        type: "NOTE_ADDED",
        data: { noteId: note.id },
      });
      
      res.json(note);
    } catch (error) {
      res.status(400).json({ error: "Invalid note data" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const { status, assignedToId, from, to } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (assignedToId) filters.assignedToId = assignedToId as string;
      if (from) filters.fromDate = new Date(from as string);
      if (to) filters.toDate = new Date(to as string);
      
      const allTasks = await storage.getTasks(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(allTasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/my/tasks", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const allTasks = await storage.getTasks({ assignedToId: req.user.id });
      res.json(allTasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/crm/deals/:dealId/tasks", async (req, res) => {
    try {
      const allTasks = await storage.getTasksByDeal(req.params.dealId);
      res.json(allTasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/crm/deals/:dealId/tasks", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const taskData = {
        ...req.body,
        dealId: req.params.dealId,
      };
      const validatedData = insertTaskSchema.parse(taskData);
      const task = await storage.createTask(validatedData);
      
      await storage.createDealActivity({
        dealId: req.params.dealId,
        userId: req.user?.id,
        type: "TASK_CREATED",
        data: { taskId: task.id, title: task.title },
      });
      
      res.json(task);
    } catch (error) {
      res.status(400).json({ error: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const task = await storage.updateTask(req.params.id, req.body);
      
      if (req.body.status === "DONE" && existingTask.status !== "DONE" && existingTask.dealId) {
        await storage.createDealActivity({
          dealId: existingTask.dealId,
          userId: req.user?.id,
          type: "TASK_COMPLETED",
          data: { taskId: task!.id, title: task!.title },
        });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.get("/api/crm/deals/:dealId/activity", async (req, res) => {
    try {
      const activities = await storage.getDealActivities(req.params.dealId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/admin/settings", async (req, res) => {
    try {
      const allSettings = await storage.getSettings();
      const settingsObj: Record<string, any> = {};
      allSettings.forEach(s => { settingsObj[s.key] = s.value; });
      res.json(settingsObj);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/settings", async (req, res) => {
    try {
      const settingsToUpdate = req.body;
      const results = [];
      for (const [key, value] of Object.entries(settingsToUpdate)) {
        const setting = await storage.upsertSetting(key, value);
        results.push(setting);
      }
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/reports/summary", async (req, res) => {
    try {
      const { from, to } = req.query;
      const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to as string) : new Date();

      const allDeals = await storage.getCrmDeals();
      const stages = await storage.getPipelineStages();
      const closedStages = stages.filter(s => s.isClosed);
      const wonStages = stages.filter(s => s.isWon);
      const closedStageIds = closedStages.map(s => s.id);
      const wonStageIds = wonStages.map(s => s.id);

      const openDeals = allDeals.filter(d => !closedStageIds.includes(d.stageId || ""));
      const wonDeals = allDeals.filter(d => wonStageIds.includes(d.stageId || ""));
      const newLeads = allDeals.filter(d => 
        d.createdAt >= fromDate && d.createdAt <= toDate
      );
      const closedInRange = allDeals.filter(d => 
        closedStageIds.includes(d.stageId || "") &&
        d.updatedAt >= fromDate && d.updatedAt <= toDate
      );
      const wonInRange = closedInRange.filter(d => wonStageIds.includes(d.stageId || ""));

      const totalPipelineValue = openDeals.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
      const totalWonValue = wonDeals.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
      const winRate = closedInRange.length > 0 ? (wonInRange.length / closedInRange.length) * 100 : 0;

      res.json({
        totalPipelineValue,
        totalWonValue,
        newLeadsCount: newLeads.length,
        winRate: Math.round(winRate * 10) / 10,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  app.get("/api/reports/revenue-over-time", async (req, res) => {
    try {
      const { interval = "month" } = req.query;
      const stages = await storage.getPipelineStages();
      const wonStageIds = stages.filter(s => s.isWon).map(s => s.id);
      
      const allDeals = await storage.getCrmDeals();
      const wonDeals = allDeals.filter(d => wonStageIds.includes(d.stageId || ""));

      const grouped: Record<string, number> = {};
      wonDeals.forEach(deal => {
        const date = new Date(deal.updatedAt);
        let key: string;
        if (interval === "week") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        }
        grouped[key] = (grouped[key] || 0) + parseFloat(deal.amount || "0");
      });

      const result = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, totalWon]) => ({
          periodStart: period,
          periodEnd: period,
          totalWon,
        }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate revenue report" });
    }
  });

  app.get("/api/reports/deals-by-stage", async (req, res) => {
    try {
      const stages = await storage.getPipelineStages();
      const allDeals = await storage.getCrmDeals();

      const result = stages.map(stage => ({
        stageId: stage.id,
        stageName: stage.name,
        count: allDeals.filter(d => d.stageId === stage.id).length,
        totalValue: allDeals
          .filter(d => d.stageId === stage.id)
          .reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0),
      }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate deals by stage report" });
    }
  });

  app.get("/api/reports/performance-by-rep", async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const allDeals = await storage.getCrmDeals();
      const stages = await storage.getPipelineStages();
      const wonStageIds = stages.filter(s => s.isWon).map(s => s.id);

      const result = allUsers.map(user => {
        const userDeals = allDeals.filter(d => d.ownerId === user.id);
        const wonDeals = userDeals.filter(d => wonStageIds.includes(d.stageId || ""));
        return {
          userId: user.id,
          name: user.name,
          dealsCount: userDeals.length,
          wonDealsCount: wonDeals.length,
          totalWon: wonDeals.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0),
        };
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate performance report" });
    }
  });

  app.get("/api/leads", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const isAdminOrManager = user.role === "ADMIN" || user.role === "MANAGER";
      
      let leads;
      if (isAdminOrManager) {
        leads = await storage.getLeads();
      } else if (user.role === "REP") {
        leads = await storage.getLeads(user.id);
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      let lead = await storage.createLead(validatedData);
      
      if (validatedData.companyName && validatedData.contactName) {
        try {
          const aiMessage = await generateFirstMessage({
            companyName: validatedData.companyName,
            contactName: validatedData.contactName,
            buildingSpecs: validatedData.buildingSpecs as any,
          });
          
          const updated = await storage.updateLead(lead.id, { aiFirstMessage: aiMessage });
          if (updated) lead = updated;
        } catch (aiError) {
          console.error("AI message generation failed:", aiError);
        }
      }
      
      await triggerWebhook("new_lead", lead);
      
      res.json(lead);
    } catch (error) {
      res.status(400).json({ error: "Invalid lead data" });
    }
  });

  app.post("/api/leads/parse", async (req, res) => {
    try {
      const { content, filename } = req.body;
      
      let parsedLead;
      try {
        parsedLead = await parseLeadFromText(content, filename);
      } catch (aiError) {
        return res.status(500).json({ error: "AI parsing failed. Please ensure OPENAI_API_KEY is configured." });
      }
      
      const leadData = {
        companyName: parsedLead.companyName,
        contactName: parsedLead.contactName,
        email: parsedLead.email || null,
        phone: parsedLead.phone || null,
        source: parsedLead.source,
        temperature: "warm",
        stage: "new",
        buildingSpecs: parsedLead.buildingSpecs || null,
        aiNotes: parsedLead.notes || null,
        assignedTo: null,
        aiFirstMessage: null,
      };

      let lead = await storage.createLead(leadData);
      
      try {
        const aiMessage = await generateFirstMessage({
          companyName: lead.companyName,
          contactName: lead.contactName,
          buildingSpecs: lead.buildingSpecs as any,
        });
        
        const updated = await storage.updateLead(lead.id, { aiFirstMessage: aiMessage });
        if (updated) lead = updated;
      } catch (aiError) {
        console.error("AI message generation failed:", aiError);
      }
      
      await triggerWebhook("new_lead", lead);
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to parse lead: " + (error as Error).message });
    }
  });

  app.patch("/api/leads/:id/assign", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const isAdminOrManager = user.role === "ADMIN" || user.role === "MANAGER";
      
      if (!isAdminOrManager) {
        return res.status(403).json({ error: "Only admins or managers can assign leads" });
      }
      
      const { assignedTo } = req.body;
      if (!assignedTo) {
        return res.status(400).json({ error: "assignedTo is required" });
      }
      
      const lead = await storage.updateLead(req.params.id, { assignedTo });
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign lead" });
    }
  });

  app.patch("/api/leads/:id", optionalAuthMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const updates = req.body;
      
      if (updates.assignedTo && req.user) {
        const isAdminOrManager = req.user.role === "ADMIN" || req.user.role === "MANAGER";
        if (!isAdminOrManager) {
          delete updates.assignedTo;
        }
      }
      
      const lead = await storage.updateLead(req.params.id, updates);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      if (updates.stage) {
        await triggerWebhook("stage_change", { leadId: lead.id, newStage: updates.stage });
        
        if (updates.stage === "won") {
          await triggerWebhook("deal_won", lead);
        }
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteLead(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  app.get("/api/deals", async (req, res) => {
    try {
      const deals = await storage.getDeals();
      res.json(deals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  app.post("/api/deals", async (req, res) => {
    try {
      const validatedData = insertDealSchema.parse(req.body);
      const deal = await storage.createDeal(validatedData);
      res.json(deal);
    } catch (error) {
      res.status(400).json({ error: "Invalid deal data" });
    }
  });

  app.get("/api/activities/:leadId", async (req, res) => {
    try {
      const activities = await storage.getActivities(req.params.leadId);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const validatedData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(validatedData);
      res.json(activity);
    } catch (error) {
      res.status(400).json({ error: "Invalid activity data" });
    }
  });

  app.post("/api/ai/call-summary", async (req, res) => {
    try {
      const { transcript } = req.body;
      const summary = await generateCallSummary(transcript);
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  app.post("/api/ai/unstick", async (req, res) => {
    try {
      const { leadId } = req.body;
      const lead = await storage.getLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      const suggestion = await generateUnstickSuggestion({
        companyName: lead.companyName,
        contactName: lead.contactName,
        stage: lead.stage,
        temperature: lead.temperature,
        notes: lead.aiNotes || undefined,
      });
      
      res.json({ suggestion });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  app.get("/api/ai/morning-brief", async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const brief = await generateMorningBrief(leads);
      res.json({ brief });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate brief" });
    }
  });

  app.get("/api/webhooks", async (req, res) => {
    try {
      const webhooks = await storage.getWebhooks();
      res.json(webhooks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.post("/api/webhooks", async (req, res) => {
    try {
      const validatedData = insertZapierWebhookSchema.parse(req.body);
      const webhook = await storage.createWebhook(validatedData);
      res.json(webhook);
    } catch (error) {
      res.status(400).json({ error: "Invalid webhook data" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const allProjects = await storage.getProjects();
      res.json(allProjects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.get("/api/callbacks", async (req, res) => {
    try {
      const allCallbacks = await storage.getCallbacks();
      res.json(allCallbacks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch callbacks" });
    }
  });

  app.get("/api/callbacks/:id", async (req, res) => {
    try {
      const callback = await storage.getCallback(req.params.id);
      if (!callback) {
        return res.status(404).json({ error: "Callback not found" });
      }
      res.json(callback);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch callback" });
    }
  });

  app.post("/api/callbacks", async (req, res) => {
    try {
      const validatedData = insertCallbackSchema.parse(req.body);
      const callback = await storage.createCallback(validatedData);
      res.json(callback);
    } catch (error) {
      res.status(400).json({ error: "Invalid callback data" });
    }
  });

  app.patch("/api/callbacks/:id", async (req, res) => {
    try {
      const callback = await storage.updateCallback(req.params.id, req.body);
      if (!callback) {
        return res.status(404).json({ error: "Callback not found" });
      }
      res.json(callback);
    } catch (error) {
      res.status(500).json({ error: "Failed to update callback" });
    }
  });

  app.get("/api/pricing-config", async (req, res) => {
    try {
      const pricing = await storage.getPricingConfig();
      res.json(pricing || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pricing config" });
    }
  });

  app.post("/api/pricing-config", async (req, res) => {
    try {
      const validatedData = insertPricingConfigSchema.parse(req.body);
      const pricing = await storage.createPricingConfig(validatedData);
      res.json(pricing);
    } catch (error) {
      res.status(400).json({ error: "Invalid pricing data" });
    }
  });

  app.patch("/api/pricing-config/:id", async (req, res) => {
    try {
      const pricing = await storage.updatePricingConfig(req.params.id, req.body);
      if (!pricing) {
        return res.status(404).json({ error: "Pricing config not found" });
      }
      res.json(pricing);
    } catch (error) {
      res.status(500).json({ error: "Failed to update pricing" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
