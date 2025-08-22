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
│ │ └─ route.ts
│ ├─ admin
│ │ └─ page.tsx
│ ├─ login
│ │ └─ page.tsx
│ ├─ page.tsx
│ └─ layout.tsx
├─ lib
│ ├─ google.ts
│ ├─ session.ts
│ └─ types.ts
├─ middleware.ts
├─ package.json
├─ next.config.js
├─ tsconfig.json
├─ postcss.config.js
├─ tailwind.config.ts
├─ .env.example
└─ app/globals.css