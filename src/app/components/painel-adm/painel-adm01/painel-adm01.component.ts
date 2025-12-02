import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild
} from '@angular/core';
import { Chart, ChartConfiguration, ChartData, registerables, ScatterDataPoint } from 'chart.js';
import { ReleaseService } from 'src/app/services/release.service';
import { Release } from 'src/app/models/release';
import { forkJoin } from 'rxjs';
import { UserService } from 'src/app/services/user.service';

Chart.register(...registerables);

type RangeKey = '7D' | '30D' | '12M';
type ReleaseTypeKey =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'CREDIT'
  | 'LOAN'
  | 'CREDITWITHDRAWA'
  | 'LOANWITHDRAWA'
  | 'TRANSFER';

type SeriesKey = ReleaseTypeKey | 'CLIENTS';

@Component({
  selector: 'app-painel-adm01',
  templateUrl: './painel-adm01.component.html',
  styleUrls: ['./painel-adm01.component.css']
})
export class PainelAdm01Component implements AfterViewInit, OnDestroy {

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  clients: any[] = [];
  clientColor = '#ff0036';

  range: RangeKey = '7D';
  private readonly LS_KEY = 'adm01_range';
  private readonly TZ = 'America/Bahia';
  private currentLabels: string[] = [];
  releases: Release[] = [];

  // Totais para os cards
  totals = { entradas: 0, saidas: 0, liquido: 0, clientes: 0 };
  periodText = ''; // Ex.: "Período: 05/09/2025 — 11/09/2025 (7 dias)"

  // paleta do tema
  colors: Record<ReleaseTypeKey, string> = {
    DEPOSIT: '#2ac3fd', // azul
    WITHDRAWAL: '#2e00ab', // roxo
    CREDIT: '#00ff84', // verde
    LOAN: '#ffd84a', // amarelo
    CREDITWITHDRAWA: '#ff6ad5', // rosa
    LOANWITHDRAWA: '#ff7a3d', // laranja
    TRANSFER: '#9aa4b2'  // cinza
  };

  constructor(
    private releasesSvc: ReleaseService,
    private userSvc: UserService
  ) { }


  seriesMeta: Record<SeriesKey, { label: string; color: string; yAxisID?: 'y' | 'yClients' }> = {
    DEPOSIT: { label: 'Depósito', color: this.colors.DEPOSIT, yAxisID: 'y' },
    WITHDRAWAL: { label: 'Saque', color: this.colors.WITHDRAWAL, yAxisID: 'y' },
    CREDIT: { label: 'Crédito', color: this.colors.CREDIT, yAxisID: 'y' },
    LOAN: { label: 'Empréstimo', color: this.colors.LOAN, yAxisID: 'y' },
    CREDITWITHDRAWA: { label: 'Saq. Crédito', color: this.colors.CREDITWITHDRAWA, yAxisID: 'y' },
    LOANWITHDRAWA: { label: 'Saq. Empréstimo', color: this.colors.LOANWITHDRAWA, yAxisID: 'y' },
    TRANSFER: { label: 'Transferência', color: this.colors.TRANSFER, yAxisID: 'y' },
    CLIENTS: { label: 'Clientes', color: this.clientColor, yAxisID: 'yClients' }
  };

  // Ordem fixa das séries no gráfico (para mapear índice dos datasets)
  seriesOrder: SeriesKey[] = [
    'DEPOSIT', 'WITHDRAWAL', 'CREDIT', 'LOAN', 'CREDITWITHDRAWA', 'LOANWITHDRAWA', 'TRANSFER', 'CLIENTS'
  ];

  // visibilidade inicial (tudo ligado)
  filters: Record<SeriesKey, boolean> = {
    DEPOSIT: true, WITHDRAWAL: true, CREDIT: true, LOAN: true,
    CREDITWITHDRAWA: true, LOANWITHDRAWA: true, TRANSFER: true, CLIENTS: true
  };

  // índices dos datasets no Chart.js
  private datasetIndex: Partial<Record<SeriesKey, number>> = {};


  onToggleSeries(k: SeriesKey) {
    if (!this.chart) return;
    const idx = this.datasetIndex[k];
    if (idx == null) return;
    this.chart.data.datasets[idx].hidden = !this.filters[k];
    this.chart.update();
  }

  // ========= lifecycle =========
  ngAfterViewInit(): void {
    const saved = (localStorage.getItem(this.LS_KEY) as RangeKey) || '7D';
    if (['7D', '30D', '12M'].includes(saved)) this.range = saved;

    forkJoin({
      releases: this.releasesSvc.getReleases(),
      clients: this.userSvc.listarClientes()
    }).subscribe({
      next: ({ releases, clients }) => {
        this.releases = Array.isArray(releases) ? releases : [];
        this.clients = Array.isArray(clients) ? clients : [];
        this.buildChart();
      },
      error: (err) => {
        console.error('[Adm01] Erro ao buscar dados:', err);
        this.releases = [];
        this.clients = [];
        this.buildChart();
      }
    });
  }


