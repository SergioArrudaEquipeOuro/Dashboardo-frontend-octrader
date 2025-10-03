// src/app/components/contets-dashboard/dashboard-client-content04/dashboard-client-content04.component.ts
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { Subscription, timer } from 'rxjs';
import { ApiService, MarketCategory } from 'src/app/services/api.service';

type MarketDirection = 'commodities' | 'forex' | 'indices' | 'stocks' | 'crypto';

interface ViewRow {
  symbol: string; // símbolo já LIMPO (exibido e usado na logo)
  name: string;
  price: number | string | null;
  volume: number | string | null;
  change: number | string | null;
  changesPercentage: number | string | null;
}

@Component({
  selector: 'app-dashboard-admin-content12',
  templateUrl: './dashboard-admin-content12.component.html',
  styleUrls: ['./dashboard-admin-content12.component.css']
})
export class DashboardAdminContent12Component implements OnInit, OnDestroy {

  directions: { value: MarketDirection, label: string }[] = [
    { value: 'forex', label: 'Forex' },
    { value: 'indices', label: 'Índices' },
    { value: 'commodities', label: 'Commodities' },
    { value: 'crypto', label: 'Criptomoedas' },
    { value: 'stocks', label: 'Ações' },
  ];

  private fallbackMap: Record<MarketDirection, string> = {
    crypto: 'assets/img/cripto.png',
    indices: 'assets/img/index.png',
    commodities: 'assets/img/commodities.png',
    forex: 'assets/img/forex.png',
    stocks: 'assets/img/stocks.png'
  };

  /** TOP 20 por direção (símbolos JÁ no formato LIMPO que a UI exibe) */
  private topSymbols: Record<MarketDirection, string[]> = {
    crypto: [
      'BTCUSD', 'ETHUSD', 'USDTUSD', 'BNBUSD', 'XRPUSD', 'SOLUSD', 'ADAUSD', 'DOGEUSD', 'TRXUSD', 'TONUSD',
      'DOTUSD', 'LTCUSD', 'BCHUSD', 'LINKUSD', 'MATICUSD', 'AVAXUSD', 'SHIBUSD', 'XLMUSD', 'ETCUSD', 'XMRUSD'
    ],
    stocks: [
      'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK', 'V',
      'MA', 'JPM', 'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'BAC', 'KO', 'PEP', 'ORCL'
    ],
    indices: [
      'GSPC', 'DJI', 'IXIC', 'RUT', 'VIX', 'GDAXI', 'FTSE', 'FCHI', 'N225', 'HSI',
      'STOXX50E', 'BVSP', 'TSX', 'KS11', 'AS51', 'AEX', 'SMI', 'OMXS30', 'BFX', 'TA125'
    ],
    forex: [
      'EURUSD', 'USDJPY', 'GBPUSD', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURJPY', 'EURGBP', 'EURCHF',
      'GBPJPY', 'EURCAD', 'AUDJPY', 'CHFJPY', 'CADJPY', 'EURAUD', 'GBPAUD', 'EURNZD', 'AUDCAD', 'GBPCAD', 'BRLUSD'
    ],
    commodities: [
      'XAUUSD', 'XAGUSD', 'CLUSD', 'BZUSD', 'NGUSD', 'HGUSD', 'ZCUSD', 'ZWUSD', 'ZSUSD', 'KCUSD',
      'CTUSD', 'SBUSD', 'CCUSD', 'PLUSD', 'PAUSD', 'ALUSD', 'NIUSD', 'RBUSD', 'HOUSD', 'LEUSD'
    ]
  };

  selected: MarketDirection = 'stocks';
  @Input() user: any;
  @Input() activeEnterprise: any;

  query = '';
  loading = false;
  isPolling = false;                          // ⬅️ spinner/polling
  private pollingSub: Subscription | null = null;

  errorMsg: string | null = null;

  meta: any = null;
  rawItems: any[] = [];
  rowsAll: ViewRow[] = [];
  rows: ViewRow[] = [];
  selectedForBot: ViewRow | null = null;
  direction: any;
  openNonce = 0;

  page = 1;
  pageSize = 25;
  total = 0;

