'use client';
import { useEffect, useState } from 'react';

type Config = { clients: string[]; campaigns: string[]; publications: string[] };

export default function AdminPage() {
  const [cfg, setCfg] = useState<Config|null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { 
    (async () => {
      const r = await fetch('/api/config');
      if (!r.ok) { 
        setError('Auth required or config not available.'); 
        return; 
      }
      setCfg(await r.json());
    })(); 
  }, []);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const r = await fetch('/api/config', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(cfg) 
      });
      
      if (!r.ok) {
        const errorData = await r.json();
        setError(errorData.error || 'Save failed');
      } else {
        setSuccess('Changes saved successfully!');
        setTimeout(() => setSuccess(''), 3000); // Clear success message after 3 seconds
      }
    } catch (e) {
      setError('Network error while saving');
    }
    
    setSaving(false);
  }

  function addTo(key: keyof Config, value: string) {
    if (!value.trim()) return;
    setCfg(prev => prev ? { 
      ...prev, 
      [key]: Array.from(new Set([...(prev as any)[key], value.trim()])) 
    } as any : prev);
  }

  function removeFrom(key: keyof Config, val: string) {
    setCfg(prev => prev ? { 
      ...prev, 
      [key]: (prev as any)[key].filter((x: string) => x !== val) 
    } as any : prev);
  }

  if (!cfg) return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Admin Panel</h2>
      <div>Loading admin panel...</div>
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );

  const Section = ({ title, keyName }: { title: string; keyName: keyof Config }) => {
    const [newItem, setNewItem] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = () => {
      if (newItem.trim()) {
        addTo(keyName, newItem);
        setNewItem('');
        setIsAdding(false);
      }
    };

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          {!isAdding ? (
            <button 
              className="btn" 
              onClick={() => setIsAdding(true)}
            >
              Add {title.slice(0, -1)}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={`Enter ${title.toLowerCase().slice(0, -1)}...`}
                className="input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewItem('');
                  }
                }}
                autoFocus
              />
              <button 
                className="btn btn-primary" 
                onClick={handleAdd}
                disabled={!newItem.trim()}
              >
                Add
              </button>
              <button 
                className="btn" 
                onClick={() => {
                  setIsAdding(false);
                  setNewItem('');
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <ul className="space-y-1">
          {(cfg as any)[keyName].map((x: string) => (
            <li key={x} className="flex items-center justify-between border rounded-xl px-3 py-2">
              <span>{x}</span>
              <button 
                className="btn btn-red text-red-600 hover:bg-red-50" 
                onClick={() => removeFrom(keyName, x)}
              >
                Remove
              </button>
            </li>
          ))}
          {(cfg as any)[keyName].length === 0 && (
            <li className="text-gray-500 italic px-3 py-2">No {title.toLowerCase()} added yet</li>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Admin Panel</h2>
        <div className="flex gap-2 items-center">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <button 
            className="btn btn-primary" 
            onClick={save} 
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      <Section title="Publications" keyName="publications" />
      <Section title="Clients" keyName="clients" />
      <Section title="Campaigns" keyName="campaigns" />
      
      <div className="text-sm text-gray-600">
        <p>• Add items using the "Add" buttons above</p>
        <p>• Press Enter to quickly add an item, Escape to cancel</p>
        <p>• Remember to click "Save Changes" after making modifications</p>
      </div>
    </div>
  );
}