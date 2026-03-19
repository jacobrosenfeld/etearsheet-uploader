'use client';
import { useState, useEffect, useRef, useMemo } from 'react';

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

// Chunk size must stay under Vercel's 4.5MB limit (3MB server-side cap with overhead)
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
const LARGE_FILE_WARNING_THRESHOLD = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (Google Drive's per-file limit)
const CHUNK_MAX_RETRIES = 3;

function todayISO(): string {
  return new Date().toISOString().substring(0, 10);
}

async function uploadChunkWithRetry(
  formData: FormData,
  signal: AbortSignal,
  chunkIndex: number
): Promise<Response> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 0; attempt <= CHUNK_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
    try {
      const res = await fetch('/api/upload/proxy', { method: 'POST', body: formData, signal });
      if (res.status === 410) {
        throw new Error('Upload session expired. Please try uploading again.');
      }
      if (res.ok) return res;
      const err = await res.json().catch(() => ({}));
      lastError = new Error(err.error || `Chunk ${chunkIndex + 1} failed (${res.status})`);
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError;
}

export default function HomePage() {
  const [cfg, setCfg] = useState<PortalConfig | null>(null);
  const [pub, setPub] = useState('');
  const [client, setClient] = useState('');
  const [campaign, setCampaign] = useState('');
  const [date, setDate] = useState(todayISO());
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setCfg(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-dismiss success message after 8 seconds
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setStatus(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const estimatedTimeRemaining = useMemo(() => {
    if (!uploadStartTime || uploadProgress === 0) return null;
    const elapsed = Date.now() - uploadStartTime;
    const rate = uploadProgress / elapsed;
    const remaining = (100 - uploadProgress) / rate;
    return Math.round(remaining / 1000);
  }, [uploadStartTime, uploadProgress]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  };

  function cancelUpload() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus('');
    setUploadProgress(0);
    setUploadStartTime(null);
  }

  function resetForNextUpload() {
    setStatus('');
    setFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function performUpload() {
    if (!file || !pub || !client || !campaign) return;

    if (file.size > MAX_FILE_SIZE) {
      setStatus(`error:File is too large (${formatFileSize(file.size)}). Maximum size is 5 GB.`);
      return;
    }

    setStatus('Uploading...');
    setUploadProgress(0);
    setUploadStartTime(Date.now());

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Step 1: Initiate resumable upload session
      const initiateRes = await fetch('/api/upload/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publication: pub,
          client,
          campaign,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          date
        }),
        signal: abortController.signal
      });

      if (!initiateRes.ok) {
        const error = await initiateRes.json();
        throw new Error(error.error || 'Failed to initiate upload');
      }

      const { uploadUrl } = await initiateRes.json();

      // Step 2: Upload file in chunks through proxy
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let uploadedBytes = 0;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const isLastChunk = chunkIndex === totalChunks - 1;

        const chunkFormData = new FormData();
        chunkFormData.append('uploadUrl', uploadUrl);
        chunkFormData.append('chunk', chunk);
        chunkFormData.append('chunkIndex', chunkIndex.toString());
        chunkFormData.append('totalChunks', totalChunks.toString());
        chunkFormData.append('startByte', start.toString());
        chunkFormData.append('endByte', (end - 1).toString());
        chunkFormData.append('totalSize', file.size.toString());

        const chunkResponse = await uploadChunkWithRetry(
          chunkFormData,
          abortController.signal,
          chunkIndex
        );

        const chunkResult = await chunkResponse.json();
        uploadedBytes += chunk.size;
        setUploadProgress(Math.round((uploadedBytes / file.size) * 100));

        if (isLastChunk && chunkResult.complete && chunkResult.file) {
          setUploadProgress(100);
          setStatus('success');
          setUploadStartTime(null);
          abortControllerRef.current = null;
          return;
        }
      }

      setUploadProgress(100);
      setStatus('success');
      setUploadStartTime(null);
      abortControllerRef.current = null;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled — status already reset by cancelUpload()
        return;
      }
      setStatus(`error:${error.message || 'Upload failed'}`);
      setUploadProgress(0);
      setUploadStartTime(null);
      abortControllerRef.current = null;
    }
  }

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    await performUpload();
  }

  if (loading) return <div className="card">Loading configuration...</div>;
  if (!cfg) return <div className="card">No configuration available</div>;

  const isUploading = status === 'Uploading...';
  const isSuccess = status === 'success';
  const isError = status.startsWith('error:');

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h2 className="text-xl font-semibold">Upload a File</h2>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <strong>📁 Files will be organized in Google Drive:</strong><br/>
            {cfg.driveSettings?.rootFolderName || 'JJA eTearsheets'} → Client → Campaign → Publication
          </div>
        </div>

        <form onSubmit={doUpload} className="grid gap-4">
          <div>
            <label className="label">Publication</label>
            <select className="input" value={pub} onChange={(e) => setPub(e.target.value)}>
              <option value="">Select publication…</option>
              {[...cfg.publications].filter(p => !p.hidden).sort((a, b) => a.name.localeCompare(b.name)).map(p =>
                <option key={p.name} value={p.name}>{p.name}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">Client</label>
            <select className="input" value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">Select client…</option>
              {[...cfg.clients].filter(c => !c.hidden).sort((a, b) => a.name.localeCompare(b.name)).map(c =>
                <option key={c.name} value={c.name}>{c.name}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">Campaign</label>
            <select className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)}>
              <option value="">Select campaign…</option>
              {[...cfg.campaigns].filter(c => !c.hidden).sort((a, b) => a.name.localeCompare(b.name)).map(c =>
                <option key={c.name} value={c.name}>{c.name}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">Publication Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">File</label>
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                transition-all duration-200 ease-in-out
                ${isDragging
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}
              `}
            >
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="space-y-2">
                {file ? (
                  <>
                    <div className="text-4xl" role="img" aria-label="Document file selected">📄</div>
                    <div className="text-sm font-semibold text-gray-700">{file.name}</div>
                    <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                    >
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-2" role="img" aria-label={isDragging ? 'Drop file here' : 'Drag and drop file'}>
                      {isDragging ? '📥' : '📎'}
                    </div>
                    <div className="text-base font-semibold text-gray-700">
                      {isDragging ? 'Drop file here' : 'Drag & drop file here'}
                    </div>
                    <div className="text-sm text-gray-500">or click to browse</div>
                  </>
                )}
              </div>
            </div>
            {file && file.size > LARGE_FILE_WARNING_THRESHOLD && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                ⚠️ Large file ({formatFileSize(file.size)}) — upload may take several minutes.
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button className="btn btn-primary flex-1" type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading…' : 'Upload'}
            </button>
            {isUploading && (
              <button type="button" className="btn btn-secondary" onClick={cancelUpload}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Upload progress */}
        {isUploading && (
          <div className="space-y-3">
            <div className="relative w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
              <div
                className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 h-full transition-all duration-500 ease-out flex items-center justify-center"
                style={{ width: `${uploadProgress}%` }}
              >
                <span className="relative z-10 text-sm font-bold text-white drop-shadow-md">
                  {uploadProgress}%
                </span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl motion-safe:animate-pulse" role="img" aria-label="Upload in progress">⏳</div>
                  <div>
                    <div className="text-sm font-semibold text-blue-900">Uploading {file?.name}</div>
                    {file && <div className="text-xs text-blue-600">{formatFileSize(file.size)}</div>}
                  </div>
                </div>
                {uploadProgress > 0 && estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-blue-500 font-medium">Time remaining</div>
                    <div className="text-lg font-bold text-blue-700">{estimatedTimeRemaining}s</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success state */}
        {isSuccess && (
          <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎉</span>
                <div>
                  <div className="text-base font-bold text-green-700">Upload Successful!</div>
                  <div className="text-sm text-green-600">Your file has been uploaded to Google Drive.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForNextUpload}
                className="btn btn-primary text-sm whitespace-nowrap"
              >
                Upload another
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start justify-between gap-3">
            <div className="text-sm text-red-600">
              ❌ {status.replace('error:', '')}
            </div>
            <button
              type="button"
              onClick={performUpload}
              className="btn btn-secondary text-sm whitespace-nowrap"
              disabled={!file || !pub || !client || !campaign}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Folder structure preview */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Folder Structure Preview</h3>
        <div className="text-xs text-neutral-500 font-mono bg-gray-50 p-3 rounded">
          📁 {cfg.driveSettings?.rootFolderName || 'JJA eTearsheets'}<br/>
          &nbsp;&nbsp;📁 {client || <em>client</em>}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;📁 {campaign || <em>campaign</em>}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📁 {pub || <em>publication</em>}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📄 {pub
            ? `${pub}_${date}_${file?.name || 'filename.pdf'}`
            : <em>publication_YYYY-MM-DD_filename.pdf</em>
          }
        </div>
      </div>
    </div>
  );
}
