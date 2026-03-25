'use client';

import { useState, useEffect } from 'react';

interface ROISummary {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  hoursSaved: number;
  costSaved: number;
  activeWorkflows: number;
  totalWorkflows: number;
}

interface WorkflowStat {
  id: string;
  name: string;
  status: string;
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  timeSavedMinutes: number;
}

interface DailyTrend {
  date: string;
  executions: number;
  success: number;
  failed: number;
}

export function ROIDashboard() {
  const [summary, setSummary] = useState<ROISummary | null>(null);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStat[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiUrl}/api/analytics/roi?days=${days}`)
      .then(r => r.json())
      .then(data => {
        setSummary(data.summary);
        setWorkflowStats(data.workflowStats || []);
        setDailyTrend(data.dailyTrend || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [apiUrl, days]);

  if (isLoading) {
    return <div className="text-center py-12 text-sm text-gray-500">Loading analytics...</div>;
  }

  if (!summary) {
    return <div className="text-center py-12 text-sm text-red-500">Failed to load analytics</div>;
  }

  // Find max for trend chart
  const maxExec = Math.max(...dailyTrend.map(d => d.executions), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">ROI Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Track the business impact of your automations</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                days === d ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Hours Saved', value: `${summary.hoursSaved}h`, color: '#059669', sub: `~$${summary.costSaved} saved` },
          { label: 'Executions', value: summary.totalExecutions.toLocaleString(), color: '#6366f1', sub: `${summary.successRate}% success` },
          { label: 'Active Workflows', value: summary.activeWorkflows, color: '#3b82f6', sub: `${summary.totalWorkflows} total` },
          { label: 'Success Rate', value: `${summary.successRate}%`, color: summary.successRate >= 90 ? '#059669' : summary.successRate >= 70 ? '#d97706' : '#dc2626', sub: `${summary.failedExecutions} failed` },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart (simple bar chart) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Execution Trend</h3>
        <div className="flex items-end gap-px" style={{ height: 120 }}>
          {dailyTrend.slice(-30).map((day, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end"
              title={`${day.date}: ${day.executions} executions`}
            >
              {day.failed > 0 && (
                <div
                  style={{ height: `${(day.failed / maxExec) * 100}%`, background: '#fca5a5', minHeight: day.failed > 0 ? 2 : 0 }}
                  className="rounded-t"
                />
              )}
              <div
                style={{ height: `${(day.success / maxExec) * 100}%`, background: '#6366f1', minHeight: day.success > 0 ? 2 : 0 }}
                className={day.failed === 0 ? 'rounded-t' : ''}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-gray-400">{dailyTrend[0]?.date}</span>
          <span className="text-[10px] text-gray-400">{dailyTrend[dailyTrend.length - 1]?.date}</span>
        </div>
      </div>

      {/* Workflow Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Workflow Performance</h3>
        </div>
        {workflowStats.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">No workflow data yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Workflow</th>
                <th className="px-5 py-3 font-medium">Executions</th>
                <th className="px-5 py-3 font-medium">Success Rate</th>
                <th className="px-5 py-3 font-medium">Avg Duration</th>
                <th className="px-5 py-3 font-medium">Time Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workflowStats.map(wf => (
                <tr key={wf.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{wf.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{wf.totalExecutions}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${wf.successRate}%`,
                            background: wf.successRate >= 90 ? '#10b981' : wf.successRate >= 70 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{wf.successRate}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{wf.avgDurationMs > 0 ? `${(wf.avgDurationMs / 1000).toFixed(1)}s` : '-'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{wf.timeSavedMinutes > 0 ? `${wf.timeSavedMinutes}min` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
