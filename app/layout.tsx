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
<body className="min-h-screen">
<div className="max-w-6xl mx-auto p-6 space-y-6">
<header className="flex items-center justify-between mb-4 pb-4 border-b border-gray-300">
<a className="flex items-center space-x-3 hover:opacity-80 transition-opacity" href="/">
	<img src="/jja_white.svg" alt="JJA logo" className="h-10 w-auto" />
	<div>
		<div className="text-lg font-bold text-gray-900">Joseph Jacobs Advertising</div>
		<div className="text-sm text-gray-600">eTearsheet Upload Portal</div>
	</div>
</a>
{userRole && (
<nav className="flex items-center gap-3">
	<a className="btn-header" href="/">Upload</a>
	{userRole === 'admin' && <a className="btn-header" href="/admin">Admin Panel</a>}
	<form action="/api/logout" method="post"><button className="btn-header" type="submit">Logout</button></form>
</nav>
)}
</header>
{children}

<footer className="mt-8 border-t pt-4 text-sm text-center">
	<div className="flex flex-col sm:flex-row items-center justify-between gap-2">
		<div>
			<a href="/privacy" className="underline">Privacy Policy</a>
		</div>
		<div className="text-gray-700">Made with <span aria-hidden>❤️</span> in Teaneck, NJ</div>
		<div className="text-gray-600">© {new Date().getFullYear()} JJA</div>
		<div>
			<a className="btn" href="mailto:admin@josephjacobs.org">Contact Support</a>
		</div>
	</div>
	<div className="mt-2 text-xs text-gray-500">
		<code className="bg-gray-100 px-2 py-1 rounded">v{packageJson.version}</code>
	</div>
</footer>
</div>
</body>
</html>
);
}