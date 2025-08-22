import './globals.css';
import React from 'react';


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en">
<body className="min-h-screen">
<div className="max-w-4xl mx-auto p-6 space-y-6">
<header className="flex items-center justify-between">
<h1 className="text-2xl font-bold">JJA eTearsheet Upload Portal</h1>
<nav className="flex gap-3">
<a className="btn" href="/">Upload</a>
<a className="btn" href="/admin">Admin</a>
<form action="/api/logout" method="post"><button className="btn" type="submit">Logout</button></form>
</nav>
</header>
{children}

<footer className="mt-8 border-t pt-4 text-sm text-center">
	<div className="flex flex-col sm:flex-row items-center justify-between gap-2">
		<div>
			<a href="/privacy" className="underline">Privacy</a>
		</div>
		<div className="text-gray-700">Made with <span aria-hidden>❤️</span> in Teaneck, NJ</div>
		<div className="text-gray-600">© {new Date().getFullYear()} Joseph Jacobs Advertising</div>
		<div>
			<a className="btn" href="mailto:admin@josephjacobs.org">Contact Support</a>
		</div>
	</div>
</footer>
</div>
</body>
</html>
);
}