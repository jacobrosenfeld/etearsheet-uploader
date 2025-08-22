# JJA eTearsheet Uploader

A small Next.js app to let publications upload eTearsheets to a Google Drive folder structure. The app supports an admin who configures Google Drive (via OAuth) and regular users who can upload without authorizing Google.

## Features

- Admin-only Google Drive setup (OAuth)
- Regular user uploads without Google auth
- Automatic Drive folder hierarchy: Root → Client → Campaign → Date
- Role-based sessions (admin / user)
- Simple password-based portal login

## Quick setup (local)

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a `.env.local` with at least the following values (examples):

   ```
   PORTAL_PASSWORD=some-portal-password
   ADMIN_PASSWORD=some-admin-password
   SESSION_SECRET=long-random-secret
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   # Google OAuth (only required if you will configure Google Drive via Admin)
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
   ```

3. Run the dev server

   ```bash
   npm run dev
   ```

   Open: http://localhost:3000/login

## Environment variables

- `PORTAL_PASSWORD` — password for general users
- `ADMIN_PASSWORD` — password that grants admin access
- `SESSION_SECRET` — secret for signing JWT session cookies (required)
- `NEXT_PUBLIC_APP_URL` — public URL for redirects (optional, helpful in prod)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — for admin Google Drive OAuth

  When deploying (Vercel, etc.) set these as environment variables in your deployment settings.

## Middleware and public assets

This app uses a middleware to protect routes. Public routes and assets must be listed in `middleware.ts`'s `PUBLIC_PATHS`. Common public entries include:

- `/login` and login assets
- `/privacy`
- favicon and logo files such as `/favicon.svg`, `/favicon-light.svg`, `/favicon-dark.svg`, `/jja_white.svg`, etc.

If logos or favicons don't load before login, add their paths to `PUBLIC_PATHS`.

## Logout / login 405 troubleshooting

If you see a 405 when clicking "Logout" and returning to `/login`:

- Ensure `app/api/logout/route.ts` handles POST and returns a redirect using the incoming request URL (the code should use `new URL('/login', request.url)`).
- Verify `/login` is included in `middleware.ts`'s `PUBLIC_PATHS`.
- Ensure session cookies are cleared (see `lib/sessions.ts`) and `SESSION_SECRET` is set.

## Admin tasks

- Log in with the admin password to access `/admin`.
- From the admin panel, authenticate the app with Google to configure Drive settings and create the root folder.

## Notes

- Token storage is currently in-memory / ephemeral for development. Persist tokens in production if you need long-lived access.
- Keep `SESSION_SECRET` secure.

## Contributing / Contact

Open an issue or contact admin@josephjacobs.org for help.

---

Small README — let me know if you'd like a longer deploy guide (Vercel settings, environment checklist, or CI steps).