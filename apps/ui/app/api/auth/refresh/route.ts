import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: { message: 'No refresh token found' } },
        { status: 401 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Refresh the session using the refresh token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      console.error('Token refresh error:', error?.message);
      
      // Clear invalid cookies
      const response = NextResponse.json(
        { error: { message: 'Session refresh failed. Please login again.' } },
        { status: 401 }
      );
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb-refresh-token');
      return response;
    }

    // Create response with new tokens
    if (!data.user) {
      return NextResponse.json(
        { error: { message: 'User data not available' } },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      data: {
        message: 'Session refreshed successfully',
        user: {
          id: data.user.id,
          email: data.user.email
        }
      }
    });

    // Update cookies with new tokens
    // Supabase tokens expire in 1 hour by default, so set cookie maxAge accordingly
    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour to match Supabase default
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
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: { message: 'An error occurred during token refresh' } },
      { status: 500 }
    );
  }
}