  ngOnDestroy(): void { this.chart?.destroy(); }

  // ========= UI =========
  setRange(r: RangeKey) {
    if (this.range === r) return;
    this.range = r;
    localStorage.setItem(this.LS_KEY, r);
    this.updateData();
  }

  // ========= Chart =========
  private buildChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    const series = this.computeSeries(this.range);

    this.currentLabels = series.labels;
    this.applyCards(series);

    const beveled = {
      DEPOSIT: this.toBeveled(series.data.DEPOSIT),
      WITHDRAWAL: this.toBeveled(series.data.WITHDRAWAL),
      CREDIT: this.toBeveled(series.data.CREDIT),
      LOAN: this.toBeveled(series.data.LOAN),
      CREDITWITHDRAWA: this.toBeveled(series.data.CREDITWITHDRAWA),
      LOANWITHDRAWA: this.toBeveled(series.data.LOANWITHDRAWA),
      TRANSFER: this.toBeveled(series.data.TRANSFER),
      CLIENTS: this.toBeveled(series.clientesCounts) // NOVO
    };

    const datasets = this.seriesOrder.map((k): any => ({
      data: beveled[k],
      parsing: false as const,
      borderColor: this.seriesMeta[k].color,
      borderWidth: 3,
      pointRadius: 0,
      fill: false,
      tension: 0,
      label: this.seriesMeta[k].label,
      yAxisID: this.seriesMeta[k].yAxisID ?? 'y',
      hidden: !this.filters[k] // respeita checkboxes ao montar
    }));

    // salva o índice de cada dataset
    this.datasetIndex = {};
    this.seriesOrder.forEach((k, i) => this.datasetIndex[k] = i);

