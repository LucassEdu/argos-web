import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Auth } from './auth';
import { API_URL } from './config';
import { AlterarSenhaRequest, Me, PerfilRequest } from './models';

// Acesso aos dados do próprio usuário (/api/usuarios/me).
@Injectable({ providedIn: 'root' })
export class Perfil {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);

  // Salva nome, foto ou aviso padrão e já atualiza o "quem está logado" na tela toda
  // (o avatar do topo, a saudação etc. mudam na hora).
  atualizar(dados: PerfilRequest): Observable<Me> {
    return this.http
      .put<Me>(`${API_URL}/usuarios/me`, dados)
      .pipe(tap((me) => this.auth.usuario.set(me)));
  }

  alterarSenha(dados: AlterarSenhaRequest): Observable<unknown> {
    return this.http.put(`${API_URL}/usuarios/me/senha`, dados, { responseType: 'text' });
  }
}