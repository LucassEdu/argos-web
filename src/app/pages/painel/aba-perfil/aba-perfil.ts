import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Assinaturas } from '../../../core/assinaturas';
import { Auth } from '../../../core/auth';
import { mensagemDeErro } from '../../../core/erros';
import { formatarMoeda } from '../../../core/formatos';
import { reduzirParaQuadrado } from '../../../core/imagem';
import { AssinaturaResponse, INTERVALO_MESES } from '../../../core/models';
import { Perfil } from '../../../core/perfil';
import { Tema } from '../../../core/tema';

// Aba "Perfil": foto, dados pessoais, resumo das contas, aparência e senha.
@Component({
  selector: 'app-aba-perfil',
  imports: [ReactiveFormsModule],
  templateUrl: './aba-perfil.html',
  styleUrl: './aba-perfil.scss',
})
export class AbaPerfil implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly perfilApi = inject(Perfil);
  private readonly assinaturasApi = inject(Assinaturas);
  protected readonly auth = inject(Auth);
  protected readonly tema = inject(Tema);

  protected readonly me = this.auth.usuario;
  protected readonly assinaturas = signal<AssinaturaResponse[]>([]);
  protected readonly moeda = formatarMoeda;

  protected readonly iniciais = computed(() => {
    const partes = (this.me()?.nome ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) {
      return '?';
    }
    return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  });

  // Resumo: só as contas pelas quais você é o responsável.
  protected readonly minhas = computed(() =>
    this.assinaturas().filter((a) => a.responsavelId === this.me()?.id),
  );
  protected readonly ativas = computed(() => this.minhas().filter((a) => a.status === 'ativa'));
  protected readonly gastoMensal = computed(() =>
    this.ativas().reduce((soma, a) => soma + a.valor / INTERVALO_MESES[a.recorrencia], 0),
  );

  protected readonly formDados = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(80)]],
    diasAvisoPadrao: [3, [Validators.required, Validators.min(0), Validators.max(30)]],
  });

  protected readonly formSenha = this.fb.group({
    senhaAtual: ['', Validators.required],
    novaSenha: ['', [Validators.required, Validators.minLength(6)]],
    confirmar: ['', Validators.required],
  });

  protected readonly salvando = signal(false);
  protected readonly okDados = signal(false);
  protected readonly erroDados = signal<string | null>(null);

  protected readonly enviandoFoto = signal(false);
  protected readonly erroFoto = signal<string | null>(null);

  protected readonly trocandoSenha = signal(false);
  protected readonly okSenha = signal(false);
  protected readonly erroSenha = signal<string | null>(null);

  ngOnInit(): void {
    const eu = this.me();
    if (eu) {
      this.formDados.patchValue({ nome: eu.nome, diasAvisoPadrao: eu.diasAvisoPadrao ?? 3 });
    }
    this.assinaturasApi.listar().subscribe({
      next: (lista) => this.assinaturas.set(lista),
      error: () => undefined, // sem o resumo, o resto da aba continua funcionando
    });
  }

  protected salvarDados(): void {
    if (this.salvando()) {
      return;
    }
    if (this.formDados.invalid) {
      this.formDados.markAllAsTouched();
      return;
    }
    const v = this.formDados.getRawValue();
    this.salvando.set(true);
    this.okDados.set(false);
    this.erroDados.set(null);

    this.perfilApi.atualizar({ nome: v.nome.trim(), diasAvisoPadrao: Number(v.diasAvisoPadrao) }).subscribe({
      next: () => {
        this.salvando.set(false);
        this.okDados.set(true);
        this.formDados.markAsPristine();
      },
      error: (e: HttpErrorResponse) => {
        this.erroDados.set(mensagemDeErro(e));
        this.salvando.set(false);
      },
    });
  }

  protected escolherFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0];
    entrada.value = '';
    if (!arquivo || this.enviandoFoto()) {
      return;
    }
    this.erroFoto.set(null);
    this.enviandoFoto.set(true);

    reduzirParaQuadrado(arquivo)
      .then((foto) => this.gravarFoto(foto))
      .catch((e: Error) => {
        this.erroFoto.set(e.message);
        this.enviandoFoto.set(false);
      });
  }

  protected removerFoto(): void {
    if (this.enviandoFoto()) {
      return;
    }
    this.erroFoto.set(null);
    this.enviandoFoto.set(true);
    this.gravarFoto('');
  }

  private gravarFoto(foto: string): void {
    this.perfilApi.atualizar({ foto }).subscribe({
      next: () => this.enviandoFoto.set(false),
      error: (e: HttpErrorResponse) => {
        this.erroFoto.set(mensagemDeErro(e));
        this.enviandoFoto.set(false);
      },
    });
  }

  protected trocarSenha(): void {
    if (this.trocandoSenha()) {
      return;
    }
    if (this.formSenha.invalid) {
      this.formSenha.markAllAsTouched();
      return;
    }
    const v = this.formSenha.getRawValue();
    this.okSenha.set(false);
    if (v.novaSenha !== v.confirmar) {
      this.erroSenha.set('A confirmação não é igual à nova senha.');
      return;
    }
    this.trocandoSenha.set(true);
    this.erroSenha.set(null);

    this.perfilApi.alterarSenha({ senhaAtual: v.senhaAtual, novaSenha: v.novaSenha }).subscribe({
      next: () => {
        this.trocandoSenha.set(false);
        this.okSenha.set(true);
        this.formSenha.reset();
      },
      error: (e: HttpErrorResponse) => {
        this.erroSenha.set(mensagemDeErro(e));
        this.trocandoSenha.set(false);
      },
    });
  }
}