import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import { NotificacaoResponse } from './models';

// Acesso à API de notificações (/api/notificacoes): o "sininho" do painel.
@Injectable({ providedIn: 'root' })
export class Notificacoes {
  private readonly http = inject(HttpClient);

  // Notificações do usuário logado.
  listar(): Observable<NotificacaoResponse[]> {
    return this.http.get<NotificacaoResponse[]>(`${API_URL}/notificacoes`);
  }

  // Marca uma notificação como lida.
  marcarComoLida(id: number): Observable<unknown> {
    return this.http.patch(`${API_URL}/notificacoes/${id}/lida`, null, { responseType: 'text' });
  }
}