import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Etf, EtfHistory, EtfPositionView, EtfTransaction, EtfCategory } from '../models/Etf';
import { ConnectionService } from './connection.service';

export interface CreateEtfRequest {
  code: string;
  name: string;
  category: EtfCategory;
  initialNav: number;
  monthlyTargetPctPercent: number;
  description?: string;
  img?: string;
  cotaMinima?: number | null;
  nivel01?: number | null;
  nivel02?: number | null;
  nivel03?: number | null;
}

@Injectable({ providedIn: 'root' })
export class EtfService {
  private baseUrl = this.conn.url() + 'api/etfs';

  constructor(private http: HttpClient, private conn: ConnectionService) { }

  // ---- Admin / CRUD ----
  createMinimal(payload: CreateEtfRequest): Observable<Etf> {
    return this.http.post<Etf>(this.baseUrl, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  setStatus(id: number, status: 'ACTIVE' | 'PAUSED' | 'DELETED'): Observable<void> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<void>(`${this.baseUrl}/${id}/status`, null, { params });
  }

  overrideValuation(id: number, date: string, dailyPct: number): Observable<void> {
    const params = new HttpParams().set('date', date).set('dailyPct', dailyPct);
    return this.http.post<void>(`${this.baseUrl}/${id}/override`, null, { params });
  }

  // ---- Públicos / Cliente ----
  list(): Observable<Etf[]> { return this.http.get<Etf[]>(this.baseUrl); }
  get(id: number): Observable<Etf> { return this.http.get<Etf>(`${this.baseUrl}/${id}`); }

  history(id: number, limit = 100): Observable<EtfHistory[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<EtfHistory[]>(`${this.baseUrl}/${id}/history`, { params });
  }

  buy(id: number, usuarioId: number, cotas: number): Observable<EtfTransaction> {
    return this.http.post<EtfTransaction>(`${this.baseUrl}/${id}/buy`, { usuarioId, cotas });
  }

  sell(id: number, usuarioId: number, cotas: number): Observable<EtfTransaction> {
    return this.http.post<EtfTransaction>(`${this.baseUrl}/${id}/sell`, { usuarioId, cotas });
  }

  positions(usuarioId: number): Observable<EtfPositionView[]> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.get<EtfPositionView[]>(`${this.baseUrl}/positions`, { params });
  }

  positionByEtf(etfId: number, usuarioId: number): Observable<EtfPositionView> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.get<EtfPositionView>(`${this.baseUrl}/${etfId}/position`, { params });
  }

  setImage(id: number, img: string) {
    return this.http.patch<void>(`${this.baseUrl}/${id}/image`, { img });
  }

  updateLevels(
    id: number,
    payload: Partial<Pick<Etf, 'cotaMinima' | 'nivel01' | 'nivel02' | 'nivel03'>>
  ) {
    // antes: `${this.baseUrl}/api/etfs/${id}`  -> errado (duplica /api/etfs)
    return this.http.patch<Etf>(`${this.baseUrl}/${id}`, payload);
  }
}
