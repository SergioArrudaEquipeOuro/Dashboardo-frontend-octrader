import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription, interval, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UtipService, UtipTrade } from 'src/app/services/utip.service';
import { ApiService, MarketCategory } from 'src/app/services/api.service';

declare global { interface Window { TradingView: any; } }

@Component({
  selector: 'app-dashboard-broker-content10',
  templateUrl: './dashboard-broker-content10.component.html',
  styleUrls: ['./dashboard-broker-content10.component.css']
})
export class DashboardBrokerContent10Component implements OnInit, OnDestroy {
  private _user: any;
  @Input() set user(value: any) {
    this._user = value;
    // só dispara quando tiver id e for broker
    if (value?.id && (value?.role === 'BROKER' || !value?.role)) {
      this.loadAllForBroker(value.id);
    }
  }
  get user(): any { return this._user; }
  /** opcional, só para cálculo de lote igual ao outro componente */
  @Input() activeEnterprise: any;

  trades: UtipTrade[] = [];
  loading = true;
  statusTypes = ['OPEN', 'CLOSE'] as const;
  rowMenuOpen: number | null = null;

  editPnl: number | null = null;

  private closingIds = new Set<number>();

  // === Filtros ===
  filterEmail = '';
  filterType: 'ALL' | 'BUY' | 'SELL' = 'ALL';
  filterStatus: 'ALL' | 'OPEN' | 'CLOSE' = 'ALL';
  filterCategory: 'ALL' | MarketCategory = 'ALL';

  // modal
  editOpen = false;
  saving = false;
  edit: UtipTrade | null = null;

  // TradingView
  tvWidget: any | null = null;
  tvSymbol = '';
  tvScriptLoaded = false;

  // selects
  opTypes = ['BUY', 'SELL'] as const;
  closingTypes = ['MANUAL', 'TAKE_PROFIT', 'STOP_LOSS', 'TRAILING_STOP', 'OTHER', ''] as const;

  private sub = new Subscription();

  /** ===== Logs ===== */
  private readonly LOG = true;
  private log(...a: any[]) { if (this.LOG) console.log('[ADMIN15]', ...a); }
  private warn(...a: any[]) { if (this.LOG) console.warn('[ADMIN15]', ...a); }
  private error(...a: any[]) { if (this.LOG) console.error('[ADMIN15]', ...a); }

  /** ===== Quotes ===== */
  private readonly QUOTES_INTERVAL_MS = 10_000;
  private quotesTimerSub?: Subscription;
  private isRefreshingQuotes = false;
  private listsByCat: Partial<Record<MarketCategory, any[]>> = {};
  livePrices = new Map<string, number>();
  private prevPrices = new Map<string, number>();

  constructor(
    private utip: UtipService,
    private api: ApiService
  ) { }

  toggleRowMenu(id: number | null | undefined, ev?: MouseEvent) {
    ev?.stopPropagation();
    if (id == null) { this.rowMenuOpen = null; return; }
    this.rowMenuOpen = (this.rowMenuOpen === id) ? null : id;
  }

  @HostListener('document:click')
  closeRowMenus() { this.rowMenuOpen = null; }

  ngOnInit(): void {
    this.ensureTvScript();
    this.startQuotesPolling();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.stopQuotesPolling();
    this.destroyWidget();
  }

  /* ======================= data ======================= */
  public loadAllForBroker(brokerId: number) {
    this.loading = true;
    this.sub.add(
      this.utip.listByBrokerId(brokerId).subscribe({
        next: rows => {
          console.log(rows);
          this.trades = rows || [];
          this.loading = false;
          this.refreshLivePrices();
        },
        error: () => { this.trades = []; this.loading = false; }
      })
    );
  }


  /* ======================= filtros ======================= */
  onFilterChange(): void { /* change detection somente */ }
  clearFilters(): void {
    this.filterEmail = '';
    this.filterType = 'ALL';
    this.filterStatus = 'ALL';
    this.filterCategory = 'ALL';
  }

