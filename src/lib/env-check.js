// SyncWise AI — Environment Variable Validation
// Validates required environment variables on startup.
// Fails loudly instead of silently using defaults.

const REQUIRED_VARS = {
  NEXTAUTH_SECRET: {
    description: 'Secret key for session signing. Generate with: openssl rand -base64 32',
    pattern: /.{16,}/, // At least 16 chars
  },
};

const RECOMMENDED_VARS = {
  ADMIN_SECRET: {
    description: 'Secret for admin route access. Without this, admin routes are BLOCKED.',
  },
  AI_API_KEY: {
    description: 'Anthropic API key for AI prioritization and chatbot.',
  },
};

const DANGEROUS_DEFAULTS = {
  AI_API_KEY: ['YOUR_AI_API_KEY', 'your_anthropic_api_key', 'sk-test', ''],
  NEXTAUTH_SECRET: ['generate-a-random-secret-here', 'secret', 'changeme', ''],
  ADMIN_SECRET: ['your_admin_secret', 'admin', 'secret', ''],
};

/**
 * Validate environment variables on startup.
 * Call this from layout.js or a server component.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  // Check required vars
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[key];
    if (!value) {
      errors.push(`MISSING: ${key} — ${config.description}`);
    } else if (config.pattern && !config.pattern.test(value)) {
      errors.push(`INVALID: ${key} — does not meet requirements. ${config.description}`);
    }
  }

  // Check for dangerous defaults
  for (const [key, defaults] of Object.entries(DANGEROUS_DEFAULTS)) {
    const value = process.env[key];
    if (value && defaults.includes(value)) {
      errors.push(`INSECURE: ${key} is set to a default/placeholder value. Change it to a real secret.`);
    }
  }

  // Check recommended vars
  for (const [key, config] of Object.entries(RECOMMENDED_VARS)) {
    if (!process.env[key]) {
      warnings.push(`RECOMMENDED: ${key} — ${config.description}`);
    }
  }

  // Log results
  if (errors.length > 0) {
    console.error('\n╔═══════════════════════════════════════════╗');
    console.error('║  SYNCWISE — ENVIRONMENT CONFIGURATION ERROR  ║');
    console.error('╚═══════════════════════════════════════════╝');
    errors.forEach(e => console.error(`  ✗ ${e}`));
    console.error('\nFix these issues in your .env.local file.\n');
  }

  if (warnings.length > 0 && errors.length === 0) {
    console.warn('\n[SyncWise] Environment warnings:');
    warnings.forEach(w => console.warn(`  ⚠ ${w}`));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Auto-validate on import (server-side only)
if (typeof window === 'undefined') {
  validateEnv();
}
