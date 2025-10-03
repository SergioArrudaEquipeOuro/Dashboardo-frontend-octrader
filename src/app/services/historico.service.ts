import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConnectionService } from './connection.service';

export interface Historico {
  id?: number;
  titulo?: string;
  emailCliente?: string;
  emailBrokere?: string;
  assunto?: string;
  autor?: string;
  date?: string; // Instant ISO, ex: "2025-08-27T12:34:56Z"
  obs?: string;
  visibily?: boolean;
  visibilyNotificacao?: boolean;
}

@Injectable({ providedIn: 'root' })
export class HistoricoService {
  /* private readonly baseUrl = `http://localhost:8080/api/historicos`; */

  private baseUrl = this.conn.url() + 'api/historicos';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  // CRUD
  listAll(): Observable<Historico[]> {
    return this.http.get<Historico[]>(this.baseUrl).pipe(
      map(arr => arr ?? [])
    );
  }

  getOne(id: number): Observable<Historico> {
    return this.http.get<Historico>(`${this.baseUrl}/${id}`);
  }

  create(h: Historico): Observable<Historico> {
    return this.http.post<Historico>(this.baseUrl, h);
  }

  update(id: number, h: Historico): Observable<Historico> {
    return this.http.put<Historico>(`${this.baseUrl}/${id}`, h);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // buscas específicas do controller
  searchByTitulo(titulo: string): Observable<Historico[]> {
    return this.http.get<Historico[]>(`${this.baseUrl}/titulo/${encodeURIComponent(titulo)}`);
  }

  searchByEmailCliente(email: string): Observable<Historico[]> {
    return this.http.get<Historico[]>(`${this.baseUrl}/emailCliente/${encodeURIComponent(email)}`);
  }

  searchByAutor(autor: string): Observable<Historico[]> {
    return this.http.get<Historico[]>(`${this.baseUrl}/autor/${encodeURIComponent(autor)}`);
  }

  searchByVisibily(flag: boolean): Observable<Historico[]> {
    return this.http.get<Historico[]>(`${this.baseUrl}/visibily/${flag}`);
  }

  searchByVisibilyNotificacao(flag: boolean): Observable<Historico[]> {
    return this.http.get<Historico[]>(`${this.baseUrl}/visibilyNotificacao/${flag}`);
  }
}
