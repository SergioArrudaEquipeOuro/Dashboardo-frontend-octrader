import { Component, Input, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BotService } from 'src/app/services/bot.service';
import { Bot } from 'src/app/models/bot';

type MarketDirection = 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks';

@Component({
  selector: 'app-dashboard-admin-content10',
  templateUrl: './dashboard-admin-content10.component.html',
  styleUrls: ['./dashboard-admin-content10.component.css']
})
export class DashboardAdminContent10Component implements OnInit {
  showAdv = false;
  toggleAdv() { this.showAdv = !this.showAdv; }

  @Input() user: any;
  @Input() activeEnterprise: any;

  constructor(private botService: BotService) { }

  // estado
  loading = false;
  errorMsg: string | null = null;

  selectedBot: Bot | null = null;
  copied = false;

  // dados
  botsAll: Bot[] = [];
  rows: Bot[] = [];

  // paginação
  page = 1;
  pageSize = 25;
  total = 0;

  directions: { value: MarketDirection, label: string }[] = [
    { value: 'forex', label: 'Forex' },
    { value: 'indices', label: 'Índices' },
    { value: 'commodities', label: 'Commodities' },
    { value: 'crypto', label: 'Criptomoedas' },
    { value: 'stocks', label: 'Ações' },
  ];

  statusOptions: string[] = []; // preenchido a partir dos dados

  // filtros compactos
  filters = {
    q: '',
    direcao: '' as '' | MarketDirection,
    status: '' as '' | string,

    createdFrom: null as string | null,
    createdTo: null as string | null,

    startFrom: null as string | null,
    startTo: null as string | null,

    endFrom: null as string | null,
    endTo: null as string | null,

    volumeMin: null as number | null,
    volumeMax: null as number | null,

    stopWinMin: null as number | null,
    stopWinMax: null as number | null,

    stopLossMin: null as number | null,
    stopLossMax: null as number | null,

    saldoMin: null as number | null,
    saldoMax: null as number | null,

    projMin: null as number | null,
    projMax: null as number | null,

    pause: 'any' as 'any' | 'true' | 'false',
    sacar: 'any' as 'any' | 'true' | 'false',
    loss: 'any' as 'any' | 'true' | 'false',
    diarioNeg: 'any' as 'any' | 'true' | 'false',
    expPerm: 'any' as 'any' | 'true' | 'false',
    clientePodeDeletar: 'any' as 'any' | 'true' | 'false',
  };

  ngOnInit(): void {
    //this.refresh();
  }

