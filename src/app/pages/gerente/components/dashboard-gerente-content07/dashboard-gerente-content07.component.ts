import { Component, HostListener, Input, OnInit } from '@angular/core';
import { Equipe, EquipeService, InfoVinculosPorEmail } from 'src/app/services/equipe.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { catchError, map, of, switchMap } from 'rxjs';

type ManageTab = 'link' | 'unlink' | 'transfer';

@Component({
  selector: 'app-dashboard-gerente-content07',
  templateUrl: './dashboard-gerente-content07.component.html',
  styleUrls: ['./dashboard-gerente-content07.component.css']
})
export class DashboardGerenteContent07Component implements OnInit {

  // se o pai já tiver o usuário logado, passe aqui (usado para descobrir o email)
  @Input() user?: { email?: string };

  equipes: any[] = [];
  loadingList = false;
  creating = false;
  deletingId: number | null = null;
  updatingId: number | null = null;
  actionsOpenForId: number | null = null;
  actionsMenuStyle: { [k: string]: string } = {};

  selectedLinkedBrokerIds: Set<number> = new Set();
  selectedLinkedClienteIds: Set<number> = new Set();

  // filtros locais
  gerenteFiltro = '';
  brokerFiltro = '';
  clienteFiltro = '';
  brokerVincFiltro = '';
  clienteVincFiltro = '';

  // vínculos
  vinculosOpenForId: number | null = null;
  loadingGerentes = false;
  loadingBrokers = false;
  loadingClientes = false;

  gerentesSemEquipe: any[] = [];
  brokersSemEquipe: any[] = [];
  clientesSemEquipe: any[] = [];

  selectedGerenteId: number | null = null;
  selectedBrokerIds: Set<number> = new Set();
  selectedClienteIds: Set<number> = new Set();

  form!: FormGroup;
  alertMessage: string | null = null;
  alertType: 'success' | 'danger' | 'warning' | 'info' = 'info';

  manageTab: ManageTab = 'link';

  // Consulta de vínculos por email
  emailConsulta = '';
  emailLookupLoading = false;
  emailLookupResult: InfoVinculosPorEmail | null = null;

  // ===== Modal: Manejar clientes =====
  manageOpen = false;
  manageEquipe: Equipe | null = null;
  manageBrokers: any[] = [];
  manageClientes: any[] = [];

  manageSelectedBrokerId: number | null = null;
  manageDestinoBrokerId: number | null = null;

  manageToLink: Set<number> = new Set();
  manageFromBroker: Set<number> = new Set();

  manageFiltroDisponiveis = '';
  manageFiltroBroker = '';

  // mapa brokerId -> Set<clienteId>
  brokerClientesMap: Record<number, Set<number>> = {};

  // fechar menu ao clicar fora / ESC / scroll / resize
  @HostListener('document:click') onDocClick() { this.closeActionsMenu(); }
  @HostListener('document:keydown.escape') onEsc() { this.closeActionsMenu(); }
  @HostListener('window:scroll') onScroll() { this.closeActionsMenu(); }
  @HostListener('window:resize') onResize() { this.closeActionsMenu(); }

  // listas filtradas (nome OU email)
  get gerentesFiltrados(): any[] {
    const f = this.gerenteFiltro.trim().toLowerCase();
    if (!f) return this.gerentesSemEquipe;
    return this.gerentesSemEquipe.filter(g =>
      (`${g.nome ?? ''} ${g.email ?? ''}`).toLowerCase().includes(f)
    );
  }

  get brokersFiltrados(): any[] {
    const f = this.brokerFiltro.trim().toLowerCase();
    if (!f) return this.brokersSemEquipe;
    return this.brokersSemEquipe.filter(b =>
      (`${b.nome ?? ''} ${b.email ?? ''}`).toLowerCase().includes(f)
    );
  }

  get clientesFiltrados(): any[] {
    const f = this.clienteFiltro.trim().toLowerCase();
    if (!f) return this.clientesSemEquipe;
    return this.clientesSemEquipe.filter(c =>
      (`${c.nome ?? ''} ${c.email ?? ''}`).toLowerCase().includes(f)
    );
  }

