import { NextRequest, NextResponse } from 'next/server';

/**
 * Survey phase mappings for route protection
 */
const SURVEY_PHASE_ROUTES = {
  '/onboarding/welcome': 0,
  '/onboarding/phase1': 1,
  '/onboarding/phase2': 2,
  '/onboarding/reflection': 3,
  '/onboarding/results': 4,
} as const;

/**
 * Routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/onboarding',
  '/habits',
  '/journal',
  '/tazkiyah',
  '/checkin'
];

/**
 * Check if user is authenticated by looking for session cookie
 * In a real app, you'd validate the JWT token here
 */
function isAuthenticated(request: NextRequest): boolean {
  // Check for authentication cookie (from Supabase auth)
  const authCookie = request.cookies.get('sb-access-token') ||
                     request.cookies.get('supabase-auth-token') ||
                     request.cookies.get('auth-token');

  // For development mode, also check for mock auth
  const isDev = process.env.NODE_ENV === 'development';
  const mockAuth = request.cookies.get('mock-auth');

  return !!(authCookie?.value || (isDev && mockAuth?.value));
}

/**
 * Get user's survey progress from API
 */
async function getSurveyProgress(request: NextRequest): Promise<{
  currentPhase: number;
  isCompleted: boolean;
  canAccessPhase: (phase: number) => boolean;
} | null> {
  try {
    // Call the backend API to get real survey progress
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
    const progressResponse = await fetch(`${baseUrl}/v1/onboarding/progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (progressResponse.ok) {
      const progressData = await progressResponse.json();
      const progress = progressData.data.progress;

      return {
        currentPhase: progress.currentPhase,
        isCompleted: progress.isCompleted,
        canAccessPhase: (phase: number) => {
          // Allow access to current phase and any previous completed phases
          if (progress.isCompleted) {
            return true; // Allow access to all phases if survey is completed
          }

          // Allow access based on completion status of each phase
          if (phase === 0) return true; // Always allow welcome
          if (phase === 1) return progress.currentPhase >= 1; // Allow phase1 if we're at least on phase 1
          if (phase === 2) return progress.phase1Completed && progress.currentPhase >= 2; // Allow phase2 if phase1 completed
          if (phase === 3) return progress.phase2Completed && progress.currentPhase >= 3; // Allow reflection if phase2 completed
          if (phase === 4) return progress.reflectionCompleted || progress.resultsGenerated; // Allow results if reflection completed

          return false;
        }
      };
    } else {
      // If API call fails, default to allowing welcome phase only
      return {
        currentPhase: 0,
        isCompleted: false,
        canAccessPhase: (phase: number) => phase === 0
      };
    }
  } catch (error) {
    console.error('Failed to get survey progress:', error);
    // Default to allowing welcome phase only
    return {
      currentPhase: 0,
      isCompleted: false,
      canAccessPhase: (phase: number) => phase === 0
    };
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle locale detection first
  const cookieLocale = request.cookies.get('locale')?.value;
  const acceptLanguage = request.headers.get('accept-language') || '';

  let locale = 'en';
  if (cookieLocale && ['en', 'ar'].includes(cookieLocale)) {
    locale = cookieLocale;
  } else if (acceptLanguage.includes('ar')) {
    locale = 'ar';
  }

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !isAuthenticated(request)) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);

    const response = NextResponse.redirect(loginUrl);
    response.cookies.set('locale', locale, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    });
    return response;
  }

  // Handle survey phase protection
  if (pathname.startsWith('/onboarding/') && pathname !== '/onboarding') {
    const targetPhase = SURVEY_PHASE_ROUTES[pathname as keyof typeof SURVEY_PHASE_ROUTES];

    if (targetPhase !== undefined) {
      const surveyProgress = await getSurveyProgress(request);

      if (surveyProgress && !surveyProgress.canAccessPhase(targetPhase)) {
        // Redirect to appropriate phase based on progress
        let redirectPath = '/onboarding/welcome';

        if (surveyProgress.isCompleted) {
          redirectPath = '/onboarding/results';
        } else if (surveyProgress.currentPhase === 1) {
          redirectPath = '/onboarding/phase1';
        } else if (surveyProgress.currentPhase === 2) {
          redirectPath = '/onboarding/phase2';
        } else if (surveyProgress.currentPhase === 3) {
          redirectPath = '/onboarding/reflection';
        }

        // Only redirect if we're not already on the correct path
        if (redirectPath !== pathname) {
          const redirectUrl = new URL(redirectPath, request.url);
          redirectUrl.searchParams.set('reason', 'phase_progression');

          const response = NextResponse.redirect(redirectUrl);
          response.cookies.set('locale', locale, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365
          });
          return response;
        }
      }
    }
  }

  // Handle redirect from onboarding root to welcome
  if (pathname === '/onboarding') {
    const welcomeUrl = new URL('/onboarding/welcome', request.url);
    const response = NextResponse.redirect(welcomeUrl);
    response.cookies.set('locale', locale, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    });
    return response;
  }

  // Create normal response with locale settings
  const response = NextResponse.next();

  // Set locale cookie and headers
  response.cookies.set('locale', locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365 // 1 year
  });

  response.headers.set('x-locale', locale);

  return response;
}

export const config = {
  // Skip API routes and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};