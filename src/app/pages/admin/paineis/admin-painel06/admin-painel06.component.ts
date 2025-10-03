import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { switchMap, finalize } from 'rxjs/operators';
import { BotService } from 'src/app/services/bot.service';
import { Bot } from 'src/app/models/bot';
import { OperacoesService as OpsHttp } from 'src/app/services/operacoes.service';

export interface Operacoes {
  id?: number;
  saldo: number;
  lucro: number;
  abertura: number;
  fechamento: number;
  volume: number | null;
  token: string;
  data: Date | string;
  visivel?: boolean;
  bot?: Bot;
}

type FutureOp = { valor: number; waitMs: number; waitLabel: string; scheduledAt: number };
type NextDay = { valor: number; date: Date };

@Component({
  selector: 'app-admin-painel06',
  templateUrl: './admin-painel06.component.html',
  styleUrls: ['./admin-painel06.component.css']
})
export class AdminPainel06Component implements OnInit, OnDestroy, OnChanges {
  @Input() botId?: number;
  @Input() user: any;

  loading = false;
  errorMsg: string | null = null;
  finalizing = false;

  id: number | null = null;
  bot: any | null = null;
  ops: Operacoes[] = [];

  /** paginação */
  readonly pageSize = 10;     // 10 itens por página
  readonly pageBtnLimit = 10; // quantos botões de página mostrar

  // páginas correntes
  opsPage = 1;
  futPage = 1;
  daysPage = 1;

  // novas seções
  futureOps: FutureOp[] = [];
  nextDays: NextDay[] = [];

  // criação manual
  creatingOp = false;
  newOpAmount: number | null = null;
  createMsg: string | null = null;
  createErr: string | null = null;

