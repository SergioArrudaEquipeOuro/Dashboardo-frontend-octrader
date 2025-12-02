import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  HostListener,
  ChangeDetectorRef,
  NgZone,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { ApiService, MarketCategory, IntradayInterval } from 'src/app/services/api.service';
import { Subscription, of, interval, forkJoin } from 'rxjs';
import { catchError, finalize, retry, timeout } from 'rxjs/operators';
import { UtipService, UtipTrade } from 'src/app/services/utip.service';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { UserService } from 'src/app/services/user.service';

declare const bootstrap: any;

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type MarketDirection = 'forex' | 'indexes' | 'commodities' | 'crypto' | 'stocks';
interface DirectionIcon { value: MarketDirection; label: string }

type ChartInterval = | IntradayInterval | '1h' | '4h' | '1d' | '1wk' | '1mo'

type ChartTab = {
  id: string;
  symbol: string;
  category: MarketCategory;
};

type AssetFilterDirection = 'all' | MarketCategory;

type AssetCategory = 'FOREX' | 'INDICES' | 'COMMODITIES' | 'CRYPTO' | 'STOCKS';

export interface Asset {
  id?: number | string;
  symbol: string;
  nome?: string;
  name?: string;
  category: AssetCategory;
}

@Component({
  selector: 'app-homebroker',
  templateUrl: './homebroker.component.html',
  styleUrls: ['./homebroker.component.css']
})
export class HomebrokerComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() user: any;
  orderOptions: any[] = [];
  private drawPending = false;
  private brokenLogos = new Set<string>();
  tpPriceRaw: string = '';
  balanceDropdownOpen = false;
  selectedBalanceType: 'real' | 'demo' = 'real';
  tpPnl: number = 0;

  private readonly volumeStep = 0.01;

  public tradesVersion = 0;

  private listRetryId = 0;                // token para cancelar tentativas antigas
  private listRetryHandle: any = null;    // timer do setTimeout
  private listReqSub?: Subscription;      // assinatura da chamada atual
  public pricesVersion = 0;

  private listPollingSub?: Subscription;
  private chartPollingSub?: Subscription;
  private isRefreshingList = false;

  assetsLoading = false;
  assets: any[] = [];
  lockCountdown = 0;
  private lockTimer?: any;

  // ===== Watchlist (curadoria + fixados) =====
  readonly WATCH_MAX = 20;
  addModalOpen = false;
  modalSearch = '';
  modalCandidates: any[] = [];

  // ===== Abas de gráfico =====
  chartTabs: ChartTab[] = [];
  activeTabId: string | null = null;

  // modal de seleção de ativo p/ nova aba
  chartTabAssetsModalOpen = false;
  allAssetsForTabs: Array<{ item: any; category: MarketCategory }> = [];
  filteredAssetsForTabs: { item: any; category: AssetCategory }[] = [];
  assetFilterDirection: AssetFilterDirection = 'all';
  assetSearchTerm = '';

  // vindo do backend / service
  allAssets: Asset[] = [];

  filteredAssets: Asset[] = [];

  // exibidos na lista

  // categoria atual do menu lateral
  activeCategory: 'ALL' | AssetCategory = 'ALL';

  // termo do input
  searchTerm = '';


  /** Ativos já selecionados (abas) */
  @Input() selectedAssets: Asset[] = [];

  /** Emite o ativo selecionado para o componente pai */
  @Output() assetSelected = new EventEmitter<Asset>();
  currentAsset: Asset | null = null;


  popularSymbols: Record<'ALL' | AssetCategory, string[]> = {
    ALL: [],       // preenchido depois em buildAllPopular()
    FOREX: [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'AUDUSD',
      'NZDUSD', 'USDCHF', 'EURJPY', 'EURGBP', 'EURCHF'
    ],
    INDICES: [
      'US500', 'NDX', 'DJI', 'RUT', 'DEU40', 'FRA40',
      'UK100', 'EU50', 'ES35', 'IT40', 'NI225', 'HSI',
      'KOSPI', 'AEX', 'SMI', 'OMXS30', 'ASX200',
      'NIFTY50', 'SENSEX', 'IBOV'
    ],
    COMMODITIES: [
      'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NATGAS',
      'GC1', 'SI1', 'CL1', 'NG1', 'HG1', 'PL1', 'PA1',
      'HO1', 'RB1', 'ZC1', 'ZW1', 'ZS1', 'ZM1', 'ZL1',
      'ZO1', 'KC1', 'SB1', 'CC1', 'CT1',
    ],
    CRYPTO: [
      'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD',
      'ADAUSD', 'DOGEUSD', 'TONUSD', 'LTCUSD', 'AVAXUSD'
    ],
    STOCKS: [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
      'TSLA', 'NFLX', 'NVDA', 'JPM', 'BRK.B'
    ]
  };



  readonly directions: DirectionIcon[] = [
    { value: 'forex', label: 'assets/img/forex.png' },
    { value: 'indexes', label: 'assets/img/index.png' },
    { value: 'commodities', label: 'assets/img/commodities.png' },
    { value: 'crypto', label: 'assets/img/cripto.png' },
    { value: 'stocks', label: 'assets/img/stocks.png' },
  ];


  // cache leve de extras por categoria
  private extrasCache: Partial<Record<MarketCategory, string[]>> = {};

  // localStorage key por categoria
  private extrasKey(cat: MarketCategory) { return `hb_watch_extras_${cat}`; }


  // último bucket vindo da API (para sabermos quando sincronizar de novo)
  private lastBucketFromHistory = 0;

  // debounced p/ não martelar a API quando virar vela
  private syncHistoryDebounced = this.debounce(
    () => this.loadHistoryForSelected(500, { showSpinner: false }),
    400
  );

  private bumpTradesVersion() {
    this.tradesVersion++;
    this.cdr.markForCheck();
  }


  /* ====== Watchlist / categorias ====== */

  categories: MarketCategory[] = ['forex', 'indices', 'commodities', 'crypto', 'stocks'];
  operationTypeFilter: 'ALL' | 'BUY' | 'SELL' = 'ALL';
  page = 1;
  pageSize = 4;
  loadingTrades = true;

  selectedCategory: MarketCategory = 'stocks';
  activeEnterprise: any | null = null;

  private chartPadding = { left: 14, right: 90, top: 8, bottom: 22 };


  all: Partial<Record<MarketCategory, any[]>> = {};
  list: any[] = [];
  filtered: any[] = [];
  selected: any | null = null;
  watchlistOpen = true;

  loadingChart = true;
  loadingList = true;

  /* ====== Estado de preços e polling ====== */
  livePrices = new Map<string, number>();
  private isRefreshingQuotes = false;
  private quotesTimerSub?: Subscription;
  private priceRefreshSub?: Subscription;
  private histSub?: Subscription;
  private sub = new Subscription();

  /* ====== UI de ticks (mudança de cor na watchlist) ====== */
  lastPrices = new Map<string, number>();

  /* ====== Trades / UTIP ====== */
  trades: UtipTrade[] = [];
  savingOrder = false;
  clienteEmail = localStorage.getItem('clienteEmail') || '';
  private closingIds = new Set<number>();

  order = {
    open: false,
    side: 'BUY' as 'BUY' | 'SELL',
    symbol: '',
    volume: 0.10,
    warnNotEnough: false,

    // compat (sem uso no UI)
    pendingOpen: false,
    pendingPrice: null as number | null,

    // TP/SL sempre editáveis
    tpPrice: null as number | null,
    slPrice: null as number | null,

    // preço live (para etiqueta inferior)
    marketPrice: null as number | null,

    // 🔒 preço travado exibido no input
    lockedPrice: null as number | null,
  };

  // 🔹 desenhos novos
  hLines: number[] = [];  // preços
  vLines: number[] = [];  // timestamps (ms)
  rays: Array<{ t1: number; p1: number; t2: number; p2: number }> = [];
  dpMeasures: Array<{ t1: number; p1: number; t2: number; p2: number }> = [];
  positions: Array<{ kind: 'long' | 'short'; t: number; entry: number; stop: number; target: number }> = [];

  // 🔹 temporários para preview
  private tmpRayStart: { t: number; p: number } | null = null;
  private tmpDpStart: { t: number; p: number } | null = null;
  private tmpPosDraft: { kind: 'long' | 'short'; t: number; entry: number; stop?: number; target?: number } | null = null;

  // largura (em velas) para desenhar a Posição Long/Short
  private readonly posWidthBars = 20;




  /* ==== Ferramentas / interação ==== */
  activeTool: 'cursor' | 'trend' | 'range' | 'dprange' | 'hline' | 'vline' | 'ray' | 'long' | 'short' = 'cursor';
  private candlesOnScreen = 0;
  private panOffset = 0;
  private isPanning = false;
  private dragLastX = 0;

  private mouseInside = false;
  private mouseX = 0;
  private mouseY = 0;
  private hoverIndex: number | null = null;

  /* ==== Desenho de linhas ==== */
  private tmpLineStart: { t: number; p: number } | null = null;
  lines: Array<{ t1: number; p1: number; t2: number; p2: number }> = [];

  /* ==== Intervalo de Preços ==== */
  private tmpRangeStart: { t: number; p: number } | null = null;
  ranges: Array<{ t1: number; p1: number; t2: number; p2: number }> = [];

  /* ==== caches da última renderização ==== */
  private lastRect: { left: number; right: number; top: number; bottom: number; w: number; h: number } | null = null;
  private lastMin = 0;
  private lastMax = 1;
  private lastStart = 0;
  private lastCount = 0;
  private lastXStep = 6;

  /* listeners para remover no destroy */
  private canvasListeners: {
    wheel?: (e: WheelEvent) => void;
    move?: (e: MouseEvent) => void;
    down?: (e: MouseEvent) => void;
    up?: (e: MouseEvent) => void;
    leave?: (e: MouseEvent) => void;
  } = {};

  /* ====== Gráfico (Canvas) + histórico ====== */
  @ViewChild('chartCanvas', { static: false }) chartCanvas?: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private chartReady = false;

  private readonly STORAGE_KEY = 'hb2_state_v1';
  private pendingSelectSymbol: string | null = null;

  // opcional: para salvar o estado sem “martelar” o localStorage
  private saveStateDebounced = this.debounce(() => this.saveState(), 250);

  // opções de timeframe mostradas como botões
  timeframeOptions: Array<{ key: ChartInterval; label: string; ms: number }> = [
    { key: '1min', label: '1m', ms: 60_000 },
    { key: '5min', label: '5m', ms: 5 * 60_000 },
    { key: '15min', label: '15m', ms: 15 * 60_000 },
    { key: '30min', label: '30m', ms: 30 * 60_000 }
  ];



  candles: Candle[] = [];

  // timeframe atual (default 1m)
  currentInterval: ChartInterval = '1min';
  intervalLabel = '1m';
  private candleMs = 60_000; // ~3h em 1m (apenas limite local para desenhar)

  /* ====== Labels ====== */
  get currentTabLabel(): string {
    if (!this.selected) return '';
    return `${this.displaySymbol(this.selected)} ${this.intervalLabel}`; // sem .toUpperCase()
  }

  get assetLabel(): string {
    const sym = this.order.symbol || (this.selected ? this.displaySymbol(this.selected) : '');
    const nm = this.selected ? this.displayName(this.selected) : '';
    return sym ? `${sym} — ${nm}` : nm;
  }

  /* Destaques por categoria (ranking na watchlist) */
  private featuredByCat: Record<MarketCategory, string[]> = {
    forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURJPY', 'EURGBP', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD', 'GBPJPY', 'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD', 'AUDJPY', 'CADJPY', 'CHFJPY', 'AUDCAD', 'AUDNZD', 'NZDJPY', 'USDCNH', 'USDTRY', 'USDMXN', 'USDZAR', 'USDNOK', 'USDSEK', 'XAUUSD', 'XAGUSD'],
    crypto: ['BTCUSD', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'TRXUSDT', 'TONUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT', 'DOTUSDT', 'SHIBUSDT', 'LTCUSDT', 'BCHUSDT', 'NEARUSDT', 'ATOMUSDT', 'UNIUSDT', 'XLMUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT', 'HBARUSDT', 'PEPEUSDT', 'ETCUSDT'],
    indices: ['US500', 'NDX', 'DJI', 'RUT', 'DEU40', 'FRA40', 'UK100', 'EU50', 'ES35', 'IT40', 'NI225', 'HSI', 'KOSPI', 'AEX', 'SMI', 'OMXS30', 'ASX200', 'NIFTY50', 'SENSEX', 'IBOV'],
    commodities: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NATGAS', 'GC1', 'SI1', 'CL1', 'NG1', 'HG1', 'PL1', 'PA1', 'HO1', 'RB1', 'ZC1', 'ZW1', 'ZS1', 'ZM1', 'ZL1', 'ZO1', 'KC1', 'SB1', 'CC1', 'CT1'],
    stocks: ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA', 'AVGO', 'COST', 'PEP', 'NFLX', 'AMD', 'INTC', 'ADI', 'QCOM', 'AMAT', 'ASML', 'CSCO', 'PYPL', 'MRVL', 'SNOW', 'CRWD', 'ADBE', 'BKNG'],
  };

  private cryptoMajors = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'TRX', 'LTC', 'DOT', 'LINK', 'MATIC', 'AVAX', 'BCH', 'UNI', 'ATOM', 'ETC', 'XLM', 'NEAR', 'APT', 'HBAR', 'AR', 'TON', 'SUI'];

  constructor(
    private api: ApiService,
    private el: ElementRef,
    private utip: UtipService,
    private enterpriseService: EnterpriseService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.getUsuarioByToken();
    this.restoreState();

    const keepSel = !!this.pendingSelectSymbol;
    this.loadCategory(this.selectedCategory, { keepSelection: keepSel });

    this.loadTrades();
    this.getActiveEnterprise();

    // antes: this.startQuotesPolling(30_000);
    this.startQuotesPolling(10_000);   // ⏱️ 10s cotações
    this.startListPolling(10_000);     // ⏱️ 10s watchlist (lista)
    this.startChartPolling(10_000);    // ⏱️ 10s gráfico (histórico)


    this.buildAllPopular();
    this.applyPopularFilter();

    this.loadAllAssets();
    console.log(`HOMEBROKER - EMAIL USUARIO: ${this.clienteEmail}`)
  }

