import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { finalize, switchMap, map, catchError, of } from 'rxjs';
import { AdminPainel01Component } from 'src/app/pages/admin/paineis/admin-painel01/admin-painel01.component';
import { EquipeService, InfoVinculosPorEmail } from 'src/app/services/equipe.service';

type FilterType = 'ALL' | 'CLIENTE' | 'BROKER';

@Component({
  selector: 'app-dashboard-gerente-content05',
  templateUrl: './dashboard-gerente-content05.component.html',
  styleUrls: ['./dashboard-gerente-content05.component.css']
})
export class DashboardGerenteContent05Component implements OnInit, OnDestroy {

  @ViewChild(AdminPainel01Component) painel!: AdminPainel01Component;

  usuarios: any[] = [];
  @Input() user!: User;
  loading = false;
  selectedUser: any = null;
  loadingDetails = false;

  filterType: FilterType = 'ALL';
  appliedFilter: FilterType = 'ALL';
  searchTerm = '';
  now = Date.now();
  private timeagoTimer: any;
  activeEnterprise: any;

  // paginação
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  pages: (number | '...')[] = [];

  constructor(
    private userService: UserService,            // permanece injetado caso use em outras ações do painel
    private enterpriseService: EnterpriseService,
    private equipeService: EquipeService
  ) { }

