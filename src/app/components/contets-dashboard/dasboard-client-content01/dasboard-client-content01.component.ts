import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Release } from 'src/app/models/release';
import { User } from 'src/app/models/user';
import { ReleaseService } from 'src/app/services/release.service';
import { UserService } from 'src/app/services/user.service';
import * as bootstrap from 'bootstrap';
import { PainelClient01Component } from '../../painel-client/painel-client01/painel-client01.component';
import { UploadService } from 'src/app/services/upload.service';
import { WalletDetail } from 'src/app/models/enterprise';

type PayMode = 'client' | 'enterprise';


@Component({
  selector: 'app-dashboard-client-content01',
  templateUrl: './dasboard-client-content01.component.html',
  styleUrls: ['./dasboard-client-content01.component.css']
})
export class DasboardClientContent01Component implements OnInit, OnChanges {
  @Input() user?: User;
  @Input() activeEnterprise: any;

  @ViewChild(PainelClient01Component) createReleaseCmp?: PainelClient01Component;

  releases: Release[] = [];
  loading = false;
  errorMsg: string | null = null;

  selectedRelease: Release | null = null;
  payMode: PayMode = 'client';

  // === paginação ===
  page = 1;
  pageSize = 10;          // altere se quiser outro tamanho
  totalPages = 1;
  maxPageLinks = 5;       // quantas páginas mostrar no paginador

  // enterprise view models
  enterpriseBankFields: Array<{ k: string; v: string }> = [];
  enterprisePixFields: Array<{ k: string; v: string }> = [];
  visibleWallets: WalletDetail[] = [];
  showPixQr = false;
  private walletQrOpen = new Set<string>();

  constructor(
    private releaseService: ReleaseService,
    private userService: UserService,
    private uploadService: UploadService
  ) { }

