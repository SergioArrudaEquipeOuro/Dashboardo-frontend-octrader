import { Component, Input, OnInit } from '@angular/core';
import { ReleaseService } from 'src/app/services/release.service';
import { Release } from 'src/app/models/release';
import { UserService } from 'src/app/services/user.service';

type SortKey =
  | 'id' | 'email' | 'entryType' | 'status'
  | 'value' | 'coin' | 'typeTransfer'
  | 'date' | 'visibily' | 'fk';

@Component({
  selector: 'app-dashboard-broker-content02',
  templateUrl: './dashboard-broker-content02.component.html',
  styleUrls: ['./dashboard-broker-content02.component.css']
})
export class DashboardBrokerContent02Component implements OnInit {
  @Input() activeEnterprise: any | null = null;
  @Input() user!: any;

  releases: Release[] = [];
  loading = false;
  errorMsg = '';
  acting = new Set<number>();

  // filtros / busca
  searchTerm = '';
  statusFilter = '';
  entryTypeFilter = '';

  // paginação
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  pages: (number | '...')[] = [];

  // ------------------ FILTROS (estilo contratos) ------------------
  filters = {
    id: '' as string | number,
    clientQuery: '',     // nome ou email (do cliente ou do usuário vinculado)
    email: '',           // se quiser filtrar especificamente por email
    status: '' as '' | 'PENDING' | 'APPROVED' | 'REFUSED',
    entryType: '' as '' | 'DEPOSIT' | 'WITHDRAWAL' | 'CREDIT' | 'LOAN' | 'CREDITWITHDRAWA' | 'LOANWITHDRAWA' | 'TRANSFER',
    coin: '',            // moeda (uppercase)
    typeTransfer: '',    // Pix, Bank, Cripto, etc.
    dateFrom: '' as string,  // yyyy-MM-dd
    dateTo: '' as string,    // yyyy-MM-dd
    valueMin: '' as string | number,
    valueMax: '' as string | number,
    visibily: '' as '' | 'true' | 'false',
    fk: '' as '' | 'true' | 'false',
    free: ''             // busca livre combinada
  };

  buscar(): void {
    this.currentPage = 1;
    this.setupPagination();
  }

  limpar(): void {
    this.filters = {
      id: '',
      clientQuery: '',
      email: '',
      status: '',
      entryType: '',
      coin: '',
      typeTransfer: '',
      dateFrom: '',
      dateTo: '',
      valueMin: '',
      valueMax: '',
      visibily: '',
      fk: '',
      free: ''
    };
    this.currentPage = 1;
    this.setupPagination();
  }


  constructor(
    private releaseService: ReleaseService,
    private userService: UserService

  ) { }

  ngOnInit(): void { }

