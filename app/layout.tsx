import './globals.css';
import React from 'react';


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en">
<body className="min-h-screen">
<div className="max-w-4xl mx-auto p-6 space-y-6">
<header className="flex items-center justify-between">
<h1 className="text-2xl font-bold">Drive Upload Portal</h1>
<nav className="flex gap-3">
<a className="btn" href="/">Upload</a>
<a className="btn" href="/admin">Admin</a>
<form action="/api/logout" method="post"><button className="btn" type="submit">Logout</button></form>
</nav>
</header>
{children}
</div>
</body>
</html>
);
}