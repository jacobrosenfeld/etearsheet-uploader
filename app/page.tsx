'use client';
import { useState, useEffect } from 'react';

type PortalConfig = {
  clients: Array<{ name: string; hidden?: boolean }>;
  campaigns: Array<{ name: string; hidden?: boolean }>;
  publications: Array<{ name: string; hidden?: boolean }>;
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);

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

  // Calculate estimated time remaining
  const getEstimatedTimeRemaining = () => {
    if (!uploadStartTime || uploadProgress === 0) return null;
    const elapsed = Date.now() - uploadStartTime;
    const rate = uploadProgress / elapsed; // progress per ms
    const remaining = (100 - uploadProgress) / rate;
    return Math.round(remaining / 1000); // convert to seconds
  };

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !pub || !client || !campaign) return;
    
    setStatus('Uploading...');
    setUploadProgress(0);
    setUploadStartTime(Date.now());
    
    const form = new FormData();
    form.set('publication', pub);
    form.set('client', client);
    form.set('campaign', campaign);
    form.set('file', file);
    
    try {
      // Use XMLHttpRequest for progress tracking
      const uploadWithProgress = new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(Math.round(percentComplete));
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.response, {
              status: xhr.status,
              statusText: xhr.statusText
            }));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('timeout', () => {
          reject(new Error('Upload timed out'));
        });
        
        xhr.open('POST', '/api/upload');
        xhr.timeout = 300000; // 5 minutes timeout
        xhr.send(form);
      });
      
      const res = await uploadWithProgress;
      
      if (res.ok) {
        setUploadProgress(100);
        setStatus('success');
        // Reset form
        setFile(null);
        setUploadStartTime(null);
      } else {
        const error = await res.json();
        setStatus(`error:${error.error || 'Unknown error'}`);
        setUploadProgress(0);
        setUploadStartTime(null);
      }
    } catch (error: any) {
      setStatus(`error:${error.message || 'Upload failed'}`);
      setUploadProgress(0);
      setUploadStartTime(null);
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
              {[...cfg.publications].filter(p => !p.hidden).sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Client</label>
            <select className="input" value={client} onChange={(e)=>setClient(e.target.value)}>
              <option value="">Select client…</option>
              {[...cfg.clients].filter(c => !c.hidden).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Campaign</label>
            <select className="input" value={campaign} onChange={(e)=>setCampaign(e.target.value)}>
              <option value="">Select campaign…</option>
              {[...cfg.campaigns].filter(c => !c.hidden).sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">File</label>
            <input className="input" type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
            {file && (
              <div className="text-xs text-gray-600 mt-1">
                Selected: {file.name} ({formatFileSize(file.size)})
              </div>
            )}
          </div>
          <button className="btn btn-primary" type="submit" disabled={status === 'Uploading...'}>
            {status === 'Uploading...' ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        
        {/* Upload Progress Bar */}
        {status === 'Uploading...' && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300 flex items-center justify-center"
                style={{ width: `${uploadProgress}%` }}
              >
                {uploadProgress > 10 && (
                  <span className="text-xs font-semibold text-white">{uploadProgress}%</span>
                )}
              </div>
            </div>
            <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span>⏳ Uploading {file?.name}...</span>
                {uploadProgress > 0 && getEstimatedTimeRemaining() && (
                  <span className="text-xs text-blue-500">
                    ~{getEstimatedTimeRemaining()}s remaining
                  </span>
                )}
              </div>
            </div>
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