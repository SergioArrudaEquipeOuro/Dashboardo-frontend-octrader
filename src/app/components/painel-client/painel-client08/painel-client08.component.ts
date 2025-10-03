import {
  AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, OnChanges, SimpleChanges
} from '@angular/core';
import { Chart, ChartConfiguration, ChartData, registerables, ScatterDataPoint } from 'chart.js';
import { Bot } from 'src/app/models/bot';
import { ReleaseService } from 'src/app/services/release.service';

Chart.register(...registerables);

type RangeKey = '7D' | '30D' | '12M';
type MarketDir = 'stocks' | 'crypto' | 'forex' | 'indices' | 'commodities';

type RawOp = {
  id: number;
  saldo?: number | null;
  data: string; // ISO
  visivel?: boolean;
};

@Component({
  selector: 'app-painel-client08',
  templateUrl: './painel-client08.component.html',
  styleUrls: ['./painel-client08.component.css']
})
export class PainelClient08Component implements AfterViewInit, OnDestroy, OnChanges {

  @Input() user: any;
  @Input() bots: Bot[] = [];

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  // UI / estado
  range: RangeKey = '7D';
  deltaPct = 0;                         // delta % mostrado nos KPIs
  private readonly LS_KEY = 'pc08_range';
  private readonly TZ = 'America/Bahia';
  private currentLabels: string[] = [];

  // paleta
  private colors = {
    total: '#ff7a3d',        // laranja (Total)
    stocks: '#2ac3fd',       // azul
    crypto: '#00ff84',       // verde
    forex: '#ffd84a',        // amarelo
    indices: '#9b8cff',      // roxo-azulado p/ diferenciar do total
    commodities: '#ff6ad5'   // rosa
  };

  constructor(private releases: ReleaseService) {}

  // ========= lifecycle =========

