import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { Assinaturas } from '../../../core/assinaturas';
import { Auth } from '../../../core/auth';
import { mensagemDeErro } from '../../../core/erros';
import { formatarMoeda } from '../../../core/formatos';
import {
  AssinaturaResponse,
  INTERVALO_MESES,
  MESES_CURTOS,
  NOMES_RECORRENCIA,
  UNIDADE_CICLO,
  mesesDoCiclo,
} from '../../../core/models';
import { Logo } from '../logo/logo';
import { NovaAssinatura } from '../nova-assinatura/nova-assinatura';

// Aba "Suas contas e assinaturas": resumo de gastos + cartões das assinaturas.
@Component({
  selector: 'app-aba-contas',
  imports: [Logo, NovaAssinatura],
  templateUrl: './aba-contas.html',
  styleUrl: './aba-contas.scss',
})
export class AbaContas implements OnInit {
  private readonly auth = inject(Auth);
  private readonly api = inject(Assinaturas);

  protected readonly assinaturas = signal<AssinaturaResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  // Janela "Nova conta"/"Editar conta" aberta ou fechada.
  protected readonly modalAberto = signal(false);

  // Conta que está sendo editada (null = cadastrando uma nova).
  protected readonly contaEmEdicao = signal<AssinaturaResponse | null>(null);

  // Erro de pausar/excluir e conta ocupada (evita clique repetido).
  protected readonly erroAcao = signal<string | null>(null);
  protected readonly ocupadoId = signal<number | null>(null);

  // Só o admin cadastra contas.
  protected readonly ehAdmin = computed(() => this.auth.usuario()?.papel === 'admin');

  protected readonly ativas = computed(() =>
    this.assinaturas().filter((a) => a.status === 'ativa'),
  );

  // Gasto fixo mensal: as contas anuais entram divididas por 12.
  protected readonly totalMensal = computed(() =>
    this.ativas().reduce(
      (soma, a) => soma + a.valor / INTERVALO_MESES[a.recorrencia],
      0,
    ),
  );

  // Ativas primeiro, depois as pausadas; dentro de cada grupo, ordem alfabética.
  protected readonly ordenadas = computed(() =>
    [...this.assinaturas()].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'ativa' ? -1 : 1;
      }
      return a.nome.localeCompare(b.nome);
    }),
  );

  protected readonly moeda = formatarMoeda;
  protected readonly unidade = UNIDADE_CICLO;

  // Texto do cartão: "Todo dia 14" ou "Trimestral · fev, mai, ago, nov · dia 15".
  protected quando(a: AssinaturaResponse): string {
    if (a.recorrencia === 'mensal') {
      return 'Todo dia ' + a.diaCobranca;
    }
    const meses = mesesDoCiclo(a.recorrencia, a.mesInicio)
      .map((m) => MESES_CURTOS[m - 1])
      .join(', ');
    return NOMES_RECORRENCIA[a.recorrencia] + ' · ' + meses + ' · dia ' + a.diaCobranca;
  }

  // Quadradinhos cinza que aparecem enquanto a lista carrega.
  protected readonly esqueletos = [1, 2, 3];

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.api.listar().subscribe({
      next: (lista) => {
        this.assinaturas.set(lista);
        this.carregando.set(false);
      },
      error: (erro: HttpErrorResponse) => {
        this.erro.set(mensagemDeErro(erro));
        this.carregando.set(false);
      },
    });
  }

  protected abrirModal(): void {
    this.contaEmEdicao.set(null);
    this.modalAberto.set(true);
  }

  protected abrirEdicao(conta: AssinaturaResponse): void {
    this.contaEmEdicao.set(conta);
    this.modalAberto.set(true);
  }

  protected fecharModal(): void {
    this.modalAberto.set(false);
    this.contaEmEdicao.set(null);
  }

  // Conta criada ou editada: fecha a janela e recarrega a lista.
  protected aoCriar(): void {
    this.fecharModal();
    this.carregar();
  }

  // Pausa uma conta ativa ou reativa uma pausada.
  protected alternarStatus(conta: AssinaturaResponse): void {
    if (this.ocupadoId() !== null) {
      return;
    }
    const novo = conta.status === 'ativa' ? 'pausada' : 'ativa';
    this.ocupadoId.set(conta.id);
    this.erroAcao.set(null);

    this.api.alterarStatus(conta.id, novo).subscribe({
      next: (atualizada) => {
        this.assinaturas.update((lista) => lista.map((a) => (a.id === atualizada.id ? atualizada : a)));
        this.ocupadoId.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.erroAcao.set(mensagemDeErro(e));
        this.ocupadoId.set(null);
      },
    });
  }

  // Conta que o usuário clicou para excluir (null = janela de confirmação fechada).
  protected readonly contaParaExcluir = signal<AssinaturaResponse | null>(null);

  // Clicou em "Excluir": só abre a janela de confirmação.
  protected excluir(conta: AssinaturaResponse): void {
    if (this.ocupadoId() !== null) {
      return;
    }
    this.contaParaExcluir.set(conta);
  }

  protected cancelarExclusao(): void {
    this.contaParaExcluir.set(null);
  }

  // Clicou em "Sim, excluir": aí sim chama o backend.
  protected confirmarExclusao(): void {
    const conta = this.contaParaExcluir();
    if (!conta || this.ocupadoId() !== null) {
      return;
    }
    this.ocupadoId.set(conta.id);
    this.erroAcao.set(null);

    this.api.excluir(conta.id).subscribe({
      next: () => {
        this.assinaturas.update((lista) => lista.filter((a) => a.id !== conta.id));
        this.ocupadoId.set(null);
        this.contaParaExcluir.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.erroAcao.set(mensagemDeErro(e));
        this.ocupadoId.set(null);
        this.contaParaExcluir.set(null);
      },
    });
  }
}