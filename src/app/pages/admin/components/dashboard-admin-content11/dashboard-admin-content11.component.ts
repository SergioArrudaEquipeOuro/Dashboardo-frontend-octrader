import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';

type NewsItem = any;

interface LoadingFlags {
  stockSearch: boolean;
  cryptoSearch: boolean;
  forexSearch: boolean;
  pressSearch: boolean;
  articles: boolean;
  general: boolean;
  pressLatest: boolean;
  stockLatest: boolean;
  cryptoLatest: boolean;
  forexLatest: boolean;
}

interface ErrorFlags {
  stockSearch: string | null;
  cryptoSearch: string | null;
  forexSearch: string | null;
  pressSearch: string | null;
}

@Component({
  selector: 'app-dashboard-admin-content11',
  templateUrl: './dashboard-admin-content11.component.html',
  styleUrls: ['./dashboard-admin-content11.component.css']
})
export class DashboardAdminContent11Component implements OnInit {

  // ===== Filtros locais (cliente) =====
  from?: string;   // 'YYYY-MM-DD'
  to?: string;     // 'YYYY-MM-DD'
  page = 0;
  limit = 12;

  // ===== Entradas de busca =====
  stockSymbol = '';
  cryptoSymbol = '';
  forexSymbol = '';
  pressSymbol = '';

  // ===== Loading & Erros (com tipos explícitos) =====
  loadingAll = false;
  loading: LoadingFlags = {
    stockSearch: false,
    cryptoSearch: false,
    forexSearch: false,
    pressSearch: false,
    articles: false,
    general: false,
    pressLatest: false,
    stockLatest: false,
    cryptoLatest: false,
    forexLatest: false,
  };

  erro: ErrorFlags = {
    stockSearch: null,
    cryptoSearch: null,
    forexSearch: null,
    pressSearch: null,
  };

  // ===== Resultados de busca =====
  stockSearch: NewsItem[] = [];
  cryptoSearch: NewsItem[] = [];
  forexSearch: NewsItem[] = [];
  pressSearch: NewsItem[] = [];

  // ===== Dados (RAW e filtrados) =====
  artigosRaw: NewsItem[] = [];
  geralRaw: NewsItem[] = [];
  releasesRaw: NewsItem[] = [];
  acoesRaw: NewsItem[] = [];
  criptoRaw: NewsItem[] = [];
  forexRaw: NewsItem[] = [];

