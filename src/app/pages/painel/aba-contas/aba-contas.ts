import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { Assinaturas } from '../../../core/assinaturas';
import { Auth } from '../../../core/auth';
import { Avisos } from '../../../core/avisos';
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
import { HistoricoConta } from '../historico-conta/historico-conta';
import { Logo } from '../logo/logo';
import { NovaAssinatura } from '../nova-assinatura/nova-assinatura';

// Aba "Suas contas e assinaturas": resumo de gastos + cartões das assinaturas.
@Component({
  selector: 'app-aba-contas',
  imports: [Logo, NovaAssinatura, HistoricoConta],
  templateUrl: './aba-contas.html',
  styleUrl: './aba-contas.scss',
})
export class AbaContas implements OnInit {
  private readonly auth = inject(Auth);
  private readonly api = inject(Assinaturas);
  private readonly avisos = inject(Avisos);

  protected readonly assinaturas = signal<AssinaturaResponse[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  // Janela "Nova conta"/"Editar conta" aberta ou fechada.
  // Conta cujo histórico de pagamentos está aberto (null = fechado).
  protected readonly contaHistorico = signal<AssinaturaResponse | null>(null);

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

  // ---------- Busca e filtros ----------
  protected readonly situacoes = [
    { id: 'todas', nome: 'Todas' },
    { id: 'ativa', nome: 'Ativas' },
    { id: 'pausada', nome: 'Pausadas' },
  ] as const;

  protected readonly busca = signal('');
  protected readonly filtroCategoria = signal('');
  protected readonly filtroStatus = signal<'todas' | 'ativa' | 'pausada'>('todas');
  protected readonly filtroResponsavel = signal('');

  // Opções dos seletores: só o que existe nas contas cadastradas.
  protected readonly categorias = computed(() =>
    [...new Set(this.assinaturas().map((a) => a.categoria).filter((c): c is string => !!c))].sort(
      (a, b) => a.localeCompare(b),
    ),
  );

  protected readonly responsaveis = computed(() => {
    const mapa = new Map<number, string>();
    for (const a of this.assinaturas()) {
      mapa.set(a.responsavelId, a.responsavelNome);
    }
    return [...mapa.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  });

  // O filtro por responsável só faz sentido para o admin e com mais de uma pessoa.
  protected readonly mostrarResponsavel = computed(
    () => this.ehAdmin() && this.responsaveis().length > 1,
  );

  protected readonly temFiltro = computed(
    () =>
      this.busca().trim() !== '' ||
      this.filtroCategoria() !== '' ||
      this.filtroStatus() !== 'todas' ||
      this.filtroResponsavel() !== '',
  );

  // Contas que aparecem na tela, depois de aplicar a busca e os filtros.
  protected readonly filtradas = computed(() => {
    const termo = this.semAcento(this.busca().trim());
    const categoria = this.filtroCategoria();
    const status = this.filtroStatus();
    const responsavel = this.filtroResponsavel();

    return this.ordenadas().filter(
      (a) =>
        (termo === '' || this.semAcento(a.nome).includes(termo)) &&
        (categoria === '' || a.categoria === categoria) &&
        (status === 'todas' || a.status === status) &&
        (responsavel === '' || String(a.responsavelId) === responsavel),
    );
  });

  protected aoDigitar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected aoEscolherCategoria(evento: Event): void {
    this.filtroCategoria.set((evento.target as HTMLSelectElement).value);
  }

  protected aoEscolherResponsavel(evento: Event): void {
    this.filtroResponsavel.set((evento.target as HTMLSelectElement).value);
  }

  protected limparFiltros(): void {
    this.busca.set('');
    this.filtroCategoria.set('');
    this.filtroStatus.set('todas');
    this.filtroResponsavel.set('');
  }

  // "Água" e "agua" contam como iguais na busca.
  private semAcento(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

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

  protected abrirHistorico(conta: AssinaturaResponse): void {
    this.contaHistorico.set(conta);
  }

  protected fecharHistorico(): void {
    this.contaHistorico.set(null);
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
    const editou = this.contaEmEdicao() !== null;
    this.fecharModal();
    this.carregar();
    this.avisos.sucesso(editou ? 'Conta atualizada.' : 'Conta cadastrada.');
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
        this.avisos.sucesso(atualizada.status === 'pausada' ? 'Conta pausada.' : 'Conta reativada.');
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
        this.avisos.sucesso('Conta excluída.');
      },
      error: (e: HttpErrorResponse) => {
        this.erroAcao.set(mensagemDeErro(e));
        this.ocupadoId.set(null);
        this.contaParaExcluir.set(null);
      },
    });
  }
}