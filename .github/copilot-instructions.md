# GitHub Copilot Instructions for JJA eTearsheet Uploader

## Project Overview

This is a Next.js application that provides a secure portal for uploading marketing tearsheets to Google Drive with automatic organization. It's designed for agencies to manage client materials with proper folder hierarchy and access control.

### Key Features
- Password-protected upload portal with two-tier access (portal user and admin)
- Google Drive integration using Service Account with domain-wide delegation
- Automatic folder hierarchy: Custom Folder → Client → Campaign → Publication → Files
- Automatic file naming: `publication_YYYY-MM-DD_originalname.ext`
- Admin configuration panel for managing clients, campaigns, and publications
- Visibility controls (show/hide items from upload portal)
- Support for both My Drive and Shared Drives

## Tech Stack

- **Framework**: Next.js 14.2.5 (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS
- **Authentication**: JWT sessions with HTTP-only cookies (jose library)
- **Google Integration**: googleapis library with Service Account and domain-wide delegation
- **Storage**: Vercel Blob for configuration data
- **Validation**: Zod for schema validation

## Project Structure

```
/home/runner/work/etearsheet-uploader/etearsheet-uploader/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Upload portal (main page)
│   ├── login/page.tsx           # Login page
│   ├── admin/page.tsx           # Admin configuration panel
│   ├── privacy/page.tsx         # Privacy policy page
│   ├── api/                     # API routes
│   │   ├── auth/login/route.ts  # Password authentication
│   │   ├── upload/route.ts      # File upload handler
│   │   ├── config/route.ts      # Configuration management
│   │   ├── verify-folder/route.ts # Folder access verification
│   │   ├── notifications/route.ts # Admin notifications
│   │   ├── logout/route.ts      # Session logout
│   │   └── test/route.ts        # Environment testing
│   ├── components/              # React components
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── lib/                         # Core library code
│   ├── google.ts                # Google Drive client and operations
│   ├── sessions.ts              # JWT session management
│   ├── configStore.ts           # Configuration storage (Vercel Blob)
│   └── types.ts                 # TypeScript type definitions
├── middleware.ts                # Route protection middleware
├── .env.example                 # Example environment variables
└── package.json                 # Dependencies and scripts
```

## Key Files and Their Responsibilities

### Core Library (`lib/`)

#### `lib/google.ts`
- **Purpose**: Google Drive API integration with Service Account
- **Key Functions**:
  - `getDriveClient()`: Creates authenticated Google Drive client with domain-wide delegation
  - `extractFolderIdFromUrl()`: Parses Google Drive URLs to extract folder IDs
  - `uploadFileToDrive()`: Main upload function that creates folder hierarchy and uploads files
  - `findOrCreateFolder()`: Recursively creates nested folder structure
  - `verifyFolderAccess()`: Tests if service account can access a specified folder
  - `getOrCreateRootFolder()`: Gets or creates the root "JJA eTearsheets" folder
- **Important**: Uses Service Account with domain-wide delegation to impersonate a Google Workspace user

#### `lib/sessions.ts`
- **Purpose**: JWT-based session management
- **Key Functions**:
  - `createSession(role)`: Creates JWT session cookie (expires in 24h)
  - `getSession()`: Verifies and retrieves current session
  - `getRole()`: Gets user role ('user' or 'admin')
  - `clearSession()`: Deletes session cookie
- **Security**: Uses HTTP-only cookies, secure flag in production

#### `lib/configStore.ts`
- **Purpose**: Configuration persistence using Vercel Blob storage
- **Key Functions**:
  - `readConfig()`: Fetches current configuration from blob storage
  - `writeConfig()`: Saves configuration to blob storage
  - `findConfigUrl()`: Locates existing config blob
  - `cleanupOldConfigs()`: Removes duplicate/old config files
- **Data**: Stores clients, campaigns, publications, drive settings, and admin notifications

#### `lib/types.ts`
- **Purpose**: TypeScript type definitions
- **Key Types**:
  - `PortalConfig`: Main configuration structure
  - `AdminNotification`: Notification system types

### API Routes (`app/api/`)

#### `app/api/upload/route.ts`
- **Method**: POST
- **Purpose**: Handles file uploads to Google Drive
- **Flow**:
  1. Validates authentication (requires valid session)
  2. Parses multipart form data (client, campaign, publication, date, file)
  3. Reads configuration to get folder structure
  4. Calls `uploadFileToDrive()` to create folders and upload file
  5. Returns success/error response
- **Security**: Protected by session middleware

#### `app/api/config/route.ts`
- **Methods**: GET, POST
- **Purpose**: Manages portal configuration
- **GET**: Returns current configuration with visible items only for non-admins
- **POST**: Updates configuration (admin only)
- **Security**: Admin role required for writes

#### `app/api/auth/login/route.ts`
- **Method**: POST
- **Purpose**: Password authentication
- **Flow**:
  1. Accepts password in request body
  2. Compares against `PORTAL_PASSWORD` (user) or `ADMIN_PASSWORD` (admin)
  3. Creates session with appropriate role
  4. Returns success/error
- **Passwords**: Stored as environment variables

### Pages (`app/`)

#### `app/page.tsx`
- **Purpose**: Main upload portal interface
- **Features**:
  - Dropdowns for client, campaign, publication selection
  - Date picker for publication date
  - File upload with drag-and-drop
  - Display of target folder path
  - Upload status and feedback

#### `app/admin/page.tsx`
- **Purpose**: Admin configuration panel
- **Features**:
  - Add/remove/hide clients, campaigns, publications
  - Inline editing with instant save
  - Eye icons for visibility toggles
  - Custom parent folder configuration
  - Folder access verification
  - Service account email display
- **Access**: Admin role required

#### `app/login/page.tsx`
- **Purpose**: Password authentication page
- **Features**:
  - Single password input
  - Redirects to original page after login
  - Handles both user and admin passwords

### Middleware (`middleware.ts`)
- **Purpose**: Route protection
- **Flow**:
  1. Checks if path is public (login, API auth, static assets)
  2. If protected, verifies session cookie exists
  3. Redirects to login if no valid session
- **Public paths**: `/login`, `/api/auth/login`, `/privacy`, static assets

## Architecture Patterns

### Authentication Flow
1. User visits app → redirected to `/login` if no session
2. User enters password → POST to `/api/auth/login`
3. Server validates password against environment variables
4. Server creates JWT session with role ('user' or 'admin')
5. Session stored as HTTP-only cookie (24h expiration)
6. Middleware checks session on all protected routes
7. Admin routes check role in page/API handlers

### Google Drive Integration
1. Service Account configured with domain-wide delegation in Google Workspace Admin Console
2. Service Account impersonates a real Google Workspace user (`GOOGLE_IMPERSONATE_USER`)
3. Files uploaded to impersonated user's Drive (using their storage quota)
4. Supports both My Drive and Shared Drives
5. Requires OAuth scope: `https://www.googleapis.com/auth/drive`

### Configuration Management
1. Configuration stored as JSON in Vercel Blob storage
2. Single source of truth for clients, campaigns, publications
3. Automatic cleanup of old/duplicate configs
4. Clients, campaigns, publications sorted alphabetically
5. Visibility controls (hidden items filtered out for non-admins)

### File Upload Process
1. User selects client, campaign, publication, date, and file
2. Form data sent to `/api/upload`
3. Server reads config to get folder structure
4. Server creates nested folder hierarchy in Google Drive (if not exists)
5. File uploaded with automatic naming: `publication_YYYY-MM-DD_originalname.ext`
6. Success/error returned to client

## Environment Variables

### Required
- `PORTAL_PASSWORD`: Password for upload access
- `ADMIN_PASSWORD`: Password for admin access (includes upload access)
- `SESSION_SECRET`: Secret key for JWT signing (generate random string)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Service account email from Google Cloud
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: Private key from service account JSON (use `\n` for newlines)
- `GOOGLE_IMPERSONATE_USER`: Google Workspace user to impersonate (e.g., admin@domain.com)
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob token for configuration storage

### Optional
- `GOOGLE_DRIVE_PARENT_FOLDER_URL`: Custom parent folder URL (defaults to creating "JJA eTearsheets")
- `NEXT_PUBLIC_APP_URL`: Application URL for display purposes
- `APP_CONFIG_BLOB_KEY`: Custom blob key for config storage (defaults to `config/upload-portal-config.json`)

## Development Guidelines

### Code Style
- Use TypeScript strict mode - all types must be explicit
- Follow Next.js App Router conventions
- Use async/await for asynchronous operations
- Use server actions where appropriate (API routes for complex logic)
- Use Tailwind CSS for styling (utility-first approach)
- Keep components small and focused
- Use error boundaries for error handling

### Security Practices
- Never log sensitive data (passwords, private keys, session tokens)
- Always validate user input with Zod schemas
- Use HTTP-only cookies for session management
- Sanitize file names before uploading
- Check user roles before allowing admin operations
- Use secure flag for cookies in production
- Store secrets in environment variables only

### Error Handling
- Return meaningful error messages to users
- Log detailed errors to console (sanitized)
- Handle Google Drive API errors gracefully
- Provide fallbacks for missing configuration
- Show loading states during async operations

### Testing Considerations
- Test authentication flows (user and admin)
- Test file upload with various file types
- Test folder creation and hierarchy
- Test configuration updates
- Test visibility controls
- Verify Google Drive integration with service account

## Common Tasks

### Adding a New Client/Campaign/Publication
1. Admin logs in with admin password
2. Navigates to `/admin`
3. Clicks "+ Add" button
4. Enters name in inline text input
5. System automatically saves to Vercel Blob
6. New item appears in alphabetically sorted list

### Hiding an Item from Portal
1. Admin clicks eye icon next to item
2. System immediately saves change to Vercel Blob
3. Item hidden from upload portal dropdowns
4. Eye icon changes to indicate hidden state

### Configuring Custom Parent Folder
1. Admin creates/selects folder in Google Drive
2. Shares folder with service account email (shown in admin panel)
3. Gives "Editor" permissions to service account
4. Copies folder URL from browser
5. Pastes URL in admin panel "Parent Folder URL" field
6. Clicks "💾 Save Drive Settings"
7. Optionally verifies access with "Verify Folder Access" button

### Uploading a File
1. User logs in with portal or admin password
2. Selects client from dropdown
3. Selects campaign from dropdown
4. Selects publication from dropdown
5. Chooses publication date
6. Selects file to upload
7. Clicks "Upload to Drive"
8. File uploaded to: Custom Folder / Client / Campaign / Publication / publication_YYYY-MM-DD_filename.ext

## API Response Patterns

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* optional data */ }
}
```

### Error Response
```json
{
  "error": "Error message describing what went wrong"
}
```

## Important Notes for AI Assistants

1. **Google Drive Setup is Complex**: This app requires a Google Workspace account (not personal Gmail) with Service Account and domain-wide delegation configured. Don't suggest simplifications that bypass this.

2. **Vercel Blob is Required**: Configuration is stored in Vercel Blob, not local files or database. Don't suggest switching to file system storage.

3. **Two-Tier Authentication**: There are two passwords - portal (upload only) and admin (upload + config). This is intentional for role separation.

4. **Folder Hierarchy is Fixed**: The folder structure (Client → Campaign → Publication) is business logic and shouldn't be made configurable without discussion.

5. **File Naming is Automatic**: Files are automatically renamed to `publication_YYYY-MM-DD_originalname.ext`. This ensures consistency and shouldn't be optional.

6. **Alphabetical Sorting**: All lists and dropdowns are sorted alphabetically. This is a UX requirement.

7. **Instant Saving**: Admin changes save immediately when toggling visibility or after adding items. There's no "Save All" button by design.

8. **Shared Drive Support**: The app supports both My Drive and Shared Drive folders. OAuth scope must be full `drive` (not `drive.file`).

9. **Session Duration**: Sessions expire after 24 hours. This is a security feature.

10. **No Database**: This app intentionally has no database. Configuration is in Vercel Blob, everything else is transient.

## Debugging Tips

### "Service Accounts do not have storage quota" error
- Domain-wide delegation not configured correctly
- Check `GOOGLE_IMPERSONATE_USER` is set and valid
- Verify OAuth scope in Google Workspace Admin Console

### "Permission denied" on folder access
- Shared Drive folder not shared with service account
- Service account needs "Editor" permissions
- Check folder ID extraction from URL

### Authentication not working
- Verify `SESSION_SECRET` is set
- Check password environment variables
- Clear browser cookies and try again

### Configuration not saving
- Check Vercel Blob token is valid
- Verify blob storage permissions
- Check browser console for errors

### Files uploading to wrong location
- Verify custom parent folder URL is correct
- Check folder sharing with service account
- Review Google Drive API logs

## Build and Deploy

### Local Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Deployment to Vercel
1. Connect GitHub repository to Vercel
2. Configure all required environment variables
3. Deploy automatically on push to main branch
4. Verify environment variables are set correctly
5. Test authentication and upload functionality

### Environment Variable Formatting
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: Use `\n` for newlines in Vercel
- Passwords: Use strong, unique values
- Secrets: Never commit to git, use `.env.local` for development

## Additional Resources

- See `README.md` for user-facing documentation
- See `SETUP_GUIDE.md` for detailed setup instructions
- See `CHANGELOG.md` for version history
- See `.env.example` for example environment variables

## Release & Notification Process

### When to Release

Release a new version when:
- **Patch (x.x.1)**: Bug fixes, small improvements, documentation updates
- **Minor (x.1.0)**: New features, significant improvements, API changes (backwards compatible)
- **Major (1.x.0)**: Breaking changes, major refactors, incompatible API changes

### Release Checklist

1. **Determine Version Number**
   - Review changes since last release
   - Decide on patch/minor/major based on scope
   - Follow semantic versioning (semver.org)

2. **Update Version in Code**
   - `package.json`: Update `version` field
   - `app/layout.tsx`: Update version in footer display (e.g., `v1.2.0`)

3. **Update CHANGELOG.md**
   - Add new section at top with version and date
   - Format: `## [X.Y.Z] - YYYY-MM-DD`
   - Organize changes by category:
     - **Added**: New features
     - **Changed**: Changes to existing functionality
     - **Fixed**: Bug fixes
     - **Deprecated**: Soon-to-be-removed features
     - **Removed**: Removed features
     - **Security**: Security fixes
   - Include admin notes if configuration or behavior changes
   - Be specific and user-focused in descriptions