  reload(): void {
    this.loading = true;
    this.errorMsg = '';
    this.userService.getReleasesByBrokerId(this.user.id).subscribe({
      next: (data) => {
        // Ordena da data mais nova para a mais antiga, tratando casos undefined
        this.releases = (data || []).sort((a, b) => {
          // Se alguma data for undefined, trata adequadamente
          const dateA = a.date ? new Date(a.date.toString()).getTime() : 0;
          const dateB = b.date ? new Date(b.date.toString()).getTime() : 0;
          return dateB - dateA;
        });
        this.currentPage = 1;
        this.setupPagination();
      },
      error: (err) => {
        this.releases = [];
        this.errorMsg = err?.error?.message || err?.message || 'Falha ao carregar releases.';
        this.setupPagination();
      },
      complete: () => this.loading = false
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.setupPagination();
  }

  private filteredReleases(): Release[] {
    const term = (this.searchTerm || '').trim().toLowerCase();

    return this.releases.filter(r => {
      if (this.statusFilter && r.status !== this.statusFilter) return false;
      if (this.entryTypeFilter && r.entryType !== this.entryTypeFilter) return false;

      if (!term) return true;

      const fields = [
        r.entryType || '',
        r.status || '',
        r.email || (r as any)?.cliente?.email || '',
        r.coin || '',
        r.typeTransfer || '',
        r.proof || '',
        String(r.value ?? ''),
        String(r.id ?? '')
      ].join(' ').toLowerCase();

      return fields.includes(term);
    });
  }

  pagedReleases(): Release[] {
    const filtered = this.computeFiltered(this.releases || []);
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  setupPagination(): void {
    const totalItems = this.computeFiltered(this.releases || []).length;
    this.totalPages = Math.max(1, Math.ceil(totalItems / this.pageSize));

    const pages: (number | '...')[] = [];
    const maxButtons = 5;

    if (this.totalPages <= maxButtons) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      const left = Math.max(2, this.currentPage - 1);
      const right = Math.min(this.totalPages - 1, this.currentPage + 1);
      pages.push(1);
      if (left > 2) pages.push('...');
      for (let i = left; i <= right; i++) pages.push(i);
      if (right < this.totalPages - 1) pages.push('...');
      pages.push(this.totalPages);
    }
    this.pages = pages;
  }


  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.setupPagination();
  }

  approve(r: Release): void {
    if (!r?.id || r.status !== 'PENDING') return;
    this.acting.add(r.id);
    this.releaseService.approveRelease(r.id).subscribe({
      next: updated => {
        // atualiza no array local
        const idx = this.releases.findIndex(x => x.id === r.id);
        if (idx >= 0) this.releases[idx] = updated;
      },
      error: err => alert(err?.error || err?.message || 'Falha ao aprovar release.'),
      complete: () => this.acting.delete(r.id!)
    });
  }

  reject(r: Release): void {
    if (!r?.id || r.status !== 'PENDING') return;
    this.acting.add(r.id);
    this.releaseService.rejectRelease(r.id).subscribe({
      next: updated => {
        const idx = this.releases.findIndex(x => x.id === r.id);
        if (idx >= 0) this.releases[idx] = updated;
      },
      error: err => alert(err?.error || err?.message || 'Falha ao reprovar release.'),
      complete: () => this.acting.delete(r.id!)
    });
  }

  delete(r: Release): void {
    if (!r?.id) return;
    // opcional: regra visual – não permitir deletar APPROVED (mesma do backend)
    if (r.status === 'APPROVED') {
      alert('Não é permitido deletar releases APPROVED.');
      return;
    }
    if (!confirm(`Deseja realmente excluir o release #${r.id}?`)) return;

    this.acting.add(r.id);
    this.releaseService.deleteRelease(r.id).subscribe({
      next: () => {
        this.releases = this.releases.filter(x => x.id !== r.id);
        this.setupPagination();
      },
      error: err => alert(err?.error || err?.message || 'Falha ao excluir release.'),
      complete: () => this.acting.delete(r.id!)
    });
  }













  sortKey: SortKey = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  setSort(key: SortKey) {
    if (this.sortKey === key) {
      // toggle
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      // default: datas e números desc; strings asc
      this.sortDir = (key === 'date' || key === 'value' || key === 'id') ? 'desc' : 'asc';
    }
    // opcional: volta para primeira página ao mudar ordenação
    this.currentPage = 1;
  }

  // aplica filtros, ordena e depois pagina
  private computeSortedFiltered(): any[] {
    const filtered = this.applyFilters(this.releases || []);

    const dir = this.sortDir === 'asc' ? 1 : -1;
    const key = this.sortKey;

    const getVal = (r: any) => {
      switch (key) {
        case 'id': return r.id ?? 0;
        case 'email': return (r.email || '').toString().toLowerCase();
        case 'entryType': return (r.entryType || '').toString().toLowerCase();
        case 'status': return (r.status || '').toString().toLowerCase();
        case 'value': return Number(r.value ?? 0);
        case 'coin': return (r.coin || '').toString().toLowerCase();
        case 'typeTransfer': return (r.typeTransfer || '').toString().toLowerCase();
        case 'date': return r.date ? new Date(r.date).getTime() : 0;
        case 'visibily': return r.visibily === true ? 1 : r.visibily === false ? 0 : -1;
        case 'fk': return r.fk === true ? 1 : r.fk === false ? 0 : -1;
        default: return '';
      }
    };

    return [...filtered].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }

  // se já tinha um pagedReleases(), ajuste para usar a função acima
  private applyFilters(list: Release[]): Release[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    return list.filter(r => {
      if (this.statusFilter && r.status !== this.statusFilter) return false;
      if (this.entryTypeFilter && r.entryType !== this.entryTypeFilter) return false;

      if (!term) return true;

      const fields = [
        r.entryType || '',
        r.status || '',
        r.email || (r as any)?.cliente?.email || '',
        r.coin || '',
        r.typeTransfer || '',
        r.proof || '',
        String(r.value ?? ''),
        String(r.id ?? '')
      ].join(' ').toLowerCase();

      return fields.includes(term);
    });
  }


  // Ícone por tipo
  iconFor(type?: string): string {
    switch ((type || '').toUpperCase()) {
      case 'DEPOSIT': return 'bi-arrow-down-circle-fill';
      case 'WITHDRAWAL': return 'bi-arrow-up-circle-fill';
      case 'CREDIT': return 'bi-credit-card-2-front-fill';
      case 'LOAN': return 'bi-cash-coin';
      case 'CREDITWITHDRAWA': return 'bi-credit-card';
      case 'LOANWITHDRAWA': return 'bi-cash-stack';
      case 'TRANSFER': return 'bi-arrow-left-right';
      default: return 'bi-question-circle';
    }
  }

  // Cor por (tipo, status)
  colorFor(type?: string, status?: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'PENDING') return 'et-pending';
    if (s === 'REFUSED') return 'et-refused';

    // APPROVED → cor clara específica por tipo
    switch ((type || '').toUpperCase()) {
      case 'DEPOSIT': return 'et-deposit';
      case 'WITHDRAWAL': return 'et-withdrawal';
      case 'CREDIT': return 'et-credit';
      case 'LOAN': return 'et-loan';
      case 'CREDITWITHDRAWA': return 'et-creditwithdrawa';
      case 'LOANWITHDRAWA': return 'et-loanwithdrawa';
      case 'TRANSFER': return 'et-transfer';
      default: return 'et-pending';
    }
  }