  ngAfterViewInit(): void {
    // carrega range salvo
    const saved = (localStorage.getItem(this.LS_KEY) as RangeKey) || '7D';
    if (['7D', '30D', '12M'].includes(saved)) this.range = saved;

    // releases do usuário (opcional; apenas log)
    const cid = this.user?.id ?? this.user?.clienteId ?? this.user?.usuarioId;
    if (cid) {
      console.groupCollapsed('%c[Releases] getReleasesByUser', 'color:#7d5fff;font-weight:bold;');
      this.releases.getReleasesByUser(+cid).subscribe({
        next: (data) => { console.log('Releases recebidos:', data?.length ?? 0, data); console.groupEnd(); },
        error: (err) => { console.error('Erro ao buscar releases:', err); console.groupEnd(); }
      });
    }

    this.buildChart();   // desenha com dados reais
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (this.chart && (ch['bots'] || ch['user'])) {
      this.updateData(); // se os dados chegarem depois do view init
    }
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  // ========= UI =========

  setRange(r: RangeKey): void {
    if (this.range === r) return;
    this.range = r;
    localStorage.setItem(this.LS_KEY, r);
    this.updateData();
  }

  // ========= Chart =========

  /** Cria/instancia o gráfico */
  private buildChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    const series = this.computeSeries(this.range);

    // guarda labels para os ticks
    this.currentLabels = series.labels;
    this.deltaPct = this.calcDelta(series.total);

    // aplica “chanfro” nas mudanças (look & feel do mock)
    const totalXY: ScatterDataPoint[] = this.toBeveled(series.total);
    const stocksXY: ScatterDataPoint[] = this.toBeveled(series.stocks);
    const cryptoXY: ScatterDataPoint[] = this.toBeveled(series.crypto);
    const forexXY: ScatterDataPoint[] = this.toBeveled(series.forex);
    const indicesXY: ScatterDataPoint[] = this.toBeveled(series.indices);
    const commXY: ScatterDataPoint[] = this.toBeveled(series.commodities);

    const data: ChartData<'line'> = {
      datasets: [
        // Glow do Total
        {
          data: totalXY,
          parsing: false as const,
          borderColor: 'rgba(255,122,61,.25)',
          borderWidth: 10,
          pointRadius: 0,
          fill: false,
          tension: 0
        },
        // Área Total (laranja)
        {
          data: totalXY,
          parsing: false as const,
          borderColor: this.colors.total,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0,
          fill: true,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(255,122,61,.28)';
            const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            g.addColorStop(0, 'rgba(255,122,61,.35)');
            g.addColorStop(.6, 'rgba(255,122,61,.16)');
            g.addColorStop(1, 'rgba(255,122,61,0)');
            return g;
          }
        },
        // Linhas por direção
        { data: stocksXY,  parsing: false as const, borderColor: this.colors.stocks,      borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Ações' },
        { data: cryptoXY,  parsing: false as const, borderColor: this.colors.crypto,      borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Cripto' },
        { data: forexXY,   parsing: false as const, borderColor: this.colors.forex,       borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Forex' },
        { data: indicesXY, parsing: false as const, borderColor: this.colors.indices,     borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Índices' },
        { data: commXY,    parsing: false as const, borderColor: this.colors.commodities, borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Commodities' },
      ]
    };

    const cfg: ChartConfiguration<'line'> = {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        interaction: { intersect: false, mode: 'nearest' },
        elements: { line: { borderCapStyle: 'round', borderJoinStyle: 'round' } },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: this.currentLabels.length - 1,
            grid: { display: false },
            border: { display: false },
            ticks: {
              stepSize: 1,
              autoSkip: false,
              color: 'rgba(255,255,255,.75)',
              font: { weight: 700 },
              callback: (v) => this.tickLabel(v as number)
            }
          },
          y: {
            grid: { color: 'rgba(255,255,255,.18)' },
            border: { display: false }
          }
        }
      }
    };

    this.chart = new Chart(ctx, cfg);
  }

  /** Atualiza dados ao trocar range ou chegar bots */
  private updateData(): void {
    if (!this.chart) return;

    const series = this.computeSeries(this.range);
    this.currentLabels = series.labels;
    this.deltaPct = this.calcDelta(series.total);

    const x = this.chart.options.scales!['x'] as any;
    x.min = 0;
    x.max = this.currentLabels.length - 1;

    // aplica chanfro
    const totalXY   = this.toBeveled(series.total);
    const stocksXY  = this.toBeveled(series.stocks);
    const cryptoXY  = this.toBeveled(series.crypto);
    const forexXY   = this.toBeveled(series.forex);
    const indicesXY = this.toBeveled(series.indices);
    const commXY    = this.toBeveled(series.commodities);

    // datasets: 0 (glow total), 1 (área total), 2..6 (direções)
    this.chart.data.datasets[0].data = totalXY;
    this.chart.data.datasets[1].data = totalXY;
    this.chart.data.datasets[2].data = stocksXY;
    this.chart.data.datasets[3].data = cryptoXY;
    this.chart.data.datasets[4].data = forexXY;
    this.chart.data.datasets[5].data = indicesXY;
    this.chart.data.datasets[6].data = commXY;

    this.chart.update();
  }

  // ========= Séries (dados reais dos bots) =========

  /**
   * Gera séries: Total + 5 por direção, somando **saldo** das operações por bucket.
   * 7D/30D → por dia (últimos N dias, incluindo hoje).
   * 12M    → por mês (últimos 12 meses, incluindo mês atual).
   */
  private computeSeries(range: RangeKey): {
    labels: string[];
    total: number[];
    stocks: number[];
    crypto: number[];
    forex: number[];
    indices: number[];
    commodities: number[];
  } {
    const dirs: MarketDir[] = ['stocks', 'crypto', 'forex', 'indices', 'commodities'];

    const buckets = range === '12M'
      ? this.makeMonthlyBuckets(12)
      : this.makeDailyBuckets(range === '7D' ? 7 : 30);

    const sums: Record<'total' | MarketDir, number[]> = {
      total: new Array(buckets.keys.length).fill(0),
      stocks: new Array(buckets.keys.length).fill(0),
      crypto: new Array(buckets.keys.length).fill(0),
      forex: new Array(buckets.keys.length).fill(0),
      indices: new Array(buckets.keys.length).fill(0),
      commodities: new Array(buckets.keys.length).fill(0),
    };

    console.groupCollapsed(`%c[SaldoChart] computeSeries range=${range}`, 'color:#2e00ab;font-weight:bold;');
    console.log('Buckets:', buckets.keys);
    console.log('Labels:', buckets.labels);

    const dirOf = (s?: string): MarketDir | 'other' => {
      const v = (s || '').toLowerCase().trim();
      if (v === 'stocks' || v === 'crypto' || v === 'forex' || v === 'indices' || v === 'commodities') return v;
      return 'other';
    };

    let opsCount = 0;

    for (const b of (this.bots || [])) {
      const d = dirOf((b as any).direcaoMercado);
      if (d === 'other') continue;

      const ops: RawOp[] = (b as any).operacoesList ?? [];
      for (const op of ops) {
        const val = this.safeSaldo(op.saldo);
        const key = (range === '12M') ? this.monthKey(op.data) : this.dayKey(op.data);
        const idx = buckets.index[key];
        if (idx === undefined) continue; // fora do período
        sums[d][idx] += val;
        sums.total[idx] += val;
        opsCount++;
      }
    }

    // arredonda
    Object.keys(sums).forEach(k => (sums as any)[k] = (sums as any)[k].map((x: number) => +x.toFixed(2)));

    console.log('Total de operações agregadas:', opsCount);
    console.table([
      { dataset: 'Total',       soma: sums.total.reduce((a, b) => a + b, 0) },
      { dataset: 'Ações',       soma: sums.stocks.reduce((a, b) => a + b, 0) },
      { dataset: 'Cripto',      soma: sums.crypto.reduce((a, b) => a + b, 0) },
      { dataset: 'Forex',       soma: sums.forex.reduce((a, b) => a + b, 0) },
      { dataset: 'Índices',     soma: sums.indices.reduce((a, b) => a + b, 0) },
      { dataset: 'Commodities', soma: sums.commodities.reduce((a, b) => a + b, 0) },
    ]);
    console.groupEnd();

    return {
      labels: buckets.labels,
      total: sums.total,
      stocks: sums.stocks,
      crypto: sums.crypto,
      forex: sums.forex,
      indices: sums.indices,
      commodities: sums.commodities
    };
  }

  // ========= Buckets (dia/mês) =========

  private makeDailyBuckets(days: number): { keys: string[]; labels: string[]; index: Record<string, number> } {
    const keys: string[] = [];
    const labels: string[] = [];
    const index: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = this.shiftDays(new Date(), -i);
      const key = this.dayKey(d.toISOString());
      keys.push(key);
      labels.push(new Intl.DateTimeFormat('pt-BR', { timeZone: this.TZ, weekday: 'short' }).format(d)); // Mon..Sun
      index[key] = keys.length - 1;
    }
    return { keys, labels, index };
  }

