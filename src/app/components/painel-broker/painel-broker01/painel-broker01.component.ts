import {
  AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild
} from '@angular/core';
import { Chart, ChartConfiguration, ChartData, registerables, ScatterDataPoint } from 'chart.js';
import { Release } from 'src/app/models/release';
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

@Component({
  selector: 'app-painel-broker01',
  templateUrl: './painel-broker01.component.html',
  styleUrls: ['./painel-broker01.component.css']
})
export class PainelBroker01Component implements AfterViewInit, OnDestroy, OnChanges {

  @Input() user: any;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart?: Chart;

  range: RangeKey = '7D';
  private readonly LS_KEY = 'broker01_range';
  private readonly TZ = 'America/Bahia';

  currentLabels: string[] = [];
  releases: Release[] = [];

  totals = { entradas: 0, saidas: 0, liquido: 0 };
  periodText = '';

  // paleta do tema
  colors: Record<ReleaseTypeKey, string> = {
    DEPOSIT: '#2ac3fd',
    WITHDRAWAL: '#2e00ab',
    CREDIT: '#00ff84',
    LOAN: '#ffd84a',
    CREDITWITHDRAWA: '#ff6ad5',
    LOANWITHDRAWA: '#ff7a3d',
    TRANSFER: '#9aa4b2'
  };

  constructor(private userService: UserService) { }

  // ===== lifecycle =====
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) this.tryLoad();
  }

  ngAfterViewInit(): void {
    const saved = (localStorage.getItem(this.LS_KEY) as RangeKey) || '7D';
    if (['7D', '30D', '12M'].includes(saved)) this.range = saved;
    this.tryLoad();
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  // ===== UI =====
  setRange(r: RangeKey) {
    if (this.range === r) return;
    this.range = r;
    localStorage.setItem(this.LS_KEY, r);
    this.updateData();
  }

  // ===== data & chart flow =====
  private tryLoad() {
    if (!this.user?.id) return;             // precisa do broker id
    if (!this.canvasRef?.nativeElement) return; // precisa do canvas pronto

    // Busca releases do broker
    this.userService.getReleasesByBrokerId(this.user.id).subscribe({
      next: (list) => {
        this.releases = Array.isArray(list) ? list : [];
        if (this.chart) this.updateData(); else this.buildChart();
      },
      error: (err) => {
        console.error('[Broker01] Falha ao buscar releases do broker:', err);
        this.releases = [];
        if (this.chart) this.updateData(); else this.buildChart();
      }
    });
  }

  private buildChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    const series = this.computeSeries(this.range);

    // labels & cards
    this.currentLabels = series.labels;
    this.applyCards(series);

    // “chanfro” nas linhas para steps suaves
    const depXY = this.toBeveled(series.data.DEPOSIT);
    const witXY = this.toBeveled(series.data.WITHDRAWAL);
    const creXY = this.toBeveled(series.data.CREDIT);
    const loaXY = this.toBeveled(series.data.LOAN);
    const cwwXY = this.toBeveled(series.data.CREDITWITHDRAWA);
    const lwwXY = this.toBeveled(series.data.LOANWITHDRAWA);
    const traXY = this.toBeveled(series.data.TRANSFER);

    const data: ChartData<'line'> = {
      datasets: [
        { data: depXY, parsing: false as const, borderColor: this.colors.DEPOSIT, borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Depósito' },
        { data: witXY, parsing: false as const, borderColor: this.colors.WITHDRAWAL, borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Saque' },
        { data: creXY, parsing: false as const, borderColor: this.colors.CREDIT, borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Crédito' },
        { data: loaXY, parsing: false as const, borderColor: this.colors.LOAN, borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Empréstimo' },
        { data: cwwXY, parsing: false as const, borderColor: this.colors.CREDITWITHDRAWA, borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Saq. Crédito' },
        { data: lwwXY, parsing: false as const, borderColor: this.colors.LOANWITHDRAWA, borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Saq. Empréstimo' },
        { data: traXY, parsing: false as const, borderColor: this.colors.TRANSFER, borderWidth: 3, pointRadius: 0, fill: false, tension: 0, label: 'Transferência' },
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
              color: 'rgba(0,0,0,.55)',
              callback: (v) => this.tickLabel(v as number)
            }
          },
          y: {
            grid: { color: 'rgba(0,0,0,.08)' },
            border: { display: false }
          }
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

    const depXY = this.toBeveled(series.data.DEPOSIT);
    const witXY = this.toBeveled(series.data.WITHDRAWAL);
    const creXY = this.toBeveled(series.data.CREDIT);
    const loaXY = this.toBeveled(series.data.LOAN);
    const cwwXY = this.toBeveled(series.data.CREDITWITHDRAWA);
    const lwwXY = this.toBeveled(series.data.LOANWITHDRAWA);
    const traXY = this.toBeveled(series.data.TRANSFER);

    const x = this.chart.options.scales!['x'] as any;
    x.min = 0;
    x.max = this.currentLabels.length - 1;

    this.chart.data.datasets[0].data = depXY;
    this.chart.data.datasets[1].data = witXY;
    this.chart.data.datasets[2].data = creXY;
    this.chart.data.datasets[3].data = loaXY;
    this.chart.data.datasets[4].data = cwwXY;
    this.chart.data.datasets[5].data = lwwXY;
    this.chart.data.datasets[6].data = traXY;

    this.chart.update();
  }

  // ===== séries, cards e período =====
  private computeSeries(range: RangeKey): {
    labels: string[];
    data: Record<ReleaseTypeKey, number[]>;
    entradas: number;
    saidas: number;
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
      const t = normType((r as any).entryType || (r as any).type || '');
      if (!t) continue;

      const iso = this.coerceISO((r as any).date);
      const key = (range === '12M') ? this.monthKey(iso) : this.dayKey(iso);
      const idx = buckets.index[key];
      if (idx === undefined) continue;

      const v = Math.abs(Number((r as any).value ?? 0)) || 0;
      sums[t][idx] += v;
    }

    const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const entradas = sumArr(sums.DEPOSIT) + sumArr(sums.CREDIT) + sumArr(sums.LOAN);
    const saidas = sumArr(sums.WITHDRAWAL) + sumArr(sums.CREDITWITHDRAWA) + sumArr(sums.LOANWITHDRAWA);

    (Object.keys(sums) as ReleaseTypeKey[]).forEach(k => {
      sums[k] = sums[k].map(x => +x.toFixed(2));
    });

    this.periodText = this.buildPeriodText(range);

    return {
      labels: buckets.labels,
      data: sums,
      entradas: +entradas.toFixed(2),
      saidas: +saidas.toFixed(2)
    };
  }

  private applyCards(series: { entradas: number; saidas: number; labels: string[] }) {
    this.totals.entradas = series.entradas;
    this.totals.saidas = series.saidas;
    this.totals.liquido = +(series.entradas - series.saidas).toFixed(2);
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

  // ===== buckets =====
  private makeDailyBuckets(days: number) {
    const keys: string[] = [], labels: string[] = [], index: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = this.shiftDays(new Date(), -i);
      const key = this.dayKey(d.toISOString());
      keys.push(key);
      labels.push(new Intl.DateTimeFormat('pt-BR', { timeZone: this.TZ, day: '2-digit', month: '2-digit' }).format(d));
      index[key] = keys.length - 1;
    }
    return { keys, labels, index };
  }

  private makeMonthlyBuckets(months: number) {
    const keys: string[] = [], labels: string[] = [], index: Record<string, number> = {};
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

  // ===== datas =====
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

  // ===== visual helpers =====
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
