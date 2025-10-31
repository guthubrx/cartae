/**
 * GitHub OAuth Configuration
 *
 * To set up GitHub OAuth:
 * 1. Go to https://github.com/settings/developers
 * 2. Click "New OAuth App"
 * 3. Fill in:
 *    - Application name: BigMind Plugin Development
 *    - Homepage URL: http://localhost:5173 (dev) or https://your-domain.com (prod)
 *    - Authorization callback URL: http://localhost:5173 (same as homepage for SPA)
 * 4. Copy the Client ID and paste it in .env.local as VITE_GITHUB_CLIENT_ID
 * 5. Generate a Client Secret and add it to Supabase Edge Function secrets
 */

export const GITHUB_CONFIG = {
  // GitHub OAuth Client ID (public, safe to commit)
  // Override with VITE_GITHUB_CLIENT_ID in .env.local
  clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',

  // Supabase Edge Function URL for OAuth callback
  // Override with VITE_SUPABASE_FUNCTIONS_URL in .env.local
  oauthCallbackUrl:
    import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
    'https://your-project.supabase.co/functions/v1/github-oauth',

  // GitHub OAuth scopes
  // - read:user: Get user profile info (login, name, email, avatar)
  // - repo: Full access to repositories (public and private)
  //   Note: OAuth Apps require 'repo' scope, not 'read:repository'
  scopes: ['read:user', 'repo'],

  // GitHub authorization URL
  authUrl: 'https://github.com/login/oauth/authorize',
};

/**
 * Check if GitHub OAuth is properly configured
 */
export function isGitHubOAuthConfigured(): boolean {
  return Boolean(GITHUB_CONFIG.clientId && GITHUB_CONFIG.oauthCallbackUrl);
}
