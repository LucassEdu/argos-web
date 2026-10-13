import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../core/auth';
import { mensagemDeErro } from '../../core/erros';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly formulario = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
  });

  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected entrar(): void {
    if (this.formulario.invalid) {
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);

    this.auth.login(this.formulario.getRawValue()).subscribe({
      next: () => this.router.navigate(['/']),
      error: (erro: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(mensagemDeErro(erro));
      },
    });
  }
}