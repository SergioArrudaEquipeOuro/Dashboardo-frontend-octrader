import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ReleaseService } from 'src/app/services/release.service';

type EntryType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'CREDIT'
  | 'LOAN'
  | 'CREDITWITHDRAWA'
  | 'LOANWITHDRAWA'
  | 'TRANSFER'
  | 'TRANSFER_UP'
  | 'TRANSFER_DOWN';


type StatusType = 'PENDING' | 'APPROVED' | 'REFUSED';

@Component({
  selector: 'app-admin-painel02',
  templateUrl: './admin-painel02.component.html',
  styleUrls: ['./admin-painel02.component.css']
})
export class AdminPainel02Component implements OnInit, OnDestroy {
  @Input() userId!: number;
  @Input() user: any;
  @Output() created = new EventEmitter<any>();

  form!: FormGroup;
  saving = false;
  successMsg = '';
  errorMsg = '';

  // modal de confirmação
  showConfirmModal = false;
  private pendingPayload: any | null = null;

  statusOptions: StatusType[] = ['PENDING', 'APPROVED', 'REFUSED'];
  coins: string[] = ['USD', 'BRL', 'BTC', 'ETH', 'USDT'];
  transferTypes: string[] = ['PIX', 'BANK_TRANSFER', 'CRYPTO', 'CASH'];


  // Mapas de ícones (Bootstrap Icons)
  entryTypeIcon(t: any): string {
    switch (t) {
      case 'DEPOSIT': return 'bi-arrow-down-circle';
      case 'WITHDRAWAL': return 'bi-arrow-up-circle';
      case 'CREDIT': return 'bi-plus-circle';
      case 'LOAN': return 'bi-journal-richtext';
      case 'CREDITWITHDRAWA': return 'bi-credit-card-2-front';
      case 'LOANWITHDRAWA': return 'bi-journal-minus';
      case 'TRANSFER': return 'bi-arrow-left-right';
      case 'TRANSFER_UP': return 'bi-arrow-up-right-circle';
      case 'TRANSFER_DOWN': return 'bi-arrow-down-left-circle';
      default: return 'bi-diagram-3';
    }
  }


  statusIcon(s: any): string {
    switch (s) {
      case 'APPROVED': return 'bi-check-circle';
      case 'REFUSED': return 'bi-x-circle';
      default: return 'bi-hourglass-split'; // PENDING / undefined
    }
  }

  // Classes de cor por tipo + status para as pills
  entryTypePillClass(type: any, status: any): string[] {
    const base =
      type === 'DEPOSIT' ? 'et-deposit' :
        type === 'WITHDRAWAL' ? 'et-withdrawal' :
          type === 'CREDIT' ? 'et-credit' :
            type === 'LOAN' ? 'et-loan' :
              type === 'CREDITWITHDRAWA' ? 'et-creditwithd' :
                type === 'LOANWITHDRAWA' ? 'et-loanwithd' :
                  type === 'TRANSFER' ? 'et-transfer' :
                    type === 'TRANSFER_UP' ? 'et-transfer-up' :
                      type === 'TRANSFER_DOWN' ? 'et-transfer-down' :
                        '';

    const st =
      status === 'APPROVED' ? 'approved' :
        status === 'REFUSED' ? 'refused' : 'await';

    return ['pill', base, st];
  }


  statusPillClass(status: any): string[] {
    const st =
      status === 'APPROVED' ? 'approved' :
        status === 'REFUSED' ? 'refused' : 'await';
    return ['pill', st];
  }


  constructor(
    private fb: FormBuilder,
    private releaseService: ReleaseService
  ) { }

  ngOnInit(): void {
    const todayStr = this.todayAsInputDate();
    this.form = this.fb.group({
      entryType: [null, Validators.required],
      value: [null, [Validators.required, Validators.min(0.01)]],
      coin: ['USD', Validators.required],
      typeTransfer: [''],
      status: ['PENDING'],
      proof: [''],
      observacoes: [''],
      visibily: [null],
      fk: [null],
      date: [todayStr, Validators.required]
    });
  }

