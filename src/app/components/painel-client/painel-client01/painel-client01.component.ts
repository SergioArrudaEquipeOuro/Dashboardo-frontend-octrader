import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ReleaseService } from 'src/app/services/release.service';
import { User } from 'src/app/models/user';
import { Release } from 'src/app/models/release';
import { UserService } from 'src/app/services/user.service';

type EntryType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'LOANWITHDRAWA'
  | 'TRANSFER_UP'
  | 'TRANSFER_DOWN';

@Component({
  selector: 'app-painel-client01',
  templateUrl: './painel-client01.component.html',
  styleUrls: ['./painel-client01.component.css']
})
export class PainelClient01Component implements OnInit {

  @Input() userId?: number;
  @Input() user?: User;
  @Output() created = new EventEmitter<Release>();

  form!: FormGroup;
  saving = false;
  successMsg = '';
  errorMsg = '';
  private successTimer?: any;
  private errorTimer?: any;

  coins: string[] = ['BRL', 'USD', 'BTC', 'ETH', 'USDT'];
  transferTypes: string[] = [ 'BANK_TRANSFER', 'CRYPTO', 'CASH'];



  constructor(
    private fb: FormBuilder,
    private releaseService: ReleaseService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      entryType: [null, Validators.required],
      value: [null, [Validators.required, Validators.min(0.01)]],
      coin: ['BRL', Validators.required],
      typeTransfer: [''],
      observacoes: ['']
    });
  }

  get f() { return this.form.controls; }

  /** Opções permitidas para CLIENTE, conforme regras */
  get entryTypeOptions(): Array<{ value: EntryType, label: string }> {
    const opts: Array<{ value: EntryType, label: string }> = [
      { value: 'DEPOSIT', label: 'Depósito' }
    ];

    if (this.user?.sac === true) {
      opts.push({ value: 'WITHDRAWAL', label: 'Saque' });
    }
    if ((this.user?.emprestimo ?? 0) > 0) {
      opts.push({ value: 'LOANWITHDRAWA', label: 'Saída de empréstimo' });
    }

    // NOVAS OPÇÕES
    opts.push({ value: 'TRANSFER_UP', label: 'Adicionar saldo Homebroker' });
    opts.push({ value: 'TRANSFER_DOWN', label: 'Remover saldo Homebroker' });

    return opts;
  }

  onEntryTypeChange(): void {
    // Se quisesse tornar obrigatório para algum tipo futuro, faria aqui.
  }

  entryTypeIcon(t: any): string {
    switch (t) {
      case 'DEPOSIT': return 'fa-arrow-down';
      case 'WITHDRAWAL': return 'fa-arrow-up';
      case 'LOANWITHDRAWA': return 'fa-hand-holding-usd';
      case 'TRANSFER_UP': return 'fa-circle-up';
      case 'TRANSFER_DOWN': return 'fa-circle-down';
      default: return 'fa-diagram-project';
    }
  }


  entryTypePill(t: any): string {
    if (t === 'WITHDRAWAL') return 'et-withdrawal';
    if (t === 'LOANWITHDRAWA') return 'et-loanwithd';
    if (t === 'TRANSFER_UP') return 'et-transferup';
    if (t === 'TRANSFER_DOWN') return 'et-transferdown';
    return 'et-deposit';
  }

  /** número aceitando "1.234,56" */
  private parseNumber(n: any): number | null {
    if (n === null || n === undefined || n === '') return null;
    const normalized = String(n).replace(/\./g, '').replace(',', '.');
    const val = Number(normalized);
    return isNaN(val) ? null : val;
  }

  private buildPayload() {
    const valueNum = this.parseNumber(this.form.value.value);
    return {
      entryType: this.form.value.entryType as EntryType,
      value: valueNum,
      coin: this.form.value.coin,
      typeTransfer: this.form.value.typeTransfer || null,  // ← envia typeTransfer
      observacoes: this.form.value.observacoes || null
      // status/visibily/fk/date: backend define defaults para cliente
    };
  }

  submit(): void {
    this.successMsg = '';
    this.errorMsg = '';
    this.getUsuarioByToken();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showError('Preencha os campos obrigatórios.');
      return;
    }
    if (!this.userId) {
      this.showError('Usuário inválido.');
      return;
    }

    const payload = this.buildPayload();
    this.saving = true;

    this.releaseService.createRelease(this.userId, payload as any).subscribe({
      next: (res) => {
        this.showSuccess('Release criado com sucesso.');   // << aqui
        this.created.emit(res);
        this.form.reset({
          entryType: null,
          value: null,
          coin: 'BRL',
          typeTransfer: '',
          observacoes: ''
        });
      },
      error: (err: HttpErrorResponse) => {
        const serverMsg = (err.error && (err.error.error || err.error.message)) || err.message;
        this.showError(serverMsg || 'Falha ao criar release. Verifique os dados e tente novamente.'); // << aqui
      }
    }).add(() => this.saving = false);
  }

  ngOnDestroy(): void {
    clearTimeout(this.successTimer);
    clearTimeout(this.errorTimer);
  }

  clear(): void {
    this.form.reset({
      entryType: null,
      value: null,
      coin: 'BRL',
      typeTransfer: '',
      observacoes: ''
    });
    this.successMsg = '';
    this.errorMsg = '';
  }

  getUsuarioByToken(): void {
    const tk = localStorage.getItem('authToken');
    if (tk) {
      this.userService.getByTokenLogin(tk).subscribe(
        data => {
          this.user = data;
          if (this.user?.email) {
            localStorage.setItem('authorEmail', this.user.email);
          }
        }
      )
    }
  }

  private showSuccess(msg: string) {
    this.successMsg = msg;
    clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => (this.successMsg = ''), 4000);
  }

  private showError(msg: string) {
    this.errorMsg = msg;
    clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => (this.errorMsg = ''), 4000);
  }

}
