import { Component, computed, inject, signal } from '@angular/core';

import { Auth } from '../../../core/auth';
import { Avisos } from '../../../core/avisos';

// Endereço de contato do projeto.
const EMAIL_SUPORTE = 'suporte.argos.app@gmail.com';

interface Pergunta {
  pergunta: string;
  resposta: string;
}

// Perguntas frequentes. Cada resposta descreve como o Argos funciona hoje.
const PERGUNTAS: Pergunta[] = [
  {
    pergunta: 'Como cadastro uma conta ou assinatura?',
    resposta:
      'Na aba "Suas contas", clique em "Nova conta". Informe o nome, o valor, o dia da cobrança e a recorrência. ' +
      'Você pode escolher uma categoria e, se quiser, um serviço do catálogo para aparecer com a logo da marca.',
  },
  {
    pergunta: 'Como funcionam as contas anuais, semestrais e trimestrais?',
    resposta:
      'Cada conta tem um ciclo: mensal, bimestral, trimestral, semestral ou anual. O Argos avisa e cobra só nos meses ' +
      'do ciclo. No "Gasto fixo por mês", o valor da conta é dividido pelos meses do ciclo, para você ver quanto ela ' +
      'pesa em média todo mês.',
  },
  {
    pergunta: 'Como recebo os avisos de vencimento?',
    resposta:
      'Todo dia de manhã o Argos confere suas contas. Quando falta o número de dias que você escolheu, ele envia um ' +
      'e-mail e mostra o aviso no sino. Você define o prazo padrão na aba "Perfil", em "Aviso padrão". Use 0 para ' +
      'não receber avisos. Cada conta também pode ter o seu próprio prazo.',
  },
  {
    pergunta: 'Como marco uma conta como paga?',
    resposta:
      'Na aba "Próximos vencimentos", clique em "Já paguei" na cobrança. Se marcou sem querer, é só desfazer na ' +
      'mesma lista. O histórico de pagamentos de cada conta fica no botão "Histórico", nos cartões de "Suas contas".',
  },
  {
    pergunta: 'O que acontece quando eu pauso uma conta?',
    resposta:
      'Uma conta pausada deixa de contar no gasto mensal e nos gráficos, e não gera avisos de vencimento. Ela continua ' +
      'cadastrada e você pode reativar quando quiser.',
  },
  {
    pergunta: 'Qual a diferença entre espaço individual e família?',
    resposta:
      'No espaço individual, só você usa o Argos. No espaço família, o administrador convida outras pessoas por ' +
      'e-mail. Contas compartilhadas aparecem para todos, e contas privadas só para o responsável por elas. Só o ' +
      'administrador cadastra e edita as contas.',
  },
  {
    pergunta: 'O e-mail de confirmação não chegou. O que faço?',
    resposta:
      'Olhe a caixa de spam. Na tela "Quase lá!" há o botão para reenviar o link de confirmação, que pode ser pedido ' +
      'de novo depois de um minuto. Se mesmo assim não chegar, escreva para o suporte pelo e-mail abaixo.',
  },
  {
    pergunta: 'Esqueci minha senha. Como recupero?',
    resposta:
      'Na tela de entrada, clique em "Esqueci minha senha" e informe o e-mail da conta. Você recebe um link que vale por ' +
      '1 hora e só pode ser usado uma vez. Se você está logado, também dá para trocar a senha na aba "Perfil".',
  },
  {
    pergunta: 'Meus dados estão seguros?',
    resposta:
      'As senhas são guardadas de forma criptografada (nunca em texto puro) e o acesso é protegido por login. ' +
      'O Argos é um projeto de portfólio, então evite cadastrar informações sensíveis além das contas e valores.',
  },
];

// Aba "Suporte": perguntas frequentes e contato.
@Component({
  selector: 'app-aba-suporte',
  templateUrl: './aba-suporte.html',
  styleUrl: './aba-suporte.scss',
})
export class AbaSuporte {
  private readonly auth = inject(Auth);
  private readonly avisos = inject(Avisos);

  protected readonly email = EMAIL_SUPORTE;
  protected readonly busca = signal('');

  // Filtra por pergunta ou resposta, sem diferenciar maiúsculas nem acentos.
  protected readonly perguntas = computed(() => {
    const termo = this.normalizar(this.busca().trim());
    if (!termo) {
      return PERGUNTAS;
    }
    return PERGUNTAS.filter((p) => this.normalizar(`${p.pergunta} ${p.resposta}`).includes(termo));
  });

  // Abre o programa de e-mail da pessoa já endereçado ao suporte, com um roteiro para ajudar a descrever o problema.
  protected readonly mailto = computed(() => {
    const conta = this.auth.usuario()?.email ?? '';
    const corpo =
      'Olá, equipe do Argos!\n\n' +
      `Meu e-mail de cadastro: ${conta}\n\n` +
      'O que aconteceu:\n\n\n' +
      'O que eu esperava que acontecesse:\n\n\n';
    return `mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent('[Argos] Preciso de ajuda')}&body=${encodeURIComponent(corpo)}`;
  });

  protected atualizarBusca(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected async copiarEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(EMAIL_SUPORTE);
      this.avisos.sucesso('Endereço copiado.');
    } catch {
      this.avisos.info(`Nosso e-mail: ${EMAIL_SUPORTE}`);
    }
  }

  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }
}