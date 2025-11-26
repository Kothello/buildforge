import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, insertDealSchema, insertActivitySchema, insertZapierWebhookSchema, insertProjectSchema, insertCallbackSchema, insertPricingConfigSchema } from "@shared/schema";
import { parseLeadFromText, generateFirstMessage, generateCallSummary, generateUnstickSuggestion, generateMorningBrief } from "./ai";
import { triggerWebhook } from "./webhooks";

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.get("/api/pricing", async (req, res) => {
    try {
      const pricing = await storage.getPricingConfig();
      res.json(pricing || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pricing config" });
    }
  });

  app.post("/api/pricing", async (req, res) => {
    try {
      const validatedData = insertPricingConfigSchema.parse(req.body);
      const pricing = await storage.createPricingConfig(validatedData);
      res.json(pricing);
    } catch (error) {
      res.status(400).json({ error: "Invalid pricing data" });
    }
  });

  app.patch("/api/pricing/:id", async (req, res) => {
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
