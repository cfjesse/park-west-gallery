import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService, UserRole } from '../services/authentication';

export const roleGuard =
  (...roles: UserRole[]): CanActivateFn =>
    (_route, state) => {
      const auth = inject(AuthenticationService);
      const router = inject(Router);

      if (!auth.isAuthenticated()) {
        return router.createUrlTree(['/login']);
      }

      const role = auth.userRole();
      return role && roles.includes(role) ? true : router.createUrlTree([auth.homeRoute()]);
    };
