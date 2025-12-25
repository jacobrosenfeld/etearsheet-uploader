# Large File Upload Configuration

## Overview
This document describes the direct-to-Google-Drive upload architecture that bypasses Vercel's payload limits entirely.

## Architecture

### Direct Client-to-Google-Drive Upload
Files are uploaded **directly from the browser to Google Drive**, completely bypassing Vercel's serverless functions. This eliminates the ~4.5MB Vercel payload limit.

#### Upload Flow
1. **Client → Backend**: Request upload session (only metadata, ~1KB)
2. **Backend → Google Drive**: Create resumable upload session
3. **Backend → Client**: Return upload URL
4. **Client → Google Drive**: Upload file directly (no size limit)
5. **Client → Backend**: Notify completion (only file ID)

#### Why This Works
- **No file data through Vercel**: Only JSON metadata passes through our API routes
- **No payload limits**: Google Drive handles the actual file upload
- **Progress tracking**: XMLHttpRequest monitors upload directly to Google Drive
- **True resumable uploads**: Uses Google Drive's native resumable upload API

## API Endpoints

### `/api/upload/initiate` (POST)
Creates a Google Drive resumable upload session.

**Request:**
```json
{
  "publication": "string",
  "client": "string",
  "campaign": "string",
  "fileName": "string",
  "fileSize": number,
  "mimeType": "string"
}
```

**Response:**
```json
{
  "uploadUrl": "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=..."
}
```

### `/api/upload/complete` (POST)
Verifies the upload completed successfully.

**Request:**
```json
{
  "fileId": "string"
}
```

**Response:**
```json
{
  "ok": true,
  "file": {
    "id": "string",
    "name": "string",
    "size": "string",
    "mimeType": "string"
  }
}
```

### `/api/upload` (POST) - DEPRECATED
⚠️ Limited to ~4.5MB due to Vercel payload limits. Use `/api/upload/initiate` instead.

## Configuration Constants

### Client-Side (`app/page.tsx`)
```typescript
UPLOAD_TIMEOUT_MS = 300000  // 5 minutes
LARGE_FILE_WARNING_THRESHOLD = 100 * 1024 * 1024  // 100MB
```

### Body Size Limit (`next.config.js`)
```typescript
bodySizeLimit: '5mb'  // Only for metadata operations, not file uploads
```

## Upload Strategy

