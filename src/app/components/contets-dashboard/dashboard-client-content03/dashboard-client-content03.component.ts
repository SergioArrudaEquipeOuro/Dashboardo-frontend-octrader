import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { Subscription, timer } from 'rxjs';
import { ApiService, MarketCategory } from 'src/app/services/api.service';

type MarketDirection = 'commodities' | 'forex' | 'indexes' | 'stocks' | 'crypto';

interface ViewRow {
  symbol: string;
  name: string;
  price: number | null;
  volume: number | null;
  change: number | null;
  changesPercentage: number | null;
  _tickDir?: 'up' | 'down' | null;
  _prevChange?: number | null;
}

@Component({
  selector: 'app-dashboard-client-content03',
  templateUrl: './dashboard-client-content03.component.html',
  styleUrls: ['./dashboard-client-content03.component.css']
})
export class DashboardClientContent03Component implements OnInit, OnDestroy {
  @Input() isLightTheme = false;
  @Input() user: any;
  @Input() activeEnterprise: any;

  mobileOpenRow: ViewRow | null = null;
  activeNow: string = '';
  lvl: any;

  // ===== estados do novo fluxo =====
  expanded: MarketDirection | null = null;                  // qual mercado está aberto (accordion)
  selectedLevel: 1 | 2 | 3 | null = null;                   // nível escolhido
  toastMsg: string | null = null;
  private readonly WIZARD_KEY = 'dc03_wizard_state';
  private readonly LAST_KEY = 'dc03_last_selection';
  readonly wizardImage = 'https://i.imgur.com/g2SXduH.png';

  get isWizard(): boolean {
    return !!(this.activeEnterprise && this.activeEnterprise.botNivel === true);
  }

  // ===== Ações de linha =====
  private keyOf(row: any): string { return String(row?.symbol ?? ''); }
  rowMenuOpen = new Set<string>();
  selectedForAutomation: any | null = null;

  directions: { value: MarketDirection, label: string }[] = [
    { value: 'forex', label: 'https://i.imgur.com/3DWCKyM.png' },
    { value: 'indexes', label: 'https://i.imgur.com/KVxgpvD.png' },
    { value: 'commodities', label: 'https://i.imgur.com/RwcLoCp.png' },
    { value: 'crypto', label: 'https://i.imgur.com/69ZT04R.png' },
    { value: 'stocks', label: 'https://i.imgur.com/sLVQHsq.png' }
  ];

  // Top 20 por direção
  private topSymbols: Record<MarketDirection, string[]> = {
    crypto: ['BTCUSD', 'ETHUSD', 'USDTUSD', 'BNBUSD', 'XRPUSD', 'SOLUSD', 'ADAUSD', 'DOGEUSD', 'TRXUSD', 'TONUSD', 'DOTUSD', 'LTCUSD', 'BCHUSD', 'LINKUSD', 'MATICUSD', 'AVAXUSD', 'SHIBUSD', 'XLMUSD', 'ETCUSD', 'XMRUSD'],
    stocks: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'BRK', 'V', 'MA', 'JPM', 'WMT', 'JNJ', 'PG', 'UNH', 'HD', 'BAC', 'KO', 'PEP', 'ORCL'],
    indexes: ['GSPC', 'DJI', 'IXIC', 'RUT', 'VIX', 'GDAXI', 'FTSE', 'FCHI', 'N225', 'HSI', 'STOXX50E', 'BVSP', 'TSX', 'KS11', 'AS51', 'AEX', 'SMI', 'OMXS30', 'BFX', 'TA125'],
    forex: ['EURUSD', 'USDJPY', 'GBPUSD', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURJPY', 'EURGBP', 'EURCHF', 'GBPJPY', 'EURCAD', 'AUDJPY', 'CHFJPY', 'CADJPY', 'EURAUD', 'GBPAUD', 'EURNZD', 'AUDCAD', 'GBPCAD'],
    commodities: ['XAUUSD', 'XAGUSD', 'CLUSD', 'BZUSD', 'NGUSD', 'HGUSD', 'ZCUSD', 'ZWUSD', 'ZSUSD', 'KCUSD', 'CTUSD', 'SBUSD', 'CCUSD', 'PLUSD', 'PAUSD', 'ALUSD', 'NIUSD', 'RBUSD', 'HOUSD', 'LEUSD']
  };

  private baseBySymbol = new Map<string, { change: number, pct: number }>();
  private simTimers = new Map<string, number>(); // ids de setTimeout por símbolo

  // Estado de lista
  selected: MarketDirection = 'stocks';
  query = '';
  loading = false;
  isPolling = false;
  private pollingSub: Subscription | null = null;
  errorMsg: string | null = null;

