import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rotas de gerenciamento (cadastro e grupos).
 * Se não houver sessão ativa, redireciona para /login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const oAuth   = inject(AuthService);
  const oRouter = inject(Router);

  if (oAuth.estaAutenticado()) return true;

  // Salva a rota desejada para voltar depois do login
  oRouter.navigate(['/login'], { queryParams: { redirect: state.url } });
  return false;
};
