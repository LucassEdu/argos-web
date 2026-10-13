import { Component, computed, input, signal } from '@angular/core';

import { GLIFOS, GLIFO_DA_CATEGORIA, buscarNoCatalogo } from '../../../core/catalogo';

interface InfoLogo {
  tipo: 'imagem' | 'arquivo' | 'marca' | 'glifo' | 'inicial';
  id?: string;
  src?: string;
  path?: string;
  letra?: string;
  fundo?: string | null;
  frente?: string | null;
}

// Quadradinho com o logo de uma conta. Escolhe sozinho o melhor visual:
// 1) imagem enviada pelo cliente  2) logo da marca do catálogo
// 3) ícone da categoria (aluguel, internet...)  4) inicial do nome.
@Component({
  selector: 'app-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  host: { '[style.--t]': 'tamanho()' },
})
export class Logo {
  readonly nome = input('');
  readonly icone = input<string | null | undefined>(null);
  readonly logo = input<string | null | undefined>(null);
  readonly categoria = input<string | null | undefined>(null);
  readonly tamanho = input(2.7); // em rem

  // Guarda o serviço cujo arquivo em public/logos/ não existe, para cair na inicial.
  protected readonly semArquivo = signal<string | null>(null);

  protected avisarErro(id: string | undefined): void {
    this.semArquivo.set(id ?? null);
  }

  protected readonly info = computed<InfoLogo>(() => {
    const imagem = this.logo();
    if (imagem) {
      return { tipo: 'imagem', src: imagem };
    }

    const servico = buscarNoCatalogo(this.icone());
    if (servico?.path) {
      const cor = servico.cor ?? '000000';
      return { tipo: 'marca', path: servico.path, fundo: '#' + cor, frente: this.corDoTexto(cor) };
    }
    if (servico?.glifo) {
      return { tipo: 'glifo', path: GLIFOS[servico.glifo] };
    }
    // Marca sem logo na biblioteca: tenta o arquivo public/logos/<id>.png (se você colocou um).
    if (servico?.cor && this.semArquivo() !== servico.id) {
      return { tipo: 'arquivo', id: servico.id, src: `logos/${servico.id}.png` };
    }
    if (servico?.cor) {
      return {
        tipo: 'inicial',
        letra: this.inicial(servico.nome),
        fundo: '#' + servico.cor,
        frente: this.corDoTexto(servico.cor),
      };
    }

    const glifo = GLIFO_DA_CATEGORIA[this.categoria() ?? ''];
    if (glifo) {
      return { tipo: 'glifo', path: GLIFOS[glifo] };
    }
    return { tipo: 'inicial', letra: this.inicial(this.nome()), fundo: null, frente: null };
  });

  private inicial(nome: string): string {
    return nome.trim().charAt(0).toUpperCase() || '?';
  }

  // Texto branco em fundo escuro e escuro em fundo claro (ex.: amarelo do Mercado Livre).
  private corDoTexto(hex: string): string {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72 ? '#1c1917' : '#ffffff';
  }
}