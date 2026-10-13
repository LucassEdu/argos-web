import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../core/auth';
import { mensagemDeErro } from '../../core/erros';

@Component({
  selector: 'app-esqueci-senha',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './esqueci-senha.html',
})
export class EsqueciSenha {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(Auth);

  protected readonly formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly enviado = signal(false);

  protected enviar(): void {
    if (this.formulario.invalid) {
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);

    this.auth.esqueciSenha(this.formulario.controls.email.value.trim()).subscribe({
      next: () => {
        this.carregando.set(false);
        this.enviado.set(true);
      },
      error: (e: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }
}