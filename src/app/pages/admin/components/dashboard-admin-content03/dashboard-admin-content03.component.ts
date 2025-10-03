import { Component, HostListener, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService, MarketCategory } from 'src/app/services/api.service';
import { LeilaoService, Leilao, Lance } from 'src/app/services/leilao.service';
import { UserService } from 'src/app/services/user.service';

export interface User {
  id?: number;
  email?: string;
  name?: string;
  role?: string;
}

type FormTipo = 'INGLES' | 'HOLANDES';

@Component({
  selector: 'app-dashboard-admin-content03',
  templateUrl: './dashboard-admin-content03.component.html',
  styleUrls: ['./dashboard-admin-content03.component.css'],
})
export class DashboardAdminContent03Component implements OnInit {
  // ===== Lista de Leilões =====
  leiloes: Leilao[] = [];
  loadingList = false;
  listError = '';

  // ===== Modal: Criar Leilão =====
  showCreateModal = false;
  creating = false;
  createError = '';
  novo = this.resetNovo();

  // Whitelist (criação)
  usersLoaded = false;
  loadingUsers = false;
  allUsers: User[] = [];
  filterEmail = '';
  selectedWhitelist = new Set<string>();

  // ===== Modal: Lances =====
  showLancesModal = false;
  selected?: Leilao;
  lances: Lance[] = [];
  loadingLances = false;
  lancesError = '';
  darLanceEmail = '';
  darLanceValor?: number;

  // ===== Modal: Editar Acesso =====
  showEditModal = false;
  edTarget?: Leilao;
  edLiberar = false;
  edSelected = new Set<string>();
  edFilter = '';
  edError = '';
  edSaving = false;

  // ===== Modal: Editar Informações =====
  showEditInfoModal = false;
  edInfo?: Leilao;
  edInfoSaving = false;
  edInfoError = '';

  // ===== Tabela =====
  ultimoLancePorLeilao: Record<number, number | null> = {};
  precoCarregando = new Set<number>();

  // ===== Menu =====
  menuContext: Leilao | null = null;
  menuTop = 0;
  menuLeft = 0;

  constructor(
    private leilaoSrv: LeilaoService,
    private userSrv: UserService,
    private api: ApiService,
  ) { }

  ngOnInit(): void {
    this.carregarLeiloes();
  }

  // ---------- Helpers ----------
  private resetNovo() {
    return {
      tipoLeilao: 'INGLES' as FormTipo,
      automatico: false,
      nomeAtivo: '',
      symbolAtivo: '',
      lanceInicial: null as number | null,
      incrementoMinimo: null as number | null,
      valorAtualAtivo: null as number | null,
      volumeLotes: null as number | null,
      valorDesagio: null as number | null,
      dataInicio: '',
      dataFim: '',
      liberarParaTodosClientes: false,
    };
  }

  fmtData(dt?: string | null) {
    if (!dt) return '—';
    const d = new Date(dt);
    return isNaN(+d) ? dt : d.toLocaleString();
  }

  safeLower(s?: string): string {
    return (s ?? '').toLowerCase();
  }

  // usado no template: badge com logo
  public urlSymbol(symbol: string): string {
    const base = (symbol || '').trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }

  // mostra “Último lance” com fallback
  public ultimoLance(l: Leilao): number {
    const v = this.ultimoLancePorLeilao[l.id];
    return v != null ? v : (l.lanceInicial ?? 0);
  }

  get selectedWhitelistArray(): string[] {
    return Array.from(this.selectedWhitelist);
  }
  get edSelectedArray(): string[] {
    return Array.from(this.edSelected);
  }

  // ---------- Leilões ----------
  carregarLeiloes() {
    this.loadingList = true;
    this.listError = '';
    this.leilaoSrv.listarLeiloes().subscribe({
      next: (res) => {
        this.leiloes = res || [];
        this.preencherUltimosLances(this.leiloes);
        this.atualizarValoresAtivos(this.leiloes);
      },
      error: (err) => (this.listError = err?.error?.message || 'Falha ao listar leilões.'),
      complete: () => (this.loadingList = false),
    });
  }

  deletarLeilao(id: number) {
    if (!confirm('Confirma remover este leilão?')) return;
    this.leilaoSrv.deletarLeilao(id).subscribe({
      next: () => this.carregarLeiloes(),
      error: (err) => alert(err?.error?.message || 'Falha ao deletar leilão.'),
    });
  }

