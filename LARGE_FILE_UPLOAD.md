# Large File Upload Configuration

## Overview
This document describes the large file upload improvements implemented to handle files up to 500MB reliably.

## Configuration Constants

### Server-Side (`lib/google.ts`)
```typescript
RESUMABLE_UPLOAD_THRESHOLD = 5 * 1024 * 1024  // 5MB
MAX_UPLOAD_RETRIES = 3
INITIAL_RETRY_DELAY_MS = 1000  // Doubles each retry
```

### Client-Side (`app/page.tsx`)
```typescript
UPLOAD_TIMEOUT_MS = 300000  // 5 minutes
LARGE_FILE_WARNING_THRESHOLD = 100 * 1024 * 1024  // 100MB
```

### Route Configuration (`app/api/upload/route.ts`)
```typescript
maxDuration = 300  // 5 minutes (Vercel limit)
```

### Body Size Limit (`next.config.js`)
```typescript
bodySizeLimit: '500mb'
```

## Upload Strategy

### Small Files (<5MB)
- Uses simple upload method
- Single request to Google Drive API
- Fast and efficient for typical files
- Retries up to 3 times on failure

### Large Files (5MB-500MB)
- Uses resumable upload method
- Progress tracking enabled
- Server-side logging for debugging
- Retries up to 3 times on failure
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
1. Small file: 1MB (should use simple upload)
2. Medium file: 10MB (should use resumable upload)
3. Large file: 100MB (should show warning + resumable)
4. Very large file: 400MB (should work but take time)

### Test Scenarios
1. **Normal upload**: Select file, click upload, verify success
2. **Progress tracking**: Upload 100MB file, verify progress bar updates
3. **Cancel/refresh**: Start upload, refresh page (file should be orphaned but no corruption)
4. **Network interruption**: Disconnect WiFi mid-upload, verify retry works
5. **Multiple uploads**: Upload several files in sequence

### Expected Timings
- 1MB file: <5 seconds
- 10MB file: 10-30 seconds
- 100MB file: 1-3 minutes
- 400MB file: 3-8 minutes
(Varies based on connection speed)

## Future Enhancements

### For Files >500MB
Consider implementing:
1. Chunked file reading (avoid loading entire file in memory)
2. True resumable uploads with session management
3. Parallel chunk uploads
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
