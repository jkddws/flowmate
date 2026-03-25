import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export function templateRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // List templates
  router.get('/', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const where = category ? { category } : {};
      const templates = await prisma.workflowTemplate.findMany({
        where,
        orderBy: { usageCount: 'desc' },
      });
      res.json({ templates, total: templates.length });
    } catch (err) {
      console.error('List templates error:', err);
      res.status(500).json({ error: 'Failed to list templates' });
    }
  });

  // Get template
  router.get('/:id', async (req, res) => {
    try {
      const template = await prisma.workflowTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
      res.json({ template });
    } catch (err) {
      console.error('Get template error:', err);
      res.status(500).json({ error: 'Failed to get template' });
    }
  });

  // Use template (create workflow from template)
  router.post('/:id/use', async (req, res) => {
    try {
      const template = await prisma.workflowTemplate.findUnique({ where: { id: req.params.id } });
      if (!template) { res.status(404).json({ error: 'Template not found' }); return; }

      const { v4: uuidv4 } = await import('uuid');
      const workflow = await prisma.workflow.create({
        data: {
          id: uuidv4(),
          userId: 'user-jack',
          name: req.body.name || template.name,
          description: template.description,
          definition: template.definition as any,
          templateId: template.id,
        },
      });

      await prisma.workflowTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      });

      res.status(201).json({ workflow });
    } catch (err) {
      console.error('Use template error:', err);
      res.status(500).json({ error: 'Failed to create workflow from template' });
    }
  });

  return router;
}