  toggleLiberarParaTodos(leilao: Leilao) {
    const novoValor = !leilao.liberarParaTodosClientes;
    this.leilaoSrv.patchLiberarParaTodos(leilao.id, novoValor).subscribe({
      next: (res) => (leilao.liberarParaTodosClientes = res.liberarParaTodosClientes),
      error: (err) => alert(err?.error?.message || 'Falha ao alterar a liberação.'),
    });
  }

  // ---------- Modal: Criar ----------
  abrirCriarModal() {
    this.createError = '';
    this.novo = this.resetNovo();
    this.showCreateModal = true;
  }
  fecharCriarModal() {
    if (this.creating) return;
    this.showCreateModal = false;
  }

  criarLeilao() {
    if (!this.novo.nomeAtivo?.trim() || !this.novo.symbolAtivo?.trim()) {
      this.createError = 'Preencha Nome do Ativo e Symbol.';
      return;
    }
    this.createError = '';
    this.creating = true;

    const payload: any = {
      tipoLeilao: this.novo.tipoLeilao,
      automatico: this.novo.automatico,
      nomeAtivo: this.novo.nomeAtivo.trim(),
      symbolAtivo: this.novo.symbolAtivo.trim(),
      lanceInicial: this.novo.tipoLeilao === 'INGLES' ? (this.novo.lanceInicial ?? null) : null,
      incrementoMinimo: this.novo.tipoLeilao === 'INGLES' ? (this.novo.incrementoMinimo ?? null) : null,
      valorAtualAtivo: this.novo.tipoLeilao === 'HOLANDES' ? (this.novo.valorAtualAtivo ?? null) : this.novo.valorAtualAtivo ?? null,
      volumeLotes: this.novo.volumeLotes ?? null,
      valorDesagio: this.novo.valorDesagio ?? null,
      dataInicio: this.novo.dataInicio || null,
      dataFim: this.novo.dataFim || null,
      liberarParaTodosClientes: this.novo.liberarParaTodosClientes,
      listaBrancaEmails: Array.from(this.selectedWhitelist),
    };

    this.leilaoSrv.criarLeilao(payload).subscribe({
      next: () => {
        this.novo = this.resetNovo();
        this.selectedWhitelist.clear();
        this.filterEmail = '';
        this.showCreateModal = false;
        this.carregarLeiloes();
      },
      error: (err) => (this.createError = err?.error?.message || 'Falha ao criar leilão.'),
      complete: () => (this.creating = false),
    });
  }

  // ---------- Modal: Lances ----------
  abrirLancesModal(l: Leilao) {
    this.selected = l;
    this.showLancesModal = true;
    this.lancesError = '';
    this.darLanceEmail = '';
    this.darLanceValor = undefined;
    this.carregarLances();
  }
  fecharLancesModal() {
    this.showLancesModal = false;
    this.selected = undefined;
    this.lances = [];
    this.lancesError = '';
  }

  carregarLances() {
    if (!this.selected) return;
    this.loadingLances = true;
    this.leilaoSrv.listarLances(this.selected.id).subscribe({
      next: (res) => (this.lances = res),
      error: (err) => (this.lancesError = err?.error?.message || 'Falha ao carregar lances.'),
      complete: () => (this.loadingLances = false),
    });
  }

  enviarLance() {
    if (!this.selected) return;
    if (!this.darLanceEmail?.trim()) {
      this.lancesError = 'Informe o e-mail do licitante.';
      return;
    }
    const isIngles = this.selected.tipoLeilao === 'INGLES';
    if (isIngles && (this.darLanceValor == null || this.darLanceValor <= 0)) {
      this.lancesError = 'Informe um valor de lance válido.';
      return;
    }
    this.leilaoSrv
      .darLance(this.selected.id, this.darLanceEmail.trim().toLowerCase(), isIngles ? this.darLanceValor : undefined)
      .subscribe({
        next: () => {
          this.darLanceEmail = '';
          this.darLanceValor = undefined;
          this.carregarLances();
          this.carregarLeiloes();
        },
        error: (err) => (this.lancesError = err?.error?.message || 'Falha ao dar lance.'),
      });
  }

  deletarLance(l: Lance) {
    if (!confirm('Confirma remover este lance?')) return;
    this.leilaoSrv.deletarLance(l.id).subscribe({
      next: () => this.carregarLances(),
      error: (err) => alert(err?.error?.message || 'Falha ao deletar lance.'),
    });
  }

