/**
 * Shared types for FlowMate
 */

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type NodeType = 'trigger' | 'action' | 'condition' | 'delay' | 'transform' | 'output';
export type IntegrationProvider = 'gmail' | 'slack' | 'stripe' | 'webhook' | 'schedule' | 'form' | 'sheets' | 'http';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  provider?: IntegrationProvider;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  userId: string;
  teamId?: string;
  name: string;
  description: string;
  definition: WorkflowDefinition;
  status: WorkflowStatus;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  triggerData: Record<string, unknown>;
  steps: ExecutionStep[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ExecutionStep {
  nodeId: string;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  definition: WorkflowDefinition;
  setupQuestions: TemplateQuestion[];
}

export interface TemplateQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'boolean';
  options?: string[];
  required: boolean;
  nodeId: string;
  configPath: string;
}
