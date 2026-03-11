// SyncWise Configuration
// Replace these values with your actual credentials once IT grants access

export const config = {
  // D2L Brightspace OAuth 2.0 — Get from CMU IT after app registration
  d2l: {
    clientId: process.env.D2L_CLIENT_ID || 'YOUR_D2L_CLIENT_ID',
    clientSecret: process.env.D2L_CLIENT_SECRET || 'YOUR_D2L_CLIENT_SECRET',
    baseUrl: process.env.D2L_BASE_URL || 'https://coloradomesa.brightspace.com',
    authEndpoint: '/d2l/auth/api/token',
    apiVersion: '1.67', // Brightspace API version
    scopes: [
      'calendar:events:read',
      'grades:own_grades:read',
      // Instructor scopes (only granted to instructor accounts)
      'content:modules:read',
      'content:modules:write',
      'content:topics:write',
      'dropbox:folders:read',
      'dropbox:folders:write',
      'calendar:events:write',
    ],
  },

  // Microsoft Azure AD — Get from CMU IT after app registration
  microsoft: {
    clientId: process.env.AZURE_CLIENT_ID || 'YOUR_AZURE_CLIENT_ID',
    clientSecret: process.env.AZURE_CLIENT_SECRET || 'YOUR_AZURE_CLIENT_SECRET',
    tenantId: process.env.AZURE_TENANT_ID || 'YOUR_AZURE_TENANT_ID',
    scopes: ['Calendars.ReadWrite', 'Mail.Read', 'User.Read'],
  },

  // AI Prioritization — Claude or OpenAI
  ai: {
    provider: 'anthropic', // or 'openai'
    apiKey: process.env.AI_API_KEY || 'YOUR_AI_API_KEY',
  },

  // App settings
  app: {
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
  },
};