  ngOnInit(): void { this.tryLoad(true); }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) this.tryLoad(true);
  }

  /** Atualiza o usuário via token e persiste X-Author-Email */
  getUsuarioByToken(): void {
    const tk = localStorage.getItem('authToken');
    if (!tk) return;

    this.userService.getByTokenLogin(tk).subscribe(data => {
      this.user = data;
      if (this.user?.email) {
        localStorage.setItem('authorEmail', this.user.email);
      }
    });
  }

  reload() { this.tryLoad(false); }

  private tryLoad(_clearOnFirst: boolean) {
    if (!this.user?.id) return;
    this.loading = true;
    this.errorMsg = null;

    this.releaseService.getReleasesByUser(this.user.id).subscribe({
      next: (list) => {
        const ordered = (list || []).slice().sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });
        this.releases = ordered;

        // >>> Recalcula paginação SEMPRE que atualizar a lista
        this.recalcPages();
        // opcional: garantir que começa na primeira página
        if (this.page > this.totalPages) this.page = this.totalPages;
        if (this.page < 1) this.page = 1;

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'Não foi possível carregar seus releases.';
      }
    });
  }

  trackById(_i: number, r: Release) { return r.id ?? _i; }

  statusClass(r: Release): string {
    const s = (r.status ?? '').toString().trim().toUpperCase();
    if (s === 'APPROVED' || r.approved) return 'approved';
    if (s === 'REFUSED' || s === 'REJECTED' || /reprov|recus|negad/i.test(r.status || '')) return 'refused';
    return 'pending';
  }

  formatMoney(value?: number, coin?: string): string {
    if (value == null) return '—';
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: (coin && coin.length === 3) ? coin.toUpperCase() : 'BRL',
      maximumFractionDigits: 2
    }).format(value);
    if (coin && coin.length !== 3) return `${formatted} ${coin}`;
    return formatted;
  }

  openProof(url?: string) {
    if (!url) return;
    window.open(url, '_blank');
  }

  /* ===== Modal: criar novo release ===== */
  openCreateModal() {
    // 1) Atualiza o usuário antes de abrir (para refletir bloqueios/liberações)
    this.getUsuarioByToken();

    // 2) Abre e, ao exibir, também manda o filho atualizar (para persistir authorEmail)
    const el = document.getElementById('createReleaseModal');
    if (!el) return;

    el.addEventListener('shown.bs.modal', () => {
      this.createReleaseCmp?.getUsuarioByToken();
    }, { once: true });

    (bootstrap as any)?.Modal?.getOrCreateInstance(el)?.show();
  }

  onReleaseCreated(newRelease: Release) {
    this.getUsuarioByToken();
    this.releases = [newRelease, ...this.releases];
    this.recalcPages();        // <<< aqui também
    this.page = 1;             // opcional: volta para a primeira página
    this.reload();
    const el = document.getElementById('createReleaseModal');
    (bootstrap as any)?.Modal?.getInstance(el)?.hide();
  }

  openPayments(r: Release) {
    this.selectedRelease = r;

    const type = (r.entryType || '').toUpperCase();
    this.payMode = (type === 'WITHDRAWAL') ? 'client' : 'enterprise';

    // monta dados
    this.buildEnterpriseBlocks();

    // reseta toggles
    this.showPixQr = false;
    this.walletQrOpen.clear();

    const el = document.getElementById('paymentsModal');
    (bootstrap as any)?.Modal?.getOrCreateInstance(el!)?.show();
  }

  // CLIENTE: valor com fallback
  safe(v: any): string {
    if (v === null || v === undefined) return 'Não preenchido';
    const s = String(v).trim();
    return s ? s : 'Não preenchido';
  }

  // ENTERPRISE: monta listas ocultando vazios
  // Getter para validar se deve exibir blocos da empresa
  get hasEnterpriseTransfer(): boolean {
    const n = this.activeEnterprise?.transferBanckName;
    return !!(n && String(n).trim());
  }

  private buildEnterpriseBlocks() {
    // Se não houver transferBanckName, não exibe nada da empresa
    if (!this.hasEnterpriseTransfer) {
      this.enterpriseBankFields = [];
      this.enterprisePixFields = [];
      this.visibleWallets = Array.isArray(this.activeEnterprise?.walletDetails)
        ? this.activeEnterprise.walletDetails.filter((w: any) => w && w.visibuly !== false)
        : [];
      return;
    }

    const e = this.activeEnterprise || {};

    const bank: Array<{ k: string; v: string }> = [
      { k: 'Banco', v: e.transferBanckBanck },
      { k: 'Agência', v: e.transferBanckAgency },
      { k: 'Conta', v: e.transferBanckAccount },
      { k: 'Tipo de conta', v: e.transferBanckAccountType },
      { k: 'Código/Nome', v: e.transferBanckCodeName }
    ].filter(i => !!(i.v && String(i.v).trim()));

    const pix: Array<{ k: string; v: string }> = [
      { k: 'Tipo chave Pix', v: e.transferBanckKeyTypePix },
      { k: 'Chave Pix', v: e.transferBanckKeyPix },
      { k: 'Copiar/Colar', v: e.transferBanckCopyKey }
    ].filter(i => !!(i.v && String(i.v).trim()));

    const wallets = Array.isArray(e.walletDetails) ? e.walletDetails : [];
    const visible = wallets.filter((w: any) => w && w.visibuly !== false);

    this.enterpriseBankFields = bank;
    this.enterprisePixFields = pix;
    this.visibleWallets = visible;
  }


  // QR helpers
  togglePixQr() { this.showPixQr = !this.showPixQr; }
  trackByWallet(_i: number, w: WalletDetail) { return w.id || w.qrCode || w.ativo || _i; }
  toggleWalletQr(w: WalletDetail) {
    const key = (w.id || w.qrCode || w.ativo || '').toString();
    if (!key) return;
    this.walletQrOpen.has(key) ? this.walletQrOpen.delete(key) : this.walletQrOpen.add(key);
  }
  isWalletQrOpen(w: WalletDetail) {
    const key = (w.id || w.qrCode || w.ativo || '').toString();
    return this.walletQrOpen.has(key);
  }

  // Monta URL do asset no S3 (mesma lógica do getProfileImageUrl)
  getAssetUrl(name?: string | null): string {
    if (!name) return 'https://i.imgur.com/ICbUrx3.png';
    return `${this.uploadService.url()}${name}`;
  }

  get pageReleases(): Release[] {
    const start = (this.page - 1) * this.pageSize;
    return this.releases.slice(start, start + this.pageSize);
  }

  private recalcPages() {
    this.totalPages = Math.max(1, Math.ceil(this.releases.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;
    if (this.page < 1) this.page = 1;
  }

  setPage(p: number) {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
  }

  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  /** janela de páginas visíveis (ex.: 1 2 [3] 4 5) */
  visiblePages(): number[] {
    const half = Math.floor(this.maxPageLinks / 2);
    let start = Math.max(1, this.page - half);
    let end = Math.min(this.totalPages, start + this.maxPageLinks - 1);
    start = Math.max(1, end - this.maxPageLinks + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}
