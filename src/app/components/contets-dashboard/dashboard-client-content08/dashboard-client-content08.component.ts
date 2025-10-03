import { Component, OnInit, OnDestroy, Input, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';
import { UploadService } from 'src/app/services/upload.service';
import { HttpClient } from '@angular/common/http';
import { throwError, Observable } from 'rxjs'
import * as bootstrap from 'bootstrap';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';


/** Chaves dos campos de KYC */
type KycKey =
  | 'imgPerfil'
  | 'imgCPF'
  | 'imgRG'
  | 'imgResidencia'
  | 'imgAssing'
  | 'imgSelfie';

interface KycPreviews {
  imgPerfil: string | null;
  imgCPF: string | null;
  imgRG: string | null;
  imgResidencia: string | null;
  imgAssing: string | null;
  imgSelfie: string | null;
}

@Component({
  selector: 'app-dashboard-client-content08',
  templateUrl: './dashboard-client-content08.component.html',
  styleUrls: ['./dashboard-client-content08.component.css']
})
export class DashboardClientContent08Component implements OnInit, OnDestroy, AfterViewInit {

  form!: FormGroup;
  @Input() user!: User;
  activeTab: 'perfil' | 'endereco' | 'financeiro' | 'conta' | 'profissao' | 'kyc' = 'perfil';

  saving = false;
  saveOk = false;
  saveErr = false;

  // Preview modal de leitura
  previewTitle = '';
  previewUrl: string | null = null;
  private _previewModal?: bootstrap.Modal;

  // Modal de confirmação de upload
  confirmTitle = '';
  confirmPreviewUrl: SafeUrl | null = null;
  isUploading = false;
  pendingField: KycKey | null = null;
  pendingFile: File | null = null;
  private _confirmModal?: bootstrap.Modal;
  private confirmObjectUrl?: string;


  // selects
  escolaridades = [
    'Ensino Fundamental', 'Ensino Médio', 'Técnico', 'Superior',
    'Pós-graduação', 'Mestrado', 'Doutorado'
  ];
  estadosCivis = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];
  tiposPix = ['CPF', 'CNPJ', 'Celular', 'Email', 'Chave Aleatória'];

  /** Campos de documento controlados pelo servidor */
  readonly docKeys: KycKey[] = [
    'imgPerfil', 'imgCPF', 'imgRG', 'imgResidencia', 'imgAssing', 'imgSelfie'
  ];

  /** Labels amigáveis dos documentos */
  docLabelMap: Record<KycKey, string> = {
    imgPerfil: 'Foto de Perfil',
    imgCPF: 'CPF',
    imgRG: 'RG',
    imgResidencia: 'Comprovante de Residência',
    imgAssing: 'Assinatura',
    imgSelfie: 'Selfie'
  };

  /** Previews (URL absoluta) */
  previews: KycPreviews = {
    imgPerfil: null, imgCPF: null, imgRG: null,
    imgResidencia: null, imgAssing: null, imgSelfie: null
  };

  /** Efeito visual de drag */
  dragOver: KycKey | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private uploadService: UploadService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.loadUser();
  }

  ngOnDestroy(): void {
    const maybeRevoke = (url: string | null) => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    };
    (Object.keys(this.previews) as KycKey[]).forEach(k => maybeRevoke(this.previews[k]));
    if (this.confirmObjectUrl) {
      URL.revokeObjectURL(this.confirmObjectUrl);
      this.confirmObjectUrl = undefined;
    }
    maybeRevoke(this.previewUrl);
  }

  ngAfterViewInit(): void {
    // Fallback de limpeza caso algum backdrop fique preso
    const el = document.getElementById('assinaturaModal');
    if (el) {
      el.addEventListener('hidden.bs.modal', () => {
        document.body.classList.remove('modal-open');
        (document.body.style as any).removeProperty?.('padding-right');
        document.querySelectorAll('.modal-backdrop')?.forEach(b => b.remove());
      });
    }
  }

  buildForm() {
    this.form = this.fb.group({
      // Perfil
      nome: [''],
      dataNascimento: [''],
      email: [''],
      celular: [''],
      cpf: [''],
      rg: [''],
      escolaridade: [''],
      estadoCivil: [''],
      telefoneFixo: [''],
      nacionalidade: [''],
      naturalizado: [''],

      // Endereço
      cep: [''],
      endereco: [''],
      numero: [''],
      bairro: [''],
      cidade: [''],
      estado: [''],

      // Financeiro
      rendaMensal: [''],
      ativosInvestidos: [''],
      outrasAplicacoes: [''],

      // Conta / Pix / Crypto
      banco: [''],
      agencia: [''],
      conta: [''],
      tipoChavePix: [''],
      chavePix: [''],
      criptomoeda: [''],
      carteiraCripto: [''],

      // Profissão
      ocupacaoProfissional: [''],
      profissao: [''],
      identificacaoEmpresa: [''],
      nomeEmpresa: [''],

      // KYC (somente leitura no form; upload via modal)
      imgPerfil: [{ value: '', disabled: true }],
      imgCPF: [{ value: '', disabled: true }],
      imgRG: [{ value: '', disabled: true }],
      imgResidencia: [{ value: '', disabled: true }],
      imgAssing: [{ value: '', disabled: true }],
      imgSelfie: [{ value: '', disabled: true }]
    });
  }

  selectTab(tab: typeof this.activeTab) {
    this.activeTab = tab;
  }

  loadUser() {
    const tk = localStorage.getItem('authToken');
    if (!tk) return;

    this.userService.getByTokenLogin(tk).subscribe({
      next: (u: User) => {
        this.user = u;
        this.form.patchValue({ ...u, email: u.email ?? '' });
        this.initDocPreviewsFromUser();
      },
      error: () => { /* silencioso */ }
    });
  }

  onSubmit() {
    if (!this.user) return;

    this.saveOk = false;
    this.saveErr = false;
    this.saving = true;

    // Apenas campos habilitados (exclui KYC automaticamente)
    const enabledValues = this.form.value;

    const payload: User = {
      ...this.user,
      ...enabledValues
    };

    this.userService.updateUsuario(payload).subscribe({
      next: (updated) => {
        this.user = updated;
        this.saving = false;
        this.saveOk = true;
        setTimeout(() => (this.saveOk = false), 4000);
      },
      error: () => {
        this.saving = false;
        this.saveErr = true;
        setTimeout(() => (this.saveErr = false), 5000);
      }
    });
  }

  /* ===================== Helpers ===================== */
  labelFor(field: KycKey): string {
    return this.docLabelMap[field] ?? field;
  }

  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  private isImagePath(p?: string | null): boolean {
    if (!p) return false;
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(p);
  }

  private baseUrl(): string {
    // Ex.: https://api.suaapp.com/  (UploadService já tem .url())
    let u = this.uploadService.url() || '';
    if (u && !u.endsWith('/')) u += '/';
    return u;
  }

  /** Base usada só para VER arquivos (GET) */
  private fileCdnUrl(): string {
    let u = this.uploadService.url() || '';
    if (u && !u.endsWith('/')) u += '/';
    return u;
  }

  /** Constrói URL absoluta para mostrar imagem já salva */
  private absoluteUrl(fileNameOrPath: string): string {
    if (!fileNameOrPath) return '';
    if (/^https?:\/\//i.test(fileNameOrPath)) return fileNameOrPath;
    // encode para nomes com espaços/acentos
    return this.fileCdnUrl() + encodeURIComponent(fileNameOrPath.replace(/^\/+/, ''));
  }


  private initDocPreviewsFromUser() {
    this.docKeys.forEach((k) => {
      const p = (this.user as any)?.[k] as string | undefined;
      this.previews[k] = p && this.isImagePath(p) ? this.absoluteUrl(p) : null;
    });
  }

  /* ===================== Visualização (leitura) ===================== */
  openPreview(field: KycKey) {
    const url = this.previews[field] || this.absoluteUrl((this.user as any)?.[field] || '');
    if (!url) return;

    this.previewTitle = this.labelFor(field);
    this.previewUrl = url;

    const el = document.getElementById('kycPreviewModal');
    if (el) {
      this._previewModal = bootstrap.Modal.getOrCreateInstance(el);
      this._previewModal.show();
    }
  }

  /* ===================== Upload com confirmação ===================== */
  onFileSelect(evt: Event, ctrl: KycKey) {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.pendingField = ctrl;
    this.pendingFile = file;

    // Gera prévia local apenas se imagem
    if (this.isImageFile(file)) {
      // revoga blob anterior, se houver
      if (this.confirmObjectUrl) {
        URL.revokeObjectURL(this.confirmObjectUrl);
        this.confirmObjectUrl = undefined;
      }
      this.confirmObjectUrl = URL.createObjectURL(file);
      this.confirmPreviewUrl = this.sanitizer.bypassSecurityTrustUrl(this.confirmObjectUrl);
    } else {
      // sem preview (ex.: PDF)
      this.confirmPreviewUrl = null;
    }

    this.confirmTitle = this.labelFor(ctrl);

    const el = document.getElementById('kycConfirmModal');
    if (el) {
      // funciona com import ESM ou UMD (window.bootstrap)
      const BS: any = (window as any).bootstrap || (bootstrap as any);
      const modal: bootstrap.Modal | undefined = BS?.Modal?.getOrCreateInstance?.(el);

      if (modal) {
        this._confirmModal = modal;  // guarda referência para fechar depois
        modal.show();
      }
    }

  }


  confirmUpload() {
    if (!this.pendingField || !this.pendingFile || !this.user) return;
    this.isUploading = true;

    this.uploadDocument(this.pendingField, this.pendingFile, this.user.id!)
      .subscribe({
        next: (res: any) => {
          // padroniza o retorno
          const fileName = res?.fileName
            ?? res?.path
            ?? res?.filePath
            ?? (typeof res === 'string' ? res : '');

          if (!fileName) {
            this.isUploading = false;
            alert('Upload concluído, mas o servidor não retornou o nome do arquivo.');
            return;
          }

          // Atualiza o usuário no backend
          const payload: any = { ...(this.user as any), [this.pendingField!]: fileName };
          this.userService.updateUsuario(payload).subscribe({
            next: (updated) => {
              // espelha localmente
              this.user = updated || payload;
              this.form.patchValue({ [this.pendingField!]: fileName });

              // atualiza preview definitivo (somente imagem)
              const isImg = this.pendingFile!.type.startsWith('image/');
              this.previews[this.pendingField!] = isImg ? this.absoluteUrl(fileName) : null;

              // limpa estado/fecha
              this.cleanPending();
              this.isUploading = false;
              this._confirmModal?.hide();
            },
            error: () => {
              this.isUploading = false;
              alert('Upload OK, mas falhou ao salvar o nome do arquivo no usuário.');
            }
          });
        },
        error: (err) => {
          console.error(err);
          this.isUploading = false;
          alert('Falha ao enviar o arquivo. Tente novamente.');
        }
      });
  }


  private cleanPending() {
    if (this.confirmObjectUrl) {
      URL.revokeObjectURL(this.confirmObjectUrl);
      this.confirmObjectUrl = undefined;
    }
    this.confirmPreviewUrl = null;
    this.pendingFile = null;
    this.pendingField = null;
  }

  /**
   * Faz o upload usando UploadService. Tentei cobrir os nomes de método mais comuns.
   * Se o seu UploadService já tem um método específico, ele será usado.
   * Caso contrário, cai no fallback via HttpClient.
   */
  private uploadDocument(field: KycKey, file: File, userId: number): Observable<any> {
    const svc: any = this.uploadService as any;

    // ✅ use o método já existente no seu projeto
    if (typeof svc.uploadFile === 'function') {
      const email = this.user?.email;
      if (!email) return throwError(() => new Error('Usuário sem e-mail para nomear o arquivo.'));
      return svc.uploadFile(file, email, field); // { fileName, url }
    }

    // (Opcional) OUTROS nomes que você possa ter no service:
    if (typeof svc.uploadDocumento === 'function') return svc.uploadDocumento(field, file, userId);
    if (typeof svc.uploadDocument === 'function') return svc.uploadDocument(field, file, userId);
    if (typeof svc.upload === 'function') return svc.upload(field, file, userId);

    // Se nada disso existir, melhor falhar explicitamente do que postar na URL errada
    return throwError(() => new Error('UploadService não possui método de upload compatível.'));
  }

  /** Extrai caminho/URL do documento a partir da resposta do backend */
  private extractPathFromUploadResponse(res: any): string {
    if (!res) return '';
    // tente as chaves mais comuns; se vier string, devolve direto
    return (
      res.path ||
      res.filePath ||
      res.url ||
      res.location ||
      res.key ||
      (typeof res === 'string' ? res : '')
    );
  }

  /* ===================== Drag (efeito visual) ===================== */
  isPdf(ctrl: KycKey): boolean {
    const path = (this.user as any)?.[ctrl] as string | undefined;
    return !!path && /\.pdf$/i.test(path);
  }

  private capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** Exclui do S3 e seta o campo do usuário para null */
  clearFile(ctrl: KycKey) {
    if (!this.user) return;

    const fileName = (this.user as any)?.[ctrl] as string | null | undefined;
    if (!fileName) return;

    const label = this.labelFor(ctrl);
    if (!confirm(`Deseja realmente remover ${label}?`)) return;

    this.isUploading = true;

    // 1) apaga do S3
    this.uploadService.deleteFile(fileName).subscribe({
      next: () => {
        // 2) atualiza o usuário no backend: campo -> null (+ opcional: zera flag de view se existir)
        const viewKey = ('view' + this.capitalize(ctrl)) as keyof User; // ex.: viewImgAssing
        const payload: any = { ...(this.user as any), [ctrl]: null };

        if (this.user && viewKey in this.user) {
          (payload as any)[viewKey] = false;
        }

        this.userService.updateUsuario(payload).subscribe({
          next: (updated) => {
            // 3) reflete no estado local
            this.user = updated || payload;
            this.form.patchValue({ [ctrl]: null });
            this.previews[ctrl] = null;

            // se era uma URL blob de preview, libera
            const currentPreview = this.previews[ctrl];
            if (currentPreview && typeof currentPreview === 'string' && currentPreview.startsWith('blob:')) {
              URL.revokeObjectURL(currentPreview);
            }

            this.isUploading = false;
            // feedback simples (troque por toast se preferir)
            alert(`${label} removida com sucesso.`);
          },
          error: (err) => {
            console.error('[updateUsuario] erro ao zerar campo:', err);
            this.isUploading = false;
            alert(`Arquivo apagado do S3, mas houve erro ao atualizar o usuário (${label}).`);
          }
        });
      },
      error: (err) => {
        console.error('[deleteFile] falha ao remover do S3:', err);
        this.isUploading = false;
        alert(`Falha ao deletar ${label} no S3.`);
      }
    });
  }




  onDragOver(ev: DragEvent, ctrl: KycKey) {
    ev.preventDefault();
    this.dragOver = ctrl;
  }

  onDragLeave(_ev: DragEvent, _ctrl: KycKey) {
    this.dragOver = null;
  }

  onDrop(ev: DragEvent, _ctrl: KycKey) {
    ev.preventDefault();
    this.dragOver = null;
    // Upload por drop pode ser implementado igual ao onFileSelect se desejar
  }

  // No TS do pai
  onSignatureSaved(e: { fileName: string; url: string }) {
    if (!e) return;

    // 1) reflete no modelo local
    (this.user as any).imgAssing = e.fileName as any;
    (this.user as any).viewImgAssing = true as any;

    // 2) atualiza o form reativo
    this.form.patchValue({ imgAssing: e.fileName });

    // 3) atualiza o preview do card
    this.previews.imgAssing = /^https?:\/\//i.test(e.url) ? e.url : this.absoluteUrl(e.fileName);

    // 4) feedback visual rápido (opcional)
    this.saveOk = true;
    setTimeout(() => (this.saveOk = false), 2000);

    // 5) garante que nenhum backdrop ficou preso (extra safety)
    setTimeout(() => {
      document.body.classList.remove('modal-open');
      (document.body.style as any).removeProperty?.('padding-right');
      document.querySelectorAll('.modal-backdrop')?.forEach(b => b.remove());
    }, 0);
  }
}