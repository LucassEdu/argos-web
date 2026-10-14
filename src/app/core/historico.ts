import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import { PagamentoResponse } from './models';

// Histórico de cobranças de uma conta (GET /api/historico/{id}).
@Injectable({ providedIn: 'root' })
export class Historico {
  private readonly http = inject(HttpClient);

  listar(assinaturaId: number): Observable<PagamentoResponse[]> {
    return this.http.get<PagamentoResponse[]>(`${API_URL}/historico/${assinaturaId}`);
  }
}