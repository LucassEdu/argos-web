import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Auth } from '../../core/auth';
import { mensagemDeErro } from '../../core/erros';

@Component({
  selector: 'app-redefinir-senha',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './redefinir-senha.html',
})
export class RedefinirSenha {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(Auth);

  // O token vem no endereço: /redefinir-senha?token=...
  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly formulario = this.fb.group({
    novaSenha: ['', [Validators.required, Validators.minLength(6)]],
    repita: ['', [Validators.required]],
  });

  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly concluido = signal(false);

  protected senhasDiferentes(): boolean {
    const { novaSenha, repita } = this.formulario.getRawValue();
    return repita.length > 0 && novaSenha !== repita;
  }

  protected salvar(): void {
    if (this.formulario.invalid || this.senhasDiferentes() || !this.token) {
      return;
    }

    this.carregando.set(true);
    this.erro.set(null);

    this.auth.redefinirSenha(this.token, this.formulario.controls.novaSenha.value).subscribe({
      next: () => {
        this.carregando.set(false);
        this.concluido.set(true);
      },
      error: (e: HttpErrorResponse) => {
        this.carregando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }
}