  constructor(
    private equipeSvc: EquipeService,
    private fb: FormBuilder,
    private userSvc: UserService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  // ================= LISTA / CRUD =================

  /** Descobre o email do gerente: usa @Input() user?.email; se não tiver, tenta via token */
  private getGerenteEmail$() {
    const email = this.user?.email;
    if (email) return of(email);

    const token = localStorage.getItem('authToken');
    if (!token) return of<string | null>(null);

    return this.userSvc.getUsuarioByToken(token).pipe(
      map((u: any) => u?.email ?? null),
      catchError(() => of<string | null>(null))
    );
  }

  carregarEquipes(): void {
    this.loadingList = true;
    this.getGerenteEmail$()
      .pipe(
        switchMap((email: string | null) => {
          if (!email) {
            this.showAlert('Não foi possível identificar o e-mail do gerente.', 'warning');
            return of<InfoVinculosPorEmail | null>(null);
          }
          return this.equipeSvc.consultarVinculosPorEmail(email).pipe(
            catchError(err => {
              console.error(err);
              this.showAlert('Falha ao consultar vínculo de equipe pelo e-mail do gerente.', 'danger');
              return of<InfoVinculosPorEmail | null>(null);
            })
          );
        }),
        switchMap((info: InfoVinculosPorEmail | null) => {
          if (!info || info.tipo !== 'GERENTE' || !info.vinculadoEquipe || !info.equipe?.id) {
            this.equipes = [];
            this.showAlert('Seu usuário não está vinculado a nenhuma equipe.', 'info');
            return of<any | null>(null);
          }
          const equipeId = info.equipe.id;
          return this.equipeSvc.obterEquipeDTO(equipeId).pipe(
            catchError(err => {
              console.error(err);
              this.showAlert('Falha ao carregar a equipe vinculada.', 'danger');
              return of<any | null>(null);
            })
          );
        })
      )
      .subscribe({
        next: (dto) => {
          if (dto) {
            // coloca apenas a equipe do gerente na tabela
            this.equipes = [dto];
          } else {
            this.equipes = [];
          }
        },
        error: () => { /* já tratado acima */ },
        complete: () => this.loadingList = false
      });
  }

  criarEquipe(): void {
    if (this.form.invalid) { this.showAlert('Preencha o nome da equipe.', 'warning'); return; }
    this.creating = true;
    const payload: Equipe = { nome: this.form.value.nome };
    this.equipeSvc.criarEquipe(payload).subscribe({
      next: () => {
        this.showAlert('Equipe criada com sucesso!', 'success');
        this.form.reset();
        // Recarrega a equipe do gerente
        this.carregarEquipes();
      },
      error: (err) => { this.showAlert('Erro ao criar a equipe.', 'danger'); console.error(err); },
      complete: () => this.creating = false
    });
  }

  iniciarEdicao(e: Equipe): void {
    this.updatingId = e.id!;
    this.form.patchValue({ nome: e.nome });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  salvarEdicao(): void {
    if (!this.updatingId) return;
    if (this.form.invalid) { this.showAlert('Informe um nome válido para a equipe.', 'warning'); return; }
    const payload: Equipe = { id: this.updatingId, nome: this.form.value.nome };
    this.equipeSvc.atualizarEquipe(this.updatingId, payload).subscribe({
      next: () => {
        this.showAlert('Equipe atualizada!', 'success');
        this.updatingId = null;
        this.form.reset();
        this.carregarEquipes(); // recarrega 1 equipe
      },
      error: (err) => { this.showAlert('Erro ao atualizar a equipe.', 'danger'); console.error(err); }
    });
  }

  cancelarEdicao(): void {
    this.updatingId = null;
    this.form.reset();
  }

  deletarEquipe(id?: number): void {
    if (!id) return;
    if (!confirm('Deseja realmente excluir esta equipe?')) return;
    this.deletingId = id;
    this.equipeSvc.deletarEquipe(id).subscribe({
      next: () => {
        this.showAlert('Equipe excluída.', 'success');
        this.carregarEquipes(); // ao excluir, tenta recarregar (provavelmente ficará vazio)
      },
      error: (err) => { this.showAlert('Erro ao excluir a equipe.', 'danger'); console.error(err); },
      complete: () => this.deletingId = null
    });
  }

  // ================= VÍNCULOS =================

  abrirVinculos(equipeId: number): void {
    this.vinculosOpenForId = (this.vinculosOpenForId === equipeId) ? null : equipeId;
    if (this.vinculosOpenForId) {
      this.selectedGerenteId = null;
      this.selectedBrokerIds.clear();
      this.selectedClienteIds.clear();
      this.selectedLinkedBrokerIds.clear();
      this.selectedLinkedClienteIds.clear();
      this.carregarGerentesSemEquipe();
      this.carregarBrokersSemEquipe();
      this.carregarClientesSemEquipe();
    }
  }

  private carregarGerentesSemEquipe(): void {
    this.loadingGerentes = true;
    this.equipeSvc.getGerentesSemEquipe().subscribe({
      next: (res) => this.gerentesSemEquipe = res || [],
      error: (err) => { this.showAlert('Falha ao carregar gerentes sem equipe.', 'danger'); console.error(err); },
      complete: () => this.loadingGerentes = false
    });
  }

  private carregarBrokersSemEquipe(): void {
    this.loadingBrokers = true;
    this.equipeSvc.getBrokersSemEquipe().subscribe({
      next: (res) => this.brokersSemEquipe = res || [],
      error: (err) => { this.showAlert('Falha ao carregar brokers sem equipe.', 'danger'); console.error(err); },
      complete: () => this.loadingBrokers = false
    });
  }

  private carregarClientesSemEquipe(): void {
    this.loadingClientes = true;
    this.equipeSvc.getClientesSemEquipe().subscribe({
      next: (res) => this.clientesSemEquipe = res || [],
      error: (err) => { this.showAlert('Falha ao carregar clientes sem equipe.', 'danger'); console.error(err); },
      complete: () => this.loadingClientes = false
    });
  }

  definirGerente(equipeId: number): void {
    if (!this.selectedGerenteId) { this.showAlert('Selecione um gerente.', 'warning'); return; }
    this.equipeSvc.adicionarGerente(equipeId, this.selectedGerenteId).subscribe({
      next: () => { this.showAlert('Gerente vinculado!', 'success'); this.carregarEquipes(); this.carregarGerentesSemEquipe(); },
      error: (err) => { this.showAlert('Erro ao vincular gerente.', 'danger'); console.error(err); }
    });
  }

  toggleBroker(id: number, checked: boolean): void {
    if (checked) this.selectedBrokerIds.add(id);
    else this.selectedBrokerIds.delete(id);
  }

  adicionarBrokers(equipeId: number): void {
    const ids = Array.from(this.selectedBrokerIds);
    if (!ids.length) { this.showAlert('Selecione ao menos um broker.', 'warning'); return; }
    this.equipeSvc.adicionarBrokers(equipeId, ids).subscribe({
      next: () => { this.showAlert('Brokers vinculados!', 'success'); this.carregarEquipes(); this.carregarBrokersSemEquipe(); this.selectedBrokerIds.clear(); },
      error: (err) => { this.showAlert('Erro ao vincular brokers.', 'danger'); console.error(err); }
    });
  }

  toggleCliente(id: number, checked: boolean): void {
    if (checked) this.selectedClienteIds.add(id);
    else this.selectedClienteIds.delete(id);
  }

  adicionarClientes(equipeId: number): void {
    const ids = Array.from(this.selectedClienteIds);
    if (!ids.length) { this.showAlert('Selecione ao menos um cliente.', 'warning'); return; }
    this.equipeSvc.adicionarClientes(equipeId, ids).subscribe({
      next: () => { this.showAlert('Clientes vinculados!', 'success'); this.carregarEquipes(); this.carregarClientesSemEquipe(); this.selectedClienteIds.clear(); },
      error: (err) => { this.showAlert('Erro ao vincular clientes.', 'danger'); console.error(err); }
    });
  }

  desvincularGerente(equipeId: number): void {
    if (!confirm('Remover o gerente desta equipe?')) return;
    this.equipeSvc.removerGerente(equipeId).subscribe({
      next: () => { this.showAlert('Gerente desvinculado.', 'success'); this.carregarEquipes(); },
      error: (err) => { this.showAlert('Erro ao desvincular gerente.', 'danger'); console.error(err); }
    });
  }

  toggleLinkedBroker(id: number, checked: boolean): void {
    if (checked) this.selectedLinkedBrokerIds.add(id);
    else this.selectedLinkedBrokerIds.delete(id);
  }

  toggleAllLinkedBrokers(checked: boolean, equipe: Equipe): void {
    const list = this.getBrokersVinculadosFiltrados(equipe);
    if (checked) list.forEach(b => this.selectedLinkedBrokerIds.add(b.id));
    else list.forEach(b => this.selectedLinkedBrokerIds.delete(b.id));
  }

  removerBrokersSelecionados(equipeId: number): void {
    const ids = Array.from(this.selectedLinkedBrokerIds);
    if (!ids.length) { this.showAlert('Selecione brokers para desvincular.', 'warning'); return; }
    if (!confirm('Remover os brokers selecionados desta equipe?')) return;

    this.equipeSvc.removerBrokers(equipeId, ids).subscribe({
      next: () => {
        this.showAlert('Brokers desvinculados.', 'success');
        this.selectedLinkedBrokerIds.clear();
        this.carregarEquipes();
        this.carregarBrokersSemEquipe();
      },
      error: (err) => { this.showAlert('Erro ao desvincular brokers.', 'danger'); console.error(err); }
    });
  }

  toggleLinkedCliente(id: number, checked: boolean): void {
    if (checked) this.selectedLinkedClienteIds.add(id);
    else this.selectedLinkedClienteIds.delete(id);
  }

  toggleAllLinkedClientes(checked: boolean, equipe: Equipe): void {
    const list = this.getClientesVinculadosFiltrados(equipe);
    if (checked) list.forEach(c => this.selectedLinkedClienteIds.add(c.id));
    else list.forEach(c => this.selectedLinkedClienteIds.delete(c.id));
  }

  removerClientesSelecionados(equipeId: number): void {
    const ids = Array.from(this.selectedLinkedClienteIds);
    if (!ids.length) { this.showAlert('Selecione clientes para desvincular.', 'warning'); return; }
    if (!confirm('Remover os clientes selecionados desta equipe?')) return;

    this.equipeSvc.removerClientes(equipeId, ids).subscribe({
      next: () => {
        this.showAlert('Clientes desvinculados.', 'success');
        this.selectedLinkedClienteIds.clear();
        this.carregarEquipes();
        this.carregarClientesSemEquipe();
      },
      error: (err) => { this.showAlert('Erro ao desvincular clientes.', 'danger'); console.error(err); }
    });
  }

  // =================== Modal de gerenciamento de clientes (broker) ===================

  switchManageTab(tab: ManageTab) {
    this.manageTab = tab;
    this.manageToLink.clear();
    this.manageFromBroker.clear();
  }

  openManageClientesModal(e: Equipe): void {
    this.manageOpen = true;
    this.manageEquipe = e;

    this.manageBrokers = (e.brokers || []) as any[];
    this.manageClientes = (e.clientes || []) as any[];

    this.manageTab = 'link';
    this.manageSelectedBrokerId = this.manageBrokers[0]?.id ?? null;
    this.manageDestinoBrokerId = null;

    this.manageToLink.clear();
    this.manageFromBroker.clear();
    this.manageFiltroDisponiveis = '';
    this.manageFiltroBroker = '';

    // Mapa broker -> clientes (pode vir de outro endpoint; aqui inferimos dos próprios brokers da equipe)
    this.brokerClientesMap = {};
    (this.manageBrokers || []).forEach((b: any) => {
      const clientesIds = (b.clientes || []).map((c: any) => c.id);
      this.brokerClientesMap[b.id] = new Set(clientesIds);
    });
  }

  closeManageModal(): void {
    this.manageOpen = false;
    this.manageEquipe = null;
  }

  // Ações: vincular / desvincular / transferir — mantêm UserService para endpoints específicos
  confirmVincular(): void {
    if (!this.manageSelectedBrokerId) return;
    const ids = Array.from(this.manageToLink);
    if (ids.length === 0) return;

    this.userSvc.vincularClientesAoBroker(this.manageSelectedBrokerId, ids).subscribe({
      next: () => {
        const set = this.brokerClientesMap[this.manageSelectedBrokerId!] || new Set<number>();
        ids.forEach(id => set.add(id));
        this.brokerClientesMap[this.manageSelectedBrokerId!] = set;
        this.manageToLink.clear();
        this.showAlert('Clientes vinculados ao broker!', 'success');
        // Atualiza tabela
        this.carregarEquipes();
      },
      error: (err) => { this.showAlert('Falha ao vincular clientes.', 'danger'); console.error(err); }
    });
  }

  confirmDesvincular(): void {
    if (!this.manageSelectedBrokerId) return;
    const ids = Array.from(this.manageFromBroker);
    if (ids.length === 0) return;

    if (!confirm('Desvincular os clientes selecionados deste broker?')) return;

    this.userSvc.desvincularClientesDoBroker(this.manageSelectedBrokerId, ids).subscribe({
      next: () => {
        const set = this.brokerClientesMap[this.manageSelectedBrokerId!] || new Set<number>();
        ids.forEach(id => set.delete(id));
        this.brokerClientesMap[this.manageSelectedBrokerId!] = set;
        this.manageFromBroker.clear();
        this.showAlert('Clientes desvinculados do broker.', 'success');
        this.carregarEquipes();
      },
      error: (err) => { this.showAlert('Falha ao desvincular clientes.', 'danger'); console.error(err); }
    });
  }

  confirmTransferir(): void {
    if (!this.manageSelectedBrokerId || !this.manageDestinoBrokerId) return;
    const ids = Array.from(this.manageFromBroker);
    if (ids.length === 0) return;

    if (!confirm('Transferir os clientes selecionados para o broker destino?')) return;

    this.userSvc.transferirClientesBroker(this.manageSelectedBrokerId, this.manageDestinoBrokerId, ids).subscribe({
      next: () => {
        const setOrig = this.brokerClientesMap[this.manageSelectedBrokerId!] || new Set<number>();
        const setDest = this.brokerClientesMap[this.manageDestinoBrokerId!] || new Set<number>();
        ids.forEach(id => { setOrig.delete(id); setDest.add(id); });
        this.brokerClientesMap[this.manageSelectedBrokerId!] = setOrig;
        this.brokerClientesMap[this.manageDestinoBrokerId!] = setDest;

        this.manageFromBroker.clear();
        this.showAlert('Clientes transferidos com sucesso.', 'success');
        this.carregarEquipes();
      },
      error: (err) => { this.showAlert('Falha ao transferir clientes.', 'danger'); console.error(err); }
    });
  }

  // ================= Utils =================

  private showAlert(msg: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info'): void {
    this.alertMessage = msg;
    this.alertType = type;
    setTimeout(() => (this.alertMessage = null), 4000);
  }

  toggleActionsMenu(id: number, event: MouseEvent): void {
    event.stopPropagation();

    if (this.actionsOpenForId === id) {
      this.closeActionsMenu();
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const gap = 6;
    const menuWidth = 200;

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    let top = rect.bottom + gap;
    const maxTop = window.innerHeight - 12;

    if (top > maxTop) {
      top = Math.max(8, rect.top - gap - 260);
    }

    this.actionsMenuStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`
    };
    this.actionsOpenForId = id;
  }

  closeActionsMenu(): void {
    this.actionsOpenForId = null;
  }

  // fecha ao clicar fora
  @HostListener('document:click')
  onDocumentClick(): void {
    this.actionsOpenForId = null;
  }

  getBrokersVinculadosFiltrados(e: Equipe): any[] {
    const list = (e.brokers || []) as any[];
    const f = this.brokerVincFiltro.trim().toLowerCase();
    if (!f) return list;
    return list.filter(b => (`${b.nome ?? ''} ${b.email ?? ''}`).toLowerCase().includes(f));
  }

  getClientesVinculadosFiltrados(e: Equipe): any[] {
    const list = (e.clientes || []) as any[];
    const f = this.clienteVincFiltro.trim().toLowerCase();
    if (!f) return list;
    return list.filter(c => (`${c.nome ?? ''} ${c.email ?? ''}`).toLowerCase().includes(f));
  }

  toggleAllBrokers(checked: boolean): void {
    if (checked) this.brokersFiltrados.forEach(b => this.selectedBrokerIds.add(b.id));
    else this.brokersFiltrados.forEach(b => this.selectedBrokerIds.delete(b.id));
  }

  toggleAllClientes(checked: boolean): void {
    if (checked) this.clientesFiltrados.forEach(c => this.selectedClienteIds.add(c.id));
    else this.clientesFiltrados.forEach(c => this.selectedClienteIds.delete(c.id));
  }

  toggleToLink(id: number, checked: boolean): void {
    checked ? this.manageToLink.add(id) : this.manageToLink.delete(id);
  }

  toggleAllToLink(checked: boolean): void {
    const ids = this.getDisponiveisFiltrados().map(c => c.id);
    ids.forEach(id => checked ? this.manageToLink.add(id) : this.manageToLink.delete(id));
  }

  toggleFromBroker(id: number, checked: boolean): void {
    checked ? this.manageFromBroker.add(id) : this.manageFromBroker.delete(id);
  }

  toggleAllFromBroker(checked: boolean): void {
    const ids = this.getClientesDoBrokerFiltrados().map(c => c.id);
    ids.forEach(id => checked ? this.manageFromBroker.add(id) : this.manageFromBroker.delete(id));
  }

  private matchesFilter(obj: any, filter: string): boolean {
    const f = (filter || '').trim().toLowerCase();
    if (!f) return true;
    return (`${obj.nome ?? ''} ${obj.email ?? ''}`).toLowerCase().includes(f);
  }

  isClientInBroker(clienteId: number, brokerId: number): boolean {
    return !!this.brokerClientesMap[brokerId]?.has(clienteId);
  }

  isClientInAnyBroker(clienteId: number): boolean {
    return Object.values(this.brokerClientesMap || {}).some(set => set?.has(clienteId));
  }

  /** clientes da equipe (todos) filtrados para o painel "Disponíveis" */
  getDisponiveisFiltrados(): any[] {
    return this.manageClientes
      .filter(c => !this.isClientInAnyBroker(c.id))
      .filter(c => this.matchesFilter(c, this.manageFiltroDisponiveis));
  }

  /** clientes da equipe que pertencem ao broker selecionado */
  getClientesDoBroker(): any[] {
    if (!this.manageSelectedBrokerId) return [];
    const setIds = this.brokerClientesMap[this.manageSelectedBrokerId] || new Set<number>();
    return this.manageClientes.filter(c => setIds.has(c.id));
  }

  getClientesDoBrokerFiltrados(): any[] {
    return this.getClientesDoBroker()
      .filter(c => this.matchesFilter(c, this.manageFiltroBroker));
  }

  // ===== Consulta de vínculos por e-mail (card inferior) =====
  consultarPorEmail(): void {
    const email = (this.emailConsulta || '').trim();
    if (!email) {
      this.showAlert('Informe um e-mail para consulta.', 'warning');
      return;
    }
    this.emailLookupLoading = true;
    this.emailLookupResult = null;

    this.equipeSvc.consultarVinculosPorEmail(email).subscribe({
      next: (res) => {
        this.emailLookupResult = res;
        if (!res) this.showAlert('Nenhuma informação encontrada para este e-mail.', 'info');
      },
      error: (err) => {
        this.showAlert('Falha ao consultar vínculos pelo e-mail informado.', 'danger');
        console.error(err);
      },
      complete: () => (this.emailLookupLoading = false)
    });
  }

  limparConsultaEmail(): void {
    this.emailConsulta = '';
    this.emailLookupResult = null;
  }

}
