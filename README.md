Google Drive Upload Portal — Next.js (Vercel)

This is a production-ready, password-protected upload portal with Google OAuth (Drive read/write) and an admin panel to manage lists of Clients, Campaigns, and Publications.

It enforces the selection order Publication → Client → Campaign → Date while still uploading into the Drive folder structure Client/⟶ Campaign/⟶ Publication/⟶ Date (folders auto-created as needed).

Project Structure

/drive-upload-portal
├─ app
│ ├─ api
│ │ ├─ auth
│ │ │ ├─ init
│ │ │ │ └─ route.ts
│ │ │ └─ callback
│ │ │ └─ route.ts
│ │ ├─ upload
│ │ │ └─ route.ts
│ │ ├─ config
│ │ │ └─ route.ts
│ │ └─ logout
# Drive Upload Portal

A polished, lightweight upload portal built with Next.js and designed for deployment on Vercel. The portal lets authorized users upload files into a structured Google Drive folder hierarchy (Client → Campaign → Publication → Date) while keeping configuration in a blob stored via Vercel's blob API.

This README covers setup, development, deployment, and troubleshooting tips so you can get the app running quickly.

---

## Features

- Google OAuth2 for Drive access
- Upload files into a nested folder structure (folders auto-created)
- Configuration (clients, campaigns, publications) stored as JSON via `@vercel/blob`
- Simple role-based sessions (user / admin) using signed cookies
- Built with Next.js app router and Tailwind for a small, focused UI

---

## Quick Start

Clone and install:

```bash
git clone https://github.com/jacobrosenfeld/etearsheet-uploader.git
cd etearsheet-uploader
npm install
```

Create a `.env.local` (see Environment Variables below), then run the dev server:

```bash
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

Create a `.env.local` at the project root with the following keys:

- `GOOGLE_CLIENT_ID` — OAuth client ID
- `GOOGLE_CLIENT_SECRET` — OAuth client secret
- `GOOGLE_REDIRECT_URI` — OAuth redirect URL (e.g. `https://your-deploy.vercel.app/api/auth/callback`)
- `PORTAL_PASSWORD` — password for normal users
- `ADMIN_PASSWORD` — password for admin users
- `SESSION_SECRET` — secret used to sign session tokens
- `APP_CONFIG_BLOB_KEY` — blob key for the portal config (defaults to `config/upload-portal-config.json`)

When deploying to Vercel, set these variables in the Project Settings.

---

## Project Structure (high level)

- `app/` — Next.js app routes and UI (app router)
	- `app/api/` — server API routes (auth, upload, config, logout)
	- `app/page.tsx` — main upload UI
- `lib/` — server helpers: Google Drive, config store, session utils
- `package.json`, `tsconfig.json`, `next.config.js` — project config

---

## How it works

- Auth: OAuth2 handled server-side; tokens are stored via a `lib/google` helper. The portal requests Drive file permissions and stores tokens for subsequent API calls.
- Upload: The UI posts `FormData` to `/api/upload`. The server ensures the nested folder path exists and uploads the file using the Drive API.
- Config: `lib/configStore.ts` reads/writes `PortalConfig` JSON via `@vercel/blob`.

---

## Deployment on Vercel

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add environment variables in the Vercel dashboard.
4. Deploy — Vercel runs `npm run build` which runs `next build`.

If you see module resolution errors for `@/` imports locally, ensure your editor respects `tsconfig.json` `baseUrl` and `paths` settings. Vercel's build uses the project `tsconfig.json` automatically.

---

## Troubleshooting & Tips

- Missing `@vercel/blob` errors: ensure `@vercel/blob` is in `dependencies` and installed.
- `Buffer` / `process` type errors during TypeScript checks: install types with `npm i -D @types/node`.
- If OAuth flow fails, double-check `GOOGLE_REDIRECT_URI` matches the URL configured in your Google Cloud OAuth client.

---

## Next steps / Improvements

- Add unit & integration tests for `lib/*` functions and API routes
- Implement secure persistent token storage (DB / encrypted secret store) instead of placeholder session storage
- Add an admin UI to edit the config directly from the portal

---

## Contributing

PRs and issues welcome. Please keep changes small and focused. Add tests when changing behavior.

---

## License

No license file is included — add one (e.g. MIT) if you want to publish this code.

---

Enjoy! ✨