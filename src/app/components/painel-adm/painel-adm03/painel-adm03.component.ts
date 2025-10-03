import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Etf, EtfCategory, EtfHistory, EtfStatus, EtfTransaction } from 'src/app/models/Etf';
import { CreateEtfRequest, EtfService } from 'src/app/services/etf.service';

@Component({
  selector: 'app-painel-adm03',
  templateUrl: './painel-adm03.component.html',
  styleUrls: ['./painel-adm03.component.css']
})
export class PainelAdm03Component implements OnInit {

  etfs: Etf[] = [];
  selected?: Etf | null = null;
  history: EtfHistory[] = [];
  loading = false;
  showCreateForm = false;

  // dropdown por linha
  actionsOpenId: number | null = null;

  // modal níveis
  levelsModalOpen = false;
  levelsEtf: Etf | null = null;
  levelsForm!: FormGroup;

  categories: EtfCategory[] = ['OIL', 'CRYPTO', 'AI', 'GLOBAL', 'TREASURIES', 'OTHER'];
  statuses: EtfStatus[] = ['ACTIVE', 'PAUSED', 'DELETED'];

  // Forms
  createForm!: FormGroup;
  overrideForm!: FormGroup;
  tradeForm!: FormGroup;

  // feedback
  msg: string | null = null;
  err: string | null = null;

  constructor(private fb: FormBuilder, private etfService: EtfService) { }

  ngOnInit(): void {
    this.initForms();
    this.refresh();
  }

