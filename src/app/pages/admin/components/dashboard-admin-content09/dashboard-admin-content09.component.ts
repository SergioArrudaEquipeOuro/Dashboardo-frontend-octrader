import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { Enterprise } from 'src/app/models/enterprise';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { ConnectionService } from 'src/app/services/connection.service';

type Role =
  | 'CLIENTE'
  | 'BROKER'
  | 'ADMINISTRADOR'
  | 'FINANCEIRO'
  | 'GERENTE'
  | 'MANAGER'
  | 'SUPORTE'
  | 'ROOT';

@Component({
  selector: 'app-dashboard-admin-content09',
  templateUrl: './dashboard-admin-content09.component.html',
  styleUrls: ['./dashboard-admin-content09.component.css']
})
export class DashboardAdminContent09Component implements OnInit {
  get passwordsMismatch(): boolean {
    return !!this.form.errors?.['passwordsMismatch'];
  }


  form: FormGroup;
  roles: Role[] = [
    'CLIENTE', 'BROKER', 'ADMINISTRADOR', 'FINANCEIRO', 'GERENTE', 'MANAGER', 'SUPORTE', 'ROOT'
  ];

  activeEnterprise: Enterprise | null = null;
  isLoadingEnterprise = false;
  isSubmitting = false;

  alertMessage: string | null = null;
  alertType: 'success' | 'danger' | 'warning' | 'info' | null = null;

