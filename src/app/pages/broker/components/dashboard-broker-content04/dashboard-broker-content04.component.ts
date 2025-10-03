import { Component, Input, OnInit } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { ContratoService, ContratoDTO } from 'src/app/services/contrato.service';
import { PdfGeneratorService } from 'src/app/services/pdf-generator.service';
import { UploadService } from 'src/app/services/upload.service';
import { UserService } from 'src/app/services/user.service';
import { catchError, finalize, map, of, switchMap, tap, throwError } from 'rxjs';
import { EnterpriseService } from 'src/app/services/enterprise.service';

@Component({
  selector: 'app-dashboard-broker-content04',
  templateUrl: './dashboard-broker-content04.component.html',
  styleUrls: ['./dashboard-broker-content04.component.css']
})
export class DashboardBrokerContent04Component implements OnInit {

  contratos: ContratoDTO[] = [];
  isLoading = false;
  selectedContract: ContratoDTO | null = null;
  @Input() activeEnterprise: any | null = null;
  @Input() user!: any;

  // spinner por linha (id -> true/false)
  pdfLoading: Record<number, boolean> = {};

  imageUrl: SafeUrl | null = null;
  alertMessage: string | null = null;
  alertType: string | null = null;

  // ATENÇÃO: defina esse user em algum lugar do app (login, resolver, etc.)
  /*   user: any | null = null; */

  // ------------------ NOVO: seleção e deleção ------------------
  selectedIds = new Set<number>();
  allSelected = false;
  bulkDeleting = false;
  rowDeleting: Record<number, boolean> = {};

  // ------------------ FILTROS ------------------
  filters = {
    id: '' as string | number,
    contractName: '',
    clientQuery: '',     // nome ou email
    currency: '',
    signed: '' as '' | 'true' | 'false',
    automatic: '' as '' | 'true' | 'false',
    dateFrom: '' as string,  // yyyy-MM-dd
    dateTo: '' as string,    // yyyy-MM-dd
    valueMin: '' as string | number,
    valueMax: '' as string | number,
  };

  constructor(
    private contratoService: ContratoService,
    private userService: UserService,
    private uploadService: UploadService,
    private pdfGenerator: PdfGeneratorService,
    private enterpriseService: EnterpriseService
  ) { }

  ngOnInit(): void { }

  // ---------------------------------------------
  // BUSCAR
  // ---------------------------------------------
  buscar(): void {
    this.isLoading = true;
    this.contratos = [];

    this.userService.getContratosByBrokerId(this.user.id)
      .pipe(
        map(list => (list ?? []).sort((a, b) => (b.id ?? 0) - (a.id ?? 0))), // ordena ID desc
        map(list => this.applyFilters(list)),
        finalize(() => this.isLoading = false),
        catchError(err => {
          console.error('[Contratos] ERRO ao buscar:', err);
          this.showAlert('Erro ao buscar contratos.', 'danger');
          return of<ContratoDTO[]>([]);
        })
      )
      .subscribe(list => {
        this.contratos = list;
        // ao buscar/filtrar, atualiza seleção "selecionar todos"
        this.syncAllSelected();
      });
  }

  limpar(): void {
    this.filters = {
      id: '',
      contractName: '',
      clientQuery: '',
      currency: '',
      signed: '',
      automatic: '',
      dateFrom: '',
      dateTo: '',
      valueMin: '',
      valueMax: '',
    };
    this.contratos = [];
    this.selectedContract = null;
    this.alertMessage = null;
    this.alertType = null;

    // limpa seleção
    this.selectedIds.clear();
    this.allSelected = false;
  }

  private applyFilters(list: ContratoDTO[]): ContratoDTO[] {
    const f = this.filters;

    const idNum = this.toNumOrNull(f.id);
    const minVal = this.toNumOrNull(f.valueMin);
    const maxVal = this.toNumOrNull(f.valueMax);

    const from = f.dateFrom ? new Date(f.dateFrom + 'T00:00:00') : null;
    const to = f.dateTo ? new Date(f.dateTo + 'T23:59:59') : null;

    const clientQuery = (f.clientQuery || '').trim().toLowerCase();
    const contractName = (f.contractName || '').trim().toLowerCase();
    const currency = (f.currency || '').trim().toUpperCase();

    return list.filter(c => {
      if (idNum != null && c.id !== idNum) return false;
      if (contractName && !(c.contractName || '').toLowerCase().includes(contractName)) return false;

      const n = (c.clientName || '').toLowerCase();
      const e = (c.clientEmail || '').toLowerCase();
      if (clientQuery && !(n.includes(clientQuery) || e.includes(clientQuery))) return false;

      if (currency && (c.activeSymbol || '').toUpperCase() !== currency) return false;

      if (f.signed === 'true' && !c.signed) return false;
      if (f.signed === 'false' && c.signed) return false;

      if (f.automatic === 'true' && !c.automatic) return false;
      if (f.automatic === 'false' && c.automatic) return false;

      if (minVal != null && c.saldo < minVal) return false;
      if (maxVal != null && c.saldo > maxVal) return false;

      if ((from || to) && c.date) {
        const d = new Date(c.date);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }

      return true;
    });
  }

