import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to handle authentication and role-based routing
 * - Protects routes that require authentication
 * - Redirects users to appropriate dashboard based on role (admin/superadmin)
 * - Redirects unauthenticated users to login
 * - Redirects authenticated users away from login pages
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Debug: Log the actual pathname at the start
  console.log(`📍 Middleware called for pathname: ${pathname}`);

  // Skip middleware for static assets and API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Get auth token from cookie (backend sets it as "access_token")
  const authToken = request.cookies.get("access_token")?.value;
  let refreshToken = request.cookies.get("refresh_token")?.value;
  
  // Debug: Log cookie status
  console.log("🍪 Cookie check - access_token:", !!authToken, "refresh_token:", !!refreshToken);

  // IMMEDIATELY validate and clear invalid refresh tokens
  if (refreshToken) {
    if (
      typeof refreshToken !== "string" ||
      refreshToken === "[object Object]" ||
      refreshToken.length < 10
    ) {
      console.error(
        "❌ Invalid refresh token detected, clearing immediately:",
        refreshToken
      );
      refreshToken = undefined;
      if (
        pathname !== "/login" &&
        pathname !== "/superadmin-login" &&
        !pathname.startsWith("/_next/") &&
        !pathname.startsWith("/api/")
      ) {
        const url = request.nextUrl.clone();
        // Determine which login page based on current route
        url.pathname = pathname.includes('/superadmin') ? "/superadmin-login" : "/login";
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.delete("refresh_token");
        redirectResponse.cookies.delete("access_token");
        return redirectResponse;
      }
      const response = NextResponse.next();
      response.cookies.delete("refresh_token");
      response.cookies.delete("access_token");
      return response;
    }
  }

  // Define auth routes (login pages)
  const authRoutes = ["/login", "/superadmin-login"];
  const isAuthRoute = authRoutes.includes(pathname);

  // Define protected routes
  const adminRoutes = ["/dashboard", "/create-user", "/create-match", "/create-team", "/group", "/session", "/business-report", "/delete-report", "/users", "/change-password", "/logout", "/match"];
  const superAdminRoutes = ["/superadmin"];
  
  const isAdminRoute = adminRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));
  const isSuperAdminRoute = superAdminRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));
  const isProtectedRoute = isAdminRoute || isSuperAdminRoute;

  // NOTE:
  // We intentionally do NOT refresh tokens in Next middleware.
  // Reason: refreshing here forces Next to set cookies itself, which can conflict
  // with the backend's cookie attributes (domain/secure) and create multiple
  // cookie variants. The browser-side API layer handles refresh seamlessly.

  // 1. Handle auth routes - redirect if already authenticated based on role
  if (isAuthRoute && (authToken || refreshToken)) {
    console.log("🔐 Auth route detected with token, validating...");

    try {
      const tokenToUse = authToken || refreshToken;

      // Try to validate with current token
      // Use common /me endpoint that works for both admin and superadmin
      const meEndpoint = '/v1/me';
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      
      // Get access token from cookies if available
      const accessTokenFromCookie = request.cookies.get("access_token")?.value;
      const refreshTokenFromCookie = request.cookies.get("refresh_token")?.value;
      
      // Build cookie header with both tokens
      const cookieParts: string[] = [];
      if (accessTokenFromCookie) {
        cookieParts.push(`access_token=${accessTokenFromCookie}`);
      }
      if (refreshTokenFromCookie) {
        cookieParts.push(`refresh_token=${refreshTokenFromCookie}`);
      }
      const cookieHeader = cookieParts.join('; ');
      
      const response = await fetch(
        `${apiBaseUrl}${meEndpoint}`,
        {
          method: "GET",
          credentials: 'include', // Include cookies for Sanctum stateful API
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Cookie": cookieHeader, // Send specific cookies like reference
            Authorization: `Bearer ${tokenToUse}`, // Also send as Bearer token as fallback
          },
        }
      );

      if (response.ok) {
        const userData = await response.json();
        const user = userData.data || userData.user || userData;
        const role = user.role || userData.role || null;

        console.log("✅ Valid token, user role:", role);

        // Determine redirect destination based on role
        let redirectPath = "/dashboard"; // default
        if (role === "superadmin" || role === "super_admin") {
          redirectPath = "/superadmin";
        } else if (role === "admin" || role === "user") {
          redirectPath = "/dashboard";
        }

        // User is authenticated, redirect to appropriate dashboard
        const redirectResponse = NextResponse.redirect(
          new URL(redirectPath, request.url)
        );

        return redirectResponse;
      } else {
        // CRITICAL: Use the actual pathname from the request, not a variable that might have changed
        const currentPathname = request.nextUrl.pathname;
        console.log(`❌ Token invalid (status: ${response.status}), allowing access to current auth page: ${currentPathname}`);
        // CRITICAL: Never redirect from /superadmin-login to /login
        // Always stay on the current auth page (login or superadmin-login)
        const nextResponse = NextResponse.next();
        nextResponse.cookies.delete("access_token");
        nextResponse.cookies.delete("refresh_token");
        // Explicitly ensure we stay on current pathname - no redirects
        console.log(`✅ Staying on current auth page: ${currentPathname} (original pathname was: ${pathname})`);
        return nextResponse;
      }
    } catch (error) {
      console.error("💥 Error validating token:", error);
      // CRITICAL: Use the actual pathname from the request, not a variable that might have changed
      const currentPathname = request.nextUrl.pathname;
      // CRITICAL: Never redirect from /superadmin-login to /login
      // Always stay on the current auth page (login or superadmin-login)
      const nextResponse = NextResponse.next();
      nextResponse.cookies.delete("access_token");
      nextResponse.cookies.delete("refresh_token");
      // Explicitly ensure we stay on current pathname - no redirects
      console.log(`✅ Error occurred, staying on current auth page: ${currentPathname} (original pathname was: ${pathname})`);
      return nextResponse;
    }
  }

  // 2. Handle protected routes - check authentication and role
  if (isProtectedRoute) {
    // If no tokens at all, redirect to appropriate login page
    if (!authToken && !refreshToken) {
      // CRITICAL: Don't redirect if already on a login page (prevent infinite loop and wrong redirects)
      const currentPathname = request.nextUrl.pathname;
      if (currentPathname === "/login" || currentPathname === "/superadmin-login") {
        console.log(`✅ Already on auth page (${currentPathname}), staying here`);
        return NextResponse.next();
      }
      console.log("🛡️ Protected route detected, no token found, redirecting to login");
      const url = request.nextUrl.clone();
      // Redirect to superadmin login if accessing superadmin routes, otherwise regular login
      url.pathname = isSuperAdminRoute ? "/superadmin-login" : "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Validate access token if it exists, or refresh if missing/expired
    let shouldRefresh = false;

    // If we have an access token, validate it first
            if (authToken) {
              try {
                // Use common /me endpoint that works for both admin and superadmin
                const meEndpoint = '/v1/me';
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        
        // Get access token from cookies if available
        const accessTokenFromCookie = request.cookies.get("access_token")?.value;
        const refreshTokenFromCookie = request.cookies.get("refresh_token")?.value;
        
        // Build cookie header with both tokens
        const cookieParts: string[] = [];
        if (accessTokenFromCookie) {
          cookieParts.push(`access_token=${accessTokenFromCookie}`);
        }
        if (refreshTokenFromCookie) {
          cookieParts.push(`refresh_token=${refreshTokenFromCookie}`);
        }
        const cookieHeader = cookieParts.join('; ');
        
        const validateResponse = await fetch(
          `${apiBaseUrl}${meEndpoint}`,
          {
            method: "GET",
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Cookie": cookieHeader, // Send specific cookies like reference
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (validateResponse.ok) {
          // Access token is valid, check role and route access
          const userData = await validateResponse.json();
          const user = userData.data || userData.user || userData;
          const role = user.role || userData.role || null;

          // Check if user has access to the requested route
          if (isSuperAdminRoute && role !== "superadmin" && role !== "super_admin") {
            console.log("❌ Super admin route accessed by non-superadmin user");
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard"; // Redirect to admin dashboard
            return NextResponse.redirect(url);
          }

          if (isAdminRoute && (role === "superadmin" || role === "super_admin")) {
            // Superadmin should NOT access admin routes - redirect to superadmin dashboard
            console.log("❌ Admin route accessed by superadmin, redirecting to superadmin dashboard");
            const url = request.nextUrl.clone();
            url.pathname = "/superadmin";
            return NextResponse.redirect(url);
          } else if (isAdminRoute && role !== "admin" && role !== "user") {
            console.log("❌ Admin route accessed by unauthorized user");
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
          }

          // User has valid token and correct role, allow request
          console.log("✅ Access token is valid, user has correct role");
          return NextResponse.next();
        } else if (validateResponse.status === 401 && refreshToken) {
          shouldRefresh = true;
        } else {
          if (refreshToken) {
            shouldRefresh = true;
          } else {
            // Don't redirect if already on login page
            if (pathname === "/login" || pathname === "/superadmin-login") {
              return NextResponse.next();
            }
            const url = request.nextUrl.clone();
            url.pathname = isSuperAdminRoute ? "/superadmin-login" : "/login";
            const response = NextResponse.redirect(url);
            response.cookies.delete("access_token");
            response.cookies.delete("refresh_token");
            return response;
          }
        }
      } catch (error) {
        console.error("💥 Error validating access token:", error);
        if (refreshToken) {
          shouldRefresh = true;
        } else {
          // Don't redirect if already on login page
          if (pathname === "/login" || pathname === "/superadmin-login") {
            return NextResponse.next();
          }
          const url = request.nextUrl.clone();
          url.pathname = isSuperAdminRoute ? "/superadmin-login" : "/login";
          const response = NextResponse.redirect(url);
          response.cookies.delete("access_token");
          response.cookies.delete("refresh_token");
          return response;
        }
      }
    } else {
      shouldRefresh = true;
    }

    // If access token is missing or expired, try to refresh
    if (shouldRefresh) {
      // If a refresh token exists, allow the page route and let the browser-side
      // API layer refresh seamlessly on the first API call.
      if (refreshToken) {
        console.log("🔓 Access token missing/expired, refresh token present: allowing request (no middleware refresh)");
        return NextResponse.next();
      }

      console.log("❌ Access token expired and no refresh token available");
      if (pathname === "/login" || pathname === "/superadmin-login") {
        return NextResponse.next();
      }
      const url = request.nextUrl.clone();
      url.pathname = isSuperAdminRoute ? "/superadmin-login" : "/login";
      const response = NextResponse.redirect(url);
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      return response;
    }
  }

  // 3. Handle root path "/" - check authentication and redirect based on role
  if (pathname === "/") {
    console.log("🏠 Root path detected, checking authentication...");
    
    // If no tokens, redirect to login
    if (!authToken && !refreshToken) {
      console.log("🛡️ No tokens found, redirecting to login");
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Validate token and redirect based on role
    try {
      const tokenToUse = authToken || refreshToken;

      // Use common /me endpoint that works for both admin and superadmin
      const meEndpoint = '/v1/me';
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      
      // Get access token from cookies if available
      const accessTokenFromCookie = request.cookies.get("access_token")?.value;
      const refreshTokenFromCookie = request.cookies.get("refresh_token")?.value;
      
      // Build cookie header with both tokens
      const cookieParts: string[] = [];
      if (accessTokenFromCookie) {
        cookieParts.push(`access_token=${accessTokenFromCookie}`);
      }
      if (refreshTokenFromCookie) {
        cookieParts.push(`refresh_token=${refreshTokenFromCookie}`);
      }
      const cookieHeader = cookieParts.join('; ');
      
      const response = await fetch(
        `${apiBaseUrl}${meEndpoint}`,
        {
          method: "GET",
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Cookie": cookieHeader,
            Authorization: `Bearer ${tokenToUse}`,
          },
        }
      );

      if (response.ok) {
        const userData = await response.json();
        const user = userData.data || userData.user || userData;
        const role = user.role || userData.role || null;

        console.log("✅ Valid token, user role:", role);

        // Determine redirect destination based on role
        let redirectPath = "/dashboard"; // default
        if (role === "superadmin" || role === "super_admin") {
          redirectPath = "/superadmin";
        } else if (role === "admin" || role === "user") {
          redirectPath = "/dashboard";
        }

        // User is authenticated, redirect to appropriate dashboard
        const redirectResponse = NextResponse.redirect(
          new URL(redirectPath, request.url)
        );

        return redirectResponse;
      } else {
        // Token invalid, redirect to appropriate login page
        const currentPathname = request.nextUrl.pathname;
        console.log(`❌ Token invalid (status: ${response.status}), redirecting to login`);
        // Check if current path is a superadmin route
        const isCurrentSuperAdminRoute = currentPathname.includes('/superadmin');
        const url = request.nextUrl.clone();
        url.pathname = isCurrentSuperAdminRoute ? "/superadmin-login" : "/login";
        const nextResponse = NextResponse.redirect(url);
        nextResponse.cookies.delete("access_token");
        nextResponse.cookies.delete("refresh_token");
        return nextResponse;
      }
    } catch (error) {
      console.error("💥 Error validating token for root path:", error);
      // On error, redirect to appropriate login page
      const currentPathname = request.nextUrl.pathname;
      const isCurrentSuperAdminRoute = currentPathname.includes('/superadmin');
      const url = request.nextUrl.clone();
      url.pathname = isCurrentSuperAdminRoute ? "/superadmin-login" : "/login";
      const nextResponse = NextResponse.redirect(url);
      nextResponse.cookies.delete("access_token");
      nextResponse.cookies.delete("refresh_token");
      return nextResponse;
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

