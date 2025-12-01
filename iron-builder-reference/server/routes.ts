import type { Express } from "express";
import { createServer } from "http";
import { db } from "./db.js";
import { buildingDesigns, insertBuildingDesignSchema } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import pricingRoutes from "./pricingRoutes.js";

export function registerRoutes(app: Express) {
  // Register pricing routes
  app.use("/api/pricing", pricingRoutes);
  // Get all building designs
  app.get("/api/designs", async (req, res) => {
    try {
      const designs = await db.select().from(buildingDesigns);
      res.json(designs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch designs" });
    }
  });

  // Get a single building design
  app.get("/api/designs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const design = await db
        .select()
        .from(buildingDesigns)
        .where(eq(buildingDesigns.id, parseInt(id)));

      if (design.length === 0) {
        return res.status(404).json({ error: "Design not found" });
      }

      res.json(design[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch design" });
    }
  });

  // Create a new building design
  app.post("/api/designs", async (req, res) => {
    try {
      const validatedData = insertBuildingDesignSchema.parse(req.body);
      const newDesign = await db
        .insert(buildingDesigns)
        .values(validatedData)
        .returning();

      res.status(201).json(newDesign[0]);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to create design" });
      }
    }
  });

  // Update a building design
  app.patch("/api/designs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBuildingDesignSchema.partial().parse(req.body);

      const updatedDesign = await db
        .update(buildingDesigns)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(buildingDesigns.id, parseInt(id)))
        .returning();

      if (updatedDesign.length === 0) {
        return res.status(404).json({ error: "Design not found" });
      }

      res.json(updatedDesign[0]);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update design" });
      }
    }
  });

  // Delete a building design
  app.delete("/api/designs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await db
        .delete(buildingDesigns)
        .where(eq(buildingDesigns.id, parseInt(id)))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Design not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete design" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
