import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';


const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-secret');
const ALG = 'HS256';


export async function setRole(role: 'user'|'admin') {
const token = await new SignJWT({ role })
.setProtectedHeader({ alg: ALG })
.setIssuedAt()
.setExpirationTime('7d')
.sign(secret);
cookies().set('role', role, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
cookies().set('session', token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
}


export async function clearSession() {
cookies().delete('role');
cookies().delete('session');
}


export async function getRole(): Promise<'user'|'admin'|null> {
const token = cookies().get('session')?.value;
if (!token) return null;
try {
const { payload } = await jwtVerify(token, secret);
return (payload as any).role ?? null;
} catch {
return null;
}
}