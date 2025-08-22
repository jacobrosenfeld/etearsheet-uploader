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
      case 'server_error': return 'Server error. Please try again later.';
      default: return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.set('portal_password', password);
      formData.set('from', params.get('from') || '/');
      
      const response = await fetch('/api/auth/init', {
        method: 'POST',
        body: formData
      });
      
      if (response.redirected) {
        window.location.href = response.url;
      } else if (!response.ok) {
        // Handle error response
        router.push('/login?error=server_error');
      }
    } catch (error) {
      console.error('Login error:', error);
      router.push('/login?error=server_error');
    } finally {
      setIsSubmitting(false);
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="label">Password</label>
        <input 
          className="input" 
          name="portal_password" 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
        />
        <div className="text-sm text-neutral-500">Use admin password for admin access.</div>
        <button 
          className="btn btn-primary" 
          type="submit"
          disabled={isSubmitting || !password.trim()}
        >
          {isSubmitting ? 'Logging in...' : 'Continue'}
        </button>
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