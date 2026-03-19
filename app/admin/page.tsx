'use client';
import { useState, useEffect, useMemo } from 'react';
import { VersionNotificationPopup, VersionNotificationPanel, VersionNotification } from '@/app/components/VersionNotifications';
import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { PortalConfig } from '@/lib/types';
import packageJson from '../../package.json';

type ConfigItemType = 'clients' | 'campaigns' | 'publications';
type ActiveTab = ConfigItemType | 'drive';

// ── Inline editable list row ──────────────────────────────────────────────────
function ListItem({
  item,
  onEdit,
  onRemove,
  onToggleVisibility,
  singular,
}: {
  item: { name: string; hidden?: boolean };
  onEdit: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  singular: string;
}) {
  return (
    <div className={`group flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${item.hidden ? 'border-slate-100 bg-slate-50/50' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm truncate ${item.hidden ? 'text-slate-300 line-through' : 'text-slate-700'}`}>
          {item.name}
        </span>
        {item.hidden && <span className="text-xs text-slate-300 flex-shrink-0">hidden</span>}
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={onToggleVisibility}
          className="p-1.5 text-slate-300 hover:text-slate-500 rounded-md transition-colors"
          title={item.hidden ? `Show ${singular}` : `Hide ${singular}`}
        >
          {item.hidden ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-300 hover:text-brand rounded-md transition-colors"
          title={`Rename ${singular}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 text-slate-300 hover:text-brand-secondary rounded-md transition-colors"
          title={`Remove ${singular}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Inline edit row ───────────────────────────────────────────────────────────
function EditRow({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border border-brand/30 bg-brand/5 rounded-lg px-2 py-1.5">
      <input
        type="text"
        className="flex-1 text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
        autoFocus
      />
      <button onClick={onSave} disabled={!value.trim()} className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-30 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Tab content: searchable list ──────────────────────────────────────────────
function ConfigList({
  type,
  items,
  onSaveCfg,
  cfg,
  setCfg,
  onRequestDelete,
}: {
  type: ConfigItemType;
  items: Array<{ name: string; hidden?: boolean }>;
  onSaveCfg: (cfg: PortalConfig) => Promise<boolean>;
  cfg: PortalConfig;
  setCfg: (c: PortalConfig) => void;
  onRequestDelete: (type: ConfigItemType, index: number, name: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const singular = type.slice(0, -1);

  const sorted = useMemo(() =>
    [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const filtered = useMemo(() =>
    search.trim() ? sorted.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : sorted,
    [sorted, search]
  );

  const visibleCount = items.filter(i => !i.hidden).length;
  const hiddenCount = items.filter(i => i.hidden).length;

  async function saveNew() {
    if (!addValue.trim()) return;
    const updated = { ...cfg, [type]: [...cfg[type], { name: addValue.trim(), hidden: false }] };
    setCfg(updated);
    const ok = await onSaveCfg(updated);
    if (ok) { setAdding(false); setAddValue(''); }
    else { setCfg(cfg); alert('Failed to save'); }
  }

  async function saveEdit() {
    if (!editValue.trim() || !editingName) return;
    const updatedItems = cfg[type].map(i => i.name === editingName ? { ...i, name: editValue.trim() } : i);
    const updated = { ...cfg, [type]: updatedItems };
    setCfg(updated);
    const ok = await onSaveCfg(updated);
    if (ok) { setEditingName(null); setEditValue(''); }
    else { setCfg(cfg); alert('Failed to save'); }
  }

  async function toggleVisibility(name: string) {
    const updatedItems = cfg[type].map(i => i.name === name ? { ...i, hidden: !i.hidden } : i);
    const updated = { ...cfg, [type]: updatedItems };
    setCfg(updated);
    const ok = await onSaveCfg(updated);
    if (!ok) { setCfg(cfg); alert('Failed to update visibility'); }
  }

  return (
    <div className="space-y-3">
      {/* Stats + Add */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
          <span><strong className="text-slate-600">{items.length}</strong> total</span>
          {hiddenCount > 0 && <span className="text-slate-300">{hiddenCount} hidden</span>}
          <span className="hidden sm:inline">{visibleCount} visible</span>
        </div>
        <button
          className="btn-primary text-sm py-1.5 px-3 flex-shrink-0"
          onClick={() => { setAdding(true); setAddValue(''); }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Add {singular}</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search */}
      {items.length > 5 && (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            className="input pl-9 text-sm py-2"
            placeholder={`Search ${type}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Add row */}
      {adding && (
        <EditRow
          value={addValue}
          onChange={setAddValue}
          onSave={saveNew}
          onCancel={() => { setAdding(false); setAddValue(''); }}
        />
      )}

      {/* List */}
      <div className="space-y-1 max-h-96 overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-6">
            {search ? `No ${type} match "${search}"` : `No ${type} yet — add one above.`}
          </div>
        )}
        {filtered.map((item) => {
          const actualIndex = cfg[type].findIndex(i => i.name === item.name);
          if (editingName === item.name) {
            return (
              <EditRow
                key={item.name}
                value={editValue}
                onChange={setEditValue}
                onSave={saveEdit}
                onCancel={() => { setEditingName(null); setEditValue(''); }}
              />
            );
          }
          return (
            <ListItem
              key={item.name}
              item={item}
              singular={singular}
              onEdit={() => { setEditingName(item.name); setEditValue(item.name); }}
              onRemove={() => onRequestDelete(type, actualIndex, item.name)}
              onToggleVisibility={() => toggleVisibility(item.name)}
            />
          );
        })}
      </div>

      {search && filtered.length !== sorted.length && (
        <p className="text-xs text-slate-400 text-center">
          Showing {filtered.length} of {sorted.length} {type}
        </p>
      )}
    </div>
  );
}

// ── Drive Settings panel ──────────────────────────────────────────────────────
function DriveSettings({ cfg, setCfg, onSaveCfg }: { cfg: PortalConfig; setCfg: (c: PortalConfig) => void; onSaveCfg: (c: PortalConfig) => Promise<boolean> }) {
  const [status, setStatus] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  async function verifyFolderAccess() {
    const folderUrl = cfg.driveSettings?.parentFolderUrl;
    if (!folderUrl) { alert('Please enter a folder URL first'); return; }
    const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = match ? match[1] : null;
    if (!folderId) { alert('Invalid folder URL format. Expected: https://drive.google.com/drive/folders/FOLDER_ID'); return; }
    setVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await fetch(`/api/verify-folder?id=${folderId}`);
      setVerifyStatus(await res.json());
    } catch {
      setVerifyStatus({ success: false, message: '❌ Verification failed' });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="label">Parent Folder URL <span className="text-slate-400 font-normal">(optional)</span></label>
        <input
          type="text"
          className="input"
          placeholder="https://drive.google.com/drive/folders/YOUR_FOLDER_ID"
          value={cfg.driveSettings?.parentFolderUrl || ''}
          onChange={(e) => setCfg({ ...cfg, driveSettings: { ...cfg.driveSettings, parentFolderUrl: e.target.value } })}
        />
        <p className="text-xs text-slate-400 mt-1.5">
          Leave empty to use &quot;JJA eTearsheets&quot; in your root Drive.
        </p>
        {cfg.driveSettings?.rootFolderName && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Current parent folder: <strong>{cfg.driveSettings.rootFolderName}</strong>
          </p>
        )}
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
        <p className="font-semibold text-amber-800">⚠️ Share the folder with the service account</p>
        <p className="text-amber-700">After pasting the URL, share the folder with <strong>&quot;Editor&quot;</strong> permissions:</p>
        <code className="block bg-amber-100 px-2.5 py-1.5 rounded-lg text-amber-900 break-all font-mono">
          {process.env.NEXT_PUBLIC_SERVICE_ACCOUNT_EMAIL || 'your-service-account@project.iam.gserviceaccount.com'}
        </code>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={verifyFolderAccess}
          disabled={verifying || !cfg.driveSettings?.parentFolderUrl}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {verifying ? 'Verifying…' : 'Verify Access'}
        </button>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={async () => {
            setStatus('Saving…');
            const ok = await onSaveCfg(cfg);
            setStatus(ok ? 'Saved!' : 'Save failed');
            if (ok) setTimeout(() => setStatus(''), 2000);
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Settings
        </button>
      </div>

      {status && (
        <p className={`text-xs font-medium ${status === 'Saved!' ? 'text-emerald-600' : status === 'Save failed' ? 'text-brand-secondary' : 'text-slate-500'}`}>
          {status}
        </p>
      )}

      {verifyStatus && (
        <div className={`p-4 rounded-xl text-xs border ${verifyStatus.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`font-semibold mb-2 ${verifyStatus.success ? 'text-emerald-800' : 'text-red-800'}`}>
            {verifyStatus.message}
          </p>
          {verifyStatus.success && verifyStatus.folder && (
            <div className="text-slate-600 space-y-1">
              <p><strong>Folder Name:</strong> {verifyStatus.folder.name}</p>
              <p><strong>Folder ID:</strong> {verifyStatus.folder.id}</p>
              <p><strong>Type:</strong> {verifyStatus.folder.isSharedDrive ? `Shared Drive (DriveId: ${verifyStatus.folder.driveId})` : 'My Drive'}</p>
              <p><strong>Method:</strong> {verifyStatus.method}</p>
            </div>
          )}
          {verifyStatus.recommendations?.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-amber-800 mb-1">Recommendations:</p>
              <ul className="list-disc list-inside text-amber-700 space-y-1">
                {verifyStatus.recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [cfg, setCfg] = useState<PortalConfig>({
    clients: [], campaigns: [], publications: [], driveSettings: {}, adminNotifications: []
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('clients');
  const [unseenVersions, setUnseenVersions] = useState<VersionNotification[]>([]);
  const [recentVersions, setRecentVersions] = useState<VersionNotification[]>([]);
  const [totalVersions, setTotalVersions] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    itemType: ConfigItemType;
    itemIndex: number;
    itemName: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [configRes, stateRes] = await Promise.all([fetch('/api/config'), fetch('/api/admin-state')]);
      const configData = await configRes.json();
      if (!configData.error) {
        setCfg({
          clients: configData.clients || [],
          campaigns: configData.campaigns || [],
          publications: configData.publications || [],
          driveSettings: configData.driveSettings || {},
          adminNotifications: configData.adminNotifications || []
        });
      }
      const stateData = await stateRes.json();
      if (!stateData.error) {
        setUnseenVersions(stateData.unseenVersions || []);
        setRecentVersions(stateData.recentVersions || []);
        setTotalVersions(stateData.unseenVersions?.length || 0);
        if (stateData.hasUnseen) setShowPopup(true);
      }
    }
    load();
  }, []);

  async function saveCfg(nextCfg: PortalConfig): Promise<boolean> {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextCfg)
    });
    return res.ok;
  }

  async function dismissNotification() {
    try {
      const res = await fetch('/api/admin-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', version: packageJson.version })
      });
      if (res.ok) { setShowPopup(false); setUnseenVersions([]); }
    } catch { setShowPopup(false); }
  }

  function requestDelete(type: ConfigItemType, index: number, name: string) {
    setConfirmDialog({ isOpen: true, itemType: type, itemIndex: index, itemName: name });
  }

  async function confirmDelete() {
    if (!confirmDialog) return;
    const { itemType, itemIndex } = confirmDialog;
    const updated = { ...cfg, [itemType]: cfg[itemType].filter((_, i) => i !== itemIndex) };
    setCfg(updated);
    setConfirmDialog(null);
    const ok = await saveCfg(updated);
    if (!ok) { setCfg(cfg); alert('Failed to remove item'); }
  }

  const tabs: { key: ActiveTab; label: string; mobileLabel: string; count?: number }[] = [
    { key: 'clients', label: 'Clients', mobileLabel: 'Clients', count: cfg.clients.length },
    { key: 'campaigns', label: 'Campaigns', mobileLabel: 'Camp.', count: cfg.campaigns.length },
    { key: 'publications', label: 'Publications', mobileLabel: 'Pubs', count: cfg.publications.length },
    { key: 'drive', label: 'Drive Settings', mobileLabel: 'Drive' },
  ];

  return (
    <div className="space-y-5">
      {showPopup && unseenVersions.length > 0 && (
        <VersionNotificationPopup unseenVersions={unseenVersions} currentVersion={packageJson.version} onDismiss={dismissNotification} />
      )}
      <VersionNotificationPanel isOpen={showNotificationPanel} onClose={() => setShowNotificationPanel(false)} recentVersions={recentVersions} totalVersions={totalVersions} />
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Confirm Deletion"
          message={`Are you sure you want to delete "${confirmDialog.itemName}"? This cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDialog(null)}
          variant="danger"
        />
      )}

      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-2">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800">Admin Configuration</h2>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Manage clients, campaigns, and publications</p>
          </div>
          <button
            onClick={() => setShowNotificationPanel(true)}
            className="relative flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-slate-500 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors border border-slate-100 hover:border-brand/20 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="hidden sm:inline">Updates</span>
            {unseenVersions.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-secondary rounded-full" />
            )}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 bg-slate-100 p-1 rounded-xl mb-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-brand shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.mobileLabel}</span>
              {tab.count !== undefined && (
                <span className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-brand/10 text-brand' : 'bg-slate-200 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {(activeTab === 'clients' || activeTab === 'campaigns' || activeTab === 'publications') && (
          <ConfigList
            key={activeTab}
            type={activeTab}
            items={cfg[activeTab]}
            cfg={cfg}
            setCfg={setCfg}
            onSaveCfg={saveCfg}
            onRequestDelete={requestDelete}
          />
        )}
        {activeTab === 'drive' && (
          <DriveSettings cfg={cfg} setCfg={setCfg} onSaveCfg={saveCfg} />
        )}
      </div>
    </div>
  );
}
