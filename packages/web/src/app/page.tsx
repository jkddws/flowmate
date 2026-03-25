'use client';

import { useState } from 'react';
import { WorkflowCanvas } from '@/components/WorkflowCanvas';
import { ChatBuilder } from '@/components/ChatBuilder';
import { WorkflowList } from '@/components/WorkflowList';
import { TemplateGallery } from '@/components/TemplateGallery';

type View = 'dashboard' | 'builder' | 'templates';

export default function Home() {
  const [view, setView] = useState<View>('dashboard');
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">FlowMate</h1>
          </div>
          <nav className="flex gap-2">
            {[
              { key: 'dashboard', label: 'My Workflows' },
              { key: 'builder', label: 'New Workflow' },
              { key: 'templates', label: 'Templates' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setView(item.key as View)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  view === item.key
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'dashboard' && (
          <WorkflowList
            onEdit={(id) => {
              setEditingWorkflowId(id);
              setView('builder');
            }}
            onNew={() => {
              setEditingWorkflowId(null);
              setView('builder');
            }}
          />
        )}
        {view === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 180px)' }}>
            <div className="lg:col-span-1">
              <ChatBuilder
                onWorkflowGenerated={(definition) => {
                  // TODO: set definition on canvas
                  console.log('Generated:', definition);
                }}
              />
            </div>
            <div className="lg:col-span-2">
              <WorkflowCanvas workflowId={editingWorkflowId} />
            </div>
          </div>
        )}
        {view === 'templates' && (
          <TemplateGallery
            onUse={(templateId) => {
              setEditingWorkflowId(null);
              setView('builder');
            }}
          />
        )}
      </main>
    </div>
  );
}
