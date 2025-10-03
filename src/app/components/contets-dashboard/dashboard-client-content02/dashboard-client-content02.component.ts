import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ContratoDTO, ContratoService } from 'src/app/services/contrato.service';
import { User } from 'src/app/models/user';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-dashboard-client-content02',
  templateUrl: './dashboard-client-content02.component.html',
  styleUrls: ['./dashboard-client-content02.component.css']
})
export class DashboardClientContent02Component implements OnInit, OnChanges {
  @Input() user?: User;

  contracts: ContratoDTO[] = [];
  loading = false;
  errorMsg: string | null = null;

  // paginação
  page = 1;
  pageSize = 7;
  totalPages = 1;
  maxPageLinks = 5;

  viewingId: number | null = null;

  constructor(private contratoService: ContratoService) { }

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) this.load();
  }

  reload() { this.load(); }

  private load() {
    if (!this.user?.id) return;

    this.loading = true;
    this.errorMsg = null;

    this.contratoService.getContratosByUsuarioId(this.user.id).subscribe({
      next: (list) => {
        // ordena da data mais recente para a mais antiga
        const ordered = (list || []).slice().sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });
        this.contracts = ordered;
        this.recalcPages();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Não foi possível carregar seus contratos.';
      }
    });
  }

  trackById(_i: number, c: ContratoDTO) { return c.id ?? _i; }

  statusClass(c: ContratoDTO): string {
    return c.signed ? 'approved' : 'pending';
  }

  formatMoney(v?: number): string {
    if (v == null) return '—';
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(v);
  }

  // paginação helpers
  get pageContracts(): ContratoDTO[] {
    const start = (this.page - 1) * this.pageSize;
    return this.contracts.slice(start, start + this.pageSize);
  }

  private recalcPages() {
    this.totalPages = Math.max(1, Math.ceil(this.contracts.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;
    if (this.page < 1) this.page = 1;
  }

  setPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
  }

  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  visiblePages(): number[] {
    const half = Math.floor(this.maxPageLinks / 2);
    let start = Math.max(1, this.page - half);
    let end = Math.min(this.totalPages, start + this.maxPageLinks - 1);
    start = Math.max(1, end - this.maxPageLinks + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  view(c: ContratoDTO) {
    if (!c?.id) return;
    this.viewingId = c.id;

    const el = document.getElementById('contractViewModal');
    (bootstrap as any)?.Modal?.getOrCreateInstance(el!)?.show();
  }
}
