/**
 * Workflow Execution Engine
 * Handles workflow runs, action execution, and error handling
 */

import type { IStorage } from "../storage";
import type { 
  Workflow, 
  WorkflowAction, 
  WorkflowRun, 
  InsertWorkflowRun,
  InsertWorkflowRunStep,
  User,
  Lead,
} from "@shared/schema";

interface TriggerEvent {
  type: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  data: Record<string, any>;
}

interface ActionContext {
  trigger: TriggerEvent;
  workflow: Workflow;
  run: WorkflowRun;
  storage: IStorage;
}

/**
 * Enqueue a workflow run when a trigger event occurs
 */
export async function enqueueWorkflowRun(
  storage: IStorage,
  triggerEvent: TriggerEvent
): Promise<void> {
  console.log(`[workflow-trigger] Event: ${triggerEvent.type}`, {
    entityType: triggerEvent.entityType,
    entityId: triggerEvent.entityId,
  });

  // Find workflows that match this trigger type and are enabled
  const workflows = await storage.getWorkflowsByTriggerType(triggerEvent.type);
  
  for (const workflow of workflows) {
    if (!workflow.enabled) {
      console.log(`[workflow-trigger] Skipping disabled workflow: ${workflow.id}`);
      continue;
    }

    // Create a pending workflow run
    const runData: InsertWorkflowRun = {
      workflowId: workflow.id,
      status: "PENDING",
      triggeredByUserId: triggerEvent.userId || null,
      triggerType: triggerEvent.type,
      triggerEntityType: triggerEvent.entityType || null,
      triggerEntityId: triggerEvent.entityId || null,
    };

    const run = await storage.createWorkflowRun(runData);
    console.log(`[workflow-trigger] Enqueued run: ${run.id} for workflow: ${workflow.id}`);
  }
}

/**
 * Process a pending workflow run
 */
