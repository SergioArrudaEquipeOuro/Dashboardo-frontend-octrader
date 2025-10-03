import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import * as bootstrap from 'bootstrap';
import { User } from 'src/app/models/user';
import { UploadService } from 'src/app/services/upload.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-assing',
  templateUrl: './assing.component.html',
  styleUrls: ['./assing.component.css']
})
export class AssingComponent implements OnInit, OnDestroy {
  @ViewChild('signatureCanvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  /** Usuário atual (obrigatório) */
  @Input() user!: User;
  /** ID do modal Bootstrap que contém este componente (opcional). Se informado, o modal é fechado após salvar. */
  @Input() modalId?: string;
  /** Emite quando a assinatura foi salva com sucesso (contém fileName e url absoluta para visualização) */
  @Output() saved = new EventEmitter<{ fileName: string; url: string }>();

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private listeners: Array<() => void> = [];
  saving = false;

  /** Pré-visualização da assinatura desenhada (data URL) */
  public signatureImage: string | null = null;
  /** URL segura da assinatura já existente no servidor */
  public signatureUrl: SafeUrl | null = null;

  alertMessage: string | null = null;
  alertType: 'success' | 'danger' | null = null;

  constructor(
    private uploadService: UploadService,
    private userService: UserService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit() {
    this.hydrateCurrentSignature();
    this.initCanvas();
  }

  ngOnDestroy(): void {
    // remove listeners
    this.listeners.forEach(off => off());
    this.listeners = [];
  }

  /** Mostra a assinatura atual do usuário, se houver (imgAssing) */
  private hydrateCurrentSignature() {
    const fileName = (this.user as any)?.imgAssing as string | undefined;
    if (!fileName) {
      this.signatureUrl = null;
      return;
    }
    const base = this.uploadService.url() || '';
    const sep = base.endsWith('/') ? '' : '/';
    const abs = `${base}${sep}${encodeURIComponent(fileName)}`;
    this.signatureUrl = this.sanitizer.bypassSecurityTrustUrl(abs);
  }

  /** Inicializa o canvas e listeners de mouse/touch */
  private initCanvas() {
    const canvasEl = this.canvas?.nativeElement;
    if (!canvasEl) return;

    const context = canvasEl.getContext('2d');
    if (!context) {
      console.error('Falha ao obter o contexto do canvas');
      return;
    }
    this.ctx = context;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;

    const on = (el: HTMLElement | Document, ev: string, fn: any, opts?: any) => {
      el.addEventListener(ev, fn, opts);
      this.listeners.push(() => el.removeEventListener(ev, fn, opts));
    };

    // mouse
    on(canvasEl, 'mousedown', (e: MouseEvent) => this.startDrawing(e));
    on(canvasEl, 'mousemove', (e: MouseEvent) => this.draw(e));
    on(canvasEl, 'mouseup', () => this.stopDrawing());
    on(canvasEl, 'mouseleave', () => this.stopDrawing());

    // touch
    on(canvasEl, 'touchstart', (e: TouchEvent) => this.startDrawingTouch(e), { passive: false });
    on(canvasEl, 'touchmove', (e: TouchEvent) => this.drawTouch(e), { passive: false });
    on(canvasEl, 'touchend', () => this.stopDrawing());
  }

  private getRelativePosition(event: MouseEvent | TouchEvent) {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    let clientX: number, clientY: number;

    if (event instanceof MouseEvent) {
      clientX = event.clientX; clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX; clientY = event.touches[0].clientY;
    }

    const scaleX = this.canvas.nativeElement.width / rect.width;
    const scaleY = this.canvas.nativeElement.height / rect.height;

    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  private startDrawing(event: MouseEvent) {
    this.drawing = true;
    const p = this.getRelativePosition(event);
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
  }

  private draw(event: MouseEvent) {
    if (!this.drawing) return;
    const p = this.getRelativePosition(event);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
  }

  private startDrawingTouch(event: TouchEvent) {
    this.drawing = true;
    const p = this.getRelativePosition(event);
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
    event.preventDefault();
  }

  private drawTouch(event: TouchEvent) {
    if (!this.drawing) return;
    const p = this.getRelativePosition(event);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    event.preventDefault();
  }

  private stopDrawing() {
    this.drawing = false;
    this.ctx.closePath();
    // atualiza a prévia
    this.signatureImage = this.canvas.nativeElement.toDataURL('image/png');
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    this.signatureImage = null;
  }

  /** Converte dataURL -> Blob */
  private dataURLToBlob(dataURL: string): Blob {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: mimeString });
  }

  /** Salva a assinatura: faz upload e atualiza o usuário (imgAssing + viewImgAssing) */
  saveSignature() {
    // garante dataURL
    this.signatureImage = this.signatureImage || this.canvas.nativeElement.toDataURL('image/png');
    if (!this.signatureImage) return;

    const blob = this.dataURLToBlob(this.signatureImage);
    const idForName = this.user?.email || this.user?.tokenIdentificacao || 'user';
    const fileName = `${idForName}-Assinatura.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    if (!this.user) {
      this.showAlert('Erro: usuário não encontrado.', 'danger');
      return;
    }

    this.saving = true;
    this.alertMessage = null;

    // usa o mesmo método do seu projeto
    this.uploadService.uploadFile(file, idForName, 'imgAssing').subscribe({
      next: (resp: any) => {
        const savedName =
          resp?.fileName || resp?.path || resp?.filePath || (typeof resp === 'string' ? resp : fileName);

        const payload: User = {
          ...this.user,
          email: this.user.email || '',
          imgAssing: savedName as any,
          viewImgAssing: true as any
        };

        this.userService.updateUsuario(payload).subscribe({
          next: (updated) => {
            this.user = updated || payload;

            // atualiza preview da assinatura atual
            const base = this.uploadService.url() || '';
            const sep = base.endsWith('/') ? '' : '/';
            const abs = `${base}${sep}${encodeURIComponent(savedName)}`;
            this.signatureUrl = this.sanitizer.bypassSecurityTrustUrl(abs);

            this.showAlert('Assinatura salva com sucesso!', 'success');
            this.saving = false;

            // notifica o pai
            this.saved.emit({ fileName: savedName, url: abs });
            this.closeModalById(this.modalId);

            // fecha o modal, se o id foi informado
            if (this.modalId) {
              const el = document.getElementById(this.modalId);
              if (el) bootstrap.Modal.getInstance(el)?.hide();
            }
          },
          error: () => {
            this.saving = false;
            this.showAlert('Upload OK, mas falhou ao salvar no usuário.', 'danger');
          }
        });
      },
      error: () => {
        this.saving = false;
        this.showAlert('Falha ao enviar a assinatura. Tente novamente.', 'danger');
      }
    });
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => { this.alertMessage = null; this.alertType = null; }, 7000);
  }


  private closeModalById(id?: string) {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;

    const BS: any = (window as any).bootstrap || (bootstrap as any);
    // pega a instância criada pela data-api; se não existir, cria só para conseguir chamar hide
    let instance = BS?.Modal?.getInstance?.(el) || BS?.Modal?.getOrCreateInstance?.(el);

    // ao esconder, a lib remove backdrop; ainda assim deixo um fallback de limpeza
    el.addEventListener('hidden.bs.modal', () => {
      try { instance?.dispose?.(); } catch { }
      // fallback de limpeza (caso tenha havido mismatch de instâncias)
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
    }, { once: true });

    instance?.hide?.();
  }

}
