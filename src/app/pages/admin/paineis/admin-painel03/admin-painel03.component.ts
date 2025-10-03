import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Contrato, TypeReleaseUnion } from 'src/app/models/contrato';
import { User } from 'src/app/models/user';
import { ContratoService } from 'src/app/services/contrato.service';

@Component({
  selector: 'app-admin-painel03',
  templateUrl: './admin-painel03.component.html',
  styleUrls: ['./admin-painel03.component.css']
})
export class AdminPainel03Component implements OnInit, OnChanges {
  @Input() user?: User;
  @Input() enterprise: any;

  alertMessage: string | null = null;
  alertType: 'success' | 'danger' | null = null;
  private alertTimeout?: any;

  transferTypes: string[] = ['pix', 'ted', 'doc', 'cripto', 'bank', 'wire', 'card', 'outros'];

  contrato: Contrato = {
    clientName: '',
    clientEmail: '',
    saldo: 0.0,
    contractName: '',
    date: '' as any,
    signed: false,
    activeSymbol: '',
    automatic: false,
    campoCliente: '',
    typeRelease: undefined,
    typeTransfer: undefined,
    paragrafos: []
  };

  constructor(
    private contratoService: ContratoService,
    private http: HttpClient,
  ) { }

  ngOnInit(): void {
    if (this.user) {
      this.contrato.clientName = this.user.nome ?? this.contrato.clientName;
      this.contrato.clientEmail = this.user.email ?? this.contrato.clientEmail;
    }
    this.enforceAutomaticLock();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enterprise']) {
      this.enforceAutomaticLock();
      // Se já existem parágrafos carregados, aplicamos a substituição com a nova enterprise
      this.replacePlaceholdersInContrato();
    }
  }

  // ---------- NOVO: helpers para substituição ----------
  /** Ex.: https://meusite.com/ (sempre com / no final) */
  private getSiteBaseUrl(): string {
    try {
      const { protocol, host } = window.location;
      // host já inclui hostname + :port (se houver). Isso mantém fiel ao "site atual".
      return `${protocol}//${host}/`;
    } catch {
      // fallback seguro se window não estiver disponível (SSR/teste)
      return 'https://meusite.com/';
    }
  }

  /** Substitui (CORRETORA) e (sitecorretora) no texto informado */
