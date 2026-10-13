import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from './config';
import { PagamentoResponse, ResumoMensal } from './models';

// Acesso à API de cobranças (/api/pagamentos).
@Injectable({ providedIn: 'root' })
export class Pagamentos {
  private readonly http = inject(HttpClient);

  // Cobranças pendentes + as do mês atual.
  listar(): Observable<PagamentoResponse[]> {
    return this.http.get<PagamentoResponse[]>(`${API_URL}/pagamentos`);
  }

  // Total pago/pendente dos últimos meses (gráfico de barras).
  resumoMensal(meses = 6): Observable<ResumoMensal[]> {
    return this.http.get<ResumoMensal[]>(`${API_URL}/pagamentos/resumo-mensal`, {
      params: { meses },
    });
  }

  // "Já paguei" (pago) ou "Ainda não paguei" (pendente).
  alterarStatus(id: number, status: 'pago' | 'pendente'): Observable<PagamentoResponse> {
    return this.http.patch<PagamentoResponse>(`${API_URL}/pagamentos/${id}/status`, null, {
      params: { status },
    });
  }
}