  private initForms() {
    this.createForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(32)]],
      name: ['', [Validators.required, Validators.maxLength(120)]],
      category: ['OTHER', [Validators.required]],
      initialNav: [null, [Validators.required, Validators.min(0.000001)]],
      monthlyTargetPctPercent: [null, [Validators.required]],
      description: [''],
      img: [''],
      // novos
      cotaMinima: [null, [Validators.min(0)]],
      nivel01: [null, [Validators.min(0)]],
      nivel02: [null, [Validators.min(0)]],
      nivel03: [null, [Validators.min(0)]],
    });

    this.overrideForm = this.fb.group({
      date: ['', [Validators.required]],
      dailyPct: [null, [Validators.required]]
    });

    this.tradeForm = this.fb.group({
      usuarioId: [null, [Validators.required]],
      cotas: [null, [Validators.required]],
      side: ['BUY', [Validators.required]]
    });

    this.levelsForm = this.fb.group({
      cotaMinima: [null, [Validators.min(0)]],
      nivel01: [null, [Validators.min(0)]],
      nivel02: [null, [Validators.min(0)]],
      nivel03: [null, [Validators.min(0)]],
    });
  }

  /* ===== Listagem / seleção ===== */
  refresh() {
    this.loading = true;
    this.etfService.list().subscribe({
      next: (rows) => { this.etfs = rows; this.loading = false; },
      error: (e) => { this.onError(e); this.loading = false; }
    });
  }

  select(etf: Etf) {
    this.selected = etf;
    this.loadHistory(etf);
    this.clearFeedback();
  }

  loadHistory(etf: Etf, limit = 100) {
    if (!etf?.id) return;
    this.etfService.history(etf.id, limit).subscribe({
      next: (hist) => this.history = hist,
      error: (e) => this.onError(e)
    });
  }

  /* ===== Ações por linha (dropdown) ===== */
  toggleRowActions(etf: Etf, ev?: MouseEvent) {
    ev?.stopPropagation();
    this.actionsOpenId = (this.actionsOpenId === etf.id) ? null : (etf.id ?? null);
  }

  closeRowActions() {
    if (this.actionsOpenId != null) this.actionsOpenId = null;
  }

  @HostListener('document:keydown.escape')
  onEscCloseMenus() { this.closeRowActions(); }

  /* ===== Criar ===== */
  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
    this.clearFeedback();
    if (this.showCreateForm) {
      this.createForm.markAsPristine();
      this.createForm.markAsUntouched();
    }
  }

  submitCreate() {
    if (this.createForm.invalid) { this.err = 'Preencha o formulário corretamente.'; return; }
    const payload: CreateEtfRequest = this.createForm.value as CreateEtfRequest;
    this.etfService.createMinimal(payload).subscribe({
      next: (etf) => {
        this.msg = `ETF ${etf.name} criado.`;
        this.err = null;
        this.createForm.reset({ category: 'OTHER' });
        this.refresh();
      },
      error: (e) => this.onError(e)
    });
  }

  /* ===== Status ===== */
  changeStatus(etf: Etf, status: EtfStatus) {
    if (!etf.id) return;
    this.etfService.setStatus(etf.id, status).subscribe({
      next: () => {
        this.msg = `Status de ${etf.name} alterado para ${status}.`;
        this.err = null;
        this.refresh();
        if (this.selected && this.selected.id === etf.id) {
          this.selected = { ...this.selected, status };
        }
        this.closeRowActions();
      },
      error: (e) => this.onError(e)
    });
  }

  /* ===== Imagem ===== */
  editImage(etf: Etf) {
    const current = (etf as any).img || '';
    const url = prompt('Informe a URL da imagem (deixe vazio para remover):', current);
    if (url === null) return; // cancelado
    this.etfService.setImage(etf.id!, url.trim()).subscribe({
      next: () => {
        this.msg = 'Imagem atualizada.';
        this.err = null;
        (etf as any).img = url.trim() || null;
        this.closeRowActions();
      },
      error: (e) => this.onError(e)
    });
  }

  /* ===== Override ===== */
  submitOverride() {
    if (!this.selected?.id) { this.err = 'Selecione um ETF.'; return; }
    if (this.overrideForm.invalid) { this.err = 'Informe a data e o retorno diário.'; return; }

    const { date, dailyPct } = this.overrideForm.value;
    this.etfService.overrideValuation(this.selected.id!, date, dailyPct).subscribe({
      next: () => {
        this.msg = `Override aplicado em ${date} para ${this.selected?.name} (retorno ${dailyPct}).`;
        this.err = null;
        this.loadHistory(this.selected!);
        this.overrideForm.reset();
      },
      error: (e) => this.onError(e)
    });
  }

  /* ===== Trade ===== */
  submitTrade() {
    if (!this.selected?.id) { this.err = 'Selecione um ETF.'; return; }
    if (this.tradeForm.invalid) { this.err = 'Preencha usuário e quantidade de cotas.'; return; }

    const { usuarioId, cotas, side } = this.tradeForm.value as { usuarioId: number; cotas: number; side: 'BUY' | 'SELL' };
    const call$ = side === 'BUY'
      ? this.etfService.buy(this.selected.id!, usuarioId, cotas)
      : this.etfService.sell(this.selected.id!, usuarioId, cotas);

    call$.subscribe({
      next: (tx: EtfTransaction) => {
        const sign = side === 'BUY' ? '-' : '+';
        this.msg = `${side} OK: ${tx.cotas} cotas @ ${tx.pricePerCota} (fee ${tx.feeAmount}), total ${sign}$${Math.abs(tx.totalUsd).toFixed(2)}.`;
        this.err = null;
        this.loadHistory(this.selected!);
        this.tradeForm.reset({ side: 'BUY' });
      },
      error: (e) => this.onError(e)
    });
  }

  /* ===== Modal de Níveis ===== */
  openLevelsModal(etf: Etf) {
    this.levelsEtf = etf;
    this.levelsForm.reset({
      cotaMinima: etf.cotaMinima ?? null,
      nivel01: etf.nivel01 ?? null,
      nivel02: etf.nivel02 ?? null,
      nivel03: etf.nivel03 ?? null,
    });
    this.levelsModalOpen = true;
    this.closeRowActions();
  }

  closeLevelsModal() {
    this.levelsModalOpen = false;
    this.levelsEtf = null;
  }

  submitLevels() {
    if (!this.levelsEtf?.id) { this.err = 'ETF inválido.'; return; }
    if (this.levelsForm.invalid) { this.err = 'Revise os valores dos níveis.'; return; }

    const v = this.levelsForm.value as any;
    const payload: any = {};
    const keys = ['cotaMinima', 'nivel01', 'nivel02', 'nivel03'] as const;
    for (const k of keys) {
      const val = v[k];
      if (val !== null && val !== undefined && val !== '') payload[k] = Number(val);
    }

    this.etfService.updateLevels(this.levelsEtf.id!, payload).subscribe({
      next: (updated) => {
        this.msg = 'Níveis atualizados.';
        this.err = null;
        this.etfs = this.etfs.map(x => x.id === updated.id ? updated : x);
        if (this.selected?.id === updated.id) this.selected = updated;
        this.closeLevelsModal();
      },
      error: (e) => this.onError(e)
    });
  }

  /* ===== Deletar (corrige o erro do template) ===== */
  hardDelete(etf: Etf) {
    if (!etf.id) return;
    const ok = confirm(`Excluir definitivamente o ETF ${etf.name}? Esta ação é irreversível.`);
    if (!ok) return;

    this.etfService.delete(etf.id).subscribe({
      next: () => {
        this.msg = `ETF ${etf.name} excluído.`;
        this.err = null;
        if (this.selected?.id === etf.id) this.selected = null;
        this.etfs = this.etfs.filter(x => x.id !== etf.id);
        this.closeRowActions();
      },
      error: (e) => this.onError(e)
    });
  }

  /* ===== utils ===== */
  pctToStr(p: number | null | undefined): string {
    if (p == null) return '-';
    return (p * 100).toFixed(2) + '%';
  }

  private clearFeedback() { this.msg = null; this.err = null; }
  private onError(e: any) {
    console.error(e);
    this.err = (e?.error?.message) || (e?.message) || 'Erro inesperado';
    this.msg = null;
  }
}
