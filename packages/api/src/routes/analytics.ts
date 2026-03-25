import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const DEFAULT_USER_ID = 'user-jack';

export function analyticsRoutes(prisma: PrismaClient): Router {
  const router = Router();

  // ROI dashboard data
  router.get('/roi', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date(Date.now() - days * 86400000);

      // Get all executions in period
      const executions = await prisma.workflowExecution.findMany({
        where: { startedAt: { gte: since } },
        include: { workflow: { select: { name: true, userId: true } } },
      });

      const workflows = await prisma.workflow.findMany({
        where: { userId: DEFAULT_USER_ID },
        include: { _count: { select: { executions: true } } },
      });

      // Calculate metrics
      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(e => e.status === 'completed').length;
      const failedExecutions = executions.filter(e => e.status === 'failed').length;

      // Estimate time saved (assume 5 min saved per successful execution)
      const minutesSaved = successfulExecutions * 5;
      const hoursSaved = Math.round(minutesSaved / 60 * 10) / 10;

      // Estimate cost saved (assume $30/hr labor cost)
      const costSaved = Math.round(hoursSaved * 30);

      // Executions per workflow
      const workflowStats = workflows.map(wf => {
        const wfExecs = executions.filter(e => e.workflowId === wf.id);
        const succeeded = wfExecs.filter(e => e.status === 'completed').length;
        const durations = wfExecs
          .filter(e => e.completedAt)
          .map(e => new Date(e.completedAt!).getTime() - new Date(e.startedAt).getTime());
        const avgDuration = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

        return {
          id: wf.id,
          name: wf.name,
          status: wf.status,
          totalExecutions: wfExecs.length,
          successRate: wfExecs.length > 0 ? Math.round((succeeded / wfExecs.length) * 100) : 0,
          avgDurationMs: avgDuration,
          timeSavedMinutes: succeeded * 5,
        };
      });

      // Daily execution trend
      const dailyTrend: Array<{ date: string; executions: number; success: number; failed: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        const dateStr = date.toISOString().split('T')[0];
        const dayExecs = executions.filter(e => e.startedAt.toISOString().startsWith(dateStr));
        dailyTrend.push({
          date: dateStr,
          executions: dayExecs.length,
          success: dayExecs.filter(e => e.status === 'completed').length,
          failed: dayExecs.filter(e => e.status === 'failed').length,
        });
      }

      res.json({
        period: { days, since: since.toISOString() },
        summary: {
          totalExecutions,
          successfulExecutions,
          failedExecutions,
          successRate: totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0,
          hoursSaved,
          costSaved,
          activeWorkflows: workflows.filter(w => w.status === 'active').length,
          totalWorkflows: workflows.length,
        },
        workflowStats: workflowStats.sort((a, b) => b.totalExecutions - a.totalExecutions),
        dailyTrend,
      });
    } catch (err) {
      console.error('Analytics ROI error:', err);
      res.status(500).json({ error: 'Failed to generate analytics' });
    }
  });

  // Workflow performance leaderboard
  router.get('/performance', async (req, res) => {
    try {
      const workflows = await prisma.workflow.findMany({
        where: { userId: DEFAULT_USER_ID, status: 'active' },
        include: {
          executions: {
            orderBy: { startedAt: 'desc' },
            take: 100,
          },
        },
      });

      const performance = workflows.map(wf => {
        const recent = wf.executions;
        const succeeded = recent.filter(e => e.status === 'completed').length;
        const failed = recent.filter(e => e.status === 'failed').length;
        const lastRun = recent[0]?.startedAt || null;
        const lastStatus = recent[0]?.status || 'never_run';

        // Streak: consecutive successes
        let streak = 0;
        for (const exec of recent) {
          if (exec.status === 'completed') streak++;
          else break;
        }

        return {
          id: wf.id,
          name: wf.name,
          successRate: recent.length > 0 ? Math.round((succeeded / recent.length) * 100) : 0,
          totalRuns: recent.length,
          streak,
          lastRun,
          lastStatus,
          health: failed === 0 ? 'healthy' : failed <= 2 ? 'warning' : 'critical',
        };
      });

      res.json({
        workflows: performance.sort((a, b) => b.successRate - a.successRate),
      });
    } catch (err) {
      console.error('Analytics performance error:', err);
      res.status(500).json({ error: 'Failed to generate performance data' });
    }
  });

  return router;
}
