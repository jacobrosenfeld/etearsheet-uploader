# JJA eTearsheet Uploader

A Next.js app for secure eTearsheet uploads to Google Drive with password-protected access and automatic folder organization.

## Features

- **Password-protected portal** - Two-tier access (portal password for uploads, admin password for configuration)
- **Google Drive integration** - Service Account with domain-wide delegation for seamless uploads
- **Shared Drive support** - Works with both My Drive and Shared Drives
- **Custom parent folder** - Configure a specific Google Drive folder as the root instead of default "JJA eTearsheets"
- **Automatic folder hierarchy**: Custom Folder → Client → Campaign → Publication → Publication_date_filename.ext
- **Automatic file naming**: Files are named with publication_YYYY-MM-DD_originalname.ext format
- **Admin configuration panel** - Manage clients, campaigns, and publications through web UI
- **Inline editing** - Add/remove items directly in the admin panel without browser popups
- **Visibility controls** - Show/hide clients, campaigns, and publications from the upload portal with eye icons
- **Instant saving** - All admin changes save automatically - no manual save button needed
- **Alphabetical sorting** - All lists and dropdowns are sorted alphabetically for easy navigation
- **Role-based access** - Admin users can configure settings, regular users can only upload

## Quick Setup

> **⚠️ Important**: This app requires a Google Workspace account for domain-wide delegation. Personal Gmail accounts cannot use this feature.

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

### Quick Overview

1. **Create Google Service Account** with domain-wide delegation enabled
2. **Authorize in Google Workspace Admin Console** with Drive scope
3. **Set environment variables** for service account and passwords
4. **Deploy to Vercel** or run locally

### Environment Variables

Create a `.env.local` file (local development) or set these in your deployment platform:

```env
# Authentication
PORTAL_PASSWORD=your-portal-password
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=your-random-secret-key

# Google Service Account (from JSON key file)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"

# Google Workspace user to impersonate (must be in your domain)
GOOGLE_IMPERSONATE_USER=admin@yourdomain.com

# Optional: Custom parent folder URL (leave empty to use default "JJA eTearsheets")
# Can be a My Drive folder or Shared Drive folder URL
# GOOGLE_DRIVE_PARENT_FOLDER_URL=https://drive.google.com/drive/folders/YOUR_FOLDER_ID

# App URL (optional)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Set up .env.local with all required variables
# See SETUP_GUIDE.md for detailed instructions

# Run development server
npm run dev
```

Open http://localhost:3000 and log in with your portal password.## How It Works

### Authentication Flow
1. Users visit the app and are redirected to `/login`
2. Portal password grants access to upload files
3. Admin password grants access to upload files + configuration management
4. Sessions are managed with JWT tokens stored in secure HTTP-only cookies

### Upload Flow
1. User selects client, campaign, publication, and file
2. App displays the folder path where file will be stored
3. File is uploaded to the server
4. Server uses Google Service Account with domain-wide delegation to:
   - Impersonate a Google Workspace user
   - Create necessary folders in Google Drive
   - Upload file with automatic naming (publication_date_filename.ext)
5. File appears in the impersonated user's Google Drive

### Google Drive Integration
- Uses **Service Account with Domain-Wide Delegation**
- Service account impersonates a real Google Workspace user to access their storage quota
- Files are organized automatically in a nested folder structure
- Requires Google Workspace Admin access to configure

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables from the list above
4. Deploy

**Important**: For `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, make sure newlines are represented as `\n` characters in Vercel's environment variable input.

## Admin Configuration

Access the admin panel at `/admin` by logging in with the admin password. You can:

- **Add/remove clients, campaigns, and publications** - Click "+ Add" to add new items with inline text entry (no browser popups)
- **Show/hide items** - Click the eye icons next to any client, campaign, or publication to instantly show/hide them from the upload portal
- **Configure custom parent folder** - Paste a Google Drive folder URL to use as the root folder instead of the default "JJA eTearsheets"
- **Verify folder access** - Test if the service account can access your specified folder
- **Shared Drive support** - Works with both My Drive and Shared Drive folders
- **Instant saving** - All changes save automatically when you make them - no manual save button needed

### Managing Visibility

Each client, campaign, and publication has an eye icon next to it:
- **Open eye (👁️)**: Item is visible in the upload portal dropdowns
- **Closed eye (👁️‍🗨️)**: Item is hidden from the upload portal

Click any eye icon to instantly toggle visibility and save the change. Hidden items won't appear in the dropdown menus for users uploading files.

### Setting up a Custom Parent Folder

1. Go to your desired Google Drive folder (My Drive or Shared Drive)
2. Copy the folder URL from the browser address bar
3. In the admin panel, paste it in the "Parent Folder URL" field
4. **Important**: Share the folder with your service account email (shown in the admin panel) and give it "Editor" permissions
5. Click "💾 Save Drive Settings" to save just the drive configuration

The app will now organize all uploads within your specified folder instead of creating a new "JJA eTearsheets" folder.

## Folder Structure

Files are automatically organized in Google Drive as:

```
Custom Parent Folder (or "JJA eTearsheets" if not specified)/
  └── Client Name/
      └── Campaign Name/
          └── Publication Name/
              └── Publication_2025-10-16_filename.pdf
