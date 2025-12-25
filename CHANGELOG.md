# Changelog

All notable changes to this project will be documented in this file.

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
