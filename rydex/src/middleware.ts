import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for simple rate-limiting
// Note: In a serverless/edge environment, this map won't be shared across all isolates,
// but it provides basic protection when a central store (like Redis) is unavailable.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  // Only apply rate limiting to /api/ routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get client IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    '127.0.0.1';

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 100; // max 100 requests per minute per IP

  const currentData = rateLimitMap.get(ip);
  if (!currentData || currentData.resetTime < now) {
    // New IP or window expired
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
  } else {
    if (currentData.count >= maxRequests) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests, please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    currentData.count++;
  }

  // Optional: Add some standard security headers as a best practice
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set(
    'X-RateLimit-Remaining',
    (maxRequests - (rateLimitMap.get(ip)?.count || 0)).toString()
  );

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
