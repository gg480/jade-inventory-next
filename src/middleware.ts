import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  '/api/auth',       // login / session check / logout
  '/api/stats/quick', // lightweight public stats for footer
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Validate session token from Authorization header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { code: 401, data: null, message: '未登录或会话已过期' },
      { status: 401 },
    );
  }

  // Validate token via internal API call to avoid direct DB access in middleware
  try {
    const validateUrl = new URL('/api/auth', request.url);
    const validateRes = await fetch(validateUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const validateData = await validateRes.json();

    if (validateData.code !== 0) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录或会话已过期' },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { code: 401, data: null, message: '未登录或会话已过期' },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
