import { google } from 'googleapis';
import { readConfig, writeConfig } from './configStore';

// In-memory token store (in production, use a proper database)
let storedTokens: any = null;

export async function driveClient() {
  if (!storedTokens) {
    return null;
  }
  
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2.setCredentials(storedTokens);
  return google.drive({ version: 'v3', auth: oauth2 });
}

export async function getAuthUrl() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file']
  });
}

export async function storeTokens(tokens: any) {
  // Store tokens in memory (in production, use secure database)
  storedTokens = tokens;
  console.log('Tokens stored successfully');
}

// Find or create a folder in Google Drive
async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const drive = await driveClient();
  if (!drive) throw new Error('Not authenticated with Google Drive');

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

// Create the folder structure: Root → Client → Campaign → Date
async function ensureFolderPath(opts: { client: string; campaign: string; dateFolder: string }): Promise<string> {
  const config = await readConfig();
  
  // Get or create root folder
  let rootFolderId = config.driveSettings?.rootFolderId;
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

  // Create folder hierarchy: Client → Campaign → Date
  const clientFolderId = await findOrCreateFolder(opts.client, rootFolderId);
  const campaignFolderId = await findOrCreateFolder(opts.campaign, clientFolderId);
  const dateFolderId = await findOrCreateFolder(opts.dateFolder, campaignFolderId);

  return dateFolderId;
}

export async function uploadIntoPath(opts: { file: File; client: string; campaign: string; publication: string; dateFolder: string; }) {
  const drive = await driveClient();
  if (!drive) throw new Error('Not authenticated with Google Drive');
  
  const parentId = await ensureFolderPath({ 
    client: opts.client, 
    campaign: opts.campaign, 
    dateFolder: opts.dateFolder 
  });

  const arrayBuf = await opts.file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);

  // Include publication in filename for clarity
  const filename = `${opts.publication}_${opts.file.name}`;

  const created = await drive.files.create({
    requestBody: { 
      name: filename, 
      parents: [parentId] 
    },
    media: { 
      mimeType: opts.file.type || 'application/octet-stream', 
      body: buf 
    }
  });
  
  return created.data;
}