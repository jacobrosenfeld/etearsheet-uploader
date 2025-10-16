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
  };
};

export default function HomePage() {
  const [cfg, setCfg] = useState<PortalConfig | null>(null);
  const [pub, setPub] = useState('');
  const [client, setClient] = useState('');
  const [campaign, setCampaign] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setCfg(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !pub || !client || !campaign) return;
    setStatus('Uploading...');
    const form = new FormData();
    form.set('publication', pub);
    form.set('client', client);
    form.set('campaign', campaign);
    form.set('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (res.ok) {
      setStatus('success');
      // Reset form
      setFile(null);
    } else {
      const error = await res.json();
      setStatus(`error:${error.error || 'Unknown error'}`);
    }
  }

  if (loading) return <div className="card">Loading configuration...</div>;
  if (!cfg) return <div className="card">No configuration available</div>;

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h2 className="text-xl font-semibold">Upload a File</h2>

        {/* Drive folder info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <strong>📁 Files will be organized in Google Drive:</strong><br/>
            {cfg.driveSettings?.rootFolderName || 'JJA eTearsheets'} → Client → Campaign → Publication
          </div>
        </div>

        <form onSubmit={doUpload} className="grid gap-4">
          <div>
            <label className="label">Publication</label>
            <select className="input" value={pub} onChange={(e)=>setPub(e.target.value)}>
              <option value="">Select publication…</option>
              {cfg.publications.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Client</label>
            <select className="input" value={client} onChange={(e)=>setClient(e.target.value)}>
              <option value="">Select client…</option>
              {cfg.clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Campaign</label>
            <select className="input" value={campaign} onChange={(e)=>setCampaign(e.target.value)}>
              <option value="">Select campaign…</option>
              {cfg.campaigns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">File</label>
            <input className="input" type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
          </div>
          <button className="btn btn-primary" type="submit">
            Upload
          </button>
        </form>
        
        {/* Status messages */}
        {status === 'Uploading...' && (
          <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            ⏳ Uploading...
          </div>
        )}
        {status === 'success' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🎉</span>
              <div>
                <div className="text-lg font-bold text-green-700">Upload Successful!</div>
                <div className="text-sm text-green-600">Your file has been uploaded to Google Drive</div>
              </div>
            </div>
          </div>
        )}
        {status.startsWith('error:') && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            ❌ Upload failed: {status.replace('error:', '')}
          </div>
        )}
      </div>

      {/* Upload preview */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Folder Structure Preview</h3>
        <div className="text-xs text-neutral-500 font-mono bg-gray-50 p-3 rounded">
          📁 {cfg.driveSettings?.rootFolderName || 'JJA eTearsheets'}<br/>
          &nbsp;&nbsp;📁 {client || 'Client'}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;📁 {campaign || 'Campaign'}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📁 {pub || 'Publication'}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📄 {pub ? `${pub}_${new Date().toISOString().split('T')[0]}_${file?.name || 'filename.pdf'}` : 'Publication_YYYY-MM-DD_filename.pdf'}
        </div>
      </div>
    </div>
  );
}