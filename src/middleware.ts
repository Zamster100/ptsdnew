import { NextRequest, NextResponse } from 'next/server'

// The PTSD Crash game uses relative asset URLs, so it must be opened at /crash/.
// (next.config.js sets skipTrailingSlashRedirect so Next doesn't strip the slash.)
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/crash') {
    // Set Location by hand: NextResponse.redirect(url) drops the trailing slash.
    return new NextResponse(null, { status: 307, headers: { location: new URL('/crash/', request.url).href } })
  }
  return NextResponse.next()
}

export const config = { matcher: ['/crash'] }
