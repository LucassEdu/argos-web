import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { mensagemDeErro } from '../../../core/erros';
import { formatarMoeda } from '../../../core/formatos';
import { Assinaturas } from '../../../core/assinaturas';
import { Avisos } from '../../../core/avisos';
import { AssinaturaResponse, PagamentoResponse, SituacaoPagamento } from '../../../core/models';
import { Pagamentos } from '../../../core/pagamentos';
import { Logo } from '../logo/logo';

interface Grupo {
  id: string;
  titulo: string;
  classe: string;
  total: number;
  itens: PagamentoResponse[];
}

// Um ponto na régua do mês.
interface Marcador {
  id: string;
  nome: string; // nome da conta, ou "3 contas" quando várias vencem no mesmo dia
  qtd: number;
  data: string; // "12/10"
  titulo: string; // texto completo do tooltip
  pos: number; // posição em % na régua
  nivel: 0 | 1; // 0 = rótulo acima da linha, 1 = abaixo (evita sobreposição)
  situacao: SituacaoPagamento;
}

interface Marca {
  pos: number;
  rotulo: string;
}

// A régua mostra 7 dias para trás e 30 para frente, a partir de hoje.
const DIAS_PASSADO = 7;
const DIAS_FUTURO = 30;
const DIAS_TOTAL = DIAS_PASSADO + DIAS_FUTURO;

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Aba "Próximos vencimentos": régua do mês + lista de cobranças por urgência.
@Component({
  selector: 'app-aba-vencimentos',
  imports: [Logo],
  templateUrl: './aba-vencimentos.html',
  styleUrl: './aba-vencimentos.scss',
})
export class AbaVencimentos implements OnInit {
  private readonly api = inject(Pagamentos);
  private readonly apiContas = inject(Assinaturas);
  private readonly avisos = inject(Avisos);

  protected readonly pagamentos = signal<PagamentoResponse[]>([]);
  // Contas por id, só para pegar a logo de cada cobrança (o backend não repete a imagem em cada linha).
  private readonly contas = signal<Map<number, AssinaturaResponse>>(new Map());
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly ocupadoId = signal<number | null>(null);
  // Cobrança que acabou de ser marcada como paga (para piscar de verde por um instante).
  protected readonly recenteId = signal<number | null>(null);

  protected readonly moeda = formatarMoeda;

  // Quanto ainda falta pagar (só as pendentes).
  protected readonly totalPendente = computed(() =>
    this.pagamentos()
      .filter((p) => p.status === 'pendente')
      .reduce((soma, p) => soma + p.valor, 0),
  );

  // "R$ 201,89" -> "201,89" (o "R$" aparece menor, separado, no destaque)
  protected readonly valorGrande = computed(() =>
    this.moeda(this.totalPendente()).replace(/^R\$[\s ]*/, ''),
  );

  protected readonly qtdVencidas = computed(() => this.contar('vencida'));
  protected readonly qtdProximas = computed(() => this.contar('proxima'));
  protected readonly qtdPagas = computed(() => this.contar('paga'));

  // Seções da tela, na ordem de urgência.
  protected readonly grupos = computed<Grupo[]>(() => {
    const lista = this.pagamentos();
    const por = (s: SituacaoPagamento) => lista.filter((p) => p.situacao === s);
    const montar = (id: SituacaoPagamento, titulo: string): Grupo => {
      const itens = por(id);
      return {
        id,
        titulo,
        classe: id,
        total: itens.reduce((soma, p) => soma + p.valor, 0),
        itens,
      };
    };
    return [
      montar('vencida', 'Atrasadas'),
      montar('proxima', 'Vencem em breve'),
      montar('em_dia', 'Mais para frente'),
      montar('paga', 'Pagas neste mês'),
    ].filter((g) => g.itens.length > 0);
  });

