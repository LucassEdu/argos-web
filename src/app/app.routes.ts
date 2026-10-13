import { Routes } from '@angular/router';

import { autenticadoGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Argos | Entrar',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'cadastro',
    title: 'Argos | Criar conta',
    loadComponent: () => import('./pages/cadastro/cadastro').then((m) => m.Cadastro),
  },
  {
    path: 'esqueci-senha',
    title: 'Argos | Esqueci minha senha',
    loadComponent: () => import('./pages/esqueci-senha/esqueci-senha').then((m) => m.EsqueciSenha),
  },
  {
    path: 'redefinir-senha',
    title: 'Argos | Nova senha',
    loadComponent: () =>
      import('./pages/redefinir-senha/redefinir-senha').then((m) => m.RedefinirSenha),
  },
  {
    // Tela principal: só abre para quem está logado (o guard redireciona para /login).
    path: '',
    title: 'Argos | Painel',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('./pages/painel/painel').then((m) => m.Painel),
  },
  { path: '**', redirectTo: '' },
];