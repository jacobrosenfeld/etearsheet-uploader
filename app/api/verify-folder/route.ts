import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getRole } from '@/lib/sessions';

function getDriveClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const impersonateUser = process.env.GOOGLE_IMPERSONATE_USER;
  
  if (!serviceAccountEmail || !serviceAccountKey) {
    throw new Error('Missing Google Service Account credentials');
  }

  if (!impersonateUser) {
    throw new Error('Missing GOOGLE_IMPERSONATE_USER environment variable');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: serviceAccountEmail,
      private_key: serviceAccountKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
    clientOptions: {
      subject: impersonateUser,
    },
  });

  return google.drive({ version: 'v3', auth });
}

export async function GET(req: NextRequest) {
  const role = await getRole();
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('id');

  if (!folderId) {
    return NextResponse.json({ error: 'Missing folder ID' }, { status: 400 });
  }

  const drive = getDriveClient();

  try {
    // Try to get the folder with supportsAllDrives
    let folderInfo;
    let method = 'standard';
    
    try {
      folderInfo = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, driveId, parents, owners',
        supportsAllDrives: true
      });
      method = 'supportsAllDrives';
    } catch (firstError: any) {
      // If that fails, we can't access the folder
      throw firstError;
    }

    const data = folderInfo.data;
    const isFolder = data.mimeType === 'application/vnd.google-apps.folder';
    const isSharedDrive = !!data.driveId;

    return NextResponse.json({
      success: true,
      method,
      folder: {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        isFolder,
        driveId: data.driveId || null,
        isSharedDrive,
        parents: data.parents || [],
        owners: data.owners || []
      },
      message: isFolder 
        ? `✅ Folder "${data.name}" is accessible` 
        : `⚠️ This is not a folder (${data.mimeType})`,
      recommendations: [
        ...(!isFolder ? ['The provided ID is not a folder'] : []),
      ]
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code || error.status,
      folderId,
      message: '❌ Could not access folder',
      recommendations: [
        'Make sure the folder is shared with the service account email',
        'Give the service account "Editor" permissions',
        'Verify domain-wide delegation is configured correctly',
        'Check that the impersonated user has access to this folder'
      ]
    }, { status: 200 }); // Return 200 so we can show the error nicely in UI
  }
}
