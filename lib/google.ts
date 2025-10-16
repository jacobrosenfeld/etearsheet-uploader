import { google } from 'googleapis';
import { readConfig, writeConfig } from './configStore';
import { Readable } from 'stream';

// Extract folder ID from Google Drive URL
function extractFolderIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  // Match patterns like:
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
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
    scopes: ['https://www.googleapis.com/auth/drive.file'],
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
    fields: 'files(id, name)'
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
    fields: 'id'
  });

  return createResult.data.id!;
}

// Create the folder structure: Root → Client → Campaign → Publication
async function ensureFolderPath(opts: { client: string; campaign: string; publication: string }): Promise<string> {
  const config = await readConfig();
  
  let rootFolderId: string | undefined;
  let rootFolderName = 'JJA eTearsheets';
  
  // Check if there's a custom parent folder URL
  if (config.driveSettings?.parentFolderUrl) {
    const customFolderId = extractFolderIdFromUrl(config.driveSettings.parentFolderUrl);
    if (customFolderId) {
      // Verify the folder exists and get its name
      const drive = getDriveClient();
      try {
        const folderInfo = await drive.files.get({
          fileId: customFolderId,
          fields: 'id, name'
        });
        
        if (folderInfo.data.id) {
          rootFolderId = folderInfo.data.id;
          rootFolderName = folderInfo.data.name || rootFolderName;
          
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
        }
      } catch (error) {
        console.error('Error accessing custom parent folder:', error);
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

  const arrayBuf = await opts.file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  // Create filename with publication_date_originalname format
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const originalName = opts.file.name;
  const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
  const baseFilename = originalName.substring(0, originalName.lastIndexOf('.'));
  const filename = `${opts.publication}_${today}_${baseFilename}${fileExtension}`;

  // Convert buffer to readable stream
  const stream = Readable.from(buf);

  const created = await drive.files.create({
    requestBody: { 
      name: filename, 
      parents: [parentId] 
    },
    media: { 
      mimeType: opts.file.type || 'application/octet-stream', 
      body: stream 
    }
  });
  
  return created.data;
}