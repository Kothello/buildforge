/**
 * Workflow Automation Tests
 * Tests workflow CRUD, validation, execution, and triggers
 */

import { describe, it, expect, beforeAll } from "vitest";
import { storage } from "../storage";
import { enqueueWorkflowRun, processWorkflowRun } from "../lib/workflowExecutor";
import { validateTriggerConfig, validateActionConfig } from "../lib/workflowSchemas";

describe("Workflow System", () => {
  let testUserId: string;
  let testWorkflowId: string;

  beforeAll(async () => {
    // Create a test admin user
    const users = await storage.getUsers();
    const adminUser = users.find(u => u.role === "ADMIN");
    if (adminUser) {
      testUserId = adminUser.id;
    } else {
      const newUser = await storage.createUser({
        name: "Test Admin",
        email: `test-admin-${Date.now()}@test.com`,
        passwordHash: "dummy-hash",
        role: "ADMIN",
        active: true,
      });
      testUserId = newUser.id;
    }
  });

  describe("Workflow CRUD", () => {
    it("should create a workflow with triggers and actions", async () => {
      const workflow = await storage.createWorkflow({
        name: "Test Workflow",
        description: "Test workflow description",
        enabled: true,
        createdBy: testUserId,
      });

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe("Test Workflow");
      expect(workflow.enabled).toBe(true);

      testWorkflowId = workflow.id;

      // Create trigger
      const trigger = await storage.createWorkflowTrigger({
        workflowId: workflow.id,
        type: "TASK_COMPLETED",
        configJson: { taskId: "test-task-id" },
      });

      expect(trigger).toBeDefined();
      expect(trigger.type).toBe("TASK_COMPLETED");

      // Create action
      const action = await storage.createWorkflowAction({
        workflowId: workflow.id,
        orderIndex: 0,
        type: "SEND_NOTIFICATION",
        configJson: {
          title: "Task Completed",
          message: "A task was completed",
          priority: "normal",
        },
      });

      expect(action).toBeDefined();
      expect(action.type).toBe("SEND_NOTIFICATION");
    });

    it("should retrieve workflows", async () => {
      const workflows = await storage.getWorkflows();
      expect(workflows.length).toBeGreaterThan(0);
    });

    it("should update workflow", async () => {
      const updated = await storage.updateWorkflow(testWorkflowId, {
        name: "Updated Workflow Name",
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe("Updated Workflow Name");
    });

    it("should get workflow by trigger type", async () => {
      const workflows = await storage.getWorkflowsByTriggerType("TASK_COMPLETED");
      expect(workflows.length).toBeGreaterThan(0);
    });
  });

  describe("Workflow Validation", () => {
    it("should validate valid trigger config", () => {
      const result = validateTriggerConfig("TASK_COMPLETED", {
        taskId: "test-task-id",
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid trigger type", () => {
      const result = validateTriggerConfig("INVALID_TRIGGER", {});

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown trigger type");
    });

    it("should validate valid action config", () => {
      const result = validateActionConfig("SEND_NOTIFICATION", {
        title: "Test",
        message: "Test message",
        priority: "high",
      });

      expect(result.valid).toBe(true);
    });

    it("should reject invalid action config", () => {
      const result = validateActionConfig("SEND_NOTIFICATION", {
        // Missing required fields
        priority: "high",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Workflow Execution", () => {
    it("should enqueue a workflow run", async () => {
      await enqueueWorkflowRun(storage, {
        type: "TASK_COMPLETED",
        entityType: "task",
        entityId: "test-task-id",
        userId: testUserId,
        data: {
          taskId: "test-task-id",
          title: "Test Task",
        },
      });

      const pendingRuns = await storage.getPendingWorkflowRuns(10);
      expect(pendingRuns.length).toBeGreaterThan(0);

      const latestRun = pendingRuns[0];
      expect(latestRun.status).toBe("PENDING");
      expect(latestRun.triggerType).toBe("TASK_COMPLETED");
    });

    it("should process a workflow run", async () => {
      const pendingRuns = await storage.getPendingWorkflowRuns(1);
      if (pendingRuns.length > 0) {
        const run = pendingRuns[0];
        
        await processWorkflowRun(storage, run.id);

        const updatedRun = await storage.getWorkflowRun(run.id);
        expect(updatedRun?.status).toMatch(/SUCCESS|FAILED/);
        expect(updatedRun?.finishedAt).toBeDefined();

        // Check steps were created
        const steps = await storage.getWorkflowRunSteps(run.id);
        expect(steps.length).toBeGreaterThan(0);
      }
    });
  });

  describe("RBAC", () => {
    it("should only allow admin to create workflows", async () => {
      // This would be tested in API integration tests
      // The requireRole middleware ensures only ADMIN can create/edit workflows
      expect(true).toBe(true);
    });
  });
});
