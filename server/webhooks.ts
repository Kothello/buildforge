import { storage } from "./storage";

export async function triggerWebhook(event: string, data: any) {
  try {
    const webhooks = await storage.getWebhooks();
    const activeWebhooks = webhooks.filter((w) => w.active && w.event === event);

    const promises = activeWebhooks.map(async (webhook) => {
      try {
        await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data,
          }),
        });
      } catch (error) {
        console.error(`Webhook ${webhook.id} failed:`, error);
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error triggering webhooks:", error);
  }
}