  // Dados da régua: pontos, marcas de data e posição do "hoje".
  protected readonly regua = computed(() => {
    const visiveis = this.pagamentos()
      .filter((p) => p.diasParaVencer <= DIAS_FUTURO)
      .filter((p) => p.status === 'pendente' || p.diasParaVencer >= -DIAS_PASSADO)
      .sort((a, b) => a.diasParaVencer - b.diasParaVencer);

    // Contas que vencem no mesmo dia viram um ponto só (com o número de contas).
    const porDia = new Map<number, PagamentoResponse[]>();
    for (const p of visiveis) {
      const lista = porDia.get(p.diasParaVencer) ?? [];
      lista.push(p);
      porDia.set(p.diasParaVencer, lista);
    }

    const ordem: SituacaoPagamento[] = ['vencida', 'proxima', 'em_dia', 'paga'];
    const marcadores: Marcador[] = [];
    let ultimaPos = -100;
    let nivel: 0 | 1 = 0;

    for (const [dias, grupo] of porDia) {
      const pos = this.posicao(dias);
      // Pontos muito próximos alternam entre acima e abaixo da linha.
      nivel = pos - ultimaPos < 14 ? (nivel === 0 ? 1 : 0) : 0;
      ultimaPos = pos;

      const data = this.data(grupo[0].dataVencimento);
      const total = grupo.reduce((soma, p) => soma + p.valor, 0);
      // O ponto leva a cor da situação mais urgente do grupo.
      const situacao = ordem.find((o) => grupo.some((p) => p.situacao === o)) ?? 'em_dia';

      marcadores.push({
        id: String(dias),
        nome: grupo.length === 1 ? grupo[0].assinaturaNome : `${grupo.length} contas`,
        qtd: grupo.length,
        data,
        titulo:
          grupo.map((p) => `${p.assinaturaNome} · ${this.moeda(p.valor)}`).join('\n') +
          (grupo.length > 1 ? `\nTotal em ${data}: ${this.moeda(total)}` : ''),
        pos,
        nivel,
        situacao,
      });
    }

    const marcas: Marca[] = [0, 7, 14, 21, 28].map((dias) => {
      const d = new Date();
      d.setDate(d.getDate() + dias);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      return { pos: this.posicao(dias), rotulo: dias === 0 ? 'hoje' : `${dia}/${mes}` };
    });

    return { marcadores, marcas, hojePos: this.posicao(0) };
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    // Se falhar, as linhas só ficam com o ícone da categoria / inicial.
    this.apiContas.listar().subscribe({
      next: (lista) => this.contas.set(new Map(lista.map((a) => [a.id, a]))),
      error: () => undefined,
    });

    this.api.listar().subscribe({
      next: (lista) => {
        this.pagamentos.set(lista);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  // "Já paguei" <-> "Ainda não paguei".
  protected alternar(p: PagamentoResponse): void {
    if (this.ocupadoId() !== null) {
      return;
    }
    const novo = p.status === 'pago' ? 'pendente' : 'pago';
    this.ocupadoId.set(p.id);
    this.erro.set(null);

    this.api.alterarStatus(p.id, novo).subscribe({
      next: (atualizado) => {
        this.pagamentos.update((l) => l.map((x) => (x.id === atualizado.id ? atualizado : x)));
        this.ocupadoId.set(null);

        this.avisos.sucesso(
          novo === 'pago' ? `${p.assinaturaNome} marcada como paga.` : 'A cobrança voltou para pendente.',
        );

        if (novo === 'pago') {
          this.recenteId.set(atualizado.id);
          setTimeout(() => this.recenteId.set(null), 1800);
        }
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(mensagemDeErro(e));
        this.ocupadoId.set(null);
      },
    });
  }

  protected conta(assinaturaId: number): AssinaturaResponse | undefined {
    return this.contas().get(assinaturaId);
  }

  // "2026-10-12" -> "12/10" (sem converter fuso, para não mudar o dia)
  protected data(iso: string | null): string {
    if (!iso) {
      return '';
    }
    const [, mes, dia] = iso.split('-');
    return `${dia}/${mes}`;
  }

  protected dia(iso: string): string {
    return iso.split('-')[2];
  }

  protected mes(iso: string): string {
    return MESES[Number(iso.split('-')[1]) - 1];
  }

  protected prazo(p: PagamentoResponse): string {
    if (p.situacao === 'paga') {
      return `Paga em ${this.data(p.dataPagamento)}`;
    }
    const d = p.diasParaVencer;
    if (d < 0) {
      return d === -1 ? 'Venceu ontem' : `Venceu há ${-d} dias`;
    }
    if (d === 0) {
      return 'Vence hoje';
    }
    if (d === 1) {
      return 'Vence amanhã';
    }
    return `Vence em ${d} dias`;
  }

  private contar(situacao: SituacaoPagamento): number {
    return this.pagamentos().filter((p) => p.situacao === situacao).length;
  }

  // Dias a partir de hoje -> posição de 0 a 100 na régua.
  private posicao(dias: number): number {
    const pos = ((dias + DIAS_PASSADO) / DIAS_TOTAL) * 100;
    return Math.min(100, Math.max(0, pos));
  }
}