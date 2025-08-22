'use client';
import { useEffect, useState } from 'react';


type Config = { clients: string[]; campaigns: string[]; publications: string[] };


export default function AdminPage() {
const [cfg, setCfg] = useState<Config|null>(null);
const [saving, setSaving] = useState(false);
const [error, setError] = useState('');


useEffect(() => { (async () => {
const r = await fetch('/api/config');
if (!r.ok) { setError('Auth required.'); return; }
setCfg(await r.json());
})(); }, []);


function addTo(key: keyof Config) {
const v = prompt(`Add to ${key}`);
if (!v) return;
setCfg(prev => prev ? { ...prev, [key]: Array.from(new Set([...(prev as any)[key], v.trim()])) } as any : prev);
}


function removeFrom(key: keyof Config, val: string) {
setCfg(prev => prev ? { ...prev, [key]: (prev as any)[key].filter((x: string)=>x!==val) } as any : prev);
}


async function save() {
if (!cfg) return;
setSaving(true);
const r = await fetch('/api/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
setSaving(false);
if (!r.ok) setError('Save failed'); else setError('');
}


if (!cfg) return <div className="card">Loading admin… {error}</div>;


const Section = ({ title, keyName }: { title: string; keyName: keyof Config }) => (
<div className="card">
<div className="flex items-center justify-between mb-3">
<h3 className="text-lg font-semibold">{title}</h3>
<button className="btn" onClick={()=>addTo(keyName)}>Add</button>
</div>
<ul className="space-y-1">
{(cfg as any)[keyName].map((x: string)=> (
<li key={x} className="flex items-center justify-between border rounded-xl px-3 py-2">
<span>{x}</span>
<button className="btn" onClick={()=>removeFrom(keyName, x)}>Remove</button>
</li>
))}
</ul>
</div>
);


return (
<div className="space-y-6">
<h2 className="text-xl font-semibold">Admin Panel</h2>
<Section title="Publications" keyName="publications" />
<Section title="Clients" keyName="clients" />
<Section title="Campaigns" keyName="campaigns" />
<div>
<button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
</div>
</div>
);
}