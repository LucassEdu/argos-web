import { HttpErrorResponse } from '@angular/common/http';

// Transforma um erro HTTP numa mensagem amigável para mostrar na tela.
export function mensagemDeErro(erro: HttpErrorResponse): string {
  // Status 0 = a requisição nem chegou ao servidor (backend desligado ou CORS bloqueando).
  if (erro.status === 0) {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
  }

  // Nossa API devolve as regras de negócio violadas como texto simples (status 400).
  if (typeof erro.error === 'string' && erro.error.trim() !== '') {
    return erro.error;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}