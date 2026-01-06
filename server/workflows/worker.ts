/**
 * Workflow Worker
 * Background process that polls for pending workflow runs and processes them
 * 
 * Usage:
 *   WORKER_ENABLED=true tsx server/workflows/worker.ts
 */

import { storage } from "../storage";
import { processPendingRuns } from "../lib/workflowExecutor";

const WORKER_ENABLED = process.env.WORKER_ENABLED === "true";
const POLL_INTERVAL_MS = parseInt(process.env.WORKFLOW_POLL_INTERVAL_MS || "5000");
const BATCH_SIZE = parseInt(process.env.WORKFLOW_BATCH_SIZE || "10");

let isShuttingDown = false;

async function workerLoop() {
  console.log("[workflow-worker] Starting worker loop");
  console.log(`[workflow-worker] Poll interval: ${POLL_INTERVAL_MS}ms, Batch size: ${BATCH_SIZE}`);

  while (!isShuttingDown) {
    try {
      const processedCount = await processPendingRuns(storage, BATCH_SIZE);
      
      if (processedCount > 0) {
        console.log(`[workflow-worker] Processed ${processedCount} runs`);
      }
    } catch (error) {
      console.error("[workflow-worker] Error in worker loop:", error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  console.log("[workflow-worker] Worker stopped");
}

function handleShutdown(signal: string) {
  console.log(`[workflow-worker] Received ${signal}, shutting down gracefully...`);
  isShuttingDown = true;
}

async function main() {
  if (!WORKER_ENABLED) {
    console.log("[workflow-worker] WORKER_ENABLED is not set to true, exiting");
    process.exit(0);
  }

  console.log("[workflow-worker] Workflow worker starting...");

  // Handle shutdown signals
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));

  try {
    await workerLoop();
  } catch (error) {
    console.error("[workflow-worker] Fatal error:", error);
    process.exit(1);
  }
}

// Run worker if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { workerLoop };
