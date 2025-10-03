import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConnectionService } from './connection.service';

interface EmailRequest {
  to: string;
  subject: string;
  text: string;
}

interface HtmlEmailRequest {
  to: string;
  subject: string;
  htmlBody: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  private apiUrl = this.conn.url() + 'api/email';

  constructor(
    private http: HttpClient,
    private conn: ConnectionService
  ) { }

  sendEmail(emailRequest: EmailRequest): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.apiUrl}/send`, emailRequest, { headers, responseType: 'text' as 'json' });
  }

  sendHtmlEmail(htmlEmailRequest: HtmlEmailRequest): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(`${this.apiUrl}/sendHtml`, htmlEmailRequest, { headers, responseType: 'text' as 'json' });
  }

  // Novo método para criar o HTML body
  createHtmlBody(text: string): string {
    return `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .header {
              text-align: center;
              background-color: #f8f8f8;
              padding: 10px;
            }
            .header img {
              width: 100%;
            }
            .content {
              margin: 20px;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://i.imgur.com/qwtnikv.png" alt="Company Logo">
          </div>
          <div class="content">
            ${text.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>This email was sent to you by PHP. If you no longer wish to receive these emails, please contact our support team.</p>
          </div>
        </body>
      </html>
    `;
  }
}