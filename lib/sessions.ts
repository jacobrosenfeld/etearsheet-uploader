import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-change-me'
);

export async function createSession(role: 'user' | 'admin') {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(SESSION_SECRET);

  (await cookies()).set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as { role: 'user' | 'admin' };
  } catch {
    return null;
  }
}

export async function getRole() {
  const session = await getSession();
  return session?.role || null;
}

export async function clearSession() {
  (await cookies()).delete('session');
}

export function getUserEmail(): string | null {
  // In production, this would come from authentication
  // For now, use the impersonated user email from environment
  return process.env.GOOGLE_IMPERSONATE_USER || null;
}
