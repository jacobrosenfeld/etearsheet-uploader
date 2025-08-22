'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';


export default function LoginPage() {
const params = useSearchParams();
const router = useRouter();
const [password, setPassword] = useState('');


return (
<div className="card max-w-md mx-auto">
<h2 className="text-xl font-semibold mb-4">Enter Portal Password</h2>
<form method="post" action="/api/auth/init" className="space-y-3">
<input type="hidden" name="from" value={params.get('from') || '/'} />
<label className="label">Password</label>
<input className="input" name="portal_password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
<div className="text-sm text-neutral-500">Use admin password for admin access.</div>
<button className="btn btn-primary" type="submit">Continue</button>
</form>
</div>
);
}