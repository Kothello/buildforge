import { storage } from "./storage";

export async function seedData() {
  try {
    const existingLeads = await storage.getLeads();
    if (existingLeads.length > 0) {
      console.log("Database already seeded");
      return;
    }

    console.log("Seeding database...");

    const user = await storage.createUser({
      name: "John Sales",
      email: "john@steelflow.com",
      role: "Sales Rep",
      avatar: null,
    });

    const leads = [
      {
        companyName: "Smith Manufacturing",
        contactName: "Robert Smith",
        email: "robert@smithmfg.com",
        phone: "+1 (555) 123-4567",
        source: "Website Inquiry",
        temperature: "fire",
        stage: "negotiating",
        assignedTo: user.id,
        buildingSpecs: { width: 50, length: 80, height: 16, roofStyle: "Gable" },
        aiNotes: "Needs building for warehouse expansion. Budget approved, ready to move forward.",
        aiFirstMessage: "Hi Robert! I saw you're looking to expand Smith Manufacturing with a new steel building. I'd love to help you design the perfect 50' × 80' warehouse. When's a good time to discuss your project?",
      },
      {
        companyName: "Johnson Logistics",
        contactName: "Sarah Johnson",
        email: "sarah@johnsonlogistics.com",
        phone: "+1 (555) 234-5678",
        source: "Referral",
        temperature: "hot",
        stage: "quote_sent",
        assignedTo: user.id,
        buildingSpecs: { width: 60, length: 100, height: 18, roofStyle: "Gambrel" },
        aiNotes: "Looking for storage facility. Price-conscious but quality-focused.",
        aiFirstMessage: "Hi Sarah! Thanks for reaching out about your storage facility project. Based on your needs, I think a 60' × 100' Gambrel roof design would be perfect. Let me put together a quote for you.",
      },
      {
        companyName: "Green Valley Farm",
        contactName: "Mike Anderson",
        email: "mike@greenvalley.com",
        phone: "+1 (555) 345-6789",
        source: "Trade Show",
        temperature: "warm",
        stage: "contacted",
        assignedTo: user.id,
        buildingSpecs: { width: 40, length: 60, height: 14, roofStyle: "Gable" },
        aiNotes: "Agricultural building for equipment storage. Seasonal timeline.",
        aiFirstMessage: "Hi Mike! Great meeting you at the trade show. I'm excited to help with your equipment storage building. A 40' × 60' structure would be ideal for your farm operations. Should we schedule a site visit?",
      },
      {
        companyName: "Tech Solutions Inc",
        contactName: "Lisa Chen",
        email: "lisa@techsolutions.com",
        phone: "+1 (555) 456-7890",
        source: "Cold Call",
        temperature: "cold",
        stage: "new",
        assignedTo: user.id,
        buildingSpecs: { width: 30, length: 40, height: 12, roofStyle: "Gable" },
        aiNotes: "Initial interest in office/warehouse combo. Budget not yet confirmed.",
        aiFirstMessage: "Hi Lisa! Thanks for taking my call earlier. I understand Tech Solutions is looking at expansion options. A 30' × 40' office/warehouse combo could be perfect for your growing team. Can we discuss your vision?",
      },
    ];

    for (const leadData of leads) {
      const lead = await storage.createLead(leadData);
      
      const deal = await storage.createDeal({
        leadId: lead.id,
        buildingWidth: (leadData.buildingSpecs as any).width,
        buildingLength: (leadData.buildingSpecs as any).length,
        buildingHeight: (leadData.buildingSpecs as any).height,
        roofStyle: (leadData.buildingSpecs as any).roofStyle,
        color: "Gray",
        cost: "28500",
        price: "42000",
        margin: "32.14",
        contractStatus: "pending",
        depositPaid: false,
        depositAmount: null,
        screenshot3d: null,
      });

      await storage.createActivity({
        leadId: lead.id,
        userId: user.id,
        type: "note",
        content: `Lead created from ${leadData.source}`,
        metadata: null,
      });
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