4. **Create Admin Notification**
   - Edit `lib/configStore.ts` → `getInitialNotifications()` function
   - Add new notification at the TOP of the array (most recent first)
   - Use unique ID format: `v{version}-{short-description}`
   - Set appropriate type: `feature`, `update`, or `announcement`
   - Keep message concise but informative (2-3 sentences)
   - Set `dismissedBy: []` for new notifications
   - Use date format: `new Date('YYYY-MM-DD').toISOString()`

5. **Test Notification System**
   - Clear `adminSessionId` from localStorage to test popup
   - Verify popup appears once for new version
   - Check notification panel shows limited view (max 3)
   - Confirm "View full changelog" link works
   - Verify dismiss functionality works

### Admin Notification Guidelines

**Notification Panel Behavior:**
- Shows maximum 3 most recent notifications
- Displays count if more notifications exist ("Showing 3 of 5 notifications")
- "View full changelog" link directs to GitHub CHANGELOG.md
- Dismissed notifications show "Read" badge but remain visible
- Panel accessible from admin page notification icon

**One-Time Popup Behavior:**
- Appears automatically for admins on first visit after upgrade
- Shows ONLY the newest unread notification
- Dismissed via "Got it!" button
- Never shows again for that admin (tracked by `adminSessionId` in localStorage)
- Remains in notification panel history after dismissal

