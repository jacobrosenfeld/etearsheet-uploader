'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const error = params.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'badpass': return 'Incorrect password. Please try again.';
      case 'missing_password': return 'Please enter a password.';
      default: return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('password', password);
      formData.set('from', params.get('from') || '/');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData
      });

      if (response.redirected) {
        window.location.href = response.url;
      } else if (!response.ok) {
        router.push('/login?error=badpass');
      }
    } catch (error) {
      console.error('Login error:', error);
      router.push('/login?error=badpass');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Brand accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-brand to-brand-hover" />

        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Portal Login</h2>
              <p className="text-xs text-slate-400">Secure access required</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 mb-5">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-red-700">
                {getErrorMessage(error) || `Error: ${error}`}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter portal or admin password"
              />
            </div>
            <p className="text-xs text-slate-400">
              Use the portal password for upload access, or the admin password for configuration.
            </p>
            <button
              className="btn-primary w-full justify-center"
              type="submit"
              disabled={isSubmitting || !password.trim()}
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Logging in…
                </>
              ) : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto mt-4">
        <div className="card animate-pulse h-64" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
