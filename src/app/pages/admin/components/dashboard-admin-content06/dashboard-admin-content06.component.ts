import { Component, OnInit, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Enterprise, WalletDetail } from 'src/app/models/enterprise';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { HttpClient } from '@angular/common/http';
import { Modal } from 'bootstrap';
import { UploadService } from 'src/app/services/upload.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';

type RoleField = { label: string; key: string };
type RoleGrouped = {
  cliente: RoleField[];
  contrato: RoleField[];
  release: RoleField[];
  equipe: RoleField[];
};

@Component({
  selector: 'app-dashboard-admin-content06',
  templateUrl: './dashboard-admin-content06.component.html',
  styleUrls: ['./dashboard-admin-content06.component.css']
})
export class DashboardAdminContent06Component implements OnInit {
  isLoadingEnterprise = false;
  enterpriseForm: FormGroup;
  activeEnterprise: Enterprise | null = null;
  isEditable = false;
  bancos: string[] = [];
  private createModal!: Modal;
  alertMessage: string | null = null;
  alertType: string | null = null;
  private previewModal!: Modal;
  private viewModal!: Modal;

  selectedFile: File | null = null;
  previewUrl: SafeUrl | null = null;
  previewTitle: string | null = null;
  private filesBaseUrl = '/uploads';
  private previewObjectUrl?: string;

  // Visualização (arquivo já salvo)
  viewImageUrl: SafeUrl | null = null;
  viewTitle: string | null = null;

  @ViewChild('logoEmpresaInput') logoEmpresaInput?: ElementRef<HTMLInputElement>;
  @ViewChild('assinaturaDiretorInput') assinaturaDiretorInput?: ElementRef<HTMLInputElement>;
  @ViewChild('transferBanckQrCodePixInput') transferBanckQrCodePixInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('walletQrInput') walletQrInputs?: QueryList<ElementRef<HTMLInputElement>>;

  previewTarget:
    | { scope: 'enterprise'; field: 'logoEmpresa' | 'assinaturaDiretor' | 'transferBanckQrCodePix' }
    | { scope: 'wallet'; field: 'qrCode'; index: number }
    | null = null;

  // ===== Permissões (listas base) =====
  contratoFields: RoleField[] = [
    { label: 'Contrato automatizado', key: 'contratoAutomatizado' },
    { label: 'Saldo automatizado', key: 'contratoSaldoAutomatizado' },
    { label: 'Crédito automatizado', key: 'contratoCreditoAutomatizado' },
    { label: 'Empréstimo automatizado', key: 'contratoEmprestimoAutomatizado' },
  ];

  AdministrativosFields: RoleField[] = [
    { label: `E-mail padronizado (todos os cargos) `, key: 'emailBrokerAutoPreenchimento' }
  ];

  brokerFields: RoleField[] = [
    { label: 'Criar release', key: 'brokerCriarRelease' },
    { label: 'Reprovar release', key: 'brokerReprovarRelease' },
    { label: 'Deletar release', key: 'brokerDeletarRelease' },
    { label: 'Criar contrato', key: 'brokerCriarContrato' },
    { label: 'Assinar contrato', key: 'brokerAssinarContrato' },
    { label: 'Deletar contrato', key: 'brokerDeletearContrato' },
    { label: 'Editar cliente', key: 'brokerEditarCliente' },
    { label: 'Editar saldo', key: 'brokerEdiatarSaldo' },
    { label: 'Editar crédito', key: 'brokerEdiatarCredito' },
    { label: 'Editar empréstimo', key: 'brokerEdiatarEmprestimo' },
    { label: 'Criar bot', key: 'brokerCreateBot' },
    { label: 'Deletar bot', key: 'brokerDeleteBot' },
  ];

  gerenteFields: RoleField[] = [
    { label: 'Editar cliente', key: 'gerenteEditarCliente' },
    { label: 'Editar saldo do cliente', key: 'gerenteEditarSaldoCliente' },
    { label: 'Editar crédito do cliente', key: 'gerenteEditarCreditoCliente' },
    { label: 'Editar empréstimo do cliente', key: 'gerenteEditarEmprestimoCliente' },
    { label: 'Criar contrato', key: 'gerenteCriarContrato' },
    { label: 'Assinar contrato', key: 'gerenteAssinarContrato' },
    { label: 'Deletar contrato', key: 'gerenteDeletearContrato' },
    { label: 'Criar release', key: 'gerenteCriarRelease' },
    { label: 'Aprovar release', key: 'gerenteAprovarRelease' },
    { label: 'Reprovar release', key: 'gerenteReprovarRelease' },
    { label: 'Deletar release', key: 'gerenteDeletarRelease' },
  ];


