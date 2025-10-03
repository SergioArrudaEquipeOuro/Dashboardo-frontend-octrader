import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { User } from 'src/app/models/user';
import { ContratoService, ContratoFull } from 'src/app/services/contrato.service';
import { UserService } from 'src/app/services/user.service';
import { UploadService } from 'src/app/services/upload.service';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-admin-painel04',
  templateUrl: './admin-painel04.component.html',
  styleUrls: ['./admin-painel04.component.css']
})
export class AdminPainel04Component implements OnInit, OnChanges {

  /** Recebe o ID exclusivamente por @Input */
  @Input() role: any;
  @Input() contratoId?: number | string | null;

  activeEnterprise?: any;
  isLoading: any;
  directorSignUrl: any

  // estados
  loading = false;
  error: string | null = null;
  isSigning = false;

  // dados
  contrato: ContratoFull | null = null;
  clientUser: User | null = null;
  clientSignUrl: SafeUrl | null = null;
  DiretorSignUrl: SafeUrl | null = null;
  currentUser: User | null = null;

  private lastLoadedId: number | null = null;

  getProfileImageUrl(imgPerfil: string | undefined): string {
    if (!imgPerfil) {
      return 'https://i.imgur.com/ICbUrx3.png'; // URL de uma imagem padrão caso o usuário não tenha foto
    }
    return `${this.uploadService.url()}${imgPerfil}`;
  }

  constructor(
    private contratoService: ContratoService,
    private userService: UserService,
    private uploadService: UploadService,
    private sanitizer: DomSanitizer,
    private enterpriseService: EnterpriseService
  ) { }

  ngOnInit(): void {
    this.resolveCurrentUser();
    const id = this.toNumOrNull(this.contratoId);
    if (id != null) this.loadContratoIfNeeded(id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('contratoId' in changes) {
      const id = this.toNumOrNull(this.contratoId);
      if (id != null) this.loadContratoIfNeeded(id);
    }
  }

  private toNumOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private resolveCurrentUser() {
    const tk = localStorage.getItem('authToken');
    if (!tk) return;
    this.userService.getByTokenLogin(tk).subscribe({
      next: (u) => this.currentUser = u,
      error: () => { }
    });
  }

  private loadContratoIfNeeded(id: number) {
    if (this.lastLoadedId === id) return;
    this.lastLoadedId = id;
    this.loadContrato(id);
  }

  private loadContrato(id: number) {
    this.loading = true;
    this.error = null;
    this.contrato = null;
    this.clientUser = null;
    this.clientSignUrl = null;
    this.directorSignUrl = null;

    //console.log('[1] Iniciando carregamento do contrato ID:', id);

    this.contratoService.getContratoById(id).subscribe({
      next: (c: ContratoFull) => {
        //console.log('[2] Contrato carregado com sucesso:', c);
        this.contrato = c;
        this.loading = false;

        // Verificação do status de assinatura
        //console.log('[3] Status de assinatura do contrato:', c.signed);
        //console.log('[4] Email do cliente no contrato:', c.clientEmail);

        // Carrega a empresa ativa primeiro
        this.getActiveEnterprise();

        if (c?.clientEmail) {
          //console.log('[5] Carregando assinatura do cliente para email:', c.clientEmail);
          this.loadClientSignature(c.clientEmail);
        } else {
          //console.log('[5] Nenhum email de cliente encontrado no contrato');
        }
      },
      error: (err) => {
        console.error('[2] Erro ao carregar contrato:', err);
        this.loading = false;
        this.error = 'Não foi possível carregar o contrato.';
      }
    });
  }

  /** Assinar (opcional): apenas ROOT/ADMINISTRADOR */
  signContract() {
    if (!this.contrato?.id) return;
    if (!(this.currentUser?.role === 'ROOT' || this.currentUser?.role === 'ADMINISTRADOR')) return;

    this.isSigning = true;
    this.contratoService.markContratoAsSigned(this.contrato.id).subscribe({
      next: (updated: any) => {
        if (this.contrato) this.contrato.signed = !!updated?.signed;
        this.isSigning = false;
      },
      error: (e) => {
        console.error('Erro ao assinar contrato', e);
        this.isSigning = false;
      }
    });
  }


  getActiveEnterprise(): void {
    this.isLoading = true;
    this.enterpriseService.getActiveEnterprise()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (e) => {
          this.activeEnterprise = e;
          //console.log('Dados da empresa ativa:', e);

          if (e?.assinaturaDiretor) {
            const url = this.getFullImageUrl(e.assinaturaDiretor);
            //console.log('URL da assinatura do diretor:', url);
            this.directorSignUrl = this.sanitizer.bypassSecurityTrustUrl(url);
          }
        },
        error: (err) => {
          console.error('Erro ao buscar empresa ativa:', err);
        }
      });
  }

  private getFullImageUrl(fileName: string): string {
    // Remove qualquer barra adicional que possa existir
    const baseUrl = this.uploadService.url().replace(/\/$/, '');
    const cleanFileName = fileName.replace(/^\//, '');
    return `${baseUrl}/${encodeURIComponent(cleanFileName)}`;
  }

  private loadClientSignature(clientEmail: string) {
    //console.log('[6] Buscando usuário pelo email:', clientEmail);

    this.userService.getUsuarioByEmail(clientEmail).subscribe({
      next: (u: User) => {
        //console.log('[7] Usuário encontrado:', u);
        this.clientUser = u;

        if (u?.imgAssing) {
          //console.log('[8] Assinatura do usuário encontrada (imgAssing):', u.imgAssing);
          const url = this.getFullImageUrl(u.imgAssing);
          //console.log('[9] URL completa da assinatura:', url);

          // Testa se a imagem pode ser carregada antes de atribuir
          this.testImageLoad(url).then(loaded => {
            if (loaded) {
              this.clientSignUrl = this.sanitizer.bypassSecurityTrustUrl(url);
              //console.log('[10] Assinatura do cliente carregada com sucesso');
            } else {
              console.error('[10] Falha ao carregar assinatura do cliente - URL inválida');
              this.clientSignUrl = null;
            }
          });
        } else {
          //console.log('[8] Usuário não possui assinatura (imgAssing está vazio ou nulo)');
          this.clientSignUrl = null;
        }
      },
      error: (err) => {
        console.error('[7] Erro ao buscar usuário:', err);
        this.clientSignUrl = null;
      }
    });
  }

  private testImageLoad(url: string): Promise<boolean> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  get assinarContrato(): boolean {
    // fonte do role: usa currentUser se existir; senão, o @Input
    const role = (this.currentUser?.role ?? this.role) ?? '';

    // admin tem acesso sempre
    if (role === 'ROOT' || role === 'ADMINISTRADOR') return true;

    // checagem defensiva enquanto a empresa carrega
    const ent = this.activeEnterprise;

    // ajuste os nomes das flags de acordo com o seu backend
    const suporte = !!ent?.suporteAssinarContrato;
    const financeiro = !!ent?.financeiroAssinarContrato;
    const manager = !!ent?.managerAssinarContrato;
    const gerente = !!ent?.gerenteAssinarContrato;
    const broker = !!ent?.gerenteAssinarContrato;

    if (role === 'SUPORTE') return suporte;
    if (role === 'FINANCEIRO') return financeiro;
    if (role === 'MANAGER') return manager;
    if (role === 'GERENTE') return gerente;
    if (role === 'BROKER') return broker;

    return false;
  }

}
