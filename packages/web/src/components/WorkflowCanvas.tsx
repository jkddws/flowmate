'use client';

import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './CustomNode';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const defaultNodes: Node[] = [
  {
    id: 'start',
    type: 'custom',
    position: { x: 250, y: 50 },
    data: { label: 'Start', nodeType: 'trigger', provider: 'webhook' },
  },
];

const defaultEdges: Edge[] = [];

interface WorkflowCanvasProps {
  workflowId: string | null;
}

export function WorkflowCanvas({ workflowId }: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } }, eds)),
    [setEdges]
  );

  // Load workflow if editing
  useEffect(() => {
    if (!workflowId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/workflows/${workflowId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.workflow?.definition) {
          const def = data.workflow.definition;
          setNodes(
            def.nodes.map((n: any) => ({
              id: n.id,
              type: 'custom',
              position: n.position,
              data: { label: n.label, nodeType: n.type, provider: n.provider },
            }))
          );
          setEdges(
            def.edges.map((e: any) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              animated: true,
              label: e.label,
              style: { stroke: '#6366f1' },
            }))
          );
        }
      })
      .catch(console.error);
  }, [workflowId, setNodes, setEdges]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: '100%' }}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Workflow Canvas</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            Save
          </button>
          <button className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Activate
          </button>
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Background gap={16} size={1} color="#e5e7eb" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            switch (n.data?.nodeType) {
              case 'trigger': return '#6366f1';
              case 'action': return '#3b82f6';
              case 'condition': return '#f59e0b';
              case 'delay': return '#8b5cf6';
              default: return '#9ca3af';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
