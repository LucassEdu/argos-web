import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'sucesso' | 'erro' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  texto: string;
}

// Avisos rápidos no canto da tela ("Conta cadastrada.", "Foto atualizada."...).
// Uso: inject(Avisos).sucesso('Texto aqui').
@Injectable({ providedIn: 'root' })
export class Avisos {
  readonly lista = signal<Aviso[]>([]);

  private proximoId = 0;

  sucesso(texto: string): void {
    this.mostrar('sucesso', texto);
  }

  erro(texto: string): void {
    this.mostrar('erro', texto, 6000);
  }

  info(texto: string): void {
    this.mostrar('info', texto);
  }

  fechar(id: number): void {
    this.lista.update((l) => l.filter((a) => a.id !== id));
  }

  private mostrar(tipo: TipoAviso, texto: string, duracaoMs = 3800): void {
    const id = ++this.proximoId;
    // No máximo 3 avisos ao mesmo tempo: o mais antigo sai.
    this.lista.update((l) => [...l, { id, tipo, texto }].slice(-3));
    setTimeout(() => this.fechar(id), duracaoMs);
  }
}