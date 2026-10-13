// Funções de formatação usadas nas telas.

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// 39.9 -> "R$ 39,90"
export function formatarMoeda(valor: number): string {
  return formatadorMoeda.format(valor);
}