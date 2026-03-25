'use client';

import { useState } from 'react';

interface ChatBuilderProps {
  onWorkflowGenerated: (definition: any) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBuilder({ onWorkflowGenerated }: ChatBuilderProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm FlowMate. Tell me what process you'd like to automate, and I'll build a workflow for you.\n\nFor example:\n- \"When someone fills out my contact form, qualify them and route to the right salesperson\"\n- \"Send a follow-up email sequence to new leads\"\n- \"Alert me on Slack when a new order comes in\"",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Generate workflow from description
      const resp = await fetch(`${apiUrl}/api/ai/generate-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: userMessage }),
      });

      if (!resp.ok) throw new Error('Failed to generate workflow');

      const data = await resp.json();
      const workflow = data.workflow;

      let reply = `I've created a workflow: **${workflow.name}**\n\n`;
      reply += `${workflow.description}\n\n`;
      reply += `It has ${workflow.definition.nodes.length} steps:\n`;
      for (const node of workflow.definition.nodes) {
        reply += `- ${node.label} (${node.type})\n`;
      }
      reply += '\nYou can see it in the canvas on the right. Drag nodes to rearrange, or describe changes and I\'ll update it.';

      if (data.clarifyingQuestions?.length) {
        reply += '\n\nA few questions to refine this:\n';
        for (const q of data.clarifyingQuestions) {
          reply += `- ${q}\n`;
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      onWorkflowGenerated(workflow.definition);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try describing your workflow again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col" style={{ height: '100%' }}>
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Workflow Builder</h2>
        <p className="text-xs text-gray-500 mt-0.5">Describe your workflow in plain English</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-500">
              Building your workflow...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe what you want to automate..."
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
