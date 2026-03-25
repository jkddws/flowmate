import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { workflowRoutes } from './routes/workflows.js';
import { templateRoutes } from './routes/templates.js';
import { executionRoutes } from './routes/executions.js';
import { aiRoutes } from './routes/ai.js';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'flowmate-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/workflows', workflowRoutes(prisma));
app.use('/api/templates', templateRoutes(prisma));
app.use('/api/executions', executionRoutes(prisma));
app.use('/api/ai', aiRoutes(prisma));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`FlowMate API running on port ${port}`);
});

export { prisma };
