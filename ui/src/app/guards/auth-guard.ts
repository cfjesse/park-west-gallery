import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthenticationService);
  const router = inject(Router);

  // Check token validity using the AuthenticationService method
  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect unauthenticated or expired users to login
  router.navigate(['/login']);
  return false;
};