  get role(): boolean {
    const role = this.user.role;
    if (role === 'ROOT') {
      return true;
    } else if (role === 'BROKER' && this.activeEnterprise.brokerCreateBot === true) {
      return true;
    }
    return false;
  }

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    this.loadMeta();
    this.loadSelected();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  labelFor(dir: MarketDirection) {
    this.direction = dir;
    return this.directions.find(d => d.value === dir)?.label ?? dir;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  onChangeDirection() {
    this.page = 1;
    this.stopPolling(); // evita múltiplos timers quando troca de aba
    this.loadSelected();
  }

  onFilterChange() {
    this.page = 1;
    this.applyFilterAndPaging();
  }

  refreshSelected() {
    this.stopPolling();
    this.loadSelected(true);
  }

  refreshAll() {
    this.loading = true;
    this.errorMsg = null;
    this.api.getAll().pipe(finalize(() => this.loading = false)).subscribe({
      next: (all) => {
        this.meta = all?._meta ?? null;
        this.loadSelected();
      },
      error: (err) => this.handleHttpError(err, 'Falha ao atualizar todas as categorias')
    });
  }

  loadMeta() {
    this.api.getMeta().subscribe({ next: (m) => this.meta = m, error: () => { } });
  }

  private loadSelected(force = false) {
    this.loading = true;
    this.errorMsg = null;

    const cat = this.selected as MarketCategory;
    this.api.getCategoryList(cat)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (list) => {
          const arr = list ?? [];
          // se ainda não há dados (warm-up), ligar polling
          if (!arr.length) {
            this.startPolling();
            return;
          }
          this.stopPolling();
          this.rawItems = arr;
          this.rowsAll = this.rawItems.map(it => {
            const symRaw = it?.symbol ?? it?.ticker ?? '';
            const symbol = this.cleanSymbol(symRaw, this.selected);
            return {
              symbol,
              name: it?.name ?? it?.companyName ?? it?.fullname ?? '-',
              price: it?.price ?? it?.ask ?? it?.bid ?? null,
              volume: this.pickVolume(it),
              change: it?.change ?? it?.changes ?? null,
              changesPercentage: it?.changesPercentage ?? it?.changePercentage ?? null
            } as ViewRow;
          });
          this.applyFilterAndPaging();
        },
        error: (err) => {
          // 503 = cache não populado -> polling silencioso
          if (err?.status === 503) {
            this.startPolling();
          } else {
            this.handleHttpError(err, `Falha ao carregar ${this.labelFor(this.selected)}`);
          }
        }
      });
  }

  /** Inicia polling a cada 5s até que a lista chegue */
  private startPolling() {
    if (this.pollingSub) return; // já ativo
    this.isPolling = true;
    this.errorMsg = null;

    this.pollingSub = timer(0, 5000).subscribe(() => {
      const cat = this.selected as MarketCategory;
      this.api.getCategoryList(cat).subscribe({
        next: (list) => {
          if (Array.isArray(list) && list.length > 0) {
            this.isPolling = false;
            this.stopPolling();
            this.rawItems = list;
            this.rowsAll = this.rawItems.map(it => {
              const symRaw = it?.symbol ?? it?.ticker ?? '';
              const symbol = this.cleanSymbol(symRaw, this.selected);
              return {
                symbol,
                name: it?.name ?? it?.companyName ?? it?.fullname ?? '-',
                price: it?.price ?? it?.ask ?? it?.bid ?? null,
                volume: this.pickVolume(it),
                change: it?.change ?? it?.changes ?? null,
                changesPercentage: it?.changesPercentage ?? it?.changePercentage ?? null
              } as ViewRow;
            });
            this.applyFilterAndPaging();
          }
        },
        error: (err) => {
          // se não for 503, encerra polling e mostra erro
          if (err?.status !== 503) {
            this.isPolling = false;
            this.stopPolling();
            this.handleHttpError(err, `Falha ao carregar ${this.labelFor(this.selected)}`);
          }
        }
      });
    });
  }

  private stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
    this.isPolling = false;
  }

  /** Ordenação com booster: se NÃO houver busca, top20 primeiro; com busca, por relevância. */
  private applyFilterAndPaging() {
    const q = this.normalize(this.query);
    const dir = this.selected;

    // 1) FILTRAR
    let filtered = q
      ? this.rowsAll.filter(r => this.matchesQuery(r, q))
      : [...this.rowsAll];

    // 2) ORDENAR
    if (q) {
      filtered.sort((a, b) => this.scoreRow(b, q) - this.scoreRow(a, q));
    } else {
      const priority = this.buildPriorityIndex(dir);
      const INF = 1_000_000;
      filtered.sort((a, b) => {
        const ai = priority.get(a.symbol.toUpperCase()) ?? INF;
        const bi = priority.get(b.symbol.toUpperCase()) ?? INF;
        if (ai !== bi) return ai - bi;
        return a.symbol.localeCompare(b.symbol);
      });
    }

    // 3) PAGINAÇÃO
    this.total = filtered.length;
    const start = (this.page - 1) * this.pageSize;
    this.rows = filtered.slice(start, start + this.pageSize);
  }

  /** Constrói um índice: símbolo -> posição no top20 (0..19). */
  private buildPriorityIndex(dir: MarketDirection): Map<string, number> {
    const arr = (this.topSymbols[dir] || []).slice(0, 21);
    const map = new Map<string, number>();
    arr.forEach((sym, i) => map.set(sym.toUpperCase(), i));
    if (dir === 'stocks') {
      if (!map.has('BRK')) map.set('BRK', 6);
    }
    return map;
  }

  nextPage() {
    if (this.page * this.pageSize < this.total) {
      this.page++;
      this.applyFilterAndPaging();
    }
  }
  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.applyFilterAndPaging();
    }
  }

  trackBySymbol(index: number, row: ViewRow) {
    return row?.symbol ?? index;
  }

  /** URL da logo baseada no símbolo LIMPO */
  public urlSymbol(symbol: string): string {
    const base = (symbol || '').trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }

  public fallbackUrl(dir: MarketDirection): string {
    return this.fallbackMap[dir];
  }

  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement | null;
    if (!img) return;
    const alreadyFallback = img.dataset['fallback'] === '1';
    if (!alreadyFallback) {
      img.src = this.fallbackUrl(this.selected);
      img.dataset['fallback'] = '1';
    } else {
      img.style.display = 'none';
    }
  }

  // ===== símbolo e filtro =====
  private cleanSymbol(symRaw: string, dir: MarketDirection): string {
    if (!symRaw) return '-';
    let s = symRaw.trim();
    s = s.replace(/^\^+/, '');   // remove ^ no início
    s = s.replace(/\..*$/, '');  // remove .sufixo
    /* if (dir === 'crypto') {
      if (s.toUpperCase().endsWith('USD')) {
        s = s.slice(0, -3).replace(/[-/]+$/, '');
      }
    } */
    return s;
  }

  private pickVolume(it: any): number | string | null {
    return it?.volume ?? it?.avgVolume ?? it?.volAvg ?? it?.averageVolume ?? it?.vol ?? null;
  }

  private handleHttpError(err: any, defaultMsg: string) {
    // 503 é tratado com polling/silêncio
    if (err?.status === 503) {
      this.errorMsg = null;
      return;
    }
    if (err?.error?.message) {
      this.errorMsg = err.error.message;
    } else if (err?.message) {
      this.errorMsg = err.message;
    } else {
      this.errorMsg = defaultMsg;
    }
  }

  // ------- ranking do filtro --------
  private normalize(s: string): string {
    return (s || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toUpperCase();
  }
  private scoreRow(r: ViewRow, qNorm: string): number {
    const sym = this.normalize(r.symbol);
    const nam = this.normalize(r.name);
    if (!qNorm) return 0;
    if (sym === qNorm) return 100;
    if (sym.startsWith(qNorm)) return 90;
    if (nam.startsWith(qNorm)) return 80;
    if (sym.includes(qNorm)) return 70;
    if (nam.includes(qNorm)) return 60;
    const simS = this.similarity(sym, qNorm);
    const simN = this.similarity(nam, qNorm);
    return Math.round(40 * Math.max(simS, simN));
  }
  private similarity(a: string, b: string): number {
    const dist = this.levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length) || 1;
    return 1 - dist / maxLen;
  }
  private levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  /** Vai gerar uma lista de páginas com janelas + reticências. Ex.: [1, '…', 3, 4, 5, '…', 20] */
  pageList(): (number | '…')[] {
    const total = this.totalPages;
    const curr = this.page;
    const win = 2; // páginas de cada lado

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(total);
    for (let p = Math.max(1, curr - win); p <= Math.min(total, curr + win); p++) pages.add(p);
    pages.add(2);
    pages.add(3);
    pages.add(total - 1);
    pages.add(total - 2);

    const sorted = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

    const out: (number | '…')[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (i === 0) {
        out.push(p);
      } else {
        const prev = sorted[i - 1];
        if (p === prev + 1) {
          out.push(p);
        } else {
          out.push('…', p);
        }
      }
    }
    return out.filter((v, i, arr) => !(v === '…' && arr[i - 1] === '…'));
  }

  goToPage(p: number) {
    if (typeof p !== 'number') return;
    const target = Math.min(Math.max(1, p), this.totalPages);
    if (target !== this.page) {
      this.page = target;
      this.applyFilterAndPaging();
    }
  }

  get endIndex(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  /** Decide se a linha "bate" com a busca (símbolo/nome) */
  private matchesQuery(r: ViewRow, qNorm: string): boolean {
    if (!qNorm) return true;
    const sym = this.normalize(r.symbol);
    const nam = this.normalize(r.name);

    if (sym === qNorm || nam === qNorm) return true;
    if (sym.startsWith(qNorm) || nam.startsWith(qNorm)) return true;
    if (sym.includes(qNorm) || nam.includes(qNorm)) return true;

    const cutoff = this.computeCutoff(qNorm.length);
    const simS = this.similarity(sym, qNorm);
    const simN = this.similarity(nam, qNorm);
    return Math.max(simS, simN) >= cutoff;
  }

  /** Limiar adaptativo: termos curtos exigem similaridade maior */
  private computeCutoff(len: number): number {
    if (len <= 2) return 0.95;
    if (len <= 3) return 0.90;
    if (len <= 4) return 0.80;
    if (len <= 6) return 0.70;
    return 0.60;
  }

  openCreateBot(row: ViewRow) {
    this.selectedForBot = row;
    this.direction = this.selected;
    this.openNonce++;
  }
}
