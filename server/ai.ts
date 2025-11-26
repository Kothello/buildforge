import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Please add your API key to enable AI features.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

interface ParsedLead {
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  source: string;
  buildingSpecs?: {
    width?: number;
    length?: number;
    height?: number;
    roofStyle?: string;
  };
  notes?: string;
}

export async function parseLeadFromText(content: string, filename: string): Promise<ParsedLead> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting lead information from various sources (emails, CSVs, text files, etc.). 
Extract the following fields and return as JSON:
- companyName (required): The company or business name
- contactName (required): The person's name
- email (optional): Email address
- phone (optional): Phone number
- source: Describe where this came from (e.g., "Email", "CSV Import", "Website Form")
- buildingSpecs (optional): {
    width: building width in feet
    length: building length in feet
    height: building height in feet
    roofStyle: type of roof (Gable, Gambrel, etc.)
  }
- notes: Any additional relevant information

If you can't find required fields, make a best guess or use placeholder values. Return valid JSON only.`,
        },
        {
          role: "user",
          content: `Filename: ${filename}\n\nContent:\n${content}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      companyName: result.companyName || "Unknown Company",
      contactName: result.contactName || "Unknown Contact",
      email: result.email,
      phone: result.phone,
      source: result.source || filename,
      buildingSpecs: result.buildingSpecs,
      notes: result.notes,
    };
  } catch (error) {
    throw new Error("Failed to parse lead with AI: " + (error as Error).message);
  }
}

export async function generateFirstMessage(lead: {
  companyName: string;
  contactName: string;
  buildingSpecs?: any;
}): Promise<string> {
  try {
    const openai = getOpenAI();
    const specs = lead.buildingSpecs || {};
    const specsText = specs.width
      ? `${specs.width}' × ${specs.length}' building`
      : "their building project";

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a professional sales rep for a steel building company. Write a personalized, friendly first message to a potential customer. Keep it under 100 words. Be warm but professional. Focus on helping them achieve their goals.`,
        },
        {
          role: "user",
          content: `Write a first contact message for:\nCompany: ${lead.companyName}\nContact: ${lead.contactName}\nProject: ${specsText}`,
        },
      ],
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    return `Hi ${lead.contactName}, I saw your inquiry about ${lead.companyName}'s building project. I'd love to help you find the perfect steel building solution. When would be a good time to discuss your needs?`;
  }
}

export async function generateCallSummary(transcript: string): Promise<string> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Summarize this sales call transcript. Include: key points discussed, customer needs, next steps, and any action items. Keep it concise and actionable.`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    return response.choices[0].message.content || "Call summary unavailable";
  } catch (error) {
    throw new Error("Failed to generate call summary: " + (error as Error).message);
  }
}

export async function generateUnstickSuggestion(lead: {
  companyName: string;
  contactName: string;
  stage: string;
  temperature: string;
  notes?: string;
}): Promise<string> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a sales coach helping unstick stalled deals. Provide 3-5 specific, actionable suggestions to move this deal forward. Be creative and strategic.`,
        },
        {
          role: "user",
          content: `Deal stuck at stage: ${lead.stage}\nTemperature: ${lead.temperature}\nCompany: ${lead.companyName}\nContact: ${lead.contactName}\nNotes: ${lead.notes || "None"}`,
        },
      ],
    });

    return response.choices[0].message.content || "Try following up with a personalized offer.";
  } catch (error) {
    throw new Error("Failed to generate suggestions: " + (error as Error).message);
  }
}

export async function generateMorningBrief(leads: any[]): Promise<string> {
  try {
    const openai = getOpenAI();
    const hotLeads = leads
      .filter((l) => l.temperature === "hot" || l.temperature === "fire")
      .slice(0, 10);

    const leadsText = hotLeads
      .map((l, i) => `${i + 1}. ${l.companyName} (${l.contactName}) - ${l.temperature}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `Create an energizing morning brief for a sales rep. Highlight the top opportunities and provide motivation. Keep it under 150 words.`,
        },
        {
          role: "user",
          content: `Today's hot leads:\n${leadsText}`,
        },
      ],
    });

    return response.choices[0].message.content || "Great opportunities today! Let's close some deals.";
  } catch (error) {
    return "Ready to crush it today! Focus on your hottest leads and make it happen.";
  }
}
