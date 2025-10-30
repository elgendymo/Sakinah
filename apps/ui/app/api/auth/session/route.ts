import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to verify the access token first
    if (accessToken) {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (!error && user) {
        return NextResponse.json({
          data: {
            user: {
              id: user.id,
              email: user.email
            }
          }
        });
      }
    }

    // Access token invalid or expired - try to refresh using refresh token
    if (refreshToken) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error || !data.session) {
        console.error('Session refresh failed:', error?.message);
        
        // Clear invalid cookies
        const response = NextResponse.json(
          { error: { message: 'Session expired. Please login again.' } },
          { status: 401 }
        );
        response.cookies.delete('sb-access-token');
        response.cookies.delete('sb-refresh-token');
        return response;
      }

      // Successfully refreshed - update cookies and return user
      if (!data.user) {
        return NextResponse.json(
          { error: { message: 'User data not available' } },
          { status: 500 }
        );
      }

      const response = NextResponse.json({
        data: {
          user: {
            id: data.user.id,
            email: data.user.email
          },
          refreshed: true
        }
      });

      // Update cookies with new tokens (1 hour for access token to match Supabase default)
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        path: '/'
      });

      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/'
      });

      return response;
    }

    // No valid tokens available
    return NextResponse.json(
      { error: { message: 'Invalid session' } },
      { status: 401 }
    );
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: { message: 'Session verification failed' } },
      { status: 500 }
    );
  }
}
