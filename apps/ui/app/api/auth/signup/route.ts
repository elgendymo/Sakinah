import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, gender } = await request.json();

    // Validate input
    if (!email || !password || !firstName || !gender) {
      return NextResponse.json(
        { error: { message: 'All fields are required' } },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: { message: 'Password must be at least 8 characters long' } },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create user with email/password authentication
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        gender: gender
      }
    });

    if (userError) {
      console.error('Signup error:', userError.message);
      
      if (userError.message.includes('already registered')) {
        return NextResponse.json(
          { error: { message: 'User with this email already exists' } },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: { message: userError.message } },
        { status: 400 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        { error: { message: 'User creation failed' } },
        { status: 500 }
      );
    }

    // Update users table with additional info
    const { error: updateError } = await supabase
      .from('users')
      .upsert({
        id: userData.user.id,
        first_name: firstName,
        gender: gender,
        created_at: new Date().toISOString()
      });

    if (updateError) {
      console.error('User profile update error:', updateError.message);
    }

    // Sign in the newly created user
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (sessionError || !sessionData.session) {
      console.error('Auto-login after signup failed:', sessionError?.message);
      return NextResponse.json({
        data: {
          message: 'User created successfully. Please log in.',
          userId: userData.user.id,
          redirectTo: '/auth/login'
        }
      }, { status: 201 });
    }

    // Create response with success data
    const response = NextResponse.json({
      data: {
        message: 'User created successfully',
        userId: userData.user.id,
        user: {
          id: sessionData.user.id,
          email: sessionData.user.email
        },
        redirectTo: '/onboarding/welcome'
      }
    }, { status: 201 });

    // Set secure HttpOnly cookies
    // Access token expires in 1 hour (Supabase default), refresh token in 30 days
    response.cookies.set('sb-access-token', sessionData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour to match Supabase token expiry
      path: '/'
    });

    response.cookies.set('sb-refresh-token', sessionData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: { message: 'An error occurred during signup' } },
      { status: 500 }
    );
  }
}
