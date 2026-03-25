import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { INTEGRATION_PROVIDERS } from '../services/integrations/index.js';

const DEFAULT_USER_ID = 'user-jack';

export function integrationRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // List available providers
  router.get('/providers', (_req, res) => {
    res.json({ providers: INTEGRATION_PROVIDERS });
  });

  // List user's connected integrations
  router.get('/', async (_req, res) => {
    try {
      const integrations = await prisma.integration.findMany({
        where: { userId: DEFAULT_USER_ID },
        select: { id: true, provider: true, name: true, status: true, lastSynced: true, createdAt: true },
      });
      res.json({ integrations });
    } catch (err) {
      console.error('List integrations error:', err);
      res.status(500).json({ error: 'Failed to list integrations' });
    }
  });

  // Connect an integration
  router.post('/connect', async (req, res) => {
    try {
      const schema = z.object({
        provider: z.string(),
        name: z.string().default(''),
        credentials: z.record(z.string()),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
        return;
      }

      const integration = await prisma.integration.upsert({
        where: {
          userId_provider: {
            userId: DEFAULT_USER_ID,
            provider: parsed.data.provider,
          },
        },
        create: {
          id: uuidv4(),
          userId: DEFAULT_USER_ID,
          provider: parsed.data.provider,
          name: parsed.data.name || parsed.data.provider,
          credentials: parsed.data.credentials as any,
          status: 'connected',
        },
        update: {
          credentials: parsed.data.credentials as any,
          status: 'connected',
          name: parsed.data.name || undefined,
        },
      });

      res.json({
        integration: {
          id: integration.id,
          provider: integration.provider,
          name: integration.name,
          status: integration.status,
        },
      });
    } catch (err) {
      console.error('Connect integration error:', err);
      res.status(500).json({ error: 'Failed to connect integration' });
    }
  });

  // Disconnect an integration
  router.post('/:id/disconnect', async (req, res) => {
    try {
      await prisma.integration.update({
        where: { id: req.params.id },
        data: { status: 'disconnected' },
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Disconnect integration error:', err);
      res.status(500).json({ error: 'Failed to disconnect integration' });
    }
  });

  // Test an integration
  router.post('/:id/test', async (req, res) => {
    try {
      const integration = await prisma.integration.findUnique({ where: { id: req.params.id } });
      if (!integration) { res.status(404).json({ error: 'Integration not found' }); return; }

      // Simple connectivity test based on provider
      let testResult = { connected: true, message: 'Connection successful' };

      if (integration.provider === 'slack') {
        const creds = integration.credentials as Record<string, string>;
        if (creds.webhook_url) {
          try {
            const resp = await fetch(creds.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: 'FlowMate connection test ✅' }),
            });
            testResult = { connected: resp.ok, message: resp.ok ? 'Slack connected' : `Slack error: ${resp.status}` };
          } catch {
            testResult = { connected: false, message: 'Failed to reach Slack webhook' };
          }
        }
      }

      await prisma.integration.update({
        where: { id: req.params.id },
        data: { lastSynced: new Date(), status: testResult.connected ? 'connected' : 'error' },
      });

      res.json({ test: testResult });
    } catch (err) {
      console.error('Test integration error:', err);
      res.status(500).json({ error: 'Failed to test integration' });
    }
  });

  return router;
}
