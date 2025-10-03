import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UploadService } from 'src/app/services/upload.service';
import { UserService } from 'src/app/services/user.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-admin-painel01',
  templateUrl: './admin-painel01.component.html',
  styleUrls: ['./admin-painel01.component.css']
})
export class AdminPainel01Component implements OnChanges {
  @Input() userId!: number;
  @Input() enterprise: any
  @Input() userRole: any;
  userForm!: FormGroup;
  editMode = false;
  role: string = '';
  isSaving = false;
  message: string | null = null;
  messageType: 'success' | 'danger' = 'success';
  bancos: string[] = [];
  selectedFiles: Record<string, File> = {};
  isUploading: Record<string, boolean> = {};
  previewLoading = true;
  displayBirthdate: string = '';
  pendingField: string | null = null;
  confirmTitle = '';
  confirmUrl?: SafeUrl;
  confirmLoading = true;
  private confirmObjectUrl?: string;
  approving: Record<string, boolean> = {};
  isApproving: Record<string, boolean> = {};

  previewTitle: string = '';
  previewUrl?: SafeUrl;

  docLabelMap: Record<string, string> = {
    imgRG: 'RG',
    imgCPF: 'CPF',
    imgResidencia: 'Comprovante de Residência',
    imgPerfil: 'Foto de Perfil',
    imgSelfie: 'Selfie',
    imgAssing: 'Assinatura'
  };

  labelFor(field: string): string {
    return this.docLabelMap[field]
      ?? this.capitalize(field.replace(/^img/i, '').replace(/([A-Z])/g, ' $1'));
  }


  // quais flags mostrar para CLIENTE
  clienteFlags = [
    { key: 'sac', label: 'Ativar saque' },
    { key: 'bt', label: 'Primeiro contato' },
    { key: 'help', label: 'Pedir ajuda' },
    { key: 'softwareNivel01', label: 'Robô nivel 01' },
    { key: 'softwareNivel02', label: 'Robô nivel 02' },
    { key: 'softwareNivel03', label: 'Robô nivel 03' },
    { key: 'etfNivel01', label: 'ETF nivel 01' },
    { key: 'etfNivel02', label: 'ETF nivel 02' },
    { key: 'etfNivel03', label: 'ETF nivel 03' }
  ];

  // quais permissões mostrar para BROKER
  brokerPermissions = [
    { key: 'permissaoEditCliente', label: 'Editar todos os dados' },
    { key: 'permissaoAlterarSaldoCliente', label: 'Alterar saldo' },
    { key: 'permissaoAlterarCreditoCliente', label: 'Alterar crédito' },
    { key: 'permissaoAlterarEmprestimoCliente', label: 'Alterar empréstimo' },
    { key: 'permissaoUploadDocumento', label: 'Fazer upload' },
    { key: 'permissaoValidarDocumento', label: 'Validar documentos' },
    { key: 'permissaoExcluirDocumento', label: 'Deletar documentos' },
    { key: 'permissaoDeleteBot', label: 'Deletar robô' },
    { key: 'permissaoCriarContrato', label: 'novo contrato' },
    { key: 'permissaoDeletarContrato', label: 'Deletar contrato' },
    { key: 'permissaoAssinarContrato', label: 'Assinar contrato' },
    { key: 'permissaoCriarRelease', label: 'Criar release' },
    { key: 'permissaoRecusarRelease', label: 'Recusar release' },
    { key: 'permissaoDeleteRelease', label: 'Deletar release' },
  ];

  clientePerms = this.brokerPermissions.slice(0, 4);
  docPerms = this.brokerPermissions.slice(4, 7);
  botPerms = this.brokerPermissions.slice(7, 8);
  contractPerms = this.brokerPermissions.slice(8, 11);
  releasePerms = this.brokerPermissions.slice(11, 14);