  // ---------- Whitelist (criação) ----------
  buscarUsuarios() {
    if (this.usersLoaded) return;
    this.loadingUsers = true;
    this.userSrv.getAllUsuarios().subscribe({
      next: (users) => { this.allUsers = users || []; this.usersLoaded = true; },
      error: () => { this.allUsers = []; this.usersLoaded = false; alert('Falha ao buscar usuários.'); },
      complete: () => (this.loadingUsers = false),
    });
  }

  get filteredAllUsers(): User[] {
    const k = (this.filterEmail || '').toLowerCase().trim();
    if (!k) return this.allUsers;
    return this.allUsers.filter(u =>
      this.safeLower(u.email).includes(k) || (u.name || '').toLowerCase().includes(k)
    );
  }

  addToWhitelist(email?: string) {
    if (!email) return;
    this.selectedWhitelist.add(email.toLowerCase());
  }
  removeFromWhitelist(email: string) {
    this.selectedWhitelist.delete(email.toLowerCase());
  }

  // ---------- Modal: Editar Acesso ----------
  abrirEditarModal(l: Leilao) {
    this.edTarget = l;
    this.edLiberar = !!l.liberarParaTodosClientes;
    this.edSelected = new Set<string>((l.listaBrancaEmails || []).map(e => (e || '').toLowerCase()));
    this.edFilter = '';
    this.edError = '';
    this.showEditModal = true;
    if (!this.usersLoaded) this.buscarUsuarios();
  }
  fecharEditarModal() {
    this.showEditModal = false;
    this.edTarget = undefined;
    this.edSelected.clear();
    this.edSaving = false;
    this.edError = '';
  }
  noop() { }

  get edFilteredUsers(): User[] {
    const k = (this.edFilter || '').toLowerCase().trim();
    const onlyClients = this.allUsers.filter(u => (u.role || '').toUpperCase() === 'CLIENTE');
    if (!k) return onlyClients;
    return onlyClients.filter(u =>
      this.safeLower(u.email).includes(k) || (u.name || '').toLowerCase().includes(k)
    );
  }

  edAdd(email?: string) {
    if (!email) return;
    this.edSelected.add(email.toLowerCase());
  }
  edRemove(email: string) {
    this.edSelected.delete(email.toLowerCase());
  }

  salvarEdicao() {
    if (!this.edTarget) return;
    this.edSaving = true;
    this.edError = '';

    const id = this.edTarget.id;
    const emails = Array.from(this.edSelected);

    const afterPatch = () => {
      this.leilaoSrv.putListaBranca(id, emails).subscribe({
        next: (res) => {
          this.applyLeilaoUpdate(res);
          this.edTarget = res;
          this.edSaving = false;
          this.fecharEditarModal();
        },
        error: (err) => {
          this.edError = err?.error?.message || 'Falha ao salvar lista branca.';
          this.edSaving = false;
        }
      });
    };

    if (this.edTarget.liberarParaTodosClientes !== this.edLiberar) {
      this.leilaoSrv.patchLiberarParaTodos(id, this.edLiberar).subscribe({
        next: (res) => { this.applyLeilaoUpdate(res); this.edTarget = res; afterPatch(); },
        error: (err) => { this.edError = err?.error?.message || 'Falha ao alterar a liberação.'; this.edSaving = false; }
      });
    } else {
      afterPatch();
    }
  }

  // ---------- Modal: Editar Informações ----------
  abrirEditarInfoModal(l: Leilao) {
    this.edInfo = { ...l };
    this.edInfoError = '';
    this.edInfoSaving = false;
    this.showEditInfoModal = true;
  }
  fecharEditarInfoModal() {
    if (this.edInfoSaving) return;
    this.showEditInfoModal = false;
    this.edInfo = undefined;
    this.edInfoError = '';
  }

  salvarEdicaoInfo() {
    if (!this.edInfo) return;
    this.edInfoSaving = true;
    this.edInfoError = '';

    const patch: Partial<Leilao> = {
      tipoLeilao: this.edInfo.tipoLeilao,
      automatico: this.edInfo.automatico,
      nomeAtivo: (this.edInfo.nomeAtivo || '').trim(),
      symbolAtivo: (this.edInfo.symbolAtivo || '').trim(),
      volumeLotes: this.edInfo.volumeLotes ?? null,
      valorDesagio: this.edInfo.valorDesagio ?? null,
      dataInicio: this.edInfo.dataInicio || null,
      dataFim: this.edInfo.dataFim || null,
    };

    if (this.edInfo.tipoLeilao === 'INGLES') {
      patch.lanceInicial = this.edInfo.lanceInicial ?? null;
      patch.incrementoMinimo = this.edInfo.incrementoMinimo ?? null;
      patch.valorAtualAtivo = null;
    } else {
      patch.lanceInicial = null;
      patch.incrementoMinimo = null;
      patch.valorAtualAtivo = this.edInfo.valorAtualAtivo ?? null;
    }

    this.leilaoSrv.atualizarLeilao(this.edInfo.id, patch).subscribe({
      next: (res) => {
        this.applyLeilaoUpdate(res);
        this.edInfoSaving = false;
        this.showEditInfoModal = false;
        this.atualizarValoresAtivos(this.leiloes);
      },
      error: (err) => {
        this.edInfoError = err?.error?.message || 'Falha ao salvar alterações.';
        this.edInfoSaving = false;
      }
    });
  }

