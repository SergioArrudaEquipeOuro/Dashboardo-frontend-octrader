import {
  Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener
} from '@angular/core';
import { CoinService, Memecoin } from 'src/app/services/coin.service';
import { createChart, ColorType, CandlestickSeries, type IChartApi } from 'lightweight-charts';

type UsuarioMemecoinDto = {
  quantidade: number;
  memecoin?: Memecoin;
  memecoinId?: number;
};

@Component({
  selector: 'app-painel-client05',
  templateUrl: './painel-client05.component.html',
  styleUrls: ['./painel-client05.component.css']
})
export class PainelClient05Component implements OnInit, OnChanges {
  @Input() user: any;
  @Input() activeEnterprise: any;

  private ro?: ResizeObserver;

  memecoins: Memecoin[] = [];
  visiveis: Memecoin[] = [];
  filtradas: Memecoin[] = [];
  pageRows: Memecoin[] = [];

  // paginação
  page = 1;
  pageSize = 10;

  // status
  buscando = false;
  erro: string | null = null;
  termo = '';

  // negociação
  showTrade = false;
  sel: Memecoin | null = null;
  disponivelVenda = 0;

  @ViewChild('chartContainer', { static: false }) chartEl?: ElementRef<HTMLDivElement>;
  chart: IChartApi | undefined;
  candleSeries: any;
  historicoBruto: any[] = [];
  carregandoHist = false;
  limiteVelas = 300;

  aba: 'buy' | 'sell' = 'buy';
  valorCompra: number | null = null;
  qtdVenda: number | null = null;
  executando = false;

  previewCompra = { taxa: 0, liquido: 0, qtd: 0 };
  previewVenda = { bruto: 0, taxa: 0, liquido: 0 };

  constructor(private coin: CoinService) { }

