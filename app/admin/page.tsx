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

  async function save(passedCfg?: Config) {
    const bodyCfg = passedCfg || cfg;
    if (!bodyCfg) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const r = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyCfg)
      });

      if (!r.ok) {
        let errorData;
        try { errorData = await r.json(); } catch (_) { /* ignore */ }
        setError((errorData && errorData.error) || 'Save failed');
      } else {
        setSuccess('Changes saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      setError('Network error while saving');
    }

    setSaving(false);
  }

  async function addAndSave(key: keyof Config, value: string) {
    const v = value.trim();
    if (!v || !cfg) return;
    const prev = cfg as Config;
    const next = { ...prev, [key]: Array.from(new Set([...(prev as any)[key], v])) } as Config;
    setCfg(next);
    await save(next);
  }

  async function removeAndSave(key: keyof Config, val: string) {
    if (!cfg) return;
    const prev = cfg as Config;
    const next = { ...prev, [key]: (prev as any)[key].filter((x: string) => x !== val) } as Config;
    setCfg(next);
    await save(next);
  }

  async function editAndSave(key: keyof Config, oldVal: string, newValRaw: string) {
    const newVal = newValRaw.trim();
    if (!cfg) return;
    const prev = cfg as Config;
    if (!newVal) {
      // if emptied, remove item
      await removeAndSave(key, oldVal);
      return;
    }
    const withoutOld = (prev as any)[key].filter((x: string) => x !== oldVal);
    const next = { ...prev, [key]: Array.from(new Set([...withoutOld, newVal])) } as Config;
    setCfg(next);
    await save(next);
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

    const handleAdd = async () => {
      if (newItem.trim()) {
        await addAndSave(keyName, newItem);
        setNewItem('');
        setIsAdding(false);
      }
    };

    const ItemRow = ({ val }: { val: string }) => {
      const [isEditing, setIsEditing] = useState(false);
      const [editVal, setEditVal] = useState(val);

      return (
        <li className="flex items-center justify-between border rounded-xl px-3 py-2">
          {!isEditing ? (
            <span>{val}</span>
          ) : (
            <input
              className="input flex-1 mr-2"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  await editAndSave(keyName, val, editVal);
                  setIsEditing(false);
                }
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditVal(val);
                }
              }}
              onBlur={async () => {
                // save on blur as well
                if (editVal.trim() !== val) {
                  await editAndSave(keyName, val, editVal);
                }
                setIsEditing(false);
              }}
              autoFocus
            />
          )}

          <div className="flex gap-2 items-center">
            {!isEditing ? (
              <>
                <button className="btn" onClick={() => setIsEditing(true)}>Edit</button>
                <button className="btn btn-red text-red-600 hover:bg-red-50" onClick={() => removeAndSave(keyName, val)}>Remove</button>
              </>
            ) : (
              <button className="btn" onClick={async () => { await editAndSave(keyName, val, editVal); setIsEditing(false); }}>Save</button>
            )}
          </div>
        </li>
      );
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
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') await handleAdd();
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
            <ItemRow key={x} val={x} />
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
          {saving && <div className="text-blue-600 text-sm">Saving...</div>}
        </div>
      </div>
      
      <Section title="Publications" keyName="publications" />
      <Section title="Clients" keyName="clients" />
      <Section title="Campaigns" keyName="campaigns" />
      
      <div className="text-sm text-gray-600">
        <p>• Add items using the "Add" buttons above</p>
        <p>• Press Enter to quickly add an item, Escape to cancel</p>
        <p>• Changes are saved automatically when you add, edit, or remove items</p>
      </div>
    </div>
  );
}