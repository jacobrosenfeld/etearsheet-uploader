import { google } from 'googleapis';
import { readConfig, writeConfig } from './configStore';
import { Readable } from 'stream';

// Extract folder ID from Google Drive URL
function extractFolderIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  console.log('[extractFolderIdFromUrl] Input URL:', url);
  
  // Match patterns like:
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  const folderId = match ? match[1] : null;
  
  console.log('[extractFolderIdFromUrl] Extracted ID:', folderId);
  return folderId;
}

// Initialize Google Drive client with Service Account and Domain-Wide Delegation
function getDriveClient() {
  // Parse service account credentials from environment variable
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const impersonateUser = process.env.GOOGLE_IMPERSONATE_USER; // Email of user to impersonate
  
  if (!serviceAccountEmail || !serviceAccountKey) {
    throw new Error('Missing Google Service Account credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in environment variables.');
  }

  if (!impersonateUser) {
    throw new Error('Missing GOOGLE_IMPERSONATE_USER environment variable. Set this to the email address of a user in your domain (e.g., admin@yourdomain.com).');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: serviceAccountKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
    // Impersonate a user to use their storage quota
    clientOptions: {
      subject: impersonateUser,
    },
  });

  return google.drive({ version: 'v3', auth });
}

// Find or create a folder in Google Drive
async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const drive = getDriveClient();

  // Search for existing folder
  const query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;
  
  const searchResult = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (searchResult.data.files && searchResult.data.files.length > 0) {
    return searchResult.data.files[0].id!;
  }

  // Create new folder
  const createResult = await drive.files.create({
    requestBody: {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    },
    fields: 'id',
    supportsAllDrives: true
  });

  return createResult.data.id!;
}

