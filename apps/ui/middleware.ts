import { NextRequest, NextResponse } from "next/server";

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Config & constants
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Supported locales (extend if you add more)
const SUPPORTED_LOCALES = ["en", "ar"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";

// Auth cookie names we accept (e.g., Supabase)
const AUTH_COOKIE_KEYS = ["sb-access-token", "supabase-auth-token", "auth-token"] as const;

// Routes requiring authentication (prefix match)
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/habits", "/journal", "/tazkiyah", "/checkin"] as const;

// Onboarding phases in order
enum Phase {
    Welcome = 0,
    Phase1 = 1,
    Phase2 = 2,
    Reflection = 3,
    Results = 4,
}

// Map exact onboarding routes → phase
const PHASE_ROUTE: Record<string, Phase> = {
    "/onboarding/welcome": Phase.Welcome,
    "/onboarding/phase1": Phase.Phase1,
    "/onboarding/phase2": Phase.Phase2,
    "/onboarding/reflection": Phase.Reflection,
    "/onboarding/results": Phase.Results,
} as const;

// Skip middleware for these paths (Next static, images, favicon, API)
export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────────
 */

type ProgressPayload = {
    data?: {
        progress: {
            currentPhase: number;
            isCompleted: boolean;
            phase1Completed?: boolean;
            phase2Completed?: boolean;
            reflectionCompleted?: boolean;
            resultsGenerated?: boolean;
        };
    };
};

type SurveyAccess = {
    currentPhase: number;
    isCompleted: boolean;
    canAccessPhase: (phase: number) => boolean;
};

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Utils (small, single-purpose helpers)
 * ──────────────────────────────────────────────────────────────────────────────
 */

const isDev = process.env.NODE_ENV !== "production";

function normalizePath(p: string): string {
    // Ensure no trailing slash (except root), and no query/hash
    if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
    return p;
}

function isProtected(pathname: string): boolean {
    return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function inferLocale(req: NextRequest): Locale {
    const cookieLocale = req.cookies.get("locale")?.value as Locale | undefined;
    if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale;

    const accept = req.headers.get("accept-language") || "";
    if (accept.toLowerCase().includes("ar")) return "ar";
    return DEFAULT_LOCALE;
}

function withLocale(response: NextResponse, locale: Locale): NextResponse {
    response.cookies.set("locale", locale, {
        httpOnly: false,
        secure: !isDev,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1y
    });
    response.headers.set("x-locale", locale);
    return response;
}

function getAuthToken(req: NextRequest): string | null {
    // Look for auth cookies
    for (const key of AUTH_COOKIE_KEYS) {
        const val = req.cookies.get(key)?.value;
        if (val) return val.startsWith("Bearer ") ? val : `Bearer ${val}`;
    }
    return null;
}

function matchPhase(pathname: string): Phase | null {
    return PHASE_ROUTE[pathname as keyof typeof PHASE_ROUTE] ?? null;
}

/**
 * Decide if a user can view a given phase based on the progress object.
 * Keep this purely functional for easy unit tests.
 */
function makeSurveyAccess(progress: NonNullable<ProgressPayload["data"]>["progress"]): SurveyAccess {
    const {
        currentPhase,
        isCompleted,
        phase1Completed = false,
        phase2Completed = false,
        reflectionCompleted = false,
        resultsGenerated = false,
    } = progress;

    return {
        currentPhase,
        isCompleted,
        canAccessPhase: (phase: number) => {
            if (isCompleted) return true; // unlock all
            switch (phase) {
                case Phase.Welcome:
                    return true;
                case Phase.Phase1:
                    return currentPhase === Phase.Welcome || (currentPhase >= Phase.Phase1 && !phase1Completed);
                case Phase.Phase2:
                    return phase1Completed && currentPhase >= Phase.Phase2;
                case Phase.Reflection:
                    return phase2Completed && currentPhase >= Phase.Reflection;
                case Phase.Results:
                    return reflectionCompleted || resultsGenerated;
                default:
                    return false;
            }
        },
    };
}

/**
 * Fetch survey progress from your API, falling back gracefully.
 */
async function getSurveyProgress(req: NextRequest): Promise<SurveyAccess> {
    const token = getAuthToken(req);

    // No token → only welcome allowed
    if (!token) {
        return {
            currentPhase: Phase.Welcome,
            isCompleted: false,
            canAccessPhase: (p) => p === Phase.Welcome,
        };
    }

    // Dynamically construct API URL based on current request
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}/api`;

    try {
        const res = await fetch(`${baseUrl}/v1/onboarding/progress`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: token,
            },
            // Middleware runs on the Edge; ensure cache is skipped for user state
            cache: "no-store",
        });

        if (!res.ok) throw new Error(`Progress API ${res.status}`);

        const json = (await res.json()) as ProgressPayload;
        const progress = json?.data?.progress;

        if (!progress) throw new Error("Invalid progress payload");

        return makeSurveyAccess(progress);
    } catch (err) {
        // Fail closed to welcome only; never leak details
        if (isDev) console.warn("Survey progress fetch failed:", err);
        return {
            currentPhase: Phase.Welcome,
            isCompleted: false,
            canAccessPhase: (p) => p === Phase.Welcome,
        };
    }
}

/**
 * Compute the "best" redirect path for a user given their current progress.
 */
function resolveRedirectPath(access: SurveyAccess): string {
    if (access.isCompleted) return "/onboarding/results";

    switch (access.currentPhase) {
        case Phase.Welcome:
            return "/onboarding/welcome";
        case Phase.Phase1:
            return "/onboarding/phase1";
        case Phase.Phase2:
            return "/onboarding/phase2";
        case Phase.Reflection:
            return "/onboarding/reflection";
        default:
            return "/onboarding/welcome";
    }
}

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Middleware
 * ──────────────────────────────────────────────────────────────────────────────
 */

export default async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const pathname = normalizePath(url.pathname);
    const locale = inferLocale(req);

    // 1) Auth-gate protected prefixes
    if (isProtected(pathname) && !getAuthToken(req)) {
        const redirect = new URL("/auth/login", req.url);
        redirect.searchParams.set("redirectTo", pathname);
        return withLocale(NextResponse.redirect(redirect), locale);
    }

    // 2) Onboarding flow protection
    if (pathname === "/onboarding") {
        // Always land at welcome from root
        return withLocale(NextResponse.redirect(new URL("/onboarding/welcome", req.url)), locale);
    }

    if (pathname.startsWith("/onboarding/")) {
        const targetPhase = matchPhase(pathname);
        if (targetPhase !== null) {
            const access = await getSurveyProgress(req);
            if (!access.canAccessPhase(targetPhase)) {
                const redirectPath = resolveRedirectPath(access);
                if (redirectPath !== pathname) {
                    const redirectUrl = new URL(redirectPath, req.url);
                    redirectUrl.searchParams.set("reason", "phase_progression");
                    return withLocale(NextResponse.redirect(redirectUrl), locale);
                }
            }
        }
    }

    // 3) Pass through with locale hints
    return withLocale(NextResponse.next(), locale);
}