  refresh() {
    this.loading = true;
    this.errorMsg = null;
    this.botService.getAll()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (arr) => {
          this.botsAll = Array.isArray(arr) ? arr : [];
          this.statusOptions = this.buildStatusList(this.botsAll);
          this.page = 1;
          this.applyFilters();
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || err?.message || 'Falha ao carregar bots.';
        }
      });
  }

  private buildStatusList(list: Bot[]): string[] {
    const s = new Set<string>();
    list.forEach(b => {
      const st = (b.status ?? '').toString().trim();
      if (st) s.add(st);
    });
    if (s.size === 0) return ['WAIT', 'RUNNING', 'PAUSED', 'CLOSED', 'ERROR'];
    return Array.from(s).sort();
  }

  // ===== helpers de filtro =====
  private normalize(v: any): string {
    return (v ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toUpperCase();
  }

  private toDate(v: any): Date | null {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  private inDateRange(v: any, from: string | null, to: string | null): boolean {
    const d = this.toDate(v);
    if (!d) return false; // se está filtrando por data, ausência reprova
    if (from) {
      const f = this.toDate(from);
      if (f && d < f) return false;
    }
    if (to) {
      const t = this.toDate(to);
      if (t) {
        const end = new Date(t);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    return true;
  }

  private inNumRange(val: any, min: number | null, max: number | null): boolean {
    if (min == null && max == null) return true;
    const n = Number(val);
    if (!Number.isFinite(n)) return false;
    if (min != null && n < min) return false;
    if (max != null && n > max) return false;
    return true;
  }

  private flagMatch(value: any, sel: 'any' | 'true' | 'false') {
    if (sel === 'any') return true;
    const b = !!value;
    return sel === 'true' ? b : !b;
  }

  applyAndResetPage() {
    this.page = 1;
    this.applyFilters();
  }

  applyFilters() {
    const q = this.normalize(this.filters.q);
    const f = this.filters;

    let data = this.botsAll.filter(b => {
      if (q) {
        const hay = [
          b.id, b.symbol, b.nomeAtivo, b.nomeCliente, b.token,
          b.status, b.profile, b.stopType, b.direcaoMercado
        ]
          .map(x => this.normalize(x))
          .join(' ');
        if (!hay.includes(q)) return false;
      }

      if (f.direcao && (b.direcaoMercado as any) !== f.direcao) return false;
      if (f.status && (b.status ?? '') !== f.status) return false;

      if ((f.createdFrom || f.createdTo) && !this.inDateRange(b.dataCriacao, f.createdFrom, f.createdTo)) return false;
      if ((f.startFrom || f.startTo) && !this.inDateRange(b.dataInicio, f.startFrom, f.startTo)) return false;
      if ((f.endFrom || f.endTo) && !this.inDateRange(b.dataFim, f.endFrom, f.endTo)) return false;

      if (!this.inNumRange(b.volume, f.volumeMin, f.volumeMax)) return false;
      if (!this.inNumRange(b.stopWin, f.stopWinMin, f.stopWinMax)) return false;
      if (!this.inNumRange(b.stopLoss, f.stopLossMin, f.stopLossMax)) return false;
      if (!this.inNumRange((b.saldo ?? b.valorSaldo), f.saldoMin, f.saldoMax)) return false;
      if (!this.inNumRange(b.projecao, f.projMin, f.projMax)) return false;

      if (!this.flagMatch(b.pause, f.pause)) return false;
      if (!this.flagMatch(b.sacar, f.sacar)) return false;
      if (!this.flagMatch(b.loss, f.loss)) return false;
      if (!this.flagMatch(b.valorDiarioNegativo, f.diarioNeg)) return false;
      if (!this.flagMatch(b.robotExpirationPermissao, f.expPerm)) return false;
      if (!this.flagMatch(b.permissaoClienteDeleteBot, f.clientePodeDeletar)) return false;

      return true;
    });

    // ordena por criação desc
    data.sort((a, b) => {
      const da = this.toDate(a.dataCriacao)?.getTime() ?? 0;
      const db = this.toDate(b.dataCriacao)?.getTime() ?? 0;
      return db - da;
    });

    this.total = data.length;
    const start = (this.page - 1) * this.pageSize;
    this.rows = data.slice(start, start + this.pageSize);
  }

  clearFilters() {
    this.filters = {
      q: '',
      direcao: '' as any,
      status: '' as any,

      createdFrom: null, createdTo: null,
      startFrom: null, startTo: null,
      endFrom: null, endTo: null,

      volumeMin: null, volumeMax: null,
      stopWinMin: null, stopWinMax: null,
      stopLossMin: null, stopLossMax: null,
      saldoMin: null, saldoMax: null,
      projMin: null, projMax: null,

      pause: 'any',
      sacar: 'any',
      loss: 'any',
      diarioNeg: 'any',
      expPerm: 'any',
      clientePodeDeletar: 'any',
    };
    this.applyAndResetPage();
  }

  // paginação
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  pageList(): (number | '…')[] {
    const total = this.totalPages;
    const curr = this.page;
    const win = 2;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const set = new Set<number>([
      1, 2, 3, total, total - 1, total - 2,
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
      this.applyFilters();
    }
  }
  prevPage() { if (this.page > 1) { this.page--; this.applyFilters(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.applyFilters(); } }

  trackById = (_: number, b: Bot) => b?.id ?? _;
  get endIndex(): number { return Math.min(this.page * this.pageSize, this.total); }

  openDetails(b: Bot) {
    this.selectedBot = b;
    this.copied = false;
  }

  copy(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    });
  }

  deleteBot(b: Bot) {
    if (!b?.id) return;
    const ok = confirm(`Tem certeza que deseja excluir o bot #${b.id}?`);
    if (!ok) return;

    this.loading = true;
    this.botService.delete(b.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          // Remove local e reaplica filtros/paginação
          this.botsAll = this.botsAll.filter(x => x.id !== b.id);
          this.applyFilters();
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || err?.message || 'Falha ao excluir bot.';
        }
      });
  }

  public urlSymbol(symbol: any): string {
    const base = (symbol || '').trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }


  get role(): boolean {
    const role = this.user.role;
    if (role === 'ROOT' || role === 'ADMINISTRADOR') {
      return true;
    } else if (role === 'BROKER' && this.activeEnterprise.brokerCreateBot === true) {
      return true;
    }
    return false;
  }

  public fallbackUrl(dir: MarketDirection): string {
    return this.fallbackMap[dir];
  }

  onImgError(ev: Event, b: any) {
    const img = ev.target as HTMLImageElement | null;
    if (!img) return;
    const alreadyFallback = img.dataset['fallback'] === '1';
    if (!alreadyFallback) {
      img.src = this.fallbackUrl(b);
      img.dataset['fallback'] = '1';
    } else {
      img.style.display = 'none';
    }
  }

  private fallbackMap: Record<MarketDirection, string> = {
    crypto: 'assets/img/cripto.png',
    indices: 'assets/img/index.png',
    commodities: 'assets/img/commodities.png',
    forex: 'assets/img/forex.png',
    stocks: 'assets/img/stocks.png'
  };

  statusClass(status?: string): string {
    if (!status) return '';

    const s = String(status).toUpperCase().trim();

    // Amarelo
    if (s === 'WAIT' || s === 'ACTIVE' || s === 'EDITED') {
      return 'tag-yellow';
    }

    // Verde (ETAPA_01..06)
    if (/^ETAPA_\d+$/.test(s)) {
      return 'tag-green';
    }

    // Laranja (ETAPA01_FAILED..ETAPA06_FAILED)
    if (/^ETAPA\d+_FAILED$/.test(s)) {
      return 'tag-orange';
    }

    // Vermelho
    if (s === 'FINISHED') {
      return 'tag-red';
    }

    // fallback opcional
    return '';
  }

}
