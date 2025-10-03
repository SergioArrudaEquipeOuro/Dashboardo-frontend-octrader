// src/app/components/contets-dashboard/dashboard-client-content04/dashboard-client-content04.component.ts
import { Component, Input, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BotService } from 'src/app/services/bot.service';
import { Bot } from 'src/app/models/bot';

@Component({
  selector: 'app-dashboard-client-content04',
  templateUrl: './dashboard-client-content04.component.html',
  styleUrls: ['./dashboard-client-content04.component.css']
})
export class DashboardClientContent04Component implements OnInit, OnChanges {

  @Input() user: any;
  @Input() activeEnterprise: any;

  constructor(private botService: BotService) { }

  // Estado geral
  loading = false;
  errorMsg: string | null = null;

  // Dados
  botsAll: Bot[] = [];   // tudo que veio da API
  rows: Bot[] = [];      // filtrados
  rowsPage: Bot[] = [];  // página atual

  // Busca simples
  q = '';

  // Paginação
  page = 1;
  pageSize = 15;
  total = 0;

  // Seleção (modal detalhes)
  selected: Bot | null = null;

  // Menu de ações por linha
  openMenuId: number | null = null;

  // ===== Ciclo de vida =======================================================
  ngOnInit(): void {
    this.tryLoad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('user' in changes) this.tryLoad();
  }

  // ===== Carregamento ========================================================
  private hasUserId(): boolean {
    return !!(this.user && Number.isFinite(Number(this.user.id)));
  }

  private tryLoad(): void {
    if (!this.hasUserId()) return;
    this.refresh();
  }

  refresh(): void {
    if (!this.hasUserId()) {
      this.errorMsg = 'Usuário inválido para listar bots.';
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    // Ajuste o método do serviço conforme sua API (ex.: getByUsuarioId)
    this.botService.getByUsuarioId(this.user.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (arr) => {
          this.botsAll = Array.isArray(arr) ? arr : [];
           this.botsAll = this.botsAll.reverse()
          this.applyFilter();
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || err?.message || 'Falha ao carregar bots.';
        }
      });
  }

  // ===== Filtro + Paginação ==================================================
  applyFilter(): void {
    const q = this.normalize(this.q);

    const data = this.botsAll.filter(b => {
      if (!q) return true;
      const hay = [
        b.id, b.token, b.symbol, b.nomeAtivo, b.nomeCliente, b.status, b.direcaoMercado
      ].map(v => this.normalize(v)).join(' ');
      return hay.includes(q);
    });

    this.rows = data;
    this.total = data.length;
    this.page = 1;
    this.applyPaging();
  }

  private applyPaging(): void {
    const start = (this.page - 1) * this.pageSize;
    this.rowsPage = this.rows.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  pageList(): (number | '…')[] {
    const total = this.totalPages;
    const curr = this.page;
    const win = 2;

    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const set = new Set<number>([
      1, 2, 3, total - 2, total - 1, total,
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

  goToPage(p: number | '…'): void {
    if (typeof p !== 'number') return;
    const t = Math.min(Math.max(1, p), this.totalPages);
    if (t !== this.page) {
      this.page = t;
      this.applyPaging();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyPaging();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyPaging();
    }
  }

  clearQ(): void {
    this.q = '';
    this.applyFilter();
  }

  // ===== Ações / Modal =======================================================
  toggleActions(b: Bot): void {
    const id = Number(b?.id);
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  isActionsOpen(b: Bot): boolean {
    return this.openMenuId === Number(b?.id);
  }

  private isInsideActions(target: HTMLElement): boolean {
    return !!target.closest('.row-actions') || !!target.closest('.action-menu');
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    const el = ev.target as HTMLElement;
    if (!this.isInsideActions(el)) this.openMenuId = null;
  }

  // Mobile dispara touchstart antes do click
  @HostListener('document:touchstart', ['$event'])
  onDocTouch(ev: TouchEvent): void {
    const el = ev.target as HTMLElement;
    if (!this.isInsideActions(el)) this.openMenuId = null;
  }


  openDetails(b: Bot): void {
    this.selected = b;
    this.openMenuId = null;
  }

  closeDetails(): void {
    this.selected = null;
  }

  // ===== Helpers =============================================================
  trackById = (_: number, b: Bot) => (b?.id ?? _);

  urlSymbol(symbol: any): string {
    const base = (symbol || '').toString().trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }

  private normalize(v: any): string {
    return (v ?? '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toUpperCase();
  }

  /** Mapeia o status do bot para rótulo e classe de cor */
  statusView(raw?: string): { label: string; class: string } {
    const s = (raw || '').toString().trim().toUpperCase();

    // ETAPAS ATIVAS -> "ACTIVE" (verde)
    const ACTIVE_STEPS = new Set([
      'ETAPA_01', 'ETAPA_02', 'ETAPA_03', 'ETAPA_04', 'ETAPA_05', 'ETAPA_06'
    ]);

    // FALHAS DE ETAPA -> "Maintenance" (laranja) — aceita com e sem "_"
    const FAIL_STEPS = new Set([
      'ETAPA01_FAILED', 'ETAPA02_FAILED', 'ETAPA03_FAILED', 'ETAPA04_FAILED', 'ETAPA05_FAILED', 'ETAPA06_FAILED',
      'ETAPA_01_FAILED', 'ETAPA_02_FAILED', 'ETAPA_03_FAILED', 'ETAPA_04_FAILED', 'ETAPA_05_FAILED', 'ETAPA_06_FAILED'
    ]);

    if (ACTIVE_STEPS.has(s)) return { label: 'ACTIVE', class: 'tag-run' };
    if (s === 'FINISHED') return { label: 'FINISHED', class: 'tag-error' };
    if (s === 'WAIT' || s === 'ACTIVE' || s === 'EDITED') return { label: 'WAIT', class: 'tag-wait' };
    if (FAIL_STEPS.has(s)) return { label: 'Maintenance', class: 'tag-maint' };

    // Fallbacks antigos
    if (s === 'RUNNING') return { label: 'RUNNING', class: 'tag-run' };
    if (s === 'PAUSED') return { label: 'PAUSED', class: 'tag-pause' };
    if (s === 'CLOSED') return { label: 'CLOSED', class: 'tag-close' };
    if (s === 'ERROR') return { label: 'ERROR', class: 'tag-error' };
    if (s === 'WAIT') return { label: 'WAIT', class: 'tag-wait' };

    return { label: raw || '—', class: '' };
  }
}
