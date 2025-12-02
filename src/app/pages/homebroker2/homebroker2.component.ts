import {
  Component,
  OnInit,
  OnChanges,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription, interval, of } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';
import { UtipService, UtipTrade } from 'src/app/services/utip.service';
import { ApiService, MarketCategory } from 'src/app/services/api.service';


type MarketDirection = 'forex' | 'indexes' | 'commodities' | 'crypto' | 'stocks';
interface DirectionIcon { value: MarketDirection; label: string }

@Component({
  selector: 'app-homebroker2',
  templateUrl: './homebroker2.component.html',
  styleUrls: ['./homebroker2.component.css'],
})
export class Homebroker2Component implements OnInit, OnChanges, OnDestroy {
  /** ÚNICOS @Input que permanecem */
  @Input() clienteEmail: string | null = null;
  @Input() activeEnterprise: any;
  @Input() balanceType: 'real' | 'demo' = 'real';

  /** Opcional: avisa o pai para atualizar saldo após fechar */
  @Output() userNeedsRefresh = new EventEmitter<void>();

  /** ===== Config de logs ===== */
  private readonly LOG = true;
  private log(...args: any[]) { if (this.LOG) console.log('[HB2]', ...args); }
  private warn(...args: any[]) { if (this.LOG) console.warn('[HB2]', ...args); }
  private error(...args: any[]) { if (this.LOG) console.error('[HB2]', ...args); }

  /** Paginação (interna) */
  pageSize = 10;
  page = 1;

  /** Controle para não iniciar polling duas vezes */
  private tradesStarted = false;
  private brokenLogos = new Set<string>();

  /** Filtros */
  operationTypeFilter: 'ALL' | 'BUY' | 'SELL' = 'ALL';
  marketCategoryFilter: 'ALL' | MarketCategory = 'ALL';
  statusFilter: 'ALL' | 'OPEN' | 'CLOSE' = 'ALL';

  selectedCategory: MarketCategory = 'stocks';

  /** Estado */
  loadingTrades = true;        // spinner só liga em loadTrades(true)
  trades: UtipTrade[] = [];

  /** Timers */
  private readonly TRADES_INTERVAL_MS = 15_000;
  private readonly QUOTES_INTERVAL_MS = 10_000;
  private tradesTimerSub?: Subscription;
  private quotesTimerSub?: Subscription;

  /** Quotes cache (independente) */
  private isRefreshingQuotes = false;
  private listsByCat: Partial<Record<MarketCategory, any[]>> = {};
  livePrices = new Map<string, number>();
  private prevPrices = new Map<string, number>(); // p/ cor de variação

  /** Encerramentos em andamento */
  private closingIds = new Set<number>();

  constructor(
    private utip: UtipService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) { }

  /* ===== Ciclo de vida ===== */
  ngOnInit(): void {
    this.log('ngOnInit', { clienteEmail: this.clienteEmail });

    if (this.clienteEmail) {
      this.startTradesPolling();   // 1ª carga COM spinner
    } else {
      this.loadingTrades = false;  // evita spinner até chegar o email
    }
    this.startQuotesPolling();     // quotes sempre sem spinner
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clienteEmail'] && !changes['clienteEmail'].firstChange) {
      if (this.clienteEmail) this.startTradesPolling();
      else this.stopTradesPolling();
    }