// Create the folder structure: Root → Client → Campaign → Publication
async function ensureFolderPath(opts: { client: string; campaign: string; publication: string }): Promise<string> {
  const config = await readConfig();
  
  console.log('[ensureFolderPath] Config loaded:', JSON.stringify(config.driveSettings, null, 2));
  
  let rootFolderId: string | undefined;
  let rootFolderName = 'JJA eTearsheets';
  
  // Check if there's a custom parent folder URL
  if (config.driveSettings?.parentFolderUrl) {
    console.log('[ensureFolderPath] Found parentFolderUrl:', config.driveSettings.parentFolderUrl);
    const customFolderId = extractFolderIdFromUrl(config.driveSettings.parentFolderUrl);
    console.log('[ensureFolderPath] Extracted folder ID:', customFolderId);
    if (customFolderId) {
      // Verify the folder exists and get its name
      const drive = getDriveClient();
      try {
        // First, try to get the folder with full shared drive support
        let folderInfo;
        try {
          folderInfo = await drive.files.get({
            fileId: customFolderId,
            fields: 'id, name, mimeType, driveId',
            supportsAllDrives: true
          });
          console.log('[ensureFolderPath] Folder found:', folderInfo.data);
          if (folderInfo.data.driveId) {
            console.log('[ensureFolderPath] This is a Shared Drive folder. DriveId:', folderInfo.data.driveId);
          }
        } catch (firstError: any) {
          // If first attempt fails, log and throw
          console.log('[ensureFolderPath] Could not access folder:', firstError.message);
          throw firstError;
        }
        
        // Verify it's actually a folder
        if (folderInfo.data.mimeType !== 'application/vnd.google-apps.folder') {
          console.error('[ensureFolderPath] ID is not a folder:', folderInfo.data.mimeType);
          throw new Error('The provided ID is not a folder');
        }
        
        if (folderInfo.data.id) {
          rootFolderId = folderInfo.data.id;
          rootFolderName = folderInfo.data.name || rootFolderName;
          
          console.log('[ensureFolderPath] Custom folder verified:', rootFolderName, rootFolderId);
          
          // Update config with custom folder info
          const updatedConfig = {
            ...config,
            driveSettings: {
              ...config.driveSettings,
              rootFolderId,
              rootFolderName,
              isConfigured: true
            }
          };
          await writeConfig(updatedConfig);
          console.log('[ensureFolderPath] Config updated with custom folder');
        }
      } catch (error: any) {
        console.error('[ensureFolderPath] Error accessing custom parent folder:', error);
        // If it's a 404, the service account doesn't have access to the folder
        if (error?.code === 404 || error?.status === 404) {
          console.error('[ensureFolderPath] Folder not found even though shared — possible Shared Drive mismatch.');
          console.error('[ensureFolderPath] Folder ID:', customFolderId);
          console.error('[ensureFolderPath] Service account email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
          console.error('[ensureFolderPath] If this is a Shared Drive folder, make sure:');
          console.error('[ensureFolderPath]   1. The folder is shared with the service account');
          console.error('[ensureFolderPath]   2. GOOGLE_SHARED_DRIVE_ID is set (if needed)');
          console.error('[ensureFolderPath]   3. The service account has domain-wide delegation enabled');
        }
        // Fall back to creating default folder
        rootFolderId = undefined;
      }
    }
  }
  
  // If no custom folder URL was provided, check if we have a cached rootFolderId
  if (!rootFolderId && config.driveSettings?.rootFolderId) {
    rootFolderId = config.driveSettings.rootFolderId;
    rootFolderName = config.driveSettings.rootFolderName || rootFolderName;
  }
  
  // If still no root folder, create default
  if (!rootFolderId) {
    console.log('[ensureFolderPath] No custom folder, creating default');
    rootFolderId = await findOrCreateFolder('JJA eTearsheets');
    
    // Update config with root folder ID
    const updatedConfig = {
      ...config,
      driveSettings: {
        ...config.driveSettings,
        rootFolderId,
        isConfigured: true,
        rootFolderName: 'JJA eTearsheets'
      }
    };
    await writeConfig(updatedConfig);
  }

  console.log('[ensureFolderPath] Using root folder:', rootFolderName, rootFolderId);

  // Create folder hierarchy: Client → Campaign → Publication
  const clientFolderId = await findOrCreateFolder(opts.client, rootFolderId);
  const campaignFolderId = await findOrCreateFolder(opts.campaign, clientFolderId);
  const publicationFolderId = await findOrCreateFolder(opts.publication, campaignFolderId);

  return publicationFolderId;
}

// Configuration constants
const RESUMABLE_UPLOAD_THRESHOLD = 5 * 1024 * 1024; // 5MB - files larger than this use resumable upload
const MAX_UPLOAD_RETRIES = 3; // Number of retry attempts
const INITIAL_RETRY_DELAY_MS = 1000; // Initial delay before first retry (doubles each attempt)

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  operation: string = 'Operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[retryWithBackoff] ${operation} - Attempt ${attempt + 1}/${maxRetries + 1}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 404 or 403 (permission errors)
      if (error?.code === 404 || error?.status === 404 || 
          error?.code === 403 || error?.status === 403) {
        console.error(`[retryWithBackoff] ${operation} - Non-retryable error:`, error?.message);
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        console.warn(`[retryWithBackoff] ${operation} - Attempt ${attempt + 1} failed. Retrying in ${delayMs}ms...`, error?.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.error(`[retryWithBackoff] ${operation} - All ${maxRetries + 1} attempts failed`);
  throw lastError;
}

export async function uploadIntoPath(opts: { file: File; client: string; campaign: string; publication: string; }) {
  const drive = getDriveClient();
  
  const parentId = await ensureFolderPath({ 
    client: opts.client, 
    campaign: opts.campaign, 
    publication: opts.publication
  });

  // Create filename with publication_date_originalname format
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const originalName = opts.file.name;
  const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
  const baseFilename = originalName.substring(0, originalName.lastIndexOf('.'));
  const filename = `${opts.publication}_${today}_${baseFilename}${fileExtension}`;

  const fileSize = opts.file.size;
  console.log(`[uploadIntoPath] Uploading file: ${filename}, size: ${fileSize} bytes`);

  // For large files (>5MB), use resumable upload
  // For smaller files, use simple upload
  if (fileSize > RESUMABLE_UPLOAD_THRESHOLD) {
    console.log('[uploadIntoPath] Using resumable upload for large file');
    return await retryWithBackoff(
      () => uploadLargeFileResumable(drive, opts.file, filename, parentId),
      MAX_UPLOAD_RETRIES,
      INITIAL_RETRY_DELAY_MS * 2, // 2s for large files
      `Upload large file: ${filename}`
    );
  } else {
    console.log('[uploadIntoPath] Using simple upload for small file');
    return await retryWithBackoff(
      () => uploadSimpleFile(drive, opts.file, filename, parentId),
      MAX_UPLOAD_RETRIES,
      INITIAL_RETRY_DELAY_MS,
      `Upload small file: ${filename}`
    );
  }
}

// Simple upload for small files (original method)
async function uploadSimpleFile(drive: any, file: File, filename: string, parentId: string) {
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const stream = Readable.from(buf);

  const created = await drive.files.create({
    requestBody: { 
      name: filename, 
      parents: [parentId] 
    },
    media: { 
      mimeType: file.type || 'application/octet-stream', 
      body: stream 
    },
    supportsAllDrives: true
  });
  
  return created.data;
}

// Upload progress event type from googleapis
interface UploadProgressEvent {
  bytesRead: number;
}

// Resumable upload for large files
async function uploadLargeFileResumable(drive: any, file: File, filename: string, parentId: string) {
  const fileSize = file.size;
  const mimeType = file.type || 'application/octet-stream';
  
  console.log(`[uploadLargeFileResumable] Starting resumable upload for ${filename}`);
  
  // Note: For truly massive files (>500MB), consider implementing chunked streaming
  // For now, we load the file into memory but rely on Node.js streaming to Google Drive
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  
  // Use resumable upload with Google Drive API
  const created = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [parentId]
    },
    media: {
      mimeType: mimeType,
      body: Readable.from(buffer)
    },
    supportsAllDrives: true,
    fields: 'id, name, mimeType, size',
  }, {
    // Enable resumable uploads
    onUploadProgress: (evt: UploadProgressEvent) => {
      const progress = (evt.bytesRead / fileSize) * 100;
      console.log(`[uploadLargeFileResumable] Upload progress: ${progress.toFixed(2)}%`);
    }
  });

  console.log(`[uploadLargeFileResumable] Upload completed: ${created.data.id}`);
  return created.data;
}

