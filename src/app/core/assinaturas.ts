import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import {
  AssinaturaRequest,
  AssinaturaResponse,
  MembroResponse,
  PreferenciaNotificacaoRequest,
  ServicoRequest,
  ServicoResponse,
} from './models';

// Acesso à API de assinaturas (/api/assinaturas) e dos recursos ligados a ela.
@Injectable({ providedIn: 'root' })
export class Assinaturas {
  private readonly http = inject(HttpClient);

  // Devolve só as assinaturas que o usuário logado pode ver.
  // O backend descobre o workspace pelo token, por isso a rota não tem número.
  listar(): Observable<AssinaturaResponse[]> {
    return this.http.get<AssinaturaResponse[]>(`${API_URL}/assinaturas`);
  }

  // Só admin pode criar (o backend confere).
  criar(dados: AssinaturaRequest): Observable<AssinaturaResponse> {
    return this.http.post<AssinaturaResponse>(`${API_URL}/assinaturas`, dados);
  }

  // Edita uma conta existente (só admin).
  editar(id: number, dados: AssinaturaRequest): Observable<AssinaturaResponse> {
    return this.http.put<AssinaturaResponse>(`${API_URL}/assinaturas/${id}`, dados);
  }

  // Pausa ou reativa uma conta (só admin). status: 'ativa' ou 'pausada'.
  alterarStatus(id: number, status: 'ativa' | 'pausada'): Observable<AssinaturaResponse> {
    return this.http.patch<AssinaturaResponse>(`${API_URL}/assinaturas/${id}/status`, null, {
      params: { status },
    });
  }

  // Exclui uma conta (só admin).
  excluir(id: number): Observable<unknown> {
    return this.http.delete(`${API_URL}/assinaturas/${id}`, { responseType: 'text' });
  }

  // "Quero ser avisado X dias antes do vencimento".
  definirPreferencia(dados: PreferenciaNotificacaoRequest): Observable<unknown> {
    return this.http.post(`${API_URL}/notificacoes/preferencia`, dados, { responseType: 'text' });
  }

  // --- Catálogo de serviços do workspace (/api/servicos) ---

  listarServicos(): Observable<ServicoResponse[]> {
    return this.http.get<ServicoResponse[]>(`${API_URL}/servicos`);
  }

  // Só admin cria.
  criarServico(dados: ServicoRequest): Observable<ServicoResponse> {
    return this.http.post<ServicoResponse>(`${API_URL}/servicos`, dados);
  }

  // Só admin remove. As contas que já usam o serviço não são afetadas.
  excluirServico(id: number): Observable<unknown> {
    return this.http.delete(`${API_URL}/servicos/${id}`, { responseType: 'text' });
  }

  // Membros do workspace (para escolher quem é o responsável pela conta).
  listarMembros(workspaceId: number): Observable<MembroResponse[]> {
    return this.http.get<MembroResponse[]>(`${API_URL}/workspace/${workspaceId}/membros`);
  }
}