/**
 * Workflow Automation API Routes
 * CRUD operations for workflows with RBAC (Admin-only for create/edit)
 */

import { Router } from "express";
import type { IStorage } from "../storage";
import { authMiddleware, requireRole, type AuthenticatedRequest } from "../auth";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  validateTriggerConfig,
  validateActionConfig,
} from "../lib/workflowSchemas";
import { z } from "zod";

export function createWorkflowRoutes(storage: IStorage) {
  const router = Router();

  /**
   * GET /api/workflows
   * List all workflows (Admin/Manager can see all, Rep can see enabled only)
   */
  router.get("/", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      let workflows = await storage.getWorkflows();

      // Non-admin users can only see enabled workflows
      if (user.role !== "ADMIN" && user.role !== "SALES_MANAGER") {
        workflows = workflows.filter(w => w.enabled);
      }

      // Fetch triggers and actions for each workflow
      const workflowsWithDetails = await Promise.all(
        workflows.map(async (workflow) => {
          const triggers = await storage.getWorkflowTriggers(workflow.id);
          const actions = await storage.getWorkflowActions(workflow.id);
          return {
            ...workflow,
            triggers,
            actions,
          };
        })
      );

      res.json(workflowsWithDetails);
    } catch (error: any) {
      console.error("[workflow-api] Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  /**
   * GET /api/workflows/:id
   * Get a single workflow with triggers, actions, and recent runs
   */
  router.get("/:id", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const workflow = await storage.getWorkflow(id);

      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      const triggers = await storage.getWorkflowTriggers(id);
      const actions = await storage.getWorkflowActions(id);
      const runs = await storage.getWorkflowRuns(id, 20);

      res.json({
        ...workflow,
        triggers,
        actions,
        runs,
      });
    } catch (error: any) {
      console.error("[workflow-api] Error fetching workflow:", error);
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  /**
   * POST /api/workflows
   * Create a new workflow (Admin only)
   */
  router.post("/", authMiddleware(storage), requireRole("ADMIN"), async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;

      // Validate payload
      const payload = createWorkflowSchema.parse(req.body);

      // Validate trigger configuration
      const triggerValidation = validateTriggerConfig(payload.trigger.type, payload.trigger.config);
      if (!triggerValidation.valid) {
        return res.status(400).json({ error: `Invalid trigger config: ${triggerValidation.error}` });
      }

      // Validate action configurations
      for (let i = 0; i < payload.actions.length; i++) {
        const action = payload.actions[i];
        const actionValidation = validateActionConfig(action.type, action.config);
        if (!actionValidation.valid) {
          return res.status(400).json({ 
            error: `Invalid action config at index ${i}: ${actionValidation.error}` 
          });
        }
      }

      // Create workflow
      const workflow = await storage.createWorkflow({
        name: payload.name,
        description: payload.description || null,
        enabled: payload.enabled,
        createdBy: user.id,
      });

      // Create trigger
      const trigger = await storage.createWorkflowTrigger({
        workflowId: workflow.id,
        type: payload.trigger.type,
        configJson: payload.trigger.config,
      });

      // Create actions
      const actions = await Promise.all(
        payload.actions.map((action, index) =>
          storage.createWorkflowAction({
            workflowId: workflow.id,
            orderIndex: index,
            type: action.type,
            configJson: action.config,
          })
        )
      );

      console.log(`[workflow-api] Workflow created: ${workflow.id} by user ${user.id}`);

      res.status(201).json({
        ...workflow,
        triggers: [trigger],
        actions,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("[workflow-api] Error creating workflow:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  /**
   * PATCH /api/workflows/:id
   * Update a workflow (Admin only)
   */
  router.patch("/:id", authMiddleware(storage), requireRole("ADMIN"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const workflow = await storage.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      // Validate payload
      const payload = updateWorkflowSchema.parse(req.body);

      // Update workflow
      const updatedWorkflow = await storage.updateWorkflow(id, payload);

      console.log(`[workflow-api] Workflow updated: ${id} by user ${user.id}`);

      res.json(updatedWorkflow);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("[workflow-api] Error updating workflow:", error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  /**
   * DELETE /api/workflows/:id
   * Delete a workflow (Admin only)
   */
  router.delete("/:id", authMiddleware(storage), requireRole("ADMIN"), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const workflow = await storage.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      await storage.deleteWorkflow(id);

      console.log(`[workflow-api] Workflow deleted: ${id} by user ${user.id}`);

      res.json({ success: true });
    } catch (error: any) {
      console.error("[workflow-api] Error deleting workflow:", error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  /**
   * GET /api/workflows/:id/runs
   * Get workflow run history with pagination
   */
  router.get("/:id/runs", authMiddleware(storage), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const workflow = await storage.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      const runs = await storage.getWorkflowRuns(id, limit);

      // Fetch steps for each run
      const runsWithSteps = await Promise.all(
        runs.map(async (run) => {
          const steps = await storage.getWorkflowRunSteps(run.id);
          return {
            ...run,
            steps,
          };
        })
      );

      res.json(runsWithSteps);
    } catch (error: any) {
      console.error("[workflow-api] Error fetching workflow runs:", error);
      res.status(500).json({ error: "Failed to fetch workflow runs" });
    }
  });

  return router;
}