// ============================================================================
// DIRECT CLIENT-TO-GOOGLE-DRIVE UPLOAD (Bypasses Vercel payload limits)
// ============================================================================

/**
 * Initiates a resumable upload session with Google Drive.
 * Returns an upload URL that the client can use to upload directly to Google Drive.
 * 
 * This bypasses Vercel's ~4.5MB payload limit by having the client upload
 * the file directly to Google Drive, not through our serverless function.
 */
export async function initiateResumableUpload(opts: {
  client: string;
  campaign: string;
  publication: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}): Promise<string> {
  const drive = getDriveClient();
  
  // Ensure the folder path exists
  const parentId = await ensureFolderPath({
    client: opts.client,
    campaign: opts.campaign,
    publication: opts.publication
  });

  // Create filename with publication_date_originalname format
  const today = new Date().toISOString().split('T')[0];
  const originalName = opts.fileName;
  const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
  const baseFilename = originalName.substring(0, originalName.lastIndexOf('.'));
  const filename = `${opts.publication}_${today}_${baseFilename}${fileExtension}`;

  console.log(`[initiateResumableUpload] Initiating upload for ${filename}, size: ${opts.fileSize}`);

  // Get the auth client to make the request
  const auth = await drive.context._options.auth as any;
  const authClient = await auth.getClient();
  const accessToken = await authClient.getAccessToken();

  if (!accessToken.token) {
    throw new Error('Failed to get access token for Google Drive');
  }

  // Initiate resumable upload session
  // https://developers.google.com/drive/api/guides/manage-uploads#resumable
  const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': opts.mimeType,
      'X-Upload-Content-Length': opts.fileSize.toString(),
    },
    body: JSON.stringify({
      name: filename,
      parents: [parentId],
      mimeType: opts.mimeType
    })
  });

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    console.error('[initiateResumableUpload] Failed to initiate upload:', errorText);
    throw new Error(`Failed to initiate resumable upload: ${initResponse.status} ${errorText}`);
  }

  // The Location header contains the upload URL
  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL returned from Google Drive');
  }

  console.log(`[initiateResumableUpload] Upload session created: ${uploadUrl}`);
  return uploadUrl;
}

/**
 * Verifies that a file was successfully uploaded to Google Drive
 * and returns its metadata.
 */
export async function verifyUploadCompletion(fileId: string) {
  const drive = getDriveClient();
  
  console.log(`[verifyUploadCompletion] Verifying file: ${fileId}`);
  
  const fileMetadata = await drive.files.get({
    fileId: fileId,
    fields: 'id, name, mimeType, size, createdTime',
    supportsAllDrives: true
  });

  console.log(`[verifyUploadCompletion] File verified: ${fileMetadata.data.name}`);
  return fileMetadata.data;
}

/**
 * Finds a recently uploaded file in Google Drive by searching in the target folder.
 * This is used when the file ID is not returned from the upload response.
 */
