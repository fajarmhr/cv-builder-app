import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "cv-builder-session";
const AUTH_PAGES = ["/login", "/register"];
const PROTECTED_PREFIXES = ["/editor"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);

  // Logged-in users shouldn't see login/register.
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Guard protected pages (fast cookie check; layout re-verifies authoritatively).
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
