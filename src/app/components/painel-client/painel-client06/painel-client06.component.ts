import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { Bot } from 'src/app/models/bot';

Chart.register(...registerables);

type Operation = {
  id: number;
  saldo?: number | null;
  lucro?: number | null;
  abertura?: number | null;
  fechamento?: number | null;
  volume?: number | null;
  token?: string;
  data: string;        // ISO
  visivel?: boolean;
};

type SeriesKind = 'stocks' | 'commodities' | 'indices' | 'forex+crypto';

@Component({
  selector: 'app-painel-client06',
  templateUrl: './painel-client06.component.html',
  styleUrls: ['./painel-client06.component.css']
})
export class PainelClient06Component implements AfterViewInit, OnChanges, OnDestroy {

  @ViewChild('stocksCanvas') stocksRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('commoditiesCanvas') commoditiesRef!: ElementRef<HTMLCanvasElement>; // novo (antes era crypto)
  @ViewChild('forexCanvas') forexRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('indicesCanvas') indicesRef!: ElementRef<HTMLCanvasElement>;

  @Input() bots: Bot[] = [];

  private charts: Chart[] = [];
  private viewReady = false;

  // deltas para os badges (MoM)
  stocksDelta = 0;
  commoditiesDelta = 0; // novo
  forexDelta = 0;
  indicesDelta = 0;

  // flags de "Primeiro mês"
  stocksFirstMonth = false;
  commoditiesFirstMonth = false; // novo
  forexFirstMonth = false;
  indicesFirstMonth = false;

  // Totais de saldo por direção (exibidos nos títulos)
  stocksTotal = 0;
  commoditiesTotal = 0; // novo
  forexTotal = 0;       // agora: forex + cripto
  indicesTotal = 0;

