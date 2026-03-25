'use client';

import { useState, useEffect } from 'react';

interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  authType: string;
  actions: string[];
}

interface ConnectedIntegration {
  id: string;
  provider: string;
  name: string;
  status: string;
  lastSynced: string | null;
}

export function IntegrationsHub() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connected, setConnected] = useState<ConnectedIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [credentialInput, setCredentialInput] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    Promise.all([
      fetch(`${apiUrl}/api/integrations/providers`).then(r => r.json()),
      fetch(`${apiUrl}/api/integrations`).then(r => r.json()),
    ])
      .then(([provData, connData]) => {
        setProviders(provData.providers || []);
        setConnected(connData.integrations || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [apiUrl]);

  const handleConnect = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    if (provider.authType === 'none') {
      // No auth needed
      await fetch(`${apiUrl}/api/integrations/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, credentials: {} }),
      });
      // Refresh
      const data = await fetch(`${apiUrl}/api/integrations`).then(r => r.json());
      setConnected(data.integrations || []);
      setConnectingProvider(null);
      return;
    }

    if (provider.authType === 'api_key') {
      setConnectingProvider(providerId);
      return;
    }

    // OAuth — would redirect in production
    setConnectingProvider(providerId);
  };

  const handleSaveCredential = async () => {
    if (!connectingProvider || !credentialInput) return;

    const provider = providers.find(p => p.id === connectingProvider);
    const credKey = provider?.authType === 'api_key' ? 'api_key' : 'webhook_url';

    await fetch(`${apiUrl}/api/integrations/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: connectingProvider,
        credentials: { [credKey]: credentialInput },
      }),
    });

    const data = await fetch(`${apiUrl}/api/integrations`).then(r => r.json());
    setConnected(data.integrations || []);
    setConnectingProvider(null);
    setCredentialInput('');
  };

  const isConnected = (providerId: string) => connected.some(c => c.provider === providerId && c.status === 'connected');

  if (isLoading) {
    return <div className="text-center py-12 text-sm text-gray-500">Loading integrations...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500 mt-1">Connect your tools to use them in workflows</p>
      </div>

      {/* Credential input modal */}
      {connectingProvider && (
        <div className="mb-6 bg-white rounded-xl border border-primary-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Connect {providers.find(p => p.id === connectingProvider)?.name}
          </h3>
          <input
            type="text"
            value={credentialInput}
            onChange={(e) => setCredentialInput(e.target.value)}
            placeholder={providers.find(p => p.id === connectingProvider)?.authType === 'api_key' ? 'Paste your API key...' : 'Paste webhook URL or OAuth token...'}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
          />
          <div className="flex gap-2">
            <button onClick={handleSaveCredential} className="px-4 py-2 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Connect
            </button>
            <button onClick={() => { setConnectingProvider(null); setCredentialInput(''); }} className="px-4 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => {
          const conn = isConnected(provider.id);
          return (
            <div
              key={provider.id}
              className={`bg-white rounded-xl border p-5 transition-all ${conn ? 'border-green-200' : 'border-gray-200 hover:border-primary-300'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-2xl">{provider.icon}</div>
                {conn && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">Connected</span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{provider.name}</h3>
              <p className="text-xs text-gray-500 mt-1 mb-3">{provider.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {provider.actions.map((a) => (
                  <span key={a} className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">{a}</span>
                ))}
              </div>
              {!conn ? (
                <button
                  onClick={() => handleConnect(provider.id)}
                  className="w-full px-3 py-2 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Connect {provider.name}
                </button>
              ) : (
                <button className="w-full px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Settings
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
