'use client';
import { useState, useEffect } from 'react';

type PortalConfig = {
  clients: string[];
  campaigns: string[];
  publications: string[];
};

export default function AdminPage() {
  const [cfg, setCfg] = useState<PortalConfig>({ clients: [], campaigns: [], publications: [] });
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setCfg({
            clients: data.clients || [],
            campaigns: data.campaigns || [],
            publications: data.publications || []
          });
        }
      });
  }, []);

  async function saveConfig() {
    setStatus('Saving...');
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    if (res.ok) {
      setStatus('Saved!');
      setTimeout(() => setStatus(''), 2000);
    } else {
      setStatus('Save failed');
    }
  }

  function addItem(type: 'clients' | 'campaigns' | 'publications') {
    const value = prompt(`Enter new ${type.slice(0, -1)}:`);
    if (value && value.trim()) {
      setCfg({ ...cfg, [type]: [...cfg[type], value.trim()] });
    }
  }

  function removeItem(type: 'clients' | 'campaigns' | 'publications', index: number) {
    setCfg({ ...cfg, [type]: cfg[type].filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-4">Admin Configuration</h2>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Clients</h3>
              <button className="btn btn-primary" onClick={() => addItem('clients')}>+ Add</button>
            </div>
            <div className="space-y-2">
              {cfg.clients.map((client, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span>{client}</span>
                  <button className="text-red-600" onClick={() => removeItem('clients', i)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Campaigns</h3>
              <button className="btn btn-primary" onClick={() => addItem('campaigns')}>+ Add</button>
            </div>
            <div className="space-y-2">
              {cfg.campaigns.map((campaign, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span>{campaign}</span>
                  <button className="text-red-600" onClick={() => removeItem('campaigns', i)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Publications</h3>
              <button className="btn btn-primary" onClick={() => addItem('publications')}>+ Add</button>
            </div>
            <div className="space-y-2">
              {cfg.publications.map((pub, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span>{pub}</span>
                  <button className="text-red-600" onClick={() => removeItem('publications', i)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <button className="btn btn-primary w-full" onClick={saveConfig}>Save Configuration</button>
            {status && <p className="text-sm text-center mt-2">{status}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
