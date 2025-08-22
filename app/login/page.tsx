'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const error = params.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'badpass': return 'Incorrect password. Please try again.';
      case 'missing_password': return 'Please enter a password.';
      case 'server_error': return 'Server error. Please try again later.';
      default: return null;
    }
  };

  return (
    <div className="card max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Enter Portal Password</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <div className="text-red-700 text-sm">
            {getErrorMessage(error) || `Error: ${error}`}
          </div>
        </div>
      )}
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