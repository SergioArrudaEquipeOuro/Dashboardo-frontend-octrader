import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { User } from '../models/user';
import { Observable } from 'rxjs';
import { Equipe } from '../models/equipe';
import { Bot } from '../models/bot';
import { ConnectionService } from './connection.service';



@Injectable({
  providedIn: 'root'
})
export class UserService {

  private base = this.conn.url() + 'api/usuarios';

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

  login(email: string, senha: string, ip: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(
      `${this.base}/login`,
      { email, senha, ip }
    );
  }


  getByToken(token: string): Observable<User> {
    return this.http.get<User>(`${this.base}/token/${token}`);
  }

  getByTokenLogin(token: string): Observable<User> {
    return this.http.get<User>(`${this.base}/token/${token}/login`);
  }

  getAllUsuarios(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  listarClientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/clientes`);
  }

  listarBrokers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/brokers`);
  }

  getUsuarioByToken(tokenIdentificacao: string): Observable<User> {
    return this.http.get<User>(`${this.base}/token/${tokenIdentificacao}2`);
  }

  getUsuarioByTokenLogin(tokenIdentificacao: string): Observable<User> {
    return this.http.get<User>(`${this.base}/token/${tokenIdentificacao}2`);
  }

  updateUsuario(user: User): Observable<User> {
    return this.http.put<User>(`${this.base}/${user.id}`, user);
  }

  approveClienteDocumento(clienteId: number, doc: string) {
    return this.http.patch<any>(
      `${this.conn.url()}api/clientes/${clienteId}/documentos/${doc}/aprovar`,
      {}
    );
  }

  getClientesByUserId(usuarioId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/${usuarioId}/clientes`);
  }



  getUsuarioById(id: number): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }



  createUsuario(user: User): Observable<any> {
    return this.http.post(this.base, user);
  }


  getUsuarioByEmail(email: string): Observable<User> {
    return this.http.get<User>(`${this.base}/email/${email}`);
  }


  // src/app/services/user.service.ts
  updateSenhaUsuario(id: number, novaSenha: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${this.base}/${id}/senha`,
      { novaSenha },
      this.authOptions()
    );
  }

  // (Opcional, se preferir outro nome)
  alterarSenha(id: number, novaSenha: string): Observable<{ message: string }> {
    return this.updateSenhaUsuario(id, novaSenha);
  }


  // ====== Vínculo em lote: clientes ↔ broker ======

  vincularClientesAoBroker(brokerId: number, clienteIds: number[]) {
    return this.http.post<{ message: string }>(
      `${this.base}/broker/${brokerId}/clientes`,
      { clienteIds },
      this.authOptions()
    );
  }

  desvincularClientesDoBroker(brokerId: number, clienteIds: number[]) {
    return this.http.post<{ message: string }>(
      `${this.base}/broker/${brokerId}/clientes/desvincular`,
      { clienteIds },
      this.authOptions()
    );
  }

  transferirClientesBroker(origemId: number, destinoId: number, clienteIds: number[]) {
    return this.http.post<{ message: string }>(
      `${this.base}/brokers/transferir`,
      { origemId, destinoId, clienteIds },
      this.authOptions()
    );
  }

  getReleasesByBrokerId(brokerId: number) {
    return this.http.get<any[]>(`${this.base}/${brokerId}/releases`);
  }

  getReleasesByBrokerEmail(email: string) {
    return this.http.get<any[]>(`${this.base}/email/${email}/releases`);
  }

  getContratosByBrokerId(brokerId: number) {
    return this.http.get<any[]>(`${this.base}/${brokerId}/contratos`);
  }

  getClientesByBrokerId(brokerId: number) {
    return this.http.get<any[]>(`${this.base}/${brokerId}/clientes`);
  }

  getClientesByBrokerEmail(email: string) {
    return this.http.get<any[]>(`${this.base}/email/${email}/clientes`);
  }

}
