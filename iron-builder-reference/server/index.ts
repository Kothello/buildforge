import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Register API routes
  registerRoutes(app);

  if (process.env.NODE_ENV === "production") {
    log("Starting in production mode");
    serveStatic(app);
  } else {
    log("Starting in development mode");
    await setupVite(app, server);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
