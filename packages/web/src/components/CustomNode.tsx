'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  trigger: { bg: '#eef2ff', border: '#6366f1', text: '#4338ca' },
  action: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
  condition: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309' },
  delay: { bg: '#f5f3ff', border: '#8b5cf6', text: '#6d28d9' },
  transform: { bg: '#ecfdf5', border: '#10b981', text: '#047857' },
  output: { bg: '#f9fafb', border: '#6b7280', text: '#374151' },
};

const TYPE_ICONS: Record<string, string> = {
  trigger: '⚡',
  action: '⚙️',
  condition: '🔀',
  delay: '⏱️',
  transform: '🔄',
  output: '📤',
};

export function CustomNode({ data }: NodeProps) {
  const nodeType = (data as any).nodeType || 'action';
  const colors = TYPE_COLORS[nodeType] || TYPE_COLORS.action;
  const icon = TYPE_ICONS[nodeType] || '⚙️';

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />
      <div
        style={{
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: 12,
          padding: '10px 16px',
          minWidth: 150,
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontSize: 11, color: colors.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          {icon} {nodeType}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
          {(data as any).label || 'Untitled'}
        </div>
        {(data as any).provider && (
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
            {(data as any).provider}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </>
  );
}
