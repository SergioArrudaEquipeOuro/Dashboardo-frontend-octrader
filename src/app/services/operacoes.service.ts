import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Operacoes } from '../models/operacoes';
import { ConnectionService } from './connection.service';

@Injectable({
  providedIn: 'root'
})
export class OperacoesService {

  /* private baseUrl = 'https://phptrader-app2-7e9364a7656b.herokuapp.com/api/operacoes'; */
  /* private baseUrl = 'http://localhost:8080/api/operacoes'; */

  private baseUrl = this.conn.url() + 'api/operacoes';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  // Obter todas as operações
  getAllOperacoes(): Observable<Operacoes[]> {
    return this.http.get<Operacoes[]>(`${this.baseUrl}`);
  }

  // Obter uma operação por ID
  getOperacoesById(id: number): Observable<Operacoes> {
    return this.http.get<Operacoes>(`${this.baseUrl}/${id}`);
  }

  // Criar uma nova operação
  createOperacao(botId: number, saldo: number): Observable<Operacoes> {
    return this.http.post<Operacoes>(`${this.baseUrl}/create/${botId}`, saldo);
  }

  // Deletar uma operação por ID
  deleteOperacao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
