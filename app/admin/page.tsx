'use client';
import { useState, useEffect } from 'react';

type PortalConfig = {
  clients: string[];
  campaigns: string[];
  publications: string[];
  driveSettings?: {
    rootFolderId?: string;
    rootFolderName?: string;
    isConfigured?: boolean;
    parentFolderUrl?: string;
  };
};

export default function AdminPage() {
  const [cfg, setCfg] = useState<PortalConfig>({ 
    clients: [], 
    campaigns: [], 
    publications: [],
    driveSettings: {}
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setCfg({
            clients: data.clients || [],
            campaigns: data.campaigns || [],
            publications: data.publications || [],
            driveSettings: data.driveSettings || {}
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
      // Reload config after saving to get updated values
      const reloadRes = await fetch('/api/config');
      const reloadData = await reloadRes.json();
      if (!reloadData.error) {
        setCfg({
          clients: reloadData.clients || [],
          campaigns: reloadData.campaigns || [],
          publications: reloadData.publications || [],
          driveSettings: reloadData.driveSettings || {}
        });
      }
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

          {/* Google Drive Parent Folder Configuration */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Google Drive Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="label text-sm font-medium text-gray-700">
                  Parent Folder URL (optional)
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="https://drive.google.com/drive/folders/YOUR_FOLDER_ID"
                  value={cfg.driveSettings?.parentFolderUrl || ''}
                  onChange={(e) => setCfg({
                    ...cfg,
                    driveSettings: {
                      ...cfg.driveSettings,
                      parentFolderUrl: e.target.value
                    }
                  })}
                />
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p className="font-semibold text-yellow-800 mb-1">⚠️ Important: Share the folder with the service account</p>
                  <p className="text-yellow-700 mb-2">
                    After pasting the folder URL, you must share that Google Drive folder with:
                  </p>
                  <code className="block bg-yellow-100 px-2 py-1 rounded text-yellow-900 break-all">
                    {process.env.NEXT_PUBLIC_SERVICE_ACCOUNT_EMAIL || 'your-service-account@project.iam.gserviceaccount.com'}
                  </code>
                  <p className="text-yellow-700 mt-2">
                    Give it <strong>"Editor"</strong> permissions. Without this, uploads will fail.
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  📁 Paste a Google Drive folder URL to use as the parent folder. Leave empty to use "JJA eTearsheets" in your root Drive.
                </p>
                {cfg.driveSettings?.rootFolderName && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Current parent folder: <strong>{cfg.driveSettings.rootFolderName}</strong>
                  </p>
                )}
              </div>
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
