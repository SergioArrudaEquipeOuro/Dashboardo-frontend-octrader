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

interface EmailTemplateOptions {
  enterpriseName?: string;
  logoUrl?: string;
  supportEmail?: string;
  website?: string;
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
  createHtmlBody(contentHtml: string, options?: EmailTemplateOptions): string {
    const enterpriseName = options?.enterpriseName || '';
    const logoUrl = options?.logoUrl || '';
    const supportEmail = options?.supportEmail || '';
    const website = options?.website || '';

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${enterpriseName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      /* Base */
      body, html {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        background: #0f0a1a;          /* fundo sólido */
        color: #e9e4ff;
        -webkit-font-smoothing: antialiased;
      }

      .email-wrapper {
        width: 100%;
        padding: 24px 8px;
        background: #0f0a1a;         /* sólido, sem gradiente transparente */
      }

      .email-container {
        max-width: 640px;
        margin: 0 auto;
        border-radius: 18px;
        overflow: hidden;
        /* gradiente 100% opaco dentro do card */
        background: linear-gradient(
          180deg,
          #1a0f33 0%,
          #120c1f 55%,
          #0b0716 100%
        );
        border: 1px solid rgba(255, 255, 255, .18);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, .10),
          0 12px 32px rgba(25, 0, 61, .35),
          0 0 0 1px rgba(179, 108, 255, .10);
      }

      .header {
        text-align: center;
        padding: 24px 24px 12px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, .18);
        background: #120c1f;         /* header sólido */
      }

      .logo {
        max-width: 220px;
        height: auto;
        display: block;
        margin: 0 auto;
        filter: drop-shadow(0 2px 10px rgba(179, 108, 255, .25));
      }

      .badge {
        display: inline-block;
        margin-top: 16px;
        padding: 4px 14px;
        border-radius: 999px;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #e9e4ff;
        background: #2a154d;        /* sólido, roxo escuro */
        border: 1px solid rgba(179, 108, 255, .55);
      }

      .title {
        margin: 18px 0 4px 0;
        font-size: 22px;
        line-height: 1.3;
        font-weight: 700;
        color: #ffffff;
      }

      .title span.highlight-main {
        background: linear-gradient(90deg, #7f3cff 0%, #b36cff 100%);
        -webkit-background-clip: text;
        color: #ffffff;
      }

      .subtitle {
        margin: 0 0 8px 0;
        font-size: 13px;
        color: #c7b9ff;
      }

      .divider {
        height: 2px;
        width: 80px;
        background: linear-gradient(90deg, #7f3cff 0%, #b36cff 100%);
        border-radius: 999px;
        margin: 16px auto 0 auto;
      }

      .body {
        padding: 24px 24px 8px 24px;
        background: #120c1f;        /* corpo sólido */
      }

      .card {
        background: #160f2a;        /* card sólido (igual inputs do login) */
        border-radius: 16px;
        padding: 20px 18px 18px 18px;
        border: 1px solid rgba(179, 108, 255, 0.40);
      }

      .content {
        font-size: 14px;
        line-height: 1.7;
        color: #e9e4ff;
      }

      .content h1,
      .content h2,
      .content h3 {
        color: #ffffff;
        margin-top: 0;
      }

      .content a {
        color: #b36cff;
        text-decoration: none;
      }

      .content a:hover {
        text-decoration: underline;
      }

      .content ul,
      .content ol {
        padding-left: 20px;
      }

      .content strong {
        color: #ffffff;
      }

      .callout {
        margin-top: 18px;
        padding: 12px 14px;
        border-radius: 12px;
        font-size: 12px;
        line-height: 1.6;
        color: #e9e4ff;
        background: #0f0a1f;        /* sólido, sem transparência */
        border: 1px solid rgba(179, 108, 255, .55);
      }

      .footer {
        padding: 0 24px 20px 24px;
        font-size: 11px;
        color: #c7b9ff;
        background: #0f0a1a;        /* rodapé sólido */
      }

      .footer-divider {
        margin: 12px 0;
        border-top: 1px solid rgba(255, 255, 255, .18);
      }

      .footer-links {
        margin: 4px 0 0 0;
        color: #b7acde;
      }

      .footer-links a {
        color: #e9e4ff;
        text-decoration: none;
      }

      .footer-links a:hover {
        text-decoration: underline;
      }

      @media (max-width: 600px) {
        .email-container {
          border-radius: 14px;
        }

        .body {
          padding: 20px 16px 8px 16px;
        }

        .card {
          padding: 16px 14px 14px 14px;
        }

        .title {
          font-size: 18px;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <table class="email-container" role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td class="header">
            <img
              src="https://i.imgur.com/4x8d9Ri.png"
              alt="${enterpriseName}"
              class="logo"
            />
            <div class="badge">
              You made the right choice
            </div>
            <h1 class="title">
              Welcome to
              <span class="highlight-main">${enterpriseName}</span>.
            </h1>
            <p class="subtitle">
              A platform designed for those who seek technology, transparency
              and a next-level trading experience.
            </p>
            <div class="divider"></div>
          </td>
        </tr>

        <tr>
          <td class="body">
            <div class="card">
              <div class="content">
                ${contentHtml}
              </div>

              <div class="callout">
                <strong>You're not starting from scratch.</strong><br />
                From now on, you can count on our infrastructure, team and
                technology to support your next steps in the market.
                Whenever you need us, we’ll be here for you.
              </div>
            </div>
          </td>
        </tr>

        <tr>
          <td class="footer">
            <div class="footer-divider"></div>
            <p>
              This email was sent automatically by the ${enterpriseName} platform.
            </p>
            <p class="footer-links">
              Support: <a href="mailto:${supportEmail}">${supportEmail}</a><br />
              Website: <a href="${website}">${website}</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>
  `;
  }

}