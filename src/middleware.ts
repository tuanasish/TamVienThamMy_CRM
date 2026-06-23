import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths to check
  const isStaffPath = pathname.startsWith("/staff");
  const isCustomerPath = pathname.startsWith("/customer");

  if (!isStaffPath && !isCustomerPath) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("spa_crm_session");

  if (!sessionCookie) {
    // Redirect to login if no cookie
    const loginUrl = new URL("/login", request.url);
    if (isStaffPath) {
      loginUrl.searchParams.set("role", "staff");
    } else {
      loginUrl.searchParams.set("role", "customer");
    }
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    
    // Check staff role
    if (isStaffPath && session.role !== "staff") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("role", "staff");
      return NextResponse.redirect(loginUrl);
    }

    // Check customer role
    if (isCustomerPath && session.role !== "customer") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("role", "customer");
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    // Cookie was invalid/corrupted
    const loginUrl = new URL("/login", request.url);
    if (isStaffPath) {
      loginUrl.searchParams.set("role", "staff");
    } else {
      loginUrl.searchParams.set("role", "customer");
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/staff/:path*", "/customer/:path*"],
};
