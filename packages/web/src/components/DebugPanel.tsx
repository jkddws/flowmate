'use client';

import { useState, useEffect } from 'react';

interface TraceNode {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  provider?: string;
  status: string;
  input: any;
  output: any;
  error: string | null;
  errorExplanation: string | null;
  suggestedFix: string | null;
  duration: number | null;
}

interface DebugTrace {
  executionId: string;
  workflowName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalDuration: number | null;
  trace: TraceNode[];
  summary: {
    totalNodes: number;
    completedNodes: number;
    failedNode: { nodeId: string; label: string; error: string } | null;
    suggestion: string | null;
  };
}

interface DebugPanelProps {
  executionId: string;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  completed: { bg: '#ecfdf5', border: '#10b981', text: '#059669', icon: '✓' },
  running: { bg: '#eef2ff', border: '#6366f1', text: '#4f46e5', icon: '⟳' },
  failed: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626', icon: '✗' },
  not_reached: { bg: '#f9fafb', border: '#d1d5db', text: '#9ca3af', icon: '○' },
  pending: { bg: '#fffbeb', border: '#f59e0b', text: '#d97706', icon: '…' },
};

export function DebugPanel({ executionId }: DebugPanelProps) {
  const [trace, setTrace] = useState<DebugTrace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiUrl}/api/debug/trace/${executionId}`)
      .then((r) => r.json())
      .then(setTrace)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [executionId, apiUrl]);

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-gray-500">Loading debug trace...</div>;
  }

  if (!trace) {
    return <div className="text-center py-8 text-sm text-red-500">Failed to load trace</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{trace.workflowName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Execution {trace.executionId.slice(0, 8)}... &middot;
              {trace.totalDuration ? ` ${(trace.totalDuration / 1000).toFixed(1)}s` : ' running'}
            </p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full`} style={{
            background: STATUS_STYLES[trace.status]?.bg || '#f3f4f6',
            color: STATUS_STYLES[trace.status]?.text || '#6b7280',
          }}>
            {trace.status}
          </span>
        </div>

        {/* Summary bar */}
        <div className="flex gap-1 mt-3">
          {trace.trace.map((node) => {
            const style = STATUS_STYLES[node.status] || STATUS_STYLES.not_reached;
            return (
              <div
                key={node.nodeId}
                className="flex-1 h-2 rounded-full transition-all cursor-pointer"
                style={{ background: style.border }}
                title={`${node.nodeLabel}: ${node.status}`}
                onClick={() => setExpandedNode(expandedNode === node.nodeId ? null : node.nodeId)}
              />
            );
          })}
        </div>
        <div className="text-[10px] text-gray-400 mt-1">
          {trace.summary.completedNodes}/{trace.summary.totalNodes} steps completed
        </div>
      </div>

      {/* Error banner */}
      {trace.summary.failedNode && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100">
          <p className="text-xs font-medium text-red-800">
            Failed at: {trace.summary.failedNode.label}
          </p>
          <p className="text-xs text-red-600 mt-1">{trace.summary.failedNode.error}</p>
          {trace.summary.suggestion && (
            <p className="text-xs text-red-700 mt-2 font-medium">
              💡 Suggested fix: {trace.summary.suggestion}
            </p>
          )}
        </div>
      )}

      {/* Step-by-step trace */}
      <div className="divide-y divide-gray-100">
        {trace.trace.map((node, i) => {
          const style = STATUS_STYLES[node.status] || STATUS_STYLES.not_reached;
          const isExpanded = expandedNode === node.nodeId;

          return (
            <div key={node.nodeId}>
              <button
                onClick={() => setExpandedNode(isExpanded ? null : node.nodeId)}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: style.bg, color: style.text, border: `2px solid ${style.border}` }}
                >
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate">{node.nodeLabel}</div>
                  <div className="text-[10px] text-gray-500">{node.nodeType}{node.provider ? ` · ${node.provider}` : ''}</div>
                </div>
                {node.duration !== null && (
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{node.duration}ms</span>
                )}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 pl-14 space-y-2">
                  {node.error && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-red-800">Error</p>
                      <p className="text-xs text-red-600 mt-1">{node.error}</p>
                      {node.errorExplanation && (
                        <p className="text-xs text-red-700 mt-2">{node.errorExplanation}</p>
                      )}
                      {node.suggestedFix && (
                        <p className="text-xs text-red-800 mt-2 font-medium">💡 {node.suggestedFix}</p>
                      )}
                    </div>
                  )}
                  {node.input && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 mb-1">Input</p>
                      <pre className="text-[10px] text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto">
                        {JSON.stringify(node.input, null, 2)}
                      </pre>
                    </div>
                  )}
                  {node.output && (
                    <div>
                      <p className="text-[10px] font-medium text-gray-500 mb-1">Output</p>
                      <pre className="text-[10px] text-gray-600 bg-gray-50 rounded p-2 overflow-x-auto">
                        {JSON.stringify(node.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