  suporteFields: RoleField[] = [
    { label: 'Editar cliente', key: 'suporteEditarCliente' },
    { label: 'Editar saldo do cliente', key: 'suporteEditarSaldoCliente' },
    { label: 'Editar crédito do cliente', key: 'suporteEditarCreditoCliente' },
    { label: 'Editar empréstimo do cliente', key: 'suporteEditarEmprestimoCliente' },
    { label: 'Criar contrato', key: 'suporteCriarContrato' },
    { label: 'Assinar contrato', key: 'suporteAssinarContrato' },
    { label: 'Deletar contrato', key: 'suporteDeletearContrato' },
    { label: 'Criar release', key: 'suporteCriarRelease' },
    { label: 'Aprovar release', key: 'suporteAprovarRelease' },
    { label: 'Reprovar release', key: 'suporteReprovarRelease' },
    { label: 'Deletar release', key: 'suporteDeletarRelease' },
    { label: 'Ediatar equipe', key: 'suporteEditarEquipe' },
  ];

  financeiroFields: RoleField[] = [
    { label: 'Editar cliente', key: 'financeiroEditarCliente' },
    { label: 'Editar saldo do cliente', key: 'financeiroEditarSaldoCliente' },
    { label: 'Editar crédito do cliente', key: 'financeiroEditarCreditoCliente' },
    { label: 'Editar empréstimo do cliente', key: 'financeiroEditarEmprestimoCliente' },
    { label: 'Criar contrato', key: 'financeiroCriarContrato' },
    { label: 'Assinar contrato', key: 'financeiroAssinarContrato' },
    { label: 'Deletar contrato', key: 'financeiroDeletearContrato' },
    { label: 'Criar release', key: 'financeiroCriarRelease' },
    { label: 'Aprovar release', key: 'financeiroAprovarRelease' },
    { label: 'Reprovar release', key: 'financeiroReprovarRelease' },
    { label: 'Deletar release', key: 'financeiroDeletarRelease' },
    { label: 'Ediatar equipe', key: 'financeiroEditarEquipe' },
  ];

  managerFields: RoleField[] = [
    { label: 'Editar cliente', key: 'managerEditarCliente' },
    { label: 'Editar saldo do cliente', key: 'managerEditarSaldoCliente' },
    { label: 'Editar crédito do cliente', key: 'managerEditarCreditoCliente' },
    { label: 'Editar empréstimo do cliente', key: 'managerEditarEmprestimoCliente' },
    { label: 'Criar contrato', key: 'managerCriarContrato' },
    { label: 'Assinar contrato', key: 'managerAssinarContrato' },
    { label: 'Deletar contrato', key: 'managerDeletearContrato' },
    { label: 'Criar release', key: 'managerCriarRelease' },
    { label: 'Aprovar release', key: 'managerAprovarRelease' },
    { label: 'Reprovar release', key: 'managerReprovarRelease' },
    { label: 'Deletar release', key: 'managerDeletarRelease' },
    { label: 'Ediatar equipe', key: 'managerEditarEquipe' },
  ];

  // ===== Grupos (colunas) prontos para o template =====
  brokerGrouped!: RoleGrouped;
  gerenteGrouped!: RoleGrouped;
  suporteGrouped!: RoleGrouped;
  financeiroGrouped!: RoleGrouped;
  managerGrouped!: RoleGrouped;

