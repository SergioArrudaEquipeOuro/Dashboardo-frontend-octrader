// src/app/services/historico-bot.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConnectionService } from './connection.service';

export interface HistoricoBot {
  id?: number;
  date?: string; // Instant
  idBot?: number;
  idUsuario?: number;
  tokenBot?: string;

  // Configuração do bot
  projecaoBot?: number;
  dataInicioBot?: string;
  dataFimBot?: string;
  broker?: string;
  saldoInicialBot?: number;
  saldoFinalBot?: number;
  lucro?: number;
  operacoesLength?: number;

  // Status / finalização (campos novos)
  status?: string;
  dateFinalizacao?: string;

  // Cliente - criação
  saldoUsuarioAntesDoBotCreate?: number;
  creditoUsuarioAntesDoBotCreate?: number;
  emprestimoUsuarioAntesDoBotCreate?: number;

  saldoUsuarioDepoisDoBotCreate?: number;
  creditoUsuarioDepoisDoBotCreate?: number;
  emprestimoUsuarioDepoisDoBotCreate?: number;

  // Cliente - finalização
  saldoUsuarioAntesDoBotFinish?: number;
  creditoUsuarioAntesDoBotFinish?: number;
  emprestimoUsuarioAntesDoBotFinish?: number;

  saldoUsuarioDepoisDoBotFinish?: number;
  creditoUsuarioDepoisDoBotFinish?: number;
  emprestimoUsuarioDepoisDoBotFinish?: number;
}

@Injectable({ providedIn: 'root' })
export class HistoricoBotService {
  /* private apiUrl = 'http://localhost:8080/api/historico-bot'; */

  private apiUrl = this.conn.url() + 'api/historico-bot';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  // Helpers para headers (opcional, se usar auditoria de autor)
  private authOptions(authorEmail?: string) {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (authorEmail) headers['X-Author-Email'] = authorEmail;
    return Object.keys(headers).length ? { headers: new HttpHeaders(headers) } : {};
  }

  // ---- ENDPOINTS do controller ----

  /** GET /api/historico-bot */
  getAll(): Observable<HistoricoBot[]> {
    return this.http.get<HistoricoBot[]>(this.apiUrl);
  }

  /** GET /api/historico-bot/{id} */
  getById(id: number): Observable<HistoricoBot> {
    return this.http.get<HistoricoBot>(`${this.apiUrl}/${id}`);
  }

  /** GET /api/historico-bot/bot/{botId} */
  listByBot(botId: number): Observable<HistoricoBot[]> {
    return this.http.get<HistoricoBot[]>(`${this.apiUrl}/bot/${botId}`);
  }

  /** GET /api/historico-bot/usuario/{usuarioId} */
  listByUsuario(usuarioId: number): Observable<HistoricoBot[]> {
    return this.http.get<HistoricoBot[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

  /** POST /api/historico-bot */
  create(payload: Partial<HistoricoBot>, authorEmail?: string): Observable<HistoricoBot> {
    return this.http.post<HistoricoBot>(this.apiUrl, payload, this.authOptions(authorEmail));
  }

  /** PUT /api/historico-bot/{id} */
  update(id: number, payload: Partial<HistoricoBot>, authorEmail?: string): Observable<HistoricoBot> {
    return this.http.put<HistoricoBot>(`${this.apiUrl}/${id}`, payload, this.authOptions(authorEmail));
  }

  /** DELETE /api/historico-bot/{id} */
  delete(id: number, authorEmail?: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, this.authOptions(authorEmail));
  }
}
