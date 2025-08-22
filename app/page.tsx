'use client';
import { useState, useEffect } from 'react';

type PortalConfig = {
  clients: string[];
  campaigns: string[];
  publications: string[];
};

export default function HomePage() {
  const [auth, setAuth] = useState<'needs-auth' | 'ready' | 'loading'>('loading');
  const [cfg, setCfg] = useState<PortalConfig | null>(null);
  const [pub, setPub] = useState('');
  const [client, setClient] = useState('');
  const [campaign, setCampaign] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/config').then(res => res.json()).then(data => {
      if (data.error) {
        if (data.error.includes('Not authenticated')) {
          setAuth('needs-auth');
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
    if (!file || !pub || !client || !campaign || !date) return;
    setStatus('Uploading...');
    const form = new FormData();
    form.set('publication', pub);
    form.set('client', client);
    form.set('campaign', campaign);
    form.set('date', date);
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


if (!cfg) return <div className="card">Loading…</div>;


return (
<div className="card space-y-4">
<h2 className="text-xl font-semibold">Upload a File</h2>
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
<label className="label">Date</label>
<input className="input" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
</div>
<div>
<label className="label">File</label>
<input className="input" type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
</div>
<button className="btn btn-primary" type="submit">Upload</button>
</form>
{status && <div className="text-sm text-neutral-600">{status}</div>}
<div className="text-xs text-neutral-500">Folder path will be: <strong>{client || 'Client'}</strong> / <strong>{campaign || 'Campaign'}</strong> / <strong>{pub || 'Publication'}</strong> / <strong>{date || 'YYYY-MM-DD'}</strong></div>
</div>
);
}