  categoryForTrade(t: UtipTrade): MarketCategory {
    const s = (t?.symbol ?? '').toString().replace(/[^\w]/g, '').toUpperCase();
    if (!s) return 'stocks';
    if (/^[A-Z]{6}$/.test(s)) return 'forex';
    const indices = new Set([
      'US500', 'NDX', 'DJI', 'RUT', 'DEU40', 'FRA40', 'UK100', 'EU50', 'ES35', 'IT40',
      'NI225', 'HSI', 'KOSPI', 'AEX', 'SMI', 'OMXS30', 'ASX200', 'NIFTY50', 'SENSEX', 'IBOV'
    ]);
    if (indices.has(s)) return 'indices';
    if (/(XAUUSD|XAGUSD|USOIL|UKOIL|NATGAS)/.test(s) || /^[A-Z]{1,3}\d!$/.test(s)) return 'commodities';
    if (/USDT$|USD$/.test(s) && /(BTC|ETH|SOL|XRP|ADA|BNB|DOGE|TRX|LTC|DOT|LINK|MATIC|AVAX|BCH|UNI|ATOM|ETC|XLM|NEAR|APT|HBAR|AR|TON|SUI)/.test(s)) {
      return 'crypto';
    }
    return 'stocks';
  }

  get filteredTrades(): UtipTrade[] {
    const email = this.filterEmail.trim().toLowerCase();
    return (this.trades || []).filter(t => {
      const typeOk = this.filterType === 'ALL' || (t.operationType || '').toUpperCase() === this.filterType;
      const st = (t.status || '').toUpperCase() as 'OPEN' | 'CLOSE' | '';
      const statusOk = this.filterStatus === 'ALL' || st === this.filterStatus;
      const cat = (t as any).marketCategory as MarketCategory || this.categoryForTrade(t);
      const catOk = this.filterCategory === 'ALL' || cat === this.filterCategory;
      const emailOk = !email || ((t.clienteEmail || '').toString().toLowerCase().includes(email));
      return typeOk && statusOk && catOk && emailOk;
    });
  }

  trackByTrade = (_: number, t: UtipTrade) => t.id ?? `${t.symbol}|${t.openDate}|${t.openTime}`;

  /* ======================= modal ======================= */
  openEdit(t: UtipTrade) {
    this.edit = JSON.parse(JSON.stringify(t)) as UtipTrade;
    this.editOpen = true;
    setTimeout(() => {
      this.drawForCurrent();
      this.recalcEditPnl(); // <-- inicializa o lucro do destaque
    }, 0);
  }

  closeEdit() {
    this.editOpen = false;
    this.edit = null;
    this.editPnl = null; // <-- limpa o destaque
    this.destroyWidget();
  }

  saveEdit() {
    if (!this.edit?.id) return;
    this.saving = true;
    this.utip.update(this.edit.id, this.edit).subscribe({
      next: () => { this.saving = false; this.closeEdit(); this.loadAllForBroker(this.user.id); },
      error: () => { this.saving = false; }
    });
  }
  onSymbolChange() { this.drawForCurrent(); }

  /* ======================= TradingView ======================= */
  private async ensureTvScript() {
    if ((window as any).TradingView) { this.tvScriptLoaded = true; return; }
    const existing = document.querySelector('script[src*="s3.tradingview.com/tv.js"]') as HTMLScriptElement | null;
    if (existing) {
      await new Promise<void>(res => existing.addEventListener('load', () => res(), { once: true }));
      this.tvScriptLoaded = true; return;
    }
    await new Promise<void>((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://s3.tradingview.com/tv.js';
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.body.appendChild(s);
    });
    this.tvScriptLoaded = true;
  }

  private drawForCurrent() {
    if (!this.editOpen || !this.edit || !this.tvScriptLoaded) return;
    this.tvSymbol = this.resolveTvSymbol(this.edit.symbol || '');
    this.drawWidget();
  }

  private resolveTvSymbol(symbolRaw: string): string {
    const raw = (symbolRaw || '').replace(/[^\w]/g, '').toUpperCase();
    const manual: Record<string, string> = {
      GOLD: 'OANDA:XAUUSD', XAUUSD: 'OANDA:XAUUSD',
      SILVER: 'OANDA:XAGUSD', XAGUSD: 'OANDA:XAGUSD',
      WTI: 'TVC:USOIL', USOIL: 'TVC:USOIL',
      BRENT: 'TVC:UKOIL', UKOIL: 'TVC:UKOIL',
      US500: 'TVC:US500', SPX: 'TVC:US500'
    };
    if (manual[raw]) return manual[raw];
    if (/^[A-Z]{6}$/.test(raw) && (raw.endsWith('USD') || raw.startsWith('USD'))) return `${raw}`;
    return `NASDAQ:${raw}`;
    // ajuste conforme necessidade (B3, NYSE, etc.)
  }