export async function processWorkflowRun(
  storage: IStorage,
  runId: string
): Promise<void> {
  const run = await storage.getWorkflowRun(runId);
  if (!run) {
    console.error(`[workflow-run] Run not found: ${runId}`);
    return;
  }

  if (run.status !== "PENDING") {
    console.log(`[workflow-run] Run ${runId} already processed (${run.status})`);
    return;
  }

  console.log(`[workflow-run] Processing run: ${runId}`);

  // Mark run as RUNNING
  await storage.updateWorkflowRun(runId, {
    status: "RUNNING",
    startedAt: new Date(),
  });

  try {
    const workflow = await storage.getWorkflow(run.workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${run.workflowId} not found`);
    }

    const actions = await storage.getWorkflowActions(workflow.id);
    
    // Reconstruct trigger event from run data
    const triggerEvent: TriggerEvent = {
      type: run.triggerType || "UNKNOWN",
      entityType: run.triggerEntityType || undefined,
      entityId: run.triggerEntityId || undefined,
      userId: run.triggeredByUserId || undefined,
      data: {},
    };

    const context: ActionContext = {
      trigger: triggerEvent,
      workflow,
      run,
      storage,
    };

    // Execute actions in order
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      await executeAction(context, action, i);
    }

    // Mark run as SUCCESS
    await storage.updateWorkflowRun(runId, {
      status: "SUCCESS",
      finishedAt: new Date(),
    });

    console.log(`[workflow-run] Run ${runId} completed successfully`);
  } catch (error: any) {
    console.error(`[workflow-run] Run ${runId} failed:`, error);
    
    await storage.updateWorkflowRun(runId, {
      status: "FAILED",
      error: error.message || "Unknown error",
      finishedAt: new Date(),
    });
  }
}

/**
 * Execute a single action within a workflow run
 */
async function executeAction(
  context: ActionContext,
  action: WorkflowAction,
  stepOrder: number
): Promise<void> {
  const stepData: InsertWorkflowRunStep = {
    runId: context.run.id,
    stepOrder,
    actionType: action.type,
    status: "PENDING",
  };

  const step = await context.storage.createWorkflowRunStep(stepData);

  try {
    console.log(`[workflow-action] Executing ${action.type} (step ${stepOrder})`);

    await context.storage.updateWorkflowRunStep(step.id, {
      status: "RUNNING",
      startedAt: new Date(),
    });

    const config = action.configJson as Record<string, any>;

    switch (action.type) {
      case "SEND_NOTIFICATION":
        await executeSendNotification(context, config);
        break;
      
      case "ASSIGN_TASK":
        await executeAssignTask(context, config);
        break;
      
      case "CREATE_ACTIVITY":
        await executeCreateActivity(context, config);
        break;
      
      case "UPDATE_LEAD_FIELD":
        await executeUpdateLeadField(context, config);
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    await context.storage.updateWorkflowRunStep(step.id, {
      status: "SUCCESS",
      finishedAt: new Date(),
    });

    console.log(`[workflow-action] Step ${stepOrder} completed successfully`);
  } catch (error: any) {
    console.error(`[workflow-action] Step ${stepOrder} failed:`, error);
    
    await context.storage.updateWorkflowRunStep(step.id, {
      status: "FAILED",
      error: error.message || "Unknown error",
      finishedAt: new Date(),
    });

    throw error; // Propagate to fail the entire run
  }
}

/**
 * Action: Send Notification
 */
async function executeSendNotification(
  context: ActionContext,
  config: Record<string, any>
): Promise<void> {
  const { recipientUserId, recipientRole, title, message, priority } = config;

  // Determine recipient user ID
  let userId = recipientUserId;
  
  if (!userId && recipientRole) {
    // Find first user with this role
    const users = await context.storage.getUsersByRole(recipientRole);
    if (users.length > 0) {
      userId = users[0].id;
    }
  }

  if (!userId) {
    throw new Error("No recipient user found");
  }

  // Create notification (using activities table for now)
  await context.storage.createActivity({
    leadId: context.trigger.entityId || null as any, // Will fix type
    userId: userId,
    type: "workflow_notification",
    content: `${title}: ${message}`,
    metadata: {
      priority: priority || 'normal',
      workflowId: context.workflow.id,
      runId: context.run.id,
    },
  });

  console.log(`[workflow-action] Notification sent to user ${userId}`);
}

/**
 * Action: Assign Task
 */
async function executeAssignTask(
  context: ActionContext,
  config: Record<string, any>
): Promise<void> {
  const { title, assignToUserId, assignToRole, dealId, dueInDays } = config;

  // Determine assignee
  let userId = assignToUserId;
  
  if (!userId && assignToRole) {
    const users = await context.storage.getUsersByRole(assignToRole);
    if (users.length > 0) {
      userId = users[0].id;
    }
  }

  if (!userId) {
    throw new Error("No assignee found for task");
  }

  // Calculate due date
  let dueDate: Date | undefined;
  if (dueInDays !== undefined) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueInDays);
  }

  // Create task
  await context.storage.createTask({
    title,
    status: "OPEN",
    assignedToId: userId,
    dealId: dealId || null,
    dueDate: dueDate || null,
  });

  console.log(`[workflow-action] Task created and assigned to user ${userId}`);
}

/**
 * Action: Create Activity
 */
async function executeCreateActivity(
  context: ActionContext,
  config: Record<string, any>
): Promise<void> {
  const { type, content, leadId } = config;

  const targetLeadId = leadId || context.trigger.entityId;
  
  if (!targetLeadId) {
    throw new Error("No lead ID available for activity");
  }

  // Use system user or triggered user
  const userId = context.trigger.userId || context.run.triggeredByUserId;
  
  if (!userId) {
    throw new Error("No user ID available for activity");
  }

  await context.storage.createActivity({
    leadId: targetLeadId,
    userId: userId,
    type,
    content,
    metadata: {
      workflowId: context.workflow.id,
      runId: context.run.id,
    },
  });

  console.log(`[workflow-action] Activity created on lead ${targetLeadId}`);
}

/**
 * Action: Update Lead Field
 */
async function executeUpdateLeadField(
  context: ActionContext,
  config: Record<string, any>
): Promise<void> {
  const { leadId, field, value } = config;

  const targetLeadId = leadId || context.trigger.entityId;
  
  if (!targetLeadId) {
    throw new Error("No lead ID available for update");
  }

  const updateData: Record<string, any> = {
    [field]: value,
  };

  await context.storage.updateLead(targetLeadId, updateData);

  console.log(`[workflow-action] Updated lead ${targetLeadId} field ${field}`);
}

/**
 * Poll for pending workflow runs and process them
 */
export async function processPendingRuns(
  storage: IStorage,
  batchSize: number = 10
): Promise<number> {
  const pendingRuns = await storage.getPendingWorkflowRuns(batchSize);
  
  console.log(`[workflow-worker] Found ${pendingRuns.length} pending runs`);

  for (const run of pendingRuns) {
    try {
      await processWorkflowRun(storage, run.id);
    } catch (error) {
      console.error(`[workflow-worker] Error processing run ${run.id}:`, error);
    }
  }

  return pendingRuns.length;
}
