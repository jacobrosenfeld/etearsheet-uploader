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

// 4MB chunks: bodySizeLimit in next.config.js only applies to Server Actions.
// API routes are limited by Vercel's 4.5MB platform limit; 4MB data + ~2KB form overhead is safe.
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
const LARGE_FILE_WARNING_THRESHOLD = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (Google Drive's per-file limit)
const CHUNK_MAX_RETRIES = 3;
const TIMING_HISTORY = 5; // number of recent chunks used for rolling ETA

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Rolling chunk durations (ms) for ETA and interpolation
  const chunkTimingsRef = useRef<number[]>([]);
  // Interpolation state: where we were and what this chunk contributes
  const interpolationRef = useRef<{
    chunkStart: number;
    progressAtChunkStart: number;
    chunkContribution: number;
  } | null>(null);

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

  // Smooth progress interpolation: runs every 150ms while uploading,
  // advances the bar based on how long the current chunk is taking vs recent average.
  useEffect(() => {
    if (status !== 'Uploading...') return;
    const interval = setInterval(() => {
      const interp = interpolationRef.current;
      const timings = chunkTimingsRef.current;
      if (!interp || timings.length === 0) return;
      const avgDuration = timings.reduce((a, b) => a + b, 0) / timings.length;
      const elapsed = Date.now() - interp.chunkStart;
      // Cap at 92% of the chunk's contribution so we never overshoot before the real update
      const fraction = Math.min(elapsed / avgDuration, 0.92);
      const interpolated = interp.progressAtChunkStart + fraction * interp.chunkContribution;
      setUploadProgress(prev => Math.max(prev, Math.min(Math.floor(interpolated), 99)));
    }, 150);
    return () => clearInterval(interval);
  }, [status]);

  // ETA using rolling average of recent chunk durations
  const estimatedTimeRemaining = useMemo(() => {
    if (status !== 'Uploading...' || uploadProgress === 0) return null;
    const timings = chunkTimingsRef.current;
    if (timings.length === 0) return null;
    const avgChunkDuration = timings.reduce((a, b) => a + b, 0) / timings.length;
    const progressPerChunk = file ? (CHUNK_SIZE / file.size) * 100 : 4;
    const chunksRemaining = Math.ceil(Math.max(0, 100 - uploadProgress) / progressPerChunk);
    return Math.round((chunksRemaining * avgChunkDuration) / 1000);
  }, [uploadProgress, status, file]);

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
    interpolationRef.current = null;
    chunkTimingsRef.current = [];
    setStatus('');
    setUploadProgress(0);
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
    chunkTimingsRef.current = [];
    interpolationRef.current = null;

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

        // Set interpolation baseline for smooth progress within this chunk
        const chunkContribution = (chunk.size / file.size) * 100;
        interpolationRef.current = {
          chunkStart: Date.now(),
          progressAtChunkStart: Math.round((uploadedBytes / file.size) * 100),
          chunkContribution,
        };

        const chunkFormData = new FormData();
        chunkFormData.append('uploadUrl', uploadUrl);
        chunkFormData.append('chunk', chunk);
        chunkFormData.append('chunkIndex', chunkIndex.toString());
        chunkFormData.append('totalChunks', totalChunks.toString());
        chunkFormData.append('startByte', start.toString());
        chunkFormData.append('endByte', (end - 1).toString());
        chunkFormData.append('totalSize', file.size.toString());

        const chunkStart = Date.now();
        const chunkResponse = await uploadChunkWithRetry(
          chunkFormData,
          abortController.signal,
          chunkIndex
        );
        // Record timing for rolling ETA (keep last TIMING_HISTORY entries)
        const chunkDuration = Date.now() - chunkStart;
        chunkTimingsRef.current = [...chunkTimingsRef.current.slice(-(TIMING_HISTORY - 1)), chunkDuration];

        const chunkResult = await chunkResponse.json();
        uploadedBytes += chunk.size;
        // Snap to the real value at chunk boundaries
        setUploadProgress(Math.round((uploadedBytes / file.size) * 100));

        if (isLastChunk && chunkResult.complete && chunkResult.file) {
          setUploadProgress(100);
          setStatus('success');
          interpolationRef.current = null;
          abortControllerRef.current = null;
          return;
        }
      }

      setUploadProgress(100);
      setStatus('success');
      interpolationRef.current = null;
      abortControllerRef.current = null;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled — status already reset by cancelUpload()
        return;
      }
      setStatus(`error:${error.message || 'Upload failed'}`);
      setUploadProgress(0);
      interpolationRef.current = null;
      abortControllerRef.current = null;
    }
  }

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    await performUpload();
  }

  if (loading) return <div className="card text-slate-500">Loading configuration…</div>;
  if (!cfg) return <div className="card text-slate-500">No configuration available</div>;

  const isUploading = status === 'Uploading...';
  const isSuccess = status === 'success';
  const isError = status.startsWith('error:');

  return (
    <div className="space-y-5">
      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Upload a Tearsheet</h2>
        </div>

        {/* Folder destination info */}
        <div className="flex items-start gap-3 bg-brand/5 border border-brand/15 rounded-xl p-3.5">
          <span className="text-brand mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </span>
          <div className="text-sm text-brand/90">
            <span className="font-semibold">Files will be organized in Google Drive:</span>{' '}
            {cfg.driveSettings?.rootFolderName || 'JJA eTearsheets'} → Client → Campaign → Publication
          </div>
        </div>

        <form onSubmit={doUpload} className="space-y-4">
          {/* 2-column grid for metadata fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          {/* File drop zone */}
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
                  ? 'border-brand bg-brand/5 scale-[1.01]'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}
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
                    <div className="flex justify-center">
                      <svg className="w-10 h-10 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-slate-700">{file.name}</div>
                    <div className="text-xs text-slate-400">{formatFileSize(file.size)}</div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="mt-1 text-xs text-brand-secondary hover:text-brand-secondary-hover underline"
                    >
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <svg className={`w-10 h-10 transition-colors ${isDragging ? 'text-brand' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="text-sm font-semibold text-slate-600">
                      {isDragging ? 'Drop file here' : 'Drag & drop file here'}
                    </div>
                    <div className="text-xs text-slate-400">or click to browse</div>
                  </>
                )}
              </div>
            </div>
            {file && file.size > LARGE_FILE_WARNING_THRESHOLD && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                ⚠️ Large file ({formatFileSize(file.size)}) — upload may take several minutes.
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button className="btn-primary flex-1 justify-center" type="submit" disabled={isUploading}>
              {isUploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading…
                </>
              ) : 'Upload'}
            </button>
            {isUploading && (
              <button type="button" className="btn-secondary" onClick={cancelUpload}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Upload progress */}
        {isUploading && (
          <div className="space-y-3">
            <div className="relative w-full bg-slate-100 rounded-full h-7 overflow-hidden">
              <div
                className="absolute inset-0 bg-gradient-to-r from-brand via-brand-hover to-brand h-full transition-all duration-500 ease-out flex items-center justify-center"
                style={{ width: `${uploadProgress}%` }}
              >
                <span className="relative z-10 text-xs font-bold text-white drop-shadow">
                  {uploadProgress}%
                </span>
              </div>
            </div>
            <div className="bg-brand/5 border border-brand/15 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-brand motion-safe:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div>
                    <div className="text-sm font-semibold text-brand">Uploading {file?.name}</div>
                    {file && <div className="text-xs text-brand/60">{formatFileSize(file.size)}</div>}
                  </div>
                </div>
                {uploadProgress > 0 && estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-brand/60 font-medium">Est. remaining</div>
                    <div className="text-base font-bold text-brand">{estimatedTimeRemaining}s</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success state */}
        {isSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-800">Upload Successful!</div>
                  <div className="text-xs text-emerald-600">Your file has been saved to Google Drive.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForNextUpload}
                className="btn-primary text-sm whitespace-nowrap"
              >
                Upload another
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-red-700">{status.replace('error:', '')}</div>
            </div>
            <button
              type="button"
              onClick={performUpload}
              className="btn-secondary text-sm whitespace-nowrap"
              disabled={!file || !pub || !client || !campaign}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Folder structure preview */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Destination Preview</h3>
        <div className="text-xs text-slate-500 font-mono bg-slate-50 border border-slate-100 p-3.5 rounded-xl leading-relaxed">
          <span className="text-brand">📁</span> {cfg.driveSettings?.rootFolderName || 'JJA eTearsheets'}<br/>
          &nbsp;&nbsp;<span className="text-brand">📁</span> {client || <em className="text-slate-300">client</em>}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-brand">📁</span> {campaign || <em className="text-slate-300">campaign</em>}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-brand">📁</span> {pub || <em className="text-slate-300">publication</em>}<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400">📄</span> {pub
            ? `${pub}_${date}_${file?.name || 'filename.pdf'}`
            : <em className="text-slate-300">publication_YYYY-MM-DD_filename.pdf</em>
          }
        </div>
      </div>
    </div>
  );
}