  private readonly TZ = 'America/Bahia';

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.rebuildCharts(); // tenta montar com os bots atuais
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bots'] && this.viewReady) {
      this.rebuildCharts();
    }
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  // ====== CORE ======

  private rebuildCharts(): void {
    // limpa gráficos existentes
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    // séries por categoria (mês atual, soma diária)
    const stocks = this.seriesFor('stocks');
    const commodities = this.seriesFor('commodities');  // separado
    const forex = this.seriesFor('forex+crypto');       // combinado
    const indices = this.seriesFor('indices');

    // Totais por direção (para títulos)
    this.stocksTotal = this.sumSaldo('stocks');
    this.commoditiesTotal = this.sumSaldo('commodities');
    this.forexTotal = this.sumSaldo('forex+crypto');
    this.indicesTotal = this.sumSaldo('indices');

    // deltas MoM e flags de primeiro mês por categoria
    const { delta: dStocks, first: fStocks } = this.deltaForMonth('stocks');
    const { delta: dCommo, first: fCommo } = this.deltaForMonth('commodities');
    const { delta: dForex, first: fForex } = this.deltaForMonth('forex+crypto');
    const { delta: dIndices, first: fIndices } = this.deltaForMonth('indices');

    this.stocksDelta = dStocks; this.stocksFirstMonth = fStocks;
    this.commoditiesDelta = dCommo; this.commoditiesFirstMonth = fCommo;
    this.forexDelta = dForex; this.forexFirstMonth = fForex;
    this.indicesDelta = dIndices; this.indicesFirstMonth = fIndices;

    // monta gráficos (mantive a paleta de 4 cores por posição)
    this.charts.push(
      this.makeChart(this.stocksRef.nativeElement, stocks, '#2ac3fd'),
      this.makeChart(this.commoditiesRef.nativeElement, commodities, '#00ff84'),
      this.makeChart(this.forexRef.nativeElement, forex, '#ffd84a'),
      this.makeChart(this.indicesRef.nativeElement, indices, '#ff7a3d'),
    );
  }

  /**
   * Constrói série diária (1..último dia do mês atual) somando operações do mês atual
   * para a categoria desejada. Agora: Forex combina 'forex' + 'crypto'.
   */
  private seriesFor(kind: SeriesKind): number[] {
    const { year, month } = this.nowYMD();
    const dim = this.daysInMonth(year, month);
    const arr = new Array(dim).fill(0) as number[];

    const bots = this.filterBotsByKind(kind);
    for (const b of bots) {
      const ops: Operation[] = (b as any).operacoesList ?? [];
      for (const op of ops) {
        const when = this.ymdInTZ(op.data);
        if (when.year === year && when.month === month) {
          const dayIdx = when.day - 1;
          arr[dayIdx] += this.opValue(op);
        }
      }
    }
    // arredondar 2 casas (opcional)
    return arr.map(v => +v.toFixed(2));
  }

  /**
   * Calcula variação % month-over-month para a categoria (total mês atual vs mês anterior).
   * Se o mês anterior não tiver valor (> 0), retorna first=true e delta 0.
   */
  private deltaForMonth(kind: SeriesKind): { delta: number, first: boolean } {
    const { year, month } = this.nowYMD();
    const prev = this.prevMonth(year, month);

    let currTotal = 0;
    let prevTotal = 0;

    const bots = this.filterBotsByKind(kind);
    for (const b of bots) {
      const ops: Operation[] = (b as any).operacoesList ?? [];
      for (const op of ops) {
        const d = this.ymdInTZ(op.data);
        const val = this.opValue(op);
        if (d.year === year && d.month === month) currTotal += val;
        if (d.year === prev.year && d.month === prev.month) prevTotal += val;
      }
    }
    currTotal = +currTotal.toFixed(4);
    prevTotal = +prevTotal.toFixed(4);

    if (prevTotal <= 0) return { delta: 0, first: true };

    const delta = ((currTotal - prevTotal) / prevTotal) * 100;
    return { delta, first: false };
  }

  // ====== Helpers de categoria/valor ======

  private filterBotsByKind(kind: SeriesKind): Bot[] {
    const norm = (s?: string) => (s || '').toLowerCase().trim();

    if (kind === 'forex+crypto') {
      return (this.bots || []).filter(b => {
        const d = norm(b.direcaoMercado as any);
        return d === 'forex' || d === 'crypto';
      });
    }

    // categorias simples
    const key = kind; // 'stocks' | 'commodities' | 'indices'
    return (this.bots || []).filter(b => norm(b.direcaoMercado as any) === key);
  }

  /** Valor da operação: prioriza lucro; se ausente, usa saldo; senão fechamento-abertura; senão 0 */
  private opValue(op: Operation): number {
    if (this.isNum(op.lucro)) return op.lucro as number;
    if (this.isNum(op.saldo)) return op.saldo as number;
    if (this.isNum(op.abertura) && this.isNum(op.fechamento)) {
      return (op.fechamento as number) - (op.abertura as number);
    }
    return 0;
  }
  private isNum(v: any): v is number { return typeof v === 'number' && Number.isFinite(v); }

  // ====== Datas / timezone ======

  /** Data atual (no timezone) como Y/M/D numéricos */
  private nowYMD(): { year: number; month: number; day: number } {
    const s = new Intl.DateTimeFormat('en-CA', { timeZone: this.TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date()); // YYYY-MM-DD
    const [y, m, d] = s.split('-').map(n => +n);
    return { year: y, month: m, day: d };
  }

  /** Converte um ISO para Y/M/D no timezone configurado */
  private ymdInTZ(iso: string): { year: number; month: number; day: number } {
    const s = new Intl.DateTimeFormat('en-CA', { timeZone: this.TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date(iso));
    const [y, m, d] = s.split('-').map(n => +n);
    return { year: y, month: m, day: d };
  }

  private daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  private prevMonth(year: number, month: number): { year: number; month: number } {
    if (month === 1) return { year: year - 1, month: 12 };
    return { year, month: month - 1 };
  }

  // ====== Chart.js ======

  private makeChart(canvas: HTMLCanvasElement, values: number[], color: string): Chart {
    const labels = values.map((_, i) => String(i + 1));
    const ctx = canvas.getContext('2d')!;
    const gradient = (context: any) => {
      const chart = context.chart;
      const { ctx, chartArea } = chart;
      if (!chartArea) return color;
      const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      g.addColorStop(0, this.hexToRgba(color, 0.35));
      g.addColorStop(1, this.hexToRgba(color, 0.00));
      return g;
    };

    const data: ChartData<'line'> = {
      labels,
      datasets: [
        {
          data: values,
          borderColor: this.hexToRgba(color, 0.25),
          borderWidth: 10,
          pointRadius: 0,
          fill: false,
          tension: 0.42,
        },
        {
          data: values,
          borderColor: color,
          borderWidth: 3,
          pointRadius: 0,
          fill: true,
          backgroundColor: gradient,
          tension: 0.42,
        }
      ]
    };

    const cfg: ChartConfiguration<'line'> = {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        interaction: { intersect: false, mode: 'nearest' },
        scales: {
          x: { display: false, grid: { display: false }, border: { display: false }, ticks: { display: false } },
          y: { display: false, grid: { display: false }, border: { display: false }, ticks: { display: false } }
        },
        elements: { line: { borderCapStyle: 'round' } }
      }
    };

    return new Chart(ctx, cfg);
  }

  private hexToRgba(hex: string, a: number): string {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /** Saldo do Bot: usa b.saldo; se ausente, soma op.saldo das operações do bot */
  private botSaldo(b: Bot): number {
    const valorDireto = (b as any)?.saldo;
    if (this.isNum(valorDireto)) return valorDireto as number;

    // Fallback: soma saldos das operações (se existirem)
    const ops: Operation[] = (b as any).operacoesList ?? [];
    const somaOps = ops.reduce((acc, op) => acc + (this.isNum(op.saldo) ? (op.saldo as number) : 0), 0);
    return somaOps;
  }

  /** Soma o saldo de todos os bots da categoria. Para Forex usa 'forex+crypto'. */
  private sumSaldo(kind: SeriesKind): number {
    const bots = this
      .filterBotsByKind(kind)
      .filter(b => this.isActiveBot(b)); // <- só bots não-FINISHED

    const total = bots.reduce((acc, b) => acc + this.botSaldo(b), 0);
    return +total.toFixed(2);
  }

  private isActiveBot(b: Bot): boolean {
    return (String(b.status || '').toUpperCase() !== 'FINISHED');
  }
}
