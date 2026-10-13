import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, catchError, of, switchMap } from 'rxjs';

import { Assinaturas } from '../../../core/assinaturas';
import { CATALOGO, CATEGORIAS, ServicoCatalogo } from '../../../core/catalogo';
import { Auth } from '../../../core/auth';
import { mensagemDeErro } from '../../../core/erros';
import {
  AssinaturaRequest,
  AssinaturaResponse,
  MESES_CURTOS,
  MESES_LONGOS,
  NOMES_RECORRENCIA,
  Recorrencia,
  ServicoResponse,
  mesesDoCiclo,
} from '../../../core/models';
import { Logo } from '../logo/logo';

interface Pessoa {
  id: number;
  nome: string;
}

// Janela (modal) para cadastrar uma nova conta/assinatura.
@Component({
  selector: 'app-nova-assinatura',
  imports: [ReactiveFormsModule, Logo],
  templateUrl: './nova-assinatura.html',
  styleUrl: './nova-assinatura.scss',
})
export class NovaAssinatura implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(Assinaturas);
  private readonly auth = inject(Auth);

  // Quando vem uma conta, a janela funciona como "Editar"; sem conta, como "Nova".
  readonly conta = input<AssinaturaResponse | null>(null);

  // Avisos para a tela de fora: fechar sem salvar / conta criada com sucesso.
  readonly fechar = output<void>();
  readonly criada = output<void>();

  // Categorias da lista. Se uma conta antiga tiver outra categoria, ela é incluída ao editar.
  protected readonly categorias = signal<string[]>([...CATEGORIAS]);

  // "escolher" = grade de serviços (só ao criar); "dados" = formulário.
  protected readonly fase = signal<'escolher' | 'dados'>('escolher');
  protected readonly busca = signal('');
  protected readonly erroLogo = signal<string | null>(null);

  // Serviços que o cliente já criou neste workspace ("Criados por você").
  protected readonly meusServicos = signal<ServicoResponse[]>([]);
  // Serviço salvo que foi escolhido agora (não precisa salvar de novo).
  protected readonly servicoSalvoId = signal<number | null>(null);
  // Serviço salvo em confirmação de remoção.
  protected readonly removendoId = signal<number | null>(null);

  protected readonly meusFiltrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.meusServicos().filter((s) => !termo || s.nome.toLowerCase().includes(termo));
  });

  protected readonly ehAdmin = computed(() => this.auth.usuario()?.papel === 'admin');

  // Catálogo filtrado pela busca e agrupado por categoria.
  protected readonly grupos = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const mapa = new Map<string, ServicoCatalogo[]>();
    for (const s of CATALOGO) {
      if (termo && !s.nome.toLowerCase().includes(termo) && !s.categoria.toLowerCase().includes(termo)) {
        continue;
      }
      mapa.set(s.categoria, [...(mapa.get(s.categoria) ?? []), s]);
    }
    return CATEGORIAS.filter((c) => mapa.has(c)).map((c) => ({ categoria: c, itens: mapa.get(c)! }));
  });
  protected readonly ciclos = Object.keys(NOMES_RECORRENCIA) as Recorrencia[];
  protected readonly nomesCiclo = NOMES_RECORRENCIA;
  protected readonly meses = MESES_LONGOS.map((nome, i) => ({ numero: i + 1, nome }));
  protected readonly pessoas = signal<Pessoa[]>([]);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(80)]],
    categoria: ['Outros'],
    icone: [''],
    logo: [''],
    salvarNoCatalogo: [true],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    diaCobranca: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    recorrencia: ['mensal' as Recorrencia],
    mesInicio: [new Date().getMonth() + 1],
    visibilidade: ['privada' as 'privada' | 'compartilhada'],
    responsavelId: [0],
    diasAntecedencia: [3, [Validators.required, Validators.min(0), Validators.max(30)]],
  });

  ngOnInit(): void {
    const eu = this.auth.usuario();
    if (!eu) {
      return;
    }

    // Começa só com você; depois completa com os membros do workspace.
    this.pessoas.set([{ id: eu.id, nome: eu.nome }]);
    this.form.patchValue({ responsavelId: eu.id, diasAntecedencia: eu.diasAvisoPadrao ?? 3 });

    // Modo edição: preenche o formulário com os dados da conta.
    const c = this.conta();
    if (c) {
      this.fase.set('dados');
      if (c.categoria && !this.categorias().includes(c.categoria)) {
        this.categorias.update((l) => [...l, c.categoria as string]);
      }
      this.form.patchValue({
        icone: c.icone ?? '',
        logo: c.logo ?? '',
        nome: c.nome,
        categoria: c.categoria ?? 'Outros',
        valor: c.valor,
        diaCobranca: c.diaCobranca,
        recorrencia: c.recorrencia,
        mesInicio: c.mesInicio ?? 1,
        visibilidade: c.visibilidade,
        responsavelId: c.responsavelId,
      });
    }

    if (!c) {
      this.api.listarServicos().subscribe({
        next: (lista) => this.meusServicos.set(lista),
        error: () => undefined, // sem catálogo próprio, segue só com o padrão
      });
    }

    this.api.listarMembros(eu.workspaceId).subscribe({
      next: (membros) => {
        const lista: Pessoa[] = membros.map((m) => ({ id: m.id, nome: m.nome }));
        if (!lista.some((p) => p.id === eu.id)) {
          lista.unshift({ id: eu.id, nome: eu.nome });
        }
        this.pessoas.set(lista);
      },
      // Se falhar, segue só com o próprio usuário como opção.
      error: () => undefined,
    });
  }

  // Clicou num serviço do catálogo: preenche nome, categoria e logo e vai para o formulário.
  protected escolherServico(s: ServicoCatalogo): void {
    this.form.patchValue({ nome: s.nome, categoria: s.categoria, icone: s.id, logo: '' });
    this.servicoSalvoId.set(null);
    this.fase.set('dados');
  }

  // Escolheu um serviço que o cliente já tinha criado.
  protected escolherMeu(s: ServicoResponse): void {
    this.form.patchValue({
      nome: s.nome,
      categoria: s.categoria ?? 'Outros',
      icone: '',
      logo: s.logo ?? '',
    });
    this.servicoSalvoId.set(s.id);
    this.fase.set('dados');
  }

  protected pedirRemocao(id: number): void {
    this.removendoId.set(id);
  }

  protected cancelarRemocao(): void {
    this.removendoId.set(null);
  }

  protected confirmarRemocao(s: ServicoResponse): void {
    this.api.excluirServico(s.id).subscribe({
      next: () => {
        this.meusServicos.update((lista) => lista.filter((x) => x.id !== s.id));
        this.removendoId.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.erro.set(mensagemDeErro(e));
        this.removendoId.set(null);
      },
    });
  }

  // "Outro serviço": o cliente digita o nome e, se quiser, envia o logo.
  protected outroServico(): void {
    this.form.patchValue({ nome: this.busca().trim(), icone: '', logo: '' });
    this.servicoSalvoId.set(null);
    this.fase.set('dados');
  }

  protected trocarServico(): void {
    this.fase.set('escolher');
  }

  protected removerLogo(): void {
    this.form.patchValue({ logo: '' });
    this.erroLogo.set(null);
  }

  // Lê a imagem escolhida, reduz para 160x160 e guarda como texto (data URL).
  protected escolherArquivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    entrada.value = '';
    if (!arquivo) {
      return;
    }
    if (!arquivo.type.startsWith('image/')) {
      this.erroLogo.set('Escolha um arquivo de imagem (PNG, JPG, WebP ou SVG).');
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      this.erroLogo.set('A imagem é grande demais. Use uma de até 5 MB.');
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const lado = 160;
        const canvas = document.createElement('canvas');
        canvas.width = lado;
        canvas.height = lado;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          this.erroLogo.set('Não foi possível processar a imagem.');
          return;
        }
        // "contain": a imagem inteira cabe no quadrado, sem cortar nem esticar.
        const escala = Math.min(lado / img.width, lado / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);

        let dados = canvas.toDataURL('image/png');
        if (dados.length > 100_000) {
          dados = canvas.toDataURL('image/jpeg', 0.85);
        }
        this.form.patchValue({ logo: dados });
        this.erroLogo.set(null);
      };
      img.onerror = () => this.erroLogo.set('Não foi possível ler esta imagem.');
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  }

  // Falha ao salvar no catálogo não atrapalha: a conta já foi criada.
  private salvarNoCatalogoSeNecessario(
    nome: string,
    categoria: string,
    logo: string,
    icone: string,
    quer: boolean,
  ): Observable<unknown> {
    const jaExiste = this.meusServicos().some((s) => s.nome.toLowerCase() === nome.toLowerCase());
    if (!quer || icone || this.servicoSalvoId() !== null || jaExiste || !this.ehAdmin()) {
      return of(null);
    }
    return this.api.criarServico({ nome, categoria, logo }).pipe(catchError(() => of(null)));
  }

  // "Cobra em: fev, mai, ago, nov" (só aparece quando a conta não é mensal).
  protected previaMeses(): string {
    const v = this.form.getRawValue();
    return mesesDoCiclo(v.recorrencia, Number(v.mesInicio))
      .map((m) => MESES_CURTOS[m - 1])
      .join(', ');
  }

  protected salvar(): void {
    // Trava contra clique repetido: enquanto envia, ignora novos envios.
    if (this.enviando()) {
      return;
    }

    const eu = this.auth.usuario();
    if (this.form.invalid || !eu) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const pedido: AssinaturaRequest = {
      workspaceId: eu.workspaceId,
      responsavelId: v.responsavelId,
      nome: v.nome.trim(),
      categoria: v.categoria,
      icone: v.icone,
      logo: v.logo,
      valor: Number(v.valor),
      diaCobranca: Number(v.diaCobranca),
      recorrencia: v.recorrencia,
      mesInicio: v.recorrencia === 'mensal' ? null : Number(v.mesInicio),
      visibilidade: v.visibilidade,
    };

    this.enviando.set(true);
    this.erro.set(null);

    const c = this.conta();

    // Editar: só atualiza a conta. Criar: cria e depois grava "avisar X dias antes" (0 = não avisar).
    const envio$: Observable<unknown> = c
      ? this.api.editar(c.id, pedido)
      : this.api.criar(pedido).pipe(
          switchMap((nova) =>
            Number(v.diasAntecedencia) > 0
              ? this.api.definirPreferencia({
                  assinaturaId: nova.id,
                  diasAntecedencia: Number(v.diasAntecedencia),
                  ativa: true,
                })
              : of(null),
          ),
          // Serviço novo (sem catálogo padrão e ainda não salvo): guarda para reaproveitar.
          switchMap(() => this.salvarNoCatalogoSeNecessario(v.nome.trim(), v.categoria, v.logo, v.icone, v.salvarNoCatalogo)),
        );

    envio$
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.criada.emit();
        },
        error: (e: HttpErrorResponse) => {
          this.erro.set(mensagemDeErro(e));
          this.enviando.set(false);
        },
      });
  }
}