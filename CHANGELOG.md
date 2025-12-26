# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2025-12-26

### Added
- **Drag-and-Drop Upload**: Users can now drag and drop files directly onto the upload area
  - Visual feedback during drag operation with border highlighting
  - Seamless integration with existing click-to-select functionality
  - Works alongside the traditional file input method
- **Enhanced Progress Bar Design**: Improved upload progress visualization
  - Elegant gradient design with smooth animations
  - Prominent percentage display with better visibility
  - Enhanced time remaining estimate with improved formatting
  - Animated progress bar with smooth transitions

### Changed
- **File Input Experience**: Upload area now supports both drag-and-drop and click-to-select
- **Progress Feedback**: More polished and professional upload progress display

### Admin Notes
- No configuration changes required
- Both upload methods work identically - drag-and-drop or click to select
- Progress bar now provides clearer visual feedback during uploads

## [1.2.2] - 2025-12-26

### Added
- **Confirmation Dialog for Deletions**: Added confirmation dialog when deleting items in admin panel
  - Applies to clients, campaigns, and publications
  - Shows item name in confirmation message
  - Clear warning: "This action cannot be undone"
  - Keyboard support (Escape to cancel, Enter to confirm)
  - Consistent styling with existing UI components
  - Reusable ConfirmDialog component for future use

### Changed
- **Delete Behavior**: Items no longer deleted immediately on click
- **User Experience**: Prevents accidental deletions with confirmation step

### Admin Notes
- When clicking "Remove" on any item, a confirmation dialog will appear
- Press Escape to cancel or Enter to confirm deletion
- Dialog is accessible and follows existing modal patterns

## [1.2.1] - 2025-12-25

### Added
- **Changelog-Driven Notifications**: Admin notifications now automatically driven by CHANGELOG.md
  - Version-aware notification system reads from authoritative changelog
  - Semantic version comparison ensures correct version ordering
  - Admin state persisted in Vercel Blob storage (separate from config)
  - Popup shows only when new versions exist (> lastDismissedVersion)
  - Dismissal persists currentVersion to blob storage
- **Semver Utilities**: Proper semantic versioning comparison (1.2.10 > 1.2.2)
- **Changelog Parser**: Automatic extraction of version entries from CHANGELOG.md
- **Admin State API**: New `/api/admin-state` endpoint for state management

### Changed
- **Notification System**: Migrated from hardcoded notifications to changelog-driven approach
- **Persistence**: Admin dismissal state now in dedicated blob (admin-state/admin-state.json)
- **Version Source**: Application version from package.json shown in footer

### Fixed
- **Version Comparison**: No longer uses string comparison (prevents 1.2.2 > 1.2.10 bug)

### Admin Notes
- This is the new standard for release announcements
- Add new versions to CHANGELOG.md, system automatically shows popup
- State persists across deploys via Vercel Blob
- No manual notification creation needed anymore

## [1.2.0] - 2025-12-25

### Added
- **Large File Upload Support**: Chunked upload architecture supports files up to 5TB (Google Drive's limit)
  - 2MB chunks with backend proxy bypass Vercel's 4.5MB payload limit
  - Real-time progress tracking with percentage and estimated time remaining
  - File size display in human-readable format (KB/MB/GB)
  - Large file warning banner for uploads >100MB
  - Automatic retry logic with exponential backoff (3 attempts)
  - Enhanced error messages distinguishing network failures, timeouts, and server errors
- **New API Endpoints**: `/api/upload/initiate`, `/api/upload/proxy`, `/api/upload/complete`
- **Progress Feedback**: Real-time progress bar during uploads
- **Retry Logic**: Automatic retry on transient failures with exponential backoff
- **Version Display**: Application version now shown in footer
- **Limited Notification Panel**: Shows max 3 recent notifications with "View full changelog" link

### Changed
- **Upload Architecture**: Migrated from single-request to chunked upload approach
- **Body Size Limit**: Reduced from 500MB to 3MB (only handles chunks and metadata now)
- **Google Drive Integration**: Uses resumable upload protocol with Content-Range headers
- **Notification Panel**: Limited to 3 most recent items for better UX

### Fixed
- **413 Errors**: Files >4.5MB no longer fail with FUNCTION_PAYLOAD_TOO_LARGE
- **CORS Errors**: Backend proxy eliminates browser CORS restrictions  
- **Timeout Issues**: Chunked approach prevents timeouts on large files
- **Content-Range Errors**: Correct byte offset calculation ensures sequential chunk uploads
- **Progress Feedback**: Users now receive real-time feedback during uploads

### Admin Notes
- Chunked uploads work automatically - no configuration needed
- Small files (<2MB) upload in a single chunk for efficiency
- Network tab will show multiple `/api/upload/proxy` requests (one per chunk)
- Typical performance: ~1-2 minutes per 50MB file

## [1.1.0] - 2025-12-25

### Added
- **Edit Functionality**: Admins can now edit client, campaign, and publication names directly in the admin portal
  - Click the pencil icon next to any item to enter edit mode
  - Save changes with the checkmark icon or cancel with the X icon
  - Changes are saved immediately to the backend
- **Admin Notifications System**: New notification panel for admin users
  - One-time popup announcements for new features
  - Persistent notification history in the admin panel
  - Version-based changelog integration

### Changed
- Improved error handling with proper state rollback on save failures
- Enhanced user feedback with disabled save buttons when input is empty

## [1.0.0] - 2025-01-01

### Added
- Initial release of the eTearsheet Upload Portal
- Client, campaign, and publication management
- Google Drive integration for file uploads
- Admin and user role-based authentication
- Instant visibility controls for hiding/showing items