  private hasReleasePerm(action: 'AprovarRelease' | 'ReprovarRelease' | 'DeletarRelease'): boolean {
    const role = this.user?.role;
    const e = this.activeEnterprise;
    if (!role || !e) return false;

    if (role === 'ROOT' || role === 'ADMINISTRADOR') return true;

    const keyByRole: Record<string, string | undefined> = {
      'SUPORTE': `suporte${action}`,
      'FINANCEIRO': `financeiro${action}`,
      'MANAGER': `manager${action}`
    };

    const flagKey = keyByRole[role];
    return flagKey ? !!e[flagKey] : false;
  }

  canApproveRelease(r: Release): boolean {
    if (!r || r.status !== 'PENDING') return false;
    return this.hasReleasePerm('AprovarRelease');
  }

  canRejectRelease(r: Release): boolean {
    if (!r || r.status !== 'PENDING') return false;
    return this.hasReleasePerm('ReprovarRelease');
  }

  canDeleteRelease(r: Release): boolean {
    if (!r) return false;
    // opcional: esconder botão para APPROVED também
    // if (r.status === 'APPROVED') return false;
    return this.hasReleasePerm('DeletarRelease');
  }


  private computeFiltered(list: Release[]): Release[] {
    const f = this.filters;

    const idNum = this.toNumOrNull(f.id);
    const minVal = this.toNumOrNull(f.valueMin);
    const maxVal = this.toNumOrNull(f.valueMax);

    const from = f.dateFrom ? new Date(f.dateFrom + 'T00:00:00') : null;
    const to = f.dateTo ? new Date(f.dateTo + 'T23:59:59') : null;

    const clientQuery = (f.clientQuery || '').trim().toLowerCase();
    const email = (f.email || '').trim().toLowerCase();
    const entryType = (f.entryType || '').trim().toUpperCase();
    const status = (f.status || '').trim().toUpperCase();
    const coin = (f.coin || '').trim().toUpperCase();
    const typeTransfer = (f.typeTransfer || '').trim().toLowerCase();
    const free = (f.free || '').trim().toLowerCase();

    return list.filter(r => {
      // ID
      if (idNum != null && r.id !== idNum) return false;

      // Cliente (nome ou email) – tentamos em várias origens possíveis
      const nomesPossiveis = [
        (r.clientName || ''),
        (r.usuario?.nome || ''),
      ].map(s => s.toLowerCase());

      const emailsPossiveis = [
        (r.email || ''),
        (r.emailCliente || ''),
        (r.usuario?.email || '')
      ].map(s => s.toLowerCase());

      if (clientQuery) {
        const hitNome = nomesPossiveis.some(n => n.includes(clientQuery));
        const hitEmail = emailsPossiveis.some(e => e.includes(clientQuery));
        if (!hitNome && !hitEmail) return false;
      }

      if (email && !emailsPossiveis.some(e => e.includes(email))) return false;

      // Status
      if (status && (r.status || '').toUpperCase() !== status) return false;

      // Tipo
      if (entryType && (r.entryType || '').toUpperCase() !== entryType) return false;

      // Moeda
      if (coin && (r.coin || '').toUpperCase() !== coin) return false;

      // Tipo de transferência (contém)
      if (typeTransfer && !(r.typeTransfer || '').toLowerCase().includes(typeTransfer)) return false;

      // Valores
      const val = Number(r.value ?? 0);
      if (minVal != null && val < minVal) return false;
      if (maxVal != null && val > maxVal) return false;

      // Datas
      if ((from || to) && r.date) {
        const d = new Date(r.date);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }

      // Visível
      if (f.visibily === 'true' && r.visibily !== true) return false;
      if (f.visibily === 'false' && r.visibily !== false) return false;

      // Fake
      if (f.fk === 'true' && r.fk !== true) return false;
      if (f.fk === 'false' && r.fk !== false) return false;

      // Busca livre combinada (igual sua search atual, mas consolidada)
      if (free) {
        const bucket = [
          r.entryType || '',
          r.status || '',
          r.email || r.emailCliente || r.usuario?.email || '',
          r.clientName || r.usuario?.nome || '',
          r.coin || '',
          r.typeTransfer || '',
          r.proof || '',
          String(r.value ?? ''),
          String(r.id ?? '')
        ].join(' ').toLowerCase();
        if (!bucket.includes(free)) return false;
      }

      return true;
    });
  }

  private toNumOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

}
