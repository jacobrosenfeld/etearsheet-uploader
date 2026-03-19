'use client';
import { useState, useEffect } from 'react';
import { VersionNotificationPopup, VersionNotificationPanel, VersionNotification } from '@/app/components/VersionNotifications';
import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { ItemList } from '@/app/components/ItemList';
import { PortalConfig } from '@/lib/types';
import packageJson from '../../package.json';

type ConfigItemType = 'clients' | 'campaigns' | 'publications';

export default function AdminPage() {
  const [cfg, setCfg] = useState<PortalConfig>({
    clients: [],
    campaigns: [],
    publications: [],
    driveSettings: {},
    adminNotifications: []
  });
  const [status, setStatus] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [addingItem, setAddingItem] = useState<ConfigItemType | null>(null);
  const [newItemValue, setNewItemValue] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: ConfigItemType; index: number } | null>(null);
  const [editItemValue, setEditItemValue] = useState('');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const [unseenVersions, setUnseenVersions] = useState<VersionNotification[]>([]);
  const [recentVersions, setRecentVersions] = useState<VersionNotification[]>([]);
  const [totalVersions, setTotalVersions] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    itemType: ConfigItemType;
    itemIndex: number;
    itemName: string;
  } | null>(null);

  useEffect(() => {
    async function loadConfigAndState() {
      const configRes = await fetch('/api/config');
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

      const stateRes = await fetch('/api/admin-state');
      const stateData = await stateRes.json();
      if (!stateData.error) {
        setUnseenVersions(stateData.unseenVersions || []);
        setRecentVersions(stateData.recentVersions || []);
        setTotalVersions(stateData.unseenVersions?.length || 0);
        if (stateData.hasUnseen) {
          setShowPopup(true);
        }
      }
    }

    loadConfigAndState();
  }, []);

  const dismissNotification = async () => {
    try {
      const res = await fetch('/api/admin-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', version: packageJson.version })
      });
      if (res.ok) {
        setShowPopup(false);
        setUnseenVersions([]);
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      setShowPopup(false);
    }
  };

  async function saveCfg(nextCfg: PortalConfig): Promise<boolean> {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextCfg)
    });
    return res.ok;
  }

  function startAddingItem(type: ConfigItemType) {
    setAddingItem(type);
    setNewItemValue('');
  }

  function cancelAddingItem() {
    setAddingItem(null);
    setNewItemValue('');
  }

  async function saveNewItem(type: ConfigItemType) {
    if (!newItemValue.trim()) return;
    const newItem = { name: newItemValue.trim(), hidden: false };
    const updatedCfg = { ...cfg, [type]: [...cfg[type], newItem] };
    setCfg(updatedCfg);
    const ok = await saveCfg(updatedCfg);
    if (ok) {
      setAddingItem(null);
      setNewItemValue('');
    } else {
      setCfg(cfg);
      alert('Failed to save new item');
    }
  }

  function removeItem(type: ConfigItemType, index: number) {
    const item = cfg[type][index];
    if (!item?.name) return;
    setConfirmDialog({ isOpen: true, itemType: type, itemIndex: index, itemName: item.name });
  }

  async function confirmRemoveItem() {
    if (!confirmDialog) return;
    const { itemType, itemIndex } = confirmDialog;
    const updatedCfg = { ...cfg, [itemType]: cfg[itemType].filter((_, i) => i !== itemIndex) };
    setCfg(updatedCfg);
    setConfirmDialog(null);
    const ok = await saveCfg(updatedCfg);
    if (!ok) {
      setCfg(cfg);
      alert('Failed to remove item');
    }
  }

  function cancelRemoveItem() {
    setConfirmDialog(null);
  }

  function startEditingItem(type: ConfigItemType, index: number) {
    setEditingItem({ type, index });
    setEditItemValue(cfg[type][index].name);
  }

  function cancelEditingItem() {
    setEditingItem(null);
    setEditItemValue('');
  }

  async function saveEditedItem() {
    if (!editingItem || !editItemValue.trim()) return;
    const { type, index } = editingItem;
    const originalCfg = { ...cfg, [type]: cfg[type].map(item => ({ ...item })) };
    const updatedItems = [...cfg[type]];
    updatedItems[index] = { ...updatedItems[index], name: editItemValue.trim() };
    const updatedCfg = { ...cfg, [type]: updatedItems };
    setCfg(updatedCfg);
    const ok = await saveCfg(updatedCfg);
    if (ok) {
      setEditingItem(null);
      setEditItemValue('');
    } else {
      setCfg(originalCfg);
      alert('Failed to save edited item');
    }
  }

  async function toggleVisibility(type: ConfigItemType, itemName: string) {
    const updatedItems = cfg[type].map(item =>
      item.name === itemName ? { ...item, hidden: !item.hidden } : item
    );
    const newCfg = { ...cfg, [type]: updatedItems };
    setCfg(newCfg);
    try {
      const ok = await saveCfg(newCfg);
      if (!ok) {
        setCfg(cfg);
        alert('Failed to update visibility');
      }
    } catch {
      setCfg(cfg);
      alert('Failed to update visibility');
    }
  }

  async function verifyFolderAccess() {
    const folderUrl = cfg.driveSettings?.parentFolderUrl;
    if (!folderUrl) {
      alert('Please enter a folder URL first');
      return;
    }
    const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = match ? match[1] : null;
    if (!folderId) {
      alert('Invalid folder URL format. Expected: https://drive.google.com/drive/folders/FOLDER_ID');
      return;
    }
    setVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await fetch(`/api/verify-folder?id=${folderId}`);
      const data = await res.json();
      setVerifyStatus(data);
    } catch {
      setVerifyStatus({ success: false, error: 'Failed to verify folder access', message: '❌ Verification failed' });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-5">
      {showPopup && unseenVersions.length > 0 && (
        <VersionNotificationPopup
          unseenVersions={unseenVersions}
          currentVersion={packageJson.version}
          onDismiss={dismissNotification}
        />
      )}

      <VersionNotificationPanel
        isOpen={showNotificationPanel}
        onClose={() => setShowNotificationPanel(false)}
        recentVersions={recentVersions}
        totalVersions={totalVersions}
      />

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Confirm Deletion"
          message={`Are you sure you want to delete "${confirmDialog.itemName}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmRemoveItem}
          onCancel={cancelRemoveItem}
          variant="danger"
        />
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Admin Configuration</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage clients, campaigns, and publications</p>
          </div>
          <button
            onClick={() => setShowNotificationPanel(true)}
            className="relative flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors border border-slate-100 hover:border-brand/20"
            title="View updates and announcements"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-medium">Updates</span>
            {unseenVersions.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-secondary rounded-full"></span>
            )}
          </button>
        </div>

        <div className="space-y-6">
          {/* Divider sections for each config type */}
          {(['clients', 'campaigns', 'publications'] as ConfigItemType[]).map((type, i) => (
            <div key={type} className={i > 0 ? 'pt-5 border-t border-slate-100' : ''}>
              <ItemList
                label={type.charAt(0).toUpperCase() + type.slice(1)}
                items={cfg[type]}
                isAdding={addingItem === type}
                newItemValue={newItemValue}
                editingIndex={editingItem?.type === type ? editingItem.index : null}
                editItemValue={editItemValue}
                onStartAdd={() => startAddingItem(type)}
                onCancelAdd={cancelAddingItem}
                onSaveNew={() => saveNewItem(type)}
                onNewValueChange={setNewItemValue}
                onStartEdit={(index) => startEditingItem(type, index)}
                onCancelEdit={cancelEditingItem}
                onSaveEdit={saveEditedItem}
                onEditValueChange={setEditItemValue}
                onRemove={(index) => removeItem(type, index)}
                onToggleVisibility={(name) => toggleVisibility(type, name)}
              />
            </div>
          ))}

          {/* Google Drive Settings */}
          <div className="pt-5 border-t border-slate-100">
            <h3 className="text-base font-semibold text-slate-700 mb-3">Google Drive Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="label">
                  Parent Folder URL <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="https://drive.google.com/drive/folders/YOUR_FOLDER_ID"
                  value={cfg.driveSettings?.parentFolderUrl || ''}
                  onChange={(e) => setCfg({
                    ...cfg,
                    driveSettings: { ...cfg.driveSettings, parentFolderUrl: e.target.value }
                  })}
                />

                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                  <p className="font-semibold text-amber-800 mb-1.5">⚠️ Share the folder with the service account</p>
                  <p className="text-amber-700 mb-2">
                    After pasting the folder URL, share that Google Drive folder with:
                  </p>
                  <code className="block bg-amber-100 px-2.5 py-1.5 rounded-lg text-amber-900 break-all font-mono">
                    {process.env.NEXT_PUBLIC_SERVICE_ACCOUNT_EMAIL || 'your-service-account@project.iam.gserviceaccount.com'}
                  </code>
                  <p className="text-amber-700 mt-2">
                    Grant <strong>&quot;Editor&quot;</strong> permissions. Without this, uploads will fail.
                  </p>
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  Paste a Google Drive folder URL to use as the parent folder. Leave empty to use &quot;JJA eTearsheets&quot; in your root Drive.
                </p>

                {cfg.driveSettings?.rootFolderName && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Current parent folder: <strong>{cfg.driveSettings.rootFolderName}</strong>
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={verifyFolderAccess}
                    disabled={verifying || !cfg.driveSettings?.parentFolderUrl}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {verifying ? 'Verifying…' : 'Verify Folder Access'}
                  </button>

                  <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={async () => {
                      setStatus('Saving…');
                      const ok = await saveCfg(cfg);
                      setStatus(ok ? 'Saved!' : 'Save failed');
                      if (ok) setTimeout(() => setStatus(''), 2000);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Drive Settings
                  </button>
                </div>

                {status && (
                  <p className={`mt-2 text-xs font-medium ${status === 'Saved!' ? 'text-emerald-600' : status === 'Save failed' ? 'text-brand-secondary' : 'text-slate-500'}`}>
                    {status}
                  </p>
                )}

                {verifyStatus && (
                  <div className={`mt-3 p-4 rounded-xl text-xs border ${
                    verifyStatus.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`font-semibold mb-2 ${verifyStatus.success ? 'text-emerald-800' : 'text-red-800'}`}>
                      {verifyStatus.message}
                    </p>
                    {verifyStatus.success && verifyStatus.folder && (
                      <div className="text-slate-600 space-y-1">
                        <p><strong>Folder Name:</strong> {verifyStatus.folder.name}</p>
                        <p><strong>Folder ID:</strong> {verifyStatus.folder.id}</p>
                        {verifyStatus.folder.isSharedDrive && (
                          <p className="text-brand"><strong>Type:</strong> Shared Drive (DriveId: {verifyStatus.folder.driveId})</p>
                        )}
                        {!verifyStatus.folder.isSharedDrive && (
                          <p><strong>Type:</strong> My Drive</p>
                        )}
                        <p><strong>Method:</strong> {verifyStatus.method}</p>
                      </div>
                    )}
                    {verifyStatus.recommendations && verifyStatus.recommendations.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold text-amber-800 mb-1">Recommendations:</p>
                        <ul className="list-disc list-inside text-amber-700 space-y-1">
                          {verifyStatus.recommendations.map((rec: string, i: number) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
