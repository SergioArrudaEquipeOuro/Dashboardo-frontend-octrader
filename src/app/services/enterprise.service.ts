import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Enterprise, WalletDetail } from '../models/enterprise';
import { ConnectionService } from './connection.service';

@Injectable({ providedIn: 'root' })
export class EnterpriseService {

  private apiUrl = this.conn.url() + 'api/enterprises';

  private get api(): string {
    return this.apiUrl.endsWith('/') ? this.apiUrl : this.apiUrl;
  }

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

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

  /** CRIAR */
  createEnterprise(enterprise: Enterprise): Observable<Enterprise> {
    return this.http.post<Enterprise>(`${this.apiUrl}`, enterprise);
  }

  /** PUT (substitui todos os campos) */
  replaceAll(id: number, enterprise: Enterprise): Observable<Enterprise> {
    return this.http.put<Enterprise>(`${this.apiUrl}/${id}`, enterprise);
  }

  /** PATCH (parcial) */
  patch(id: number, partial: Partial<Enterprise>): Observable<Enterprise> {
    return this.http.patch<Enterprise>(`${this.apiUrl}/${id}`, partial);
  }

  /** DELETAR */
  deleteEnterprise(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** ATIVAR ENTERPRISE */
  activateEnterprise(id: number): Observable<Enterprise> {
    return this.http.post<Enterprise>(`${this.apiUrl}/${id}/activate`, {});
  }

  /** WALLET: adicionar */
  addWalletDetail(enterpriseId: number, walletDetail: WalletDetail): Observable<Enterprise> {
    return this.http.post<Enterprise>(`${this.apiUrl}/${enterpriseId}/wallets`, walletDetail);
  }

  /** WALLET: editar (PUT /wallets/{walletIdentifier}) */
  editWalletDetail(
    enterpriseId: number,
    walletIdentifier: string,
    walletDetail: WalletDetail
  ): Observable<Enterprise> {
    return this.http.put<Enterprise>(
      `${this.apiUrl}/${enterpriseId}/wallets/${encodeURIComponent(walletIdentifier)}`,
      walletDetail
    );
  }

  /** WALLET: remover (DELETE /wallets/{walletIdentifier}) */
  removeWalletDetail(enterpriseId: number, walletIdentifier: string): Observable<Enterprise> {
    return this.http.delete<Enterprise>(
      `${this.apiUrl}/${enterpriseId}/wallets/${encodeURIComponent(walletIdentifier)}`
    );
  }

  /** WALLET: toggle visibility (POST /wallets/{walletIdentifier}/toggle-visibility) */
  toggleWalletVisibility(enterpriseId: number, walletIdentifier: string): Observable<Enterprise> {
    return this.http.post<Enterprise>(
      `${this.apiUrl}/${enterpriseId}/wallets/${encodeURIComponent(walletIdentifier)}/toggle-visibility`,
      {}
    );
  }
}