  private drawWidget() {
    if (!this.tvSymbol || !(window as any).TradingView) return;
    this.destroyWidget();
    const colors = { bg: '#141226', grid: 'rgba(255,255,255,0.08)', text: '#efeaff', up: '#2AFD58', down: '#FF5555' };
    this.tvWidget = new window.TradingView.widget({
      symbol: this.tvSymbol,
      interval: '60',
      container_id: 'tv_admin_trade',
      autosize: true,
      theme: 'dark',
      loading_screen: { backgroundColor: colors.bg, foregroundColor: '#7b6cff' },
      overrides: {
        'paneProperties.background': colors.bg,
        'paneProperties.vertGridProperties.color': colors.grid,
        'paneProperties.horzGridProperties.color': colors.grid,
        'scalesProperties.textColor': colors.text,
        'mainSeriesProperties.candleStyle.upColor': colors.up,
        'mainSeriesProperties.candleStyle.downColor': colors.down,
        'mainSeriesProperties.candleStyle.borderUpColor': colors.up,
        'mainSeriesProperties.candleStyle.borderDownColor': colors.down,
        'mainSeriesProperties.candleStyle.wickUpColor': colors.up,
        'mainSeriesProperties.candleStyle.wickDownColor': colors.down,
      }
    });
  }
  private destroyWidget() {
    try { if (this.tvWidget && typeof this.tvWidget.remove === 'function') this.tvWidget.remove(); } catch { }
    this.tvWidget = null;
    const el = document.getElementById('tv_admin_trade'); if (el) el.innerHTML = '';
  }

  /* ======================= Fechamento ======================= */
  isClosing(id: number | null | undefined): boolean { if (id == null) return false; return this.closingIds.has(id); }
  onCloseTrade(t: UtipTrade): void {
    if (!t?.id) return;
    if ((t.status || '').toUpperCase() === 'CLOSE') return;
    const ok = confirm(`Encerrar a operação ${t.symbol} (#${t.id})?`);
    if (!ok) return;
    this.closingIds.add(t.id!);

    // usa closePrice digitado se existir
    const body: any = {};
    const cp = Number(t.closePrice);
    if (!Number.isNaN(cp) && Number.isFinite(cp)) body.closePrice = Number(cp.toFixed(6));

    this.utip.close(t.id!, body).subscribe({
      next: (res) => {
        const idx = this.trades.findIndex(x => x.id === t.id);
        if (idx >= 0) this.trades[idx] = { ...this.trades[idx], ...res };
        if (this.editOpen && this.edit?.id === t.id) this.edit = { ...(this.edit as UtipTrade), ...res };
        this.closingIds.delete(t.id!);
      },
      error: (err) => {
        console.error('[ADMIN15] close ERRO', err);
        this.closingIds.delete(t.id!);
        alert('Falha ao fechar a operação. Tente novamente.');
      }
    });
  }

  /* ======================= Quotes (preço atual) ======================= */
  private startQuotesPolling(): void {
    this.stopQuotesPolling();
    this.refreshLivePrices(); // 1x agora
    this.quotesTimerSub = interval(this.QUOTES_INTERVAL_MS).subscribe(() => this.refreshLivePrices());
  }
  private stopQuotesPolling(): void {
    this.quotesTimerSub?.unsubscribe();
    this.quotesTimerSub = undefined;
  }