  /* Computados paginator */
  get totalPages(): number {
    return Math.max(1, Math.ceil((this.filtradas.length || 0) / this.pageSize));
  }
  get startIndex(): number {
    if (this.filtradas.length === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }
  get endIndex(): number {
    return Math.min(this.page * this.pageSize, this.filtradas.length);
  }

  ngOnInit(): void { this.carregar(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      this.refreshHoldings();
      if (this.memecoins.length) this.recalcularVisiveis();
    }
  }

  /* ===== Helpers p/ template ===== */
  onImgError(evt: Event) {
    const el = evt.target as HTMLImageElement | null;
    if (el && el instanceof HTMLImageElement) {
      el.style.display = 'none'; // ou defina um placeholder se preferir
    }
  }
  goToPageNumber(p: number | string) {
    if (typeof p === 'number') this.goToPage(p);
  }

  /* ===== Dados ===== */
  carregar(): void {
    this.buscando = true; this.erro = null;
    this.coin.buscarTodasMemecoins().subscribe({
      next: lista => {
        this.memecoins = (lista || []).map(m => ({ ...m, whitelistedEmails: m.whitelistedEmails ?? [] }));
        this.recalcularVisiveis();
        this.refreshHoldings();
      },
      error: () => {
        this.erro = 'Falha ao carregar memecoins.';
        this.memecoins = []; this.visiveis = []; this.filtradas = []; this.updatePagination();
      },
      complete: () => this.buscando = false,
    });
  }

  private refreshHoldings(): void {
    const uid = this.user?.id;
    if (uid == null) { this.disponivelVenda = 0; return; }
    this.coin.listarMemecoinsPorUsuario(uid).subscribe({
      next: (_arr: UsuarioMemecoinDto[]) => { this.updateDisponivelAtual(); },
      error: () => { }
    });
  }

  private updateDisponivelAtual(): void {
    const uid = this.user?.id;
    const mid = this.sel?.id;
    if (!uid || !mid) { this.disponivelVenda = 0; return; }
    this.coin.obterSaldoUsuarioNaMemecoin(uid, mid).subscribe({
      next: q => this.disponivelVenda = Number(q) || 0,
      error: () => this.disponivelVenda = 0,
    });
  }

  private permitidoParaUsuario(m: Memecoin): boolean {
    if (m.allowAllUsers) return true;
    const emailUser = (this.user?.email || '').trim().toLowerCase();
    if (!emailUser) return false;
    const lista = (m.whitelistedEmails || []).map((e: string) => (e || '').trim().toLowerCase());
    return lista.includes(emailUser);
  }

  private recalcularVisiveis(): void {
    this.visiveis = this.memecoins.filter(m => !!m.active && this.permitidoParaUsuario(m));
    this.aplicarFiltro();
  }

  aplicarFiltro(): void {
    const t = (this.termo || '').toLowerCase().trim();
    this.filtradas = !t
      ? [...this.visiveis]
      : this.visiveis.filter(m =>
        (m.nome || '').toLowerCase().includes(t) ||
        (m.symbol || '').toLowerCase().includes(t)
      );
    this.page = 1;
    this.updatePagination();
  }

  trackById(_: number, m: Memecoin) { return m.id; }

  /* ===== Paginação ===== */
  private updatePagination(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pageRows = this.filtradas.slice(start, end);
  }
  goToPage(p: number) { if (!Number.isFinite(p)) return; this.page = Math.max(1, Math.min(this.totalPages, p)); this.updatePagination(); }
  prevPage() { if (this.page > 1) { this.page--; this.updatePagination(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.updatePagination(); } }

  pageList(): (number | string)[] {
    const total = this.totalPages;
    const cur = this.page;
    const out: (number | string)[] = [];
    const add = (n: number | string) => out.push(n);

    if (total <= 7) {
      for (let i = 1; i <= total; i++) add(i);
      return out;
    }
    add(1);
    if (cur > 4) add('…');
    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    for (let i = start; i <= end; i++) add(i);
    if (cur < total - 3) add('…');
    add(total);
    return out;
  }

  /* ===== Negociação / Modal ===== */
  abrirNegociacao(m: Memecoin) {
    if (!m?.id) return;
    this.sel = m; this.showTrade = true; this.aba = 'buy';
    this.valorCompra = null; this.qtdVenda = null;
    this.previewCompra = { taxa: 0, liquido: 0, qtd: 0 };
    this.previewVenda = { bruto: 0, taxa: 0, liquido: 0 };
    this.updateDisponivelAtual();

    this.carregarHistorico(m.id);
    setTimeout(() => {
      this.initChart();
      window.addEventListener('resize', this.onResize);
    }, 0);
  }

  fecharNegociacao() {
    this.showTrade = false; this.sel = null; this.historicoBruto = [];
    this.disposeChart();
  }

  @HostListener('document:keydown.escape') onEsc() { if (this.showTrade) this.fecharNegociacao(); }

  /* ===== Gráfico ===== */
  // 2) SUBSTITUA seu initChart() por este
  private initChart() {
    if (!this.chartEl?.nativeElement) return;
    this.chart?.remove();

    const container = this.chartEl.nativeElement;

    // pega dimensões reais do contêiner (inclusive quando ainda está montando)
    const rect = container.getBoundingClientRect();
    const width = Math.max(0, Math.floor(rect.width || container.clientWidth || 900));
    const height = Math.max(0, Math.floor(rect.height || container.clientHeight || 460));

    this.chart = createChart(container, {
      width, height,
      layout: { background: { type: ColorType.Solid, color: '#00000000' }, textColor: '#e9e4ff' },
      grid: { vertLines: { color: 'rgba(179,108,255,.25)' }, horzLines: { color: 'rgba(179,108,255,.14)' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 6, barSpacing: 8 },
      localization: { locale: 'pt-BR' },
    });

    this.candleSeries = (this.chart as any).addSeries(CandlestickSeries, {
      upColor: '#5CFFA5',
      downColor: '#ff9a9a',
      wickUpColor: '#5CFFA5',
      wickDownColor: '#ff9a9a',
      borderVisible: false,
    });

    // observa o contêiner e ajusta imediatamente quando a altura “entra”
    this.attachResizeObserver();

    // garante ajuste no próximo frame após abertura do modal
    requestAnimationFrame(() => this.syncChartSize());

    this.renderizarGrafico();
  }


  private onResize = () => { this.syncChartSize(); };

  // 5) SUBSTITUA disposeChart() para limpar tudo
  private disposeChart() {
    window.removeEventListener('resize', this.onResize);
    this.ro?.disconnect();
    this.ro = undefined;
    if (this.chart) { (this.chart as any).remove(); this.chart = undefined; this.candleSeries = undefined; }
  }


  private carregarHistorico(memecoinId: number) {
    this.carregandoHist = true;
    this.coin.obterHistorico(memecoinId).subscribe({
      next: (hist) => { this.historicoBruto = Array.isArray(hist) ? hist : []; this.renderizarGrafico(); },
      error: () => { this.historicoBruto = []; },
      complete: () => { this.carregandoHist = false; }
    });
  }
  recarregarHistorico() { if (this.sel?.id) this.carregarHistorico(this.sel.id); }

  renderizarGrafico() {
    if (!this.chart || !this.candleSeries) return;

    const ordenado = [...(this.historicoBruto || [])].sort(
      (a, b) => this.toEpochSeconds(a.dataHora) - this.toEpochSeconds(b.dataHora)
    );

    const data = (this.limiteVelas ? ordenado.slice(-this.limiteVelas) : ordenado)
      .map((h: any) => ({
        time: this.toEpochSeconds(h.dataHora),
        open: Number(h.valorAbertura),
        high: Number(h.valorMaximo),
        low: Number(h.valorMinimo),
        close: Number(h.valorFechamento),
      }))
      .filter(c => Number.isFinite(c.time));

    this.candleSeries.setData(data);
    (this.chart as any).timeScale().fitContent();
  }

  /* ===== Previews ===== */
  atualizarPreview() {
    const taxa = (this.sel?.taxa ?? 0) / 100;
    const preco = this.sel?.valorAtual ?? 0;

    const valor = Math.max(0, +(this.valorCompra ?? 0));
    const taxaR$ = valor * taxa;
    const liquido = Math.max(0, valor - taxaR$);
    const qtd = preco > 0 ? (liquido / preco) : 0;
    this.previewCompra = { taxa: taxaR$, liquido, qtd };

    const qtdV = Math.max(0, +(this.qtdVenda ?? 0));
    const bruto = qtdV * preco;
    const taxaVenda = bruto * taxa;
    const liquidoVenda = Math.max(0, bruto - taxaVenda);
    this.previewVenda = { bruto, taxa: taxaVenda, liquido: liquidoVenda };
  }

  podeComprar(): boolean {
    const min = this.sel?.aportIn ?? 0;
    const v = +(this.valorCompra ?? 0);
    return !!this.sel?.id && v >= min && v > 0 && !this.executando;
  }
  podeVender(): boolean {
    const min = this.sel?.aportOut ?? 0;
    const q = +(this.qtdVenda ?? 0);
    const disp = this.disponivelVenda || 0;
    return !!this.sel?.id && q >= min && q > 0 && q <= disp && !this.executando;
  }

  confirmarCompra() {
    if (!this.podeComprar() || !this.sel?.id) return;
    const usuarioId = this.user?.id;
    if (usuarioId == null) return;

    this.executando = true;
    this.coin.converterSaldoParaMemecoin(usuarioId, this.sel.id, +(this.valorCompra || 0)).subscribe({
      next: () => {
        alert('Compra realizada com sucesso.');
        this.carregar();
        this.refreshHoldings();
        this.recarregarHistorico();
        this.valorCompra = null;
        this.atualizarPreview();
        this.updateDisponivelAtual();
      },
      error: (e) => alert(e?.error?.error || 'Falha na compra.'),
      complete: () => this.executando = false
    });
  }

  confirmarVenda() {
    if (!this.podeVender() || !this.sel?.id) return;
    const usuarioId = this.user?.id;
    if (usuarioId == null) return;

    this.executando = true;
    this.coin.converterMemecoinParaSaldo(usuarioId, this.sel.id, +(this.qtdVenda || 0)).subscribe({
      next: () => {
        alert('Venda realizada com sucesso.');
        this.carregar();
        this.refreshHoldings();
        this.recarregarHistorico();
        this.qtdVenda = null;
        this.atualizarPreview();
        this.updateDisponivelAtual();
      },
      error: (e) => alert(e?.error?.error || 'Falha na venda.'),
      complete: () => this.executando = false
    });
  }

  private toEpochSeconds(dt: string): number {
    if (!dt) return 0;
    const [datePart, timePartRaw] = dt.split('T');
    if (!datePart || !timePartRaw) return 0;
    const [hh, mm, ssFrac] = timePartRaw.split(':');
    if (hh === undefined || mm === undefined || ssFrac === undefined) return 0;
    const [ssStr, fracRaw] = ssFrac.split('.');
    const ss = Number(ssStr || '0');
    const ms = Number((fracRaw || '').substring(0, 3).padEnd(3, '0'));
    const [yyyy, MM, dd] = datePart.split('-').map(Number);
    const d = new Date(yyyy, (MM || 1) - 1, dd || 1, Number(hh), Number(mm), ss, ms);
    return Math.floor(d.getTime() / 1000);
  }















  // 3) NOVOS: utilitários de resize
  private attachResizeObserver() {
    const el = this.chartEl?.nativeElement;
    if (!el) return;

    this.ro?.disconnect();
    this.ro = new ResizeObserver(() => this.syncChartSize());
    this.ro.observe(el);

    window.addEventListener('resize', this.onResize);
  }

  private syncChartSize() {
    if (!this.chart || !this.chartEl?.nativeElement) return;
    const rect = this.chartEl.nativeElement.getBoundingClientRect();
    const w = Math.max(0, Math.floor(rect.width));
    const h = Math.max(0, Math.floor(rect.height));
    if (w > 0 && h > 0) this.chart.applyOptions({ width: w, height: h });
  }

  private roundTo(v: number, decimals: number) {
    const f = Math.pow(10, decimals);
    return Math.round((v + Number.EPSILON) * f) / f;
  }

  setPercentCompra(pct: number) {
    const saldo = Number(this.user?.saldo) || 0;
    // usa o saldo do usuário
    this.valorCompra = this.roundTo((saldo * pct) / 100, 2);
    this.atualizarPreview();
  }

  setPercentVenda(pct: number) {
    const disponivel = Number(this.disponivelVenda) || 0;
    // usa a quantidade disponível para vender
    this.qtdVenda = this.roundTo((disponivel * pct) / 100, 8);
    this.atualizarPreview();
  }

}
