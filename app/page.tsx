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
  const [auth, setAuth] = useState<'needs-auth' | 'needs-setup' | 'ready' | 'loading'>('loading');
  const [cfg, setCfg] = useState<PortalConfig | null>(null);
  const [pub, setPub] = useState('');
  const [client, setClient] = useState('');
  const [campaign, setCampaign] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/config').then(res => res.json()).then(data => {
      if (data.error) {
        if (data.error.includes('Not authenticated')) {
          setAuth('needs-auth');
        } else if (data.error.includes('Portal not configured')) {
          // Regular user, portal not set up yet
          setAuth('needs-setup');
          setStatus(data.error);
        } else {
          setStatus('Error: ' + data.error);
        }
      } else {
        setCfg(data);
        setAuth('ready');
      }
    }).catch(() => setAuth('needs-auth'));
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
    if (res.ok) setStatus('Uploaded successfully.'); else setStatus('Upload failed.');
  }

  if (auth === 'needs-auth') {
return (
<div className="card">
<p className="mb-3">Connect your Google Drive to proceed.</p>
<form method="post" action="/api/auth/init"><button className="btn btn-primary">Connect Google Drive</button></form>
</div>
);
}

  if (auth === 'needs-setup') {
return (
<div className="card">
<h2 className="text-xl font-semibold mb-4">Portal Setup Required</h2>
<p className="mb-3">{status}</p>
<p className="text-sm text-neutral-600">You are logged in as a regular user. An admin needs to authenticate with Google Drive and configure the portal before uploads can be enabled.</p>
</div>
);
}


if (!cfg) return <div className="card">Loading…</div>;

// Check if Drive is configured
const driveConfigured = cfg.driveSettings?.isConfigured;

return (
<div className="space-y-6">
{/* Drive Setup Warning */}
{!driveConfigured && (
  <div className="card bg-amber-50 border-amber-200">
    <h3 className="text-lg font-semibold text-amber-800 mb-2">⚠️ Google Drive Not Configured</h3>
    <p className="text-amber-700 mb-2">Uploads are currently disabled. An admin needs to set up Google Drive integration.</p>
    <p className="text-sm text-amber-600">You can preview the upload form below, but files cannot be uploaded until Google Drive is configured.</p>
  </div>
)}

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
<button 
  className="btn btn-primary" 
  type="submit" 
  disabled={!driveConfigured}
  title={!driveConfigured ? 'Upload disabled until Google Drive is configured' : ''}
>
  {driveConfigured ? 'Upload' : 'Upload (Disabled)'}
</button>
</form>
{status && <div className="text-sm text-neutral-600">{status}</div>}
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