export async function findRecentUpload(opts: {
  fileName: string;
  client: string;
  campaign: string;
  publication: string;
}) {
  const drive = getDriveClient();
  
  // Ensure the folder path exists
  const parentId = await ensureFolderPath({
    client: opts.client,
    campaign: opts.campaign,
    publication: opts.publication
  });

  // Create the expected filename pattern
  const today = new Date().toISOString().split('T')[0];
  const originalName = opts.fileName;
  const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
  const baseFilename = originalName.substring(0, originalName.lastIndexOf('.'));
  const expectedFilename = `${opts.publication}_${today}_${baseFilename}${fileExtension}`;

  console.log(`[findRecentUpload] Searching for file: ${expectedFilename} in folder: ${parentId}`);

  // Search for the file in the target folder (created within the last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const query = `name='${expectedFilename}' and '${parentId}' in parents and trashed=false and createdTime > '${fiveMinutesAgo}'`;
  
  const searchResult = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, size, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (!searchResult.data.files || searchResult.data.files.length === 0) {
    console.error(`[findRecentUpload] File not found: ${expectedFilename}`);
    throw new Error(`Uploaded file not found. Expected: ${expectedFilename}`);
  }

  const file = searchResult.data.files[0];
  console.log(`[findRecentUpload] File found: ${file.name} (${file.id})`);
  return file;
}

/**
 * Uploads a file to Google Drive using a resumable upload URL.
 * This function acts as a server-side proxy to avoid CORS issues.
 */
export async function uploadFileToGoogleDrive(uploadUrl: string, file: File) {
  console.log(`[uploadFileToGoogleDrive] Uploading file: ${file.name}, size: ${file.size}`);
  
  // Convert File to Buffer
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  
  // Upload the file to Google Drive using the resumable upload URL
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'Content-Length': file.size.toString(),
    },
    body: buffer
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('[uploadFileToGoogleDrive] Upload failed:', errorText);
    throw new Error(`Failed to upload file: ${uploadResponse.status} ${errorText}`);
  }

  // Parse the response to get file metadata
  const fileMetadata = await uploadResponse.json();
  console.log(`[uploadFileToGoogleDrive] Upload completed: ${fileMetadata.id}`);
  
  return fileMetadata;
}

/**
 * Uploads a chunk of a file to Google Drive using resumable upload protocol.
 * Google Drive requires chunks to be uploaded sequentially with proper Content-Range headers.
 */
export async function uploadChunkToGoogleDrive(opts: {
  uploadUrl: string;
  chunk: File;
  chunkIndex: number;
  totalChunks: number;
  isLastChunk: boolean;
}) {
  const { uploadUrl, chunk, chunkIndex, totalChunks, isLastChunk } = opts;
  
  console.log(`[uploadChunkToGoogleDrive] Uploading chunk ${chunkIndex + 1}/${totalChunks}, size: ${chunk.size}`);
  
  // Convert chunk to Buffer
  const arrayBuf = await chunk.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  
  // Calculate byte range for this chunk
  // For chunked uploads, we need to track the total file size and current position
  // This is simplified - in production, you'd track cumulative bytes uploaded
  const chunkSize = buffer.length;
  const startByte = chunkIndex * 5 * 1024 * 1024; // Assuming 5MB chunks
  const endByte = startByte + chunkSize - 1;
  
  // Upload chunk to Google Drive
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': chunkSize.toString(),
      'Content-Range': `bytes ${startByte}-${endByte}/*`, // Total size unknown during chunking
    },
    body: buffer
  });

  if (!uploadResponse.ok && uploadResponse.status !== 308) {
    // 308 Resume Incomplete is expected for non-final chunks
    const errorText = await uploadResponse.text();
    console.error('[uploadChunkToGoogleDrive] Chunk upload failed:', errorText);
    throw new Error(`Failed to upload chunk: ${uploadResponse.status} ${errorText}`);
  }

  if (isLastChunk && uploadResponse.status >= 200 && uploadResponse.status < 300) {
    // Final chunk uploaded successfully, get file metadata
    const fileMetadata = await uploadResponse.json();
    console.log(`[uploadChunkToGoogleDrive] All chunks uploaded: ${fileMetadata.id}`);
    return { file: fileMetadata };
  }

  console.log(`[uploadChunkToGoogleDrive] Chunk ${chunkIndex + 1} uploaded successfully`);
  return { file: null };
}

export async function finalizeChunkedUpload(uploadUrl: string) {
  // Query the upload status to get file metadata
  const statusResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': '0',
      'Content-Range': 'bytes */*',
    }
  });

  if (statusResponse.ok) {
    const fileMetadata = await statusResponse.json();
    return fileMetadata;
  }

  throw new Error('Failed to finalize chunked upload');
}