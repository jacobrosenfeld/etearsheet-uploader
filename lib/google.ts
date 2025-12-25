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
  const RESUMABLE_THRESHOLD = 5 * 1024 * 1024; // 5MB
  
  if (fileSize > RESUMABLE_THRESHOLD) {
    console.log('[uploadIntoPath] Using resumable upload for large file');
    return await uploadLargeFileResumable(drive, opts.file, filename, parentId);
  } else {
    console.log('[uploadIntoPath] Using simple upload for small file');
    return await uploadSimpleFile(drive, opts.file, filename, parentId);
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

// Resumable upload for large files
async function uploadLargeFileResumable(drive: any, file: File, filename: string, parentId: string) {
  const fileSize = file.size;
  const mimeType = file.type || 'application/octet-stream';
  
  console.log(`[uploadLargeFileResumable] Starting resumable upload for ${filename}`);
  
  // Convert File to Buffer in chunks to avoid memory issues
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
    onUploadProgress: (evt: any) => {
      const progress = (evt.bytesRead / fileSize) * 100;
      console.log(`[uploadLargeFileResumable] Upload progress: ${progress.toFixed(2)}%`);
    }
  });

  console.log(`[uploadLargeFileResumable] Upload completed: ${created.data.id}`);
  return created.data;
}