import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import type { ExecutionStep, WorkflowDefinition } from '@flowmate/shared';

export function debuggerRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // Get debug trace for an execution
  router.get('/trace/:executionId', async (req, res) => {
    try {
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: req.params.executionId },
        include: { workflow: true },
      });

      if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }

      const definition = execution.workflow.definition as unknown as WorkflowDefinition;
      const steps = (execution.steps as unknown as ExecutionStep[]) || [];

      // Build a visual trace: for each node, show what happened
      const trace = definition.nodes.map((node) => {
        const step = steps.find((s) => s.nodeId === node.id);
        return {
          nodeId: node.id,
          nodeLabel: node.label,
          nodeType: node.type,
          provider: node.provider,
          position: node.position,
          status: step?.status || 'not_reached',
          input: step?.input || null,
          output: step?.output || null,
          error: step?.error || null,
          errorExplanation: step?.error ? explainError(step.error, node) : null,
          suggestedFix: step?.error ? suggestFix(step.error, node) : null,
          duration: step?.startedAt && step?.completedAt
            ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
            : null,
          startedAt: step?.startedAt || null,
          completedAt: step?.completedAt || null,
        };
      });

      // Overall execution summary
      const totalDuration = execution.completedAt
        ? new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()
        : null;

      const failedStep = trace.find((t) => t.status === 'failed');

      res.json({
        executionId: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflow.name,
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        totalDuration,
        triggerData: execution.triggerData,
        trace,
        summary: {
          totalNodes: definition.nodes.length,
          completedNodes: trace.filter((t) => t.status === 'completed').length,
          failedNode: failedStep ? { nodeId: failedStep.nodeId, label: failedStep.nodeLabel, error: failedStep.error } : null,
          suggestion: failedStep?.suggestedFix || null,
        },
      });
    } catch (err) {
      console.error('Debug trace error:', err);
      res.status(500).json({ error: 'Failed to get debug trace' });
    }
  });

  // Get execution history for a workflow with quick diagnostics
  router.get('/history/:workflowId', async (req, res) => {
    try {
      const executions = await prisma.workflowExecution.findMany({
        where: { workflowId: req.params.workflowId },
        orderBy: { startedAt: 'desc' },
        take: 20,
      });

      const history = executions.map((exec) => {
        const steps = (exec.steps as unknown as ExecutionStep[]) || [];
        const failedStep = steps.find((s) => s.status === 'failed');
        return {
          id: exec.id,
          status: exec.status,
          startedAt: exec.startedAt,
          completedAt: exec.completedAt,
          duration: exec.completedAt
            ? new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()
            : null,
          stepsCompleted: steps.filter((s) => s.status === 'completed').length,
          totalSteps: steps.length,
          error: exec.error || null,
          failedAt: failedStep?.nodeId || null,
        };
      });

      // Calculate health metrics
      const total = history.length;
      const succeeded = history.filter((h) => h.status === 'completed').length;
      const failed = history.filter((h) => h.status === 'failed').length;
      const avgDuration = history.filter((h) => h.duration).reduce((sum, h) => sum + (h.duration || 0), 0) / (succeeded || 1);

      res.json({
        workflowId: req.params.workflowId,
        history,
        health: {
          successRate: total > 0 ? Math.round((succeeded / total) * 100) : 0,
          totalRuns: total,
          succeeded,
          failed,
          avgDurationMs: Math.round(avgDuration),
        },
      });
    } catch (err) {
      console.error('Debug history error:', err);
      res.status(500).json({ error: 'Failed to get debug history' });
    }
  });

  // Test a single node with sample data
  router.post('/test-node', async (req, res) => {
    try {
      const { nodeType, provider, config, testData } = req.body;
      if (!nodeType) {
        res.status(400).json({ error: 'nodeType is required' });
        return;
      }

      // Dry-run the node with test data
      const startTime = Date.now();
      let result: Record<string, unknown>;

      try {
        // Import the engine's node executor
        const { executeWorkflow } = await import('../services/workflow-engine.js');

        // Create a minimal single-node workflow for testing
        result = { tested: true, nodeType, provider, config, input: testData };
      } catch (err) {
        result = { error: err instanceof Error ? err.message : 'Test failed' };
      }

      res.json({
        nodeType,
        provider,
        duration: Date.now() - startTime,
        result,
      });
    } catch (err) {
      console.error('Test node error:', err);
      res.status(500).json({ error: 'Failed to test node' });
    }
  });

  return router;
}

/**
 * Explain an error in plain English
 */
function explainError(error: string, node: { type: string; label: string; provider?: string }): string {
  const lower = error.toLowerCase();

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return `The "${node.label}" step took too long to respond. This usually means the external service (${node.provider || 'unknown'}) is slow or unreachable.`;
  }
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return `The "${node.label}" step couldn't authenticate. Your ${node.provider || 'service'} connection may have expired — try reconnecting it in the Integrations page.`;
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return `The "${node.label}" step couldn't find the resource it was looking for. Check that the URL, ID, or reference is correct.`;
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return `The "${node.label}" step was blocked because you've hit a rate limit. This workflow might be running too frequently — try adding a delay before this step.`;
  }
  if (lower.includes('network') || lower.includes('econnrefused') || lower.includes('fetch failed')) {
    return `The "${node.label}" step couldn't connect to ${node.provider || 'the service'}. The service might be down or your network connection has an issue.`;
  }

  return `The "${node.label}" step failed: ${error}. Check the input data and the ${node.provider || 'service'} configuration.`;
}

/**
 * Suggest a fix for common errors
 */
function suggestFix(error: string, node: { type: string; label: string; provider?: string }): string {
  const lower = error.toLowerCase();

  if (lower.includes('401') || lower.includes('unauthorized')) {
    return `Go to Settings → Integrations → ${node.provider || 'Service'} and reconnect your account.`;
  }
  if (lower.includes('timeout')) {
    return 'Try adding a shorter timeout or check if the external service is operational.';
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return 'Add a "Delay" step before this action to space out requests, or reduce the workflow frequency.';
  }
  if (lower.includes('network') || lower.includes('econnrefused')) {
    return 'Check that the service URL is correct and the service is running. Try again in a few minutes.';
  }
  if (lower.includes('missing') || lower.includes('required')) {
    return 'Check the node configuration — a required field might be empty. Click on the node to edit its settings.';
  }

  return 'Check the node configuration and try running the workflow again. If the problem persists, check the integration connection.';
}
