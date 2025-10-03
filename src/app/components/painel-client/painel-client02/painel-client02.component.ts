import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ContratoService, ContratoFull } from 'src/app/services/contrato.service';
import { UploadService } from 'src/app/services/upload.service';
import { UserService } from 'src/app/services/user.service';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { PdfGeneratorService } from 'src/app/services/pdf-generator.service';
import { catchError, finalize, map, of, switchMap, tap, throwError } from 'rxjs';

@Component({
  selector: 'app-painel-client02',
  templateUrl: './painel-client02.component.html',
  styleUrls: ['./painel-client02.component.css']
})
export class PainelClient02Component implements OnInit, OnChanges {
  @Input() contratoId?: number | string | null;
  @Input() user: any;

  signStatus: string = 'Ainda não assinado.';

  loading = false;
  error: string | null = null;

  contrato: ContratoFull | null = null;
  activeEnterprise: any;
  clientUser: any;

  directorSignUrl: SafeUrl | null = null;
  clientSignUrl: SafeUrl | null = null;
  isSigning = false;

  // spinner por linha (id -> true/false)
  pdfLoading: Record<number, boolean> = {};

  alertMessage: string | null = null;
  alertType: string | null = null;

  constructor(
    private contratoService: ContratoService,
    private uploadService: UploadService,
    private userService: UserService,
    private enterpriseService: EnterpriseService,
    private sanitizer: DomSanitizer,
    private pdfGenerator: PdfGeneratorService,
  ) { }

  ngOnInit(): void {
    const id = this.toNum(this.contratoId);
    if (id) this.load(id);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('contratoId' in changes) {
      const id = this.toNum(this.contratoId);
      if (id) this.load(id);
    }
  }

  private toNum(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private load(id: number) {
    this.loading = true;
    this.error = null;
    this.contrato = null;
    this.clientSignUrl = null;
    this.directorSignUrl = null;

    this.contratoService.getContratoById(id).subscribe({
      next: (c) => {
        this.contrato = c;
        this.loading = false;

        // status inicial
        this.signStatus = c?.signed ? 'Contrato assinado.' : 'Ainda não assinado.';

        this.loadEnterprise();
        if (c.clientEmail) this.loadClientSignature(c.clientEmail);
      },
      error: () => {
        this.loading = false;
        this.error = 'Não foi possível carregar o contrato.';
      }
    });
  }


  private loadEnterprise() {
    this.enterpriseService.getActiveEnterprise().subscribe({
      next: (e) => {
        this.activeEnterprise = e;
        if (e?.assinaturaDiretor) {
          const url = this.assetUrl(e.assinaturaDiretor);
          this.directorSignUrl = this.sanitizer.bypassSecurityTrustUrl(url);
        }
      },
      error: () => { }
    });
  }

  private loadClientSignature(email: string) {
    this.userService.getUsuarioByEmail(email).subscribe({
      next: (u) => {
        this.clientUser = u;
        if (u?.imgAssing) {
          const url = this.assetUrl(u.imgAssing);
          this.clientSignUrl = this.sanitizer.bypassSecurityTrustUrl(url);
        }
      },
      error: () => { }
    });
  }

  assetUrl(name?: string): string {
    if (!name) return 'https://i.imgur.com/ICbUrx3.png';
    const base = this.uploadService.url().replace(/\/$/, '');
    const file = String(name).replace(/^\//, '');
    return `${base}/${encodeURIComponent(file)}`;
  }

  formatMoney(v?: number, currency = 'USD'): string {
    if (v == null) return '—';
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(v);
  }


  signContract(prazoDate?: string) {
    if (!this.contrato?.id || this.contrato?.signed) return;

    const prazoIso = prazoDate ? new Date(prazoDate + 'T00:00:00Z').toISOString() : undefined;

    this.isSigning = true;
    this.signStatus = 'Assinando...';

    this.contratoService.markContratoAsSigned(this.contrato.id, prazoIso).subscribe({
      next: (res) => {
        if (this.contrato) {
          this.contrato.signed = !!res?.signed;
          (this.contrato as any).prazo = res?.prazo ?? prazoIso;
        }
        this.isSigning = false;
        this.signStatus = 'Contrato assinado.';
      },
      error: () => {
        this.isSigning = false;
        this.signStatus = 'Ainda não assinado.';
        this.error = 'Falha ao assinar. Tente novamente.';
      }
    });
  }





  public downloadContractPDF(idContrato: number, idCliente: number): void {
    const t0 = performance.now();
    let enterpriseactive;
    if (this.pdfLoading[idContrato]) return;

    this.pdfLoading[idContrato] = true;

    this.enterpriseService.getActiveEnterprise().pipe(
      switchMap(empresa => {
        let directorSignatureUrl = '';
        enterpriseactive = empresa;
        if (empresa?.assinaturaDiretor) {
          directorSignatureUrl = this.getFullImageUrl(empresa.assinaturaDiretor);
        }

        return this.userService.getUsuarioById(idCliente).pipe(
          switchMap(user => {
            if (!user) {
              this.showAlert('Usuário não identificado para gerar o PDF.', 'warning');
              throw new Error('USER_NOT_FOUND');
            }

            let clientSignatureUrl = '';
            if (user.imgAssing) {
              clientSignatureUrl = this.getFullImageUrl(user.imgAssing);
            }

            return this.contratoService.getContratoById(idContrato).pipe(
              tap(c => {
                const contratoPdf = {
                  id: c.id,
                  clientName: c.clientName,
                  clientEmail: c.clientEmail,
                  saldo: c.saldo,
                  contractName: c.contractName,
                  date: c.date ? new Date(c.date) : new Date(),
                  signed: c.signed,
                  activeSymbol: c.activeSymbol,
                  automatic: c.automatic,
                  paragrafos: (c as any).paragrafos ?? [],
                  directorName: empresa?.nomeDiretor || 'Diretor'
                };

                this.pdfGenerator.generateContractPDF(
                  contratoPdf as any,
                  user,
                  directorSignatureUrl,
                  clientSignatureUrl,
                  empresa?.nomeDiretor || "",
                  this.activeEnterprise,
                  this.activeEnterprise.logoEmpresa
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Erro ao gerar PDF:', err);
        return throwError(() => err);
      }),
      finalize(() => {
        this.pdfLoading[idContrato] = false;
        const t1 = performance.now();
        console.log(`[PDF:${idContrato}] Finalizado em ${(t1 - t0).toFixed(0)}ms`);
      })
    ).subscribe({
      next: () => { },
      error: () => { }
    });
  }

  showAlert(message: string, type: string): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = null;
      this.alertType = null;
    }, 7000);
  }

  private getFullImageUrl(fileName: string): string {
    const baseUrl = this.uploadService.url().replace(/\/$/, '');
    const cleanFileName = fileName.replace(/^\//, '');
    return `${baseUrl}/${encodeURIComponent(cleanFileName)}`;
  }
}
