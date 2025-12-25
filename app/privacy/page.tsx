export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-4 text-neutral-700">Last updated: August 21, 2025</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Overview</h2>
        <p className="text-neutral-700">This portal allows authorized users to upload files into Google Drive. Protecting privacy and personal data is important to us. This policy explains what data we collect, why we collect it, and how we handle it.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Data We Collect</h2>
        <ul className="list-disc pl-5 text-neutral-700">
          <li>Authentication tokens required to access a connected Google Drive are stored only for the duration necessary to perform uploads and are kept server-side.</li>
          <li>Minimal session information (role) is stored in a signed cookie to enable role-based access (user / admin).</li>
          <li>Uploaded files are sent directly to your Google Drive account and are stored there; this app does not persist file contents locally.</li>
          <li>Portal configuration (clients, campaigns, publications) is stored as JSON in your Vercel blob storage associated with the project.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">How We Use Data</h2>
        <p className="text-neutral-700">We use authentication tokens only to perform Google Drive operations on behalf of an authenticated admin. Session cookies are used solely to maintain role information for the portal. Configuration data powers the UI and is not shared outside of the deployment.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Third-Party Services</h2>
        <p className="text-neutral-700">This project integrates with Google Drive (Google LLC) and uses Vercel&apos;s blob storage. Please review their privacy policies for details about their data handling practices.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Retention and Deletion</h2>
        <p className="text-neutral-700">Authentication tokens may be revoked by an admin at any time by disconnecting Google Drive or clearing stored session cookies. Uploaded files should be managed directly inside your Google Drive. To remove configuration data, delete the config in the admin panel or reset the configuration in the deployment.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Security</h2>
        <p className="text-neutral-700">We recommend deploying this project on Vercel and keeping environment variables (OAuth secrets, session secret) safe. Use strong `SESSION_SECRET` values and rotate credentials when needed.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Contact</h2>
        <p className="text-neutral-700">For privacy questions about this portal, open an issue in the project repository or contact the project owner.</p>
      </section>

      <p className="text-sm text-neutral-500">This privacy policy is provided for informational purposes and may be updated. Please check this page for the latest version.</p>
    </div>
  );
}
