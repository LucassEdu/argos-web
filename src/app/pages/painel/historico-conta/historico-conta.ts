import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';

import { formatarMoeda } from '../../../core/formatos';
import { mensagemDeErro } from '../../../core/erros';
import { Historico } from '../../../core/historico';
import { AssinaturaResponse, PagamentoResponse } from '../../../core/models';
import { Logo } from '../logo/logo';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Janela com o histórico de cobranças de uma conta (aberta pelo botão "Histórico" do cartão).
@Component({
  selector: 'app-historico-conta',
  imports: [Logo],
  templateUrl: './historico-conta.html',
  styleUrl: './historico-conta.scss',
})
export class HistoricoConta implements OnInit {
  private readonly api = inject(Historico);

  readonly conta = input.required<AssinaturaResponse>();
  readonly fechar = output<void>();

  protected readonly itens = signal<PagamentoResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly moeda = formatarMoeda;

  protected readonly qtdPagas = computed(() => this.itens().filter((p) => p.status === 'pago').length);
  protected readonly qtdAbertas = computed(
    () => this.itens().filter((p) => p.status === 'pendente' && p.situacao === 'vencida').length,
  );
  protected readonly totalPago = computed(() =>
    this.itens()
      .filter((p) => p.status === 'pago')
      .reduce((soma, p) => soma + p.valor, 0),
  );

  ngOnInit(): void {
    this.api.listar(this.conta().id).subscribe({
      next: (lista) => {
        this.itens.set(lista);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  @HostListener('document:keydown.escape')
  protected aoApertarEsc(): void {
    this.fechar.emit();
  }

  // "2026-10-12" -> "out/2026"
  protected mes(iso: string): string {
    const [ano, mes] = iso.split('-');
    return `${MESES[Number(mes) - 1]}/${ano}`;
  }

  // "2026-10-12" -> "12/10"
  protected data(iso: string | null): string {
    if (!iso) {
      return '';
    }
    const [, mes, dia] = iso.split('-');
    return `${dia}/${mes}`;
  }

  protected rotulo(p: PagamentoResponse): string {
    if (p.status === 'pago') {
      return `Pago em ${this.data(p.dataPagamento)}`;
    }
    if (p.situacao === 'vencida') {
      return 'Em aberto';
    }
    return `Vence em ${this.data(p.dataVencimento)}`;
  }
}