**Notification Message Best Practices:**
- Start with emoji relevant to type (🚀 feature, 🔔 update, 📢 announcement)
- Clear, concise title (5-7 words max)
- 2-3 sentence message explaining the change
- Focus on user benefit, not technical details
- Example: "You can now upload files of any size! The new chunked upload system supports files up to 5TB with real-time progress tracking."

### Example Notification

```typescript
{
  id: 'v1.2.0-large-file-upload',
  version: '1.2.0',
  title: '🚀 Large File Upload Support',
  message: 'You can now upload files of any size! The new chunked upload system supports files up to 5TB with real-time progress tracking. Large files (>100MB) will show a warning and upload time estimate.',
  type: 'feature' as const,
  createdAt: new Date('2025-12-25').toISOString(),
  dismissedBy: []
}
```

### Deploying a Release

1. Commit all version/changelog/notification changes
2. Push to main branch or create PR
3. Vercel automatically deploys on merge
4. Test in production:
   - Verify version in footer
   - Test notification popup (clear localStorage first)
   - Verify new feature works as expected
   - Check admin panel notification list

### Post-Release

1. Monitor for issues or user feedback
2. Document any discovered issues in GitHub issues
3. Plan hotfix if critical bug found (patch version)
4. Update documentation if needed
5. To test notification popup again: Clear admin session data from browser localStorage (look for `adminSessionId` key)

### Version History Reference

Track all versions in CHANGELOG.md, even minor patches. This serves as:
- Historical record of changes
- Source for "View full changelog" link
- Reference for future development
- User-facing documentation of improvements
