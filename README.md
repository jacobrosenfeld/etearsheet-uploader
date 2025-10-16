# JJA eTearsheet Uploader

A simple Next.js app that allows publications to upload eTearsheets directly to a Google Drive folder structure with no authentication required.

## Features

- **No user authentication** - Public upload form
- **Service Account authentication** - Hardcoded Google Drive access
- **Automatic folder hierarchy**: JJA eTearsheets → Client → Campaign → Publication → Publication_date_filename.ext
- **Automatic file naming**: Files are named with publication_YYYY-MM-DD_originalname.ext format

## Quick setup (local)

### 1. Create a Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Go to IAM & Admin → Service Accounts
5. Create a service account (e.g., "etearsheet-uploader")
6. Create and download a JSON key file
7. Share your Google Drive folder with the service account email (give it Editor permissions)

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env.local` file with your service account credentials:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note**: Copy the `client_email` and `private_key` fields from your downloaded JSON key file.

### 4. Run the dev server

```bash
npm run dev
```

Open: http://localhost:3000

## Environment variables

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — Service account email from JSON key file
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — Private key from JSON key file (include the newlines as `\n`)
- `NEXT_PUBLIC_APP_URL` — Public URL for the app (optional)

When deploying (Vercel, etc.) set these as environment variables in your deployment settings.## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add the environment variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel domain)
4. Deploy

## Admin Configuration

You can manage the portal configuration (clients, campaigns, publications) through the admin panel at `/admin`. The configuration is stored in Vercel Blob storage.

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

**"Missing Google Service Account credentials" error:**
- Ensure both `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are set in your environment variables
- Make sure the private key includes the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- In the environment variable, newlines should be actual `\n` characters

**Upload fails:**
- Check that the service account has been granted Editor permissions on the Google Drive folder
- Verify the Google Drive API is enabled in your Google Cloud project
- Check Vercel logs for detailed error messages

## Contributing / Contact

Open an issue or contact admin@josephjacobs.org for help.

---

Small README — let me know if you'd like a longer deploy guide (Vercel settings, environment checklist, or CI steps).