  constructor(
    private fb: FormBuilder,
    private enterpriseService: EnterpriseService,
    private http: HttpClient,
    private uploadService: UploadService,
    private sanitizer: DomSanitizer,
  ) {
    this.enterpriseForm = this.fb.group({
      // DADOS DA EMPRESA
      nomeEmpresa: [''],
      logoEmpresa: [''],
      emailEmpresa: [''],
      nomeDiretor: [''],
      assinaturaDiretor: [''],
      status: [{ value: false, disabled: true }],
      tavaCofreCdi: 0.0,

      // FINANCEIRO
      transferBanckName: [''],
      transferBanckBanck: [''],
      transferBanckCodeName: [''],
      transferBanckAgency: [''],
      transferBanckCNPJ: [''],
      transferBanckAccount: [''],
      transferBanckAccountType: [''],
      transferBanckKeyTypePix: [''],
      transferBanckKeyPix: [''],
      transferBanckQrCodePix: [''],
      transferBanckCopyKey: [''],

      // REDIRECIONAMENTO
      checkout: [''],
      homeBroker: [''],

      // ANÚNCIOS
      propagandaUrl: [''],
      propagandaToken: [''],

      // BOT
      historicoAutoDelete: [false],
      botNivel: [false],
      historicoAutoDeleteDias: [300],
      limiteDiasOperacaoBot: [100],

      // Wallets
      walletDetails: this.fb.array([])
    });

    // Adiciona dinamicamente os booleanos de permissão
    [
      ...this.contratoFields,
      ...this.AdministrativosFields,
      ...this.brokerFields,
      ...this.gerenteFields,
      ...this.suporteFields,
      ...this.financeiroFields,
      ...this.managerFields
    ].forEach(f => this.enterpriseForm.addControl(f.key, new FormControl(false)));

    // Monta os agrupamentos (Cliente | Contrato | Release)
    this.brokerGrouped = this.groupRoleFields(this.brokerFields);
    this.gerenteGrouped = this.groupRoleFields(this.gerenteFields);
    this.suporteGrouped = this.groupRoleFields(this.suporteFields);
    this.financeiroGrouped = this.groupRoleFields(this.financeiroFields);
    this.managerGrouped = this.groupRoleFields(this.managerFields);
  }

  ngOnInit(): void {
    this.getActiveEnterprise();
    this.loadBancos();
    this.initializeModal();

    const prev = document.getElementById('previewImageModal');
    const view = document.getElementById('viewImageModal');
    if (prev) this.previewModal = new Modal(prev);
    if (view) this.viewModal = new Modal(view);
  }

  // === Agrupamento helper ===
  private groupRoleFields(fields: RoleField[]): RoleGrouped {
    const lower = (s: string) => s.toLowerCase();

    const contrato = fields.filter(f => lower(f.key).includes('contrato'));
    const release = fields.filter(f => lower(f.key).includes('release'));
    const equipe = fields.filter(f => lower(f.key).includes('equipe'));

    // "cliente" = tudo que não é contrato nem release e afeta dados do cliente/saldo/crédito/empréstimo
    const cliente = fields.filter(f => {
      const k = lower(f.key);
      if (k.includes('contrato') || k.includes('release')) return false;
      return (
        k.includes('bot') ||
        k.includes('cliente') ||
        k.includes('saldo') ||
        k.includes('credito') || k.includes('crédito') ||
        k.includes('emprestimo') || k.includes('empréstimo')
      );
    });

    return { cliente, contrato, release, equipe };
  }

  // Carrega lista de bancos do JSON local
  private loadBancos(): void {
    this.http.get<{ bancos: string[] }>('/assets/pag.json').subscribe({
      next: data => this.bancos = data.bancos || [],
      error: err => console.error('Erro ao carregar lista de bancos:', err)
    });
  }

  private initializeModal(): void {
    const modalElement = document.getElementById('createEnterpriseModal');
    if (modalElement) this.createModal = new Modal(modalElement);
  }

  // === ENTERPRISE ATIVA ===
  getActiveEnterprise(): void {
    this.isLoadingEnterprise = true;
    this.enterpriseService.getActiveEnterprise()
      .pipe(finalize(() => this.isLoadingEnterprise = false))
      .subscribe({
        next: (e) => {
          this.activeEnterprise = e;
          this.enterpriseForm.patchValue(e || {});
          this.walletDetails.clear();
          (e?.walletDetails || []).forEach(w => {
            this.walletDetails.push(this.fb.group({
              id: [w.id || ''],
              ativo: [w.ativo ?? ''],
              wallet: [w.wallet],
              rede: [w.rede],
              qrCode: [w.qrCode],
              visibuly: [!!w.visibuly],
              isNew: [false],
              editMode: [false],
              originalId: [w.id || ''],
            }));
          });
          this.isEditable = false;
        },
        error: () => {
          this.activeEnterprise = null;
          this.isEditable = false;
        }
      });
  }