  private toNumOrNull(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // ---------------------------------------------
  // UI Auxiliares
  // ---------------------------------------------
  trackById(_i: number, item: ContratoDTO): number {
    return item.id;
  }

  openContract(c: ContratoDTO) {
    this.selectedContract = c;
  }

  showAlert(message: string, type: string): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = null;
      this.alertType = null;
    }, 7000);
  }

  // ---------------------------------------------
  // PDF
  // ---------------------------------------------
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

  private getFullImageUrl(fileName: string): string {
    const baseUrl = this.uploadService.url().replace(/\/$/, '');
    const cleanFileName = fileName.replace(/^\//, '');
    return `${baseUrl}/${encodeURIComponent(cleanFileName)}`;
  }

  // ---------------------------------------------
  // NOVO: Seleção e exclusão
  // ---------------------------------------------
  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleOne(id: number, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
    this.syncAllSelected();
  }

  toggleAll(checked: boolean): void {
    this.allSelected = checked;
    // Seleciona apenas os visíveis/filtrados atualmente
    if (checked) {
      this.contratos.forEach(c => this.selectedIds.add(c.id));
    } else {
      // remove apenas ids presentes na lista visível
      this.contratos.forEach(c => this.selectedIds.delete(c.id));
    }
  }

  private syncAllSelected(): void {
    if (!this.contratos.length) {
      this.allSelected = false;
      return;
    }
    this.allSelected = this.contratos.every(c => this.selectedIds.has(c.id));
  }

  deleteOne(c: ContratoDTO): void {
    if (this.rowDeleting[c.id] || this.bulkDeleting) return;
    const ok = confirm(`Excluir o contrato #${c.id}? Esta ação não pode ser desfeita.`);
    if (!ok) return;

    this.rowDeleting[c.id] = true;
    this.contratoService.deleteContrato(c.id)
      .pipe(
        finalize(() => { this.rowDeleting[c.id] = false; }),
        catchError(err => {
          console.error('Erro ao excluir contrato:', err);
          this.showAlert(`Erro ao excluir o contrato #${c.id}.`, 'danger');
          return of(null);
        })
      )
      .subscribe(res => {
        // Remove da lista e da seleção
        this.contratos = this.contratos.filter(x => x.id !== c.id);
        this.selectedIds.delete(c.id);
        this.syncAllSelected();
        this.showAlert(`Contrato #${c.id} excluído com sucesso.`, 'success');
      });
  }

  deleteSelected(): void {
    if (this.bulkDeleting) return;
    const ids = [...this.selectedIds].filter(id => this.contratos.some(c => c.id === id));
    if (ids.length === 0) return;

    const ok = confirm(`Excluir ${ids.length} contrato(s) selecionado(s)? Esta ação não pode ser desfeita.`);
    if (!ok) return;

    this.bulkDeleting = true;
    this.contratoService.deleteContratos(ids)
      .pipe(
        finalize(() => { this.bulkDeleting = false; }),
        catchError(err => {
          console.error('Erro ao excluir em lote:', err);
          this.showAlert('Erro ao excluir contratos selecionados.', 'danger');
          return of(null);
        })
      )
      .subscribe(res => {
        // Remove os excluídos da lista e limpa seleção correspondente
        const removed = new Set(ids);
        this.contratos = this.contratos.filter(c => !removed.has(c.id));
        ids.forEach(id => this.selectedIds.delete(id));
        this.syncAllSelected();
        this.showAlert(`${ids.length} contrato(s) excluído(s) com sucesso.`, 'success');
      });
  }

  get canDeleteContratoFor(): (u: any) => boolean {
    return (_u: any) => {
      // segurança
      const rawRole = String(this.user?.role ?? '').trim();
      const U = rawRole.toUpperCase();

      // normaliza: aceita variantes como "GM - SUPORTE"
      const role = this.user.role;

      // logs de diagnóstico
      const ae = this.activeEnterprise;

      // se não houver enterprise carregada, por segurança nega
      if (!ae) {
        console.warn('[canDeleteContratoFor] activeEnterprise ausente — negando delete.');
        return false;
      }

      // >>>>>>> CORRIGIDO: usar as FLAGS **DELET** <<<<<<<
      if (role === 'BROKER') {
        return !!ae.brokerDeletearContrato;
      }
      // demais roles não podem
      return false;
    };
  }

}
