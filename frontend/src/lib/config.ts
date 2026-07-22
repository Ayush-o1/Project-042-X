/**
 * Base URL of the local backend API.
 * Defaults to the backend's default bind address so a fresh clone works
 * without any .env file; override with VITE_API_URL if you changed the port.
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
