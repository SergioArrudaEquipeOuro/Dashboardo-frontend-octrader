import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConnectionService } from './connection.service';

export type OperationType = 'BUY' | 'SELL';
export type ClosingType = 'MANUAL' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'OTHER' | '';
export type Status = 'OPEN' | 'CLOSE';
export type MarketCategory = 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks';

export interface UtipTrade {
  id?: number;

  // vínculo com o cliente
  clienteEmail?: string;

  // básicos
  symbol: string;
  operationType: OperationType;
  volume: number;
  marketCategory?: MarketCategory;

  // campos numéricos
  swap?: number;
  openPrice?: number;
  closePrice?: number;
  creationClosePrice?: number;
  dayCloseQuote?: number;
  takeProfit?: number;
  stopLoss?: number;
  bonus?: number;
  commission?: number;
  profit?: number;
  profitCalculated?: number;
  demo?: boolean;

  // datas/horas (strings ISO ou 'yyyy-MM-dd'/'HH:mm:ss')
  openDate?: string;
  openTime?: string;
  closeDate?: string;
  closeTime?: string;

  // enums
  closingType?: ClosingType;
  status?: Status; // ← novo (virá do backend como OPEN ao criar)

  // auditoria
  createdAt?: string; // ex.: "2025-10-08T14:22:31Z"
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class UtipService {
  // usa environment.apiUrl se existir; fallback para localhost
  private url = this.conn.url() + 'api/utip-trades';

  private authOptions() {
    const token = localStorage.getItem('authToken');
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }


  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  create(trade: Omit<UtipTrade, 'status'> & Partial<Pick<UtipTrade, 'status'>>): Observable<UtipTrade> {
    return this.http.post<UtipTrade>(this.url, trade, this.authOptions());
  }

  update(id: number, patch: Partial<UtipTrade>): Observable<UtipTrade> {
    return this.http.put<UtipTrade>(`${this.url}/${id}`, patch, this.authOptions());
  }

  close(id: number, body?: { closePrice?: number }): Observable<UtipTrade> {
    return this.http.patch<UtipTrade>(`${this.url}/${id}/close`, body ?? {}, this.authOptions());
  }

  getById(id: number): Observable<UtipTrade> {
    return this.http.get<UtipTrade>(`${this.url}/${id}`);
  }

  listAll(): Observable<UtipTrade[]> {
    return this.http.get<UtipTrade[]>(this.url);
  }

  listByEmail(email: string): Observable<UtipTrade[]> {
    const params = new HttpParams().set('email', email);
    return this.http.get<UtipTrade[]>(this.url, { params });
  }

  /** Filtro por Status (opcional email) */
  listByStatus(status: Status, email?: string): Observable<UtipTrade[]> {
    let params = new HttpParams().set('status', status);
    if (email) params = params.set('email', email);
    return this.http.get<UtipTrade[]>(`${this.url}/by-status`, { params });
  }

  /** Filtro por ClosingType (opcional email) */
  listByClosingType(closingType: ClosingType, email?: string): Observable<UtipTrade[]> {
    let params = new HttpParams().set('closingType', closingType);
    if (email) params = params.set('email', email);
    return this.http.get<UtipTrade[]>(`${this.url}/by-closing-type`, { params });
  }

  /** Filtro por OperationType (opcional email) */
  listByOperationType(operationType: OperationType, email?: string): Observable<UtipTrade[]> {
    let params = new HttpParams().set('operationType', operationType);
    if (email) params = params.set('email', email);
    return this.http.get<UtipTrade[]>(`${this.url}/by-operation-type`, { params });
  }

  /** Delete */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** Util: pega o último trade do símbolo para esse cliente (client-side) */
  getLatestByEmailAndSymbol(email: string, symbol: string): Observable<UtipTrade | null> {
    return this.listByEmail(email).pipe(
      map(list => {
        const key = (symbol || '').toUpperCase().replace(/[^\w]/g, '');
        const same = list.filter(t => (t.symbol || '').toUpperCase().replace(/[^\w]/g, '') === key);
        if (!same.length) return null;
        return same.sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
      })
    );
  }


    /** Lista TODOS os trades de TODOS os clientes de um broker (por ID) */
  listByBrokerId(brokerId: number): Observable<UtipTrade[]> {
    return this.http.get<UtipTrade[]>(`${this.url}/by-broker/${brokerId}`, this.authOptions());
  }

  /** (Opcional) Lista os trades por e-mail do broker */
  listByBrokerEmail(email: string): Observable<UtipTrade[]> {
    return this.http.get<UtipTrade[]>(
      `${this.url}/by-broker-email/${encodeURIComponent(email)}`,
      this.authOptions()
    );
  }


}
