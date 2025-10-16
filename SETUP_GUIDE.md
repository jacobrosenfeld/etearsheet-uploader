# Google Service Account Setup Guide with Domain-Wide Delegation

This guide will walk you through creating a Google Service Account with domain-wide delegation for the JJA eTearsheet Uploader. Domain-wide delegation allows the service account to impersonate a user in your Google Workspace, which is necessary to use that user's storage quota (service accounts don't have storage).

## Prerequisites

- A Google Workspace account (not a personal Gmail account)
- Admin access to the Google Workspace Admin Console
- Access to Google Cloud Console

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
4. Enter a description (optional)
5. Click "Create and Continue"
6. Skip the optional role assignment steps
7. Click "Done"

## Step 4: Create and Download a Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Click "Create"
6. The key file will download automatically - **keep this file secure!**

## Step 5: Enable Domain-Wide Delegation

1. Still on the service account details page, scroll to "Advanced settings"
2. Click "Enable Google Workspace Domain-wide Delegation"
3. Check the box to enable it
4. Enter a product name for the consent screen (e.g., "JJA eTearsheet Uploader")
5. Click "Save"
6. **Important:** Copy the "Client ID" (a long number) - you'll need this in the next step

## Step 6: Authorize the Service Account in Google Workspace Admin Console

This is the critical step that allows the service account to impersonate users.

1. Go to [Google Workspace Admin Console](https://admin.google.com/)
2. Navigate to **Security** → **Access and data control** → **API Controls**
3. Scroll down to "Domain-wide Delegation"
4. Click "Add new" or "Manage Domain-Wide Delegation"
5. Click "Add new"
6. Enter the **Client ID** you copied from Step 5
7. In the "OAuth Scopes" field, enter:
   ```
   https://www.googleapis.com/auth/drive
   ```
   **Note**: This app requires full Drive access (`drive`) rather than the narrower `drive.file` scope to support Shared Drives. The `drive.file` scope only allows access to files created by the app or explicitly shared with it.
8. Click "Authorize"

**Note:** You must be a Google Workspace admin to complete this step. If you see an error, make sure:
- You're using a Google Workspace account (not personal Gmail)
- You have admin privileges
- The Client ID is correct

## Step 7: Extract Credentials from the JSON File

Open the downloaded JSON file from Step 4. You'll see something like:

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

You need three pieces of information:
- `client_email` → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → This is your `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- A user email from your domain → This is your `GOOGLE_IMPERSONATE_USER`

## Step 8: Choose a User to Impersonate

Pick a Google Workspace user whose Drive storage you want to use for uploads. This should be:
- A real user in your domain (e.g., admin@yourdomain.com)
- Someone with sufficient Google Drive storage
- Ideally an admin or dedicated service account user

The files will be uploaded to Drive as if this user uploaded them, and will use their storage quota.

## Step 9: Set Environment Variables

Create a `.env.local` file in your project root:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=etearsheet-uploader@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
GOOGLE_IMPERSONATE_USER=admin@yourdomain.com

# Portal Authentication
PORTAL_PASSWORD=your-portal-password
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=your-random-secret-at-least-32-characters

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Vercel deployment:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all the variables above
4. For the private key, copy the entire value including the quotes and newline characters (`\n`)

## Step 10: Share the Drive Folder (Optional)

If you want to share the uploaded files with others:

1. The files will be created in the impersonated user's Drive
2. You can create a "JJA eTearsheets" folder in their Drive
3. Share that folder with whoever needs access
4. The app will automatically organize files within that folder

## Troubleshooting

### "Permission denied" or "Service Accounts do not have storage quota" errors
- Make sure you completed Step 6 (Domain-Wide Delegation in Admin Console)
- Verify the OAuth scope is exactly: `https://www.googleapis.com/auth/drive` (full Drive access required for Shared Drives)
- Check that `GOOGLE_IMPERSONATE_USER` is set to a valid user in your domain
- The impersonated user must exist and have an active Google Workspace account

### "Invalid grant" errors
- Check that the private key is properly formatted
- Ensure the key includes `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- On Vercel, make sure newlines are represented as `\n` characters
- Verify domain-wide delegation is enabled for the service account

### "Domain-wide delegation not enabled" errors
- Go back to Step 5 and make sure you enabled domain-wide delegation
- Make sure you authorized the Client ID in the Admin Console (Step 6)
- Wait a few minutes for changes to propagate

### Files not appearing in Drive
- Check that the impersonated user exists and is active
- Verify the user has enough storage quota
- Look at the application logs for detailed error messages
- Make sure the Drive API is enabled in your Google Cloud project

### Can't access Admin Console (Step 6)
- You must be a Google Workspace Super Admin to complete this step
- Personal Gmail accounts cannot use domain-wide delegation
- Contact your organization's Google Workspace admin if you don't have access

## Security Notes

- **Never commit the JSON key file to git**
- Add `*.json` to your `.gitignore` if it's not already there
- Keep your `.env.local` file out of version control
- Store environment variables securely in your deployment platform (Vercel, etc.)
- You can revoke and rotate service account keys from the Google Cloud Console if needed
- The impersonated user should be a dedicated account or admin, not a regular user
- Consider creating a dedicated "service" user in your Google Workspace for this purpose

## Why Domain-Wide Delegation?

Service accounts in Google don't have their own Google Drive storage. When you try to upload files directly with a service account, Google returns the error: "Service Accounts do not have storage quota."

Domain-wide delegation solves this by allowing the service account to act on behalf of a real user in your organization. The files are uploaded using that user's storage quota and appear in their Drive. This is Google's recommended approach for server-side applications that need to access user data without manual OAuth authorization.

## Alternative: Creating a Dedicated Service User

For better organization, you can create a dedicated user in your Google Workspace:

1. Create a new user in Google Workspace (e.g., `etearsheets@yourdomain.com`)
2. Assign them sufficient storage
3. Use this email as your `GOOGLE_IMPERSONATE_USER`
4. Share the files/folders from this account with other users who need access

This keeps all uploaded files in one dedicated account's Drive.
