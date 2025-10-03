import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/services/api.service';

type NewsItem = any;

interface CategoryOption {
  key: 'general' | 'articles' | 'press' | 'stocks' | 'crypto' | 'forex';
  label: string;
}

@Component({
  selector: 'app-dashboard-client-content06',
  templateUrl: './dashboard-client-content06.component.html',
  styleUrls: ['./dashboard-client-content06.component.css']
})
export class DashboardClientContent06Component implements OnInit {

  // UI / estado
  loading = false;
  errorMsg: string | null = null;

  // Config
  limit = 24;
  selectedCategory: CategoryOption['key'] = 'general';
  categories: CategoryOption[] = [
    { key: 'general', label: 'Geral' },
    { key: 'articles', label: 'Artigos' },
    { key: 'press', label: 'Press releases' },
    { key: 'stocks', label: 'Ações' },
    { key: 'crypto', label: 'Cripto' },
    { key: 'forex', label: 'Forex' },
  ];

  // Dados
  items: NewsItem[] = [];

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    // Carrega categoria padrão (Geral)
    this.reload();
  }

  onCategoryChange(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.errorMsg = null;

    let req$;
    switch (this.selectedCategory) {
      case 'articles':
        req$ = this.api.getNewsArticles(0, this.limit);
        break;
      case 'press':
        req$ = this.api.getNewsPressReleasesLatest({ page: 0, limit: this.limit });
        break;
      case 'stocks':
        req$ = this.api.getNewsStockLatest({ page: 0, limit: this.limit });
        break;
      case 'crypto':
        req$ = this.api.getNewsCryptoLatest({ page: 0, limit: this.limit });
        break;
      case 'forex':
        req$ = this.api.getNewsForexLatest({ page: 0, limit: this.limit });
        break;
      case 'general':
      default:
        req$ = this.api.getNewsGeneralLatest({ page: 0, limit: this.limit });
        break;
    }

    req$.subscribe({
      next: (list: any) => {
        const arr = Array.isArray(list) ? list : (list ? [list] : []);
        // Ordena por data desc
        this.items = arr.sort((a: any, b: any) => {
          const da = this.extractDate(a)?.getTime() ?? 0;
          const db = this.extractDate(b)?.getTime() ?? 0;
          return db - da;
        });
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || err?.message || 'Falha ao carregar notícias.';
      },
      complete: () => this.loading = false
    });
  }

  trackByNews = (i: number, n: any) =>
    (n?.url || '') + '|' + (n?.title || '') + '|' + i;

  formatDate(n: any): string {
    const d = this.extractDate(n);
    if (!d) return '—';
    // Mostra em pt-BR, coerente com seu público
    try {
      return d.toLocaleString('pt-BR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return d.toISOString();
    }
  }

  private extractDate(n: any): Date | null {
    const raw: string | undefined = n?.publishedDate || n?.date;
    if (!raw) return null;
    const iso = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
    const d = new Date(iso);
    return isNaN(+d) ? null : d;
  }
}