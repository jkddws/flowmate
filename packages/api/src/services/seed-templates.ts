/**
 * Pre-built workflow templates — seeded on first run
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const TEMPLATES = [
  {
    name: 'Lead Qualification & Routing',
    description: 'Automatically score incoming leads and route hot leads to your sales team instantly. Cold leads get added to a nurture email sequence.',
    category: 'lead-management',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'New Form Submission', provider: 'form', config: { event: 'form_submit' }, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'condition', label: 'Check Lead Score', config: { field: 'budget', operator: 'greater_than', value: 5000 }, position: { x: 250, y: 180 } },
        { id: 'n3', type: 'action', label: 'Notify Sales Team', provider: 'slack', config: { channel: '#sales', message: 'Hot lead: {{name}} - ${{budget}}' }, position: { x: 100, y: 320 } },
        { id: 'n4', type: 'action', label: 'Add to Nurture', provider: 'gmail', config: { template: 'nurture_welcome' }, position: { x: 400, y: 320 } },
        { id: 'n5', type: 'output', label: 'Log Result', config: {}, position: { x: 250, y: 450 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3', label: 'Hot', condition: 'true' },
        { id: 'e3', source: 'n2', target: 'n4', label: 'Cold', condition: 'false' },
        { id: 'e4', source: 'n3', target: 'n5' },
        { id: 'e5', source: 'n4', target: 'n5' },
      ],
    },
    setupQuestions: [
      { id: 'q1', question: 'What qualifies a hot lead? (e.g., budget over $5,000)', type: 'text', required: true, nodeId: 'n2', configPath: 'value' },
      { id: 'q2', question: 'Which Slack channel should hot leads go to?', type: 'text', required: true, nodeId: 'n3', configPath: 'channel' },
    ],
  },
  {
    name: 'Welcome Email Sequence',
    description: '3-email drip campaign for new signups. Welcome email immediately, value proposition after 2 days, call-to-action after 5 days.',
    category: 'email-automation',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'New Signup', provider: 'form', config: {}, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'action', label: 'Send Welcome Email', provider: 'gmail', config: { subject: 'Welcome to {{company}}!', template: 'welcome' }, position: { x: 250, y: 180 } },
        { id: 'n3', type: 'delay', label: 'Wait 2 Days', config: { delayMinutes: 2880 }, position: { x: 250, y: 310 } },
        { id: 'n4', type: 'action', label: 'Send Value Email', provider: 'gmail', config: { subject: 'Here\'s what you can do with {{product}}', template: 'value' }, position: { x: 250, y: 440 } },
        { id: 'n5', type: 'delay', label: 'Wait 3 Days', config: { delayMinutes: 4320 }, position: { x: 250, y: 570 } },
        { id: 'n6', type: 'action', label: 'Send CTA Email', provider: 'gmail', config: { subject: 'Ready to get started?', template: 'cta' }, position: { x: 250, y: 700 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n4', target: 'n5' },
        { id: 'e5', source: 'n5', target: 'n6' },
      ],
    },
    setupQuestions: [
      { id: 'q1', question: 'What is your company/product name?', type: 'text', required: true, nodeId: 'n2', configPath: 'company' },
    ],
  },
  {
    name: 'Missed Call Recovery',
    description: 'When a call is missed, automatically send an SMS and email to the caller, and notify the team on Slack.',
    category: 'notifications',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Missed Call', provider: 'webhook', config: { event: 'missed_call' }, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'action', label: 'Send Recovery SMS', provider: 'webhook', config: { url: '', method: 'POST' }, position: { x: 100, y: 200 } },
        { id: 'n3', type: 'action', label: 'Notify Team', provider: 'slack', config: { channel: '#calls', message: 'Missed call from {{caller}}' }, position: { x: 400, y: 200 } },
        { id: 'n4', type: 'action', label: 'Send Follow-up Email', provider: 'gmail', config: { subject: 'Sorry we missed your call!' }, position: { x: 250, y: 350 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n1', target: 'n3' },
        { id: 'e3', source: 'n2', target: 'n4' },
      ],
    },
    setupQuestions: [],
  },
  {
    name: 'New Order Notification',
    description: 'Get instant Slack and email notifications when a new order comes in, with order details and customer info.',
    category: 'notifications',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'New Order', provider: 'webhook', config: { event: 'order_created' }, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'action', label: 'Slack Alert', provider: 'slack', config: { channel: '#orders', message: 'New order! {{customer}} - ${{total}}' }, position: { x: 250, y: 200 } },
        { id: 'n3', type: 'action', label: 'Email Confirmation', provider: 'gmail', config: { subject: 'New order from {{customer}}' }, position: { x: 250, y: 350 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
    },
    setupQuestions: [],
  },
  {
    name: 'Client Onboarding',
    description: 'Automated onboarding for new clients: welcome email, Slack introduction, task creation, and 7-day check-in.',
    category: 'onboarding',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'New Client', provider: 'form', config: {}, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'action', label: 'Send Welcome Pack', provider: 'gmail', config: { subject: 'Welcome aboard, {{name}}!' }, position: { x: 250, y: 180 } },
        { id: 'n3', type: 'action', label: 'Introduce on Slack', provider: 'slack', config: { channel: '#team', message: 'New client: {{name}} from {{company}}' }, position: { x: 250, y: 310 } },
        { id: 'n4', type: 'delay', label: 'Wait 7 Days', config: { delayMinutes: 10080 }, position: { x: 250, y: 440 } },
        { id: 'n5', type: 'action', label: 'Check-in Email', provider: 'gmail', config: { subject: 'How\'s everything going?' }, position: { x: 250, y: 570 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n4', target: 'n5' },
      ],
    },
    setupQuestions: [],
  },
  {
    name: 'Daily Sales Report',
    description: 'Every day at 9am, compile sales metrics and send a summary to your team on Slack and email.',
    category: 'data-sync',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Daily at 9am', provider: 'schedule', config: { cron: '0 9 * * *' }, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'action', label: 'Fetch Sales Data', provider: 'http', config: { url: '', method: 'GET' }, position: { x: 250, y: 200 } },
        { id: 'n3', type: 'action', label: 'Post to Slack', provider: 'slack', config: { channel: '#sales', message: 'Daily sales: {{total_revenue}}' }, position: { x: 250, y: 350 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
    },
    setupQuestions: [],
  },
  {
    name: 'Feedback Collection',
    description: 'After a service is completed, wait 24 hours then send a feedback request. Route negative feedback to the team immediately.',
    category: 'email-automation',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Service Completed', provider: 'webhook', config: {}, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'delay', label: 'Wait 24 Hours', config: { delayMinutes: 1440 }, position: { x: 250, y: 180 } },
        { id: 'n3', type: 'action', label: 'Send Feedback Request', provider: 'gmail', config: { subject: 'How did we do?' }, position: { x: 250, y: 310 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
    },
    setupQuestions: [],
  },
  {
    name: 'Appointment Reminder',
    description: 'Send automated reminders 24 hours and 1 hour before appointments.',
    category: 'notifications',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Appointment Created', provider: 'webhook', config: {}, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'delay', label: 'Wait Until 24h Before', config: { delayMinutes: 1440 }, position: { x: 250, y: 180 } },
        { id: 'n3', type: 'action', label: '24h Reminder', provider: 'gmail', config: { subject: 'Reminder: Your appointment tomorrow' }, position: { x: 250, y: 310 } },
        { id: 'n4', type: 'delay', label: 'Wait 23 Hours', config: { delayMinutes: 1380 }, position: { x: 250, y: 440 } },
        { id: 'n5', type: 'action', label: '1h Reminder', provider: 'gmail', config: { subject: 'Starting soon: Your appointment in 1 hour' }, position: { x: 250, y: 570 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n4', target: 'n5' },
      ],
    },
    setupQuestions: [],
  },
  {
    name: 'Stripe Payment → Thank You',
    description: 'When a payment succeeds in Stripe, send a personalized thank-you email to the customer.',
    category: 'notifications',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Payment Received', provider: 'webhook', config: { event: 'payment_intent.succeeded' }, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'action', label: 'Send Thank You Email', provider: 'gmail', config: { subject: 'Thank you for your payment!' }, position: { x: 250, y: 200 } },
        { id: 'n3', type: 'action', label: 'Log to Sheets', provider: 'sheets', config: { action: 'append_row' }, position: { x: 250, y: 350 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
    },
    setupQuestions: [],
  },
  {
    name: 'RSS Feed → Slack',
    description: 'Monitor an RSS feed and post new items to Slack. Great for tracking competitors, news, or industry updates.',
    category: 'data-sync',
    definition: {
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Check RSS Feed', provider: 'schedule', config: { cron: '0 */6 * * *' }, position: { x: 250, y: 50 } },
        { id: 'n2', type: 'action', label: 'Fetch Feed', provider: 'http', config: { url: '', method: 'GET' }, position: { x: 250, y: 200 } },
        { id: 'n3', type: 'action', label: 'Post to Slack', provider: 'slack', config: { channel: '#news' }, position: { x: 250, y: 350 } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
    },
    setupQuestions: [],
  },
];

export async function seedTemplates(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.workflowTemplate.count();
  if (existing > 0) {
    console.log(`Templates already seeded (${existing} exist)`);
    return;
  }

  for (const tpl of TEMPLATES) {
    await prisma.workflowTemplate.create({
      data: {
        id: uuidv4(),
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        definition: tpl.definition as any,
        setupQuestions: tpl.setupQuestions as any,
      },
    });
  }

  console.log(`Seeded ${TEMPLATES.length} workflow templates`);
}