  rawItems: any[] = [];
  rowsAll: ViewRow[] = [];
  rows: ViewRow[] = [];

  // paginação
  page = 1;
  pageSize = 25;
  total = 0;

  constructor(private api: ApiService) { }

  // ===== Lifecycle =====
  ngOnInit(): void {
    if (this.isWizard) {
      this.restoreWizard();
      if (this.selectedLevel !== null) {
        this.loadSelected();
      }
    } else {
      this.loadSelected();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.stopAllSimTimers();
    this.mobileOpenRow = null;
  }

  // ===== Persistência/Toast =====
  private showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => (this.toastMsg = null), 2000);
  }
  notifyLocked(n: 1 | 2 | 3) {
    this.showToast(`Nível 0${n} bloqueado para sua conta.`);
  }

  private persistWizard(): void {
    const payload = { direction: this.selected, level: this.selectedLevel };
    localStorage.setItem(this.WIZARD_KEY, JSON.stringify(payload));
    localStorage.setItem(this.LAST_KEY, JSON.stringify(payload));
  }

  private restoreWizard(): void {
    try {
      const raw = localStorage.getItem(this.WIZARD_KEY) || localStorage.getItem(this.LAST_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw || '{}') || {};
      const dirs = this.directions.map(d => d.value);
      if (dirs.includes(saved.direction)) {
        this.selected = saved.direction as MarketDirection;
        this.expanded = this.selected; // abre o acordeão do último mercado
      }
      if ([1, 2, 3].includes(saved.level) && this.isLevelAvailable(saved.level)) {
        this.selectedLevel = saved.level as 1 | 2 | 3;
      } else {
        this.selectedLevel = null;
      }
    } catch { /* ignore */ }
  }

  // ===== Helpers de labels/paginação =====
  labelFor(dir: MarketDirection) {
    return this.directions.find(d => d.value === dir)?.value ?? dir;
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get endIndex(): number { return Math.min(this.page * this.pageSize, this.total); }

  // ===== Accordion & seleção de nível =====
  toggleMarket(dir: MarketDirection): void {
    this.expanded = (this.expanded === dir) ? null : dir;
  }

  isLevelAvailable(n: 1 | 2 | 3): boolean {
    const u = this.user || {};
    if (n === 1) return u.softwareNivel01 === true;
    if (n === 2) return u.softwareNivel02 === true;
    return u.softwareNivel03 === true;
  }

  chooseLevel(dir: MarketDirection, level: 1 | 2 | 3): void {
    this.selected = dir;
    this.selectedLevel = level;

    // reset de UI e persistência
    this.page = 1;
    this.query = '';
    this.rows = [];
    this.total = 0;
    this.persistWizard();

    // interrompe simulações anteriores e carrega
    this.stopPolling();
    this.stopAllSimTimers();
    this.loadSelected();

    // scroll suave à área da tabela
    setTimeout(() => {
      document.getElementById('table-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  // ===== Loading / polling =====
  private loadSelected() {
    this.loading = true;
    this.errorMsg = null;

    const cat = this.toApiCategory(this.selected);


    this.api.getCategoryList(cat)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (list) => {
          const arr = list ?? [];
          if (!arr.length) { this.startPolling(); return; }
          this.stopPolling();
          this.buildRows(arr);
        },
        error: (err) => {
          if (err?.status === 503) this.startPolling();
          else this.handleHttpError(err, `Falha ao carregar ${this.labelFor(this.selected)}`);
        }
      });
  }

  private startPolling() {
    if (this.pollingSub) return;
    this.isPolling = true; this.errorMsg = null;
    this.pollingSub = timer(0, 5000).subscribe(() => {
      const cat = this.toApiCategory(this.selected);
      this.api.getCategoryList(cat).subscribe({
        next: (list) => {
          if (Array.isArray(list) && list.length > 0) {
            this.isPolling = false; this.stopPolling(); this.buildRows(list);
          }
        },
        error: (err) => {
          if (err?.status !== 503) {
            this.isPolling = false; this.stopPolling();
            this.handleHttpError(err, `Falha ao carregar ${this.labelFor(this.selected)}`);
          }
        }
      });
    });
  }
  private stopPolling() {
    if (this.pollingSub) { this.pollingSub.unsubscribe(); this.pollingSub = null; }
    this.isPolling = false;
  }

  private buildRows(list: any[]) {
    this.rawItems = list;
    this.rowsAll = list.map(it => {
      const symRaw = it?.symbol ?? it?.ticker ?? '';
      const symbol = this.cleanSymbol(symRaw);
      return {
        symbol,
        name: it?.name ?? it?.companyName ?? it?.fullname ?? '-',
        price: this.toNumOrNull(it?.price ?? it?.ask ?? it?.bid),
        volume: this.pickVolume(it),
        change: this.toNumOrNull(it?.change ?? it?.changes),
        changesPercentage: this.toNumOrNull(it?.changesPercentage ?? it?.changePercentage),
        _tickDir: null,
        _prevChange: null
      } as ViewRow;
    });

    // (1) Baselines por símbolo (sempre o valor ORIGINAL da API)
    this.baseBySymbol.clear();
    for (const r of this.rowsAll) {
      const ch = r.change ?? 0;
      const pct = r.changesPercentage ?? 0;
      this.baseBySymbol.set(r.symbol, { change: ch, pct: pct });
    }

    // (2) Render + simulação somente nas linhas visíveis
    this.applyFilterAndPaging();
  }

  // ===== UI actions =====
  onChangeDirection() {
    this.page = 1;
    this.stopPolling();
    this.stopAllSimTimers();
    this.loadSelected();
  }

  onFilterChange() { this.page = 1; this.applyFilterAndPaging(); }

  refreshSelected() {
    this.stopPolling();
    this.stopAllSimTimers();
    this.loadSelected();
  }

  refreshAll() {
    this.loading = true; this.errorMsg = null;
    this.api.getAll().pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => this.loadSelected(),
      error: (err) => this.handleHttpError(err, 'Falha ao atualizar todas as categorias')
    });
  }

  // ===== filtro / paginação =====
  private applyFilterAndPaging() {
    const q = this.normalize(this.query);
    let filtered = q ? this.rowsAll.filter(r => this.matchesQuery(r, q)) : [...this.rowsAll];

    if (q) {
      filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else {
      const priority = this.buildPriorityIndex(this.selected);
      const INF = 1_000_000;
      filtered.sort((a, b) => {
        const ai = priority.get(a.symbol.toUpperCase()) ?? INF;
        const bi = priority.get(b.symbol.toUpperCase()) ?? INF;
        if (ai !== bi) return ai - bi;
        return a.symbol.localeCompare(b.symbol);
      });
    }

    this.total = filtered.length;
    const start = (this.page - 1) * this.pageSize;
    this.rows = filtered.slice(start, start + this.pageSize);

    // >>> sincroniza timers com a página visível
    this.syncSimTimersWithVisibleRows();
  }

  nextPage() { if (this.page * this.pageSize < this.total) { this.page++; this.applyFilterAndPaging(); } }
  prevPage() { if (this.page > 1) { this.page--; this.applyFilterAndPaging(); } }
  goToPage(p: number) {
    if (typeof p !== 'number') return;
    const target = Math.min(Math.max(1, p), this.totalPages);
    if (target !== this.page) { this.page = target; this.applyFilterAndPaging(); }
  }

  pageList(): (number | '…')[] {
    const total = this.totalPages;
    const curr = this.page;
    const win = 2;

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = new Set<number>([1, 2, 3, total - 2, total - 1, total]);
    for (let p = Math.max(1, curr - win); p <= Math.min(total, curr + win); p++) pages.add(p);

    const sorted = Array.from(pages).sort((a, b) => a - b);

    const out: (number | '…')[] = [];
    if (sorted.length) out.push(sorted[0]);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) out.push('…');
      out.push(sorted[i]);
    }
    return out;
  }

  trackBySymbol(i: number, r: ViewRow) { return r?.symbol ?? i; }

  // ===== helpers =====
  public urlSymbol(symbol: string): string {
    const base = (symbol || '').trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }
  
  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement | null;
    if (!img) return;
    const fallbackMap: Record<MarketDirection, string> = {
      crypto: 'assets/img/cripto.png',
      indexes: 'assets/img/index.png',
      commodities: 'assets/img/commodities.png',
      forex: 'assets/img/forex.png',
      stocks: 'assets/img/stocks.png'
    };
    if (img.dataset['fallback'] !== '1') {
      img.src = fallbackMap[this.selected];
      img.dataset['fallback'] = '1';
    } else {
      (img as any).style.display = 'none';
    }
  }
  private cleanSymbol(symRaw: string): string {
    if (!symRaw) return '-';
    let s = String(symRaw).trim();
    s = s.replace(/^\^+/, '').replace(/\..*$/, '');
    return s;
  }
  private pickVolume(it: any): number | null {
    const v = it?.volume ?? it?.avgVolume ?? it?.volAvg ?? it?.averageVolume ?? it?.vol ?? null;
    return this.toNumOrNull(v);
  }
  private toNumOrNull(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  private handleHttpError(err: any, fallback: string) {
    if (err?.status === 503) { this.errorMsg = null; return; }
    this.errorMsg = err?.error?.message || err?.message || fallback;
  }
  private normalize(s: string): string {
    return (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();
  }
  private matchesQuery(r: ViewRow, q: string): boolean {
    if (!q) return true;
    const sym = this.normalize(r.symbol);
    const nam = this.normalize(r.name);
    return sym.includes(q) || nam.includes(q) || sym.startsWith(q) || nam.startsWith(q);
  }

  toggleRowActions(row: ViewRow, ev?: Event) {
    ev?.stopPropagation();
    this.activeNow = row.symbol;

    // usar SEMPRE o dropdown baseado em rowMenuOpen (desktop e mobile)
    const key = this.keyOf(row);
    if (this.rowMenuOpen.has(key)) {
      this.rowMenuOpen.delete(key);
    } else {
      this.rowMenuOpen.clear();
      this.rowMenuOpen.add(key);
    }
  }


  closeMobileMenu() { this.mobileOpenRow = null; }

  openAutomation(row: any) {
    this.selectedForAutomation = row;
    this.rowMenuOpen.clear();
    this.mobileOpenRow = null; // fecha bottom-sheet no mobile
  }

  isRowOpen(row: any): boolean { return this.rowMenuOpen.has(this.keyOf(row)); }

  // ===== Simulação (ticks) =====
  private buildPriorityIndex(dir: MarketDirection): Map<string, number> {
    const arr = (this.topSymbols[dir] || []).slice(0, 20);
    const map = new Map<string, number>();
    arr.forEach((sym, i) => map.set(sym.toUpperCase(), i));
    if (dir === 'stocks' && !map.has('BRK')) map.set('BRK', 6);
    return map;
  }

  /** Inicia/para timers para exatamente os símbolos visíveis na página atual */
  private syncSimTimersWithVisibleRows() {
    const visible = new Set(this.rows.map(r => r.symbol));

    // start para os novos visíveis
    for (const sym of visible) {
      if (!this.simTimers.has(sym)) this.scheduleNextTick(sym);
    }
    // stop para os que saíram da tela
    for (const sym of Array.from(this.simTimers.keys())) {
      if (!visible.has(sym)) {
        clearTimeout(this.simTimers.get(sym)!);
        this.simTimers.delete(sym);
      }
    }
  }

  /** Agenda o próximo tick com jitter 500–1000ms */
  private scheduleNextTick(sym: string) {
    const delay = 500 + Math.floor(Math.random() * 501); // 500–1000
    const id = window.setTimeout(() => this.tick(sym), delay);
    this.simTimers.set(sym, id);
  }

  /** Um passo de simulação: ±3% do baseline da API, recalculando a % por regra de 3 */
  private tick(sym: string) {
    // se o símbolo não estiver mais visível, encerrar
    const row = this.rows.find(r => r.symbol === sym);
    if (!row) { this.simTimers.delete(sym); return; }

    const base = this.baseBySymbol.get(sym);
    if (!base || base.change === null || !Number.isFinite(base.change)) {
      this.scheduleNextTick(sym);
      return;
    }

    // fator aleatório uniforme em [-0.03, +0.03]
    const factor = 1 + (Math.random() * 0.01 - 0.005);

    // novo change
    const newChange = this.round2(base.change * factor);

    // direção vs valor anterior renderizado
    const prev = row.change ?? base.change ?? 0;
    const dir: 'up' | 'down' | null = newChange > prev ? 'up' : (newChange < prev ? 'down' : null);

    row._tickDir = dir;
    row._prevChange = prev;
    row.change = newChange;

    // regra de 3 na %
    const k = (Math.abs(base.change) > 0) ? (newChange / base.change) : 0;
    const basePct = (this.baseBySymbol.get(sym)?.pct ?? 0);
    row.changesPercentage = this.round2(basePct * k);

    // remove o flash depois de ~300ms
    if (dir) {
      setTimeout(() => { if (row._tickDir === dir) row._tickDir = null; }, 300);
    }

    // reagendar enquanto continuar visível
    if (this.rows.some(r => r.symbol === sym)) this.scheduleNextTick(sym);
    else this.simTimers.delete(sym);
  }

  /** Finaliza todos os timers de simulação */
  private stopAllSimTimers() {
    for (const id of this.simTimers.values()) clearTimeout(id);
    this.simTimers.clear();
  }

  /** arredonda p/ 2 casas */
  private round2(x: number): number {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  private toApiCategory(dir: MarketDirection): MarketCategory {
    return (dir === 'indexes' ? 'indices' : dir) as MarketCategory;
  }
}
