// D2L Brightspace OAuth 2.0 Callback
// Handles the authorization code exchange after user consents in D2L
import { NextResponse } from 'next/server';
import { exchangeD2LToken } from '../../../../lib/d2l';
import { config } from '../../../../lib/config';
import { logApiCall } from '../../../../lib/logger';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${config.app.url}/login?error=d2l_${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${config.app.url}/login?error=no_code`);
  }

  try {
    const redirectUri = `${config.app.url}/api/d2l/callback`;
    const tokenData = await exchangeD2LToken(code, redirectUri);

    logApiCall({
      user: 'auth_flow',
      platform: 'd2l',
      action: 'oauth_token_exchange',
      endpoint: config.d2l.authEndpoint,
      method: 'POST',
      status: 'success',
    });

    // In production: store tokens in session/database
    // For beta: redirect with token in secure httpOnly cookie
    const response = NextResponse.redirect(`${config.app.url}/dashboard`);
    response.cookies.set('d2l_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
    });
    if (tokenData.refresh_token) {
      response.cookies.set('d2l_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (err) {
    logApiCall({
      user: 'auth_flow',
      platform: 'd2l',
      action: 'oauth_token_exchange',
      endpoint: config.d2l.authEndpoint,
      method: 'POST',
      status: 'error',
      details: { error: err.message },
    });
    return NextResponse.redirect(`${config.app.url}/login?error=token_exchange_failed`);
  }
}
