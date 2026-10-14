import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { Assinaturas } from '../../../core/assinaturas';
import { formatarMoeda } from '../../../core/formatos';
import { AssinaturaResponse, INTERVALO_MESES, PagamentoResponse, UNIDADE_CICLO } from '../../../core/models';
import { Pagamentos } from '../../../core/pagamentos';

type Tom = '' | 'ok' | 'aviso' | 'perigo';

interface ItemTicker {
  rotulo: string;
  destaque: string;
  detalhe: string;
  tom: Tom;
}

// Faixa que rola sozinha no topo do painel, com um resumo das contas.
// Só usa dados que a API já entrega (contas e cobranças).
@Component({
  selector: 'app-ticker',
  templateUrl: './ticker.html',
  styleUrl: './ticker.scss',
})
export class Ticker {
  private readonly assinaturasApi = inject(Assinaturas);
  private readonly pagamentosApi = inject(Pagamentos);

  // Muda quando a pessoa troca de aba: serve só para recarregar os números.
  readonly gatilho = input<unknown>();

  protected readonly itens = signal<ItemTicker[]>([]);
  protected readonly pausado = signal(false);

  // Quanto mais itens, mais devagar o ciclo inteiro, para a velocidade ficar parecida.
  protected readonly duracao = computed(() => Math.max(20, this.itens().length * 7));

  constructor() {
    effect(() => {
      this.gatilho();
      this.carregar();
    });

    // Mantém os números em dia mesmo com a aba parada.
    const relogio = setInterval(() => this.carregar(), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(relogio));
  }

  protected alternarPausa(): void {
    this.pausado.update((p) => !p);
  }

  private carregar(): void {
    forkJoin({
      contas: this.assinaturasApi.listar(),
      cobrancas: this.pagamentosApi.listar(),
    }).subscribe({
      next: ({ contas, cobrancas }) => this.itens.set(this.montar(contas, cobrancas)),
      error: () => undefined, // sem dados, a faixa simplesmente não aparece
    });
  }

  private montar(contas: AssinaturaResponse[], cobrancas: PagamentoResponse[]): ItemTicker[] {
    const itens: ItemTicker[] = [];
    const moeda = formatarMoeda;

    // ---------- Cobranças ----------
    const pendentes = cobrancas.filter((c) => c.status === 'pendente');

    // Próximos vencimentos (os dois mais perto).
    const proximas = pendentes
      .filter((c) => c.diasParaVencer >= 0)
      .sort((a, b) => a.diasParaVencer - b.diasParaVencer)
      .slice(0, 2);
    for (const c of proximas) {
      const dia = c.dataVencimento.slice(8, 10);
      itens.push({
        rotulo: 'Próximo',
        destaque: `${c.assinaturaNome} · dia ${Number(dia)}`,
        detalhe: `${this.quando(c.diasParaVencer)} · ${moeda(c.valor)}`,
        tom: c.diasParaVencer <= 3 ? 'aviso' : '',
      });
    }

    // Atrasadas.
    const atrasadas = pendentes.filter((c) => c.diasParaVencer < 0);
    if (atrasadas.length > 0) {
      const total = atrasadas.reduce((s, c) => s + c.valor, 0);
      itens.push({
        rotulo: 'Atrasadas',
        destaque: String(atrasadas.length),
        detalhe: moeda(total),
        tom: 'perigo',
      });
    } else {
      itens.push({ rotulo: 'Atrasadas', destaque: '0', detalhe: 'tudo em dia ✓', tom: 'ok' });
    }

    // Pago x pendente no mês atual.
    const agora = new Date();
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const doMes = cobrancas.filter((c) => c.dataVencimento.startsWith(mesAtual));
    const pagas = doMes.filter((c) => c.status === 'pago');
    const faltam = doMes.filter((c) => c.status === 'pendente');
    const totalPago = pagas.reduce((s, c) => s + c.valor, 0);
    const totalFalta = faltam.reduce((s, c) => s + c.valor, 0);
    if (doMes.length > 0) {
      const percentual = Math.round((totalPago / (totalPago + totalFalta || 1)) * 100);
      itens.push({
        rotulo: 'Pago no mês',
        destaque: moeda(totalPago),
        detalhe: `${percentual}% do mês`,
        tom: 'ok',
      });
      itens.push({
        rotulo: 'Falta pagar',
        destaque: moeda(totalFalta),
        detalhe: faltam.length === 1 ? '1 conta' : `${faltam.length} contas`,
        tom: faltam.length > 0 ? 'aviso' : 'ok',
      });
    }

    // ---------- Contas ----------
    const ativas = contas.filter((a) => a.status === 'ativa');
    const porMes = (a: AssinaturaResponse) => a.valor / INTERVALO_MESES[a.recorrencia];
    const gastoMensal = ativas.reduce((s, a) => s + porMes(a), 0);

    itens.push({ rotulo: 'Gasto fixo/mês', destaque: moeda(gastoMensal), detalhe: 'média dos ciclos', tom: '' });
    itens.push({
      rotulo: 'Contas ativas',
      destaque: String(ativas.length),
      detalhe: `de ${contas.length} cadastradas`,
      tom: '',
    });

    if (ativas.length > 0) {
      const maior = [...ativas].sort((a, b) => porMes(b) - porMes(a))[0];
      itens.push({
        rotulo: 'Maior conta',
        destaque: maior.nome,
        detalhe: `${moeda(maior.valor)} / ${UNIDADE_CICLO[maior.recorrencia]}`,
        tom: '',
      });

      // Categoria que mais pesa no gasto mensal.
      const porCategoria = new Map<string, number>();
      for (const a of ativas) {
        const nome = a.categoria?.trim() || 'Sem categoria';
        porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + porMes(a));
      }
      const [topo, valorTopo] = [...porCategoria.entries()].sort((a, b) => b[1] - a[1])[0];
      if (gastoMensal > 0) {
        itens.push({
          rotulo: 'Categoria top',
          destaque: topo,
          detalhe: `${Math.round((valorTopo / gastoMensal) * 100)}% do gasto`,
          tom: '',
        });
      }
    }

    return itens;
  }

  private quando(dias: number): string {
    if (dias === 0) {
      return 'hoje';
    }
    return dias === 1 ? 'amanhã' : `em ${dias} dias`;
  }
}