import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface QuoteRequest {
  structureType: string;
  length: string;
  width: string;
  height: string;
  roofStyle: string;
  doors: string;
  insulation: string;
  foundation: string;
  buildingPurpose: string;
  state: string;
}

interface MaterialItem {
  item: string;
  quantity: string;
  unitCost: string;
  totalCost: string;
}

interface AIQuoteResponse {
  summary: string;
  materials: MaterialItem[];
  laborEstimate: string;
  totalEstimate: string;
  timelineWeeks: string;
  suggestions: string[];
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/ai-quote", async (req: Request, res: Response) => {
    const specs: QuoteRequest = req.body;

    if (!specs.length || !specs.width || !specs.structureType) {
      res.status(400).json({ error: "Length, width, and structure type are required" });
      return;
    }

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `You are a steel building cost estimator. Generate a detailed quote estimate for this prefabricated steel building.

Building specs:
- Structure type: ${specs.structureType || "Cold-formed steel C-channel"}
- Dimensions: ${specs.length}' L x ${specs.width}' W x ${specs.height || "14"}' H
- Roof style: ${specs.roofStyle || "Gable"}
- Doors: ${specs.doors || "1 walk door, 1 roll-up"}
- Insulation: ${specs.insulation || "None"}
- Foundation: ${specs.foundation || "Not specified"}
- Purpose: ${specs.buildingPurpose || "General storage"}
- Location (state): ${specs.state || "FL"}

Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "summary": "1-2 sentence overview of the building and estimate",
  "materials": [
    {"item": "material name", "quantity": "amount with units", "unitCost": "$X.XX", "totalCost": "$X,XXX"}
  ],
  "laborEstimate": "$X,XXX - $X,XXX",
  "totalEstimate": "$XX,XXX - $XX,XXX",
  "timelineWeeks": "X-X weeks",
  "suggestions": ["3 value-engineering suggestions to reduce cost or improve the build"]
}

Include materials: primary steel framing, secondary framing, wall panels, roof panels, trim/flashing, fasteners, doors, insulation (if specified), foundation anchors, and gutters/downspouts. Use realistic 2026 US market pricing for the specified state.`
        }]
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const quote: AIQuoteResponse = JSON.parse(text);
      res.json(quote);
    } catch (err) {
      console.error("AI quote generation failed:", err);
      res.status(500).json({ error: "Failed to generate AI quote. Please try again." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
