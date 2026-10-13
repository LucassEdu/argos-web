import { Injectable, effect, signal } from '@angular/core';

const CHAVE_TEMA = 'tema';

// Controla o modo noturno. A escolha fica salva no navegador.
@Injectable({ providedIn: 'root' })
export class Tema {
  // true = modo noturno ligado.
  readonly escuro = signal(this.lerInicial());

  constructor() {
    // Sempre que mudar, atualiza a página e guarda a escolha.
    effect(() => {
      const escuro = this.escuro();
      document.documentElement.setAttribute('data-tema', escuro ? 'escuro' : 'claro');
      try {
        localStorage.setItem(CHAVE_TEMA, escuro ? 'escuro' : 'claro');
      } catch {
        // Sem armazenamento (janela anônima, por exemplo): segue sem guardar.
      }
    });
  }

  alternar(): void {
    this.escuro.update((v) => !v);
  }

  // Usa a escolha salva; se não houver, segue o tema do sistema operacional.
  private lerInicial(): boolean {
    try {
      const salvo = localStorage.getItem(CHAVE_TEMA);
      if (salvo === 'escuro') return true;
      if (salvo === 'claro') return false;
    } catch {
      // ignora
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }
}