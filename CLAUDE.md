# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JJA eTearsheet Uploader is a Next.js 14 App Router application for securely uploading marketing tearsheets to Google Drive with automatic folder organization. Users authenticate via password, select client/campaign/publication metadata, and upload files that are automatically named and routed to a nested Google Drive folder hierarchy.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server on port 3000
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
```

No test suite exists in this project.

## Architecture

### Authentication

Two-tier password system: `PORTAL_PASSWORD` (upload only) and `ADMIN_PASSWORD` (upload + config). Passwords are validated in `app/api/auth/login/route.ts`, which issues JWT sessions stored as HTTP-only cookies (24h expiry, signed with `SESSION_SECRET`). `middleware.ts` enforces session on all routes except `/login`, `/privacy`, and static assets. Admin-only routes additionally check role via `lib/sessions.ts:getRole()`.

### File Upload (Large File Strategy)

Vercel limits request bodies to ~4.5MB. To support larger files, uploads use a two-step resumable approach:
1. `POST /api/upload/initiate` — creates a Google Drive resumable upload session, returns the upload URL
2. Browser uploads file chunks **directly to Google Drive** (bypasses Vercel entirely)
3. `POST /api/upload/complete` — verifies completion and retrieves metadata

`app/api/upload/route.ts` (the original single-step route) is deprecated. The main upload UI in `app/page.tsx` uses the initiate/complete flow.

### Google Drive Integration (`lib/google.ts`)

Uses a Service Account with **domain-wide delegation** to impersonate a real Google Workspace user (`GOOGLE_IMPERSONATE_USER`). Files are stored in that user's Drive quota. Requires the full `drive` OAuth scope (not `drive.file`) to support Shared Drives.

Folder hierarchy: `[Custom Root or "JJA eTearsheets"] → Client → Campaign → Publication`
File naming: `publication_YYYY-MM-DD_originalname.ext`

`findOrCreateFolder()` / `ensureFolderPath()` recursively create the folder structure on each upload.

### Configuration Storage (`lib/configStore.ts`)

All configuration (clients, campaigns, publications, drive settings) is stored as JSON in **Vercel Blob** — no database, no filesystem. `readConfig()` / `writeConfig()` abstract blob operations. Admin changes save immediately; there is no "Save All" button.

### Admin Notification System

CHANGELOG.md is the source of truth for version notifications. On admin page load:
- `lib/changelog.ts` parses CHANGELOG.md into structured version entries
- `lib/semver.ts` compares versions semantically (handles 1.2.10 > 1.2.2)
- `lib/adminState.ts` reads `lastDismissedVersion` from Vercel Blob
- `app/components/VersionNotifications.tsx` renders the popup and notification panel

## Version Management

**Always increment the version for any PR.**

- `package.json`: update `version` field
- `CHANGELOG.md`: add a new `## [X.Y.Z] - YYYY-MM-DD` section at the top

Changelog detail levels by version type:
- **Patch (x.x.Z)**: Short 2-line summary
- **Minor (x.Y.0)**: Detailed feature descriptions
- **Major (X.0.0)**: Comprehensive entry with migration notes

Admin notifications are auto-generated from CHANGELOG.md — no manual notification steps needed.

## Important Constraints

- **Google Workspace required**: Domain-wide delegation requires Google Workspace (not personal Gmail). Don't suggest personal OAuth flows.
- **Vercel Blob is required**: Config storage is intentionally blob-based. Don't suggest filesystem or database alternatives.
- **Folder hierarchy is fixed business logic**: Client → Campaign → Publication structure is not configurable.
- **File naming is automatic and non-optional**: `publication_YYYY-MM-DD_originalname.ext` format enforces consistency.
- **Alphabetical sorting is a UX requirement**: All dropdowns/lists must remain sorted alphabetically.
- **No database**: The app is intentionally stateless except for Vercel Blob.
