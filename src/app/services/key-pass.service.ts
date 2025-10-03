import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KeyPass } from '../models/keyPass';
import { ConnectionService } from './connection.service';

@Injectable({
  providedIn: 'root'
})
export class KeyPassService {

  /* private apiUrl = 'https://phptrader-app2-7e9364a7656b.herokuapp.com/api/keypass'; */
  /* private apiUrl = 'http://localhost:8080/api/keypass'; */

  private apiUrl = this.conn.url() + 'api/keypass';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  createKeyPass(usuarioId: number, keyPass: KeyPass): Observable<KeyPass> {
    return this.http.post<KeyPass>(`${this.apiUrl}/create/${usuarioId}`, keyPass);
  }

  assignKeyPassToBot(codKeyPass: string, botId: number): Observable<KeyPass> {
    return this.http.post<KeyPass>(`${this.apiUrl}/assign/${codKeyPass}/bot/${botId}`, {});
  }

  unassignKeyPassFromBot(codKeyPass: string): Observable<KeyPass> {
    return this.http.post<KeyPass>(`${this.apiUrl}/unassign/${codKeyPass}`, {});
  }

  getKeyPassByCodKeyPass(codKeyPass: string): Observable<KeyPass> {
    return this.http.get<KeyPass>(`${this.apiUrl}/${codKeyPass}`);
  }

  getAllKeyPasses(): Observable<KeyPass[]> {
    return this.http.get<KeyPass[]>(`${this.apiUrl}`);
  }

  deleteKeyPass(keyPassId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${keyPassId}`);
  }

  getKeyPassesByBroker(brokerId: number): Observable<KeyPass[]> {
    return this.http.get<KeyPass[]>(`${this.apiUrl}/broker/${brokerId}`);
  }
}