    const data: ChartData<'line'> = { datasets };

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
              color: 'rgba(0,0,0,.55)',
              font: { weight: 600 },
              callback: (v) => this.tickLabel(v as number)
            }
          },
          // valores ($)
          y: { grid: { color: 'rgba(0,0,0,.08)' }, border: { display: false } },
          // quantidade de clientes
          yClients: { position: 'right', grid: { display: false }, border: { display: false }, ticks: { precision: 0 } }
        }
      }
    };

    this.chart = new Chart(ctx, cfg);
  }


  private updateData(): void {
    if (!this.chart) return;

    const series = this.computeSeries(this.range);
    this.currentLabels = series.labels;
    this.applyCards(series);

    const beveled = {
      DEPOSIT: this.toBeveled(series.data.DEPOSIT),
      WITHDRAWAL: this.toBeveled(series.data.WITHDRAWAL),
      CREDIT: this.toBeveled(series.data.CREDIT),
      LOAN: this.toBeveled(series.data.LOAN),
      CREDITWITHDRAWA: this.toBeveled(series.data.CREDITWITHDRAWA),
      LOANWITHDRAWA: this.toBeveled(series.data.LOANWITHDRAWA), // ✅ corrigido
      TRANSFER: this.toBeveled(series.data.TRANSFER),
      CLIENTS: this.toBeveled(series.clientesCounts)
    };

    const x = this.chart.options.scales!['x'] as any;
    x.min = 0;
    x.max = this.currentLabels.length - 1;

    for (const k of this.seriesOrder) {
      const idx = this.datasetIndex[k];
      if (idx == null) continue;
      this.chart.data.datasets[idx].data = beveled[k] as any;
      this.chart.data.datasets[idx].hidden = !this.filters[k];
    }

    this.chart.update();
  }



  // ========= séries, cards e período =========
  private computeSeries(range: RangeKey): {
    labels: string[];
    data: Record<ReleaseTypeKey, number[]>;
    clientesCounts: number[];     // NOVO: série de contagem por bucket
    entradas: number;
    saidas: number;
    clientesTotal: number;        // NOVO: total no período
  } {
    const types: ReleaseTypeKey[] = [
      'DEPOSIT', 'WITHDRAWAL', 'CREDIT', 'LOAN', 'CREDITWITHDRAWA', 'LOANWITHDRAWA', 'TRANSFER'
    ];

    const buckets = range === '12M'
      ? this.makeMonthlyBuckets(12)
      : this.makeDailyBuckets(range === '7D' ? 7 : 30);

    const sums: Record<ReleaseTypeKey, number[]> = Object.fromEntries(
      types.map(t => [t, new Array(buckets.keys.length).fill(0)])
    ) as Record<ReleaseTypeKey, number[]>;

    // ---- Releases (volume) ----
    const normType = (t?: string): ReleaseTypeKey | null => {
      if (!t) return null;
      const up = t.toUpperCase().replace(/\s+/g, '');
      if (up === 'DEPOSIT') return 'DEPOSIT';
      if (up === 'WITHDRAWAL') return 'WITHDRAWAL';
      if (up === 'CREDIT') return 'CREDIT';
      if (up === 'LOAN') return 'LOAN';
      if (up.startsWith('CREDITWITHDRAW')) return 'CREDITWITHDRAWA';
      if (up.startsWith('LOANWITHDRAW')) return 'LOANWITHDRAWA';
      if (up === 'TRANSFER') return 'TRANSFER';
      return null;
    };

    for (const r of this.releases) {
      const t = normType(r.entryType || (r as any).type || '');
      if (!t) continue;

      const iso = this.coerceISO(r.date);
      const key = (range === '12M') ? this.monthKey(iso) : this.dayKey(iso);
      const idx = buckets.index[key];
      if (idx === undefined) continue;

      const v = Math.abs(Number(r.value ?? 0)) || 0;
      sums[t][idx] += v;
    }

    // ---- Clientes (contagem de novos por bucket) ----
    const clientesCounts = new Array(buckets.keys.length).fill(0) as number[];

    for (const c of this.clients) {
      // emission pode chegar como ISO string, millis ou Date; coagir para ISO
      const iso = this.coerceISO((c.usuario?.emission ?? c.emission) as any);
      const key = (range === '12M') ? this.monthKey(iso) : this.dayKey(iso);
      const idx = buckets.index[key];
      if (idx !== undefined) clientesCounts[idx] += 1;
    }

    // Totais dos cards
    const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const entradas =
      sumArr(sums.DEPOSIT) + sumArr(sums.CREDIT) + sumArr(sums.LOAN);
    const saidas =
      sumArr(sums.WITHDRAWAL) + sumArr(sums.CREDITWITHDRAWA) + sumArr(sums.LOANWITHDRAWA);
    const clientesTotal = sumArr(clientesCounts);

    // arredonda volumes
    (Object.keys(sums) as ReleaseTypeKey[]).forEach(k => {
      sums[k] = sums[k].map(x => +x.toFixed(2));
    });

    this.periodText = this.buildPeriodText(range);

    return {
      labels: buckets.labels,
      data: sums,
      clientesCounts,
      entradas: +entradas.toFixed(2),
      saidas: +saidas.toFixed(2),
      clientesTotal
    };
  }


  private applyCards(series: { entradas: number; saidas: number; clientesTotal: number; labels: string[] }) {
    this.totals.entradas = series.entradas;
    this.totals.saidas = series.saidas;
    this.totals.liquido = +(series.entradas - series.saidas).toFixed(2);
    this.totals.clientes = series.clientesTotal;
  }


  private buildPeriodText(range: RangeKey): string {
    const now = new Date();
    const fmtDay = (d: Date) =>
      new Intl.DateTimeFormat('pt-BR', { timeZone: this.TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    const fmtMonth = (d: Date) => {
      const m = new Intl.DateTimeFormat('pt-BR', { timeZone: this.TZ, month: 'short' }).format(d);
      return `${m}/${String(d.getFullYear()).slice(-2)}`;
    };

    if (range === '7D' || range === '30D') {
      const days = range === '7D' ? 7 : 30;
      const start = this.shiftDays(now, -(days - 1));
      return `Período: ${fmtDay(start)} — ${fmtDay(now)} (${days} dias)`;
    } else {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setMonth(start.getMonth() - 11);
      return `Período: ${fmtMonth(start)} — ${fmtMonth(now)} (12 meses)`;
    }
  }

  // ========= buckets =========
  private makeDailyBuckets(days: number): { keys: string[]; labels: string[]; index: Record<string, number> } {
    const keys: string[] = [];
    const labels: string[] = [];
    const index: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = this.shiftDays(new Date(), -i);
      const key = this.dayKey(d.toISOString());
      keys.push(key);
      labels.push(new Intl.DateTimeFormat('pt-BR', { timeZone: this.TZ, day: '2-digit', month: '2-digit' }).format(d));
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
      labels.push(`${lab}/${String(d.getFullYear()).slice(-2)}`);
      index[key] = keys.length - 1;
    }
    return { keys, labels, index };
  }

  // ========= datas =========
  private coerceISO(d?: Date | string): string {
    const dt = d instanceof Date ? d : new Date(d as any);
    return isNaN(+dt) ? new Date().toISOString() : dt.toISOString();
  }

  private dayKey(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(iso));
  }

  private monthKey(iso: string): string {
    const y = new Intl.DateTimeFormat('en-CA', { timeZone: this.TZ, year: 'numeric' }).format(new Date(iso));
    const m = new Intl.DateTimeFormat('en-CA', { timeZone: this.TZ, month: '2-digit' }).format(new Date(iso));
    return `${y}-${m}`;
  }

  private shiftDays(date: Date, delta: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    return d;
  }

  // ========= visual helpers =========
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

  private tickLabel = (value: number | string) => {
    const i = Math.round(Number(value));
    return this.currentLabels?.[i] ?? '';
  };
}
