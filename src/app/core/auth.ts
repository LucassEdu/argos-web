import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';

import { API_URL, CHAVE_TOKEN } from './config';
import { CadastroRequest, LoginRequest, LoginResponse, Me } from './models';

// Serviço central de autenticação: cadastro, login, logout e "quem está logado".
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Dados de quem está logado (null = ninguém). Signals atualizam a tela automaticamente.
  readonly usuario = signal<Me | null>(null);
  readonly logado = computed(() => this.usuario() !== null);
  readonly ehAdmin = computed(() => this.usuario()?.papel === 'admin');

  // O backend responde o cadastro com texto simples, por isso responseType: 'text'.
  cadastrar(dados: CadastroRequest): Observable<string> {
    return this.http.post(`${API_URL}/auth/cadastro`, dados, { responseType: 'text' });
  }

  // Pede um novo e-mail de confirmação (o backend responde com texto simples).
  reenviarVerificacao(email: string): Observable<string> {
    return this.http.post(`${API_URL}/auth/reenviar-verificacao`, { email }, { responseType: 'text' });
  }

  // "Esqueci minha senha": pede o e-mail com o link de redefinição.
  esqueciSenha(email: string): Observable<string> {
    return this.http.post(`${API_URL}/auth/esqueci-senha`, { email }, { responseType: 'text' });
  }

  // Troca a senha usando o código que veio no link do e-mail.
  redefinirSenha(token: string, novaSenha: string): Observable<string> {
    return this.http.post(`${API_URL}/auth/redefinir-senha`, { token, novaSenha }, { responseType: 'text' });
  }

  // Faz login, guarda o token e já busca os dados do usuário logado.
  login(dados: LoginRequest): Observable<Me> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, dados).pipe(
      tap((resposta) => localStorage.setItem(CHAVE_TOKEN, resposta.token)),
      switchMap(() => this.carregarUsuario()),
    );
  }

  // Pergunta à API quem é o dono do token atual (GET /api/usuarios/me).
  carregarUsuario(): Observable<Me> {
    return this.http
      .get<Me>(`${API_URL}/usuarios/me`)
      .pipe(tap((me) => this.usuario.set(me)));
  }

  sair(): void {
    localStorage.removeItem(CHAVE_TOKEN);
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }
}