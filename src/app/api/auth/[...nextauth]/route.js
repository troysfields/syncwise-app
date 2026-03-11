// NextAuth.js configuration — handles OAuth for both D2L and Microsoft
import NextAuth from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { config } from '../../../../lib/config';

const handler = NextAuth({
  providers: [
    // Microsoft Azure AD — handles CMU Outlook login
    {
      id: 'azure-ad',
      name: 'Colorado Mesa University',
      type: 'oauth',
      wellKnown: `https://login.microsoftonline.com/${config.microsoft.tenantId}/v2.0/.well-known/openid-configuration`,
      authorization: {
        params: {
          scope: `openid profile email ${config.microsoft.scopes.join(' ')}`,
        },
      },
      clientId: config.microsoft.clientId,
      clientSecret: config.microsoft.clientSecret,
      idToken: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email || profile.preferred_username,
        };
      },
    },
  ],

  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.provider = account.provider;
      }
      return token;
    },

    async session({ session, token }) {
      // Make tokens available to client-side
      session.accessToken = token.accessToken;
      session.provider = token.provider;
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  secret: config.app.secret,
});

export { handler as GET, handler as POST };
