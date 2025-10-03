import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BotService } from 'src/app/services/bot.service';
import { UserService } from 'src/app/services/user.service';
import { Bot } from 'src/app/models/bot';

type MarketDirection = 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks';

@Component({
  selector: 'app-admin-painel05',
  templateUrl: './admin-painel05.component.html',
  styleUrls: ['./admin-painel05.component.css']
})
export class AdminPainel05Component implements OnInit, OnChanges {

  @Input() selectedForBot: any;
  @Input() user: any;
  @Input() direction: any;
  @Input() openNonce = 0;

  // Form fields
  codKeyPass = '';
  direcaoMercado: MarketDirection = 'stocks';
  profile = 'scalping';
  stopType = 'PERCENT';
  volume: number | null = null;
  stopWin: number | null = null;
  stopLoss: number | null = null;
  saldo: number | null = null;

  // UI state
  loading = false;
  successMsg: string | null = null;
  errorMsg: string | null = null;

  // Seleção de cliente
  allowedToPickClients = false;
  clients: any[] = [];
  clientRows: any[] = [];
  clientQuery = '';
  clientPage = 1;
  clientPageSize = 10;
  clientTotal = 0;
  private clientsLoadedForRole = ''; // evita recarregar desnecessariamente

  selectedCliente: any | null = null;

  // selects
  profiles = [
    { value: 'scalping', label: 'Scalping' },
    { value: 'swing', label: 'Swing' },
    { value: 'trend', label: 'Trend Following' },
  ];
  stopTypes = [
    { value: 'PERCENT', label: 'Percentual (%)' },
    { value: 'FIXED', label: 'Fixo (valor)' },
  ];

  private resetFormKeepAsset() {
    // Campos editáveis
    this.codKeyPass = '';
    this.profile = 'scalping';
    this.stopType = 'PERCENT';
    this.volume = null;
    this.stopWin = null;
    this.stopLoss = null;
    this.saldo = null;

    // Estado UI
    this.loading = false;
    this.successMsg = null;
    this.errorMsg = null;

    // Seleção de cliente e filtro
    this.selectedCliente = null;
    this.clientQuery = '';
    this.clientPage = 1;
    this.applyClientFilterAndPaging(); // atualiza tabela com o filtro limpo
  }

  constructor(
    private botService: BotService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.applyDirection(this.direction, this.selectedForBot);
    this.setupRoleAndMaybeLoadClients(this.user);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Sempre que o pai “abrir” de novo (openNonce mudar), reseta o form
    if (changes['openNonce'] && !changes['openNonce'].firstChange) {
      this.resetFormKeepAsset();
      // re-aplica direção do mercado para o ativo atual
      this.applyDirection(this.direction, this.selectedForBot);
    }

    // Se trocar ativo ou direção explicitamente, também reseta
    if ((changes['selectedForBot'] && !changes['selectedForBot'].firstChange) ||
      (changes['direction'] && !changes['direction'].firstChange)) {
      this.resetFormKeepAsset();
      this.applyDirection(this.direction, this.selectedForBot);
    }

    if (changes['user'] && !changes['user'].firstChange) {
      this.setupRoleAndMaybeLoadClients(this.user);
    }
  }

  /** Ajusta direcaoMercado com base no input do pai ou símbolo */
  private applyDirection(direction: any, selectedForBot: any) {
    if (direction) {
      const d = String(direction).toLowerCase();
      if (['forex', 'indices', 'commodities', 'crypto', 'stocks'].includes(d)) {
        this.direcaoMercado = d as MarketDirection;
        return;
      }
    }
    if (selectedForBot?.symbol) {
      const s = String(selectedForBot.symbol).toUpperCase();
      this.direcaoMercado = s.includes('/') ? 'forex' : 'stocks';
    }
  }

  /** Define permissão pela role e carrega clientes conforme necessário */
  private setupRoleAndMaybeLoadClients(user: any) {
    const role = String(user?.role ?? '').toUpperCase();
    this.allowedToPickClients = ['ROOT', 'ADMINISTRADOR', 'BROKER'].includes(role);

    if (!this.allowedToPickClients) {
      this.clients = [];
      this.clientRows = [];
      this.clientTotal = 0;
      this.clientsLoadedForRole = '';
      return;
    }

    if (this.clientsLoadedForRole === role) return; // evita reload desnecessário
    this.clientsLoadedForRole = role;

    if (role === 'ROOT' || role === 'ADMINISTRADOR') {
      this.userService.listarClientes().subscribe({
        next: (arr) => { this.clients = Array.isArray(arr) ? arr : []; this.clientPage = 1; this.applyClientFilterAndPaging(); },
        error: () => { this.clients = []; this.applyClientFilterAndPaging(); }
      });
    } else if (role === 'BROKER' && user?.id) {
      this.userService.getClientesByUserId(user.id).subscribe({
        next: (arr) => { this.clients = Array.isArray(arr) ? arr : []; this.clientPage = 1; this.applyClientFilterAndPaging(); },
        error: () => { this.clients = []; this.applyClientFilterAndPaging(); }
      });
    }
  }

