/**
 * Base URL of the backend API.
 * Defaults to the backend's default local bind address so a fresh clone
 * works without any .env file; override with VITE_API_URL to point at a
 * deployed backend (see frontend/.env.example).
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

/**
 * Mirrors the backend's PUBLIC_DEMO_MODE — set on the deployed frontend so
 * copy that mentions a local filesystem path (which a public backend
 * rejects) doesn't show up in the live demo. Purely cosmetic: the backend
 * is what actually enforces the restriction.
 */
export const PUBLIC_DEMO_MODE: boolean = import.meta.env.VITE_PUBLIC_DEMO_MODE === 'true';
