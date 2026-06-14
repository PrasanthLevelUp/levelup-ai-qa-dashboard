import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'levelup_session';

/**
 * Resolve the JWT secret used to VERIFY the `levelup_session` cookie.
 *
 * The cookie is SIGNED by the backend API (levelup-ai-qa-agent) and verified
 * here in the dashboard's Edge middleware. Both services MUST use the exact
 * same `JWT_SECRET`. If they differ, login succeeds but every authenticated
 * request (e.g. GET /api/auth/me) fails verification and returns 401 —
 * surfacing in the UI as "Signed in, but your session could not be
 * established." See docs / jwt-secret-setup.md.
 *
 * The previous code silently fell back to a weak shared default when
 * `JWT_SECRET` was unset, which is exactly how the two services drift apart
 * without any signal. We can't `throw` at module load here: this is Edge
 * middleware, and throwing would 500 the ENTIRE app — including the /login
 * page — leaving no way to recover. Instead we log loudly (once per cold
 * start) so the misconfiguration is visible in deploy logs, and still fall
 * back in non-production so local dev works without setup.
 */
const MIN_JWT_SECRET_LENGTH = 32;
const DEV_FALLBACK_SECRET = 'levelup-jwt-secret-change-in-production';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const tooShort = !secret || secret.length < MIN_JWT_SECRET_LENGTH;

  if (tooShort && process.env.NODE_ENV === 'production') {
    // Loud, actionable error in deploy logs — but do NOT throw (see above).
    console.error(
      '[middleware] CRITICAL: JWT_SECRET is ' +
        (secret ? 'too short (<32 chars)' : 'not set') +
        ' in production. Session verification will FAIL for every user ' +
        '(login succeeds, but /api/auth/me returns 401). Set JWT_SECRET to the ' +
        'IDENTICAL value used by the backend API and redeploy the dashboard.',
    );
  }

  return secret || DEV_FALLBACK_SECRET;
}

const JWT_SECRET = new TextEncoder().encode(resolveJwtSecret());

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
  '/images',
  '/icons',
  '/demo-video',
  '/reels',
  '/pricing',
];

// File extensions that should never be auth-gated
const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|webp|webmanifest|json|xml|txt|woff|woff2|ttf|eot|css|js|map)$/;

function isPublicPath(pathname: string): boolean {
  if (STATIC_EXTENSIONS.test(pathname)) return true;
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    // Page routes redirect to login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // Token invalid or expired
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', req.url));

    // Clear invalid cookie
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    // Match all paths except static files and public assets
    '/((?!_next/static|_next/image|favicon\\.ico|favicon-.*\\.png|logo.*\\.png|apple-touch-icon\\.png|og-.*\\.jpg|og-.*\\.png|manifest\\.webmanifest|images|icons).*)',
  ],
};
