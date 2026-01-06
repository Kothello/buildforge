-- Migration 0016: Workflow Automation System
-- Creates tables for workflow automation: workflows, triggers, actions, runs, and run steps

-- Workflows table: stores workflow definitions
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflows_enabled ON workflows(enabled);
CREATE INDEX idx_workflows_created_by ON workflows(created_by);

-- Workflow triggers table: defines what events trigger workflows
CREATE TABLE IF NOT EXISTS workflow_triggers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- DEAL_STAGE_CHANGED, TASK_COMPLETED, etc.
  config_json JSONB NOT NULL DEFAULT '{}', -- trigger-specific configuration
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id);
CREATE INDEX idx_workflow_triggers_type ON workflow_triggers(type);

-- Workflow actions table: defines what actions to execute
CREATE TABLE IF NOT EXISTS workflow_actions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL, -- SEND_NOTIFICATION, ASSIGN_TASK, etc.
  config_json JSONB NOT NULL DEFAULT '{}', -- action-specific configuration
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_actions_workflow_id ON workflow_actions(workflow_id);
CREATE INDEX idx_workflow_actions_order ON workflow_actions(workflow_id, order_index);

-- Workflow runs table: tracks execution of workflows
CREATE TABLE IF NOT EXISTS workflow_runs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, SUCCESS, FAILED
  triggered_by_user_id VARCHAR REFERENCES users(id),
  trigger_type TEXT,
  trigger_entity_type TEXT, -- lead, deal, task, etc.
  trigger_entity_id VARCHAR,
  error TEXT,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id, created_at DESC);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status, created_at DESC);
CREATE INDEX idx_workflow_runs_trigger_entity ON workflow_runs(trigger_entity_type, trigger_entity_id);

-- Workflow run steps table: tracks individual action executions
CREATE TABLE IF NOT EXISTS workflow_run_steps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id VARCHAR NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, SUCCESS, FAILED, SKIPPED
  error TEXT,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_run_steps_run_id ON workflow_run_steps(run_id, step_order);
CREATE INDEX idx_workflow_run_steps_status ON workflow_run_steps(status);

-- Comments for documentation
COMMENT ON TABLE workflows IS 'Workflow definitions for automation';
COMMENT ON TABLE workflow_triggers IS 'Event triggers that start workflows';
COMMENT ON TABLE workflow_actions IS 'Actions to execute when workflow runs';
COMMENT ON TABLE workflow_runs IS 'Execution history of workflow runs';
COMMENT ON TABLE workflow_run_steps IS 'Individual step execution within runs';
