/**
 * Centralized API Endpoints Configuration
 * Automatically routes to localhost:5005 in local development,
 * and Railway production when deployed.
 */
export const isLocalHost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = isLocalHost 
  ? 'http://localhost:5005/api' 
  : 'https://aicompanion-production-12db.up.railway.app/api';

export const SERVER_ORIGIN = isLocalHost
  ? 'http://localhost:5005'
  : 'https://aicompanion-production-12db.up.railway.app';
