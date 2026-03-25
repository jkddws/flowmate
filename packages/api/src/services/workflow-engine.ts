/**
 * Workflow execution engine
 * Processes workflow definitions step by step, executing each node in order.
 */

import { PrismaClient } from '@prisma/client';
import type { WorkflowDefinition, WorkflowNode, ExecutionStep } from '@flowmate/shared';

interface WorkflowRecord {
  id: string;
  definition: unknown;
  status: string;
}

export async function executeWorkflow(
  prisma: PrismaClient,
  executionId: string,
  workflow: WorkflowRecord,
): Promise<void> {
  const definition = workflow.definition as WorkflowDefinition;
  const steps: ExecutionStep[] = [];

  // Update status to running
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: { status: 'running' },
  });

  try {
    // Build execution order from edges (topological sort)
    const nodeOrder = topologicalSort(definition);

    for (const node of nodeOrder) {
      const step: ExecutionStep = {
        nodeId: node.id,
        status: 'running',
        input: node.config,
        startedAt: new Date(),
      };

      try {
        const output = await executeNode(node, step.input);
        step.status = 'completed';
        step.output = output;
        step.completedAt = new Date();
      } catch (err) {
        step.status = 'failed';
        step.error = err instanceof Error ? err.message : String(err);
        step.completedAt = new Date();

        // Update execution with error
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'failed',
            steps: steps as any,
            error: step.error,
            completedAt: new Date(),
          },
        });
        return;
      }

      steps.push(step);

      // Save progress after each step
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { steps: steps as any },
      });
    }

    // All steps completed
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'completed',
        steps: steps as any,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'failed',
        steps: steps as any,
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });
  }
}

async function executeNode(
  node: WorkflowNode,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (node.type) {
    case 'trigger':
      return { triggered: true, data: input };

    case 'action':
      return executeAction(node, input);

    case 'condition':
      return evaluateCondition(node, input);

    case 'delay':
      const ms = (input.delayMinutes as number || 1) * 60 * 1000;
      await new Promise(resolve => setTimeout(resolve, Math.min(ms, 5000))); // cap at 5s for now
      return { delayed: true, duration: input.delayMinutes };

    case 'transform':
      return { transformed: true, data: input };

    case 'output':
      return { output: true, data: input };

    default:
      return { executed: true };
  }
}

async function executeAction(
  node: WorkflowNode,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (node.provider) {
    case 'webhook':
      const url = input.url as string;
      if (url) {
        const resp = await fetch(url, {
          method: (input.method as string) || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input.payload || input),
        });
        return { status: resp.status, ok: resp.ok };
      }
      return { skipped: true, reason: 'No URL configured' };

    case 'http':
      const httpUrl = input.url as string;
      if (httpUrl) {
        const resp = await fetch(httpUrl, {
          method: (input.method as string) || 'GET',
          headers: (input.headers as Record<string, string>) || {},
        });
        const body = await resp.text();
        return { status: resp.status, body: body.slice(0, 1000) };
      }
      return { skipped: true };

    default:
      // Placeholder for integrations (Gmail, Slack, etc.)
      return { executed: true, provider: node.provider, action: input.action || 'default' };
  }
}

function evaluateCondition(
  node: WorkflowNode,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const field = input.field as string;
  const operator = input.operator as string;
  const value = input.value;

  if (!field) return { result: true };

  const fieldValue = input[field];

  let result = false;
  switch (operator) {
    case 'equals': result = fieldValue === value; break;
    case 'not_equals': result = fieldValue !== value; break;
    case 'contains': result = String(fieldValue).includes(String(value)); break;
    case 'greater_than': result = Number(fieldValue) > Number(value); break;
    case 'less_than': result = Number(fieldValue) < Number(value); break;
    case 'exists': result = fieldValue != null; break;
    default: result = true;
  }

  return { result, field, operator, value, fieldValue };
}

function topologicalSort(definition: WorkflowDefinition): WorkflowNode[] {
  const { nodes, edges } = definition;
  if (nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const result: WorkflowNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) result.push(node);

    for (const neighbor of adjacency.get(id) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return result;
}
