/**
 * AI-powered workflow builder
 * Converts natural language descriptions into workflow definitions.
 */

import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '@flowmate/shared';

interface GenerateResult {
  workflow: {
    name: string;
    description: string;
    definition: WorkflowDefinition;
  };
  clarifyingQuestions?: string[];
}

/**
 * Generate a workflow from a natural language description.
 * Uses pattern matching and templates for v1, with LLM enhancement planned.
 */
export async function generateWorkflowFromDescription(
  description: string,
  context?: Record<string, unknown>,
): Promise<GenerateResult> {
  const desc = description.toLowerCase();
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  let nodeIndex = 0;

  const addNode = (type: WorkflowNode['type'], label: string, provider?: WorkflowNode['provider'], config: Record<string, unknown> = {}): string => {
    const id = `node_${nodeIndex++}`;
    nodes.push({
      id,
      type,
      label,
      provider,
      config,
      position: { x: 100 + (nodeIndex - 1) * 250, y: 150 },
    });
    return id;
  };

  const addEdge = (source: string, target: string, label?: string): void => {
    edges.push({ id: `edge_${source}_${target}`, source, target, label });
  };

  // Pattern: Lead qualification workflow
  if (desc.includes('lead') && (desc.includes('qualif') || desc.includes('route') || desc.includes('score'))) {
    const trigger = addNode('trigger', 'New Lead Received', 'form', { event: 'form_submission' });
    const condition = addNode('condition', 'Qualify Lead', undefined, { field: 'budget', operator: 'greater_than', value: 1000 });
    const hotAction = addNode('action', 'Notify Sales (Hot Lead)', 'slack', { channel: '#sales', message: 'Hot lead: {{name}} - {{budget}}' });
    const coldAction = addNode('action', 'Add to Nurture Sequence', 'gmail', { template: 'nurture_welcome' });
    const output = addNode('output', 'Log Result', undefined, {});

    addEdge(trigger, condition);
    addEdge(condition, hotAction, 'Qualified');
    addEdge(condition, coldAction, 'Not Qualified');
    addEdge(hotAction, output);
    addEdge(coldAction, output);

    return {
      workflow: {
        name: 'Lead Qualification & Routing',
        description: `Auto-qualify and route leads based on: ${description}`,
        definition: { nodes, edges },
      },
    };
  }

  // Pattern: Email follow-up sequence
  if (desc.includes('email') && (desc.includes('follow') || desc.includes('sequence') || desc.includes('drip'))) {
    const trigger = addNode('trigger', 'New Contact Added', 'form', { event: 'contact_created' });
    const email1 = addNode('action', 'Send Welcome Email', 'gmail', { template: 'welcome', subject: 'Welcome!' });
    const delay1 = addNode('delay', 'Wait 2 Days', undefined, { delayMinutes: 2880 });
    const email2 = addNode('action', 'Send Follow-up', 'gmail', { template: 'followup_1', subject: 'Quick question' });
    const delay2 = addNode('delay', 'Wait 3 Days', undefined, { delayMinutes: 4320 });
    const email3 = addNode('action', 'Send Value Email', 'gmail', { template: 'value_prop', subject: 'Thought you might find this useful' });
    const output = addNode('output', 'Sequence Complete', undefined, {});

    addEdge(trigger, email1);
    addEdge(email1, delay1);
    addEdge(delay1, email2);
    addEdge(email2, delay2);
    addEdge(delay2, email3);
    addEdge(email3, output);

    return {
      workflow: {
        name: 'Email Follow-up Sequence',
        description: `Automated email sequence: ${description}`,
        definition: { nodes, edges },
      },
    };
  }

  // Pattern: Missed call / notification workflow
  if (desc.includes('call') || desc.includes('miss') || desc.includes('notify') || desc.includes('alert')) {
    const trigger = addNode('trigger', 'Event Detected', 'webhook', { event: 'incoming_event' });
    const action = addNode('action', 'Send Notification', 'slack', { channel: '#alerts', message: '{{event_details}}' });
    const email = addNode('action', 'Send Email Alert', 'gmail', { subject: 'Alert: {{event_type}}' });
    const output = addNode('output', 'Logged', undefined, {});

    addEdge(trigger, action);
    addEdge(trigger, email);
    addEdge(action, output);
    addEdge(email, output);

    return {
      workflow: {
        name: 'Alert & Notification Workflow',
        description: `Automated notifications: ${description}`,
        definition: { nodes, edges },
      },
    };
  }

  // Generic workflow
  const trigger = addNode('trigger', 'Start', 'webhook', { event: 'manual_trigger' });
  const action = addNode('action', 'Process', 'http', { url: '', method: 'POST' });
  const output = addNode('output', 'Done', undefined, {});
  addEdge(trigger, action);
  addEdge(action, output);

  return {
    workflow: {
      name: 'Custom Workflow',
      description: description,
      definition: { nodes, edges },
    },
    clarifyingQuestions: [
      'What triggers this workflow?',
      'What actions should be performed?',
      'Are there any conditions where different things should happen?',
    ],
  };
}
