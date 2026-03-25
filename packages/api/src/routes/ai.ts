import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { generateWorkflowFromDescription } from '../services/ai-builder.js';

export function aiRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // Generate workflow from natural language
  router.post('/generate-workflow', async (req, res) => {
    try {
      const schema = z.object({
        description: z.string().min(10).max(2000),
        context: z.record(z.unknown()).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
        return;
      }

      const result = await generateWorkflowFromDescription(parsed.data.description, parsed.data.context);
      res.json(result);
    } catch (err) {
      console.error('AI workflow generation error:', err);
      res.status(500).json({ error: 'Failed to generate workflow' });
    }
  });

  // Get clarifying questions for a description
  router.post('/clarify', async (req, res) => {
    try {
      const schema = z.object({
        description: z.string().min(10).max(2000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(', ') });
        return;
      }

      // For v1, return common clarifying questions based on keywords
      const desc = parsed.data.description.toLowerCase();
      const questions: string[] = [];

      if (desc.includes('lead') || desc.includes('form')) {
        questions.push('What information do you collect from leads?');
        questions.push('How do you currently qualify leads (criteria)?');
      }
      if (desc.includes('email') || desc.includes('send')) {
        questions.push('Which email service do you use (Gmail, Outlook)?');
        questions.push('Do you want emails sent immediately or on a delay?');
      }
      if (desc.includes('team') || desc.includes('assign') || desc.includes('route')) {
        questions.push('How many team members should receive assignments?');
        questions.push('What criteria determines who gets assigned?');
      }
      if (desc.includes('notify') || desc.includes('alert') || desc.includes('slack')) {
        questions.push('Where should notifications be sent (Slack, email, SMS)?');
      }
      if (questions.length === 0) {
        questions.push('What triggers this workflow (form submission, schedule, webhook)?');
        questions.push('What should happen at the end of the workflow?');
        questions.push('Are there any conditions where different actions should happen?');
      }

      res.json({ questions });
    } catch (err) {
      console.error('AI clarify error:', err);
      res.status(500).json({ error: 'Failed to generate questions' });
    }
  });

  return router;
}
