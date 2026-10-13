import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_URL, CHAVE_TOKEN } from './config';

// Interceptor: roda em TODA chamada HTTP do app.
// 1) Anexa o token JWT no cabeçalho Authorization (só para a nossa API).
// 2) Se a API recusar o token (expirado/inválido), limpa a sessão e volta pro login.
export const tokenInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const router = inject(Router);
  const token = localStorage.getItem(CHAVE_TOKEN);
  const ehNossaApi = requisicao.url.startsWith(API_URL);

  if (token && ehNossaApi) {
    requisicao = requisicao.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return proximo(requisicao).pipe(
    catchError((erro: HttpErrorResponse) => {
      // Nossa API devolve 403 quando o token não é aceito (ver SecurityConfig).
      const sessaoRecusada = erro.status === 401 || erro.status === 403;
      if (ehNossaApi && token && sessaoRecusada) {
        localStorage.removeItem(CHAVE_TOKEN);
        router.navigate(['/login']);
      }
      return throwError(() => erro);
    }),
  );
};