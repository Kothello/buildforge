/**
 * Workflow Configuration Schemas
 * JSON Schema validation for trigger and action configurations
 */

import { z } from "zod";

// Trigger Configuration Schemas
export const dealStageChangedTriggerSchema = z.object({
  fromStageId: z.string().optional(),
  toStageId: z.string().optional(),
});

export const taskCompletedTriggerSchema = z.object({
  taskId: z.string().optional(),
  dealId: z.string().optional(),
});

export const leadCreatedTriggerSchema = z.object({
  source: z.string().optional(),
  temperature: z.enum(['cold', 'warm', 'hot', 'fire']).optional(),
});

export const callbackScheduledTriggerSchema = z.object({
  leadId: z.string().optional(),
});

// Action Configuration Schemas
export const sendNotificationActionSchema = z.object({
  recipientUserId: z.string().optional(),
  recipientRole: z.enum(['ADMIN', 'SALES_MANAGER', 'REP', 'FRONTER']).optional(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

export const assignTaskActionSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  assignToUserId: z.string().optional(),
  assignToRole: z.enum(['ADMIN', 'SALES_MANAGER', 'REP', 'FRONTER']).optional(),
  dealId: z.string().optional(),
  dueInDays: z.number().int().min(0).optional(),
});

export const createActivityActionSchema = z.object({
  type: z.string().min(1, "Activity type is required"),
  content: z.string().min(1, "Activity content is required"),
  leadId: z.string().optional(),
});

export const updateLeadFieldActionSchema = z.object({
  leadId: z.string().optional(),
  field: z.enum(['temperature', 'stage', 'notes']),
  value: z.string(),
});

// Trigger validator map
export const triggerSchemas: Record<string, z.ZodSchema> = {
  DEAL_STAGE_CHANGED: dealStageChangedTriggerSchema,
  TASK_COMPLETED: taskCompletedTriggerSchema,
  LEAD_CREATED: leadCreatedTriggerSchema,
  CALLBACK_SCHEDULED: callbackScheduledTriggerSchema,
};

// Action validator map
export const actionSchemas: Record<string, z.ZodSchema> = {
  SEND_NOTIFICATION: sendNotificationActionSchema,
  ASSIGN_TASK: assignTaskActionSchema,
  CREATE_ACTIVITY: createActivityActionSchema,
  UPDATE_LEAD_FIELD: updateLeadFieldActionSchema,
};

/**
 * Validate trigger configuration
 */
export function validateTriggerConfig(type: string, config: any): { valid: boolean; error?: string } {
  const schema = triggerSchemas[type];
  if (!schema) {
    return { valid: false, error: `Unknown trigger type: ${type}` };
  }

  try {
    schema.parse(config);
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate action configuration
 */
export function validateActionConfig(type: string, config: any): { valid: boolean; error?: string } {
  const schema = actionSchemas[type];
  if (!schema) {
    return { valid: false, error: `Unknown action type: ${type}` };
  }

  try {
    schema.parse(config);
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

// Workflow creation payload schema
export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required").max(255),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().default(true),
  trigger: z.object({
    type: z.string().min(1),
    config: z.record(z.any()).default({}),
  }),
  actions: z.array(
    z.object({
      type: z.string().min(1),
      config: z.record(z.any()).default({}),
    })
  ).min(1, "At least one action is required"),
});

export type CreateWorkflowPayload = z.infer<typeof createWorkflowSchema>;

// Workflow update payload schema
export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateWorkflowPayload = z.infer<typeof updateWorkflowSchema>;