  // campos de imagem para Cliente
  imgFields = ['imgRG', 'imgCPF', 'imgResidencia', 'imgPerfil', 'imgSelfie', 'imgAssing'];
  viewImgFields = ['viewImgRG', 'viewImgCPF', 'viewImgResidencia', 'viewImgPerfil', 'viewImgSelfie', 'viewImgAssing'];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    public uploadService: UploadService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['userId'] && this.userId) {
      this.loadUser();
      this.carregarBancos();
    }
    if (changes['enterprise'] || changes['userRole']) {
      Promise.resolve().then(() => this.applyFinancialLocks());
    }
  }

  private buildForm() {
    this.userForm = this.fb.group({
      // --- Campos básicos de Usuario ---
      id: [{ value: null, disabled: true }],
      nome: [{ value: '', disabled: true }, Validators.required],
      emission: [{ value: '', disabled: true }],
      role: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      senha: [{ value: '', disabled: true }],
      token: [{ value: '', disabled: true }],
      ip: [{ value: '', disabled: true }],
      tokenIdentificacao: [{ value: '', disabled: true }],
      obs: [{ value: '', disabled: true }],
      tokenIndicacao: [{ value: '', disabled: true }],
      ultimoLogin: [{ value: '', disabled: true }],

      // --- Campos Cliente ---
      saldo: [{ value: null, disabled: true }],
      credito: [{ value: null, disabled: true }],
      emprestimo: [{ value: null, disabled: true }],
      sac: [{ value: false, disabled: true }],

      softwareNivel01: [{ value: false, disabled: true }],
      softwareNivel02: [{ value: false, disabled: true }],
      softwareNivel03: [{ value: false, disabled: true }],

      etfNivel01: [{ value: false, disabled: true }],
      etfNivel02: [{ value: false, disabled: true }],
      etfNivel03: [{ value: false, disabled: true }],

      bt: [{ value: false, disabled: true }],
      help: [{ value: false, disabled: true }],
      estadoCivil: [{ value: '', disabled: true }],
      cpf: [{ value: '', disabled: true }],
      rg: [{ value: '', disabled: true }],
      dataNascimento: [{ value: '', disabled: true }],
      celular: [{ value: '', disabled: true }],
      telefoneFixo: [{ value: '', disabled: true }],
      nacionalidade: [{ value: '', disabled: true }],
      naturalizado: [{ value: false, disabled: true }],
      escolaridade: [{ value: '', disabled: true }],
      cep: [{ value: '', disabled: true }],
      endereco: [{ value: '', disabled: true }],
      numero: [{ value: '', disabled: true }],
      bairro: [{ value: '', disabled: true }],
      estado: [{ value: '', disabled: true }],
      cidade: [{ value: '', disabled: true }],
      rendaMensal: [{ value: '', disabled: true }],
      ativosInvestidos: [{ value: '', disabled: true }],
      outrasAplicacoes: [{ value: '', disabled: true }],
      banco: [{ value: '', disabled: true }],
      agencia: [{ value: '', disabled: true }],
      conta: [{ value: '', disabled: true }],
      tipoChavePix: [{ value: '', disabled: true }],
      chavePix: [{ value: '', disabled: true }],
      criptomoeda: [{ value: '', disabled: true }],
      carteiraCripto: [{ value: '', disabled: true }],
      identificacaoEmpresa: [{ value: '', disabled: true }],
      nomeEmpresa: [{ value: '', disabled: true }],
      ocupacaoProfissional: [{ value: '', disabled: true }],
      profissao: [{ value: '', disabled: true }],
      releases: [{ value: [], disabled: true }],
      // ===== Campos de upload =====
      imgRG: [{ value: '', disabled: true }],
      viewImgRG: [{ value: false, disabled: true }],
      imgCPF: [{ value: '', disabled: true }],
      viewImgCPF: [{ value: false, disabled: true }],
      imgResidencia: [{ value: '', disabled: true }],
      viewImgResidencia: [{ value: false, disabled: true }],
      imgPerfil: [{ value: '', disabled: true }],
      viewImgPerfil: [{ value: false, disabled: true }],
      imgSelfie: [{ value: '', disabled: true }],
      viewImgSelfie: [{ value: false, disabled: true }],
      imgAssing: [{ value: '', disabled: true }],
      viewImgAssing: [{ value: false, disabled: true }],

      // --- Campos Broker ---
      telefone: [{ value: '', disabled: true }],
      permissaoEditCliente: [{ value: false, disabled: true }],
      permissaoAlterarSaldoCliente: [{ value: false, disabled: true }],
      permissaoAlterarCreditoCliente: [{ value: false, disabled: true }],
      permissaoAlterarEmprestimoCliente: [{ value: false, disabled: true }],
      permissaoUploadDocumento: [{ value: false, disabled: true }],
      permissaoValidarDocumento: [{ value: false, disabled: true }],
      permissaoExcluirDocumento: [{ value: false, disabled: true }],
      permissaoDeleteBot: [{ value: false, disabled: true }],
      permissaoCriarContrato: [{ value: false, disabled: true }],
      permissaoDeletarContrato: [{ value: false, disabled: true }],
      permissaoAssinarContrato: [{ value: false, disabled: true }],
      permissaoCriarRelease: [{ value: false, disabled: true }],
      permissaoRecusarRelease: [{ value: false, disabled: true }],
      permissaoDeleteRelease: [{ value: false, disabled: true }],
      clientes: [{ value: [], disabled: true }]
    });

    // pega as referências
    const editAll = this.userForm.get('permissaoEditCliente')!;
    const saldo = this.userForm.get('permissaoAlterarSaldoCliente')!;
    const credito = this.userForm.get('permissaoAlterarCreditoCliente')!;
    const emprest = this.userForm.get('permissaoAlterarEmprestimoCliente')!;

    // 1) se ativar “Editar todos os dados”, marca os três
    editAll.valueChanges.subscribe(on => {
      if (on) {
        saldo.setValue(true, { emitEvent: false });
        credito.setValue(true, { emitEvent: false });
        emprest.setValue(true, { emitEvent: false });
      }
    });

    // 2) se qualquer um dos três for desligado, desmarca “Editar todos os dados”
    [saldo, credito, emprest].forEach(ctrl => {
      ctrl.valueChanges.subscribe(val => {
        if (!val && editAll.value) {
          editAll.setValue(false, { emitEvent: false });
        }
      });
    });
  }

  public loadUser() {
    this.userService.getUsuarioById(this.userId).subscribe((u: any) => {
      this.role = u.role;
      console.log(this.role)
      const patch: any = {};
      Object.keys(this.userForm.controls).forEach(key => {
        if (u[key] !== undefined) patch[key] = u[key];
      });

      // Converter Instant -> 'YYYY-MM-DD' para o input date
      if (u.dataNascimento) {
        const ymd = this.instantToDateInput(u.dataNascimento);
        patch.dataNascimento = ymd;
        this.displayBirthdate = this.formatYMDToBR(ymd);
      } else {
        this.displayBirthdate = '';
      }

      this.userForm.patchValue(patch);

      this.setEnabled(false);
    });
  }



  toggleEdit() {
    this.editMode = !this.editMode;
    this.setEnabled(this.editMode);
    this.applyFinancialLocks();
  }

  private setEnabled(enabled: boolean) {
    if (enabled) {
      this.userForm.enable();
      this.userForm.get('id')!.disable();
      this.userForm.get('role')!.disable();
    } else {
      this.userForm.disable();
    }
  }

  save() {
    if (!this.userForm.valid) return;

    const payload = this.buildUserPayload();
    this.guardFinancialByPermissions(payload); // ✅ garante coerência com permissão

    this.isSaving = true;
    this.message = null;

    this.userService.updateUsuario(payload).subscribe({
      next: (updated: any) => {
        // ✅ opcional: reflita o que veio do backend
        if (updated) this.userForm.patchValue(updated);
        this.isSaving = false;
        this.messageType = 'success';
        this.message = 'Usuário atualizado com sucesso!';
        this.toggleEdit();
        setTimeout(() => this.message = null, 5000);
      },
      error: () => {
        this.isSaving = false;
        this.messageType = 'danger';
        this.message = 'Erro ao atualizar usuário. Tente novamente.';
        setTimeout(() => this.message = null, 5000);
      }
    });
  }



  private carregarBancos() {
    this.http.get<any>('assets/pag.json').subscribe(data => {
      this.bancos = data.bancos;

      // Se o formulário já tiver um valor para 'banco', mantenha-o selecionado
      const bancoAtual = this.userForm.get('banco')?.value;
      if (bancoAtual && !this.bancos.includes(bancoAtual)) {
        this.bancos.unshift(bancoAtual); // Adiciona o banco atual caso não esteja na lista
      }
    });
  }


  // UPLOAD

  /** chamada pelo (change) do <input type="file"> */
  onFileSelected(event: Event, field: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.selectedFiles[field] = file;

    // ---- preparar preview local e abrir modal de confirmação
    // revoga URL anterior (se houver)
    if (this.confirmObjectUrl) {
      URL.revokeObjectURL(this.confirmObjectUrl);
      this.confirmObjectUrl = undefined;
    }

    this.pendingField = field;
    this.confirmTitle = `Confirmar ${field} — ${file.name}`;
    this.confirmLoading = true;

    // cria um Object URL e "habilita" no Angular
    this.confirmObjectUrl = URL.createObjectURL(file);
    this.confirmUrl = this.sanitizer.bypassSecurityTrustUrl(this.confirmObjectUrl);

    const el = document.getElementById('imageSelectModal');
    if (el) {
      const BS: any = (window as any).bootstrap || (bootstrap as any);
      BS?.Modal?.getOrCreateInstance(el)?.show();
    }
  }

  confirmUploadFromModal() {
    if (!this.pendingField) return;

    // dispara seu fluxo normal de upload
    this.uploadDocument(this.pendingField);

    // fecha o modal imediatamente (o toast/mensagem aparece como já faz)
    this.closeConfirmModal();
  }

  onConfirmLoaded() {
    this.confirmLoading = false;
  }

  onConfirmError() {
    this.confirmLoading = false;
    this.messageType = 'danger';
    this.message = 'Não foi possível carregar a pré-visualização do arquivo.';
    setTimeout(() => (this.message = null), 5000);
  }

  closeConfirmModal() {
    const el = document.getElementById('imageSelectModal');
    if (el) {
      const BS: any = (window as any).bootstrap || (bootstrap as any);
      BS?.Modal?.getInstance(el)?.hide();
    }
    // limpa estado e libera o blob
    if (this.confirmObjectUrl) {
      URL.revokeObjectURL(this.confirmObjectUrl);
      this.confirmObjectUrl = undefined;
    }
    this.confirmUrl = undefined;
    this.confirmTitle = '';
    this.confirmLoading = true;
    this.pendingField = null;
  }



  /** dispara o upload do arquivo já selecionado */
  /** Dispara o upload do arquivo selecionado e atualiza APENAS o campo da imagem no usuário (payload completo) */
  uploadDocument(field: string): void {
    const file = this.selectedFiles[field];
    if (!file) return;

    const email = this.userForm.get('email')!.value;
    if (!email) {
      this.messageType = 'danger';
      this.message = 'Não há e-mail no formulário para nomear o arquivo. Recarregue o usuário antes do upload.';
      setTimeout(() => (this.message = null), 5000);
      return;
    }

    this.isUploading[field] = true;
    this.message = null;

    try {
      this.uploadService.uploadFile(file, email, field).subscribe({
        next: ({ fileName, url }) => {
          // Use SEMPRE o fileName vindo do backend (garante hífen/padrão correto)
          this.userForm.get(field)!.setValue(fileName);

          // Monta snapshot completo do usuário e altera somente o campo da imagem
          const payload = this.buildUserPayload();
          payload[field] = fileName;

          this.userService.updateUsuario(payload).subscribe({
            next: () => {
              this.isUploading[field] = false;
              this.messageType = 'success';
              this.message = `Upload e atualização de ${field} concluídos!`;
              // Libera o arquivo da memória local
              delete this.selectedFiles[field];
              setTimeout(() => (this.message = null), 5000);
            },
            error: (err) => {
              console.error('[updateUsuario] erro:', err);
              this.isUploading[field] = false;
              this.messageType = 'danger';
              this.message = `Upload OK, mas falha ao salvar ${field} no usuário.`;
              setTimeout(() => (this.message = null), 5000);
            }
          });
        },
        error: (err) => {
          console.error('[uploadDocument] falha no upload:', err);
          this.isUploading[field] = false;
          this.messageType = 'danger';
          this.message = `Falha ao upload de ${field}.`;
          setTimeout(() => (this.message = null), 5000);
        }
      });
    } catch (err) {
      // Captura erros síncronos (ex.: limite de tamanho no service)
      console.error('[uploadDocument] erro síncrono:', err);
      this.isUploading[field] = false;
      this.messageType = 'danger';
      this.message = (err as Error)?.message || `Falha ao iniciar upload de ${field}.`;
      setTimeout(() => (this.message = null), 5000);
    }
  }


  /** Monta um snapshot completo e “limpo” do usuário para enviar ao backend */
  private buildUserPayload(): any {
    const raw = this.userForm.getRawValue();

    // remove campos de view
    this.viewImgFields.forEach(v => delete raw[v]);
    if (!raw.senha) delete raw.senha;
    if (!raw.token) delete raw.token;
    if (Array.isArray(raw.releases)) delete raw.releases;
    if (Array.isArray(raw.clientes)) delete raw.clientes;

    // data
    if (raw.dataNascimento && /^\d{4}-\d{2}-\d{2}$/.test(String(raw.dataNascimento))) {
      raw.dataNascimento = `${raw.dataNascimento}T00:00:00Z`;
    }

    // ✅ força número (ou null) para evitar string
    ['saldo', 'credito', 'emprestimo'].forEach(f => {
      const v = raw[f];
      raw[f] = (v === '' || v === null || v === undefined) ? null : Number(v);
    });

    return raw;
  }





  public capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }


  /** exclui do S3 e atualiza o usuário */
  deleteDocument(field: string) {
    if (!confirm(`Deseja realmente apagar a imagem ${field}?`)) return;

    const fileName = this.userForm.get(field)!.value;
    if (!fileName) return;

    this.isUploading[field] = true;

    this.uploadService.deleteFile(fileName).subscribe({
      next: () => {
        // Atualiza o form local
        this.userForm.get(field)!.setValue('');
        this.userForm.get('view' + this.capitalize(field))!.setValue(false, { emitEvent: false });

        // Enviar usuário completo
        const payload = this.buildUserPayload();
        payload[field] = '';

        this.userService.updateUsuario(payload).subscribe({
          next: () => {
            this.isUploading[field] = false;
            this.messageType = 'success';
            this.message = `Imagem ${field} apagada com sucesso.`;
            setTimeout(() => this.message = null, 5000);
          },
          error: err => {
            console.error(err);
            this.isUploading[field] = false;
            this.messageType = 'danger';
            this.message = `Erro ao atualizar usuário após exclusão de ${field}.`;
            setTimeout(() => this.message = null, 5000);
          }
        });
      },
      error: err => {
        console.error(err);
        this.isUploading[field] = false;
        this.messageType = 'danger';
        this.message = `Falha ao deletar ${field} no S3.`;
        setTimeout(() => this.message = null, 5000);
      }
    });
  }


  openImageModal(field: string) {
    const fileName: string = this.userForm.get(field)!.value;
    if (!fileName) return;

    this.previewTitle = fileName;
    const url = this.uploadService.url() + encodeURIComponent(fileName);
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(url);

    this.previewLoading = true; // <<< começa com spinner

    const el = document.getElementById('imagePreviewModal');
    if (el) {
      const modal = (window as any).bootstrap?.Modal?.getOrCreateInstance(el)
        || (bootstrap as any).Modal.getOrCreateInstance(el);
      modal.show();
    }
  }

  onPreviewLoaded() {
    this.previewLoading = false;
  }

  onPreviewError() {
    this.previewLoading = false;
    this.messageType = 'danger';
    this.message = 'Não foi possível carregar a imagem.';
    setTimeout(() => (this.message = null), 5000);
  }



  closeImageModal() {
    const el = document.getElementById('imagePreviewModal');
    if (el) {
      const modal = bootstrap.Modal.getInstance(el);
      modal?.hide();
    }
  }

  /** Instant/ISO/epoch -> 'YYYY-MM-DD' para o <input type="date"> */
  private instantToDateInput(instant: any): string | null {
    if (!instant) return null;
    const d = new Date(instant);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  /** 'YYYY-MM-DD' -> 'dd/MM/yyyy' para exibição */
  private formatYMDToBR(ymd: string | null): string {
    if (!ymd) return '';
    const [y, m, d] = ymd.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  }

  private docKeyFromField(field: string): string {
    return field.replace(/^img/i, '').toLowerCase(); // imgRG -> rg
  }

  approveDocument(field: string) {
    const id = this.userForm.get('id')!.value;
    const doc = this.docKeyFromField(field);

    this.http.patch<any>(`http://localhost:8080/api/usuarios/${id}/documentos/${doc}/aprovar`, {})
      .subscribe({
        next: () => {
          // só marca como aprovado após o backend confirmar
          this.userForm.get('view' + this.capitalize(field))!
            .setValue(true, { emitEvent: false });
          this.messageType = 'success';
          this.message = `${field} aprovado.`;
          setTimeout(() => this.message = null, 4000);
        },
        error: (err) => {
          console.error(err);
          this.messageType = 'danger';
          this.message = `Falha ao aprovar ${field}.`;
          setTimeout(() => this.message = null, 5000);
        }
      });
  }

  get canEditClient(): boolean {
    if (!this.userRole || !this.enterprise) return false;

    if (this.userRole === 'ROOT') return true;
    if (this.userRole === 'ADMINISTRADOR') return true;
    if (this.userRole === 'SUPORTE' && this.enterprise.suporteEditarCliente) return true;
    if (this.userRole === 'FINANCEIRO' && this.enterprise.financeiroEditarCliente) return true;
    if (this.userRole === 'MANAGER' && this.enterprise.managerEditarCliente) return true;
    if (this.userRole === 'GERENTE' && this.enterprise.gerenteEditarCliente) return true;
    if (this.userRole === 'BROKER' && this.enterprise.brokerEditarCliente) return true;

    console.log(this.userRole)
    console.log(this.enterprise.brokerEditarCliente)

    return false;
  }


  private canEditSaldo(): boolean {
    if (!this.enterprise || !this.userRole) return false;
    if (this.userRole === 'ROOT' || this.userRole === 'ADMINISTRADOR') return true;
    if (this.userRole === 'SUPORTE') return !!this.enterprise.suporteEditarSaldoCliente;
    if (this.userRole === 'FINANCEIRO') return !!this.enterprise.financeiroEditarSaldoCliente;
    if (this.userRole === 'MANAGER') return !!this.enterprise.managerEditarSaldoCliente;
    if (this.userRole === 'GERENTE') return !!this.enterprise.gerenteEditarSaldoCliente;
    if (this.userRole === 'BROKER') return !!this.enterprise.brokerEditarSaldoCliente;
    return false;
  }
  private canEditCredito(): boolean {
    if (!this.enterprise || !this.userRole) return false;
    if (this.userRole === 'ROOT' || this.userRole === 'ADMINISTRADOR') return true;
    if (this.userRole === 'SUPORTE') return !!this.enterprise.suporteEditarCreditoCliente;
    if (this.userRole === 'FINANCEIRO') return !!this.enterprise.financeiroEditarCreditoCliente;
    if (this.userRole === 'MANAGER') return !!this.enterprise.managerEditarCreditoCliente;
    if (this.userRole === 'GERENTE') return !!this.enterprise.gerenteEditarCreditoCliente;
    if (this.userRole === 'BROKER') return !!this.enterprise.brokerEditarCreditoCliente;
    return false;
  }
  private canEditEmprestimo(): boolean {
    if (!this.enterprise || !this.userRole) return false;
    if (this.userRole === 'ROOT' || this.userRole === 'ADMINISTRADOR') return true;
    if (this.userRole === 'SUPORTE') return !!this.enterprise.suporteEditarEmprestimoCliente;
    if (this.userRole === 'FINANCEIRO') return !!this.enterprise.financeiroEditarEmprestimoCliente;
    if (this.userRole === 'MANAGER') return !!this.enterprise.managerEditarEmprestimoCliente;
    if (this.userRole === 'GERENTE') return !!this.enterprise.gerenteEditarEmprestimoCliente;
    if (this.userRole === 'BROKER') return !!this.enterprise.brokerEditarEmprestimoCliente;
    return false;
  }

  private applyFinancialLocks() {
    const saldoCtrl = this.userForm.get('saldo')!;
    const creditoCtrl = this.userForm.get('credito')!;
    const emprestimoCtrl = this.userForm.get('emprestimo')!;

    if (!this.editMode) {
      // fora de edição: tudo desabilitado
      saldoCtrl.disable({ emitEvent: false });
      creditoCtrl.disable({ emitEvent: false });
      emprestimoCtrl.disable({ emitEvent: false });
      return;
    }

    // em edição: (re)aplica por permissão
    this.canEditSaldo() ? saldoCtrl.enable({ emitEvent: false }) : saldoCtrl.disable({ emitEvent: false });
    this.canEditCredito() ? creditoCtrl.enable({ emitEvent: false }) : creditoCtrl.disable({ emitEvent: false });
    this.canEditEmprestimo() ? emprestimoCtrl.enable({ emitEvent: false }) : emprestimoCtrl.disable({ emitEvent: false });
  }

  private guardFinancialByPermissions(payload: any) {
    const orig = this.userForm.getRawValue(); // estado atual do form (inclui disabled)

    if (!this.canEditSaldo()) payload.saldo = orig.saldo;
    if (!this.canEditCredito()) payload.credito = orig.credito;
    if (!this.canEditEmprestimo()) payload.emprestimo = orig.emprestimo;
  }

}
