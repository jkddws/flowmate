import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { executeWorkflow } from '../services/workflow-engine.js';

export function executionRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // List executions for a workflow
  router.get('/', async (req, res) => {
    try {
      const workflowId = req.query.workflowId as string | undefined;
      const where = workflowId ? { workflowId } : {};
      const executions = await prisma.workflowExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: 50,
        include: { workflow: { select: { name: true } } },
      });
      res.json({ executions, total: executions.length });
    } catch (err) {
      console.error('List executions error:', err);
      res.status(500).json({ error: 'Failed to list executions' });
    }
  });

  // Get execution details
  router.get('/:id', async (req, res) => {
    try {
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: req.params.id },
        include: { workflow: { select: { name: true, definition: true } } },
      });
      if (!execution) { res.status(404).json({ error: 'Execution not found' }); return; }
      res.json({ execution });
    } catch (err) {
      console.error('Get execution error:', err);
      res.status(500).json({ error: 'Failed to get execution' });
    }
  });

  // Trigger manual execution
  router.post('/trigger', async (req, res) => {
    try {
      const { workflowId, triggerData } = req.body;
      if (!workflowId) { res.status(400).json({ error: 'workflowId required' }); return; }

      const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }

      const execution = await prisma.workflowExecution.create({
        data: {
          id: uuidv4(),
          workflowId,
          status: 'pending',
          triggerData: triggerData || {},
        },
      });

      // Execute async
      executeWorkflow(prisma, execution.id, workflow).catch(err => {
        console.error('Workflow execution failed:', err);
      });

      res.status(201).json({ execution });
    } catch (err) {
      console.error('Trigger execution error:', err);
      res.status(500).json({ error: 'Failed to trigger execution' });
    }
  });

  return router;
}
