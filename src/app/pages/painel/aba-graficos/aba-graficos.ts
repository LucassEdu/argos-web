import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';

import { Assinaturas } from '../../../core/assinaturas';
import { mensagemDeErro } from '../../../core/erros';
import { formatarMoeda } from '../../../core/formatos';
import { AssinaturaResponse, INTERVALO_MESES, ResumoMensal } from '../../../core/models';
import { Pagamentos } from '../../../core/pagamentos';
import { Tema } from '../../../core/tema';

Chart.register(...registerables);

// Cores das categorias (a mesma ordem vale para o gráfico e para a lista ao lado).
const CORES = ['#6c5ce7', '#ff7aa2', '#2ecc9a', '#ffc145', '#4dabf7', '#a66cff', '#ff9f68', '#8896ab'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Aba "Gráficos": gasto mensal por categoria (rosca) e pagamentos por mês (barras).
@Component({
  selector: 'app-aba-graficos',
  templateUrl: './aba-graficos.html',
  styleUrl: './aba-graficos.scss',
})
export class AbaGraficos implements OnInit {
  private readonly assinaturasApi = inject(Assinaturas);
  private readonly pagamentosApi = inject(Pagamentos);
  private readonly tema = inject(Tema);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly assinaturas = signal<AssinaturaResponse[]>([]);
  protected readonly resumo = signal<ResumoMensal[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly moeda = formatarMoeda;

  // Os <canvas> só existem depois que os dados chegam; o signal avisa quando aparecem.
  private readonly roscaEl = viewChild<ElementRef<HTMLCanvasElement>>('rosca');
  private readonly barrasEl = viewChild<ElementRef<HTMLCanvasElement>>('barras');
  private roscaChart?: Chart;
  private barrasChart?: Chart;

  // Gasto mensal por categoria (contas fora do ciclo mensal entram divididas pelos meses do ciclo; pausadas ficam de fora).
  protected readonly porCategoria = computed(() => {
    const soma = new Map<string, number>();
    for (const a of this.assinaturas()) {
      if (a.status !== 'ativa') {
        continue;
      }
      const categoria = a.categoria?.trim() || 'Outros';
      const mensal = a.valor / INTERVALO_MESES[a.recorrencia];
      soma.set(categoria, (soma.get(categoria) ?? 0) + mensal);
    }
    return [...soma.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  });

  protected readonly totalMensal = computed(() =>
    this.porCategoria().reduce((s, c) => s + c.total, 0),
  );

  protected readonly maiorCategoria = computed(() => this.porCategoria()[0] ?? null);

  protected readonly totalPagoNoMes = computed(() => {
    const r = this.resumo();
    return r.length > 0 ? r[r.length - 1].pago : 0;
  });

  constructor() {
    // Redesenha a rosca quando os dados ou o tema mudam.
    effect(() => {
      const canvas = this.roscaEl()?.nativeElement;
      const dados = this.porCategoria();
      const escuro = this.tema.escuro();

      this.roscaChart?.destroy();
      this.roscaChart = undefined;
      if (!canvas || dados.length === 0) {
        return;
      }

      this.roscaChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: dados.map((d) => d.categoria),
          datasets: [
            {
              data: dados.map((d) => d.total),
              backgroundColor: dados.map((_, i) => CORES[i % CORES.length]),
              borderColor: escuro ? '#1f1c3a' : '#ffffff',
              borderWidth: 3,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { display: false }, // a lista ao lado já faz o papel de legenda
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${formatarMoeda(ctx.parsed)} / mês`,
              },
            },
          },
        },
      });
    });

    // Redesenha as barras quando os dados ou o tema mudam.
    effect(() => {
      const canvas = this.barrasEl()?.nativeElement;
      const dados = this.resumo();
      const escuro = this.tema.escuro();

      this.barrasChart?.destroy();
      this.barrasChart = undefined;
      if (!canvas || dados.length === 0) {
        return;
      }

      const texto = escuro ? '#a9a4cf' : '#7a7699';
      const grade = escuro ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

      this.barrasChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: dados.map((d) => this.rotuloMes(d.mes)),
          datasets: [
            {
              label: 'Pago',
              data: dados.map((d) => d.pago),
              backgroundColor: '#2ecc9a',
              borderRadius: 8,
              stack: 'mes',
            },
            {
              label: 'Pendente',
              data: dados.map((d) => d.pendente),
              backgroundColor: '#ffc145',
              borderRadius: 8,
              stack: 'mes',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { color: texto } },
            y: {
              stacked: true,
              beginAtZero: true,
              grid: { color: grade },
              ticks: { color: texto, callback: (v) => formatarMoeda(Number(v)) },
            },
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: texto, usePointStyle: true, padding: 16 },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${formatarMoeda(Number(ctx.parsed.y))}`,
              },
            },
          },
        },
      });
    });

    this.destroyRef.onDestroy(() => {
      this.roscaChart?.destroy();
      this.barrasChart?.destroy();
    });
  }

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    forkJoin({
      assinaturas: this.assinaturasApi.listar(),
      resumo: this.pagamentosApi.resumoMensal(6),
    }).subscribe({
      next: ({ assinaturas, resumo }) => {
        this.assinaturas.set(assinaturas);
        this.resumo.set(resumo);
        this.carregando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  protected cor(indice: number): string {
    return CORES[indice % CORES.length];
  }

  protected percentual(total: number): string {
    const geral = this.totalMensal();
    return geral > 0 ? `${Math.round((total / geral) * 100)}%` : '0%';
  }

  // "2026-10" -> "out/26"
  private rotuloMes(mes: string): string {
    const [ano, numero] = mes.split('-');
    return `${MESES[Number(numero) - 1]}/${ano.slice(2)}`;
  }
}