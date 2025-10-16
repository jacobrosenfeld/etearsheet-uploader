# Google Service Account Setup Guide

This guide will walk you through creating a Google Service Account for the JJA eTearsheet Uploader.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top
3. Click "New Project"
4. Enter a project name (e.g., "JJA eTearsheet Uploader")
5. Click "Create"

## Step 2: Enable the Google Drive API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click on it and click "Enable"

## Step 3: Create a Service Account

1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Enter a name (e.g., "etearsheet-uploader")
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

## Step 4: Create and Download a Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Click "Create"
6. The key file will download automatically - **keep this file secure!**

## Step 5: Extract Credentials from the JSON File

Open the downloaded JSON file. You'll see something like:

```json
{
  "type": "service_account",
  "project_id": "your-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n",
  "client_email": "etearsheet-uploader@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

You need two fields:
- `client_email` → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → This is your `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Step 6: Share Your Google Drive Folder

1. Create a folder in Google Drive called "JJA eTearsheets" (or it will be created automatically on first upload)
2. Right-click the folder and click "Share"
3. Paste the service account email (from `client_email` above)
4. Give it "Editor" permissions
5. Click "Send"

**Important:** The service account email will look like: `something@your-project.iam.gserviceaccount.com`

## Step 7: Set Environment Variables

Create a `.env.local` file in your project root:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=etearsheet-uploader@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Vercel deployment:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add both variables there
4. For the private key, copy the entire value including the quotes and newline characters (`\n`)

## Troubleshooting

### "Permission denied" errors
- Make sure you shared the Google Drive folder with the service account email
- Grant "Editor" permissions, not just "Viewer"

### "Invalid grant" errors
- Check that the private key is properly formatted
- Ensure the key includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- On Vercel, make sure newlines are represented as `\n` characters

### Files not appearing in Drive
- Verify the service account has access to the folder
- Check that the Google Drive API is enabled
- Look at the application logs for detailed error messages

## Security Notes

- **Never commit the JSON key file to git**
- Add `*.json` to your `.gitignore` if it's not already there
- Keep your `.env.local` file out of version control
- Store environment variables securely in your deployment platform (Vercel, etc.)
- You can revoke and rotate service account keys from the Google Cloud Console if needed
