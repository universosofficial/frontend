import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Functional Guest Guard
 * Redirects already authenticated users away from public auth pages.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.token()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
