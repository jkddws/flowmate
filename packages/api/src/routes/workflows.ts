import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const WorkflowCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  definition: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }).default({ nodes: [], edges: [] }),
  templateId: z.string().optional(),
});

const WorkflowUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  definition: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }).optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
});

// Hardcoded user for v1 (auth comes later)
const DEFAULT_USER_ID = 'user-jack';

export function workflowRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // List workflows
  router.get('/', async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const where: Record<string, unknown> = { userId: DEFAULT_USER_ID };
      if (status) where.status = status;

      const workflows = await prisma.workflow.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { executions: true } } },
      });
      res.json({ workflows, total: workflows.length });
    } catch (err) {
      console.error('List workflows error:', err);
      res.status(500).json({ error: 'Failed to list workflows' });
    }
  });

  // Get workflow
  router.get('/:id', async (req, res) => {
    try {
      const workflow = await prisma.workflow.findUnique({
        where: { id: req.params.id },
        include: {
          executions: { orderBy: { startedAt: 'desc' }, take: 10 },
        },
      });
      if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }
      res.json({ workflow });
    } catch (err) {
      console.error('Get workflow error:', err);
      res.status(500).json({ error: 'Failed to get workflow' });
    }
  });

  // Create workflow
  router.post('/', async (req, res) => {
    try {
      const parsed = WorkflowCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
        return;
      }

      const workflow = await prisma.workflow.create({
        data: {
          id: uuidv4(),
          userId: DEFAULT_USER_ID,
          name: parsed.data.name,
          description: parsed.data.description,
          definition: parsed.data.definition as any,
          templateId: parsed.data.templateId,
        },
      });
      res.status(201).json({ workflow });
    } catch (err) {
      console.error('Create workflow error:', err);
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  });

  // Update workflow
  router.patch('/:id', async (req, res) => {
    try {
      const parsed = WorkflowUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
        return;
      }

      const data: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.description !== undefined) data.description = parsed.data.description;
      if (parsed.data.definition !== undefined) data.definition = parsed.data.definition;
      if (parsed.data.status !== undefined) data.status = parsed.data.status;

      const workflow = await prisma.workflow.update({
        where: { id: req.params.id },
        data,
      });
      res.json({ workflow });
    } catch (err) {
      console.error('Update workflow error:', err);
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  });

  // Delete workflow
  router.delete('/:id', async (req, res) => {
    try {
      await prisma.workflow.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (err) {
      console.error('Delete workflow error:', err);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  });

  // Activate workflow
  router.post('/:id/activate', async (req, res) => {
    try {
      const workflow = await prisma.workflow.update({
        where: { id: req.params.id },
        data: { status: 'active' },
      });
      res.json({ workflow });
    } catch (err) {
      console.error('Activate workflow error:', err);
      res.status(500).json({ error: 'Failed to activate workflow' });
    }
  });

  // Pause workflow
  router.post('/:id/pause', async (req, res) => {
    try {
      const workflow = await prisma.workflow.update({
        where: { id: req.params.id },
        data: { status: 'paused' },
      });
      res.json({ workflow });
    } catch (err) {
      console.error('Pause workflow error:', err);
      res.status(500).json({ error: 'Failed to pause workflow' });
    }
  });

  return router;
}
