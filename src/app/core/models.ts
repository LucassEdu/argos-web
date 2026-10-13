// Formatos de dados trocados com a API (espelham os DTOs do backend Spring Boot).

export type Papel = 'admin' | 'membro';
export type TipoPerfil = 'solo' | 'familia';
export type Recorrencia = 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
export type Visibilidade = 'privada' | 'compartilhada';
export type StatusAssinatura = 'ativa' | 'pausada';

// --- Ciclos de cobrança ---
// De quantos em quantos meses cada tipo de conta é cobrado.
export const INTERVALO_MESES: Record<Recorrencia, number> = {
  mensal: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

// Nome da "unidade" para mostrar depois do valor: "R$ 90,00 / trimestre".
export const UNIDADE_CICLO: Record<Recorrencia, string> = {
  mensal: 'mês',
  bimestral: 'bimestre',
  trimestral: 'trimestre',
  semestral: 'semestre',
  anual: 'ano',
};

export const NOMES_RECORRENCIA: Record<Recorrencia, string> = {
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Meses (1 a 12) em que a conta cobra. Conta mensal: todos. Sem mês definido: começa em janeiro.
export function mesesDoCiclo(recorrencia: Recorrencia, mesInicio: number | null | undefined): number[] {
  const passo = INTERVALO_MESES[recorrencia];
  if (passo === 1) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }
  const inicio = mesInicio ?? 1;
  const meses: number[] = [];
  for (let m = inicio; m < inicio + 12; m += passo) {
    meses.push(((m - 1) % 12) + 1);
  }
  return meses.sort((a, b) => a - b);
}

// --- Autenticação ---
export interface CadastroRequest {
  nome: string;
  email: string;
  senha: string;
  tipoPerfil: TipoPerfil;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
}

// Dados de quem está logado (GET /api/usuarios/me)
export interface Me {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  workspaceId: number;
  workspaceNome: string;
  tipoPerfil: TipoPerfil;
  foto: string | null;
  diasAvisoPadrao: number;
}

// Dados do perfil que o próprio usuário pode alterar. Campo ausente = não muda.
export interface PerfilRequest {
  nome?: string;
  foto?: string; // data URL da imagem; vazio ('') remove a foto
  diasAvisoPadrao?: number;
}

export interface AlterarSenhaRequest {
  senhaAtual: string;
  novaSenha: string;
}

// --- Workspace ---
export interface MembroResponse {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  emailVerificado: boolean;
}

// --- Assinaturas ---
export interface AssinaturaRequest {
  workspaceId: number;
  responsavelId: number;
  nome: string;
  categoria?: string;
  valor: number;
  diaCobranca: number;
  recorrencia: Recorrencia;
  mesInicio?: number | null; // 1 a 12; só para contas que não são mensais
  icone?: string; // id do catálogo (ex.: 'spotify'); vazio = sem logo de marca
  logo?: string; // imagem enviada pelo cliente (data URL); vazio = sem imagem
  visibilidade?: Visibilidade;
}

export interface AssinaturaResponse {
  id: number;
  nome: string;
  categoria: string | null;
  valor: number;
  diaCobranca: number;
  recorrencia: Recorrencia;
  mesInicio: number | null;
  icone: string | null;
  logo: string | null;
  visibilidade: Visibilidade;
  status: StatusAssinatura;
  responsavelId: number;
  responsavelNome: string;
  workspaceId: number;
}

// --- Serviços do workspace (catálogo do cliente) ---
export interface ServicoRequest {
  nome: string;
  categoria?: string;
  logo?: string;
}

export interface ServicoResponse {
  id: number;
  nome: string;
  categoria: string | null;
  logo: string | null;
}

// --- Notificações ---
export interface PreferenciaNotificacaoRequest {
  assinaturaId: number;
  diasAntecedencia: number;
  ativa?: boolean;
}

export interface NotificacaoResponse {
  id: number;
  mensagem: string;
  lida: boolean;
  assinaturaId: number;
  assinaturaNome: string;
  criadoEm: string;
}

// --- Pagamentos (cobranças mensais) ---
export type SituacaoPagamento = 'paga' | 'vencida' | 'proxima' | 'em_dia';

export interface PagamentoResponse {
  id: number;
  assinaturaId: number;
  assinaturaNome: string;
  categoria: string | null;
  responsavelNome: string;
  valor: number;
  dataVencimento: string; // "2026-10-12"
  status: 'pendente' | 'pago';
  dataPagamento: string | null;
  diasParaVencer: number; // negativo = já venceu
  situacao: SituacaoPagamento;
}
// --- Resumo mensal (gráfico de barras) ---
export interface ResumoMensal {
  mes: string; // "2026-10"
  pago: number;
  pendente: number;
}