  private makeMonthlyBuckets(months: number): { keys: string[]; labels: string[]; index: Record<string, number> } {
    const keys: string[] = [];
    const labels: string[] = [];
    const index: Record<string, number> = {};
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setMonth(d.getMonth() - i);
      const key = this.monthKey(d.toISOString());
      keys.push(key);
      const lab = new Intl.DateTimeFormat('pt-BR', { timeZone: this.TZ, month: 'short' }).format(d);
      labels.push(`${lab}/${String(d.getFullYear()).slice(-2)}`); // mai/25
      index[key] = keys.length - 1;
    }
    return { keys, labels, index };
  }

  // ========= Date helpers =========

  private dayKey(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(iso)); // YYYY-MM-DD
  }

  private monthKey(iso: string): string {
    const y = new Intl.DateTimeFormat('en-CA', { timeZone: this.TZ, year: 'numeric' }).format(new Date(iso));
    const m = new Intl.DateTimeFormat('en-CA', { timeZone: this.TZ, month: '2-digit' }).format(new Date(iso));
    return `${y}-${m}`; // YYYY-MM
  }

  private shiftDays(date: Date, delta: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    return d;
  }

  // ========= Misc / visual helpers =========

  /** saldo numérico; se ausente/inválido → 0 */
  private safeSaldo(v: any): number {
    return (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
  }

  /** delta % entre primeiro e último ponto */
  private calcDelta(arr: number[]): number {
    if (!arr.length) return 0;
    const first = arr[0];
    const last = arr[arr.length - 1];
    if (Math.abs(first) < 1e-9) return 0;
    return Math.round(((last - first) / first) * 100);
  }

  /** Converte uma série em degraus para XY com “chanfro” nas mudanças */
  private toBeveled(values: number[], d = 0.12): ScatterDataPoint[] {
    const out: ScatterDataPoint[] = [];
    const n = values.length;
    if (!n) return out;
    out.push({ x: 0, y: values[0] });
    for (let i = 0; i < n - 1; i++) {
      const v = values[i], nv = values[i + 1];
      out.push({ x: i + (0.5 - d), y: v });
      if (v !== nv) out.push({ x: i + (0.5 + d), y: nv });
      out.push({ x: i + 1, y: nv });
    }
    return out;
  }

  /** ticks do eixo X usam os labels atuais */
  private tickLabel = (value: number | string) => {
    const i = Math.round(Number(value));
    return this.currentLabels?.[i] ?? '';
  };
}
