import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConnectionService } from './connection.service';

/** TIPOS */
export type EnumCoin = 'ACTIVE' | 'PAUSE' | 'LATERALIZED' | 'WAIT';

export interface HistoricoValor {
  id?: number;
  dataHora: string; // ISO
  valorAbertura: number;
  valorFechamento: number;
  valorMaximo: number;
  valorMinimo: number;
}

export interface Memecoin {
  id?: number;
  nome: string;
  symbol: string;
  image: string;
  active?: boolean;
  status?: EnumCoin;
  valorAtual: number;
  valorBase?: number;
  taxa?: number;
  valorAlvo?: number;
  aportIn?: number;
  aportOut?: number;
  variacaoMaxima?: number;
  maxOperacoesHistorico?: number;
  allowAllUsers?: boolean;
  whitelistedEmails?: string[];
}

export interface UsuarioMemecoin {
  id?: number;
  usuario: any;     // tipar se tiver a interface de Cliente
  memecoin: Memecoin;
  quantidade: number;
}

@Injectable({ providedIn: 'root' })
export class CoinService {
  /* private apiUrl = 'https://phptrader-app2-7e9364a7656b.herokuapp.com/api/memecoins'; */
  /* private apiUrl = 'http://localhost:8080/api/memecoins'; */

  private apiUrl = this.conn.url() + 'api/memecoins';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  /** Criar uma nova memecoin */
  criarMemecoin(memecoin: Memecoin): Observable<Memecoin> {
    return this.http.post<Memecoin>(`${this.apiUrl}`, memecoin);
  }

  /** Obter histórico de valores de uma memecoin */
  obterHistorico(id: number): Observable<HistoricoValor[]> {
    return this.http.get<HistoricoValor[]>(`${this.apiUrl}/${id}/historico`);
  }

  /** Atualizar o status active de uma memecoin */
  atualizarStatusActive(id: number, active: boolean): Observable<Memecoin> {
    const params = new HttpParams().set('active', String(active));
    return this.http.put<Memecoin>(`${this.apiUrl}/${id}/active`, null, { params });
  }

  /** Atualizar os dados de uma memecoin */
  atualizarMemecoin(id: number, memecoin: Memecoin): Observable<Memecoin> {
    return this.http.put<Memecoin>(`${this.apiUrl}/${id}`, memecoin);
  }

  /** Buscar todas as memecoins */
  buscarTodasMemecoins(): Observable<Memecoin[]> {
    return this.http.get<Memecoin[]>(`${this.apiUrl}`);
  }

  /** Buscar uma memecoin pelo ID */
  buscarMemecoinPorId(id: number): Observable<Memecoin> {
    return this.http.get<Memecoin>(`${this.apiUrl}/${id}`);
  }

  /** Converter saldo em memecoin (controller espera 'quantidade' mesmo sendo valor em dinheiro) */
  converterSaldoParaMemecoin(usuarioId: number, memecoinId: number, quantidade: number): Observable<any> {
    const params = new HttpParams()
      .set('usuarioId', String(usuarioId))
      .set('memecoinId', String(memecoinId))
      .set('quantidade', String(quantidade));
    return this.http.post(`${this.apiUrl}/converter-saldo`, null, { params });
  }

  /** Converter memecoin em saldo */
  converterMemecoinParaSaldo(usuarioId: number, memecoinId: number, quantidade: number): Observable<any> {
    const params = new HttpParams()
      .set('usuarioId', String(usuarioId))
      .set('memecoinId', String(memecoinId))
      .set('quantidade', String(quantidade));
    return this.http.post(`${this.apiUrl}/converter-memecoin`, null, { params });
  }

  /** Listar memecoins de um usuário */
  listarMemecoinsPorUsuario(usuarioId: number): Observable<UsuarioMemecoin[]> {
    return this.http.get<UsuarioMemecoin[]>(`${this.apiUrl}/usuario/${usuarioId}`);
  }

  /** Deletar uma memecoin */
  deletarMemecoin(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /** Atualizar o campo allowAllUsers */
  atualizarAllowAllUsers(id: number, allowAll: boolean): Observable<Memecoin> {
    const params = new HttpParams().set('allowAll', String(allowAll));
    return this.http.put<Memecoin>(`${this.apiUrl}/${id}/allow-all`, null, { params });
  }

  /** Adicionar e-mail à whitelist */
  adicionarEmailWhitelist(id: number, email: string): Observable<Memecoin> {
    const params = new HttpParams().set('email', email);
    return this.http.post<Memecoin>(`${this.apiUrl}/${id}/whitelist`, null, { params });
  }

  /** Remover e-mail da whitelist */
  removerEmailWhitelist(id: number, email: string): Observable<Memecoin> {
    const params = new HttpParams().set('email', email);
    return this.http.delete<Memecoin>(`${this.apiUrl}/${id}/whitelist`, { params });
  }

  /** NOVO: deletar históricos antigos (conforme controller) */
  deletarHistoricosAntigos(id: number, quantidade: number): Observable<any> {
    const params = new HttpParams().set('quantidade', String(quantidade));
    return this.http.delete(`${this.apiUrl}/${id}/historicos`, { params });
  }

  obterSaldoUsuarioNaMemecoin(usuarioId: number, memecoinId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/usuario/${usuarioId}/saldo/${memecoinId}`);
  }
}
