import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { Auth } from './auth';
import { CHAVE_TOKEN } from './config';

// Guarda de rota: só deixa entrar nas telas internas quem está logado.
export const autenticadoGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Já sabemos quem é o usuário: pode entrar.
  if (auth.logado()) {
    return true;
  }

  // Sem token guardado: manda para o login.
  if (!localStorage.getItem(CHAVE_TOKEN)) {
    return router.createUrlTree(['/login']);
  }

  // Tem token, mas a página acabou de ser recarregada e ainda não sabemos
  // quem é o usuário: perguntamos à API antes de liberar.
  return auth.carregarUsuario().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};