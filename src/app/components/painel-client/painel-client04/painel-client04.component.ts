import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

type Operacao = {
  id: number;
  saldo: number | null;
  lucro: number | null;
  abertura: number | null;
  fechamento: number | null;
  volume: number | null;
  token: string;
  data: string | Date;
  visivel: boolean;
};

@Component({
  selector: 'app-painel-client04',
  templateUrl: './painel-client04.component.html',
  styleUrls: ['./painel-client04.component.css']
})
export class PainelClient04Component implements OnInit, OnChanges {

  @Input() bot: any;
  @Input() operations: Operacao[] | null = null;

  /** Lucro total (soma dos saldos das operações) */
  totalProfit = 0;

  /** Paginação */
  page = 1;
  pageSize = 10;
  totalOps = 0;
  opsPage: Operacao[] = [];

  trackByOp = (_: number, op: Operacao) => op?.id ?? _;

  ngOnInit(): void {
    this.syncOperations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bot'] || changes['operations']) {
      this.syncOperations();
    }
  }

  /** Carrega/ordena operações e recalcula lucro + paginação */
  private syncOperations(): void {
    if (!Array.isArray(this.operations) || this.operations.length === 0) {
      const src =
        this.bot?.operacoesList ??
        this.bot?.listaOperacoes ??
        this.bot?.operations ??
        [];
      this.operations = Array.isArray(src) ? [...src] : [];
    }

    // ordena por data crescente
    this.operations.sort((a, b) => {
      const da = new Date(a?.data as any).getTime() || 0;
      const db = new Date(b?.data as any).getTime() || 0;
      return da - db;
    });

    this.recomputeProfit();
    this.page = 1;            // sempre volta para a primeira página ao recarregar
    this.applyPaging();
  }

  private recomputeProfit(): void {
    this.totalProfit = (this.operations ?? []).reduce((acc, op) => {
      const val = Number(op?.saldo);
      return acc + (Number.isFinite(val) ? val : 0);
    }, 0);
  }

  private applyPaging(): void {
    const arr = this.operations ?? [];
    this.totalOps = arr.length;
    const start = (this.page - 1) * this.pageSize;
    this.opsPage = arr.slice(start, start + this.pageSize);
  }

  /** Helpers do paginator */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalOps / this.pageSize));
  }

  pageList(): (number | '…')[] {
    const total = this.totalPages;
    const curr = this.page;
    const win = 2;

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const set = new Set<number>([
      1, 2, 3,
      total - 2, total - 1, total,
      curr - 2, curr - 1, curr, curr + 1, curr + 2
    ].filter(p => p >= 1 && p <= total));

    const arr = Array.from(set).sort((a, b) => a - b);
    const out: (number | '…')[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (i === 0) out.push(arr[i]);
      else out.push(arr[i] === arr[i - 1] + 1 ? arr[i] : '…', arr[i]);
    }
    return out.filter((v, i, a) => !(v === '…' && a[i - 1] === '…'));
  }

  goToPage(p: number | '…') {
    if (typeof p !== 'number') return;
    const t = Math.min(Math.max(1, p), this.totalPages);
    if (t !== this.page) {
      this.page = t;
      this.applyPaging();
    }
  }
  prevPage() { if (this.page > 1) { this.page--; this.applyPaging(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.applyPaging(); } }

  /** utilitários */
  urlSymbol(symbol: any): string {
    const base = (symbol || '').toString().trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }

  asDate(d: any): Date | null {
    const tmp = new Date(d);
    return isNaN(tmp.getTime()) ? null : tmp;
  }
}