  // Fallback quando não pode escolher cliente
  get fallbackClienteId(): number | null {
    return this.user?.clienteId ?? this.user?.id ?? this.user?.cliente?.id ?? null;
  }

  // Identificação do ativo
  get symbol(): string {
    return this.selectedForBot?.symbol ?? '';
  }
  get nomeAtivo(): string {
    return this.selectedForBot?.name ?? this.selectedForBot?.companyName ?? '-';
  }

  // ===== Seleção de clientes =====
  selectClient(c: any) {
    this.selectedCliente = c;
  }
  clearSelectedClient() {
    this.selectedCliente = null;
  }
  trackClient = (_: number, c: any) => c?.id ?? _;

  get clientTotalPages(): number {
    return Math.max(1, Math.ceil(this.clientTotal / this.clientPageSize));
  }
  prevClientPage() {
    if (this.clientPage > 1) { this.clientPage--; this.applyClientFilterAndPaging(); }
  }
  nextClientPage() {
    if (this.clientPage < this.clientTotalPages) { this.clientPage++; this.applyClientFilterAndPaging(); }
  }
  goToClientPage(p: any) {
    const num = Number(p);
    if (!Number.isFinite(num)) return;
    const target = Math.min(Math.max(1, num), this.clientTotalPages);
    if (target !== this.clientPage) {
      this.clientPage = target;
      this.applyClientFilterAndPaging();
    }
  }
  clientPageList(): (number | string)[] {
    const total = this.clientTotalPages;
    const curr = this.clientPage;
    const win = 2;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = new Set<number>();
    pages.add(1); pages.add(total);
    for (let p = Math.max(1, curr - win); p <= Math.min(total, curr + win); p++) pages.add(p);
    pages.add(2); pages.add(3); pages.add(total - 1); pages.add(total - 2);

    const sorted = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const out: (number | string)[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (i === 0) out.push(p);
      else {
        const prev = sorted[i - 1];
        if (p === prev + 1) out.push(p);
        else out.push('…', p);
      }
    }
    return out.filter((v, i, arr) => !(v === '…' && arr[i - 1] === '…'));
  }

  private normalize(s: string): string {
    return (s || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();
  }
  private matchesClient(c: any, q: string): boolean {
    const name = this.normalize(c?.nome ?? c?.name ?? '');
    const email = this.normalize(c?.email ?? '');
    if (!q) return true;
    return name.includes(q) || email.includes(q);
  }
  applyClientFilterAndPaging() {
    const q = this.normalize(this.clientQuery);
    const filtered = (this.clients || []).filter(c => this.matchesClient(c, q));
    this.clientTotal = filtered.length;
    const start = (this.clientPage - 1) * this.clientPageSize;
    this.clientRows = filtered.slice(start, start + this.clientPageSize);
  }

  private getEffectiveClienteId(): number | null {
    if (this.allowedToPickClients) {
      return this.selectedCliente?.id ?? null;
    }
    return this.fallbackClienteId;
  }

  // ===== Bot submit =====
  canSubmit(): boolean {
    const clienteId = this.getEffectiveClienteId();
    return !!(
      this.codKeyPass &&
      clienteId &&
      this.symbol && this.nomeAtivo && this.direcaoMercado &&
      this.profile && this.stopType &&
      this.volume !== null && this.volume! > 0 &&
      this.stopWin !== null &&
      this.stopLoss !== null &&
      this.saldo !== null && this.saldo! > 0 &&
      !this.loading
    );
  }

  submit() {
    this.successMsg = null;
    this.errorMsg = null;

    const clienteId = this.getEffectiveClienteId();
    if (!this.canSubmit() || !clienteId) {
      this.errorMsg = 'Preencha todos os campos obrigatórios e selecione um cliente.';
      return;
    }

    const payload: Partial<Bot> = {
      direcaoMercado: this.direcaoMercado,
      symbol: this.symbol,
      nomeAtivo: this.nomeAtivo,
      profile: this.profile,
      stopType: this.stopType,
      volume: this.volume!,
      stopWin: this.stopWin!,
      stopLoss: this.stopLoss!,
      saldo: this.saldo!,
      valorInicial: this.saldo!
    };

    this.loading = true;
    this.botService.createBot(this.codKeyPass, clienteId, payload)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (created) => {
          this.successMsg = `Bot #${created?.id ?? ''} criado com sucesso!`;

          // NOVO: Limpa todos os dados após sucesso
          this.resetFormKeepAsset();

          // NOVO: Faz a mensagem desaparecer após 5 segundos
          setTimeout(() => {
            this.successMsg = null;
          }, 5000);
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || err?.message || 'Falha ao criar o bot.';
        }
      });
  }

  private clearDisabledInputs() {
    this.selectedForBot = null;
    this.direction = null;
  }
}