  ngOnDestroy(): void {
    this.toggleBodyModalState(false);
  }

  // ---------- helpers ----------
  get f() { return this.form.controls; }

  get transferTypeRequired(): boolean {
    return this.form.value.entryType === 'TRANSFER';
  }


  onEntryTypeChange(): void {
    if (this.transferTypeRequired) {
      this.f['typeTransfer'].setValidators([Validators.required]);
    } else {
      this.f['typeTransfer'].clearValidators();
      this.form.patchValue({ typeTransfer: '' }, { emitEvent: false });
    }
    this.f['typeTransfer'].updateValueAndValidity();
  }

  prettyTri(v: boolean | null): string {
    return v === true ? 'Sim' : v === false ? 'Não' : '—';
  }

  parseNumber(n: any): number | null {
    if (n === null || n === undefined || n === '') return null;
    const normalized = String(n).replace(/\./g, '').replace(',', '.');
    const val = Number(normalized);
    return isNaN(val) ? null : val;
  }

  private toInstantFromDateInput(dateInput?: string): string | null {
    if (!dateInput) return null;
    // Envia como meia-noite UTC, conforme esperado pelo backend (Instant)
    return `${dateInput}T00:00:00Z`;
  }

  private buildPayload() {
    const valueNum = this.parseNumber(this.form.value.value);
    const payload: any = {
      entryType: this.form.value.entryType as EntryType,
      value: valueNum,
      coin: this.form.value.coin ?? null,
      typeTransfer: this.form.value.typeTransfer ?? null,
      proof: this.form.value.proof ?? null,
      observacoes: this.form.value.observacoes ?? null,
      visibily: this.form.value.visibily,
      fk: this.form.value.fk
    };
    if (this.form.value.status) {
      payload.status = this.form.value.status as StatusType;
    }
    const dateIso = this.toInstantFromDateInput(this.form.value.date);
    if (dateIso) payload.date = dateIso;
    return payload;
  }

  private todayAsInputDate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toggleBodyModalState(open: boolean) {
    if (open) {
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }

  // ---------- fluxo ----------
  submit(): void {
    this.successMsg = '';
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.userId) {
      this.errorMsg = 'Usuário alvo inválido.';
      return;
    }

    this.pendingPayload = this.buildPayload();
    this.showConfirmModal = true;
    this.toggleBodyModalState(true);
  }

  closeConfirm(): void {
    if (!this.saving) {
      this.showConfirmModal = false;
      this.pendingPayload = null;
      this.toggleBodyModalState(false);
    }
  }

  confirmCreate(): void {
    if (!this.pendingPayload || !this.userId) return;

    this.saving = true;
    this.releaseService.createRelease(this.userId, this.pendingPayload).subscribe({
      next: (res) => {
        this.successMsg = 'Release criado com sucesso.';
        this.created.emit(res);

        // fecha modal + limpa estado
        this.showConfirmModal = false;
        this.pendingPayload = null;
        this.toggleBodyModalState(false);

        // reseta o form (mantendo a data de hoje)
        this.form.reset({
          entryType: null,
          value: null,
          coin: 'USD',
          typeTransfer: '',
          status: 'PENDING',
          proof: '',
          observacoes: '',
          visibily: null,
          fk: null,
          date: this.todayAsInputDate()
        });
      },
      error: (err: HttpErrorResponse) => {
        const serverMsg = (err.error && (err.error.error || err.error.message)) || err.message;
        this.errorMsg = serverMsg || 'Falha ao criar release. Verifique os dados e tente novamente.';
      }
    }).add(() => (this.saving = false));
  }

  clear(): void {
    this.form.reset({
      entryType: null,
      value: null,
      coin: 'USD',
      typeTransfer: '',
      status: 'PENDING',
      proof: '',
      observacoes: '',
      visibily: null,
      fk: null,
      date: this.todayAsInputDate()
    });
    this.successMsg = '';
    this.errorMsg = '';
  }
}
