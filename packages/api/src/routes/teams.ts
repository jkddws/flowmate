import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_USER_ID = 'user-jack';

export function teamRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // Get current team
  router.get('/', async (_req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: DEFAULT_USER_ID },
        include: { team: { include: { members: true, workflows: { select: { id: true, name: true, status: true } } } } },
      });

      if (!user?.team) {
        res.json({ team: null, message: 'No team yet. Create one to collaborate.' });
        return;
      }

      res.json({ team: user.team });
    } catch (err) {
      console.error('Get team error:', err);
      res.status(500).json({ error: 'Failed to get team' });
    }
  });

  // Create team
  router.post('/', async (req, res) => {
    try {
      const schema = z.object({ name: z.string().min(1).max(100) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
        return;
      }

      const team = await prisma.team.create({
        data: {
          id: uuidv4(),
          name: parsed.data.name,
          members: { connect: { id: DEFAULT_USER_ID } },
        },
        include: { members: true },
      });

      // Update user's teamId
      await prisma.user.update({
        where: { id: DEFAULT_USER_ID },
        data: { teamId: team.id, role: 'admin' },
      });

      res.status(201).json({ team });
    } catch (err) {
      console.error('Create team error:', err);
      res.status(500).json({ error: 'Failed to create team' });
    }
  });

  // Invite member
  router.post('/invite', async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(['admin', 'member', 'viewer']).default('member'),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
        return;
      }

      const inviter = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
      if (!inviter?.teamId) {
        res.status(400).json({ error: 'You must be in a team to invite members' });
        return;
      }

      // Create user and add to team
      const newMember = await prisma.user.upsert({
        where: { email: parsed.data.email },
        create: {
          id: uuidv4(),
          email: parsed.data.email,
          name: parsed.data.name,
          role: parsed.data.role,
          teamId: inviter.teamId,
        },
        update: {
          teamId: inviter.teamId,
          role: parsed.data.role,
        },
      });

      res.status(201).json({ member: newMember });
    } catch (err) {
      console.error('Invite member error:', err);
      res.status(500).json({ error: 'Failed to invite member' });
    }
  });

  // Share workflow with team
  router.post('/share-workflow', async (req, res) => {
    try {
      const { workflowId } = req.body;
      if (!workflowId) { res.status(400).json({ error: 'workflowId required' }); return; }

      const user = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } });
      if (!user?.teamId) {
        res.status(400).json({ error: 'Join a team first' });
        return;
      }

      const workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: { teamId: user.teamId },
      });

      res.json({ workflow, shared: true });
    } catch (err) {
      console.error('Share workflow error:', err);
      res.status(500).json({ error: 'Failed to share workflow' });
    }
  });

  return router;
}