  ngOnInit(): void {
    this.getActiveEnterprise();
    this.timeagoTimer = setInterval(() => {
      this.now = Date.now();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.timeagoTimer) clearInterval(this.timeagoTimer);
  }

  getUsuarioByToken(): void {
    const token = localStorage.getItem('authToken');
    if (token) {
      this.userService.getUsuarioByToken(token).subscribe({
        next: data => this.user = data,
        error: err => console.error('Error fetching user by token:', err)
      });
    }
  }

  getActiveEnterprise(): void {
    this.enterpriseService.getActiveEnterprise()
      .subscribe({
        next: (e: any) => {
          this.activeEnterprise = e ?? null;
        },
        error: () => {
          this.activeEnterprise = null;
        }
      });
  }

  // =========================
  // LISTAGEM USANDO EQUIPE
  // =========================
  onFilterChange(): void {
    this.appliedFilter = this.filterType;
    this.loading = true;
    this.currentPage = 1;

    // 1) Obter equipe do GERENTE pelo email do user (Input)
    const email = this.user?.email;
    if (!email) {
      console.warn('[GerenteContent05] user.email ausente.');
      this.usuarios = [];
      this.setupPagination();
      this.loading = false;
      return;
    }

    this.equipeService.consultarVinculosPorEmail(email)
      .pipe(
        switchMap((info: InfoVinculosPorEmail) => {
          const equipeId = info?.equipe?.id;
          const isGerente = (info?.tipo === 'GERENTE');
          const vinculado = !!info?.vinculadoEquipe;

          if (!isGerente || !vinculado || !equipeId) {
            console.warn('[GerenteContent05] Usuário não é GERENTE vinculado a equipe ou equipeId ausente.', info);
            // Sem equipe => lista vazia
            return of(null);
          }

          // 2) Obter DTO completo da equipe
          return this.equipeService.obterEquipeDTO(equipeId);
        }),
        map((dto: any | null) => {
          if (!dto) return [];

          const brokers = Array.isArray(dto.brokers) ? dto.brokers : [];
          const clientes = Array.isArray(dto.clientes) ? dto.clientes : [];

          // NORMALIZAÇÃO (opcional): garantir campos comuns para tabela/filtros
          const normBrokers = brokers.map((b: any) => ({
            id: b.id,
            role: 'BROKER',
            nome: b.nome,
            email: b.email,
            telefone: b.telefone ?? null,
            ultimoLogin: b.ultimoLogin ?? null,
            // totais do broker (caso deseje exibir em colunas futuras)
            somaSaldo: b.somaSaldo ?? 0,
            somaCredito: b.somaCredito ?? 0,
            somaEmprestimo: b.somaEmprestimo ?? 0,
            // compat extra
            broker: null
          }));

          const normClientes = clientes.map((c: any) => ({
            id: c.id,
            role: 'CLIENTE',
            nome: c.nome,
            email: c.email,
            telefone: c.telefone ?? null,
            ultimoLogin: c.ultimoLogin ?? null,
            saldo: c.saldo ?? 0,
            credito: c.credito ?? 0,
            emprestimo: c.emprestimo ?? 0,
            broker: c.broker ?? null
          }));

          // 3) Aplica filtro de tipo (ALL/BROKER/CLIENTE)
          let merged: any[] = [];
          if (this.appliedFilter === 'BROKER') merged = normBrokers;
          else if (this.appliedFilter === 'CLIENTE') merged = normClientes;
          else merged = [...normBrokers, ...normClientes];

          // ordena opcionalmente por nome
          merged.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

          return merged;
        }),
        catchError(err => {
          console.error('[GerenteContent05] Erro ao montar lista a partir da equipe:', err);
          return of<any[]>([]);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe((list: any[]) => {
        this.usuarios = list ?? [];
        this.setupPagination();
      });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.setupPagination();
  }

  private filteredUsers(): any[] {
    if (!this.searchTerm) return this.usuarios;
    const term = this.searchTerm.toLowerCase();
    return this.usuarios.filter(u =>
      (u.nome && u.nome.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.cpf && String(u.cpf).includes(term)) ||
      (u.telefone && String(u.telefone).toLowerCase().includes(term)) ||
      (u.broker?.email && u.broker.email.toLowerCase().includes(term))
    );
  }

  pagedUsers(): any[] {
    const filtered = this.filteredUsers();
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  setupPagination() {
    const totalItems = this.filteredUsers().length;
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

  changePage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.setupPagination();
  }

  openDetails(u: any) {
    this.selectedUser = u;
  }

  refreshDetails() {
    if (!this.painel || !this.selectedUser) return;
    this.loadingDetails = true;
    this.painel.loadUser();
    setTimeout(() => this.loadingDetails = false, 500);
  }

  openCreateRelease(u: any) {
    this.selectedUser = u;
  }

  openCreateContrato(u: any) {
    this.selectedUser = u;
  }

  /** Converte uma data para "tempo atrás" em PT-BR curto */
  timeAgo(value: string | number | Date | null | undefined, nowMs?: number): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';

    const now = nowMs ? new Date(nowMs) : new Date();
    let diff = Math.floor((now.getTime() - d.getTime()) / 1000); // em segundos

    if (diff < 0) diff = 0;

    if (diff < 5) return 'agora';
    if (diff < 60) return `${diff} ${diff === 1 ? 'segundo' : 'segundos'}`;

    const min = Math.floor(diff / 60);
    if (min < 60) return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;

    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} ${hr === 1 ? 'hora' : 'horas'}`;

    const day = Math.floor(hr / 24);
    if (day < 30) return `${day} ${day === 1 ? 'dia' : 'dias'}`;

    const month = Math.floor(day / 30);
    if (month < 12) return `${month} ${month === 1 ? 'mês' : 'meses'}`;

    const year = Math.floor(day / 365);
    return `${year} ${year === 1 ? 'ano' : 'anos'}`;
  }

  // =========================
  // Permissões (mantidas)
  // Obs.: caso deseje simplificar para GERENTE-only, me avise.
  // =========================
  get canCreateContratoFor(): (u: any) => boolean {
    return (u: any) => {
      if (!u || u.role !== 'CLIENTE') return false;
      if (!this.user || !this.activeEnterprise) return false;
      const role = this.user.role;

      
      if (role === 'GERENTE') {
        return !!this.activeEnterprise.gerenteCriarContrato;
      }
      if (role === 'SUPORTE') {
        return !!this.activeEnterprise.suporteCriarContrato;
      }
      if (role === 'MANAGER') {
        return !!this.activeEnterprise.managerCriarContrato;
      }
      return false;
    };
  }

  get canCreateReleaseFor(): (u: any) => boolean {
    return (u: any) => {
      if (!u || u.role !== 'CLIENTE') return false;
      if (!this.user || !this.activeEnterprise) return false;

      const role = this.user.role;

      if (role === 'ROOT' || role === 'ADMINISTRADOR') {
        return true;
      }
      if (role === 'GERENTE') {
        return !!this.activeEnterprise.gerenteCriarRelease;
      }
      if (role === 'SUPORTE') {
        return !!this.activeEnterprise.suporteCriarRelease;
      }
      if (role === 'MANAGER') {
        return !!this.activeEnterprise.managerCriarRelease;
      }
      return false;
    };
  }
}