### All File Sizes
- Uses Google Drive's resumable upload API
- Progress tracking enabled
- Direct browser-to-Google-Drive upload
- **No size limit** (constrained only by Google Drive's 5TB/file limit)
- Client shows progress bar and ETA

## User Experience

### Before Upload
- File size displayed in human-readable format (KB/MB/GB)
- Warning shown for files >100MB
- Upload button shows selected file name

### During Upload
- Progress bar with percentage (0-100%)
- Estimated time remaining
- Upload button disabled
- Status message with file name

### After Upload
- Success message with celebration emoji
- Form automatically reset
- Ready for next upload

### On Error
- Clear error message explaining the issue
- Automatic retry (up to 3 attempts)
- User can manually retry by clicking upload again

## Error Messages

### Network Error
```
Network error - please check your connection and try again
```

### Timeout
```
Upload timed out - file may be too large or connection too slow. 
Please try again with a smaller file or better connection.
```

### Server Error
```
Upload failed (Status 500)
[Specific error from server if available]
```

## Retry Logic

### Exponential Backoff
- Attempt 1: Immediate
- Attempt 2: Wait 1-2 seconds
- Attempt 3: Wait 2-4 seconds
- Attempt 4: Wait 4-8 seconds

### Smart Retry
- Skips retry on permission errors (403, 404)
- Only retries on transient failures
- Logs all retry attempts for debugging

## Testing Recommendations

### Test File Sizes
1. Small file: 1MB
2. Medium file: 10MB
3. Large file: 100MB (should show warning)
4. Very large file: 1GB+ (tests Vercel bypass - no limit!)

### Test Scenarios
1. **Normal upload**: Select file, click upload, verify success
2. **Progress tracking**: Upload 100MB file, verify progress bar updates
3. **Cancel/refresh**: Start upload, refresh page (Google Drive may have partial upload)
4. **Network interruption**: Disconnect WiFi mid-upload (Google Drive handles resumption)
5. **Multiple uploads**: Upload several files in sequence
6. **Vercel bypass verification**: Upload 10MB file, check network tab - file should go directly to googleapis.com

### Expected Timings
- 1MB file: <5 seconds
- 10MB file: 10-30 seconds
- 100MB file: 1-3 minutes
- 1GB file: 10-30 minutes
(Varies based on connection speed)

## Architecture Verification

### How to Verify Vercel Bypass
1. Open browser DevTools → Network tab
2. Start file upload
3. Look for requests:
   - ✅ `POST /api/upload/initiate` (small, <1KB)
   - ✅ `PUT https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable...` (large, full file size)
   - ✅ `POST /api/upload/complete` (small, <1KB)
   - ❌ No `POST /api/upload` with large payload

### File Flow Confirmation
```
Browser                    Vercel API              Google Drive
   |                          |                         |
   |-- metadata (1KB) ------->|                         |
   |                          |-- create session ------>|
   |<------ upload URL --------|<----- session URL -----|
   |                          |                         |
   |------------- file data (direct) ----------------->|
   |                          |                         |
   |-- file ID (1KB) -------->|                         |
   |                          |-- verify ------------>|
   |<------ success -----------|<----- metadata --------|
```

## Future Enhancements

### Chunked Uploads (for >5GB files)
Consider implementing:
1. Client-side chunking (256MB chunks)
2. Parallel chunk uploads
3. Chunk-level resume on failure
4. Pause/resume functionality
5. Background upload queue

### Additional Features
1. Upload queue for multiple files
2. Drag-and-drop multiple files
3. Upload history/log
4. Email notification on completion
5. Integration with cloud storage besides Google Drive

## Troubleshooting

### Upload Fails Immediately
- Check Google Service Account credentials
- Verify domain-wide delegation is configured
- Check service account has access to target folder

### Upload Times Out After 5 Minutes
- File may be too large (>500MB)
- Connection may be too slow
- Consider splitting file or compressing
- Check server logs for specific error

### Progress Bar Stuck
- May be server-side processing (folder creation)
- Check browser console for errors
- Refresh page and try again

### Retries Keep Failing
- Check network connection
- Verify Google Drive has storage space
- Check service account permissions
- Review server logs for detailed errors

## Monitoring

### Server-Side Logs
```
[uploadIntoPath] Uploading file: example.pdf, size: 10485760 bytes
[uploadIntoPath] Using resumable upload for large file
[retryWithBackoff] Upload large file: example.pdf - Attempt 1/4
[uploadLargeFileResumable] Starting resumable upload for example.pdf
[uploadLargeFileResumable] Upload progress: 25.50%
[uploadLargeFileResumable] Upload progress: 51.00%
[uploadLargeFileResumable] Upload progress: 76.50%
[uploadLargeFileResumable] Upload completed: 1a2b3c4d5e6f
```

### Client-Side Console
Check browser console for:
- Progress events (if enabled in dev mode)
- Network errors
- Server response errors

## Security Considerations

### File Size Limits
- Maximum 500MB per file (server enforced)
- No limit on number of uploads
- No limit on total storage (depends on Google account)

### Timeout Protection
- Server timeout: 5 minutes
- Client timeout: 5 minutes
- Prevents hanging requests

### Retry Limits
- Maximum 3 retry attempts
- Prevents infinite retry loops
- Exponential backoff prevents server overload

## Performance Tips

### For Faster Uploads
1. Use wired connection instead of WiFi
2. Upload during off-peak hours
3. Compress files before uploading (if applicable)
4. Close other bandwidth-heavy applications
5. Upload directly from local drive (not network drive)

### For Reliability
1. Don't close browser during upload
2. Keep computer awake/plugged in
3. Avoid switching networks mid-upload
4. Use latest browser version
5. Clear browser cache if experiencing issues
