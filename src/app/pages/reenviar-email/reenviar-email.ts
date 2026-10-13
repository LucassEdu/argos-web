import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, inject, input, signal } from '@angular/core';

import { Auth } from '../../core/auth';
import { mensagemDeErro } from '../../core/erros';

const ESPERA_SEGUNDOS = 60;

// Botão "Reenviar e-mail de confirmação", com contagem para não clicar várias vezes seguidas.
@Component({
  selector: 'app-reenviar-email',
  templateUrl: './reenviar-email.html',
  styleUrl: './reenviar-email.scss',
})
export class ReenviarEmail implements OnDestroy {
  private readonly auth = inject(Auth);

  readonly email = input.required<string>();

  protected readonly enviando = signal(false);
  protected readonly espera = signal(0);
  protected readonly mensagem = signal<string | null>(null);
  protected readonly erro = signal<string | null>(null);

  private relogio: ReturnType<typeof setInterval> | null = null;

  protected reenviar(): void {
    const email = this.email().trim();
    if (!email) {
      this.erro.set('Digite seu e-mail para reenviarmos a confirmação.');
      return;
    }
    if (this.enviando() || this.espera() > 0) {
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);
    this.mensagem.set(null);

    this.auth.reenviarVerificacao(email).subscribe({
      next: () => {
        this.enviando.set(false);
        this.mensagem.set('Pronto! Se a conta estiver aguardando confirmação, o e-mail chega em instantes.');
        this.iniciarEspera(ESPERA_SEGUNDOS);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(e));
      },
    });
  }

  private iniciarEspera(segundos: number): void {
    this.pararRelogio();
    this.espera.set(segundos);
    this.relogio = setInterval(() => {
      const restante = this.espera() - 1;
      this.espera.set(Math.max(restante, 0));
      if (restante <= 0) {
        this.pararRelogio();
      }
    }, 1000);
  }

  private pararRelogio(): void {
    if (this.relogio) {
      clearInterval(this.relogio);
      this.relogio = null;
    }
  }

  ngOnDestroy(): void {
    this.pararRelogio();
  }
}