  private pollingSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private botService: BotService,
    private opsHttp: OpsHttp
  ) { }

  ngOnInit(): void { this.resolveIdAndStart(); }

  ngOnChanges(changes: SimpleChanges): void {
    if ('botId' in changes && !changes['botId'].firstChange) {
      this.resolveIdAndStart();
    }
  }

  ngOnDestroy(): void { this.stopPolling(); }

  public reload(): void { this.resolveIdAndStart(); }

  // ---------------- core ----------------
  private resolveIdAndStart(): void {
    const inputId = Number(this.botId);
    if (Number.isFinite(inputId) && inputId > 0) {
      this.id = inputId;
    } else {
      const idParam = this.route.snapshot.paramMap.get('id');
      const parsed = Number(idParam);
      this.id = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    if (!this.id) {
      this.errorMsg = 'ID do bot inválido.';
      this.bot = null; this.ops = []; this.futureOps = []; this.nextDays = [];
      this.stopPolling();
      return;
    }

    this.errorMsg = null;
    this.startPolling(this.id);
  }

  private startPolling(id: number): void {
    this.stopPolling();
    this.loading = !this.bot;

    this.pollingSub = timer(0, 60000).pipe(
      switchMap(() => this.botService.getById(id).pipe(finalize(() => this.loading = false)))
    ).subscribe({
      next: (data: any) => {
        this.bot = data ?? null;

        // OPERAÇÕES (ordenadas por data desc)
        const rawOps = data?.operacoesList ?? data?.operacoes ?? data?.operations ?? data?.ops ?? [];
        this.ops = Array.isArray(rawOps)
          ? rawOps
            .map((o: any) => ({ ...o, volume: o.volume ?? null }))
            .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
          : [];
        this.opsPage = this.clampPage(this.opsPage, this.ops.length);

        // FUTURAS OPERAÇÕES
        const vals: number[] = Array.isArray(data?.listaOperacoes) ? data.listaOperacoes : [];
        const waits: number[] = Array.isArray(data?.listaEspera) ? data.listaEspera : [];
        const lastOpAt = this.getLastVisibleOpDate(data);
        this.futureOps = this.buildFutureOpsCumulative(vals, waits, lastOpAt);
        this.futPage = this.clampPage(this.futPage, this.futureOps.length);

        // PRÓXIMOS DIAS
        const dayVals: number[] = Array.isArray(data?.listaValorTotalDia) ? data.listaValorTotalDia : [];
        const skipWeekends = this.shouldSkipWeekends(String(data?.direcaoMercado || '').toLowerCase());
        this.nextDays = this.buildNextDays(dayVals, skipWeekends);
        this.daysPage = this.clampPage(this.daysPage, this.nextDays.length);

        this.errorMsg = null;
      },
      error: err => this.errorMsg = err?.error?.message || err?.message || 'Falha ao carregar o bot.'
    });
  }

  private stopPolling(): void {
    if (this.pollingSub) { this.pollingSub.unsubscribe(); this.pollingSub = null; }
  }

  // ---------------- criação manual ----------------
  public createManualOp(): void {
    this.createMsg = this.createErr = null;
    if (this.id == null) { this.createErr = 'Bot não identificado.'; return; }
    const amount = Number(this.newOpAmount);
    if (!Number.isFinite(amount)) { this.createErr = 'Informe um valor numérico.'; return; }

    this.creatingOp = true;
    this.opsHttp.createOperacao(this.id, amount)
      .pipe(finalize(() => this.creatingOp = false))
      .subscribe({
        next: () => {
          this.createMsg = 'Operação criada com sucesso.';
          this.newOpAmount = null; // limpa input
          // polling atualiza sozinho
        },
        error: (err) => {
          this.createErr = err?.error?.message || 'Não foi possível criar a operação.';
        }
      });
  }

  // ---------------- helpers ----------------
  copyToken(tok?: string) {
    if (!tok) return;
    navigator.clipboard?.writeText(tok).catch(() => { });
  }

  profitClass(v: number) { return v >= 0 ? 'pos' : 'neg'; }

  trackOp = (_: number, o: Operacoes) => o?.id ?? (o?.token ?? _);
  trackFuture = (_: number, f: FutureOp) => f?.scheduledAt ?? _;

  /** retorna a data da última operação visível; se não houver, usa dataCriacao do bot */
  private getLastVisibleOpDate(data: any): Date {
    const list = Array.isArray(data?.operacoesList) ? data.operacoesList : [];
    const visiveis = list.filter((o: any) => o?.visivel === true && o?.data);
    if (visiveis.length) {
      visiveis.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
      return new Date(visiveis[visiveis.length - 1].data);
    }
    return data?.dataCriacao ? new Date(data.dataCriacao) : new Date();
  }

  /** monta a lista com espera CUMULATIVA; tempo restante é agendado - agora */
  private buildFutureOpsCumulative(values: number[], waitsMs: number[], baseDate: Date): FutureOp[] {
    const base = baseDate.getTime();
    const now = Date.now();

    let acc = 0;
    const n = Math.min(values.length, waitsMs.length);
    const out: FutureOp[] = [];

    for (let i = 0; i < n; i++) {
      acc += Math.max(0, waitsMs[i] ?? 0);        // soma cumulativa
      const scheduledAt = base + acc;             // quando esta operação deve acontecer
      const remaining = Math.max(0, scheduledAt - now);
      out.push({
        valor: values[i] ?? 0,
        waitMs: remaining,
        waitLabel: this.formatWait(remaining),
        scheduledAt
      });
    }
    return out;
  }

  /** formata ms -> "agora" | "Xm min" | "H h M min" (arredonda para cima) */
  private formatWait(ms: number): string {
    if (ms <= 30_000) return 'agora';
    const totalMin = Math.ceil(ms / 60000);
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  /** pula sábados e domingos quando skipWeekends = true; começa em amanhã */
  private buildNextDays(values: number[], skipWeekends: boolean): NextDay[] {
    const out: NextDay[] = [];
    let d = new Date(); // hoje
    for (const v of values) {
      do {
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      } while (skipWeekends && (d.getDay() === 0 || d.getDay() === 6)); // 0=Dom, 6=Sáb
      out.push({ valor: v, date: new Date(d) });
    }
    return out;
  }

  /** regra simples: crypto opera 7 dias; demais pulam fds */
  private shouldSkipWeekends(dir: string): boolean {
    return dir !== 'crypto';
  }

  // ---- imagem do símbolo ----
  public urlSymbol(symbol: any): string {
    const s = (symbol ?? '').toString().trim().toUpperCase();
    if (!s) return 'assets/img/stocks.png';
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(s)}.png`;
  }
  public fallbackImg(ev: Event) {
    (ev.target as HTMLImageElement).src = 'assets/placeholder-asset.svg';
  }

  // ---------- getters de paginação (listas paginadas) ----------
  get opsPaged() { return this.slicePage(this.ops, this.opsPage); }
  get futureOpsPaged() { return this.slicePage(this.futureOps, this.futPage); }
  get nextDaysPaged() { return this.slicePage(this.nextDays, this.daysPage); }

  get opsPageCount() { return this.pageCount(this.ops.length); }
  get futPageCount() { return this.pageCount(this.futureOps.length); }
  get daysPageCount() { return this.pageCount(this.nextDays.length); }

  get opsPagesToShow() { return this.pagesToShow(this.opsPageCount); }
  get futPagesToShow() { return this.pagesToShow(this.futPageCount); }
  get daysPagesToShow() { return this.pagesToShow(this.daysPageCount); }

  setOpsPage(p: number) { this.opsPage = this.clampPage(p, this.ops.length); }
  setFutPage(p: number) { this.futPage = this.clampPage(p, this.futureOps.length); }
  setDaysPage(p: number) { this.daysPage = this.clampPage(p, this.nextDays.length); }

  private slicePage<T>(arr: T[], page: number): T[] {
    const start = (page - 1) * this.pageSize;
    return arr.slice(start, start + this.pageSize);
  }
  private pageCount(totalItems: number): number {
    return Math.max(1, Math.ceil((totalItems || 0) / this.pageSize));
  }
  private clampPage(current: number, totalItems: number): number {
    const max = this.pageCount(totalItems);
    if (!current || current < 1) return 1;
    if (current > max) return max;
    return current;
  }
  private pagesToShow(totalPages: number): number[] {
    const n = Math.min(totalPages, this.pageBtnLimit);
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  onFinalize(): void {
    if (!this.id) { this.errorMsg = 'Bot não identificado.'; return; }

    const ok = confirm('Tem certeza que deseja finalizar este bot? Isto irá liquidar e transferir o saldo ao cliente.');
    if (!ok) return;

    const motivo = prompt('Motivo (opcional):', 'Finalização manual pela UI') ?? undefined;

    this.errorMsg = null;
    this.finalizing = true;

    this.botService.finalizar(this.id, motivo, this.getAuthorEmail())
      .pipe(finalize(() => this.finalizing = false))
      .subscribe({
        next: (b) => {
          this.bot = b;
          // o polling já atualiza o restante; se quiser feedback imediato:
          // alert('Bot finalizado com sucesso.');
        },
        error: (err) => {
          this.errorMsg = err?.error?.error || err?.error?.message || err?.message || 'Falha ao finalizar o bot.';
        }
      });
  }

  private getAuthorEmail(): string | undefined {
    const stored =
      localStorage.getItem('authorEmail') ||
      localStorage.getItem('userEmail') ||
      localStorage.getItem('email');
    if (stored) return stored;

    const token = localStorage.getItem('authToken');
    if (!token || token.split('.').length < 2) return undefined;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.email || payload?.sub || undefined;
    } catch {
      return undefined;
    }
  }

}
