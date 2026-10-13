import { Component, DestroyRef, OnInit, computed, inject, output, signal } from '@angular/core';

import { Notificacoes } from '../../../core/notificacoes';
import { NotificacaoResponse } from '../../../core/models';

// Sininho do topo: mostra quantas notificações não lidas existem e abre a lista.
@Component({
  selector: 'app-sino',
  templateUrl: './sino.html',
  styleUrl: './sino.scss',
})
export class Sino implements OnInit {
  private readonly api = inject(Notificacoes);
  private readonly destroyRef = inject(DestroyRef);

  // Avisa o painel para abrir a aba "Próximos vencimentos".
  readonly irParaVencimentos = output<void>();

  protected readonly lista = signal<NotificacaoResponse[]>([]);
  protected readonly aberto = signal(false);
  protected readonly falhou = signal(false);

  // Mais recentes primeiro.
  protected readonly ordenadas = computed(() =>
    [...this.lista()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
  );

  protected readonly naoLidas = computed(() => this.lista().filter((n) => !n.lida));

  // Número da bolinha vermelha ("9+" quando passa de 9).
  protected readonly rotuloBadge = computed(() => {
    const total = this.naoLidas().length;
    return total > 9 ? '9+' : String(total);
  });

  // Resumo no topo da lista.
  protected readonly resumo = computed(() => {
    const total = this.naoLidas().length;
    return total === 0 ? 'Tudo em dia' : `${total} não lida(s)`;
  });

  ngOnInit(): void {
    this.carregar();

    // Busca de novo a cada 60 segundos, para o sino se atualizar sozinho.
    const timer = setInterval(() => this.carregar(), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected alternar(): void {
    this.aberto.update((v) => !v);
    if (this.aberto()) {
      this.carregar();
    }
  }

  protected fechar(): void {
    this.aberto.set(false);
  }

  // Clicar numa notificação: marca como lida, fecha a lista e leva para os vencimentos.
  protected abrir(n: NotificacaoResponse): void {
    this.marcar(n);
    this.fechar();
    this.irParaVencimentos.emit();
  }

  // Marca uma notificação não lida como lida.
  protected marcar(n: NotificacaoResponse): void {
    if (n.lida) {
      return;
    }
    this.lista.update((l) => l.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
    this.api.marcarComoLida(n.id).subscribe({
      // Se falhar, volta ao estado anterior.
      error: () => this.lista.update((l) => l.map((x) => (x.id === n.id ? { ...x, lida: false } : x))),
    });
  }

  // "2026-10-10T08:00:03" -> "10/10/2026 08:00"
  protected quando(iso: string): string {
    const data = new Date(iso);
    if (isNaN(data.getTime())) {
      return '';
    }
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private carregar(): void {
    this.api.listar().subscribe({
      next: (l) => {
        this.lista.set(l);
        this.falhou.set(false);
      },
      error: () => this.falhou.set(true),
    });
  }
}