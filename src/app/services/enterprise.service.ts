import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Enterprise, WalletDetail } from '../models/enterprise';
import { ConnectionService } from './connection.service';

@Injectable({ providedIn: 'root' })
export class EnterpriseService {

  private apiUrl = this.conn.url() + 'api/enterprises';

  // Mantido para compatibilidade, mesmo não sendo usado diretamente
  private get api(): string {
    return this.apiUrl.endsWith('/') ? this.apiUrl : this.apiUrl;
  }

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  /** Headers com Authorization + X-Author-Email (se existir) */
  private authOptions() {
    const token = localStorage.getItem('authToken');
    const authorEmail = localStorage.getItem('authorEmail');
    const headers: Record<string, string> = {};

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (authorEmail) headers['X-Author-Email'] = authorEmail;

    return { headers: new HttpHeaders(headers) };
  }

  /** LISTAR TODAS */
  getAllEnterprises(): Observable<Enterprise[]> {
    return this.http.get<Enterprise[]>(`${this.apiUrl}`);
  }

  /** ATIVA (única ativa) */
  getActiveEnterprise(): Observable<Enterprise> {
    return this.http.get<Enterprise>(`${this.apiUrl}/active`);
  }

  /** BUSCAR POR ID */
  getEnterpriseById(id: number): Observable<Enterprise> {
    return this.http.get<Enterprise>(`${this.apiUrl}/${id}`);
  }

  /** CRIAR ENTERPRISE (sem histórico solicitado; se quiser logar autor, adicione this.authOptions()) */
  createEnterprise(enterprise: Enterprise): Observable<Enterprise> {
    return this.http.post<Enterprise>(`${this.apiUrl}`, enterprise /*, this.authOptions()*/);
  }

  /** PUT (substitui todos os campos) */
  replaceAll(id: number, enterprise: Enterprise): Observable<Enterprise> {
    return this.http.put<Enterprise>(`${this.apiUrl}/${id}`, enterprise /*, this.authOptions()*/);
  }

  /** PATCH (parcial) */
  patch(id: number, partial: Partial<Enterprise>): Observable<Enterprise> {
    return this.http.patch<Enterprise>(`${this.apiUrl}/${id}`, partial /*, this.authOptions()*/);
  }

  /** DELETAR ENTERPRISE */
  deleteEnterprise(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}` /*, this.authOptions()*/);
  }

  /** ATIVAR ENTERPRISE */
  activateEnterprise(id: number): Observable<Enterprise> {
    return this.http.post<Enterprise>(`${this.apiUrl}/${id}/activate`, {} /*, this.authOptions()*/);
  }

  // =========================
  // WALLET (com histórico/autor)
  // =========================

  /** WALLET: adicionar (POST /wallets) — inclui headers p/ histórico */
  addWalletDetail(enterpriseId: number, walletDetail: WalletDetail): Observable<Enterprise> {
    return this.http.post<Enterprise>(
      `${this.apiUrl}/${enterpriseId}/wallets`,
      walletDetail,
      this.authOptions()
    );
  }

  /** WALLET: editar (PUT /wallets/{walletIdentifier}) — inclui headers p/ histórico */
  editWalletDetail(
    enterpriseId: number,
    walletIdentifier: string,
    walletDetail: WalletDetail
  ): Observable<Enterprise> {
    return this.http.put<Enterprise>(
      `${this.apiUrl}/${enterpriseId}/wallets/${encodeURIComponent(walletIdentifier)}`,
      walletDetail,
      this.authOptions()
    );
  }

  /** WALLET: remover (DELETE /wallets/{walletIdentifier}) — inclui headers p/ histórico */
  removeWalletDetail(enterpriseId: number, walletIdentifier: string): Observable<Enterprise> {
    return this.http.delete<Enterprise>(
      `${this.apiUrl}/${enterpriseId}/wallets/${encodeURIComponent(walletIdentifier)}`,
      this.authOptions()
    );
  }

  /** WALLET: toggle visibility — também envia autor por consistência */
  toggleWalletVisibility(enterpriseId: number, walletIdentifier: string): Observable<Enterprise> {
    return this.http.post<Enterprise>(
      `${this.apiUrl}/${enterpriseId}/wallets/${encodeURIComponent(walletIdentifier)}/toggle-visibility`,
      {},
      this.authOptions()
    );
  }
}
