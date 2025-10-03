import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConnectionService } from './connection.service';

export type TipoLeilao = 'INGLES' | 'HOLANDES';
export type StatusLeilao = 'ABERTO' | 'ENCERRADO' | 'CANCELADO';

export interface Leilao {
  id: number;
  tipoLeilao: TipoLeilao;
  automatico: boolean;
  nomeAtivo: string;
  symbolAtivo: string;
  valorAtualAtivo?: number | null;
  volumeLotes?: number | null;
  valorDesagio?: number | null;
  lanceInicial?: number | null;
  incrementoMinimo?: number | null;
  arrematanteEmail?: string | null;
  dataInicio?: string | null; // ISO: 'YYYY-MM-DDTHH:mm'
  dataFim?: string | null;    // ISO: 'YYYY-MM-DDTHH:mm'
  status: StatusLeilao;
  liberarParaTodosClientes: boolean;
  listaBrancaEmails: string[];
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface Lance {
  id: number;
  leilao: Leilao | { id: number };
  valor: number;
  licitanteEmail: string;
  data: string; // ISO
}

export interface CriarLeilaoDTO extends Partial<Leilao> {
  tipoLeilao: TipoLeilao;
  nomeAtivo: string;
  symbolAtivo: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeilaoService {

  // Ajuste se você usa environment.apiUrl

  private baseUrl = this.conn.url() + 'api/leiloes';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  // ---------- Leilão ----------
  criarLeilao(dto: CriarLeilaoDTO): Observable<Leilao> {
    return this.http.post<Leilao>(this.baseUrl, dto);
  }

  listarLeiloes(): Observable<Leilao[]> {
    return this.http.get<Leilao[]>(this.baseUrl);
  }

  obterLeilao(id: number): Observable<Leilao> {
    return this.http.get<Leilao>(`${this.baseUrl}/${id}`);
  }

  atualizarLeilao(id: number, patch: Partial<Leilao>): Observable<Leilao> {
    return this.http.put<Leilao>(`${this.baseUrl}/${id}`, patch);
  }

  deletarLeilao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ---------- Campos especiais ----------
  patchLiberarParaTodos(id: number, liberar: boolean): Observable<Leilao> {
    return this.http.patch<Leilao>(`${this.baseUrl}/${id}/liberar-para-todos`, { liberar });
  }

  putListaBranca(id: number, emails: string[]): Observable<Leilao> {
    return this.http.put<Leilao>(`${this.baseUrl}/${id}/lista-branca`, { emails });
  }

  // ---------- Lances ----------
  listarLances(leilaoId: number): Observable<Lance[]> {
    return this.http.get<Lance[]>(`${this.baseUrl}/${leilaoId}/lances`);
  }

  obterLance(lanceId: number): Observable<Lance> {
    return this.http.get<Lance>(`${this.baseUrl}/lances/${lanceId}`);
  }

  deletarLance(lanceId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/lances/${lanceId}`);
  }

  darLance(leilaoId: number, licitanteEmail: string, valor?: number): Observable<Lance> {
    // Para HOLANDÊS o backend ignora "valor", mas mantemos a mesma payload
    return this.http.post<Lance>(`${this.baseUrl}/${leilaoId}/lances`, {
      licitanteEmail,
      valor: valor ?? null
    });
  }


  // ADICIONE no LeilaoService:
  encerrarLeilao(id: number): Observable<Leilao> {
    return this.http.post<Leilao>(`${this.baseUrl}/${id}/encerrar`, {});
  }

}
