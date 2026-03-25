/**
 * Integration manager — handles connecting third-party services
 * and executing actions through them.
 */

import type { IntegrationProvider } from '@flowmate/shared';

export interface IntegrationConfig {
  provider: IntegrationProvider;
  credentials: Record<string, string>;
}

export interface IntegrationAction {
  provider: IntegrationProvider;
  action: string;
  params: Record<string, unknown>;
}

export interface IntegrationResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Execute an integration action (send email, post to Slack, etc.)
 */
export async function executeIntegration(config: IntegrationConfig, action: IntegrationAction): Promise<IntegrationResult> {
  switch (action.provider) {
    case 'gmail':
      return executeGmail(config, action);
    case 'slack':
      return executeSlack(config, action);
    case 'stripe':
      return executeStripe(config, action);
    case 'webhook':
      return executeWebhook(action);
    case 'http':
      return executeHttp(action);
    case 'schedule':
      return { success: true, data: { scheduled: true, time: action.params.time } };
    case 'form':
      return { success: true, data: { formReceived: true } };
    case 'sheets':
      return executeSheets(config, action);
    default:
      return { success: false, error: `Unsupported provider: ${action.provider}` };
  }
}

async function executeGmail(config: IntegrationConfig, action: IntegrationAction): Promise<IntegrationResult> {
  const { action: act, ...params } = action.params;

  switch (act) {
    case 'send_email': {
      // Use Gmail API or SMTP
      const to = params.to as string;
      const subject = params.subject as string;
      const body = params.body as string;

      if (!to || !subject) {
        return { success: false, error: 'Missing to or subject' };
      }

      // For v1, use nodemailer-like approach with OAuth tokens
      // Placeholder: log the action
      console.log(`[Gmail] Send email to ${to}: ${subject}`);
      return { success: true, data: { sent: true, to, subject } };
    }

    case 'create_draft': {
      console.log(`[Gmail] Create draft: ${params.subject}`);
      return { success: true, data: { drafted: true } };
    }

    default:
      return { success: true, data: { action: act, executed: true } };
  }
}

async function executeSlack(config: IntegrationConfig, action: IntegrationAction): Promise<IntegrationResult> {
  const webhookUrl = config.credentials.webhook_url || (action.params.webhook_url as string);
  const channel = action.params.channel as string;
  const message = action.params.message as string;

  if (!message) {
    return { success: false, error: 'Missing message' };
  }

  if (webhookUrl) {
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message, channel }),
      });
      return { success: resp.ok, data: { sent: true, status: resp.status } };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Slack send failed' };
    }
  }

  // Bot token approach
  const botToken = config.credentials.bot_token;
  if (botToken && channel) {
    try {
      const resp = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel, text: message }),
      });
      const data = await resp.json() as { ok: boolean; error?: string };
      return { success: data.ok, data: data as Record<string, unknown>, error: data.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Slack API failed' };
    }
  }

  console.log(`[Slack] ${channel || 'default'}: ${message}`);
  return { success: true, data: { logged: true, channel, message } };
}

async function executeStripe(config: IntegrationConfig, action: IntegrationAction): Promise<IntegrationResult> {
  const apiKey = config.credentials.api_key;
  if (!apiKey) {
    return { success: false, error: 'Stripe API key not configured' };
  }

  const act = action.params.action as string;

  switch (act) {
    case 'create_customer': {
      try {
        const resp = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email: action.params.email as string || '',
            name: action.params.name as string || '',
          }),
        });
        const data = await resp.json();
        return { success: resp.ok, data: data as Record<string, unknown> };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Stripe API failed' };
      }
    }

    case 'create_invoice': {
      console.log(`[Stripe] Create invoice for ${action.params.customer_id}`);
      return { success: true, data: { action: 'create_invoice' } };
    }

    default:
      return { success: true, data: { action: act } };
  }
}

async function executeWebhook(action: IntegrationAction): Promise<IntegrationResult> {
  const url = action.params.url as string;
  if (!url) return { success: false, error: 'No webhook URL' };

  try {
    const method = (action.params.method as string) || 'POST';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = action.params.auth_header as string;
    if (authHeader) headers['Authorization'] = authHeader;

    const resp = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(action.params.payload || action.params) : undefined,
    });

    const responseText = await resp.text();
    let responseData: Record<string, unknown>;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { body: responseText.slice(0, 500) };
    }

    return { success: resp.ok, data: { status: resp.status, ...responseData } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Webhook failed' };
  }
}

async function executeHttp(action: IntegrationAction): Promise<IntegrationResult> {
  return executeWebhook(action); // Same logic
}

async function executeSheets(config: IntegrationConfig, action: IntegrationAction): Promise<IntegrationResult> {
  console.log(`[Sheets] ${action.params.action}: ${action.params.spreadsheet_id}`);
  return { success: true, data: { action: action.params.action } };
}

/**
 * Available integration providers with their metadata
 */
export const INTEGRATION_PROVIDERS = [
  {
    id: 'gmail' as const,
    name: 'Gmail',
    icon: '📧',
    description: 'Send emails, create drafts, read inbox',
    authType: 'oauth' as const,
    actions: ['send_email', 'create_draft', 'read_inbox'],
  },
  {
    id: 'slack' as const,
    name: 'Slack',
    icon: '💬',
    description: 'Send messages, post to channels, receive events',
    authType: 'oauth' as const,
    actions: ['send_message', 'post_to_channel', 'create_reminder'],
  },
  {
    id: 'stripe' as const,
    name: 'Stripe',
    icon: '💳',
    description: 'Process payments, manage customers, create invoices',
    authType: 'api_key' as const,
    actions: ['create_customer', 'create_invoice', 'check_payment'],
  },
  {
    id: 'webhook' as const,
    name: 'Webhook',
    icon: '🔗',
    description: 'Send or receive HTTP webhooks',
    authType: 'none' as const,
    actions: ['send', 'receive'],
  },
  {
    id: 'schedule' as const,
    name: 'Schedule',
    icon: '⏰',
    description: 'Trigger workflows on a schedule (daily, weekly, custom cron)',
    authType: 'none' as const,
    actions: ['cron', 'interval', 'one_time'],
  },
  {
    id: 'form' as const,
    name: 'Form',
    icon: '📝',
    description: 'Create forms that trigger workflows on submission',
    authType: 'none' as const,
    actions: ['submit'],
  },
  {
    id: 'http' as const,
    name: 'HTTP Request',
    icon: '🌐',
    description: 'Make HTTP requests to any API',
    authType: 'none' as const,
    actions: ['get', 'post', 'put', 'delete'],
  },
  {
    id: 'sheets' as const,
    name: 'Google Sheets',
    icon: '📊',
    description: 'Read from and write to Google Sheets',
    authType: 'oauth' as const,
    actions: ['read_row', 'append_row', 'update_cell'],
  },
];
