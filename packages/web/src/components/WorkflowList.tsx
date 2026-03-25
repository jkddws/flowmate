'use client';

import { useState, useEffect } from 'react';

interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  updatedAt: string;
  _count: { executions: number };
}

interface WorkflowListProps {
  onEdit: (id: string) => void;
  onNew: () => void;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#ecfdf5', text: '#059669' },
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  paused: { bg: '#fffbeb', text: '#d97706' },
  error: { bg: '#fef2f2', text: '#dc2626' },
  archived: { bg: '#f3f4f6', text: '#9ca3af' },
};

export function WorkflowList({ onEdit, onNew }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/workflows`)
      .then((r) => r.json())
      .then((data) => setWorkflows(data.workflows || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">My Workflows</h2>
          <p className="text-sm text-gray-500">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          + New Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Create your first automation by describing what you need in plain English, or start from a template.
          </p>
          <button
            onClick={onNew}
            className="px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((wf) => {
            const statusColor = STATUS_COLORS[wf.status] || STATUS_COLORS.draft;
            return (
              <div
                key={wf.id}
                onClick={() => onEdit(wf.id)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{wf.name}</h3>
                    {wf.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{wf.description}</p>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                  >
                    {wf.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>{wf._count.executions} executions</span>
                  <span>Updated {new Date(wf.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
