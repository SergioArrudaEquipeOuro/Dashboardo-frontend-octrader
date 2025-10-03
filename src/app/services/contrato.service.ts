import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; // <-- HttpParams
import { Observable } from 'rxjs';
import { ConnectionService } from './connection.service';

export interface Paragrafo {
  titulo: string;
  texto: string;
}

export interface ContratoDTO {
  id: number;
  clientName: string;
  clientEmail: string;
  saldo: number;
  contractName: string;
  date: string;
  prazo: string;
  signed: boolean;
  activeSymbol: string;
  automatic: boolean;
  clienteId: number;
}

export interface ContratoFull extends ContratoDTO {
  paragrafos: Paragrafo[];
}

@Injectable({ providedIn: 'root' })
export class ContratoService {
  private base = this.conn.url() + 'api/contratos';

  // mantém a mesma base, sem duplicar barras
  private get api(): string {
    return this.base.endsWith('/') ? this.base.slice(0, -1) : this.base;
  }

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  createContrato(usuarioId: number, contrato: any): Observable<any> {
    return this.http.post<any>(`${this.api}/usuario/${usuarioId}`, contrato);
  }

  getAllContratos(): Observable<ContratoDTO[]> {
    return this.http.get<ContratoDTO[]>(this.api);
  }

  getContratosByBroker(brokerId: number): Observable<ContratoDTO[]> {
    return this.http.get<ContratoDTO[]>(`${this.api}/broker/${brokerId}`);
  }

  deleteContrato(id: number) {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  /** NOVO: delete em lote via ?ids=1&ids=2&ids=3 */
  deleteContratos(ids: number[]) {
    let params = new HttpParams();
    ids.forEach(id => params = params.append('ids', String(id)));
    return this.http.delete<void>(this.api, { params });
  }

  markContratoAsSigned(id: number, prazoIso?: string): Observable<any> {
    let params = new HttpParams();
    if (prazoIso) params = params.set('prazo', prazoIso);
    return this.http.patch<any>(`${this.api}/${id}/sign`, {}, { params });
  }


  getContratosByUsuarioId(usuarioId: number): Observable<ContratoDTO[]> {
    return this.http.get<ContratoDTO[]>(`${this.api}/usuario/${usuarioId}`);
  }

  getContratoById(id: number) {
    return this.http.get<ContratoFull>(`${this.api}/${id}`);
  }
}
