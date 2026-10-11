import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.authenticated()) {
    return true;
  }
  void auth.login(state.url);
  return false;
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (!auth.authenticated()) {
    void auth.login(state.url);
    return false;
  }
  return auth.isAdmin() || inject(Router).createUrlTree(['/']);
};
