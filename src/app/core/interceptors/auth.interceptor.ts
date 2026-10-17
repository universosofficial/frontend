import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Functional Auth Interceptor
 * Injects Authorization Bearer header for outgoing API requests.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();

  // Attach token for all backend API requests (both relative /api/ and absolute URLs)
  const isApiRequest = req.url.startsWith('/api/') || req.url.includes('/api/');
  const isAuthEndpoint = req.url.includes('/auth/') && !req.url.includes('/auth/me');

  if (token && isApiRequest && !isAuthEndpoint) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonedReq);
  }

  return next(req);
};
