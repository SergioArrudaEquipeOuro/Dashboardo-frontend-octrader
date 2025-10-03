// src/app/services/bot.service.ts
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Bot } from '../models/bot';
import { ConnectionService } from './connection.service';

@Injectable({ providedIn: 'root' })
export class BotService {

  private base = this.conn.url() + 'api/bot';


  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  /** Monta headers com Authorization + X-Author-Email (se informado) */
  private authOptions(authorEmail?: string) {
    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders();

    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    if (authorEmail) headers = headers.set('X-Author-Email', authorEmail);

    return { headers };
  }

  /** Cria um bot (usa path params como no controller) */
  createBot(
    codKeyPass: string,
    clienteId: number,
    payload: Partial<Bot>,
    authorEmail?: string
  ): Observable<Bot> {
    const url = `${this.base}/create/${encodeURIComponent(codKeyPass)}/cliente/${clienteId}`;
    return this.http.post<Bot>(url, payload, this.authOptions(authorEmail));
  }

  /** Lista todos os bots */
  getAll(): Observable<Bot[]> {
    return this.http.get<Bot[]>(this.base);
  }

  /** Busca um bot por id */
  getById(id: number): Observable<Bot> {
    return this.http.get<Bot>(`${this.base}/${id}`);
  }

  /** Atualiza campos mutáveis do bot */
  update(id: number, payload: Partial<Bot>): Observable<Bot> {
    return this.http.put<Bot>(`${this.base}/${id}`, payload);
  }

  /** Exclui um bot (envia autor) */
  delete(id: number, authorEmail?: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`, this.authOptions(authorEmail));
  }

  /** Desvincula o KeyPass do bot */
  detachKeyPass(id: number, codKeyPass: string): Observable<{ message: string }> {
    const url = `${this.base}/${id}/keypass/${encodeURIComponent(codKeyPass)}/detach`;
    return this.http.post<{ message: string }>(url, {});
  }

  /** Finaliza o bot e liquida (envia autor) */
  finalizar(
    botId: number,
    motivo?: string,
    authorEmail?: string
  ): Observable<Bot> {
    const url = `${this.base}/${botId}/finalizar`;
    const options = this.authOptions(authorEmail);

    if (motivo && motivo.trim()) {
      const params = new HttpParams().set('motivo', motivo);
      return this.http.post<Bot>(url, {}, { ...options, params });
    }
    return this.http.post<Bot>(url, {}, options);
  }


  getByUsuarioId(usuarioId: number): Observable<Bot[]> {
    const url = `${this.base}/${usuarioId}/bots`;
    return this.http.get<Bot[]>(url);
  }

  /** Todos os bots de todos os clientes de um broker (por ID) */
  getByBrokerId(brokerId: number): Observable<Bot[]> {
    const url = `${this.base}/broker/${brokerId}/bots`;
    return this.http.get<Bot[]>(url);
  }

  /** Todos os bots de todos os clientes de um broker (por e-mail) */
  getByBrokerEmail(email: string): Observable<Bot[]> {
    const url = `${this.base}/broker/email/${encodeURIComponent(email)}/bots`;
    return this.http.get<Bot[]>(url);
  }

}