  artigos: NewsItem[] = [];
  geral: NewsItem[] = [];
  releases: NewsItem[] = [];
  acoes: NewsItem[] = [];
  cripto: NewsItem[] = [];
  forex: NewsItem[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {  }

  trackByIdx(index: number) { return index; }

  // ========= Carrega do backend e aplica filtros no cliente =========
  reloadAll(): void {
    this.loadingAll = true;

    const reqs = {
      artigos:  this.api.getNewsArticles(0, 100),
      geral:    this.api.getNewsGeneralLatest({ page: 0, limit: 100 }),
      releases: this.api.getNewsPressReleasesLatest({ page: 0, limit: 100 }),
      acoes:    this.api.getNewsStockLatest({ page: 0, limit: 100 }),
      cripto:   this.api.getNewsCryptoLatest({ page: 0, limit: 100 }),
      forex:    this.api.getNewsForexLatest({ page: 0, limit: 100 }),
    };

    forkJoin(reqs).subscribe({
      next: (data: any) => {
        const asArray = (x: any): any[] => Array.isArray(x) ? x : (x ? [x] : []);
        this.artigosRaw  = asArray(data.artigos);
        this.geralRaw    = asArray(data.geral);
        this.releasesRaw = asArray(data.releases);
        this.acoesRaw    = asArray(data.acoes);
        this.criptoRaw   = asArray(data.cripto);
        this.forexRaw    = asArray(data.forex);
        this.aplicarFiltrosLocais();
      },
      error: () => {},
      complete: () => this.loadingAll = false
    });
  }

  // ========= Filtros no cliente =========
  aplicarFiltrosLocais(): void {
    const de  = this.from ? new Date(this.from + 'T00:00:00') : undefined;
    const ate = this.to   ? new Date(this.to   + 'T23:59:59') : undefined;

    const filtrar = (arr: NewsItem[]) => {
      let out = arr;

      if (de || ate) {
        out = out.filter(n => {
          const d = this.extrairData(n);
          if (!d) return false;
          if (de && d < de) return false;
          if (ate && d > ate) return false;
          return true;
        });
      }

      const p = Math.max(0, this.page || 0);
      const lim = Math.max(1, this.limit || 12);
      const start = p * lim;
      return out.slice(start, start + lim);
    };

    this.artigos  = filtrar(this.artigosRaw);
    this.geral    = filtrar(this.geralRaw);
    this.releases = filtrar(this.releasesRaw);
    this.acoes    = filtrar(this.acoesRaw);
    this.cripto   = filtrar(this.criptoRaw);
    this.forex    = filtrar(this.forexRaw);
  }

  // tenta publishedDate | date
  private extrairData(n: any): Date | null {
    const raw: string | undefined = n?.publishedDate || n?.date;
    if (!raw) return null;
    const iso = raw.includes(' ') ? raw.replace(' ', 'T') : raw;
    const d = new Date(iso);
    return isNaN(+d) ? null : d;
    }

  // ========= BUSCAS =========
  doStockSearch(): void {
    const s = (this.stockSymbol || '').trim().toUpperCase();
    if (!s) { this.erro.stockSearch = 'Informe um símbolo (ex.: AAPL).'; return; }
    this.erro.stockSearch = null;
    this.loading.stockSearch = true;

    this.api.searchStockNews(s, { from: this.from, to: this.to, page: 0, limit: this.limit || 20 })
      .subscribe({
        next: (list: any) => this.stockSearch = Array.isArray(list) ? list : [],
        error: () => this.erro.stockSearch = 'Falha ao buscar.',
        complete: () => this.loading.stockSearch = false
      });
  }

  doCryptoSearch(): void {
    const s = (this.cryptoSymbol || '').trim().toUpperCase();
    if (!s) { this.erro.cryptoSearch = 'Informe um símbolo (ex.: BTCUSD).'; return; }
    this.erro.cryptoSearch = null;
       this.loading.cryptoSearch = true;

    this.api.searchCryptoNews(s, { from: this.from, to: this.to, page: 0, limit: this.limit || 20 })
      .subscribe({
        next: (list: any) => this.cryptoSearch = Array.isArray(list) ? list : [],
        error: () => this.erro.cryptoSearch = 'Falha ao buscar.',
        complete: () => this.loading.cryptoSearch = false
      });
  }

  doForexSearch(): void {
    const s = (this.forexSymbol || '').trim().toUpperCase();
    if (!s) { this.erro.forexSearch = 'Informe um símbolo (ex.: EURUSD).'; return; }
    this.erro.forexSearch = null;
    this.loading.forexSearch = true;

    this.api.searchForexNews(s, { from: this.from, to: this.to, page: 0, limit: this.limit || 20 })
      .subscribe({
        next: (list: any) => this.forexSearch = Array.isArray(list) ? list : [],
        error: () => this.erro.forexSearch = 'Falha ao buscar.',
        complete: () => this.loading.forexSearch = false
      });
  }

  doPressSearch(): void {
    const s = (this.pressSymbol || '').trim().toUpperCase();
    if (!s) { this.erro.pressSearch = 'Informe um símbolo (ex.: AAPL).'; return; }
    this.erro.pressSearch = null;
    this.loading.pressSearch = true;

    this.api.searchPressReleases(s, { from: this.from, to: this.to, page: 0, limit: this.limit || 20 })
      .subscribe({
        next: (list: any) => this.pressSearch = Array.isArray(list) ? list : [],
        error: () => this.erro.pressSearch = 'Falha ao buscar.',
        complete: () => this.loading.pressSearch = false
      });
  }

  temAlgumResultadoBusca(): boolean {
    return !!(
      (this.stockSearch?.length) ||
      (this.cryptoSearch?.length) ||
      (this.forexSearch?.length) ||
      (this.pressSearch?.length)
    );
  }
}