  generatedEmail: string | null = null;
  private apiBase = this.conn.url() + 'api/usuarios';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private enterpriseSvc: EnterpriseService,
    private conn: ConnectionService
  ) {
    this.form = this.fb.group(
      {
        role: ['CLIENTE', Validators.required],
        nome: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.email]],       // fica required SÓ quando manual
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmSenha: ['', [Validators.required]],
        obs: [''],
        cpf: [''],
        telefone: ['']
      },
      { validators: [this.passwordsMatchValidator()] }
    );
  }

  ngOnInit(): void {
    this.loadEnterprise();
    this.form.get('nome')?.valueChanges.subscribe(() => this.maybeRegenerateEmail());
    this.updateClientFieldValidators();
  }

  /** Validador de confirmação de senha */
  private passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl) => {
      const s = group.get('senha')?.value;
      const c = group.get('confirmSenha')?.value;
      if (!s || !c) return null;
      return s === c ? null : { passwordsMismatch: true };
    };
  }

  private loadEnterprise(): void {
    this.isLoadingEnterprise = true;
    this.enterpriseSvc.getActiveEnterprise()
      .pipe(finalize(() => this.isLoadingEnterprise = false))
      .subscribe({
        next: (e) => { this.activeEnterprise = e || null; this.applyEmailPolicy(); },
        error: () => { this.activeEnterprise = null; this.applyEmailPolicy(); }
      });
  }

  get autoEmailPolicyOn(): boolean {
    return !!this.activeEnterprise?.emailBrokerAutoPreenchimento;
  }
  get isClient(): boolean {
    return this.form.get('role')?.value === 'CLIENTE';
  }
  get showManualEmail(): boolean {
    if (!this.autoEmailPolicyOn) return true;       // política off => manual
    return this.isClient;                            // política on => manual só CLIENTE
  }
  get showAutoEmail(): boolean {
    return this.autoEmailPolicyOn && !this.isClient; // política on e não-CLIENTE => auto
  }

  onRoleChange(): void {
    this.applyEmailPolicy();
    this.updateClientFieldValidators();
  }

  /** Liga/desliga required do e-mail conforme manual/auto e atualiza valor quando auto */
  private applyEmailPolicy(): void {
    const emailCtrl = this.form.get('email');
    if (!emailCtrl) return;

    if (this.showAutoEmail) {
      emailCtrl.disable({ emitEvent: false });
      this.generatedEmail = this.buildAutoEmail(this.form.get('nome')?.value || '');
      emailCtrl.setValue(this.generatedEmail, { emitEvent: false });
      emailCtrl.clearValidators(); // não é necessário validar campo desabilitado
      emailCtrl.updateValueAndValidity({ emitEvent: false });
    } else {
      emailCtrl.enable({ emitEvent: false });
      // quando manual, exigimos e-mail válido + required
      emailCtrl.setValidators([Validators.required, Validators.email]);
      emailCtrl.updateValueAndValidity({ emitEvent: false });
      this.generatedEmail = null;
    }
  }

  maybeRegenerateEmail(): void {
    if (this.showAutoEmail) {
      const emailCtrl = this.form.get('email');
      this.generatedEmail = this.buildAutoEmail(this.form.get('nome')?.value || '');
      emailCtrl?.setValue(this.generatedEmail, { emitEvent: false });
    }
  }

  private buildAutoEmail(nomeBruto: string): string {
    const local = this.slugify(nomeBruto);
    const domain = this.buildDomainFromEnterprise();
    return local && domain ? `${local}@${domain}` : '';
  }

  private buildDomainFromEnterprise(): string {
    const nm = this.activeEnterprise?.nomeEmpresa || '';
    const base = this.slugify(nm);
    return base ? `${base}.com` : '';
  }

  private slugify(s: string): string {
    return (s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '')
      .toLowerCase();
  }

  resetForm(): void {
    this.form.reset({ role: 'CLIENTE', nome: '', email: '', senha: '', confirmSenha: '', obs: '' });
    this.generatedEmail = null;
    this.applyEmailPolicy();
  }

  submit(): void {
    if (!this.activeEnterprise) {
      this.toast('Nenhuma empresa ativa encontrada.', 'warning');
      return;
    }
    // força validação do form inteiro (inclui o validador de senha)
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();

    if (this.form.invalid) {
      if (this.form.errors?.['passwordsMismatch']) {
        this.toast('As senhas não coincidem.', 'warning');
      } else {
        this.toast('Preencha os campos obrigatórios corretamente.', 'warning');
      }
      return;
    }

    const role: Role = this.form.value.role;
    const nome: string = (this.form.value.nome || '').trim();
    const senha: string = this.form.value.senha;
    const obs: string = this.form.value.obs || '';
    const email: string = this.showAutoEmail
      ? (this.generatedEmail || '')
      : (this.form.value.email || '').trim();

    const payload: any = { nome, email, senha, obs, role };

    // Somente CLIENTE envia CPF (e telefone, se existir)
    if (role === 'CLIENTE') {
      const cpfRaw: string = (this.form.value.cpf || '').toString();
      const cpf = cpfRaw.replace(/\D/g, ''); // mantém só números
      const telefone: string = (this.form.value.telefone || '').trim();

      payload.cpf = cpf;
      if (telefone) payload.telefone = telefone;
    }

    const path =
      role === 'CLIENTE' ? '/cliente' :
        role === 'BROKER' ? '/broker' :
          role === 'ADMINISTRADOR' ? '/administrador' :
            role === 'FINANCEIRO' ? '/financeiro' :
              role === 'GERENTE' ? '/gerente' :
                role === 'MANAGER' ? '/manager' :
                  role === 'SUPORTE' ? '/suporte' :
                    role === 'ROOT' ? '/root' :
                      null;

    if (!path) { this.toast('Papel inválido.', 'danger'); return; }

    this.isSubmitting = true;
    this.http.post(this.apiBase + path, payload)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: () => { this.toast('Usuário criado com sucesso!', 'success'); this.resetForm(); },
        error: (err) => {
          console.error('[create user] erro:', err);
          const msg = typeof err?.error?.message === 'string'
            ? err.error.message
            : (typeof err?.error === 'string' ? err.error : 'Erro ao criar usuário.');
          this.toast(msg, 'danger');
        }
      });
  }

  private toast(message: string, type: 'success' | 'danger' | 'warning' | 'info') {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => { this.alertMessage = null; this.alertType = null; }, 7000);
  }


  private updateClientFieldValidators(): void {
    const cpfCtrl = this.form.get('cpf');
    const telCtrl = this.form.get('telefone');

    if (!cpfCtrl || !telCtrl) return;

    if (this.isClient) {
      // CPF obrigatório, 11 dígitos numéricos
      cpfCtrl.setValidators([Validators.required, Validators.pattern(/^\d{11}$/)]);
      // Telefone opcional (sem validação por enquanto)
      telCtrl.clearValidators();
    } else {
      // Se não é CLIENTE, limpa e remove validadores
      cpfCtrl.clearValidators();
      cpfCtrl.setValue('');
      telCtrl.clearValidators();
      telCtrl.setValue('');
    }
    cpfCtrl.updateValueAndValidity({ emitEvent: false });
    telCtrl.updateValueAndValidity({ emitEvent: false });
  }

}