```

**Custom Parent Folder**: In the admin panel, you can specify any Google Drive folder (My Drive or Shared Drive) as the root folder. Just paste the folder URL and the app will organize all uploads within that folder structure.

## Troubleshooting

### Can't log in
- Verify `PORTAL_PASSWORD` and `ADMIN_PASSWORD` are set in environment variables
- Check that `SESSION_SECRET` is set (generate a random string)
- Clear browser cookies and try again

### "Service Accounts do not have storage quota" error
- This means domain-wide delegation is not configured correctly
- See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete setup instructions
- Verify you completed Step 6 (Admin Console authorization)
- Check that `GOOGLE_IMPERSONATE_USER` is set to a valid user in your domain

### "Permission denied" or "Invalid grant" errors
- Make sure domain-wide delegation is enabled for the service account
- Verify the OAuth scope is exactly: `https://www.googleapis.com/auth/drive` (full Drive access required for Shared Drives)
- Check that the impersonated user exists and is active
- Ensure the private key is properly formatted with `\n` for newlines
- For Shared Drive folders, make sure the folder is shared with the service account email

### Shared Drive Issues
- The app supports both My Drive and Shared Drive folders
- For Shared Drives, use the full `https://www.googleapis.com/auth/drive` scope (not `drive.file`)
- Make sure the Shared Drive folder is shared with the service account email
- The service account needs "Editor" permissions on the folder
- Use the "Verify Folder Access" button in the admin panel to test connectivity

### Files not appearing in Drive
- Log in to Google Drive as the impersonated user to see uploaded files
- Files are uploaded to the impersonated user's Drive, not the service account's
- Check that the user has enough storage quota
- Look at Vercel logs for detailed error messages

### Environment variable issues
- Make sure all required variables are set (see list above)
- In Vercel, check that `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` includes `\n` for newlines
- Don't commit `.env.local` to git - add it to `.gitignore`

## Architecture

**Tech Stack:**
- Next.js 14.2.5 (App Router)
- TypeScript
- Tailwind CSS
- Google Drive API (googleapis)
- JWT sessions (jose)
- Zod for validation

**Key Files:**
- `lib/google.ts` - Google Drive integration with domain-wide delegation
- `lib/sessions.ts` - JWT session management
- `lib/configStore.ts` - Configuration storage using environment variables
- `app/api/upload/route.ts` - File upload handler
- `app/api/auth/login/route.ts` - Password authentication
- `middleware.ts` - Route protection

## What's New

### v2.1 Features
- **Instant Visibility Controls**: Eye icons next to all items allow instant show/hide toggling that saves automatically
- **Individual Save Buttons**: Drive settings now have their own save button for granular control
- **Improved UX**: Removed the big save button - everything saves instantly when changed

### v2.0 Features
- **Shared Drive Support**: Upload to Shared Drives in addition to My Drive
- **Custom Parent Folders**: Configure any Google Drive folder as the root instead of default "JJA eTearsheets"
- **Inline Admin Editing**: Add clients/campaigns/publications directly in the web interface without browser popups
- **Alphabetical Sorting**: All lists and dropdowns are automatically sorted alphabetically
- **Folder Verification**: Test folder access before saving configuration
- **Improved OAuth Scope**: Uses full `drive` scope for Shared Drive compatibility

### Migration Notes
- **OAuth Scope Change**: Update your domain-wide delegation scope from `drive.file` to `drive` in Google Workspace Admin Console
- **Environment Variables**: The scope change requires updating your Google Workspace domain-wide delegation settings

- Never commit the JSON key file or `.env.local` to git
- Use strong, unique passwords for `PORTAL_PASSWORD` and `ADMIN_PASSWORD`
- Store environment variables securely in your deployment platform
- Sessions use HTTP-only cookies to prevent XSS attacks
- All routes except login are protected by middleware
- Service account keys can be rotated from Google Cloud Console
- Consider using a dedicated service user in Google Workspace for `GOOGLE_IMPERSONATE_USER`

## Contributing / Contact

Questions or issues? Contact admin@josephjacobs.org

---

**Note**: This application requires a Google Workspace account for domain-wide delegation. Personal Gmail accounts cannot use this feature. See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete setup instructions.