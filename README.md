# JJA eTearsheet Uploader

A Next.js app for secure eTearsheet uploads to Google Drive with password-protected access and automatic folder organization.

## Features

- **Password-protected portal** - Two-tier access (portal password for uploads, admin password for configuration)
- **Google Drive integration** - Service Account with domain-wide delegation for seamless uploads
- **Automatic folder hierarchy**: JJA eTearsheets → Client → Campaign → Publication → Publication_date_filename.ext
- **Automatic file naming**: Files are named with publication_YYYY-MM-DD_originalname.ext format
- **Admin configuration panel** - Manage clients, campaigns, and publications through web UI
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
- Add/remove clients
- Add/remove campaigns
- Add/remove publications
- Configuration is saved automatically

## Folder Structure

Files are automatically organized in Google Drive as:

```
JJA eTearsheets/
  └── Client Name/
      └── Campaign Name/
          └── Publication Name/
              └── Publication_2025-10-16_filename.pdf
```

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
- Verify the OAuth scope is exactly: `https://www.googleapis.com/auth/drive.file`
- Check that the impersonated user exists and is active
- Ensure the private key is properly formatted with `\n` for newlines

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

## Security Notes

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