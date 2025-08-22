'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();

  return (
    <div className="card max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Enter Portal Password</h2>
      <form method="post" action="/api/auth/init" className="space-y-3">
        <input type="hidden" name="from" value={params.get('from') || '/'} />
        <label className="label">Password</label>
        <input className="input" name="portal_password" type="password" />
        <div className="text-sm text-neutral-500">Use admin password for admin access.</div>
        <button className="btn btn-primary" type="submit">Continue</button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card max-w-md mx-auto">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}