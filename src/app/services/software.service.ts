import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { software } from '../models/software';
import { ConnectionService } from './connection.service';

@Injectable({
  providedIn: 'root'
})
export class SoftwareService {
  /* private apiUrl = 'https://phptrader-app2-7e9364a7656b.herokuapp.com/api/bots'; */
  /* private apiUrl = 'http://localhost:8080/api/bots'; */

  private apiUrl = this.conn.url() + 'api/bots';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error('Um erro ocorreu:', error.error.message);
    } else {
      console.error(
        `Backend retornou o código ${error.status}, ` +
        `corpo foi: ${error.error}`);
    }
    return throwError('Algo de errado aconteceu; por favor, tente novamente mais tarde.');
  }

  getAllBots(): Observable<software[]> {
    return this.http.get<software[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }
}