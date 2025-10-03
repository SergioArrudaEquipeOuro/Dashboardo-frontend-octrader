import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Release } from '../models/release';
import { ConnectionService } from './connection.service';

@Injectable({ providedIn: 'root' })
export class ReleaseService {
  private base = this.conn.url() + 'api';

  private get api(): string {
    return this.base.endsWith('/') ? this.base : this.base + '/';
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

  // GET /api/releases
  getReleases(): Observable<Release[]> {
    return this.http.get<Release[]>(`${this.api}releases`);
  }

  // GET /api/releases/{id}
  getRelease(id: number): Observable<Release> {
    return this.http.get<Release>(`${this.api}releases/${id}`);
  }

  // GET /api/clientes/{clienteId}/releases
  getReleasesByUser(clienteId: number): Observable<Release[]> {
    return this.http.get<Release[]>(`${this.api}clientes/${clienteId}/releases`);
  }

  // POST /api/clientes/{clienteId}/releases
  createRelease(clienteId: number, release: Release): Observable<Release> {
    return this.http.post<Release>(`${this.api}clientes/${clienteId}/releases`, release, this.authOptions());
  }

  // POST /api/releases/{id}/approve
  approveRelease(releaseId: number): Observable<Release> {
    return this.http.post<Release>(`${this.api}releases/${releaseId}/approve`, {}, this.authOptions());
  }

  // POST /api/releases/{id}/reject
  rejectRelease(releaseId: number): Observable<Release> {
    return this.http.post<Release>(`${this.api}releases/${releaseId}/reject`, {}, this.authOptions());
  }

  // DELETE /api/releases/{id}
  deleteRelease(releaseId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}releases/${releaseId}`, this.authOptions());
  }
}
