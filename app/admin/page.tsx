'use client';
import { useState, useEffect } from 'react';
import { NotificationPopup, NotificationPanel } from '@/app/components/Notifications';

type AdminNotification = {
  id: string;
  version: string;
  title: string;
  message: string;
  type: 'feature' | 'update' | 'announcement';
  createdAt: string;
  dismissedBy?: string[];
};

type PortalConfig = {
  clients: Array<{ name: string; hidden?: boolean }>;
  campaigns: Array<{ name: string; hidden?: boolean }>;
  publications: Array<{ name: string; hidden?: boolean }>;
  driveSettings?: {
    rootFolderId?: string;
    rootFolderName?: string;
    isConfigured?: boolean;
    parentFolderUrl?: string;
  };
  adminNotifications?: AdminNotification[];
};

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
  const [addingItem, setAddingItem] = useState<'clients' | 'campaigns' | 'publications' | null>(null);
  const [newItemValue, setNewItemValue] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'clients' | 'campaigns' | 'publications'; index: number; } | null>(null);
  const [editItemValue, setEditItemValue] = useState('');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [popupNotification, setPopupNotification] = useState<AdminNotification | null>(null);
  const [adminId, setAdminId] = useState<string>('');

  // Generate a unique admin ID for this session (in a real app, this would come from auth)
  useEffect(() => {
    let id = localStorage.getItem('adminSessionId');
    if (!id) {
      id = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('adminSessionId', id);
    }
    setAdminId(id);
  }, []);

  useEffect(() => {
    async function loadConfig() {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (!data.error) {
        setCfg({
          clients: data.clients || [],
          campaigns: data.campaigns || [],
          publications: data.publications || [],
          driveSettings: data.driveSettings || {},
          adminNotifications: data.adminNotifications || []
        });

        // Check for unread notifications
        if (adminId && data.adminNotifications) {
          const unreadNotification = data.adminNotifications.find(
            (n: AdminNotification) => !n.dismissedBy?.includes(adminId)
          );
          if (unreadNotification) {
            setPopupNotification(unreadNotification);
          }
        }
      }
    }
    
    if (adminId) {
      loadConfig();
    }
  }, [adminId]);

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

  function startAddingItem(type: 'clients' | 'campaigns' | 'publications') {
    setAddingItem(type);
    setNewItemValue('');
  }

  function cancelAddingItem() {
    setAddingItem(null);
    setNewItemValue('');
  }

  async function saveNewItem(type: 'clients' | 'campaigns' | 'publications') {
    if (!newItemValue.trim()) return;
    
    const newItem = { name: newItemValue.trim(), hidden: false };
    const updatedCfg = { ...cfg, [type]: [...cfg[type], newItem] };
    setCfg(updatedCfg);
    
    // Save immediately to the backend
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCfg)
    });
    
    if (res.ok) {
      setAddingItem(null);
      setNewItemValue('');
    } else {
      // Revert on error
      setCfg(cfg);
      alert('Failed to save new item');
    }
  }

  async function removeItem(type: 'clients' | 'campaigns' | 'publications', index: number) {
    const updatedCfg = { ...cfg, [type]: cfg[type].filter((_, i) => i !== index) };
    setCfg(updatedCfg);
    
    // Save immediately to the backend
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCfg)
    });
    
    if (!res.ok) {
      // Revert on error
      setCfg(cfg);
      alert('Failed to remove item');
    }
  }

  function startEditingItem(type: 'clients' | 'campaigns' | 'publications', index: number) {
    const item = cfg[type][index];
    setEditingItem({ type, index });
    setEditItemValue(item.name);
  }

  function cancelEditingItem() {
    setEditingItem(null);
    setEditItemValue('');
  }

  async function saveEditedItem() {
    if (!editingItem || !editItemValue.trim()) return;
    
    const { type, index } = editingItem;
    // Store a deep copy of the original config for proper rollback
    const originalCfg = { 
      ...cfg, 
      [type]: [...cfg[type].map(item => ({ ...item }))] 
    };
    const updatedItems = [...cfg[type]];
    updatedItems[index] = { ...updatedItems[index], name: editItemValue.trim() };
    const updatedCfg = { ...cfg, [type]: updatedItems };
    setCfg(updatedCfg);
    
    // Save immediately to the backend
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCfg)
    });
    
    if (res.ok) {
      setEditingItem(null);
      setEditItemValue('');
    } else {
      // Revert on error
      setCfg(originalCfg);
      alert('Failed to save edited item');
    }
  }

  async function verifyFolderAccess() {
    const folderUrl = cfg.driveSettings?.parentFolderUrl;
    if (!folderUrl) {
      alert('Please enter a folder URL first');
      return;
    }

    // Extract folder ID from URL
    const match = folderUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = match ? match[1] : null;
    
    if (!folderId) {
      alert('Invalid folder URL format');
      return;
    }

    setVerifying(true);
    setVerifyStatus(null);

    try {
      const res = await fetch(`/api/verify-folder?id=${folderId}`);
      const data = await res.json();
      setVerifyStatus(data);
    } catch (error) {
      setVerifyStatus({
        success: false,
        error: 'Failed to verify folder access',
        message: '❌ Verification failed'
      });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Notification Popup */}
      {popupNotification && (
        <NotificationPopup
          notification={popupNotification}
          adminId={adminId}
          onDismiss={() => setPopupNotification(null)}
        />
      )}

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotificationPanel}
        onClose={() => setShowNotificationPanel(false)}
        adminId={adminId}
      />

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Admin Configuration</h2>
          <button
            onClick={() => setShowNotificationPanel(true)}
            className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View updates and announcements"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {cfg.adminNotifications && cfg.adminNotifications.some(n => !n.dismissedBy?.includes(adminId)) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Clients</h3>
              <button className="btn btn-primary" onClick={() => startAddingItem('clients')}>+ Add</button>
            </div>
            <div className="space-y-2">
              {[...cfg.clients].sort((a, b) => a.name.localeCompare(b.name)).map((client, sortedIndex) => {
                const actualIndex = cfg.clients.findIndex(c => c.name === client.name);
                const isEditing = editingItem?.type === 'clients' && editingItem?.index === actualIndex;
                
                return (
                  <div key={sortedIndex} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border rounded mr-2"
                          value={editItemValue}
                          onChange={(e) => setEditItemValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditedItem();
                            if (e.key === 'Escape') cancelEditingItem();
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditedItem}
                            className="text-green-600 hover:text-green-700 p-1 rounded"
                            title="Save changes"
                            disabled={!editItemValue.trim()}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEditingItem}
                            className="text-gray-600 hover:text-gray-700 p-1 rounded"
                            title="Cancel"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={client.hidden ? 'text-gray-400 line-through' : ''}>{client.name}</span>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              const updatedClients = cfg.clients.map(c => 
                                c.name === client.name ? { ...c, hidden: !c.hidden } : c
                              );
                              const newCfg = { ...cfg, clients: updatedClients };
                              setCfg(newCfg);
                              
                              // Save immediately to the backend
                              const res = await fetch('/api/config', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newCfg)
                              });
                              
                              if (!res.ok) {
                                // Revert on error
                                setCfg(cfg);
                                alert('Failed to update visibility');
                              }
                            }}
                            className="text-gray-500 hover:text-gray-700 p-1 rounded"
                            title={client.hidden ? 'Show this client' : 'Hide this client'}
                          >
                            {client.hidden ? (
                              // Eye with slash (hidden)
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              // Eye (visible)
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-700 p-1 rounded" 
                            onClick={() => startEditingItem('clients', actualIndex)}
                            title="Edit client name"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button className="text-red-600 hover:text-red-700" onClick={() => removeItem('clients', actualIndex)}>Remove</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {addingItem === 'clients' && (
                <div className="flex items-center gap-2 bg-blue-50 p-2 rounded border">
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 border rounded"
                    placeholder="Enter new client name"
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNewItem('clients');
                      if (e.key === 'Escape') cancelAddingItem();
                    }}
                    autoFocus
                  />
                  <button 
                    className="btn btn-primary text-sm px-3 py-1" 
                    onClick={() => saveNewItem('clients')}
                    disabled={!newItemValue.trim()}
                  >
                    Save
                  </button>
                  <button 
                    className="btn btn-secondary text-sm px-3 py-1" 
                    onClick={cancelAddingItem}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Campaigns</h3>
              <button className="btn btn-primary" onClick={() => startAddingItem('campaigns')}>+ Add</button>
            </div>
            <div className="space-y-2">
              {[...cfg.campaigns].sort((a, b) => a.name.localeCompare(b.name)).map((campaign, sortedIndex) => {
                const actualIndex = cfg.campaigns.findIndex(c => c.name === campaign.name);
                const isEditing = editingItem?.type === 'campaigns' && editingItem?.index === actualIndex;
                
                return (
                  <div key={sortedIndex} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border rounded mr-2"
                          value={editItemValue}
                          onChange={(e) => setEditItemValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditedItem();
                            if (e.key === 'Escape') cancelEditingItem();
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditedItem}
                            className="text-green-600 hover:text-green-700 p-1 rounded"
                            title="Save changes"
                            disabled={!editItemValue.trim()}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEditingItem}
                            className="text-gray-600 hover:text-gray-700 p-1 rounded"
                            title="Cancel"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={campaign.hidden ? 'text-gray-400 line-through' : ''}>{campaign.name}</span>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              const updatedCampaigns = cfg.campaigns.map(c => 
                                c.name === campaign.name ? { ...c, hidden: !c.hidden } : c
                              );
                              const newCfg = { ...cfg, campaigns: updatedCampaigns };
                              setCfg(newCfg);
                              
                              // Save immediately to the backend
                              const res = await fetch('/api/config', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newCfg)
                              });
                              
                              if (!res.ok) {
                                // Revert on error
                                setCfg(cfg);
                                alert('Failed to update visibility');
                              }
                            }}
                            className="text-gray-500 hover:text-gray-700 p-1 rounded"
                            title={campaign.hidden ? 'Show this campaign' : 'Hide this campaign'}
                          >
                            {campaign.hidden ? (
                              // Eye with slash (hidden)
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              // Eye (visible)
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-700 p-1 rounded" 
                            onClick={() => startEditingItem('campaigns', actualIndex)}
                            title="Edit campaign name"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button className="text-red-600 hover:text-red-700" onClick={() => removeItem('campaigns', actualIndex)}>Remove</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {addingItem === 'campaigns' && (
                <div className="flex items-center gap-2 bg-blue-50 p-2 rounded border">
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 border rounded"
                    placeholder="Enter new campaign name"
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNewItem('campaigns');
                      if (e.key === 'Escape') cancelAddingItem();
                    }}
                    autoFocus
                  />
                  <button 
                    className="btn btn-primary text-sm px-3 py-1" 
                    onClick={() => saveNewItem('campaigns')}
                    disabled={!newItemValue.trim()}
                  >
                    Save
                  </button>
                  <button 
                    className="btn btn-secondary text-sm px-3 py-1" 
                    onClick={cancelAddingItem}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Publications</h3>
              <button className="btn btn-primary" onClick={() => startAddingItem('publications')}>+ Add</button>
            </div>
            <div className="space-y-2">
              {[...cfg.publications].sort((a, b) => a.name.localeCompare(b.name)).map((pub, sortedIndex) => {
                const actualIndex = cfg.publications.findIndex(p => p.name === pub.name);
                const isEditing = editingItem?.type === 'publications' && editingItem?.index === actualIndex;
                
                return (
                  <div key={sortedIndex} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border rounded mr-2"
                          value={editItemValue}
                          onChange={(e) => setEditItemValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditedItem();
                            if (e.key === 'Escape') cancelEditingItem();
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEditedItem}
                            className="text-green-600 hover:text-green-700 p-1 rounded"
                            title="Save changes"
                            disabled={!editItemValue.trim()}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEditingItem}
                            className="text-gray-600 hover:text-gray-700 p-1 rounded"
                            title="Cancel"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={pub.hidden ? 'text-gray-400 line-through' : ''}>{pub.name}</span>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              const updatedPublications = cfg.publications.map(p => 
                                p.name === pub.name ? { ...p, hidden: !p.hidden } : p
                              );
                              const newCfg = { ...cfg, publications: updatedPublications };
                              setCfg(newCfg);
                              
                              // Save immediately to the backend
                              const res = await fetch('/api/config', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(newCfg)
                              });
                              
                              if (!res.ok) {
                                // Revert on error
                                setCfg(cfg);
                                alert('Failed to update visibility');
                              }
                            }}
                            className="text-gray-500 hover:text-gray-700 p-1 rounded"
                            title={pub.hidden ? 'Show this publication' : 'Hide this publication'}
                          >
                            {pub.hidden ? (
                              // Eye with slash (hidden)
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                              </svg>
                            ) : (
                              // Eye (visible)
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-700 p-1 rounded" 
                            onClick={() => startEditingItem('publications', actualIndex)}
                            title="Edit publication name"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button className="text-red-600 hover:text-red-700" onClick={() => removeItem('publications', actualIndex)}>Remove</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {addingItem === 'publications' && (
                <div className="flex items-center gap-2 bg-blue-50 p-2 rounded border">
                  <input
                    type="text"
                    className="flex-1 px-2 py-1 border rounded"
                    placeholder="Enter new publication name"
                    value={newItemValue}
                    onChange={(e) => setNewItemValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNewItem('publications');
                      if (e.key === 'Escape') cancelAddingItem();
                    }}
                    autoFocus
                  />
                  <button 
                    className="btn btn-primary text-sm px-3 py-1" 
                    onClick={() => saveNewItem('publications')}
                    disabled={!newItemValue.trim()}
                  >
                    Save
                  </button>
                  <button 
                    className="btn btn-secondary text-sm px-3 py-1" 
                    onClick={cancelAddingItem}
                  >
                    Cancel
                  </button>
                </div>
              )}
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
                
                {/* Verify Folder Access Button */}
                <button
                  type="button"
                  className="mt-3 btn btn-secondary text-sm"
                  onClick={verifyFolderAccess}
                  disabled={verifying || !cfg.driveSettings?.parentFolderUrl}
                >
                  {verifying ? 'Verifying...' : '🔍 Verify Folder Access'}
                </button>

                {/* Save Drive Settings Button */}
                <button
                  type="button"
                  className="mt-3 ml-2 btn btn-primary text-sm"
                  onClick={async () => {
                    setStatus('Saving drive settings...');
                    const res = await fetch('/api/config', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(cfg)
                    });
                    if (res.ok) {
                      setStatus('Drive settings saved!');
                      setTimeout(() => setStatus(''), 2000);
                    } else {
                      setStatus('Save failed');
                    }
                  }}
                >
                  💾 Save Drive Settings
                </button>

                {/* Verification Results */}
                {verifyStatus && (
                  <div className={`mt-3 p-3 rounded text-xs ${
                    verifyStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`font-semibold mb-2 ${verifyStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                      {verifyStatus.message}
                    </p>
                    {verifyStatus.success && verifyStatus.folder && (
                      <div className="text-gray-700 space-y-1">
                        <p><strong>Folder Name:</strong> {verifyStatus.folder.name}</p>
                        <p><strong>Folder ID:</strong> {verifyStatus.folder.id}</p>
                        {verifyStatus.folder.isSharedDrive && (
                          <p className="text-blue-700"><strong>Type:</strong> Shared Drive (DriveId: {verifyStatus.folder.driveId})</p>
                        )}
                        {!verifyStatus.folder.isSharedDrive && (
                          <p><strong>Type:</strong> My Drive</p>
                        )}
                        <p><strong>Method:</strong> {verifyStatus.method}</p>
                      </div>
                    )}
                    {verifyStatus.recommendations && verifyStatus.recommendations.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold text-yellow-800 mb-1">Recommendations:</p>
                        <ul className="list-disc list-inside text-yellow-700 space-y-1">
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