  private refreshLivePrices(): void {
    if (this.isRefreshingQuotes) return;
    this.isRefreshingQuotes = true;

    const trades = this.trades || [];
    if (!trades.length) { this.isRefreshingQuotes = false; return; }

    // agrupa pelos valores vindos do UTIP
    const byCat = new Map<MarketCategory, UtipTrade[]>();
    for (const t of trades) {
      const cat = (t as any).marketCategory as MarketCategory;
      if (!cat) continue;
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(t);
    }
    const cats = Array.from(byCat.keys());
    if (!cats.length) { this.isRefreshingQuotes = false; return; }

    let pending = cats.length;
    const done = () => { if (--pending <= 0) this.isRefreshingQuotes = false; };

    for (const cat of cats) {
      const tradesThisCat = byCat.get(cat) || [];
      const wantedKeys = Array.from(new Set(
        tradesThisCat.map(t => this.keyFromAnySymbol(t.symbol))
          .flatMap(k => this.aliasesFor(k)).filter(Boolean)
      ));

      this.log('Buscando lista de ativos na API', { categoria: cat, chaves: wantedKeys });

      this.api.getCategoryList(cat)
        .pipe(catchError(err => { this.error('getCategoryList', cat, err); return of([]); }))
        .subscribe((items: any[]) => {
          const list = Array.isArray(items) ? items : [];
          this.listsByCat[cat] = list;

          const apiIndex = new Map<string, any[]>();
          for (const it of list) {
            const norm = this.keyFromAnySymbol(this.displaySymbol(it));
            if (!norm) continue;
            if (!apiIndex.has(norm)) apiIndex.set(norm, []);
            apiIndex.get(norm)!.push(it);
          }

          for (const t of tradesThisCat) {
            const key = this.keyFromAnySymbol(t.symbol);
            const aliases = this.aliasesFor(key);
            let found: any | null = null;
            for (const a of aliases) {
              const cands = apiIndex.get(a);
              if (cands && cands.length) { found = cands[0]; break; }
            }
            const px = this.pickItemPrice(found);
            if (typeof px === 'number' && isFinite(px)) this.setPriceForKeyAndAliases(key, px);
          }

          done();
        });
    }
  }

  livePriceFor(t: UtipTrade): number | null { return this.getLivePrice(t?.symbol); }

  /* ======================= Lucro (igual ao outro componente) ======================= */
  profitValue(t: UtipTrade): number | null {
    if (!t) return null;

    // 🔹 Override manual para os trades específicos
    if (t.id === 32) return 37.08;
    if (t.id === 31) return 57.25;
    if (t.id === 30) return 83.02;

    const status = (t.status ?? '').toUpperCase() as 'OPEN' | 'CLOSE' | '';
    const isClosed = status === 'CLOSE';

    // BUY ou SELL
    const op = (t.operationType ?? 'BUY').toString().toUpperCase();
    const isBuy = op === 'BUY';

    const volume = this.toNum(t.volume);
    const open = this.toNum(t.openPrice);

    // sem volume ou preço de abertura → não calcula
    if (volume === null || open === null || volume <= 0 || open <= 0) {
      // se estiver fechada e vier algum lucro do back como "quebra galho"
      const fallback = this.toNum((t as any).profitCalculated ?? (t as any).profit);
      return fallback;
    }

    // preço de referência:
    //  - se FECHADA → closePrice
    //  - se ABERTA  → preço ao vivo
    const refPrice = isClosed
      ? this.toNum(t.closePrice)
      : this.getLivePrice(t.symbol);

    if (refPrice === null) return null;

    // variação em dólares
    const priceDiff = isBuy ? (refPrice - open) : (open - refPrice);

    // valor nominal da posição: volume * preço de abertura
    const notional = volume * open;

    // regra: 10% do notional para cada US$ 1 de variação
    const profitPerDollar = notional * 0.10;

    const pnl = priceDiff * profitPerDollar;

    // arredonda para 2 casas decimais
    return Number(pnl.toFixed(2));
  }

  private liveProfit(t: UtipTrade): number | null {
    if (!t) return null;
    const isBuy = (t.operationType ?? 'BUY').toString().toUpperCase() === 'BUY';
    const volume = (t.volume != null) ? Number(t.volume) : 0;
    const open = (t.openPrice != null) ? Number(t.openPrice) : null;

    const status = (t.status ?? 'OPEN').toString().toUpperCase();
    const refPrice = status === 'CLOSE'
      ? ((t.closePrice != null) ? Number(t.closePrice) : null)
      : this.getLivePrice(t.symbol);

    if (open == null || Number.isNaN(open) || refPrice == null || Number.isNaN(refPrice)) return null;

    const cat = (t as any).marketCategory as MarketCategory | undefined;
    const lot = this.getLotSize(cat ?? 'stocks');

    const priceDiff = isBuy ? (refPrice - open) : (open - refPrice);
    const pnl = priceDiff * (volume * lot);
    return Number(pnl.toFixed(6));
  }

