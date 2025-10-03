// src/app/services/equipe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConnectionService } from './connection.service';

export interface Equipe {
  id?: number;
  nome: string;
  gerente?: { id: number; nome?: string; email?: string } | null;
  brokers?: any[];
  clientes?: any[];
}

export interface InfoVinculosPorEmail {
  email: string;
  tipo: 'CLIENTE' | 'BROKER' | 'GERENTE' | 'DESCONHECIDO';
  vinculadoEquipe: boolean;
  equipe?: { id: number; nome: string } | null;
  // só vem para CLIENTE:
  vinculadoBroker?: boolean;
  broker?: { id: number; email: string } | null;
}

@Injectable({
  providedIn: 'root'
})
export class EquipeService {

  private apiUrl = this.conn.url() + 'api/equipes';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  // -------- CRUD --------
  criarEquipe(equipe: Equipe): Observable<Equipe> {
    return this.http.post<Equipe>(this.apiUrl, equipe);
  }

  obterEquipe(id: number): Observable<Equipe> {
    return this.http.get<Equipe>(`${this.apiUrl}/${id}`);
  }

  listarEquipes(): Observable<Equipe[]> {
    return this.http.get<Equipe[]>(`${this.apiUrl}/dto`);
  }

  atualizarEquipe(id: number, equipe: Equipe): Observable<Equipe> {
    return this.http.put<Equipe>(`${this.apiUrl}/${id}`, equipe);
  }

  deletarEquipe(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // -------- GERENTE --------
  // Controller: PUT /api/equipes/{equipeId}/gerente/{gerenteId}
  adicionarGerente(equipeId: number, gerenteId: number): Observable<Equipe> {
    return this.http.put<Equipe>(`${this.apiUrl}/${equipeId}/gerente/${gerenteId}`, {});
  }

  // Controller: DELETE /api/equipes/{equipeId}/gerente
  removerGerente(equipeId: number): Observable<Equipe> {
    return this.http.delete<Equipe>(`${this.apiUrl}/${equipeId}/gerente`);
  }

  // -------- BROKERS (lote) --------
  // Controller: POST /api/equipes/{equipeId}/brokers   body: { ids: number[] }
  adicionarBrokers(equipeId: number, brokerIds: number[]): Observable<Equipe> {
    return this.http.post<Equipe>(`${this.apiUrl}/${equipeId}/brokers`, { ids: brokerIds });
  }

  // Controller: DELETE /api/equipes/{equipeId}/brokers body: { ids: number[] }
  removerBrokers(equipeId: number, brokerIds: number[]): Observable<Equipe> {
    return this.http.delete<Equipe>(`${this.apiUrl}/${equipeId}/brokers`, { body: { ids: brokerIds } });
  }

  // -------- CLIENTES (lote) --------
  // Controller: POST /api/equipes/{equipeId}/clientes  body: { ids: number[] }
  adicionarClientes(equipeId: number, clienteIds: number[]): Observable<Equipe> {
    return this.http.post<Equipe>(`${this.apiUrl}/${equipeId}/clientes`, { ids: clienteIds });
  }

  // Controller: DELETE /api/equipes/{equipeId}/clientes body: { ids: number[] }
  removerClientes(equipeId: number, clienteIds: number[]): Observable<Equipe> {
    return this.http.delete<Equipe>(`${this.apiUrl}/${equipeId}/clientes`, { body: { ids: clienteIds } });
  }


  // -------- Sem Equipe --------
  getGerentesSemEquipe(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/gerentes-sem-equipe`);
  }

  getBrokersSemEquipe(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/brokers-sem-equipe`);
  }

  getClientesSemEquipe(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/clientes-sem-equipe`);
  }

  // -------- Consultar vínculos por e-mail --------
  consultarVinculosPorEmail(email: string): Observable<InfoVinculosPorEmail> {
    return this.http.get<InfoVinculosPorEmail>(`${this.apiUrl}/usuario/por-email`, {
      params: { email }
    });
  }

  // Lista SOMENTE os releases (array)
  getReleasesPorUsuario(usuarioId: number) {
    return this.http.get<any[]>(`${this.apiUrl}/usuario/${usuarioId}/releases2`);
  }

  // Retorno completo (mapa com equipes/clienteIds + releases)
  getReleasesPorUsuarioDetalhe(usuarioId: number) {
    return this.http.get<any>(`${this.apiUrl}/usuario/${usuarioId}/releases`);
  }

  // ========= NOVOS: Contratos por usuário (equipes do usuário) =========
  /** Lista SOMENTE os contratos (array) */
  getContratosPorUsuario(usuarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuario/${usuarioId}/contratos2`);
  }

  /** Retorno completo (mapa com equipes/clienteIds + contratos) */
  getContratosPorUsuarioDetalhe(usuarioId: number): Observable<{
    usuarioId: number;
    equipes: { id: number; nome: string }[];
    clienteIds: number[];
    contratos: any[];
  }> {
    return this.http.get<any>(`${this.apiUrl}/usuario/${usuarioId}/contratos`);
  }

  // LISTAR TODOS (GET /api/equipes)
  listarTodos(): Observable<Equipe[]> {
    return this.http.get<Equipe[]>(`${this.apiUrl}`);
  }

  // BUSCAR EQUIPE DTO POR ID (GET /api/equipes/id/{id}/dto)
  obterEquipeDTO(id: number): Observable<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${this.apiUrl}/id/${id}/dto`);
  }

}
