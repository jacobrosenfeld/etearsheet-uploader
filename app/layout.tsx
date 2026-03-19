import './globals.css';
import React from 'react';
import { getRole } from '@/lib/sessions';
import packageJson from '../package.json';


export default async function RootLayout({ children }: { children: React.ReactNode }) {
const userRole = await getRole();
return (
<html lang="en">
  <head>
    <title>JJA eTearsheet Uploader</title>
    <link rel="icon" href="/favicon.svg" />
    <link rel="icon" href="/favicon-light.svg" media="(prefers-color-scheme: light)" />
    <link rel="icon" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)" />
    <meta name="description" content="JJA - eTearsheet upload portal for publications to submit ad tear sheets." />
  </head>
  <body className="min-h-screen bg-slate-50 flex flex-col">

    <header className="bg-brand shadow-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a className="flex items-center space-x-3 hover:opacity-85 transition-opacity" href="/">
          <img src="/jja_white.svg" alt="JJA logo" className="h-10 w-auto" />
          <div>
            <div className="text-base font-bold text-white leading-tight">Joseph Jacobs Advertising</div>
            <div className="text-xs text-white/65 leading-tight">eTearsheet Upload Portal</div>
          </div>
        </a>
        {userRole && (
          <nav className="flex items-center gap-2">
            <a className="btn-header" href="/">Upload</a>
            {userRole === 'admin' && <a className="btn-header" href="/admin">Admin Panel</a>}
            <form action="/api/logout" method="post">
              <button className="btn-header" type="submit">Logout</button>
            </form>
          </nav>
        )}
      </div>
    </header>

    <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
      {children}
    </main>

    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-4 text-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <a href="/privacy" className="hover:text-brand transition-colors underline underline-offset-2">Privacy Policy</a>
          <div>Made with <span aria-hidden>❤️</span> in Teaneck, NJ</div>
          <div>© {new Date().getFullYear()} Joseph Jacobs Advertising</div>
          <a className="btn text-xs py-1.5" href="mailto:admin@josephjacobs.org">Contact Support</a>
        </div>
        <div className="mt-3 text-center text-xs text-slate-400">
          <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">v{packageJson.version}</code>
        </div>
      </div>
    </footer>

  </body>
</html>
);
}
