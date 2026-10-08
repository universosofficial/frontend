import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Functional Error Interceptor
 * Traps 401 Unauthorized responses to purge session and redirect to /login.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        // Do not auto-logout on regular login/register failed attempts (which return 401/400)
        const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');

        if (error.status === 401 && !isAuthEndpoint) {
          console.warn('[HTTP 401] Session expired or unauthorized. Logging out...');
          authService.logout();
        }
      }
      return throwError(() => error);
    })
  );
};
