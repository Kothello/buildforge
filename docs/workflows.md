# Workflow Automation System

## Overview

The Workflow Automation system allows you to create automated workflows that execute actions when specific triggers occur. This is useful for automating repetitive tasks, notifications, and business processes.

## Architecture

The system consists of:

- **Workflows**: Named automations with triggers and actions
- **Triggers**: Events that start workflow execution (e.g., deal stage changed, task completed)
- **Actions**: Operations to perform (e.g., send notification, assign task)
- **Runs**: Execution history of workflows
- **Worker**: Background process that executes pending workflow runs

## Supported Triggers

### DEAL_STAGE_CHANGED
Triggered when a deal moves from one pipeline stage to another.

**Configuration:**
```json
{
  "fromStageId": "optional-stage-id",
  "toStageId": "optional-stage-id"
}
```

### TASK_COMPLETED
Triggered when a task is marked as complete.

**Configuration:**
```json
{
  "taskId": "optional-task-id",
  "dealId": "optional-deal-id"
}
```

### LEAD_CREATED
Triggered when a new lead is created (future enhancement).

**Configuration:**
```json
{
  "source": "optional-source-filter",
  "temperature": "cold|warm|hot|fire"
}
```

### CALLBACK_SCHEDULED
Triggered when a callback is scheduled (future enhancement).

**Configuration:**
```json
{
  "leadId": "optional-lead-id"
}
```

## Supported Actions

### SEND_NOTIFICATION
Creates an activity/notification for a user.

**Configuration:**
```json
{
  "recipientUserId": "user-id",
  "recipientRole": "ADMIN|SALES_MANAGER|REP|FRONTER",
  "title": "Notification Title",
  "message": "Notification message",
  "priority": "low|normal|high"
}
```

Either `recipientUserId` or `recipientRole` must be provided.

### ASSIGN_TASK
Creates a new task assigned to a user.

**Configuration:**
```json
{
  "title": "Task title",
  "assignToUserId": "user-id",
  "assignToRole": "ADMIN|SALES_MANAGER|REP|FRONTER",
  "dealId": "optional-deal-id",
  "dueInDays": 7
}
```

Either `assignToUserId` or `assignToRole` must be provided.

### CREATE_ACTIVITY
Creates an activity entry on a lead.

**Configuration:**
```json
{
  "type": "activity-type",
  "content": "Activity content",
  "leadId": "optional-lead-id"
}
```

### UPDATE_LEAD_FIELD
Updates a specific field on a lead (future enhancement).

**Configuration:**
```json
{
  "leadId": "optional-lead-id",
  "field": "temperature|stage|notes",
  "value": "new-value"
}
```

## API Endpoints

### List Workflows
```
GET /api/workflows
```

Returns all workflows. Non-admin users only see enabled workflows.

### Get Workflow
```
GET /api/workflows/:id
```

Returns a workflow with its triggers, actions, and recent runs.

### Create Workflow (Admin only)
```
POST /api/workflows
```

**Request Body:**
```json
{
  "name": "Workflow Name",
  "description": "Optional description",
  "enabled": true,
  "trigger": {
    "type": "TASK_COMPLETED",
    "config": {}
  },
  "actions": [
    {
      "type": "SEND_NOTIFICATION",
      "config": {
        "recipientRole": "ADMIN",
        "title": "Task Complete",
        "message": "A task was completed",
        "priority": "normal"
      }
    }
  ]
}
```

### Update Workflow (Admin only)
```
PATCH /api/workflows/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "enabled": false
}
```

### Delete Workflow (Admin only)
```
DELETE /api/workflows/:id
```

### Get Workflow Runs
```
GET /api/workflows/:id/runs?limit=50
```

Returns execution history for a workflow with step details.

## Running the Worker

The workflow worker processes pending workflow runs in the background.

### Local Development

**Option 1: Separate terminal**
```bash
WORKER_ENABLED=true npm run worker
```

**Option 2: Adjust poll interval**
```bash
WORKER_ENABLED=true WORKFLOW_POLL_INTERVAL_MS=10000 npm run worker
```

### Production

Set environment variables:
```bash
WORKER_ENABLED=true
WORKFLOW_POLL_INTERVAL_MS=5000
WORKFLOW_BATCH_SIZE=10
```

Then start the worker:
```bash
npm run worker
```

The worker will:
1. Poll for PENDING workflow runs
2. Execute actions in order
3. Record step statuses
4. Mark runs as SUCCESS or FAILED
5. Retry transient failures once

## Trigger Integration

Workflows are automatically triggered when events occur in the system:

- **Deal stage change**: When `PATCH /api/crm/deals/:id/stage` is called
- **Task completion**: When `PATCH /api/tasks/:id` marks status as "DONE"

## Example Workflows

### Notify admin when deal reaches proposal stage
```json
{
  "name": "Notify on Proposal Stage",
  "enabled": true,
  "trigger": {
    "type": "DEAL_STAGE_CHANGED",
    "config": {
      "toStageId": "proposal-stage-id"
    }
  },
  "actions": [
    {
      "type": "SEND_NOTIFICATION",
      "config": {
        "recipientRole": "ADMIN",
        "title": "Deal Moved to Proposal",
        "message": "A deal has reached the proposal stage",
        "priority": "high"
      }
    }
  ]
}
```

### Create follow-up task when task is completed
```json
{
  "name": "Create Follow-up Task",
  "enabled": true,
  "trigger": {
    "type": "TASK_COMPLETED",
    "config": {}
  },
  "actions": [
    {
      "type": "ASSIGN_TASK",
      "config": {
        "title": "Follow up on completed task",
        "assignToRole": "SALES_MANAGER",
        "dueInDays": 3
      }
    }
  ]
}
```

## Monitoring

Check workflow run status:

1. **Via API**: `GET /api/workflows/:id/runs`
2. **Database**: Query `workflow_runs` table for status
3. **Logs**: Worker logs execution details with `[workflow-*]` prefixes

## Limitations (v1)

- Only 2 triggers implemented (DEAL_STAGE_CHANGED, TASK_COMPLETED)
- Only 2 actions fully tested (SEND_NOTIFICATION, ASSIGN_TASK)
- No retry strategy beyond single retry on failure
- No scheduling or delayed execution
- Worker runs as single process (not distributed)
- No UI for creating workflows (API only)

## Security

- Workflow creation/editing requires ADMIN role
- All workflow runs are audited with user/trigger information
- Secrets are never logged
- Actions execute with system-level permissions

## Future Enhancements

- Web UI for workflow builder
- More trigger types (lead created, callback scheduled, time-based)
- More action types (send email, update CRM fields, call webhooks)
- Conditional logic and branching
- Scheduled/delayed execution
- Distributed worker support
- Workflow templates
- Analytics and reporting