/** Substitui (CORRETORA), (sitecorretora) e (emailcorretora) no texto informado */
private replacePlaceholdersInText(text: string | undefined | null): string {
  if (!text) return '';
  const nomeEmpresa = (this.enterprise?.nomeEmpresa ?? 'CORRETORA').toString();
  const emailEmpresa = (this.enterprise?.emailEmpresa ?? 'email@corretora.com').toString();
  const siteBase = this.getSiteBaseUrl();

  return text
    .replace(/\(CORRETORA\)/g, `${nomeEmpresa}`)
    .replace(/\(sitecorretora\)/gi, `${siteBase}`)
    .replace(/\(emailcorretora\)/gi, `${emailEmpresa}`)
    .replace(/\email@corretora.com/gi, `${emailEmpresa}`);
}


  /** Aplica substituições no contrato atual (título, campo cliente e cada parágrafo) */
  private replacePlaceholdersInContrato(): void {
    this.contrato.contractName = this.replacePlaceholdersInText(this.contrato.contractName);
    this.contrato.campoCliente = this.replacePlaceholdersInText(this.contrato.campoCliente);
    this.contrato.paragrafos = (this.contrato.paragrafos || []).map(p => ({
      titulo: this.replacePlaceholdersInText(p.titulo),
      texto: this.replacePlaceholdersInText(p.texto),
    }));
  }
  // ---------- FIM helpers ----------

  // trava automático se a empresa não permitir
  private enforceAutomaticLock(): void {
    if (!this.enterprise?.contratoAutomatizado) {
      this.contrato.automatic = false;
      this.contrato.typeRelease = undefined;
    }
  }

  onAutomaticChange(): void {
    console.log('ENTERPRISE: ', this.enterprise)
    if (!this.enterprise?.contratoAutomatizado) {
      this.contrato.automatic = false;
      this.contrato.typeRelease = undefined;
    } else if (!this.contrato.automatic) {
      this.contrato.typeRelease = undefined;
    }
  }

  closeAlert(): void {
    if (this.alertTimeout) clearTimeout(this.alertTimeout);
    this.alertMessage = null;
    this.alertType = null;
  }

  showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage = message;
    this.alertType = type;
    if (this.alertTimeout) clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => this.closeAlert(), 5000);
  }

  onContractChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const contratoId = selectElement.value;
    if (contratoId !== 'null') {
      this.loadSelectedContrato(contratoId);
    } else {
      this.clearForm();
    }
  }

  loadSelectedContrato(contratoId: string) {
    this.http.get<Partial<Contrato>>(`assets/${contratoId}.json`).subscribe({
      next: data => {
        this.contrato = {
          ...this.contrato,
          ...data,
          activeSymbol: (data as any)?.active ?? data?.activeSymbol ?? this.contrato.activeSymbol,
          typeTransfer: (data as any)?.typeTransfer ?? (data as any)?.typeTransfer ?? this.contrato.typeTransfer
        };

        if (this.user) {
          this.contrato.clientName = this.user.nome ?? this.contrato.clientName;
          this.contrato.clientEmail = this.user.email ?? this.contrato.clientEmail;
        }

        this.enforceAutomaticLock();

        // ---------- NOVO: aplicar substituições logo após carregar ----------
        this.replacePlaceholdersInContrato();
      },
      error: err => {
        console.error('Erro ao carregar o contrato:', err);
        this.showAlert('Erro ao carregar o contrato.', 'danger');
      }
    });
  }

  addParagrafo() {
    this.contrato.paragrafos.push({ titulo: '', texto: '' });
  }

  removeParagrafo(index: number) {
    this.contrato.paragrafos.splice(index, 1);
  }

  saveContrato(form: NgForm): void {
    // se o template está inválido, marca tudo como tocado para exibir erros
    if (form.invalid) {
      Object.values(form.controls).forEach(c => c.markAsTouched());
      this.showAlert('Preencha os campos obrigatórios.', 'danger');
      return;
    }

    // regra extra: saldo > 0
    if (!(this.contrato.saldo! > 0)) {
      this.showAlert('O saldo deve ser maior que zero.', 'danger');
      return;
    }

    // se automático, garantir typeRelease
    if (this.contrato.automatic && !this.contrato.typeRelease) {
      this.showAlert('Selecione o tipo de release para contrato automático.', 'danger');
      return;
    }

    if (!this.user?.id) {
      this.showAlert('Usuário inválido para criação de contrato.', 'danger');
      return;
    }

    // ---------- NOVO: garantir substituições também antes de enviar ----------
    this.replacePlaceholdersInContrato();

    const normalizeDateToISO = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === 'string') return new Date(val + 'T00:00:00Z').toISOString();
      if (val instanceof Date) return val.toISOString();
      return null;
    };

    const paragrafosSan = (this.contrato.paragrafos || [])
      .map(p => ({
        titulo: (this.replacePlaceholdersInText(p.titulo) ?? '').toString().trim(),
        texto: (this.replacePlaceholdersInText(p.texto) ?? '').toString().trim()
      }))
      .filter(p => p.titulo || p.texto);

    const payload: any = {
      clientName: this.contrato.clientName?.trim(),
      clientEmail: this.contrato.clientEmail?.trim(),
      contractName: this.replacePlaceholdersInText(this.contrato.contractName)?.trim(),
      saldo: Number(this.contrato.saldo) || 0,
      date: normalizeDateToISO(this.contrato.date),
      signed: !!this.contrato.signed,
      activeSymbol: this.contrato.activeSymbol?.trim(),
      automatic: !!this.contrato.automatic,
      campoCliente: this.replacePlaceholdersInText(this.contrato.campoCliente)?.trim() || null,
      typeRelease: this.contrato.typeRelease,
      typeTransfer: this.contrato.typeTransfer || null,
      paragrafos: paragrafosSan
    };

    if (!payload.date) {
      this.showAlert('Data inválida.', 'danger');
      return;
    }

    this.contratoService.createContrato(this.user.id, payload).subscribe({
      next: () => {
        this.showAlert('Contrato criado com sucesso!', 'success');

        const preservedName = this.contrato.clientName;
        const preservedEmail = this.contrato.clientEmail;

        this.contrato = {
          clientName: preservedName,
          clientEmail: preservedEmail,
          saldo: 0,
          contractName: '',
          date: '' as any,
          signed: false,
          activeSymbol: '',
          automatic: false,
          campoCliente: '',
          typeRelease: undefined,
          typeTransfer: undefined,
          paragrafos: []
        };
        form.resetForm({
          clientName: preservedName,
          clientEmail: preservedEmail,
          saldo: 0,
          signed: false,
          automatic: false
        });
        this.enforceAutomaticLock();
      },
      error: (err) => {
        console.error('Erro ao criar contrato:', err);
        const msg = err?.error?.message || err?.message || 'Erro ao criar contrato.';
        this.showAlert(msg, 'danger');
      }
    });
  }

  clearForm() {
    const preservedName = this.contrato.clientName;
    const preservedEmail = this.contrato.clientEmail;

    this.contrato = {
      id: 0,
      clientName: preservedName,
      clientEmail: preservedEmail,
      saldo: 0.0,
      contractName: '',
      date: '' as any,
      signed: false,
      activeSymbol: '',
      automatic: false,
      campoCliente: '',
      typeRelease: undefined,
      typeTransfer: undefined,
      paragrafos: []
    };
    this.enforceAutomaticLock();
  }
}