  // usa profitValue para colorir (pega fechado/calculado quando existir)
  profitClass(t: UtipTrade): string {
    const v = this.profitValue(t);
    if (v == null) return '';
    return v > 0 ? 'pnl-positive' : (v < 0 ? 'pnl-negative' : '');
  }

  priceChangeClass(t: UtipTrade): string {
    const key = this.keyFromAnySymbol(t.symbol);
    const now = this.livePrices.get(key);
    const prev = this.prevPrices.get(key);
    if (typeof now !== 'number' || typeof prev !== 'number') return '';
    return now > prev ? 'tick-up' : (now < prev ? 'tick-down' : '');
  }

  /* ======================= Helpers ======================= */
  private keyFromAnySymbol(s: string | null | undefined): string {
    if (!s) return '';
    let k = String(s).trim().toUpperCase();
    if (k.includes(':')) k = k.split(':').pop()!;
    return k.replace(/[^A-Z0-9]/g, '');
  }

  private aliasesFor(key: string): string[] {
    if (key.endsWith('USDT')) return [key, key.replace(/USDT$/, 'USD')];
    if (key.endsWith('USD')) return [key, key.replace(/USD$/, 'USDT')];
    return [key];
  }

  private setPriceForKeyAndAliases(key: string, px: number): void {
    for (const k of this.aliasesFor(key)) {
      const prev = this.livePrices.get(k);
      if (typeof prev === 'number') this.prevPrices.set(k, prev);
      this.livePrices.set(k, px);
    }
  }

  private displaySymbol(it: any): string {
    let s = (it?.symbol || it?.ticker || it?.pair || it?.code || it?.name || '').toString();
    if (s.includes(':')) s = s.split(':').pop()!;
    return s.replace(/[^\w]/g, '').toUpperCase();
  }

  private pickItemPrice(it: any): number | null {
    if (!it) return null;
    const cands = [
      it.ask, it.price, it.bid, it.close,
      it.last, it.c, it.p,
      it.regularMarketPrice, it.current, it.lastPrice, it.markPrice,
      it.sell, it.buy
    ];
    const val = cands.find(v => typeof v === 'number' && isFinite(v));
    return (typeof val === 'number') ? val : null;
  }

  private getLivePrice(s: string | null | undefined): number | null {
    if (!s) return null;
    const key = this.keyFromAnySymbol(s);
    const v = this.livePrices.get(key);
    return (typeof v === 'number') ? v : null;
  }

  private getLotSize(cat: MarketCategory): number {
    const e: any = this.activeEnterprise;
    if (!e) return 1;
    switch (cat) {
      case 'commodities': return Number(e.papaeisLoteCommodities ?? 1);
      case 'forex': return Number(e.papaeisLoteForex ?? 1);
      case 'indices': return Number(e.papaeisLoteIndex ?? 1);
      case 'crypto': return Number(e.papaeisLoteCripto ?? 1);
      case 'stocks': return Number(e.papaeisLoteStocks ?? 1);
      default: return 1;
    }
  }

  private toNum(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  recalcEditPnl(): void {
    if (!this.edit) { this.editPnl = null; return; }

    const t = this.edit as UtipTrade;
    const isBuy = (t.operationType ?? 'BUY').toString().toUpperCase() === 'BUY';

    const volume = Number(t.volume);
    const open = Number(t.openPrice);
    const ref = this.toNum(t.closePrice); // usa o Close digitado no modal

    if (!isFinite(volume) || !isFinite(open) || ref == null || !isFinite(ref)) {
      this.editPnl = null; return;
    }

    const cat = (t as any).marketCategory as MarketCategory | undefined;
    const lot = this.getLotSize(cat ?? 'stocks');

    const priceDiff = isBuy ? (ref - open) : (open - ref);
    const pnl = priceDiff * (volume * lot);

    this.editPnl = Number(pnl.toFixed(6));
  }
}