  // === MODAL CRIAÇÃO ===
  openCreateModal(): void {
    this.isEditable = true;
    this.enterpriseForm.reset({
      historicoAutoDelete: false,
      historicoAutoDeleteDias: 300,
      limiteDiasOperacaoBot: 100
    });
    this.walletDetails.clear();
    this.createModal.show();
  }

  // Cria e ativa a nova enterprise (sem deletar a antiga)
  createEnterprise(): void {
    const payload: Enterprise = {
      ...this.enterpriseForm.getRawValue(),
      status: false
    };
    this.enterpriseService.createEnterprise(payload).subscribe({
      next: (created) => {
        this.enterpriseService.activateEnterprise(created.id!).subscribe({
          next: () => {
            this.showAlert('Empresa criada e ativada com sucesso!', 'success');
            this.getActiveEnterprise();
            this.createModal.hide();
          },
          error: () => this.showAlert('Empresa criada, mas falhou ao ativar.', 'warning')
        });
      },
      error: () => this.showAlert('Erro ao criar a empresa.', 'danger')
    });
  }

  enableEdit(): void { this.isEditable = true; }

  // PUT = substitui todos os campos (conforme backend replaceAll)
  updateEnterprise(): void {
    if (!this.activeEnterprise?.id) return;

    const payload: Enterprise = {
      ...this.activeEnterprise,
      ...this.enterpriseForm.getRawValue()
    };

    const id = this.activeEnterprise.id;
    this.enterpriseService.replaceAll(id, payload).subscribe({
      next: () => {
        this.showAlert('Empresa atualizada com sucesso!', 'success');
        this.isEditable = false;
        this.getActiveEnterprise();
      },
      error: () => this.showAlert('Erro ao atualizar a empresa.', 'danger')
    });
  }