private buildAllPopular() {
  this.popularSymbols.ALL = [
    ...this.popularSymbols.FOREX,
    ...this.popularSymbols.INDICES,
    ...this.popularSymbols.COMMODITIES,
    ...this.popularSymbols.CRYPTO,
    ...this.popularSymbols.STOCKS
  ];
}

  onCategoryClick(cat: 'ALL' | AssetCategory) {
    this.activeCategory = cat;
    this.searchTerm = '';
    this.applyPopularFilter();
  }

  /** Digitação no input de busca */
  onSearchChange(term: string) {
    this.searchTerm = term;

    const t = term.trim().toLowerCase();
    if (!t) {
      // sem texto → volta para lista de mais famosos (poucos ativos)
      this.applyPopularFilter();
      return;
    }

    // filtra e limita a 10 resultados
    this.filteredAssets = this.allAssets
      .filter(a =>
        (a.symbol || '').toLowerCase().includes(t) ||
        ((a.name || '').toLowerCase().includes(t))
      )
      .slice(0, 10);
    // 👈 aqui garante no máximo 10
  }

  private assetCategoryToMarket(cat: AssetCategory): MarketCategory {
    switch (cat) {
      case 'FOREX': return 'forex';
      case 'INDICES': return 'indices';
      case 'COMMODITIES': return 'commodities';
      case 'CRYPTO': return 'crypto';
      case 'STOCKS': return 'stocks';
      default: return 'stocks';
    }
  }

  openAssetInNewChartTab(
    symbol: string,
    name: string,
    category: AssetCategory
  ): void {
    if (!symbol || !category) {
      return;
    }

    // Converte categoria do ativo para o tipo usado nas abas/gráfico
    const cat = this.assetCategoryToMarket(category);
    const sym = symbol;

    // tenta achar aba existente com mesmo símbolo + categoria
    let tab = this.chartTabs.find(t => t.symbol === sym && t.category === cat);

    // se não existe, cria uma nova
    if (!tab) {
      tab = {
        id: this.makeTabId(sym, cat),
        symbol: sym,
        category: cat
        // se suas tabs tiverem "name", pode adicionar:
        // name
      };
      this.chartTabs.push(tab);
    }

    // ativa a aba (carrega categoria, seleciona ativo e desenha o gráfico)
    this.activateTab(tab);
  }



  /** Aplica regra: All = 50 “top”, categoria = 20 “top” */
  private applyPopularFilter() {
    const key = this.activeCategory;
    const symbols = this.popularSymbols[key] || [];

    this.filteredAssets = this.allAssets
      .filter(a => {
        if (key === 'ALL') {
          return symbols.includes(a.symbol);
        }
        return a.category === key && symbols.includes(a.symbol);
      })
      .sort((a, b) =>
        symbols.indexOf(a.symbol) - symbols.indexOf(b.symbol)
      );
  }


  // Limita o buffer proporcional ao zoom atual (mín 1200)
  private get maxCandles(): number {
    const onScreen = Math.max(10, this.candlesOnScreen || 120);
    return Math.max(1200, onScreen * 8);
  }



  ngAfterViewInit(): void {
    this.initCanvas();
    if (this.selected) this.loadHistoryForSelected(500, { showSpinner: true });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.listReqSub?.unsubscribe();
    this.priceRefreshSub?.unsubscribe();
    this.histSub?.unsubscribe();
    this.stopQuotesPolling();
    this.stopListPolling();
    this.stopChartPolling()

    if (this.chartCanvas) {
      const c = this.chartCanvas.nativeElement;
      if (this.canvasListeners.wheel) c.removeEventListener('wheel', this.canvasListeners.wheel);
      if (this.canvasListeners.move) c.removeEventListener('mousemove', this.canvasListeners.move);
      if (this.canvasListeners.down) c.removeEventListener('mousedown', this.canvasListeners.down);
      if (this.canvasListeners.leave) c.removeEventListener('mouseleave', this.canvasListeners.leave);
      if (this.canvasListeners.up) window.removeEventListener('mouseup', this.canvasListeners.up);
    }
    this.clearLockCountdown();
  }

  /* ===== Utils Data/Hora ===== */
  private fmtDate(d = new Date()) {
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  private fmtTime(d = new Date()) {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const ss = d.getSeconds().toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  loadCategory(cat: MarketCategory, opts?: { silent?: boolean; keepSelection?: boolean }) {
    const silent = !!opts?.silent;
    const keepSelection = !!opts?.keepSelection;

    if (!silent) this.loadingList = true;

    const token = ++this.listRetryId;
    clearTimeout(this.listRetryHandle);
    this.listReqSub?.unsubscribe();
    this.listRetryHandle = null;
    this.listReqSub = undefined;

    const applyFromApi = (apiItems: any[]) => {
      // mantém o raw para quotes/histórico
      this.all[cat] = apiItems || [];

      // monta a lista CURADA (base + extras) a partir do retorno da API
      this.list = this.buildWatchlistFromApi(cat, this.all[cat] || []);

      // aplica filtro visual (mantendo ordem da lista)
      this.applyFilters(!keepSelection);

      // selecionar símbolo pendente (se houver)
      if (this.pendingSelectSymbol) {
        const key = this.keyFromAnySymbol(this.pendingSelectSymbol);
        const found = this.list.find(x => this.keyFromAnySymbol(this.displaySymbol(x)) === key);
        if (found) {
          this.selected = found;
          this.order.symbol = this.displaySymbol(found);
          this.loadHistoryForSelected(500, { showSpinner: true });
          this.saveState();
        }
        this.pendingSelectSymbol = null;
      }
    };

    // se já temos cache bruto da categoria, aplica imediatamente
    const cachedRaw = this.all[cat];
    if (Array.isArray(cachedRaw) && cachedRaw.length > 0) {
      applyFromApi(cachedRaw);
      if (!silent) this.loadingList = false;
    }

    // backoff exponencial com jitter
    const base = 500, maxDelay = 30000;
    const nextDelay = (attempt: number) =>
      Math.min(maxDelay, Math.pow(2, Math.max(0, attempt - 1)) * base + Math.floor(Math.random() * 400));

    const attemptFetch = (attempt: number) => {
      if (token !== this.listRetryId) return;

      this.listReqSub?.unsubscribe();
      this.listReqSub = this.api.getCategoryList(cat)
        .pipe(timeout(12_000), catchError(() => of(null)))
        .subscribe({
          next: (apiItems: any) => {
            if (token !== this.listRetryId) return;

            if (Array.isArray(apiItems) && apiItems.length > 0) {
              applyFromApi(apiItems);
              if (!silent) this.loadingList = false;
              clearTimeout(this.listRetryHandle);
              this.listRetryHandle = null;
              this.listReqSub = undefined;
              return;
            }
            const delay = nextDelay(attempt);
            this.listRetryHandle = setTimeout(() => attemptFetch(attempt + 1), delay);
          },
          error: () => {
            if (token !== this.listRetryId) return;
            const delay = nextDelay(attempt);
            this.listRetryHandle = setTimeout(() => attemptFetch(attempt + 1), delay);
          }
        });
    };

    attemptFetch(1);
  }




  onCategoryChange() {
    this.saveState(); // grava a nova categoria
    this.loadCategory(this.selectedCategory, { keepSelection: false });
  }


  applyFilters(reset = false) {
    const t = (this.searchTerm || '').trim().toLowerCase();

    if (!t) {
      this.filtered = [...(this.list || [])]; // mantém ORDEM já definida (base depois extras)
    } else {
      this.filtered = (this.list || []).filter(it => {
        const sym = this.displaySymbol(it).toLowerCase();
        const name = (this.displayName(it) || '').toLowerCase();
        return sym.includes(t) || name.includes(t);
      });
    }

    const currentSym = this.selected ? this.displaySymbol(this.selected) : null;
    if (currentSym) {
      const stillThere = this.filtered.find(x => this.displaySymbol(x) === currentSym);
      if (!stillThere) {
        // se símbolo atual sumiu do filtro, não troca seleção (só ao reset)
      }
    } else if (reset && this.filtered[0]) {
      this.selectItem(this.filtered[0], true);
    }

    if (this.order.open) this.buildOrderOptions();
  }




  /** Ranking de match para busca: 0 (melhor) → 9 (sem match) */
  private rankByQuery(q: string, symL: string, nameL: string): number {
    if (q === symL) return 0; // símbolo exato
    if (q === nameL) return 1; // nome exato
    if (symL.startsWith(q)) return 2; // símbolo começa com
    if (nameL.startsWith(q)) return 3; // nome começa com
    if (symL.includes(q)) return 4; // símbolo contém
    if (nameL.includes(q)) return 5; // nome contém
    return 9; // sem match
  }

  public urlSymbol(symbol: string): string {
    const base = (symbol || '').trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }


  private rankFeatured(feats: string[], cat: MarketCategory, it: any): number {
    const key = this.compareKeyFor(cat, it);
    const idx = feats.indexOf(key);
    return idx === -1 ? 999 : idx;
  }
  private compareKeyFor(cat: MarketCategory, it: any): string {
    const sym = this.displaySymbol(it);
    if (cat === 'crypto') {
      const base = this.extractMajorFrom(sym) ?? sym.replace(/USDT|USD/, '');
      return this.norm(base + 'USDT');
    }
    if (cat === 'commodities' && /^[A-Z]{1,3}\d!$/.test(sym)) return this.norm(sym);
    return this.norm(sym);
  }
  private norm = (s: string) => s.replace(/[^\w]/g, '').toUpperCase();

  trackBySymbol = (_: number, it: any) => this.displaySymbol(it);

  displaySymbol(it: any): string {
    return (it?.symbol || it?.ticker || it?.pair || it?.code || it?.name || '')
      .toString().replace(/[^\w]/g, '').toUpperCase();
  }

  displayName(it: any): string {
    return (it?.name || it?.companyName || it?.description || it?.symbol || it?.ticker || '').toString();
  }

  isSelected(it: any) { return this.selected && this.displaySymbol(this.selected) === this.displaySymbol(it); }

  selectItem(it: any, silent = false) {
    if (!it) return;

    const symBefore = this.order.symbol;

    // seleciona item da watchlist
    this.selected = it;
    this.order.symbol = this.displaySymbol(it);

    if (!silent) {
      this.flashTick(it);
    }

    // se mudou o símbolo, recarrega candles
    if (this.order.symbol !== symBefore) {
      this.setTimeframe(this.currentInterval, true);
    }

    this.saveState();

    // 👇 NOVO: apenas atualiza a aba ativa (se existir),
    //          em vez de criar uma nova aba
    const activeTab = this.chartTabs.find(t => t.id === this.activeTabId);
    if (activeTab) {
      activeTab.symbol = this.order.symbol;
      activeTab.category = this.selectedCategory;
      this.saveStateDebounced();
    }
  }




  private activateTab(tab: ChartTab) {
    this.activeTabId = tab.id;
    this.selectedCategory = tab.category;
    this.pendingSelectSymbol = tab.symbol;
    this.saveStateDebounced();
    // vai carregar a categoria correta e, por causa do pendingSelectSymbol,
    // selecionar o ativo e desenhar o gráfico
    this.loadCategory(tab.category, { keepSelection: false });
  }

  onClickChartTab(tab: ChartTab) {
    this.activateTab(tab);
  }

  openChartTabAssetsModal() {
    this.assetsLoading = true;
    this.chartTabAssetsModalOpen = true;
    this.assetFilterDirection = 'all';
    this.assetSearchTerm = '';

    if (this.allAssetsForTabs.length) {
      this.applyAssetFiltersForTabs();

    } else {
      this.fetchAllAssetsForTabs();
    }

    // 👇 aqui é o que realmente abre o modal de id="assetsModal"
    const modalEl = document.getElementById('assetsModal');
    if (modalEl) {
      const instance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      instance.show();
    }
  }


  closeChartTabAssetsModal() {
    this.chartTabAssetsModalOpen = false;
  }

  setAssetFilterDirection(dir: AssetFilterDirection) {
    this.assetFilterDirection = dir;
    this.applyAssetFiltersForTabs();
  }

  private fetchAllAssetsForTabs() {
    this.assetsLoading = true;

    const cats: MarketCategory[] = ['forex', 'indices', 'commodities', 'crypto', 'stocks'];

    const reqs = cats.map(cat =>
      this.api.getCategoryList(cat).pipe(
        timeout(12_000),
        catchError(() => of([]))
      )
    );

    forkJoin(reqs)
      .pipe(finalize(() => (this.assetsLoading = false)))
      .subscribe((res: any[][]) => {
        const out: Array<{ item: any; category: MarketCategory }> = [];
        cats.forEach((cat, idx) => {
          (res[idx] || []).forEach(it => out.push({ item: it, category: cat }));
        });
        this.allAssetsForTabs = out;
        this.applyAssetFiltersForTabs();
      });
  }


  applyAssetFiltersForTabs() {
    const q = (this.assetSearchTerm || '').trim().toLowerCase();
    const dir = this.assetFilterDirection; // 'all' | MarketCategory
    const LIMIT = 20;

    // 1) filtra por direção (ALL ou categoria) + texto (quando existir)
    let base = this.allAssetsForTabs.filter(row => {
      // filtra pela direção/mercado
      if (dir !== 'all' && row.category !== dir) return false;

      // sem termo de busca → por enquanto deixa passar, vamos tratar depois
      if (!q) return true;

      const sym = this.displaySymbol(row.item).toLowerCase();
      const name = (this.displayName(row.item) || '').toLowerCase();
      return sym.includes(q) || name.includes(q);
    });

    // 2) Se NÃO tiver busca (campo vazio), mostramos só os "mais famosos"
    if (!q) {
      if (dir === 'all') {
        // usa a lista agregada que você já montou em buildAllPopular()
        const popular = this.popularSymbols.ALL || [];
        const set = new Set(popular);

        base = base
          .filter(row => set.has(this.displaySymbol(row.item)))
          .sort((a, b) => {
            const sa = this.displaySymbol(a.item);
            const sb = this.displaySymbol(b.item);
            return popular.indexOf(sa) - popular.indexOf(sb);
          });
      } else {
        // categoria específica: FOREX, INDICES, etc.
        const key = dir.toUpperCase() as AssetCategory;
        const popular = this.popularSymbols[key] || [];
        const set = new Set(popular);

        base = base
          .filter(row => set.has(this.displaySymbol(row.item)))
          .sort((a, b) => {
            const sa = this.displaySymbol(a.item);
            const sb = this.displaySymbol(b.item);
            return popular.indexOf(sa) - popular.indexOf(sb);
          });
      }

      // garante no máximo 20 itens
      base = base.slice(0, LIMIT);
    } else {
      // 3) Com busca: rankeia por relevância e corta em 20
      base = base
        .map(row => {
          const symL = this.displaySymbol(row.item).toLowerCase();
          const nameL = (this.displayName(row.item) || '').toLowerCase();
          return {
            row,
            rank: this.rankByQuery(q, symL, nameL), // você já tem esse método pronto
          };
        })
        .sort((a, b) => a.rank - b.rank)
        .map(x => x.row)
        .slice(0, LIMIT);
    }

    // 4) Converte MarketCategory ('forex') -> AssetCategory ('FOREX') para o HTML
    this.filteredAssetsForTabs = base.map(row => ({
      item: row.item,
      category: row.category.toUpperCase() as AssetCategory
    }));
  }



  /** Filtra ativos para o modal de seleção */
  getFilteredAssets(): Asset[] {
    const term = this.searchTerm?.toLowerCase().trim();
    if (!term) {
      return this.assets;
    }
    return this.assets.filter(a =>
      (a.symbol || '').toLowerCase().includes(term) ||
      (a.nome || a.name || '').toLowerCase().includes(term)
    );
  }


  onSelectAsset(asset: Asset): void {
    // adiciona na lista de selecionados se ainda não tiver
    if (!this.selectedAssets.some(a => a.symbol === asset.symbol)) {
      this.selectedAssets = [...this.selectedAssets, asset];
    }

    this.currentAsset = asset;
    this.assetSelected.emit(asset);

    this.closeModal();
  }

  /* ====== Histórico (novo) ====== */
  setTimeframe(interval: ChartInterval, forceReload = false) {
    const changed = this.currentInterval !== interval || forceReload;

    const opt = this.timeframeOptions.find(o => o.key === interval);
    if (!opt) return;

    this.currentInterval = interval;
    this.candleMs = opt.ms;
    this.intervalLabel = opt.label;

    this.lastBucketFromHistory = 0;

    if (this.selected && changed) {
      // se o tipo IntradayInterval do seu ApiService ainda NÃO inclui '1h','4h','1d'…,
      // use o cast 'as any' por enquanto ou amplie o tipo no serviço.
      this.loadHistoryForSelected(500, { showSpinner: true });
    }
    this.saveState();
  }




  private loadHistoryForSelected(limit = 500, opts?: { showSpinner?: boolean }) {
    const uiSym = this.order.symbol || (this.selected ? this.displaySymbol(this.selected) : '');
    if (!uiSym) return;

    const reqSym = this.mapToBackendSymbol(uiSym, this.selectedCategory); // 👈
    const showSpinner = opts?.showSpinner ?? true;
    if (showSpinner) this.loadingChart = true;

    this.histSub?.unsubscribe();
    this.histSub = this.api
      .getHistoryInterval(reqSym, this.backendIntervalKey(this.currentInterval) as any, { limit }) // 👈 usa reqSym
      .pipe(
        catchError(() => of([])),
        finalize(() => { if (showSpinner) this.loadingChart = false; this.drawChart(); })
      )
      .subscribe((arr: any[]) => {
        const mapped: Candle[] = (arr || []).map(b => ({
          time: this.isoToMs(b?.t),
          open: Number((b?.o ?? b?.open) ?? 0),
          high: Number((b?.h ?? b?.high) ?? 0),
          low: Number((b?.l ?? b?.low) ?? 0),
          close: Number((b?.c ?? b?.close) ?? 0),
        })).filter(c => Number.isFinite(c.time) && Number.isFinite(c.close) && c.close !== 0);

        mapped.sort((a, b) => a.time - b.time);
        this.candles = mapped;
        this.lastBucketFromHistory = this.candles.length ? this.candles[this.candles.length - 1].time : 0;
        this.drawChart();
      });
  }


  private backendIntervalKey(i: ChartInterval): string {
    // ajuste aqui conforme o seu backend
    const map: Record<ChartInterval, string> = {
      '1min': '1min',
      '5min': '5min',
      '15min': '15min',
      '30min': '30min',
      '1h': '1h',      // ou '60min'
      '4h': '4h',      // ou '4hour'
      '1d': '1d',      // ou 'daily'
      '1wk': '1wk',    // ou 'weekly'
      '1mo': '1mo',    // ou 'monthly'
    };
    return map[i];
  }



  private isoToMs(t: string | undefined | null): number {
    if (!t) return NaN;
    const d = new Date(t);
    return d.getTime();
  }

  /* ===== Ticks / UI ===== */
  flashTick(it: any) {
    const sym = this.displaySymbol(it);
    const p = it?.price ?? it?.bid ?? it?.ask;
    if (typeof p !== 'number') return;
    this.lastPrices.set(sym, p);
  }
  lastTickClass(it: any) {
    const sym = this.displaySymbol(it);
    const p = it?.price ?? it?.bid ?? it?.ask;
    const prev = this.lastPrices.get(sym);
    if (prev == null) return '';
    if (p > prev) return 'col-change tick-up';
    if (p < prev) return 'col-change tick-down';
    return '';
  }

  private extractMajorFrom(s: string | undefined): string | null {
    if (!s) return null;
    const up = s.toUpperCase();
    for (const m of this.cryptoMajors) if (up.includes(m)) return m;
    return null;
  }

  toggleWatchlist() { this.watchlistOpen = !this.watchlistOpen; }

  openOrderModal(): void {
    if (!this.selected && this.filtered?.length) {
      this.selectItem(this.filtered[0], true);
    }
    if (!this.selected) {
      alert('Selecione um ativo na watchlist antes de abrir uma ordem.');
      return;
    }

    this.order.open = true;
    this.order.symbol = this.displaySymbol(this.selected);
    this.order.side = 'BUY';
    this.order.volume = 0.10;
    this.order.warnNotEnough = false;
    this.order.slPrice = null;

    // sempre espelha o número para a string formatada ao abrir o modal
    if (this.order.tpPrice != null && Number.isFinite(this.order.tpPrice)) {
      this.tpPriceRaw = this.order.tpPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 5
      });
    } else {
      this.tpPriceRaw = '';
    }

    this.refreshMarketPrice();
    this.refreshLockedPrice(true);
    this.startLockCountdown(30);

    this.cdr.markForCheck();
  }

  closeOrderModal(): void {
    this.order.open = false;
    this.clearLockCountdown();
  }


  incVolume() {
    const next = this.roundToStep(this.order.volume + this.volumeStep);
    const mv = this.maxVolume();
    this.order.volume = (mv > 0) ? Math.min(next, mv) : next;
    this.order.warnNotEnough = (mv > 0 && this.order.volume >= mv && next > mv);
  }

  decVolume() {
    const next = this.roundToStep(this.order.volume - this.volumeStep);
    this.order.volume = Math.max(this.volumeStep, next);
    this.order.warnNotEnough = false;
  }



  private buildTradeFromOrder(side: 'BUY' | 'SELL', snapPrice?: number): UtipTrade {
    const email = this.resolveTradeEmail();
    if (!email) {
      alert('Não foi possível identificar o cliente. Faça login novamente.');
      throw new Error('clienteEmail ausente');
    }

    const now = new Date();

    // Preço efetivo:
    // 1) usa snapPrice se veio do confirmOrder (já arredondado)
    // 2) se não vier, tenta pegar do live price / inferência
    const effectivePrice =
      typeof snapPrice === 'number'
        ? Number(snapPrice.toFixed(6))
        : (this.getLivePrice(this.order.symbol) ??
          this.inferPriceFromSelected(side) ??
          undefined);

    const t: UtipTrade = {
      clienteEmail: email,
      symbol: this.order.symbol,
      operationType: side,
      volume: this.order.volume,
      commission: 0,
      swap: 0,
      openDate: this.fmtDate(now),
      openTime: this.fmtTime(now),
      openPrice: effectivePrice,

      // 🔹 Categoria vinda da UI ('forex' | 'indices' | 'commodities' | 'crypto' | 'stocks')
      marketCategory: this.selectedCategory,

      // 🔹 Novo campo: true se estiver usando saldo DEMO, false se for saldo real
      demo: this.selectedBalanceType === 'demo'
    };

    if (this.order.tpPrice != null) {
      t.takeProfit = this.order.tpPrice;
    }
    if (this.order.slPrice != null) {
      t.stopLoss = this.order.slPrice;
    }

    return t;
  }



  isClosing(id: number): boolean {
    return this.closingIds.has(id);
  }

  onCloseTrade(t: UtipTrade): void {
    if (!t?.id || t.status === 'CLOSE') return;

    const ok = confirm(`Encerrar a operação ${t.symbol} (#${t.id})?`);
    if (!ok) return;

    this.closingIds.add(t.id);

    const symbolKey = (t.symbol || '').toString().replace(/[^\w]/g, '').toUpperCase();
    const localPx = this.getLivePrice(symbolKey);

    const finalize = (px: number | null) => {
      const body = px != null ? { closePrice: Number(px.toFixed(6)) } : {};
      this.utip.close(t.id!, body).subscribe({
        next: (res) => {
          const idx = this.trades.findIndex(x => x.id === t.id);
          if (idx >= 0) this.trades[idx] = res;
          this.closingIds.delete(t.id!);
          this.getUsuarioByToken();              // 👈 atualiza user/saldoUtip
        },
        error: () => this.closingIds.delete(t.id!)
      });
    };

    if (localPx != null) {
      finalize(localPx);
    } else {
      const svc: any = this.api as any;
      if (typeof svc.getQuote === 'function') {
        (svc.getQuote(symbolKey) || of(null))
          .pipe(catchError(() => of(null)))
          .subscribe((q: any) => {
            const px = this.pickQuotePrice(q);
            finalize(typeof px === 'number' ? px : null);
          });
      } else {
        finalize(null);
      }
    }
  }

  /* ===== Trades ===== */


  /* ===== Polling de cotações (unificado p/ trades + símbolo selecionado) ===== */
  private startQuotesPolling(ms = 1000) {
    this.stopQuotesPolling();
    this.refreshLivePrices();                    // dispara 1x agora
    this.quotesTimerSub = interval(ms).subscribe(() => this.refreshLivePrices());
  }

  private stopQuotesPolling() {
    this.quotesTimerSub?.unsubscribe();
    this.quotesTimerSub = undefined;
  }

  private refreshLivePrices() {
    if (this.isRefreshingQuotes) return;
    this.isRefreshingQuotes = true;

    const fromTrades = Array.from(new Set(
      (this.trades || []).map(t => this.keyFromAnySymbol(t.symbol)).filter(Boolean)
    ));
    const selectedKey = this.selected ? this.keyFromAnySymbol(this.displaySymbol(this.selected)) : '';
    const fromWatchlist = this.watchlistSymbols(); // 👈 agora também a Watchlist

    const symbols = Array.from(new Set([...fromTrades, selectedKey, ...fromWatchlist].filter(Boolean)));
    if (!symbols.length) { this.isRefreshingQuotes = false; return; }

    // (1) Semente com listas já carregadas (mantém seu comportamento)
    for (const s of symbols) {
      const it = this.findInLoadedLists(s);
      const px = this.pickItemPrice(it);
      if (typeof px === 'number') this.livePrices.set(this.keyFromAnySymbol(s), px);
    }
    this.afterQuotesUpdated(); // atualiza de imediato o que der

    const svc: any = this.api as any;

    // (2) Batch preferencial
    if (typeof svc.getQuotes === 'function') {
      this.priceRefreshSub?.unsubscribe();
      this.priceRefreshSub = svc.getQuotes(symbols)
        .pipe(
          catchError(() => of([])),
          finalize(() => { this.isRefreshingQuotes = false; this.afterQuotesUpdated(); })
        )
        .subscribe((arr: any[]) => {
          for (const q of arr || []) {
            const key = this.keyFromAnySymbol(q?.symbol || q?.ticker || q?.pair || q?.code);
            const px = this.pickQuotePrice(q);
            if (key && typeof px === 'number') {
              this.livePrices.set(key, px);
            }
            // 👇 atualiza os itens da watchlist com o retorno
            this.applyQuoteToLoadedLists(q);
          }

          // Fallback 1x1 para símbolos que ficaram sem retorno
          const updatedKeys = new Set<string>((arr || []).map((q: any) =>
            this.keyFromAnySymbol(q?.symbol || q?.ticker || q?.pair || q?.code)
          ));
          const missing = symbols.filter(s => !updatedKeys.has(s));

          if (missing.length && typeof svc.getQuote === 'function') {
            let remaining = missing.length;
            const done = () => { remaining--; if (remaining <= 0) { this.isRefreshingQuotes = false; this.afterQuotesUpdated(); } };

            for (const s of missing) {
              (svc.getQuote(s) || of(null))
                .pipe(catchError(() => of(null)))
                .subscribe({
                  next: (q: any) => {
                    const k = this.keyFromAnySymbol(q?.symbol || q?.ticker || s);
                    const px = this.pickQuotePrice(q);
                    if (k && typeof px === 'number') this.livePrices.set(k, px);
                    this.applyQuoteToLoadedLists(q); // 👈 atualiza Watchlist
                  },
                  error: done,
                  complete: done
                });
            }
          }
        });
      return;
    }

    // (3) Sem batch → 1×1
    let remaining = symbols.length;
    const done = () => { remaining--; if (remaining <= 0) { this.isRefreshingQuotes = false; this.afterQuotesUpdated(); } };
    for (const s of symbols) {
      (svc.getQuote ? svc.getQuote(s) : of(null))
        .pipe(catchError(() => of(null)))
        .subscribe({
          next: (q: any) => {
            const key = this.keyFromAnySymbol(q?.symbol || q?.ticker || s);
            const px = this.pickQuotePrice(q);
            if (key && typeof px === 'number') this.livePrices.set(key, px);
            this.applyQuoteToLoadedLists(q); // 👈 atualiza Watchlist
          },
          error: done,
          complete: done
        });
    }
  }


  private pickQuotePrice(q: any): number | null {
    if (!q) return null;
    const bid = typeof q.bid === 'number' ? q.bid : undefined;
    const ask = typeof q.ask === 'number' ? q.ask : undefined;
    const price = typeof q.price === 'number' ? q.price : undefined;
    const close = typeof q.close === 'number' ? q.close : undefined;
    return ask ?? price ?? bid ?? close ?? null;
  }

  private afterQuotesUpdated(): void {
    const key = this.order.symbol
      ? this.keyFromAnySymbol(this.order.symbol)
      : (this.selected ? this.keyFromAnySymbol(this.displaySymbol(this.selected)) : '');

    if (key) {
      const px = this.livePrices.get(key);
      if (typeof px === 'number') {
        this.order.marketPrice = px;

        // 💡 se o modal estiver aberto e ainda não houver lockedPrice, hidrata uma única vez
        if (this.order.open && (this.order.lockedPrice == null || !Number.isFinite(this.order.lockedPrice))) {
          this.order.lockedPrice = Number(px.toFixed(6));
        }

        this.pushPriceToCandles(px, Date.now());
        this.scheduleDraw();
      }
    }

    if (!this.candles.length) this.syncHistoryDebounced();

    this.tickView();
    this.pricesVersion++;
  }

  private tickView() {
    // ✅ não roda change detection a cada evento; deixa o rAF coalescer
    this.scheduleMarkForCheck();
  }


  /* ===== Lucro em tempo real ===== */
  liveProfit(t: UtipTrade): number | null {
    if (!t) return null;

    const op = (t.operationType ?? 'BUY').toString().toUpperCase();
    const isBuy = op === 'BUY';

    const volume = (t.volume != null) ? Number(t.volume) : 0;
    const open = (t.openPrice != null) ? Number(t.openPrice) : null;

    const status = (t.status ?? 'OPEN').toString().toUpperCase();
    const refPrice =
      status === 'CLOSE'
        ? ((t.closePrice != null) ? Number(t.closePrice) : null)
        : this.getLivePrice(t.symbol);

    if (open == null || Number.isNaN(open) || refPrice == null || Number.isNaN(refPrice)) return null;

    const priceDiff = isBuy ? (refPrice - open) : (open - refPrice);
    const cat = this.categoryForTrade(t);
    const lot = this.getLotSize(cat);

    const pnl = priceDiff * (volume * lot);
    return Number(pnl.toFixed(6));
  }

  profitClass(t: UtipTrade): string {
    const v = this.liveProfit(t);
    if (v == null) return '';
    return v > 0 ? 'positive' : (v < 0 ? 'negative' : '');
  }

  private categoryForTrade(t: UtipTrade): MarketCategory {
    const s = (t?.symbol ?? '').toString().replace(/[^\w]/g, '').toUpperCase();
    if (!s) return 'stocks';

    if (/^[A-Z]{6}$/.test(s)) return 'forex';

    const indices = new Set([
      'US500', 'NDX', 'DJI', 'RUT', 'DEU40', 'FRA40', 'UK100', 'EU50', 'ES35', 'IT40',
      'NI225', 'HSI', 'KOSPI', 'AEX', 'SMI', 'OMXS30', 'ASX200', 'NIFTY50', 'SENSEX', 'IBOV'
    ]);
    if (indices.has(s)) return 'indices';

    if (/(XAUUSD|XAGUSD|USOIL|UKOIL|NATGAS)/.test(s) || /^[A-Z]{1,3}\d!$/.test(s)) return 'commodities';

    if ((/USDT$|USD$/.test(s)) && this.cryptoMajors.some(m => s.includes(m))) return 'crypto';

    return 'stocks';
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

  /* ===== Helpers de preço ===== */
  private getLivePrice(symbol: string | undefined | null): number | null {
    if (!symbol) return null;
    const key = this.keyFromAnySymbol(symbol);

    const px = this.livePrices.get(key);
    if (typeof px === 'number') return px;

    if (this.selected && key === this.keyFromAnySymbol(this.displaySymbol(this.selected))) {
      const p = this.order.marketPrice ?? this.inferPriceFromSelected(this.order.side);
      if (typeof p === 'number') return p;
    }

    const it = this.findInLoadedLists(symbol);
    const p2 = this.pickItemPrice(it);
    if (typeof p2 === 'number') {
      this.livePrices.set(key, p2);
      return p2;
    }
    return null;
  }

  /** Detecta o preço atual do ativo selecionado. BUY usa ask; SELL usa bid. */
  private inferPriceFromSelected(side: 'BUY' | 'SELL'): number | null {
    if (!this.selected) return null;
    const s: any = this.selected;
    const bid = typeof s.bid === 'number' ? s.bid : undefined;
    const ask = typeof s.ask === 'number' ? s.ask : undefined;
    const px = typeof s.price === 'number' ? s.price : (typeof s.close === 'number' ? s.close : undefined);
    return side === 'BUY' ? (ask ?? px ?? bid ?? null) : (bid ?? px ?? ask ?? null);
  }

  refreshMarketPrice(): void {
    this.order.marketPrice =
      this.inferPriceFromSelected(this.order.side) ??
      this.getLivePrice(this.order.symbol) ??
      null;
  }

  priceStep(): number {
    switch (this.selectedCategory) {
      case 'forex': return 0.0001;
      case 'indices': return 0.1;
      case 'commodities': return 0.01;
      case 'crypto': return 0.01;
      case 'stocks': return 0.01;
      default: return 0.01;
    }
  }

  stepPending(sign: 1 | -1) {
    const st = this.priceStep();
    const base = (this.order.pendingPrice ?? this.order.marketPrice ?? 0);
    const next = base + sign * st;
    this.order.pendingPrice = Number(next.toFixed(5));
  }

  stepTp(sign: 1 | -1) {
    const st = this.priceStep();
    const base = (this.order.tpPrice ?? this.order.marketPrice ?? 0);
    const next = base + sign * st;
    this.order.tpPrice = Number(next.toFixed(5));

    this.tpPriceRaw = this.order.tpPrice.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5
    });
  }


  stepSl(sign: 1 | -1) {
    const st = this.priceStep();
    const base = (this.order.slPrice ?? this.order.marketPrice ?? 0);
    const next = base + sign * st;
    this.order.slPrice = Number(next.toFixed(5));
  }

  setSide(side: 'BUY' | 'SELL'): void {
    this.order.side = side;
    this.refreshMarketPrice();
    this.refreshLockedPrice(true);
    this.restartLockCountdown();
  }

  /** ======= PREÇOS ======= */
  /** Atualiza order.marketPrice com base no ativo selecionado/lado */


  private startLockCountdown(seconds = 30): void {
    this.clearLockCountdown();
    this.lockCountdown = seconds;
    this.lockTimer = setInterval(() => {
      this.lockCountdown--;
      if (this.lockCountdown <= 0) {
        // ao zerar, atualiza o preço travado e reinicia
        this.refreshLockedPrice(true);
        this.lockCountdown = seconds;
      }
    }, 1000);
  }

  private restartLockCountdown(): void {
    this.startLockCountdown(30);
  }

  private clearLockCountdown(): void {
    if (this.lockTimer) { clearInterval(this.lockTimer); this.lockTimer = undefined; }
    this.lockCountdown = 0;
  }

  confirmOrder(): void {
    if (!this.order.symbol) return;

    // valida saldo vs equivalente
    const need = this.equivalentValue(this.order.volume);
    const bal = this.userBalance();
    if (need > bal + 1e-9) {
      this.order.warnNotEnough = true;
      return; // não segue adiante
    }

    this.savingOrder = true;

    const snap =
      (typeof this.order.lockedPrice === 'number') ? this.order.lockedPrice :
        (this.getLivePrice(this.order.symbol) ??
          this.inferPriceFromSelected(this.order.side) ??
          this.order.marketPrice ??
          undefined);

    const snapped = (typeof snap === 'number') ? Number(snap.toFixed(6)) : undefined;

    const payload = this.buildTradeFromOrder(this.order.side, snapped);

    this.utip.create(payload).subscribe({
      next: () => {
        this.savingOrder = false;
        this.closeOrderModal();

        this.loadTrades();         // se o pai também mostra algo
        this.getUsuarioByToken();  // saldo

        this.bumpTradesVersion();  // << avisa o filho para recarregar
      },
      error: () => { this.savingOrder = false; }
    });
  }


  /** Seta o preço travado (lockedPrice) com arredondamento */
  private refreshLockedPrice(forceMark = false): void {
    let live: number | null =
      this.getLivePrice(this.order.symbol) ??
      this.inferPriceFromSelected(this.order.side) ??
      (typeof this.order.marketPrice === 'number' ? this.order.marketPrice : null);

    if (live == null) {
      // último fallback: procurar na lista carregada
      const it = this.findInLoadedLists(this.order.symbol);
      live = this.pickItemPrice(it);
    }

    if (typeof live === 'number' && Number.isFinite(live) && live > 0) {
      this.order.lockedPrice = Number(live.toFixed(6));
      if (forceMark) this.cdr.markForCheck();
    } else {
      // ainda não temos preço? tenta novamente logo em seguida
      if (this.order.open) setTimeout(() => this.refreshLockedPrice(true), 250);
    }
  }


  getActiveEnterprise(): void {
    this.enterpriseService.getActiveEnterprise()
      .subscribe({
        next: (e) => { this.activeEnterprise = e; },
        error: () => { this.activeEnterprise = null; }
      });
  }

  private keyFromAnySymbol(s: string | null | undefined): string {
    if (!s) return '';
    let k = String(s).trim().toUpperCase();
    if (k.includes(':')) k = k.split(':').pop()!;
    k = k.replace(/[^A-Z0-9]/g, '');
    return k;
  }

  private pickItemPrice(it: any): number | null {
    if (!it) return null;
    const bid = typeof it.bid === 'number' ? it.bid : undefined;
    const ask = typeof it.ask === 'number' ? it.ask : undefined;
    const price = typeof it.price === 'number' ? it.price : undefined;
    const close = typeof it.close === 'number' ? it.close : undefined;
    return ask ?? price ?? bid ?? close ?? null;
  }

  private findInLoadedLists(sym: string): any | null {
    const key = this.keyFromAnySymbol(sym);
    const cats: MarketCategory[] = ['forex', 'indices', 'commodities', 'crypto', 'stocks'];

    const buckets: any[][] = [
      this.list || [],
      ...cats.map(c => this.all[c] || [])
    ];

    for (const arr of buckets) {
      const found = (arr || []).find(it =>
        this.keyFromAnySymbol(this.displaySymbol(it)) === key
      );
      if (found) return found;
    }
    return null;
  }

  /* ===== Canvas / Gráfico de Velas ===== */
  private initCanvas() {
    if (!this.chartCanvas) return;

    const canvas = this.chartCanvas.nativeElement;
    this.dpr = window.devicePixelRatio || 1;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    this.resizeCanvas();
    this.chartReady = true;

    // define listeners (reaproveitados nos removeEventListener)
    this.canvasListeners.wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) this.zoomIn(); else this.zoomOut();
    };
    this.canvasListeners.move = (e: MouseEvent) => this.onMouseMove(e);
    this.canvasListeners.down = (e: MouseEvent) => this.onMouseDown(e);
    this.canvasListeners.up = (e: MouseEvent) => this.onMouseUp(e);
    this.canvasListeners.leave = () => { this.mouseInside = false; this.hoverIndex = null; this.scheduleDraw(); };

    // ✅ Registra fora da zona da Angular (não dispara change detection a cada evento de mouse)
    this.zone.runOutsideAngular(() => {
      canvas.addEventListener('wheel', this.canvasListeners.wheel!, { passive: false });
      canvas.addEventListener('mousemove', this.canvasListeners.move!);
      canvas.addEventListener('mousedown', this.canvasListeners.down!);
      window.addEventListener('mouseup', this.canvasListeners.up!);
      canvas.addEventListener('mouseleave', this.canvasListeners.leave!);
    });

    if (this.selected) this.loadHistoryForSelected();
    this.scheduleDraw(); // desenha grade inicial
  }



  private resetChartSeries() {
    this.candles = [];
    this.drawChart();
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
    this.scheduleDraw(); // ✅ evita vários drawChart seguidos
  }


  private resizeCanvas() {
    if (!this.chartCanvas) return;
    const canvas = this.chartCanvas.nativeElement;
    const parent = canvas.parentElement!;
    const w = parent.clientWidth;
    const h = parent.clientHeight;



    // Ajuste para HiDPI
    this.dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(w * this.dpr));
    canvas.height = Math.max(1, Math.floor(h * this.dpr));
    canvas.style.width = `100%`;
    canvas.style.height = `${h}px`;

    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
  }

  private pushPriceToCandles(price: number, ts: number) {
    if (!Number.isFinite(price)) return;

    // se não há histórico carregado (ou foi “zerado”), sincroniza primeiro
    if (!this.candles.length) {
      this.syncHistoryDebounced();
      return;
    }

    const bucket = Math.floor(ts / this.candleMs) * this.candleMs;
    const last = this.candles[this.candles.length - 1];
    const isNewCandle = !last || last.time !== bucket;

    if (isNewCandle) {
      // desenha de forma imediata uma vela provisória para a UI não “parar”
      this.candles.push({ time: bucket, open: price, high: price, low: price, close: price });
      if (this.candles.length > this.maxCandles) this.candles.shift();

      // se avançou bucket além do último vindo da API, sincroniza com a API (debounced)
      if (bucket > this.lastBucketFromHistory) {
        this.syncHistoryDebounced();
      }
      return;
    }

    // atualiza a vela corrente
    last.high = Math.max(last.high, price);
    last.low = Math.min(last.low, price);
    last.close = price;
  }


  private drawChart() {
    if (!this.chartReady || !this.ctx || !this.chartCanvas) return;
    const canvas = this.chartCanvas.nativeElement;
    const ctx = this.ctx;

    const W = canvas.width / this.dpr;
    const H = canvas.height / this.dpr;

    // Fundo
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f0a1a';
    ctx.fillRect(0, 0, W, H);

    // Área útil
    const rect = {
      left: this.chartPadding.left,
      right: W - this.chartPadding.right,
      top: this.chartPadding.top,
      bottom: H - this.chartPadding.bottom,
    };
    rect.left = Math.max(0, rect.left);
    rect.top = Math.max(0, rect.top);
    rect.right = Math.min(W, rect.right);
    rect.bottom = Math.min(H, rect.bottom);
    const chartWidth = Math.max(1, rect.right - rect.left);
    const chartHeight = Math.max(1, rect.bottom - rect.top);

    // Número de velas visíveis (zoom)
    if (!this.candlesOnScreen) this.candlesOnScreen = Math.max(10, Math.floor(chartWidth / 6));
    this.clampPan();

    // Janela
    const count = Math.max(1, Math.min(this.candlesOnScreen, this.candles.length));
    const start = Math.max(0, this.candles.length - count - this.panOffset);
    const data = this.candles.slice(start, start + count);
    if (!data.length) { this.drawGrid(ctx, rect); return; }

    // Min/Max + folga
    let min = +Infinity, max = -Infinity;
    for (const c of data) { if (c.low < min) min = c.low; if (c.high > max) max = c.high; }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      const base = Number.isFinite(min) ? min : 0;
      min = base * 0.999;
      max = base * 1.001 + 1e-6;
    }
    const pad = (max - min) * 0.03;
    min -= pad; max += pad;

    // Cache p/ interação
    this.lastRect = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, w: chartWidth, h: chartHeight };
    this.lastMin = min; this.lastMax = max; this.lastStart = start; this.lastCount = count;

    // Grade e escala de preço (números à direita)
    this.drawGrid(ctx, rect);
    this.drawRightScale(ctx, rect, min, max);

    // Candles
    const n = data.length;
    const xStep = chartWidth / Math.max(1, n);
    this.lastXStep = xStep;
    const bodyW = Math.max(1, Math.floor(xStep * 0.6));
    const up = '#2AFD58', down = '#FF5555';

    // CLIP
    ctx.save();
    ctx.beginPath(); ctx.rect(rect.left, rect.top, chartWidth, chartHeight); ctx.clip();

    for (let i = 0; i < n; i++) {
      const c = data[i];
      const xCenter = rect.left + i * xStep + xStep / 2;

      const yHigh = this.yFor(c.high, rect, min, max, chartHeight);
      const yLow = this.yFor(c.low, rect, min, max, chartHeight);
      const yOpen = this.yFor(c.open, rect, min, max, chartHeight);
      const yClose = this.yFor(c.close, rect, min, max, chartHeight);

      const bullish = c.close >= c.open;
      const color = bullish ? up : down;

      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xCenter, yHigh); ctx.lineTo(xCenter, yLow); ctx.stroke();

      const xBody = Math.max(rect.left, Math.min(rect.right - bodyW, Math.round(xCenter - bodyW / 2) + 0.5));
      const yBodyTop = Math.min(yOpen, yClose);
      const yBodyBottom = Math.max(yOpen, yClose);
      const hBody = Math.max(1, yBodyBottom - yBodyTop);

      ctx.fillStyle = color;
      ctx.fillRect(xBody, yBodyTop, bodyW, hBody);
    }

    // Linhas desenhadas
    this.drawTrendLines(ctx, rect, min, max, chartHeight, start, count, xStep);

    // Intervalos de Preços (definitivos + preview)
    this.drawPriceRanges(ctx, rect, min, max, chartHeight, start, count, xStep);

    // Crosshair + OHLC labels à direita
    this.drawCrosshairAndLabels(ctx, rect, data, start, xStep, min, max, chartHeight);

    ctx.restore();

    // Último preço / preço atual (linha pontilhada + etiqueta à direita)
    const last = data[data.length - 1];
    if (last) {
      // tenta pegar o preço live do símbolo atual
      let live: number | null = null;
      const sym = this.order.symbol || (this.selected ? this.displaySymbol(this.selected) : '');
      if (sym) {
        live = this.getLivePrice(sym);
      }

      // fallback para o close da última vela se não houver preço live
      const currentPrice = (typeof live === 'number' && isFinite(live)) ? live : last.close;

      // posição vertical (clamp para não sair da área do gráfico)
      let y = this.yFor(currentPrice, rect, min, max, chartHeight);
      y = Math.max(rect.top, Math.min(rect.bottom, y));

      // linha pontilhada horizontal no preço atual
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(rect.left, y); ctx.lineTo(rect.right, y); ctx.stroke();
      ctx.setLineDash([]);

      // casas decimais de acordo com a categoria
      const decimals =
        this.selectedCategory === 'forex' ? 5 :
          this.selectedCategory === 'indices' ? 1 :
            2;

      const txt = currentPrice.toFixed(decimals);
      this.drawPriceTag(ctx, rect.right + 4, y, txt, '#2ac3fd');

      // NOVOS desenhos auxiliares
      this.drawHLines(ctx, rect, min, max, chartHeight);
      this.drawVLines(ctx, rect, min, max, chartHeight, start, count, xStep);
      this.drawRays(ctx, rect, min, max, chartHeight, start, count, xStep);
      this.drawDataPriceMeasures(ctx, rect, min, max, chartHeight, start, count, xStep);
      this.drawPositions(ctx, rect, min, max, chartHeight, start, count, xStep);
    }
  }


  private idxForTimeInWindow(t: number, start: number, count: number): number {
    let lo = start, hi = start + count - 1, ans = start;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const mt = this.candles[mid]?.time || 0;
      if (mt <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  }
  private xForIndexInWindow(i: number, rect: any, start: number, xStep: number) {
    return rect.left + (i - start + 0.5) * xStep;
  }

  /** Linha horizontal + etiqueta de preço */
  private drawHLines(ctx: CanvasRenderingContext2D, rect: any, min: number, max: number, h: number) {
    if (!this.hLines.length) return;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    for (const price of this.hLines) {
      const y = this.yFor(price, rect, min, max, h);
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(rect.left, y); ctx.lineTo(rect.right, y); ctx.stroke();
      ctx.setLineDash([]);
      this.drawPriceTag(ctx, rect.right + 4, y, price.toFixed(2), '#b36cff');
    }
  }

  /** Linha vertical em um timestamp aproximado */
  private drawVLines(
    ctx: CanvasRenderingContext2D, rect: any, min: number, max: number, h: number,
    start: number, count: number, xStep: number
  ) {
    if (!this.vLines.length) return;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const t of this.vLines) {
      const i = this.idxForTimeInWindow(t, start, count);
      const x = this.xForIndexInWindow(i, rect, start, xStep);
      ctx.beginPath(); ctx.moveTo(x, rect.top); ctx.lineTo(x, rect.bottom); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  /** Raio (linha que parte do ponto A→B e segue até a direita) */
  private drawRays(
    ctx: CanvasRenderingContext2D, rect: any, min: number, max: number, h: number,
    start: number, count: number, xStep: number
  ) {
    const drawOne = (t1: number, p1: number, t2: number, p2: number, preview = false) => {
      const i1 = this.idxForTimeInWindow(t1, start, count);
      const i2 = this.idxForTimeInWindow(t2, start, count);
      const x1 = this.xForIndexInWindow(i1, rect, start, xStep);
      const x2 = this.xForIndexInWindow(i2, rect, start, xStep);
      const y1 = this.yFor(p1, rect, min, max, h);
      const y2 = this.yFor(p2, rect, min, max, h);

      const m = (y2 - y1) / ((x2 - x1) || 1e-6);
      const xr = rect.right;
      const yr = y1 + m * (xr - x1);

      ctx.strokeStyle = '#f9a825';
      ctx.lineWidth = 2;
      if (preview) ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(xr, yr); ctx.stroke();
      if (preview) ctx.setLineDash([]);
    };

    for (const r of this.rays) drawOne(r.t1, r.p1, r.t2, r.p2, false);
    if (this.tmpRayStart && this.mouseInside) {
      const last = this.pointToData(this.mouseX, this.mouseY);
      drawOne(this.tmpRayStart.t, this.tmpRayStart.p, last.t, last.p, true);
    }
  }

  /** Intervalo de Data e Preço (régua sem área) */
  private drawDataPriceMeasures(
    ctx: CanvasRenderingContext2D, rect: any, min: number, max: number, h: number,
    start: number, count: number, xStep: number
  ) {
    const drawOne = (t1: number, p1: number, t2: number, p2: number, preview = false) => {
      const i1 = this.idxForTimeInWindow(t1, start, count);
      const i2 = this.idxForTimeInWindow(t2, start, count);
      const x1 = this.xForIndexInWindow(i1, rect, start, xStep);
      const x2 = this.xForIndexInWindow(i2, rect, start, xStep);
      const y1 = this.yFor(p1, rect, min, max, h);
      const y2 = this.yFor(p2, rect, min, max, h);

      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 1.5;
      ctx.setLineDash(preview ? [6, 4] : [4, 4]);
      // “L” (horizontal + vertical)
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.moveTo(x2, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);

      const diff = p2 - p1;
      const pct = (p1 !== 0) ? (diff / p1) * 100 : 0;
      const bars = Math.abs(i2 - i1) + 1;
      const dtMs = Math.abs(t2 - t1) || (bars * this.candleMs);
      const label = `Δ ${diff >= 0 ? '+' : ''}${diff.toFixed(4)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)\n${bars} vela${bars > 1 ? 's' : ''} • ${this.formatDuration(dtMs)}`;

      this.drawRangeTag(ctx, (x1 + x2) / 2, (y1 + y2) / 2, label, '#ffd166');
    };

    for (const m of this.dpMeasures) drawOne(m.t1, m.p1, m.t2, m.p2, false);
    if (this.tmpDpStart && this.mouseInside) {
      const last = this.pointToData(this.mouseX, this.mouseY);
      drawOne(this.tmpDpStart.t, this.tmpDpStart.p, last.t, last.p, true);
    }
  }

  /** Posição Long/Short (R/R simples) */
  private drawPositions(
    ctx: CanvasRenderingContext2D, rect: any, min: number, max: number, h: number,
    start: number, count: number, xStep: number
  ) {
    const drawOne = (kind: 'long' | 'short', t: number, entry: number, stop: number, target: number) => {
      const i = this.idxForTimeInWindow(t, start, count);
      const x0 = this.xForIndexInWindow(i, rect, start, xStep);
      const w = Math.max(6, Math.min(rect.right - x0, this.posWidthBars * xStep));

      const yEntry = this.yFor(entry, rect, min, max, h);
      const yStop = this.yFor(stop, rect, min, max, h);
      const yTarget = this.yFor(target, rect, min, max, h);

      // caixas
      const up = kind === 'long';
      const yProfitTop = up ? yTarget : yEntry;
      const yProfitBot = up ? yEntry : yTarget;
      const yRiskTop = up ? yEntry : yStop;
      const yRiskBot = up ? yStop : yEntry;

      // lucro (verde)
      ctx.fillStyle = 'rgba(42,253,88,0.12)';
      ctx.strokeStyle = '#2AFD58';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(x0, Math.min(yProfitTop, yProfitBot), w, Math.abs(yProfitBot - yProfitTop)); ctx.fill(); ctx.stroke();

      // risco (vermelho)
      ctx.fillStyle = 'rgba(255,85,85,0.12)';
      ctx.strokeStyle = '#FF5555';
      ctx.beginPath(); ctx.rect(x0, Math.min(yRiskTop, yRiskBot), w, Math.abs(yRiskBot - yRiskTop)); ctx.fill(); ctx.stroke();

      const r = Math.abs(entry - stop);
      const rr = r > 0 ? Math.abs(target - entry) / r : 0;
      const text = `${kind.toUpperCase()} • R/R ${rr.toFixed(2)}`;
      this.drawRangeTag(ctx, x0 + w / 2, Math.min(yRiskTop, yProfitTop) - 14, text, '#d8ccff');

      // linhas de preço
      this.drawPriceTag(ctx, rect.right + 4, yEntry, `Entry ${entry.toFixed(2)}`, '#7fb3ff');
      this.drawPriceTag(ctx, rect.right + 4, yStop, `Stop ${stop.toFixed(2)}`, '#FF5555');
      this.drawPriceTag(ctx, rect.right + 4, yTarget, `Alvo ${target.toFixed(2)}`, '#2AFD58');
    };

    for (const p of this.positions) drawOne(p.kind, p.t, p.entry, p.stop, p.target);

    // preview: se já tem entrada/stop ou entrada apenas
    const d = this.tmpPosDraft;
    if (d && this.mouseInside) {
      const last = this.pointToData(this.mouseX, this.mouseY);
      const entry = d.entry;
      const stop = d.stop ?? last.p;
      const target = d.stop != null ? last.p : entry + (entry - stop) * (d.kind === 'long' ? 1 : -1); // alvo provisório
      drawOne(d.kind, d.t, entry, stop, target);
    }
  }

  clearDrawings() {
    this.lines = [];
    this.ranges = [];
    this.hLines = [];
    this.vLines = [];
    this.rays = [];
    this.dpMeasures = [];
    this.positions = [];
    this.tmpLineStart = this.tmpRangeStart = this.tmpRayStart = this.tmpDpStart = null;
    this.tmpPosDraft = null;
    this.drawChart();
  }



  private drawGrid(ctx: CanvasRenderingContext2D, r: { left: number; right: number; top: number; bottom: number }) {
    const rows = 6, cols = 8;
    const grid = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;

    const left = Math.round(r.left) + 0.5;
    const right = Math.round(r.right) + 0.5;
    const top = Math.round(r.top) + 0.5;
    const bottom = Math.round(r.bottom) + 0.5;

    for (let i = 0; i <= rows; i++) {
      const y = top + (bottom - top) * (i / rows);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    for (let j = 0; j <= cols; j++) {
      const x = left + (right - left) * (j / cols);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
  }

  setTool(t: 'cursor' | 'trend' | 'range' | 'dprange' | 'hline' | 'vline' | 'ray' | 'long' | 'short') {
    this.activeTool = t;
    this.tmpLineStart = null;
    this.tmpRangeStart = null;
    this.tmpRayStart = null;
    this.tmpDpStart = null;
    this.tmpPosDraft = null;
    this.scheduleDraw();
  }


  zoomIn() {
    if (!this.chartCanvas) return;
    this.candlesOnScreen = Math.max(10, Math.round((this.candlesOnScreen || 60) * 0.9));
    this.clampPan();
    this.scheduleDraw();        // ✅
    this.saveStateDebounced();
  }

  zoomOut() {
    if (!this.chartCanvas) return;
    const max = Math.max(10, this.candles.length);
    this.candlesOnScreen = Math.min(max, Math.round((this.candlesOnScreen || 60) * 1.1));
    this.clampPan();
    this.scheduleDraw();        // ✅
    this.saveStateDebounced();
  }

  resetView() {
    this.candlesOnScreen = 0;
    this.panOffset = 0;
    this.scheduleDraw();        // ✅
    this.saveStateDebounced();
  }



  clearLines() { this.lines = []; this.tmpLineStart = null; this.drawChart(); }

  private onMouseDown(e: MouseEvent) {
    if (!this.chartCanvas || !this.lastRect) return;
    const r = this.chartCanvas.nativeElement.getBoundingClientRect();
    this.mouseX = e.clientX - r.left; this.mouseY = e.clientY - r.top; this.mouseInside = true;

    // trend line
    if (this.activeTool === 'trend') {
      const { t, p } = this.pointToData(this.mouseX, this.mouseY);
      if (!this.tmpLineStart) {
        this.tmpLineStart = { t, p };      // 1º clique: ancora inicial
      } else {
        this.lines.push({                  // 2º clique: cria a linha
          t1: this.tmpLineStart.t, p1: this.tmpLineStart.p,
          t2: t, p2: p
        });
        this.tmpLineStart = null;
      }
      this.drawChart();
      return; // NÃO deixa cair no pan
    }

    // range box (já estava certo)
    if (this.activeTool === 'range') {
      const { t, p } = this.pointToData(this.mouseX, this.mouseY);
      if (!this.tmpRangeStart) {
        this.tmpRangeStart = { t, p };
      } else {
        this.ranges.push({ t1: this.tmpRangeStart.t, p1: this.tmpRangeStart.p, t2: t, p2: p });
        this.tmpRangeStart = null;
      }
      this.drawChart();
      return; // NÃO deixa cair no pan
    }

    // Linha horizontal
    if (this.activeTool === 'hline') {
      const { p } = this.pointToData(this.mouseX, this.mouseY);
      this.hLines.push(p);
      this.drawChart();
      return;
    }

    // Linha vertical
    if (this.activeTool === 'vline') {
      const { t } = this.pointToData(this.mouseX, this.mouseY);
      this.vLines.push(t);
      this.drawChart();
      return;
    }

    // Raio (projeção p/ direita)
    if (this.activeTool === 'ray') {
      const { t, p } = this.pointToData(this.mouseX, this.mouseY);
      if (!this.tmpRayStart) this.tmpRayStart = { t, p };
      else {
        this.rays.push({ t1: this.tmpRayStart.t, p1: this.tmpRayStart.p, t2: t, p2: p });
        this.tmpRayStart = null;
      }
      this.drawChart();
      return;
    }

    // Intervalo de Data e Preço (régua)
    if (this.activeTool === 'dprange') {
      const { t, p } = this.pointToData(this.mouseX, this.mouseY);
      if (!this.tmpDpStart) this.tmpDpStart = { t, p };
      else {
        this.dpMeasures.push({ t1: this.tmpDpStart.t, p1: this.tmpDpStart.p, t2: t, p2: p });
        this.tmpDpStart = null;
      }
      this.drawChart();
      return;
    }

    // Posição Comprada / Vendida (3 cliques: entrada → stop → alvo)
    if (this.activeTool === 'long' || this.activeTool === 'short') {
      const { t, p } = this.pointToData(this.mouseX, this.mouseY);
      if (!this.tmpPosDraft) {
        this.tmpPosDraft = { kind: this.activeTool, t, entry: p };
      } else if (this.tmpPosDraft.stop == null) {
        this.tmpPosDraft.stop = p;
      } else {
        this.tmpPosDraft.target = p;
        const d = this.tmpPosDraft;
        if (d.stop != null && d.target != null) {
          this.positions.push({ kind: d.kind, t: d.t, entry: d.entry, stop: d.stop, target: d.target });
        }
        this.tmpPosDraft = null;
      }
      this.drawChart();
      return;
    }


    // pan somente no cursor
    if (this.activeTool === 'cursor') {
      this.isPanning = true;
      this.dragLastX = e.clientX;
    }


  }


  private onMouseUp(_e: MouseEvent) {
    this.isPanning = false;
    this.saveStateDebounced();
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.chartCanvas || !this.lastRect) return;
    const r = this.chartCanvas.nativeElement.getBoundingClientRect();
    this.mouseX = e.clientX - r.left; this.mouseY = e.clientY - r.top; this.mouseInside = true;

    if (this.isPanning) {
      const dx = e.clientX - this.dragLastX;
      this.dragLastX = e.clientX;
      if (this.lastXStep > 0) {
        const shift = Math.round(-dx / this.lastXStep);
        if (shift) {
          this.panOffset = Math.max(0, Math.min(this.maxPan(), this.panOffset + shift));
          this.drawChart();
        }
      }
      return;
    }

    // hover index
    const rect = this.lastRect;
    const xClamped = Math.max(rect.left, Math.min(rect.right - 1, this.mouseX));
    const idxInView = Math.floor((xClamped - rect.left) / Math.max(1, this.lastXStep));
    this.hoverIndex = Math.max(this.lastStart, Math.min(this.lastStart + this.lastCount - 1, this.lastStart + idxInView));

    this.drawChart();
  }

  private clampPan() {
    this.panOffset = Math.max(0, Math.min(this.maxPan(), this.panOffset));
  }
  private maxPan() { return Math.max(0, (this.candles.length - (this.candlesOnScreen || 0))); }


  private yFor(val: number, rect: { top: number; bottom: number }, min: number, max: number, h: number) {
    const t = (val - min) / (max - min);
    return rect.bottom - t * h;
  }
  private priceFromY(y: number, rect: { top: number; bottom: number }, min: number, max: number, h: number) {
    const t = (rect.bottom - y) / h;
    return min + t * (max - min);
  }
  private pointToData(px: number, py: number) {
    // converte ponto da tela em (timestamp aproximado, preço) com base na janela atual
    if (!this.lastRect) return { t: 0, p: 0 };
    const rect = this.lastRect;
    const idxInView = Math.floor((px - rect.left) / Math.max(1, this.lastXStep));
    const i = Math.max(this.lastStart, Math.min(this.lastStart + this.lastCount - 1, this.lastStart + idxInView));
    const c = this.candles[i] || this.candles[this.candles.length - 1];
    const p = this.priceFromY(py, rect, this.lastMin, this.lastMax, rect.bottom - rect.top);
    return { t: c?.time ?? 0, p };
  }

  private drawRightScale(ctx: CanvasRenderingContext2D, r: any, min: number, max: number) {
    const rows = 6;
    ctx.fillStyle = 'rgba(216, 204, 255, .9)';
    ctx.font = '11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= rows; i++) {
      const y = Math.round(r.top + (r.bottom - r.top) * (i / rows)) + 0.5;
      const v = max - (max - min) * (i / rows);
      const label = v.toFixed(2);
      ctx.fillText(label, r.right + 4, y);
    }
  }

  private drawPriceTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color = '#b36cff') {
    const padX = 6, padY = 3;
    ctx.font = '12px ui-monospace, Consolas, monospace';
    const w = ctx.measureText(text).width + padX * 2;
    const h = 18;

    // fundo
    ctx.fillStyle = 'rgba(10,7,18,.95)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const rx = 6;
    const left = x, top = y - h / 2;
    ctx.beginPath();
    ctx.moveTo(left + rx, top);
    ctx.lineTo(left + w - rx, top);
    ctx.quadraticCurveTo(left + w, top, left + w, top + rx);
    ctx.lineTo(left + w, top + h - rx);
    ctx.quadraticCurveTo(left + w, top + h, left + w - rx, top + h);
    ctx.lineTo(left + rx, top + h);
    ctx.quadraticCurveTo(left, top + h, left, top + h - rx);
    ctx.lineTo(left, top + rx);
    ctx.quadraticCurveTo(left, top, left + rx, top);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, left + padX, y);
  }

  private drawTrendLines(
    ctx: CanvasRenderingContext2D,
    rect: any, min: number, max: number, h: number,
    start: number, count: number, xStep: number
  ) {
    if (!this.lines.length && !this.tmpLineStart) return;
    const idxForTime = (t: number) => {
      // encontra índice mais próximo do timestamp
      let lo = start, hi = start + count - 1, ans = start;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const mt = this.candles[mid]?.time || 0;
        if (mt <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return ans;
    };
    const xForIndex = (i: number) => rect.left + (i - start + 0.5) * xStep;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#b36cff';

    for (const ln of this.lines) {
      const i1 = idxForTime(ln.t1), i2 = idxForTime(ln.t2);
      const x1 = xForIndex(i1);
      const x2 = xForIndex(i2);
      const y1 = this.yFor(ln.p1, rect, min, max, h);
      const y2 = this.yFor(ln.p2, rect, min, max, h);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // preview (quando primeira âncora já foi clicada)
    if (this.tmpLineStart) {
      const tmp = this.tmpLineStart;
      const lastPoint = this.pointToData(this.mouseX, this.mouseY);
      const i1 = idxForTime(tmp.t), i2 = idxForTime(lastPoint.t);
      const x1 = xForIndex(i1), x2 = xForIndex(i2);
      const y1 = this.yFor(tmp.p, rect, min, max, h);
      const y2 = this.yFor(lastPoint.p, rect, min, max, h);
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawCrosshairAndLabels(
    ctx: CanvasRenderingContext2D,
    rect: any, data: Candle[], start: number,
    xStep: number, min: number, max: number, h: number
  ) {
    if (!this.mouseInside) return;

    // crosshair
    const x = Math.max(rect.left, Math.min(rect.right, this.mouseX));
    const y = Math.max(rect.top, Math.min(rect.bottom, this.mouseY));
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, rect.top); ctx.lineTo(x, rect.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rect.left, y); ctx.lineTo(rect.right, y); ctx.stroke();
    ctx.setLineDash([]);

    // índice sob o cursor
    const idxInView = Math.floor((x - rect.left) / Math.max(1, xStep));
    const i = Math.max(0, Math.min(data.length - 1, idxInView));
    const c = data[i];

    // OHLC tag à direita (em y do respectivo preço)
    const oY = this.yFor(c.open, rect, min, max, h);
    const hY = this.yFor(c.high, rect, min, max, h);
    const lY = this.yFor(c.low, rect, min, max, h);
    const cY = this.yFor(c.close, rect, min, max, h);

    this.drawPriceTag(ctx, rect.right + 4, oY, `O ${c.open.toFixed(2)}`, '#7fb3ff');
    this.drawPriceTag(ctx, rect.right + 4, hY, `H ${c.high.toFixed(2)}`, '#2AFD58');
    this.drawPriceTag(ctx, rect.right + 4, lY, `L ${c.low.toFixed(2)}`, '#FF5555');
    this.drawPriceTag(ctx, rect.right + 4, cY, `C ${c.close.toFixed(2)}`, '#d8ccff');

    // mini box com OHLC no topo-esquerdo
    const txt = `O ${c.open.toFixed(2)}   H ${c.high.toFixed(2)}   L ${c.low.toFixed(2)}   C ${c.close.toFixed(2)}`;
    ctx.font = '12px ui-monospace, Consolas, monospace';
    const w = ctx.measureText(txt).width + 12;
    ctx.fillStyle = 'rgba(8,6,14,.85)';
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath();
    ctx.rect(rect.left + 6, rect.top + 6, w, 20);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(233,228,255,.95)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, rect.left + 12, rect.top + 16);
  }




  get filteredTrades(): UtipTrade[] {
    const f = this.operationTypeFilter;
    return (this.trades || []).filter(t =>
      f === 'ALL' || (t.operationType || '').toUpperCase() === f
    );
  }
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTrades.length / this.pageSize));
  }
  get pagedTrades(): UtipTrade[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredTrades.slice(start, start + this.pageSize);
  }
  setPage(p: number) {
    this.page = Math.max(1, Math.min(this.totalPages, p));
  }
  nextPage() { this.setPage(this.page + 1); }
  prevPage() { this.setPage(this.page - 1); }

  visiblePages(): (number | '…')[] {
    const total = this.totalPages, cur = this.page;
    const set = new Set<number>([1, 2, total - 2, total - 1, total, cur - 1, cur, cur + 1]);
    const nums = Array.from(set).filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    let prev: number | undefined;
    for (const n of nums) {
      if (prev != null && n - prev > 1) out.push('…');
      out.push(n);
      prev = n;
    }
    return out;
  }


  // opcional: melhor trackBy para linhas
  trackByTrade = (i: number, t: UtipTrade) => t.id ?? `${t.symbol}|${t.openDate}|${t.openTime}|${i}`;

  // ao carregar trades, resetar a página
  loadTrades() {
    this.loadingTrades = true;
    if (!this.clienteEmail) {
      this.trades = [];
      this.setPage(1);
      this.loadingTrades = false;
      return;
    }

    this.utip.listByEmail(this.clienteEmail)
      .pipe(finalize(() => this.loadingTrades = false))
      .subscribe({
        next: rows => { this.trades = rows || []; this.setPage(1); this.refreshLivePrices(); },
        error: () => { this.trades = []; this.setPage(1); }
      });
  }




  private saveState() {
    try {
      const payload = {
        cat: this.selectedCategory,
        sym: this.order.symbol || (this.selected ? this.displaySymbol(this.selected) : ''),
        interval: this.currentInterval,
        candlesOnScreen: this.candlesOnScreen,
        panOffset: this.panOffset,
        balanceType: this.selectedBalanceType,
        // 👇 novo
        chartTabs: this.chartTabs,
        activeTabId: this.activeTabId,
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch { }
  }




  /** util simples de debounce */
  private debounce<T extends (...args: any[]) => any>(fn: T, wait = 200) {
    let t: any;
    return (...args: Parameters<T>) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }





  getUsuarioByToken(): void {
    const tk = localStorage.getItem('authToken');
    if (!tk) { return; }

    this.userService.getByTokenLogin(tk).subscribe({
      next: (data) => {
        this.user = data;
        console.log('USUARIO', data)
        // ✅ GARANTA que o email do usuário fique no componente e no localStorage
        if (data?.email) {
          this.clienteEmail = data.email;
          localStorage.setItem('clienteEmail', data.email);
        }
      },
      error: () => { },
    });
  }


  /** Chave estrita para destaques de crypto: aceita apenas BASE + USD|USDT (exato). */
  private compareKeyForFeatured(cat: MarketCategory, it: any): string | null {
    const sym = this.displaySymbol(it);
    if (cat === 'crypto') {
      const m = sym.match(/^([A-Z]{2,10})(USDT|USD)$/); // sem prefixo/sufixo
      if (!m) return null;
      const base = m[1];
      // canônico em USDT para casar com feats normalizados
      return this.norm(base + 'USDT');
    }
    if (cat === 'commodities' && /^[A-Z]{1,3}\d!$/.test(sym)) return this.norm(sym);
    return this.norm(sym);
  }



  private buildOrderOptions() {
    if (!this.filtered?.length) { this.orderOptions = []; return; }
    const feats = (this.featuredByCat[this.selectedCategory] || []).map(s => {
      return this.selectedCategory === 'crypto'
        ? this.norm(((this.extractMajorFrom(s) ?? s).replace(/USDT|USD/gi, '')) + 'USDT')
        : this.norm(s);
    });
    const featured = this.filtered.filter(x => feats.includes(this.compareKeyFor(this.selectedCategory, x)));
    const rest = this.filtered.filter(x => featured.indexOf(x) === -1);
    this.orderOptions = [...featured, ...rest];
  }


  onOrderSymbolChange() {
    const it = this.filtered.find(x => this.displaySymbol(x) === this.order.symbol);
    if (it) this.selectItem(it);
  }

  private resolveTradeEmail(): string | null {
    // prioridade: user já carregado → localStorage → null
    return (this.user?.email || localStorage.getItem('clienteEmail')) ?? null;
  }


  private scheduleDraw() {
    if (this.drawPending) return;
    this.drawPending = true;
    requestAnimationFrame(() => {
      this.drawPending = false;
      this.drawChart();
    });
  }

  // markForCheck coalescido por frame
  private markPending = false;
  private scheduleMarkForCheck() {
    if (this.markPending) return;
    this.markPending = true;
    requestAnimationFrame(() => {
      this.markPending = false;
      this.cdr.markForCheck();
    });
  }


  // dentro da classe HomebrokerComponent
  public resolveLivePrice = (symbol: string): number | null => {
    return this.getLivePrice(symbol); // usa o método existente
  };


  // pega até N símbolos da lista visível (ou toda a lista se não houver filtro)
  private watchlistSymbols(max = 50): string[] {
    const base = (this.filtered?.length ? this.filtered : this.list) || [];
    return base.slice(0, max)
      .map(it => this.keyFromAnySymbol(this.displaySymbol(it)))
      .filter(Boolean);
  }

  // Atualiza o item da lista carregada com os campos da cotação.
  // Atualiza também lastPrices para habilitar os efeitos de tick (up/down).
  private applyQuoteToLoadedLists(q: any): void {
    const key = this.keyFromAnySymbol(q?.symbol || q?.ticker || q?.pair || q?.code);
    if (!key) return;

    const buckets: any[][] = [
      this.list || [],
      ...(['forex', 'indices', 'commodities', 'crypto', 'stocks'] as MarketCategory[])
        .map(c => this.all[c] || [])
    ];

    for (const arr of buckets) {
      const it = (arr || []).find(x => this.keyFromAnySymbol(this.displaySymbol(x)) === key);
      if (it) {
        // snapshot do preço ANTES de aplicar o novo (para comparar no template)
        const prev = this.pickItemPrice(it);
        if (typeof prev === 'number') {
          this.lastPrices.set(this.displaySymbol(it), prev);
        }

        if (q.bid !== undefined) it.bid = q.bid;
        if (q.ask !== undefined) it.ask = q.ask;
        if (q.price !== undefined) it.price = q.price;
        if (q.close !== undefined) it.close = q.close;
        if (q.changesPercentage !== undefined) it.changesPercentage = q.changesPercentage;
        // adicione aqui outros campos que sua API de quotes traga e você queira refletir
      }
    }
  }


  // === add ===
  private startListPolling(ms = 10_000) {
    this.stopListPolling();
    this.refreshCategoryListSilently();                 // dispara 1x agora
    this.listPollingSub = interval(ms).subscribe(() => this.refreshCategoryListSilently());
  }

  private stopListPolling() {
    this.listPollingSub?.unsubscribe();
    this.listPollingSub = undefined;
  }

  /** Busca a lista da categoria atual e atualiza os itens/valores sem spinner */
  private refreshCategoryListSilently() {
    if (this.isRefreshingList) return;
    this.isRefreshingList = true;
    const cat = this.selectedCategory;

    // snapshot de preços p/ efeito tick
    const prevMap = new Map(
      (this.list || []).map(it => [this.keyFromAnySymbol(this.displaySymbol(it)), this.pickItemPrice(it)])
    );

    this.api.getCategoryList(cat)
      .pipe(timeout(12_000), catchError(() => of(null)), finalize(() => { this.isRefreshingList = false; }))
      .subscribe((apiItems: any) => {
        const ok = Array.isArray(apiItems) && apiItems.length > 0;
        if (!ok) return;

        this.all[cat] = apiItems;

        // remonta lista (base + extras) mantendo ordem
        this.list = this.buildWatchlistFromApi(cat, this.all[cat] || []);

        // atualiza lastPrices para ticks
        for (const it of this.list) {
          const key = this.keyFromAnySymbol(this.displaySymbol(it));
          const prev = prevMap.get(key);
          if (typeof prev === 'number') this.lastPrices.set(this.displaySymbol(it), prev);
        }

        this.applyFilters(false);
        this.cdr.markForCheck();
      });
  }


  // === add ===
  private startChartPolling(ms = 10_000) {
    this.stopChartPolling();
    this.refreshChartSilently();                          // dispara 1x agora
    this.chartPollingSub = interval(ms).subscribe(() => this.refreshChartSilently());
  }

  private stopChartPolling() {
    this.chartPollingSub?.unsubscribe();
    this.chartPollingSub = undefined;
  }

  /** Recarrega histórico do símbolo atual, sem spinner (impacta o canvas) */
  private refreshChartSilently() {
    // usa o método existente que já mapeia/ordena e desenha o gráfico
    this.loadHistoryForSelected(500, { showSpinner: false });
  }

  formatLockedPrice(v: number | null): string {
    return (typeof v === 'number' && isFinite(v))
      ? v.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      })
      : '';
  }



  private priceForEquivalence(): number {
    // usa primeiro o preço travado; senão market/live
    return (typeof this.order.lockedPrice === 'number' && this.order.lockedPrice > 0)
      ? this.order.lockedPrice
      : (this.order.marketPrice ?? this.getLivePrice(this.order.symbol) ?? 0);
  }

  userBalance(): number {
    // 👇 agora a validação de margem usa o mesmo saldo escolhido
    if (this.selectedBalanceType === 'demo') {
      return Number(this.user?.saldoUtipDemo ?? 0);
    }
    return Number(this.user?.saldoUtip ?? 0);
  }

  /** valor financeiro ≈ volume × lote × preço */
  equivalentValue(volume: number): number {
    const price = this.normalizeToCents(this.priceForEquivalence() || 0);
    const lot = this.getLotSize(this.selectedCategory) || 1;

    const margin = volume * lot * price;
    return this.normalizeToCents(margin);
  }

  /** volume máximo que o saldo permite (arredondado para step) */
  maxVolume(): number {
    const lot = this.getLotSize(this.selectedCategory) || 1;
    const px = this.priceForEquivalence();
    const bal = this.userBalance();
    if (!(lot > 0 && px > 0 && bal > 0)) return 0;
    const raw = bal / (lot * px);
    return this.roundToStep(Math.max(0, raw));
  }

  private roundToStep(v: number): number {
    // trunca para baixo no step de 0.01
    const f = Math.floor(v / this.volumeStep) * this.volumeStep;
    return Number(f.toFixed(2));
  }

  /** input de volume com clamp imediato ao máximo permitido */
  onVolumeInput(val: string) {
    let v = Number(val);
    if (!Number.isFinite(v) || v < 0) v = 0;
    v = this.roundToStep(v);

    const mv = this.maxVolume();
    if (mv > 0 && v > mv) {
      v = mv;
      this.order.warnNotEnough = true;
    } else {
      this.order.warnNotEnough = false;
    }
    this.order.volume = Number(v.toFixed(2));
  }

  /** define o volume como % do máximo possível com o saldo */
  setVolumePct(pct: number) {
    const mv = this.maxVolume();
    const v = this.roundToStep(mv * pct);
    this.order.volume = Math.max(this.volumeStep, v);
    this.order.warnNotEnough = false;
  }

  /** formata dinheiro (USD por padrão; ajuste se precisar) */
  /** formata dinheiro (USD, padrão EUA: 1,234.56) */
  formatMoney(n: number | null | undefined): string {
    const x = Number(n ?? 0);
    return x.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }



  /** Desenha Intervalo de Preços (faixa com Δ, %, velas e duração) */
  private drawPriceRanges(
    ctx: CanvasRenderingContext2D,
    rect: any, min: number, max: number, h: number,
    start: number, count: number, xStep: number
  ) {
    // utilidades locais (mesmas de drawTrendLines)
    const idxForTime = (t: number) => {
      let lo = start, hi = start + count - 1, ans = start;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const mt = this.candles[mid]?.time || 0;
        if (mt <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return ans;
    };
    const xForIndex = (i: number) => rect.left + (i - start + 0.5) * xStep;

    const drawOne = (t1: number, p1: number, t2: number, p2: number, preview = false) => {
      const i1 = idxForTime(t1), i2 = idxForTime(t2);
      const x1 = xForIndex(i1), x2 = xForIndex(i2);
      const y1 = this.yFor(p1, rect, min, max, h);
      const y2 = this.yFor(p2, rect, min, max, h);

      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const top = Math.min(y1, y2);
      const bottom = Math.max(y1, y2);

      const diff = p2 - p1;
      const pct = (p1 !== 0) ? (diff / p1) * 100 : 0;
      const bars = Math.abs(i2 - i1) + 1;
      const dtMs = Math.abs(t2 - t1) || (bars * this.candleMs);

      const up = diff >= 0;
      const stroke = up ? '#2AFD58' : '#FF5555';
      const fill = up ? 'rgba(42,253,88,0.10)' : 'rgba(255,85,85,0.10)';

      // área
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
      ctx.fillStyle = fill;
      if (!preview) ctx.fill();

      // contorno
      ctx.lineWidth = 1.5;
      ctx.setLineDash(preview ? [6, 4] : [4, 4]);
      ctx.strokeStyle = stroke;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // régua vertical (bracket)
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      const midX = (left + right) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, top);
      ctx.lineTo(midX, bottom);
      ctx.stroke();

      // etiqueta central
      const label1 = `Δ ${diff >= 0 ? '+' : ''}${Math.abs(diff).toFixed(4)}  (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
      const label2 = `${bars} vela${bars > 1 ? 's' : ''} • ${this.formatDuration(dtMs)}`;
      const text = `${label1}\n${label2}`;

      this.drawRangeTag(ctx, (left + right) / 2, (top + bottom) / 2, text, stroke);
    };

    // ranges definitivos
    for (const r of this.ranges) drawOne(r.t1, r.p1, r.t2, r.p2, false);

    // preview (quando só o primeiro clique foi dado)
    if (this.tmpRangeStart && this.mouseInside) {
      const last = this.pointToData(this.mouseX, this.mouseY);
      drawOne(this.tmpRangeStart.t, this.tmpRangeStart.p, last.t, last.p, true);
    }
  }

  /** Balãozinho do range (duas linhas) */
  private drawRangeTag(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, color: string) {
    const lines = text.split('\n');
    ctx.font = '12px ui-monospace, Consolas, monospace';
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 14;
    const h = lines.length * 18 + 10;

    const left = Math.round(cx - w / 2);
    const top = Math.round(cy - h / 2);

    // fundo + borda
    ctx.fillStyle = 'rgba(10,7,18,.95)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    const rx = 8;
    ctx.beginPath();
    ctx.moveTo(left + rx, top);
    ctx.lineTo(left + w - rx, top);
    ctx.quadraticCurveTo(left + w, top, left + w, top + rx);
    ctx.lineTo(left + w, top + h - rx);
    ctx.quadraticCurveTo(left + w, top + h, left + w - rx, top + h);
    ctx.lineTo(left + rx, top + h);
    ctx.quadraticCurveTo(left, top + h, left, top + h - rx);
    ctx.lineTo(left, top + rx);
    ctx.quadraticCurveTo(left, top, left + rx, top);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // texto
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => {
      ctx.fillText(l, left + 8, top + 12 + i * 18);
    });
  }

  /** Formata duração simples (ex.: 2d 3h 15m, 45m, 12h) */
  private formatDuration(ms: number): string {
    const s = Math.max(1, Math.round(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const parts: string[] = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m || (!d && !h)) parts.push(`${m}m`);
    return parts.join(' ');
  }

  /** Utilitário opcional para limpar todos os ranges (similar ao clearLines) */
  clearRanges() { this.ranges = []; this.tmpRangeStart = null; this.drawChart(); }

  // lê extras (normalizados) do localStorage
  private getExtras(cat: MarketCategory): string[] {
    if (this.extrasCache[cat]) return this.extrasCache[cat]!;
    try {
      const raw = localStorage.getItem(this.extrasKey(cat));
      const arr = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw!) : [];
      const normed = Array.from(new Set((arr as string[]).map(s => this.keyFromAnySymbol(s))));
      this.extrasCache[cat] = normed;
      return normed;
    } catch {
      this.extrasCache[cat] = [];
      return [];
    }
  }
  private setExtras(cat: MarketCategory, keys: string[]) {
    const uniq = Array.from(new Set(keys.map(k => this.keyFromAnySymbol(k))));
    this.extrasCache[cat] = uniq;
    try { localStorage.setItem(this.extrasKey(cat), JSON.stringify(uniq)); } catch { }
  }
  isExtraItem(it: any): boolean {
    const k = this.keyFromAnySymbol(this.displaySymbol(it));
    return this.getExtras(this.selectedCategory).includes(k) &&
      !this.isInCuratedBase(this.selectedCategory, k);
  }

  // ========= Curadoria (lista base) =========
  // Aliases por item (mantém ORDEM EXATA que você pediu)
  private curatedAliasesByCat: Record<MarketCategory, string[][]> = {
    crypto: [
      ['BTCUSD', 'BTCUSDT'],
      ['ETHUSD', 'ETHUSDT'],
      ['BNBUSD', 'BNBUSDT'],
      ['XRPUSD', 'XRPUSDT'],
      ['SOLUSD', 'SOLUSDT'],
      ['ADAUSD', 'ADAUSDT'],
    ],
    indices: [
      ['DJI', 'DOWJONES', 'DJIA'],
      ['SPX', 'US500', 'SP500', 'GSPC'],
      ['NDX', 'NASDAQ100', 'US100'],
      ['RUT', 'RUSSELL2000'],
    ],
    commodities: [
      // GOLD - GCZ5  → sua API traz GCUSD
      ['GCZ5', 'GCUSD', 'XAUUSD', 'GC1', 'GC', 'GOLD'],

      // SILVER - SIZ5 → sua API traz SIUSD
      ['SIZ5', 'SIUSD', 'XAGUSD', 'SI1', 'SILVER'],

      // CRUDE OIL WTI - OIL → sua API traz CLUSD (e às vezes USOIL)
      ['OIL', 'CLUSD', 'USOIL', 'CL1', 'CLZ5', 'WTI'],

      // BRENT OIL - LCOZ5 → sua API traz BZUSD (e às vezes UKOIL/BRN)
      ['LCOZ5', 'BZUSD', 'UKOIL', 'BRN', 'BRENT', 'LCO'],

      // NATURAL GAS - NGX5 → sua API traz NGUSD
      ['NGX5', 'NGUSD', 'NATGAS', 'NG1', 'GAS'],

      // COPPER - HGZ5 → sua API traz HGUSD
      ['HGZ5', 'HGUSD', 'HG1', 'HG', 'COPPER'],
    ],
    stocks: [
      ['GOOGL'], ['AMZN'], ['TSLA'], ['MSFT'], ['NVDA'],
      ['AAPL'], ['NFLX'], ['AMD'], ['META'], ['NKE'], ['BABA']
    ],
    forex: [
      ['EURUSD'], ['USDJPY'], ['GBPUSD'], ['USDTRY'], ['USDCHF'], ['USDBRL']
    ]
  };

  // gera um Set com todas aliases normalizadas da base
  private curatedAliasSet(cat: MarketCategory): Set<string> {
    const s = new Set<string>();
    (this.curatedAliasesByCat[cat] || []).forEach(group =>
      group.forEach(k => s.add(this.keyFromAnySymbol(k))));
    return s;
  }
  // verifica se key faz parte da base
  private isInCuratedBase(cat: MarketCategory, key: string): boolean {
    return this.curatedAliasSet(cat).has(this.keyFromAnySymbol(key));
  }

  private buildWatchlistFromApi(cat: MarketCategory, apiItems: any[]): any[] {
    const items = Array.isArray(apiItems) ? apiItems : [];
    const aliasGroups = this.curatedAliasesByCat[cat] || [];

    // índice de alias -> posição na ordem base
    const aliasIndex = new Map<string, number>();
    aliasGroups.forEach((group, idx) => {
      group.forEach(a => aliasIndex.set(this.keyFromAnySymbol(a), idx));
    });

    const used = new Set<string>();
    const baseOrdered: any[] = Array(aliasGroups.length).fill(undefined);

    // 1) Preencher base na ORDEM exata
    for (const it of items) {
      const key = this.keyFromAnySymbol(this.displaySymbol(it));
      const idx = aliasIndex.get(key);
      if (idx == null) continue;
      if (!baseOrdered[idx]) {
        baseOrdered[idx] = it;
        used.add(key);
      }
    }
    const baseList = baseOrdered.filter(Boolean);

    // 2) Extras do localStorage (na ordem salva), sem duplicar base
    const extrasKeys = this.getExtras(cat);
    const extrasList: any[] = [];
    for (const k of extrasKeys) {
      if (used.has(k)) continue;
      const found = items.find(it => this.keyFromAnySymbol(this.displaySymbol(it)) === k);
      if (found) {
        extrasList.push(found);
        used.add(k);
      }
    }

    // 3) Aplica limite máximo (20). Extras entram depois da base.
    const room = Math.max(0, this.WATCH_MAX - baseList.length);
    const extrasLimited = extrasList.slice(0, room);

    return [...baseList, ...extrasLimited];
  }



  watchlistCount(): number { return (this.list || []).length; }

  togglePin(it: any, ev?: MouseEvent) {
    ev?.stopPropagation();
    const cat = this.selectedCategory;
    const key = this.keyFromAnySymbol(this.displaySymbol(it));
    const extras = this.getExtras(cat);

    // se já é extra → remover
    if (extras.includes(key)) {
      const next = extras.filter(k => k !== key);
      this.setExtras(cat, next);
    } else {
      // só permite pin em itens que NÃO são da base
      if (this.isInCuratedBase(cat, key)) return;
      if (this.watchlistCount() >= this.WATCH_MAX) return;

      this.setExtras(cat, [...extras, key]);
    }

    // reconstruir lista mantendo seleção
    this.list = this.buildWatchlistFromApi(cat, this.all[cat] || []);
    this.applyFilters(false);

    // se removeu o selecionado (e ele era extra), seleciona o 1º disponível
    if (this.selected && !this.list.find(x => this.displaySymbol(x) === this.displaySymbol(this.selected))) {
      if (this.list[0]) this.selectItem(this.list[0], true);
    }
  }

  // ---- Modal ----
  openAddModal() {
    this.modalSearch = '';
    this.refreshCandidates();
    this.addModalOpen = true;
  }
  closeAddModal() { this.addModalOpen = false; }

  private currentWatchKeys(): Set<string> {
    return new Set(((this.list || []).map(it => this.keyFromAnySymbol(this.displaySymbol(it)))));
  }

  refreshCandidates() {
    const cat = this.selectedCategory;
    const pool = this.all[cat] || [];
    const t = (this.modalSearch || '').trim().toLowerCase();
    const exclude = this.currentWatchKeys(); // base + extras já na lista

    // candidatos: tudo que NÃO está no watchlist atual
    let arr = pool.filter(it => !exclude.has(this.keyFromAnySymbol(this.displaySymbol(it))));

    if (t) {
      arr = arr.filter(it => {
        const sym = this.displaySymbol(it).toLowerCase();
        const name = (this.displayName(it) || '').toLowerCase();
        return sym.includes(t) || name.includes(t);
      });
    }

    this.modalCandidates = arr.slice(0, 100); // segurança
  }

  pinFromModal(it: any) {
    if (!it) return;
    if (this.watchlistCount() >= this.WATCH_MAX) return;

    const cat = this.selectedCategory;
    const key = this.keyFromAnySymbol(this.displaySymbol(it));
    if (this.isInCuratedBase(cat, key)) return; // não pinamos base

    const extras = this.getExtras(cat);
    if (!extras.includes(key)) this.setExtras(cat, [...extras, key]);

    // reconstruir a watchlist e fechar
    this.list = this.buildWatchlistFromApi(cat, this.all[cat] || []);
    this.applyFilters(false);
    this.addModalOpen = false;
  }


  private catToDirection: Record<MarketCategory, 'forex' | 'indexes' | 'commodities' | 'crypto' | 'stocks'> = {
    forex: 'forex',
    indices: 'indexes',       // ⚠️ diferença aqui
    commodities: 'commodities',
    crypto: 'crypto',
    stocks: 'stocks',
  };

  // devolve a URL de fallback para a categoria atual
  private fallbackLogoForCategory(cat: MarketCategory): string {
    const dir = this.catToDirection[cat];
    const found = this.directions.find(d => d.value === dir);
    // se não encontrar por algum motivo, usa a de "stocks" como último recurso
    return found?.label || (this.directions.find(d => d.value === 'stocks')?.label ?? '');
  }

  // fonte da imagem já com fallback se antes falhou
  logoSrc(it: any): string {
    const key = this.keyFromAnySymbol(this.displaySymbol(it));
    if (this.brokenLogos.has(key)) {
      return this.fallbackLogoForCategory(this.selectedCategory);
    }
    // tenta o logo padrão (FMP)
    return this.urlSymbol(this.displaySymbol(it));
  }

  // handler do erro <img> → troca para o fallback
  onLogoError(it: any, ev?: Event) {
    const key = this.keyFromAnySymbol(this.displaySymbol(it));
    if (!this.brokenLogos.has(key)) this.brokenLogos.add(key);

    // troca imediatamente o src da imagem que quebrou
    const img = ev?.target as HTMLImageElement | undefined;
    if (img) {
      img.src = this.fallbackLogoForCategory(this.selectedCategory);
    }

    // e avisa o angular para re-renderizar outras ocorrências
    this.cdr.markForCheck();
  }

  // dentro do HomebrokerComponent

  /** Converte o símbolo amigável (UI) para o símbolo que o backend/FMP espera. */
  private mapToBackendSymbol(sym: string, cat: MarketCategory): string {
    if (!sym) return sym;
    const s = sym.trim().toUpperCase();
    if (s.startsWith('^')) return s; // já OK

    if (cat === 'indices') {
      switch (s) {
        case 'RUT': return '^RUT';            // Russell 2000
        case 'NDX': return '^NDX';            // Nasdaq 100
        case 'DJI': return '^DJI';            // Dow Jones 30
        case 'SPX':
        case 'US500':
        case 'GSPC':
        case 'SP500': return '^GSPC';          // S&P 500
        // adicione mapeamentos extras se usar outros índices “sem ^”
        default: return s;
      }
    }
    return s;
  }

  /** Lucro/prejuízo estimado se o preço bater no TP atual */
  /** Lucro/prejuízo estimado se o preço bater no TP atual (regra 10% da margem por US$1) */
  tpPotentialProfit(): number | null {
    const tp = this.order.tpPrice;
    if (tp == null || !Number.isFinite(tp)) return null;

    const entry = this.priceForEquivalence(); // preço de entrada (locked/market)
    if (!entry || !Number.isFinite(entry) || entry <= 0) return null;

    const volume = Number(this.order.volume) || 0;
    if (volume <= 0) return null;

    const isBuy = this.order.side === 'BUY';

    // margem para este volume (≈ 41.64 no seu exemplo)
    const margin = this.equivalentValue(volume); // volume * lot * price

    // regra de negócio: para cada US$ 1 de movimento, lucro = 10% da margem
    const profitPerDollar = margin * 0.10;

    // diferença de preço em dólares
    const priceDiff = isBuy ? (tp - entry) : (entry - tp);

    const pnl = priceDiff * profitPerDollar;

    if (!Number.isFinite(pnl)) return null;
    return Number(pnl.toFixed(2));  // dinheiro, 2 casas
  }


  /** Classe de cor para o valor de TP */
  tpPnlClass(pnl: number): string {
    if (pnl > 0) return 'positive';   // verde
    if (pnl < 0) return 'negative';   // vermelho
    return '';
  }

  abs(value: number | null | undefined): number {
    if (value == null) return 0;
    return Math.abs(value);
  }

  onTpPriceInput(raw: string) {
    // comportamento estilo maquininha:
    // 1   -> 0.01
    // 12  -> 0.12
    // 123 -> 1.23
    if (raw == null) {
      this.tpPriceRaw = '';
      this.order.tpPrice = null;
      return;
    }

    // mantém só dígitos (ignora ponto, vírgula, espaços etc.)
    let digits = String(raw).replace(/\D/g, '');

    // se não sobrou nada, limpa o campo
    if (!digits) {
      this.tpPriceRaw = '';
      this.order.tpPrice = null;
      return;
    }

    // número de casas decimais (estilo moeda/maquininha)
    const DECIMALS = 2;

    // remove zeros à esquerda para evitar crescer infinito em 0.00..., 
    // mas garante pelo menos DECIMALS+1 dígitos para poder montar "0.xx"
    digits = digits.replace(/^0+/, '');
    if (digits.length <= DECIMALS) {
      digits = digits.padStart(DECIMALS + 1, '0');
    }

    // separa parte inteira e decimal
    const intPart = digits.slice(0, digits.length - DECIMALS);
    const decPart = digits.slice(-DECIMALS);

    const valueStr = intPart + '.' + decPart;
    const value = Number(valueStr);

    if (!Number.isFinite(value)) {
      this.order.tpPrice = null;
      this.tpPriceRaw = '';
      return;
    }

    // valor numérico usado no cálculo de TP
    this.order.tpPrice = value;

    // formata visualmente com separador americano: 1,234.56
    this.tpPriceRaw = value.toLocaleString('en-US', {
      minimumFractionDigits: DECIMALS,
      maximumFractionDigits: DECIMALS,
      // se quiser SEM separador de milhar, descomente:
      // useGrouping: false
    });
  }


  get selectedBalanceValue(): number {
    if (this.selectedBalanceType === 'demo') {
      return Number(this.user?.saldoUtipDemo ?? 0);
    }
    return Number(this.user?.saldoUtip ?? 0);
  }

  toggleBalanceDropdown(): void {
    this.balanceDropdownOpen = !this.balanceDropdownOpen;
  }

  selectBalanceType(type: 'real' | 'demo'): void {
    this.selectedBalanceType = type;
    this.balanceDropdownOpen = false;
    // 👇 grava o novo tipo no estado salvo
    this.saveStateDebounced();
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const target = ev.target as Node | null;
    if (this.balanceDropdownOpen && target && !this.el.nativeElement.contains(target)) {
      this.balanceDropdownOpen = false;
    }
  }

  /** Normaliza valor monetário para 2 casas decimais (arredonda) */
  private normalizeToCents(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Trunca para 2 casas (sem arredondar para cima) */
  private truncateToCents(n: number): number {
    return Math.trunc(n * 100) / 100;
  }

  private restoreState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);

      if (s.cat) this.selectedCategory = s.cat as MarketCategory;

      if (s.interval) {
        const opt = this.timeframeOptions.find(o => o.key === s.interval);
        if (opt) {
          this.currentInterval = opt.key;
          this.candleMs = opt.ms;
          this.intervalLabel = opt.label;
        }
      }

      if (Number.isFinite(s.candlesOnScreen)) this.candlesOnScreen = Number(s.candlesOnScreen);
      if (Number.isFinite(s.panOffset)) this.panOffset = Number(s.panOffset);

      if (s.sym) this.pendingSelectSymbol = String(s.sym);

      if (s.balanceType === 'real' || s.balanceType === 'demo') {
        this.selectedBalanceType = s.balanceType;
      }

      // 👇 restaura abas
      if (Array.isArray(s.chartTabs)) {
        this.chartTabs = s.chartTabs
          .filter((t: any) => t && t.symbol && t.category)
          .map((t: any) => ({
            id: t.id || this.makeTabId(t.symbol, t.category),
            symbol: String(t.symbol),
            category: t.category as MarketCategory,
          }));
      }
      this.activeTabId = this.chartTabs.length
        ? (s.activeTabId ?? this.chartTabs[0].id)
        : null;
    } catch { }
  }

  private makeTabId(symbol: string, cat: MarketCategory): string {
    return `${cat}:${this.keyFromAnySymbol(symbol)}:${Date.now()}`;
  }


  selectAsset(asset: Asset) {
    // aqui você chama o callback / output para o parent
    // this.closeModal();
  }
  private loadAllAssets() {
    this.assetsLoading = true;

    const cats: AssetCategory[] = ['FOREX', 'INDICES', 'COMMODITIES', 'CRYPTO', 'STOCKS'];

    const reqs = cats.map(cat =>
      this.api.getCategoryList(cat.toLowerCase() as MarketCategory).pipe(
        timeout(12000),
        catchError(() => of([]))
      )
    );

    forkJoin(reqs)
      .pipe(finalize(() => {
        this.assetsLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe((res: any[][]) => {
        const out: Asset[] = [];
        cats.forEach((cat, idx) => {
          (res[idx] || []).forEach(item => {
            out.push({
              symbol: this.displaySymbol(item),
              name: this.displayName(item),
              category: cat,
            });

          });
        });

        this.allAssets = out;
        this.applyPopularFilter(); // atualiza a lista inicial
      });
  }


  /** Foca/seleciona uma aba (se quiser exibir info do ativo em outro lugar) */
  focusAsset(asset: Asset): void {
    this.currentAsset = asset;
  }

  /** Remove somente aquela aba/ativo */
  removeAsset(asset: Asset): void {
    this.selectedAssets = this.selectedAssets.filter(a => a.symbol !== asset.symbol);
    if (this.currentAsset?.symbol === asset.symbol) {
      this.currentAsset = null;
    }
  }

  /** Fecha o modal via Bootstrap */
  private closeModal(): void {
    const modalEl = document.getElementById('assetsModal');
    if (modalEl) {
      const instance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      instance.hide();
    }
  }

  closeChartTab(tab: ChartTab, ev: MouseEvent): void {
    // não deixar o clique no X ativar a aba
    ev.stopPropagation();

    const idx = this.chartTabs.findIndex(t => t.id === tab.id);
    if (idx === -1) return;

    const wasActive = this.activeTabId === tab.id;

    // remove a aba
    this.chartTabs.splice(idx, 1);

    if (wasActive) {
      // escolhe próxima aba ativa: tenta a mesma posição, depois a anterior, depois a primeira
      const next =
        this.chartTabs[idx] ||
        this.chartTabs[idx - 1] ||
        this.chartTabs[0];

      if (next) {
        this.activateTab(next);   // reaproveita sua lógica de ativar aba
      } else {
        // sem abas restantes
        this.activeTabId = null;
        // opcional: manter gráfico atual ou limpar, depende do que você quiser
        // this.selected = null;
        // this.resetChartSeries();
      }
    }

    this.saveStateDebounced(); // persiste estado no localStorage
  }

}