import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { AdminPainel01Component } from '../../paineis/admin-painel01/admin-painel01.component';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { finalize } from 'rxjs';

type FilterType =
  | 'ALL'
  | 'CLIENTE'
  | 'BROKER'
  | 'ADMINISTRADOR'
  | 'FINANCEIRO'
  | 'GERENTE'
  | 'MANAGER'
  | 'SUPORTE'
  | 'ROOT';


@Component({
  selector: 'app-dashboard-admin-content05',
  templateUrl: './dashboard-admin-content05.component.html',
  styleUrls: ['./dashboard-admin-content05.component.css']
})
export class DashboardAdminContent05Component implements OnInit, OnDestroy {

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
    private userService: UserService,
    private enterpriseService: EnterpriseService
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
      .pipe()
      .subscribe({
        next: (e: any) => {
          this.activeEnterprise = e ?? null;
        },
        error: () => {
          this.activeEnterprise = null;
        }
      });
  }


  onFilterChange(): void {
    this.appliedFilter = this.filterType;
    this.loading = true;
    this.currentPage = 1;

    let obs$;
    if (this.filterType === 'CLIENTE') {
      // tem endpoint dedicado
      obs$ = this.userService.listarClientes();
      obs$
    } else if (this.filterType === 'BROKER') {
      // tem endpoint dedicado
      obs$ = this.userService.listarBrokers();
    } else {
      // demais roles (e ALL): busca todos e filtra no TS
      obs$ = this.userService.getAllUsuarios();
    }

    obs$.subscribe({
      next: (data: any[]) => {
        let result = data || [];

        // quando não for ALL/CLIENTE/BROKER, filtramos por role localmente
        const others: FilterType[] = [
          'ADMINISTRADOR', 'FINANCEIRO', 'GERENTE', 'MANAGER', 'SUPORTE', 'ROOT'
        ];
        if (others.includes(this.filterType)) {
          result = result.filter(u => u.role === this.filterType);
        }

        this.usuarios = result.reverse();
        this.setupPagination();
      },
      error: () => {
        this.usuarios = [];
        this.setupPagination();
      },
      complete: () => this.loading = false
    });
  }


  onSearchChange(): void {
    // sempre que mudar o termo, resetar página e recalcular
    this.currentPage = 1;
    this.setupPagination();
  }

  private filteredUsers(): any[] {
    if (!this.searchTerm) return this.usuarios;
    const term = this.searchTerm.toLowerCase();
    return this.usuarios.filter(u =>
      u.nome?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      (u.cpf && u.cpf.toString().includes(term)) ||
      (u.telefone && u.telefone.toString().includes(term)) ||
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

    if (diff < 0) diff = 0; // se vier no futuro por fuso/latência, evita texto negativo

    if (diff < 5) return 'agora';
    if (diff < 60) return `${diff} ${diff === 1 ? 'segundo' : 'segundos'}`;

    const min = Math.floor(diff / 60);
    if (min < 60) return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;

    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} ${hr === 1 ? 'hora' : 'horas'}`;

    const day = Math.floor(hr / 24);
    if (day < 30) return `${day} ${day === 1 ? 'dia' : 'dias'}`;

    const month = Math.floor(day / 30); // aproximação
    if (month < 12) return `${month} ${month === 1 ? 'mês' : 'meses'}`;

    const year = Math.floor(day / 365); // aproximação
    return `${year} ${year === 1 ? 'ano' : 'anos'}`;
  }




  get canCreateContratoFor(): (u: any) => boolean {
    return (u: any) => {
      if (!u || u.role !== 'CLIENTE') return false;
      if (!this.user || !this.activeEnterprise) return false;
      const role = this.user.role;

      if (role === 'ROOT' || role === 'ADMINISTRADOR') {
        return true;
      }

      if (role === 'FINANCEIRO') {
        return !!this.activeEnterprise.financeiroCriarContrato;
      }
      if (role === 'SUPORTE') {
        return !!this.activeEnterprise.suporteCriarContrato;
      }
      if (role === 'MANAGER') {
        return !!this.activeEnterprise.managerCriarContrato;
      }

      return false; // demais roles não podem
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

      if (role === 'FINANCEIRO') {
        return !!this.activeEnterprise.financeiroCriarRelease;
      }
      if (role === 'SUPORTE') {
        return !!this.activeEnterprise.suporteCriarRelease;
      }
      if (role === 'MANAGER') {
        return !!this.activeEnterprise.managerCriarRelease;
      }

      return false; // demais roles não podem
    };
  }

}
