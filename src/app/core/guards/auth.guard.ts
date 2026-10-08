import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Functional Auth Guard
 * Prevents unauthenticated access to protected routes.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If token exists, allow route access
  if (authService.token()) {
    return true;
  }

  // Otherwise, route to login preserving destination query param
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