  // === UPLOADS PONTUAIS (PATCH de um campo só) ===
  onFileSelected(event: any, field: string): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      this.showAlert(`Formato inválido! Escolha JPG, JPEG, PNG ou WEBP.`, 'danger');
      return;
    }

    this.uploadService.uploadFile(file, 'enterprise', field).subscribe({
      next: (resp) => {
        const fileName = resp.fileName;
        this.enterpriseForm.patchValue({ [field]: fileName });

        if (this.activeEnterprise?.id) {
          this.enterpriseService.patch(this.activeEnterprise.id, { [field]: fileName }).subscribe({
            next: () => {
              this.showAlert(`Arquivo (${field}) salvo com sucesso!`, 'success');
              this.getActiveEnterprise();
            },
            error: () => this.showAlert(`Erro ao salvar o campo ${field}.`, 'danger')
          });
        }
      },
      error: (err) => {
        console.error(`Erro no upload de ${field}:`, err);
        this.showAlert(`Erro ao enviar o arquivo ${field}.`, 'danger');
      }
    });
  }

  deleteUploadedFile(field: string): void {
    const fileName = this.enterpriseForm.get(field)?.value;
    if (!fileName) {
      this.showAlert(`Nenhuma imagem para excluir no campo ${field}.`, 'warning');
      return;
    }

    this.uploadService.deleteFile(fileName).subscribe({
      next: () => {
        if (this.activeEnterprise?.id) {
          this.enterpriseService.patch(this.activeEnterprise.id, { [field]: '' }).subscribe({
            next: () => {
              this.showAlert(`Imagem de ${field} removida e persistida!`, 'success');
              this.enterpriseForm.patchValue({ [field]: '' });
              this.getActiveEnterprise();
            },
            error: () => this.showAlert(`Erro ao atualizar banco após remoção.`, 'danger')
          });
        }
      },
      error: (err) => {
        console.error(`Erro ao excluir ${field}:`, err);
        this.showAlert(`Erro ao excluir a imagem de ${field}.`, 'danger');
      }
    });
  }

  // === WALLET DETAILS ===
  get walletDetails(): FormArray { return this.enterpriseForm.get('walletDetails') as FormArray; }

  openAddWalletDetail(): void {
    this.walletDetails.push(this.fb.group({
      ativo: [''],
      wallet: [''],
      rede: [''],
      qrCode: [''],
      visibuly: [false],
      isNew: [true],
      editMode: [true]
    }));
  }

  createWalletDetail(index: number): void {
    const walletGroup = this.walletDetails.at(index);
    if (!walletGroup || !this.activeEnterprise?.id) return;

    const newWallet: WalletDetail = {
      ativo: (walletGroup.get('ativo')?.value || '').toString().trim(),
      wallet: (walletGroup.get('wallet')?.value || '').toString().trim(),
      rede: (walletGroup.get('rede')?.value || '').toString().trim(),
      qrCode: walletGroup.get('qrCode')?.value,
      visibuly: !!walletGroup.get('visibuly')?.value
    };

    this.enterpriseService.addWalletDetail(this.activeEnterprise.id, newWallet).subscribe({
      next: () => {
        this.showAlert('Wallet criada com sucesso!', 'success');
        this.getActiveEnterprise();
      },
      error: () => this.showAlert('Erro ao criar Wallet.', 'danger')
    });
  }

  enableWalletEdit(index: number): void {
    this.walletDetails.at(index)?.get('editMode')?.setValue(true);
  }

  saveWalletDetail(index: number): void {
    const walletGroup = this.walletDetails.at(index) as FormGroup;
    const enterpriseId = this.activeEnterprise?.id;
    if (!walletGroup || !enterpriseId) return;

    const originalId =
      walletGroup.get('originalId')?.value ||
      walletGroup.get('id')?.value;

    if (!originalId) {
      this.showAlert('ID da wallet ausente. Não foi possível salvar.', 'danger');
      return;
    }

    const payload: WalletDetail = {
      id: originalId,
      ativo: (walletGroup.get('ativo')?.value ?? '').toString().trim(),
      wallet: (walletGroup.get('wallet')?.value ?? '').toString().trim(),
      rede: (walletGroup.get('rede')?.value ?? '').toString().trim(),
      qrCode: walletGroup.get('qrCode')?.value,
      visibuly: !!walletGroup.get('visibuly')?.value
    };

    this.enterpriseService.editWalletDetail(enterpriseId, originalId, payload).subscribe({
      next: () => {
        this.showAlert('Wallet atualizada com sucesso!', 'success');
        walletGroup.get('editMode')?.setValue(false);
        walletGroup.get('id')?.setValue(payload.id);
        walletGroup.get('originalId')?.setValue(payload.id);
        this.getActiveEnterprise();
      },
      error: () => this.showAlert('Erro ao atualizar Wallet.', 'danger')
    });
  }

  private findWalletIndexById(identifier: string): number {
    return this.walletDetails.controls.findIndex(ctrl => {
      const id = ctrl.get('id')?.value;
      const originalId = ctrl.get('originalId')?.value;
      return id === identifier || originalId === identifier;
    });
  }

  removeWalletDetail(walletIdentifier: string): void {
    const enterpriseId = this.activeEnterprise?.id;
    if (enterpriseId == null) {
      this.showAlert('Empresa ativa não encontrada.', 'danger');
      return;
    }

    const ok = window.confirm('Deseja realmente deletar esta wallet?');
    if (!ok) return;
    const pw = window.prompt("Digite 'delete' para confirmar a exclusão da wallet:");
    if (pw !== 'delete') { window.alert('Senha incorreta.'); return; }

    const idx = this.findWalletIndexById(walletIdentifier);
    if (idx === -1) {
      this.showAlert('Wallet não encontrada no formulário.', 'warning');
      return;
    }

    const walletGroup = this.walletDetails.at(idx) as FormGroup;
    const isNew = !!walletGroup.get('isNew')?.value;
    const qrCode: string | null = walletGroup.get('qrCode')?.value || null;

    const doDeleteWallet = () => {
      if (isNew) {
        this.walletDetails.removeAt(idx);
        this.showAlert('Wallet removida do formulário.', 'success');
        return;
      }
      this.enterpriseService.removeWalletDetail(enterpriseId, walletIdentifier).subscribe({
        next: () => {
          this.showAlert('Wallet removida com sucesso!', 'success');
          this.getActiveEnterprise();
        },
        error: (err) => {
          console.error('[Wallet delete] erro ao remover wallet:', err);
          this.showAlert('Erro ao remover Wallet.', 'danger');
        }
      });
    };

    if (!qrCode) {
      doDeleteWallet();
      return;
    }

    this.uploadService.deleteFile(qrCode).subscribe({
      next: () => {
        walletGroup.patchValue({ qrCode: '' });
        doDeleteWallet();
      },
      error: (err) => {
        console.error('[Wallet delete] erro ao remover imagem do S3:', err);
        this.showAlert('Erro ao excluir a imagem da wallet no S3. Operação abortada.', 'danger');
      }
    });
  }

  toggleWalletVisibility(walletIdentifier: string): void {
    if (!this.activeEnterprise?.id) return;
    this.enterpriseService.toggleWalletVisibility(this.activeEnterprise.id, walletIdentifier).subscribe({
      next: () => {
        this.showAlert('Visibilidade alternada com sucesso!', 'success');
        this.getActiveEnterprise();
      },
      error: () => this.showAlert('Erro ao alternar visibilidade.', 'danger')
    });
  }

  onWalletFileSelected(event: any, index: number, fieldName: string): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      this.showAlert('Formato inválido! Escolha JPG, JPEG, PNG ou WEBP.', 'danger');
      return;
    }

    const walletGroup = this.walletDetails.at(index);
    if (!walletGroup || !this.activeEnterprise?.id) return;

    const ativo = (walletGroup.get('ativo')?.value || '').toString().trim();
    const rede = (walletGroup.get('rede')?.value || '');
    const newFileName = `wallet_${ativo}_${rede}`.replace(/\s+/g, '');

    this.uploadService.uploadFile(file, 'wallet', newFileName).subscribe({
      next: (resp) => {
        const realFile = resp.fileName || newFileName;
        walletGroup.patchValue({ [fieldName]: realFile });

        const payload: Enterprise = {
          ...this.activeEnterprise!,
          ...this.enterpriseForm.getRawValue()
        };

        const id = this.activeEnterprise!.id!;
        this.enterpriseService.replaceAll(id, payload).subscribe({
          next: () => this.showAlert('QR Code de wallet salvo!', 'success'),
          error: () => this.showAlert('Erro ao salvar QR Code de wallet.', 'danger')
        });
      },
      error: (err) => {
        console.error('[Wallet upload] erro:', err);
        this.showAlert('Erro ao enviar o QR Code.', 'danger');
      }
    });
  }

  deleteWalletFile(index: number, fieldName: string): void {
    const walletGroup = this.walletDetails.at(index);
    if (!walletGroup) return;

    const fileName = walletGroup.get(fieldName)?.value;
    if (!fileName) {
      this.showAlert(`Nenhuma imagem para excluir no campo ${fieldName}.`, 'warning');
      return;
    }

    if (!confirm('Deseja realmente deletar esta imagem?')) return;
    const pw = prompt("Digite 'delete' para confirmar a exclusão:");
    if (pw !== 'delete') { alert('Senha incorreta.'); return; }

    this.uploadService.deleteFile(fileName).subscribe({
      next: () => {
        walletGroup.patchValue({ [fieldName]: '' });
        if (this.activeEnterprise?.id) {
          const payload: Enterprise = {
            ...this.activeEnterprise,
            ...this.enterpriseForm.getRawValue()
          };
          this.enterpriseService.replaceAll(this.activeEnterprise.id, payload).subscribe({
            next: () => this.showAlert('QR Code removido e salvo!', 'success'),
            error: () => this.showAlert('Erro ao persistir remoção do QR Code.', 'danger')
          });
        }
      },
      error: () => this.showAlert('Erro ao excluir o QR Code.', 'danger')
    });
  }

  showAlert(message: string, type: string): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => { this.alertMessage = null; this.alertType = null; }, 7000);
  }

  // Dispara o input de arquivo para um campo da empresa
  triggerFileInput(field: 'logoEmpresa' | 'assinaturaDiretor' | 'transferBanckQrCodePix') {
    if (field === 'logoEmpresa') this.logoEmpresaInput?.nativeElement.click();
    if (field === 'assinaturaDiretor') this.assinaturaDiretorInput?.nativeElement.click();
    if (field === 'transferBanckQrCodePix') this.transferBanckQrCodePixInput?.nativeElement.click();
  }

  triggerWalletFileInput(index: number) {
    const el = this.walletQrInputs?.toArray()[index]?.nativeElement;
    el?.click();
  }

  // Gera URL pública para visualizar imagem já salva
  getImageUrl(fileName: string | null | undefined): string | null {
    if (!fileName) return null;
    return `${this.filesBaseUrl}/${encodeURIComponent(fileName)}`;
  }

  // Abre modal de visualização de imagem já salva
  openViewImage(fileName: string, title: string) {
    this.viewTitle = title;
    const url = this.uploadService.url() + encodeURIComponent(fileName);
    this.viewImageUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    this.viewModal?.show();
  }

  // Handler genérico: escolheu arquivo => abre modal de pré-visualização
  onImageFileChosen(
    event: Event,
    target:
      | { scope: 'enterprise'; field: 'logoEmpresa' | 'assinaturaDiretor' | 'transferBanckQrCodePix' }
      | { scope: 'wallet'; field: 'qrCode'; index: number }
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!allowed.includes(ext)) {
      this.showAlert('Formato inválido! Escolha JPG, JPEG, PNG ou WEBP.', 'danger');
      return;
    }

    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = undefined;
    }

    this.selectedFile = file;
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(this.previewObjectUrl);
    this.previewTarget = target;

    if (target.scope === 'enterprise') {
      const labels: Record<string, string> = {
        logoEmpresa: 'Logo da empresa',
        assinaturaDiretor: 'Assinatura do Diretor',
        transferBanckQrCodePix: 'QR Code Pix',
      };
      this.previewTitle = `Pré-visualizar: ${labels[target.field]}`;
    } else {
      this.previewTitle = 'Pré-visualizar: QR Code da Wallet';
    }

    this.previewModal?.show();
  }

  // Cancela o preview
  cancelPreview() {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = undefined;
    }
    this.previewUrl = null;
    this.selectedFile = null;
    this.previewTarget = null;
    this.previewTitle = null;
  }

  confirmUpload(): void {
    if (!this.selectedFile || !this.previewTarget) return;

    // ENTERPRISE FIELDS
    if (this.previewTarget.scope === 'enterprise') {
      const field = this.previewTarget.field;
      this.uploadService.uploadFile(this.selectedFile, 'enterprise', field).subscribe({
        next: (resp) => {
          const fileName = resp.fileName;
          this.enterpriseForm.patchValue({ [field]: fileName });

          if (this.activeEnterprise?.id) {
            this.enterpriseService.patch(this.activeEnterprise.id, { [field]: fileName }).subscribe({
              next: () => {
                this.showAlert(`Arquivo (${field}) salvo com sucesso!`, 'success');
                this.getActiveEnterprise();
                this.previewModal?.hide();
                this.cancelPreview();
              },
              error: () => this.showAlert(`Erro ao salvar o campo ${field}.`, 'danger')
            });
          } else {
            this.previewModal?.hide();
            this.cancelPreview();
          }
        },
        error: () => this.showAlert('Erro ao enviar arquivo.', 'danger')
      });

      return;
    }

    // WALLET QR CODE
    if (!this.activeEnterprise?.id) {
      this.showAlert('Empresa ativa não encontrada.', 'danger');
      return;
    }

    const idx = this.previewTarget.index;
    const walletGroup = this.walletDetails.at(idx);
    if (!walletGroup) return;

    const ativo = (walletGroup.get('ativo')?.value || '').toString().trim();
    const rede = (walletGroup.get('rede')?.value || '').toString().trim();
    const newFileName = `wallet_${ativo}_${rede}`.replace(/\s+/g, '');

    this.uploadService.uploadFile(this.selectedFile, 'wallet', newFileName).subscribe({
      next: (resp) => {
        const realFile = resp.fileName || newFileName;
        walletGroup.patchValue({ qrCode: realFile });

        const payload: Enterprise = {
          ...(this.activeEnterprise as Enterprise),
          ...this.enterpriseForm.getRawValue()
        };

        const activeId = this.activeEnterprise?.id ?? null;
        if (activeId === null) {
          this.showAlert('Empresa ativa não encontrada.', 'danger');
          return;
        }

        this.enterpriseService.replaceAll(activeId, payload).subscribe({
          next: () => {
            this.showAlert('QR Code de wallet salvo!', 'success');
            this.previewModal?.hide();
            this.cancelPreview();
          },
          error: () => this.showAlert('Erro ao salvar QR Code de wallet.', 'danger')
        });
      },
      error: () => this.showAlert('Erro ao enviar QR Code da wallet.', 'danger')
    });
  }
}
