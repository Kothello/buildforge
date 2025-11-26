import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertDealSchema, insertActivitySchema, insertZapierWebhookSchema } from "@shared/schema";
import { parseLeadFromText, generateFirstMessage, generateCallSummary, generateUnstickSuggestion, generateMorningBrief } from "./ai";
import { triggerWebhook } from "./webhooks";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getLeads();
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

  app.patch("/api/leads/:id", async (req, res) => {
    try {
      const updates = req.body;
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

  const httpServer = createServer(app);

  return httpServer;
}
