import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../core/auth';
import { mensagemDeErro } from '../../core/erros';
import { TipoPerfil } from '../../core/models';
import { ReenviarEmail } from '../reenviar-email/reenviar-email';

@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, RouterLink, ReenviarEmail],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.scss',
})
export class Cadastro {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(Auth);

  protected readonly formulario = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    tipoPerfil: this.fb.control<TipoPerfil>('solo'),
  });

  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  // Quando preenchido, a tela troca o formulário pela mensagem de "conta criada".
  protected readonly emailCadastrado = signal<string | null>(null);

  protected cadastrar(): void {
    if (this.formulario.invalid) {
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);

    const dados = this.formulario.getRawValue();

    this.auth.cadastrar(dados).subscribe({
      next: () => {
        this.carregando.set(false);
        this.emailCadastrado.set(dados.email);
      },
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(mensagemDeErro(erro));
      },
    });
  }
}