  // ---------- Aux ----------
  private applyLeilaoUpdate(updated: Leilao) {
    const idx = this.leiloes.findIndex(x => x.id === updated.id);
    if (idx >= 0) this.leiloes[idx] = updated;
  }

  private preencherUltimosLances(leiloes: Leilao[]) {
    for (const l of leiloes) {
      this.ultimoLancePorLeilao[l.id] = null;
      this.leilaoSrv.listarLances(l.id).subscribe({
        next: (lances) => {
          if (Array.isArray(lances) && lances.length) {
            const max = Math.max(...lances.map(x => Number(x?.valor ?? 0)));
            this.ultimoLancePorLeilao[l.id] = max;
          } else {
            this.ultimoLancePorLeilao[l.id] = l.lanceInicial ?? 0;
          }
        },
        error: () => {
          this.ultimoLancePorLeilao[l.id] = l.lanceInicial ?? 0;
        }
      });
    }
  }

  private atualizarValoresAtivos(leiloes: Leilao[]) {
    const cats: MarketCategory[] = ['stocks', 'forex', 'indices', 'commodities', 'crypto'];
    this.precoCarregando = new Set<number>(leiloes.map(x => x.id));

    forkJoin(cats.map(cat => this.api.getCategoryList(cat))).subscribe({
      next: (lists) => {
        const all = lists.flat().filter(Boolean);
        const priceBySymbol = new Map<string, number>();

        for (const it of all) {
          const symRaw = it?.symbol ?? it?.ticker ?? '';
          const sym = this.cleanSymbol(symRaw);
          const price = typeof it?.price === 'number'
            ? it.price
            : (typeof it?.ask === 'number' ? it.ask
              : (typeof it?.bid === 'number' ? it.bid : null));
          if (sym && typeof price === 'number') priceBySymbol.set(sym, price);
        }

        for (const l of leiloes) {
          const sym = this.cleanSymbol(l.symbolAtivo);
          const price = priceBySymbol.get(sym);
          if (typeof price === 'number') l.valorAtualAtivo = price;
          this.precoCarregando.delete(l.id);
        }
      },
      error: () => {
        for (const l of leiloes) this.precoCarregando.delete(l.id);
      }
    });
  }

  private cleanSymbol(symRaw: string): string {
    if (!symRaw) return '';
    return symRaw.trim().replace(/^\^+/, '').replace(/\..*$/, '').toUpperCase();
  }

  // ---------- Menu ----------
  openActions(ev: MouseEvent, l: Leilao) {
    ev.stopPropagation();
    const btn = ev.currentTarget as HTMLElement;
    const r = btn.getBoundingClientRect();
    const menuWidth = 180;
    const gap = 6;
    this.menuTop = r.bottom + window.scrollY + gap;
    this.menuLeft = r.right + window.scrollX - menuWidth;
    this.menuContext = l;
  }
  closeActions() { this.menuContext = null; }

  @HostListener('document:click') onDocClick() { this.closeActions(); }
  @HostListener('window:scroll') onWinScroll() { this.closeActions(); }
  @HostListener('window:resize') onWinResize() { this.closeActions(); }
  @HostListener('document:keydown.escape') onEsc() { this.closeActions(); }

  // ADICIONE no DashboardAdminContent03Component:
  finalizarLeilao(target: Leilao | number) {
    const id = typeof target === 'number' ? target : target.id;
    if (!confirm('Deseja encerrar este leilão agora?')) return;

    this.leilaoSrv.encerrarLeilao(id).subscribe({
      next: (res) => {
        this.applyLeilaoUpdate(res);   // atualiza status/fields na tabela
        // opcional: alert(`Leilão #${res.id} encerrado. Arrematante: ${res.arrematanteEmail ?? '—'}`);
      },
      error: (err) => alert(err?.error?.message || 'Falha ao encerrar leilão.'),
    });
  }

}
