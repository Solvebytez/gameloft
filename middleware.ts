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

          // Helper function to get user role from API (uses common endpoint for both admin and superadmin)
          async function getUserRole(token: string): Promise<{ role: string | null; user: { id?: number; name?: string; email?: string; role?: string; [key: string]: unknown } | null }> {
            try {
              // Use common /me endpoint that works for both admin and superadmin
              const endpoint = '/v1/me';
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      
      // Get all cookies from the incoming request to forward them
      const cookieHeader = request.headers.get('cookie') || '';
      
      console.log(`🔍 Calling getUserRole - endpoint: ${endpoint}, token preview: ${token ? token.substring(0, 30) + '...' : 'null'}`);
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "GET",
        credentials: 'include', // Include cookies for Sanctum stateful API
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cookie": cookieHeader, // Forward cookies from Next.js request to backend
          Authorization: `Bearer ${token}`, // Also send as Bearer token as fallback
        },
      });

      console.log(`🔍 getUserRole response status: ${response.status}`);

      if (response.ok) {
        const userData = await response.json();
        console.log(`🔍 getUserRole response:`, JSON.stringify(userData));
        // Adjust these based on your API response structure
        const role = userData.data?.role || userData.role || userData.user?.role || null;
        console.log(`🔍 Extracted role: ${role} from structure:`, {
          'data.role': userData.data?.role,
          'role': userData.role,
          'user.role': userData.user?.role,
        });
        return { role, user: userData.data || userData.user || userData };
      } else {
        const errorText = await response.text().catch(() => '');
        console.error(`❌ getUserRole failed: ${response.status}`, errorText.substring(0, 200));
      }
      return { role: null, user: null };
    } catch (error) {
      console.error("Error fetching user role:", error);
      return { role: null, user: null };
    }
  }

  // Helper function to refresh token
  async function refreshAccessToken(refreshToken: string, isSuperAdmin: boolean = false): Promise<{ accessToken?: string; refreshToken?: string; isSuperAdmin?: boolean }> {
    try {
      // Determine which refresh endpoint to use
      // If isSuperAdmin is explicitly passed, use it, otherwise check pathname
      const refreshEndpoint = (isSuperAdmin || pathname.includes('/superadmin')) 
        ? '/v1/superadmin/refresh' 
        : '/v1/admin/refresh';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      
      console.log(`🔄 Attempting refresh at: ${apiUrl}${refreshEndpoint} (isSuperAdmin: ${isSuperAdmin || pathname.includes('/superadmin')})`);
      console.log(`🍪 Sending refresh_token cookie: ${refreshToken ? 'yes' : 'no'}`);
      
      const refreshResponse = await fetch(`${apiUrl}${refreshEndpoint}`, {
        method: "POST",
        credentials: 'include', // Include cookies
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cookie": `refresh_token=${refreshToken}`, // Send specific cookie like reference
        },
      });

      console.log(`🔄 Refresh response status: ${refreshResponse.status}`);

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json().catch(() => ({}));
        console.log(`✅ Refresh successful, response:`, refreshData);
        
        // Get new access token from response body (backend returns it)
        const newAccessToken = refreshData?.data?.access_token;
        
        // Also try to get from Set-Cookie header as fallback
        const setCookieHeader = refreshResponse.headers.get('set-cookie');
        console.log(`🍪 Set-Cookie header: ${setCookieHeader || 'none'}`);
        
        if (newAccessToken) {
          console.log(`✅ Got new access token from response body`);
          return { 
            accessToken: newAccessToken, 
            refreshToken: refreshToken, // Keep same refresh token
            isSuperAdmin: refreshEndpoint.includes('superadmin')
          };
        } else if (setCookieHeader) {
          // Parse from header as fallback
          const cookieMatch = setCookieHeader.match(/access_token=([^;]+)/);
          if (cookieMatch) {
            console.log(`✅ Extracted access_token from Set-Cookie header`);
            return { 
              accessToken: cookieMatch[1], 
              refreshToken: refreshToken,
              isSuperAdmin: refreshEndpoint.includes('superadmin')
            };
          }
        }
        
        // If refresh was successful but we can't get the token, still return success
        // The cookie might be set by the browser automatically
        console.log(`⚠️ Refresh successful but couldn't extract token, assuming cookie was set`);
        return { 
          accessToken: undefined, 
          refreshToken: refreshToken,
          isSuperAdmin: refreshEndpoint.includes('superadmin')
        };
      } else {
        const errorData = await refreshResponse.json().catch(() => ({}));
        console.error(`❌ Refresh failed: ${refreshResponse.status}`, errorData);
      }
      return {};
    } catch (error) {
      console.error("💥 Error refreshing token:", error);
      return {};
    }
  }

  // 1. Handle auth routes - redirect if already authenticated based on role
  if (isAuthRoute && (authToken || refreshToken)) {
    console.log("🔐 Auth route detected with token, validating...");

    try {
      let tokenToUse = authToken || refreshToken;
      let newAccessToken: string | undefined = undefined;
      let newRefreshToken: string | undefined = undefined;

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
      
      let response = await fetch(
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

      // If access token expired (401), try to refresh it
      if (!response.ok && response.status === 401 && refreshToken) {
        console.log("🔄 Access token expired, attempting to refresh...");
        // Determine if this is a superadmin route based on pathname
        const isSuperAdminRefresh = pathname.includes('/superadmin');
        console.log(`🔍 Auth route refresh - pathname: ${pathname}, isSuperAdminRefresh: ${isSuperAdminRefresh}`);
        const refreshResult = await refreshAccessToken(refreshToken, isSuperAdminRefresh);
        if (refreshResult.accessToken) {
          newAccessToken = refreshResult.accessToken;
          newRefreshToken = refreshResult.refreshToken;
          tokenToUse = newAccessToken;
          console.log("✅ Token refreshed successfully");

          // Retry /me with new token
          // Build cookie header with new access token
          const retryCookieParts: string[] = [];
          if (newAccessToken) {
            retryCookieParts.push(`access_token=${newAccessToken}`);
          }
          if (refreshToken) {
            retryCookieParts.push(`refresh_token=${refreshToken}`);
          }
          const retryCookieHeader = retryCookieParts.join('; ');
          
          response = await fetch(
            `${apiBaseUrl}${meEndpoint}`,
            {
              method: "GET",
              credentials: 'include', // Include cookies for Sanctum stateful API
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": retryCookieHeader, // Send specific cookies like reference
                Authorization: `Bearer ${newAccessToken}`, // Also send as Bearer token as fallback
              },
            }
          );
        }
      }

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

        // Set new tokens if refreshed
        if (newAccessToken) {
          const expires = new Date();
          expires.setMinutes(expires.getMinutes() + 15);
          redirectResponse.cookies.set("access_token", newAccessToken, {
            expires: expires,
            path: "/",
            sameSite: "lax",
          });
        }

        if (newRefreshToken && typeof newRefreshToken === "string" && newRefreshToken !== "[object Object]" && newRefreshToken.length >= 10) {
          const refreshExpires = new Date();
          refreshExpires.setDate(refreshExpires.getDate() + 30);
          redirectResponse.cookies.set("refresh_token", newRefreshToken, {
            expires: refreshExpires,
            path: "/",
            sameSite: "lax",
          });
        }

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
    let newAccessToken: string | undefined = undefined;
    let newRefreshToken: string | undefined = undefined;

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
      if (
        !refreshToken ||
        typeof refreshToken !== "string" ||
        refreshToken === "[object Object]" ||
        refreshToken.length < 50
      ) {
        console.log("❌ Access token expired and no valid refresh token available");
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

      console.log("🔄 Access token missing/expired, attempting to refresh...");

      try {
        // Determine if this is a superadmin route to use correct refresh endpoint
        // Check pathname for superadmin (includes /superadmin-login and /superadmin routes)
        const isSuperAdminRefresh = isSuperAdminRoute || pathname.includes('/superadmin');
        console.log(`🔍 Determining refresh endpoint - isSuperAdminRoute: ${isSuperAdminRoute}, pathname: ${pathname}, isSuperAdminRefresh: ${isSuperAdminRefresh}`);
        const refreshResult = await refreshAccessToken(refreshToken, isSuperAdminRefresh);

        if (refreshResult.accessToken) {
          newAccessToken = refreshResult.accessToken;
          newRefreshToken = refreshResult.refreshToken;
          console.log("✅ Token refreshed successfully in middleware");

          // Validate the new token and get user role (common endpoint works for both)
          console.log(`🔍 Getting user role from common /v1/me endpoint`);
          const userRoleResult = await getUserRole(newAccessToken);
          const role = userRoleResult.role;
          console.log(`👤 User role from refresh: ${role}`);

          // Check role-based access
          if (isSuperAdminRoute && role !== "superadmin" && role !== "super_admin") {
            console.log("❌ Super admin route accessed by non-superadmin user");
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
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

          // Set new tokens and allow request
          const response = NextResponse.next();
          const expires = new Date();
          expires.setMinutes(expires.getMinutes() + 15);
          if (newAccessToken) {
            response.cookies.set("access_token", newAccessToken, {
              expires: expires,
              path: "/",
              sameSite: "lax",
              httpOnly: true,
            });
            console.log("✅ Set access_token cookie in middleware response");
          }

          if (newRefreshToken && typeof newRefreshToken === "string" && newRefreshToken !== "[object Object]" && newRefreshToken.length >= 10) {
            const refreshExpires = new Date();
            refreshExpires.setDate(refreshExpires.getDate() + 30);
            response.cookies.set("refresh_token", newRefreshToken, {
              expires: refreshExpires,
              path: "/",
              sameSite: "lax",
              httpOnly: true,
            });
            console.log("✅ Set refresh_token cookie in middleware response");
          }

          return response;
        } else {
          console.log("❌ Token refresh failed");
        }
      } catch (error) {
        console.error("💥 Error refreshing token:", error);
      }

      // Refresh failed, redirect to appropriate login page
      console.log("❌ Token refresh failed, redirecting to login");
      // Don't redirect if already on login page (prevent infinite loop)
      if (pathname === "/login" || pathname === "/superadmin-login") {
        return NextResponse.next();
      }
      const url = request.nextUrl.clone();
      // Redirect to superadmin login if accessing superadmin routes, otherwise regular login
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
      let tokenToUse = authToken || refreshToken;
      let newAccessToken: string | undefined = undefined;
      let newRefreshToken: string | undefined = undefined;

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
      
      let response = await fetch(
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

      // If access token expired (401), try to refresh it
      if (!response.ok && response.status === 401 && refreshToken) {
        console.log("🔄 Access token expired, attempting to refresh...");
        const refreshResult = await refreshAccessToken(refreshToken, false);
        if (refreshResult.accessToken) {
          newAccessToken = refreshResult.accessToken;
          newRefreshToken = refreshResult.refreshToken;
          tokenToUse = newAccessToken;
          console.log("✅ Token refreshed successfully");

          // Retry /me with new token
          const retryCookieParts: string[] = [];
          if (newAccessToken) {
            retryCookieParts.push(`access_token=${newAccessToken}`);
          }
          if (refreshToken) {
            retryCookieParts.push(`refresh_token=${refreshToken}`);
          }
          const retryCookieHeader = retryCookieParts.join('; ');
          
          response = await fetch(
            `${apiBaseUrl}${meEndpoint}`,
            {
              method: "GET",
              credentials: 'include',
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": retryCookieHeader,
                Authorization: `Bearer ${newAccessToken}`,
              },
            }
          );
        }
      }

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

        // Set new tokens if refreshed
        if (newAccessToken) {
          const expires = new Date();
          expires.setMinutes(expires.getMinutes() + 15);
          redirectResponse.cookies.set("access_token", newAccessToken, {
            expires: expires,
            path: "/",
            sameSite: "lax",
          });
        }

        if (newRefreshToken && typeof newRefreshToken === "string" && newRefreshToken !== "[object Object]" && newRefreshToken.length >= 10) {
          const refreshExpires = new Date();
          refreshExpires.setDate(refreshExpires.getDate() + 30);
          redirectResponse.cookies.set("refresh_token", newRefreshToken, {
            expires: refreshExpires,
            path: "/",
            sameSite: "lax",
          });
        }

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

