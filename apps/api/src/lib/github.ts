import crypto from 'node:crypto';
import { Octokit } from 'octokit';

/**
 * Creates a JWT for authenticating as the GitHub App itself.
 * Uses Node.js built-in crypto (no external JWT library needed).
 * GitHub requires RS256-signed JWTs for App authentication.
 */
function createAppJWT(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!appId || !privateKey) {
    throw new Error('[GitHub] GITHUB_APP_ID and GITHUB_PRIVATE_KEY must be set.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iat: now - 60,
    exp: now + (10 * 60),
    iss: appId,
  })).toString('base64url');

  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${payload}`)
    .sign(privateKey, 'base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Creates an Octokit instance authenticated as the GitHub App.
 * Use this for app-level operations (listing installations, etc.)
 */
export function createAppOctokit(): Octokit {
  return new Octokit({ auth: createAppJWT() });
}

/**
 * Creates an Octokit instance authenticated as a specific installation.
 * Use this for repo-level operations (fetching files, posting comments).
 */
export async function createInstallationOctokit(installationId: number): Promise<Octokit> {
  const appOctokit = createAppOctokit();

  const { data } = await appOctokit.rest.apps.createInstallationAccessToken({
    installation_id: installationId,
  });

  return new Octokit({ auth: data.token });
}

/**
 * Files to skip during PR analysis (not worth sending to AI).
 */
export const SKIP_PATTERNS = [
  /^\./, // Dotfiles
  /node_modules/,
  /dist\//,
  /\.next\//,
  /\.lock$/,
  /lock\.yaml$/,
  /lock\.json$/,
  /\.min\.(js|css)$/,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$/,
  /\.(md|txt|LICENSE|CHANGELOG)$/i,
];

/**
 * Detect language from file extension.
 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    py: 'python',
    cpp: 'cpp', cc: 'cpp', hpp: 'cpp', h: 'cpp',
    java: 'java',
    go: 'go',
    rs: 'rust',
  };
  return map[ext] || 'javascript';
}

/**
 * Check if a file should be skipped.
 */
export function shouldSkipFile(filename: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(filename));
}
