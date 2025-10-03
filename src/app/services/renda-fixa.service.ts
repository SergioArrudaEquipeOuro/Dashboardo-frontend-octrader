import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConnectionService } from './connection.service';

// ===== Tipos =====
export interface CofrinhoRendaFixa {
  id: number;
  usuario: any;
  nome: string;                 // mantido
  saldo: number;
  principal: number;
  multiplicadorSobreCdi: number;
  dataCriacao: string;
  dataUltimaCapitalizacao: string;
  ativo: boolean;
  meta?: number | null
}

export interface CofrinhoMovimento {
  id: number;
  data: string; // ISO (yyyy-MM-dd ou datetime, conforme backend)
  tipo: 'DEPOSITO' | 'SAQUE' | 'RENDIMENTO';
  valor: number;
  saldoAposMovimento: number;
}

export interface CdiDiario {
  id: number;
  data: string; // ISO date
  taxaAnualPercent: number;
}

export interface RendimentoDiario {
  data: string;   // ISO yyyy-MM-dd
  valor: number;  // total rendido neste dia
}

// ===== Service =====
@Injectable({ providedIn: 'root' })
export class RendaFixaService {
  private base = this.conn.url() + 'api/cofrinhos';

  constructor(private http: HttpClient, private conn: ConnectionService) { }

  private authOptions() {
    const token = localStorage.getItem('authToken');
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return { headers };
  }

  listarTodos(): Observable<CofrinhoRendaFixa[]> {
    return this.http.get<CofrinhoRendaFixa[]>(`${this.base}`, this.authOptions());
  }

  listarPorUsuario(usuarioId: number): Observable<CofrinhoRendaFixa[]> {
    return this.http.get<CofrinhoRendaFixa[]>(`${this.base}/usuario/${usuarioId}`, this.authOptions());
  }

  criarCofrinho(usuarioId: number, nome?: string, meta?: number | null): Observable<CofrinhoRendaFixa> {
    let params = new HttpParams().set('usuarioId', String(usuarioId));
    if (nome && nome.trim()) {
      params = params.set('nome', nome.trim());
    }
    if (meta != null && !Number.isNaN(meta)) {
      params = params.set('meta', String(meta));
    }
    return this.http.post<CofrinhoRendaFixa>(`${this.base}`, null, { ...this.authOptions(), params });
  }


  depositar(cofrinhoId: number, valor: number): Observable<CofrinhoRendaFixa> {
    const params = new HttpParams().set('valor', String(valor));
    return this.http.post<CofrinhoRendaFixa>(`${this.base}/${cofrinhoId}/depositar`, null, { ...this.authOptions(), params });
  }

  sacar(cofrinhoId: number, valor: number): Observable<CofrinhoRendaFixa> {
    const params = new HttpParams().set('valor', String(valor));
    return this.http.post<CofrinhoRendaFixa>(`${this.base}/${cofrinhoId}/sacar`, null, { ...this.authOptions(), params });
  }

  deletar(cofrinhoId: number): Observable<any> {
    return this.http.delete(`${this.base}/${cofrinhoId}`, this.authOptions());
  }

  movimentos(cofrinhoId: number): Observable<CofrinhoMovimento[]> {
    return this.http.get<CofrinhoMovimento[]>(`${this.base}/${cofrinhoId}/movimentos`, this.authOptions());
  }

  upsertCdi(dataISO: string, taxaAnualPercent: number): Observable<CdiDiario> {
    const params = new HttpParams().set('dataISO', dataISO).set('taxaAnualPercent', String(taxaAnualPercent));
    return this.http.post<CdiDiario>(`${this.base}/cdi`, null, { ...this.authOptions(), params });
  }

  rendimentosDiarios(cofrinhoId: number): Observable<RendimentoDiario[]> {
    return this.http.get<RendimentoDiario[]>(
      `${this.base}/${cofrinhoId}/rendimentos-diarios`,
      this.authOptions()
    );
  }
}