    // quando trocar REAL <-> DEMO, volta pra página 1
    if (changes['balanceType'] && !changes['balanceType'].firstChange) {
      this.setPage(1);
    }
  }


  ngOnDestroy(): void {
    this.stopTradesPolling();
    this.stopQuotesPolling();
  }

  /* ===== Polling de TRADES ===== */
  private startTradesPolling(): void {
    if (this.tradesStarted) return;
    this.tradesStarted = true;

    this.stopTradesPolling();

    // 1ª carga com spinner
    this.loadTrades(true);

    // Atualizações silenciosas (sem spinner) no intervalo
    this.tradesTimerSub = interval(this.TRADES_INTERVAL_MS)
      .subscribe(() => this.loadTrades(false));
  }
  private stopTradesPolling(): void {
    this.tradesTimerSub?.unsubscribe();
    this.tradesTimerSub = undefined;
    this.tradesStarted = false;
  }

  /* ===== Carregar trades =====
     showSpinner=true -> mostra spinner (primeiro load / botão Atualizar)
     showSpinner=false -> atualização silenciosa para o polling            */
  private loadTrades(showSpinner: boolean): void {
    if (!this.clienteEmail) {
      if (showSpinner) {
        this.loadingTrades = false;
      }
      return;
    }

    if (showSpinner) this.loadingTrades = true;

    this.utip.listByEmail(this.clienteEmail)
      .pipe(finalize(() => { if (showSpinner) this.loadingTrades = false; }))
      .subscribe({
        next: (rows) => {
          this.trades = rows || [];
          console.log(rows)

          // Só resetar a página em cargas "explícitas"
          if (showSpinner) this.setPage(1);

          // LOG #1: lista dos ativos de cada UtipTrade (símbolo + categoria vinda do UTIP)
          this.log(
            'Trades do UTIP (symbol, marketCategory):',
            JSON.parse(JSON.stringify(this.trades.map(t => ({
              symbol: t.symbol,
              marketCategory: (t as any).marketCategory
            }))))
          );

          // Atualiza preços (isso nunca liga spinner)
          this.refreshLivePrices();
        },
        error: (err) => {
          this.error('Falha ao carregar trades', err);
          if (showSpinner) {
            this.trades = [];
            this.setPage(1);
          }
        }
      });
  }

  /* ===== Polling de QUOTES ===== */
  private startQuotesPolling(): void {
    this.stopQuotesPolling();
    this.refreshLivePrices(); // 1x agora (sem spinner)
    this.quotesTimerSub = interval(this.QUOTES_INTERVAL_MS)
      .subscribe(() => this.refreshLivePrices());
  }
  private stopQuotesPolling(): void {
    this.quotesTimerSub?.unsubscribe();
    this.quotesTimerSub = undefined;
  }

  /**
   * Busca listas por categoria (usando APENAS t.marketCategory do UTIP),
   * compara cada símbolo do portfolio com a lista da API e atualiza preços.
   * Sem spinner visual; com logs detalhados para depuração.
   */
  private refreshLivePrices(): void {
    if (this.isRefreshingQuotes) return;
    this.isRefreshingQuotes = true;

    const trades = this.trades || [];
    if (!trades.length) { this.isRefreshingQuotes = false; return; }

    // Agrupa trades pela categoria vinda do UTIP (sem inferências)
    const tradesByCat = new Map<MarketCategory, UtipTrade[]>();
    for (const t of trades) {
      const cat = (t as any).marketCategory as MarketCategory;
      if (!cat) continue;
      if (!tradesByCat.has(cat)) tradesByCat.set(cat, []);
      tradesByCat.get(cat)!.push(t);
    }

    const cats = Array.from(tradesByCat.keys());
    if (!cats.length) { this.isRefreshingQuotes = false; return; }

    let pending = cats.length;
    const done = () => {
      pending--;
      if (pending <= 0) {
        this.isRefreshingQuotes = false;
      }
    };

    for (const cat of cats) {
      const tradesThisCat = tradesByCat.get(cat) || [];
      const wantedKeys = Array.from(new Set(
        tradesThisCat.map(t => this.keyFromAnySymbol(t.symbol))
          .flatMap(k => this.aliasesFor(k))
          .filter(Boolean)
      ));

      // LOG: início da busca na API
      this.log('iniciando busca de ativos com a api', {
        categoria: cat,
        qtdTradesNaCategoria: tradesThisCat.length,
        ativosDoUtipTrade: JSON.parse(JSON.stringify(tradesThisCat.map(t => ({
          symbol: t.symbol, marketCategory: (t as any).marketCategory
        })))),
        chavesProcuradas: wantedKeys
      });

      this.api.getCategoryList(cat)
        .pipe(catchError((err) => {
          this.error('getCategoryList falhou para', cat, err);
          return of([]);
        }))
        .subscribe((items: any[]) => {
          const listForCat = Array.isArray(items) ? items : [];
          this.listsByCat[cat] = listForCat;

          // LOG: lista retornada
          this.log('Lista de ativos retornado pela api', {
            categoria: cat,
            total: listForCat.length,
            amostra: JSON.parse(JSON.stringify(listForCat.slice(0, 5)))
          });

          // Normaliza símbolos da API para comparação
          const apiIndex = new Map<string, any[]>();
          for (const it of listForCat) {
            const norm = this.keyFromAnySymbol(this.displaySymbol(it));
            if (!norm) continue;
            if (!apiIndex.has(norm)) apiIndex.set(norm, []);
            apiIndex.get(norm)!.push(it);
          }

          // LOG: começando comparações
          this.log('Comparando símbolos da categoria', cat, {
            chavesApiNormalizadas: Array.from(apiIndex.keys()).slice(0, 20)
          });

          let foundCount = 0;
          const notFoundForCat: Array<{ symbol: string; key: string; aliases: string[] }> = [];

          for (const t of tradesThisCat) {
            const key = this.keyFromAnySymbol(t.symbol);
            const aliases = this.aliasesFor(key);

            this.log('Procurando ativo do utiptrade na lista da API', {
              categoria: cat,
              trade: { symbol: t.symbol, marketCategory: (t as any).marketCategory },
              key,
              aliases
            });

            // encontra por qualquer alias
            let foundItem: any | null = null;
            for (const a of aliases) {
              const cands = apiIndex.get(a);
              if (cands && cands.length) {
                foundItem = cands[0];
                break;
              }
            }

            if (foundItem) {
              foundCount++;
              // LOG: item encontrado (JSON completo)
              this.log('Ativo encontrado na lista da API', {
                categoria: cat,
                symbol: t.symbol,
                item: JSON.parse(JSON.stringify(foundItem))
              });

              // aplica preço (sem resetar valores -> sem spinner nas células)
              const px = this.pickItemPrice(foundItem);
              if (typeof px === 'number' && isFinite(px)) {
                this.setPriceForKeyAndAliases(key, px);
              }
            } else {
              // LOG: não encontrado
              this.warn('Ativo NÃO encontrado na lista da API', {
                categoria: cat,
                symbol: t.symbol,
                key,
                aliases
              });
              notFoundForCat.push({ symbol: t.symbol, key, aliases });
            }
          }

          // LOG: resumo final por categoria
          this.log('Lista de ativos  comparados com os ativos do utiptrade', {
            categoria: cat,
            encontrados: foundCount,
            naoEncontrados: notFoundForCat
          });

          done();
        });
    }
  }

  /* ===== Paginação/Filtro ===== */
  get filteredTrades(): UtipTrade[] {
    return (this.trades || []).filter(t => {
      const typeOk =
        this.operationTypeFilter === 'ALL' ||
        (t.operationType || '').toUpperCase() === this.operationTypeFilter;

      const status = (t.status || '').toUpperCase() as 'OPEN' | 'CLOSE' | '';
      const statusOk =
        this.statusFilter === 'ALL' || status === this.statusFilter;

      // usa APENAS a categoria que veio do UTIP (sem inferência)
      const cat = (t as any).marketCategory as MarketCategory | undefined;
      const catOk =
        this.marketCategoryFilter === 'ALL' ||
        (!!cat && cat === this.marketCategoryFilter);

      // === FILTRO DEMO / REAL ===
      const isDemo = !!(t as any).demo; // garante booleano
      const demoOk =
        this.balanceType === 'demo'
          ? isDemo               // se DEMO selecionado → só t.demo === true
          : !isDemo;             // se REAL selecionado → só t.demo === false

      return typeOk && statusOk && catOk && demoOk;
    });
  }



  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTrades.length / this.pageSize));
  }
  get pagedTrades(): UtipTrade[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredTrades.slice(start, start + this.pageSize);
  }
  setPage(p: number) { this.page = Math.max(1, Math.min(this.totalPages, p)); }
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

  trackByTrade = (i: number, t: UtipTrade) =>
    t.id ?? `${t.symbol}|${t.openDate}|${t.openTime}|${i}`;

  /* ===== Fechar operação ===== */
  isClosing(id: number): boolean { return this.closingIds.has(id); }

  onCloseTrade(t: UtipTrade): void {
    if (!t?.id || (t.status || '').toUpperCase() === 'CLOSE') return;

    const ok = confirm(`Encerrar a operação ${t.symbol} (#${t.id})?`);
    if (!ok) return;

    this.closingIds.add(t.id!);

    const symbolKey = this.keyFromAnySymbol(t.symbol);
    const localPx = this.getLivePrice(symbolKey);

    const finalizeClose = (px: number | null) => {
      const body = px != null ? { closePrice: Number(px.toFixed(6)) } : {};
      this.utip.close(t.id!, body).subscribe({
        next: (res) => {
          const idx = this.trades.findIndex(x => x.id === t.id);
          if (idx >= 0) this.trades[idx] = res;
          this.closingIds.delete(t.id!);
          this.userNeedsRefresh.emit();
        },
        error: () => { this.closingIds.delete(t.id!); }
      });
    };

    finalizeClose(localPx ?? null);
  }

  /* ===== Lucro em tempo real ===== */
  /* ===== Lucro em tempo real ===== */
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




  profitClass(t: UtipTrade): string {
    const v = this.profitValue(t);
    if (v == null) return '';
    return v > 0 ? 'positive' : v < 0 ? 'negative' : '';
  }

  priceChangeClass(t: UtipTrade): string {
    const key = this.keyFromAnySymbol(t.symbol);
    const now = this.livePrices.get(key);
    const prev = this.prevPrices.get(key);
    if (typeof now !== 'number') return '';
    if (typeof prev !== 'number') return '';
    return now > prev ? 'tick-up' : (now < prev ? 'tick-down' : '');
  }

  /* ===== Helpers ===== */
  private keyFromAnySymbol(s: string | null | undefined): string {
    if (!s) return '';
    let k = String(s).trim().toUpperCase();
    if (k.includes(':')) k = k.split(':').pop()!;
    return k.replace(/[^A-Z0-9]/g, '');
  }

  /** USD⇄USDT como aliases */
  private aliasesFor(key: string): string[] {
    if (key.endsWith('USDT')) return [key, key.replace(/USDT$/, 'USD')];
    if (key.endsWith('USD')) return [key, key.replace(/USD$/, 'USDT')];
    return [key];
  }

  /** Atualiza prev→now para permitir cor de variação (sem zerar valores) */
  private setPriceForKeyAndAliases(key: string, px: number): void {
    for (const k of this.aliasesFor(key)) {
      const prev = this.livePrices.get(k);
      if (typeof prev === 'number') this.prevPrices.set(k, prev);
      this.livePrices.set(k, px);
    }
  }

  /** Remove prefixo de exchange e normaliza */
  private displaySymbol(it: any): string {
    let s = (it?.symbol || it?.ticker || it?.pair || it?.code || it?.name || '').toString();
    if (s.includes(':')) s = s.split(':').pop()!;
    return s.replace(/[^\w]/g, '').toUpperCase();
  }

  /** Aceita vários campos comuns de preço (listas e quotes) */
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

  /** Botão "Atualizar" → recarrega trades COM spinner e atualiza quotes */
  reload(): void {
    this.loadTrades(true);
    this.refreshLivePrices();
  }

  /** Usado no template para mostrar o preço atual de um trade */
  livePriceFor(t: UtipTrade): number | null {
    return this.getLivePrice(t?.symbol);
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

  // dentro do componente
  slOf(t: UtipTrade): number | null {
    const raw = (t as any).sl ?? (t as any).stopLoss ?? (t as any).stopLossPrice;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  logoSrc(it: any): string {
    const key = this.keyFromAnySymbol(this.displaySymbol(it));
    if (this.brokenLogos.has(key)) {
      return this.fallbackLogoForCategory(this.selectedCategory);
    }
    // tenta o logo padrão (FMP)
    return this.urlSymbol(this.displaySymbol(it));
  }

  public urlSymbol(symbol: string): string {
    const base = (symbol || '').trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
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

  private fallbackLogoForCategory(cat: MarketCategory): string {
    const dir = this.catToDirection[cat];
    const found = this.directions.find(d => d.value === dir);
    // se não encontrar por algum motivo, usa a de "stocks" como último recurso
    return found?.label || (this.directions.find(d => d.value === 'stocks')?.label ?? '');
  }

  private catToDirection: Record<MarketCategory, 'forex' | 'indexes' | 'commodities' | 'crypto' | 'stocks'> = {
    forex: 'forex',
    indices: 'indexes',       // ⚠️ diferença aqui
    commodities: 'commodities',
    crypto: 'crypto',
    stocks: 'stocks',
  };

  readonly directions: DirectionIcon[] = [
    { value: 'forex', label: 'assets/img/forex.png' },
    { value: 'indexes', label: 'assets/img/index.png' },
    { value: 'commodities', label: 'assets/img/commodities.png' },
    { value: 'crypto', label: 'assets/img/cripto.png' },
    { value: 'stocks', label: 'assets/img/stocks.png' },
  ];
}
