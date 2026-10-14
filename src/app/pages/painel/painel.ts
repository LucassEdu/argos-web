import { Component, computed, inject, signal } from '@angular/core';

import { Auth } from '../../core/auth';
import { AbaContas } from './aba-contas/aba-contas';
import { AbaGraficos } from './aba-graficos/aba-graficos';
import { AbaPerfil } from './aba-perfil/aba-perfil';
import { AbaSuporte } from './aba-suporte/aba-suporte';
import { AbaVencimentos } from './aba-vencimentos/aba-vencimentos';
import { AvisosTela } from './avisos/avisos';
import { Tema } from '../../core/tema';
import { Sino } from './sino/sino';
import { Ticker } from './ticker/ticker';

type Aba = 'contas' | 'graficos' | 'vencimentos' | 'perfil' | 'suporte';

// Tela principal do app: faixa de topo (marca, ações, saudação e ticker) + quatro abas e o suporte (botão de fones no topo).
@Component({
  selector: 'app-painel',
  imports: [AbaContas, AbaGraficos, AbaVencimentos, AbaPerfil, AbaSuporte, Sino, AvisosTela, Ticker],
  templateUrl: './painel.html',
  styleUrl: './painel.scss',
})
export class Painel {
  protected readonly auth = inject(Auth);
  protected readonly tema = inject(Tema);

  // Qual aba está aberta agora. Signal: a tela atualiza sozinha quando muda.
  protected readonly abaAtiva = signal<Aba>('contas');

  // "curto" é o nome usado em telas estreitas, para as quatro abas caberem.
  protected readonly abas: { id: Aba; titulo: string; curto: string }[] = [
    { id: 'contas', titulo: 'Suas contas', curto: 'Contas' },
    { id: 'graficos', titulo: 'Gráficos', curto: 'Gráficos' },
    { id: 'vencimentos', titulo: 'Próximos vencimentos', curto: 'Vencimentos' },
    { id: 'perfil', titulo: 'Perfil', curto: 'Perfil' },
  ];

  // "Lucas Eduardo Onofre" -> "Lucas"
  protected readonly primeiroNome = computed(
    () => (this.auth.usuario()?.nome ?? '').trim().split(/\s+/)[0] ?? '',
  );

  // "Lucas Eduardo Onofre" -> "LO" (primeira e última inicial)
  protected readonly iniciais = computed(() => {
    const partes = (this.auth.usuario()?.nome ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) {
      return '?';
    }
    const primeira = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  });

  // Bom dia / Boa tarde / Boa noite, conforme a hora do aparelho.
  protected readonly saudacao = computed(() => {
    const hora = new Date().getHours();
    if (hora < 12) {
      return 'Bom dia';
    }
    return hora < 18 ? 'Boa tarde' : 'Boa noite';
  });

  protected selecionar(aba: Aba): void {
    this.abaAtiva.set(aba);
  }
}