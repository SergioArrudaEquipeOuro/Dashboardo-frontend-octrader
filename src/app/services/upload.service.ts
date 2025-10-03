import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConnectionService } from './connection.service';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  
  private MAX_FILE_SIZE = 30 * 1024 * 1024; // Limite de 30MB

  private baseUrl = this.conn.url() + 'files';


  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  url(): string {
    return this.baseUrl + '/view/';
  }

  

  // Método para upload de arquivo
  uploadFile(file: File, userId: string, type: string): Observable<{ fileName: string, url: string }> {
    if (file.size > this.MAX_FILE_SIZE) {
      // Retorna um erro ou exibe uma mensagem no frontend
      throw new Error('O arquivo excede o limite de 30MB.');
    }
  
    const formData: FormData = new FormData();
    const fileName = `${userId}-${type}.${file.name.split('.').pop()}`;  // Nome sem data
    formData.append('file', file, fileName);
  
    return this.http.post<{ fileName: string, url: string }>(`${this.baseUrl}/upload`, formData, {
      observe: 'response'
    }).pipe(
      map((response: HttpResponse<any>) => {
        return {
          fileName: fileName,
          url: response.body.url
        };
      })
    );
  }
  

downloadFile(fileName: string): Observable<Blob> {
  return this.http.get(`${this.baseUrl}/download/${encodeURIComponent(fileName)}`, {
    responseType: 'blob'
  });
}

viewImage(fileName: string): Observable<Blob> {
  return this.http.get(`${this.baseUrl}/view/${encodeURIComponent(fileName)}`, { responseType: 'blob' });
}

deleteFile(fileName: string): Observable<any> {
  return this.http.delete(`${this.baseUrl}/delete/${encodeURIComponent(fileName)}`, {
    observe: 'response'
  }).pipe(map((response: HttpResponse<any>) => response.body));
}
}
