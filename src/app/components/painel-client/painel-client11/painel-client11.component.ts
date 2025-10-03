// src/app/pages/painel-client11/painel-client11.component.ts
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Etf, EtfHistory, EtfPositionView } from 'src/app/models/Etf';
import { EtfService } from 'src/app/services/etf.service';

interface EtfTransaction {
  cotas: number;
  pricePerCota: number;
  feeAmount: number;
  totalUsd: number;
}

type PanelMode = 'NONE' | 'BUY' | 'SELL';

@Component({
  selector: 'app-painel-client11',
  templateUrl: './painel-client11.component.html',
  styleUrls: ['./painel-client11.component.css']
})
export class PainelClient11Component implements OnInit, OnChanges {

  @Input() user: any;

  etfs: Etf[] = [];
  positions: Map<number, EtfPositionView> = new Map();

  buyForms: Record<number, FormGroup> = {};
  sellForms: Record<number, FormGroup> = {};

  /** estado por card: NONE | BUY | SELL (controla colapsáveis) */
  openPanel: Record<number, PanelMode> = {};

  // ui
  loading = false;
  msg: string | null = null;
  err: string | null = null;

  constructor(private fb: FormBuilder, private etfService: EtfService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']?.currentValue && this.user?.id != null) {
      this.connectUser();
      this.updateAllBuyValidators(); // ⬅️ atualiza limites por saldo/nível
    }
  }


  ngOnInit(): void {
    this.loadEtfs();
    if (this.user?.id != null) this.connectUser();
  }

  // ---------- carregamento ----------
  loadEtfs() {
    this.loading = true;
    this.etfService.list().subscribe({
      next: rows => {
        this.etfs = rows;
        this.loading = false;

        rows.forEach(e => {
          if (!this.buyForms[e.id!]) {
            this.buyForms[e.id!] = this.fb.group({
              cotas: [null, [Validators.required]] // min/max serão dinâmicos
            });
          }
          // ⬇️ aplique min/max com base no ETF e no usuário/saldo
          this.applyBuyValidators(e);

          if (!this.openPanel[e.id!]) this.openPanel[e.id!] = 'NONE';
        });

        // garante que todos estão com validadores atualizados
        this.updateAllBuyValidators();

      },
      error: e => this.onError(e)
    });
  }

  private connectUser() {
    this.clearFeedback();
    const uid = this.user?.id;
    if (uid == null) { this.err = 'Usuário não identificado.'; return; }
    this.loadPositions(uid);
  }

  private loadPositions(uid: number) {
    this.etfService.positions(uid).subscribe({
      next: list => {
        this.positions.clear();
        list.forEach(p => {
          this.positions.set(p.etfId, p);

          if (!this.sellForms[p.etfId]) {
            this.sellForms[p.etfId] = this.fb.group({
              cotas: [null, [Validators.required, Validators.min(0.000001)]],
            });
          }

          // se o painel estava em SELL e posição zerou, fecha
          if (this.openPanel[p.etfId] === 'SELL' && (!p.cotas || p.cotas <= 0)) {
            this.openPanel[p.etfId] = 'NONE';
          }
        });

        // garante estado conhecido para todos os cards
        this.etfs.forEach(e => {
          if (!this.openPanel[e.id!]) this.openPanel[e.id!] = 'NONE';
        });

        this.msg = 'Posições atualizadas.';
      },
      error: e => this.onError(e)
    });
  }

  // ---------- UI helpers ----------
  isOpen(etfId: number, mode: Exclude<PanelMode, 'NONE'>): boolean {
    return this.openPanel[etfId] === mode;
  }

  togglePanel(etfId: number, mode: Exclude<PanelMode, 'NONE'>) {
    if (mode === 'SELL') {
      const hasQty = (this.positions.get(etfId)?.cotas || 0) > 0;
      if (!hasQty) return; // não abre SELL sem posição
    }
    const current = this.openPanel[etfId] || 'NONE';
    this.openPanel[etfId] = current === mode ? 'NONE' : mode;
  }

  // ---------- ações ----------
  private findEtfById(id: number): Etf | undefined { return this.etfs.find(x => x.id === id); }

  quickAdd(etfId: number, qty: number) {
    const e = this.findEtfById(etfId);
    if (!e) return;

    const fg = this.buyForms[etfId];
    const current = Number(fg.get('cotas')?.value || 0);

    const max = this.maxBuyQty(e);
    const next = Math.min(current + qty, max);

    fg.patchValue({ cotas: +next.toFixed(6) });
  }


  submitBuy(etf: Etf) {
    const uid = this.user?.id;
    if (uid == null) { this.err = 'Usuário não identificado para comprar.'; return; }

    const fg = this.buyForms[etf.id!];
    if (fg.invalid) { this.err = 'Informe a quantidade de cotas a comprar.'; return; }
    const cotas = Number(fg.value.cotas);

    this.etfService.buy(etf.id!, uid, cotas).subscribe({
      next: (tx: EtfTransaction) => {
        this.msg = `Compra OK: ${tx.cotas} @ ${tx.pricePerCota} • total -$${Math.abs(tx.totalUsd).toFixed(2)}`;
        this.err = null;
        fg.reset();
        this.loadPositions(uid);
        // fecha painel após a compra
        this.openPanel[etf.id!] = 'NONE';
        this.applyBuyValidators(etf);
      },
      error: e => this.onError(e)
    });
  }

  quickSellFill(etfId: number, fraction: number) {
    const pos = this.positions.get(etfId);
    if (!pos) return;
    const qty = +(pos.cotas * fraction).toFixed(6);
    this.sellForms[etfId].patchValue({ cotas: qty > 0 ? qty : null });
  }

  submitSell(p: EtfPositionView) {
    const uid = this.user?.id;
    if (uid == null) { this.err = 'Usuário não identificado para vender.'; return; }

    const fg = this.sellForms[p.etfId];
    if (fg.invalid) { this.err = 'Informe a quantidade de cotas a vender.'; return; }
    const cotas = Number(fg.value.cotas);
    if (cotas > p.cotas) { this.err = 'Quantidade acima da sua posição.'; return; }

    this.etfService.sell(p.etfId, uid, cotas).subscribe({
      next: (tx: EtfTransaction) => {
        this.msg = `Venda OK: ${tx.cotas} @ ${tx.pricePerCota} • total +$${Math.abs(tx.totalUsd).toFixed(2)}`;
        this.err = null;
        fg.reset();
        this.loadPositions(uid);
        // fecha painel após a venda
        this.openPanel[p.etfId] = 'NONE';
      },
      error: e => this.onError(e)
    });
  }

  // ---------- utils ----------
  pct(n?: number | null): string { return n == null ? '-' : (n * 100).toFixed(2) + '%'; }
  money(n?: number | null): string { return n == null ? '-' : '$' + Number(n).toFixed(2); }

  private clearFeedback() { this.msg = null; this.err = null; }
  private onError(e: any) { console.error(e); this.err = (e?.error?.message) || e?.message || 'Erro inesperado'; this.msg = null; }

  // Valor de mercado = cotas * NAV (com proteções)
  marketValueFor(p?: EtfPositionView | null, nav?: number | null): number {
    const cotas = p?.cotas ?? 0;
    const currentNav = nav ?? 0;
    const v = Number(cotas) * Number(currentNav);
    return Number.isFinite(v) ? v : 0;
  }

  // (mantidos caso use em outras telas)
  calcPnlUsd(p: EtfPositionView | undefined | null): number {
    if (!p || p.cotas == null || p.avgPrice == null || p.currentNav == null) return 0;
    const usd = (Number(p.currentNav) - Number(p.avgPrice)) * Number(p.cotas);
    return Number.isFinite(usd) ? usd : 0;
  }
  calcPnlPct(p: EtfPositionView | undefined | null): number {
    if (!p || p.avgPrice == null || p.avgPrice <= 0 || p.currentNav == null) return 0;
    const pct = (Number(p.currentNav) / Number(p.avgPrice)) - 1;
    return Number.isFinite(pct) ? pct : 0;
  }

  /** --------- LIMITES (nível, saldo, min/max) --------- */

  // Descobre o nível do usuário (3 > 2 > 1 > 0)
  private userEtfLevel(): 0 | 1 | 2 | 3 {
    if (this.user?.etfNivel03) return 3;
    if (this.user?.etfNivel02) return 2;
    if (this.user?.etfNivel01) return 1;
    return 0;
  }

  // Mínimo por ordem (cota mínima do ETF ou um epsilon)
  buyMin(etf: Etf): number {
    const m = Number(etf?.cotaMinima);
    return Number.isFinite(m) && m > 0 ? m : 0.000001;
  }

  // Limite pelo NÍVEL (pega o campo do ETF correspondente ao nível do usuário)
  maxQtyByLevel(etf: Etf): number {
    const lvl = this.userEtfLevel();
    if (lvl === 0) return 0;

    const cap =
      lvl === 3 ? etf?.nivel03 :
        lvl === 2 ? etf?.nivel02 :
          etf?.nivel01;

    // Se não houver valor configurado para o ETF, considere "sem teto" para esse critério.
    const n = Number(cap);
    return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
  }

  // Limite pelo SALDO (saldo / NAV)
  maxQtyByBalance(etf: Etf): number {
    const saldo = Number(this.user?.saldoUsd ?? this.user?.saldo ?? 0);
    const nav = Number(etf?.currentNav ?? 0);
    if (!Number.isFinite(saldo) || saldo <= 0 || !Number.isFinite(nav) || nav <= 0) return 0;
    return saldo / nav;
  }

  // Limite FINAL permitido para compra (mínimo entre nível e saldo)
  maxBuyQty(etf: Etf): number {
    const byLevel = this.maxQtyByLevel(etf);
    const byBalance = this.maxQtyByBalance(etf);
    const max = Math.min(byLevel, byBalance);
    return max > 0 ? +max.toFixed(6) : 0;
  }

  /** Aplica validadores dinâmicos (min/max) no form de compra desse ETF */
  private applyBuyValidators(etf: Etf): void {
    const fg = this.buyForms[etf.id!];
    if (!fg) return;
    const control = fg.get('cotas');
    if (!control) return;

    const min = this.buyMin(etf);
    const max = this.maxBuyQty(etf);

    control.setValidators([Validators.required, Validators.min(min), Validators.max(max)]);
    control.updateValueAndValidity({ emitEvent: false });
  }

  /** Reaplica validadores para todos os ETFs (quando user/saldo/etfs mudarem) */
  private updateAllBuyValidators(): void {
    this.etfs.forEach(e => this.applyBuyValidators(e));
  }

  /** Clampeia no input para não passar do limite permitido */
  onBuyInput(etf: Etf) {
    const fg = this.buyForms[etf.id!];
    const ctl = fg?.get('cotas');
    if (!ctl) return;

    const v = Number(ctl.value);
    if (!Number.isFinite(v)) return;

    const max = this.maxBuyQty(etf);
    const min = this.buyMin(etf);

    let nv = v;
    if (nv > max) nv = max;

    // só força o mínimo se houver faixa válida (max >= min)
    if (max >= min && nv > 0 && nv < min) nv = min;

    if (nv !== v) ctl.setValue(+nv.toFixed(6), { emitEvent: false });
  }



  /** ----- Saldo x mínimo ----- */
  private userBalance(): number {
    return Number(this.user?.saldoUsd ?? this.user?.saldo ?? 0);
  }

  canAffordMin(etf: Etf): boolean {
    // saldo/NAV precisa ser >= cotaMinima
    return this.maxQtyByBalance(etf) >= this.buyMin(etf);
  }

  costOfMin(etf: Etf): number {
    const min = this.buyMin(etf);
    const nav = Number(etf?.currentNav ?? 0);
    if (!(Number.isFinite(min) && Number.isFinite(nav) && min > 0 && nav > 0)) return 0;
    return min * nav;
  }

  missingForMin(etf: Etf): number {
    const miss = this.costOfMin(etf) - this.userBalance();
    return miss > 0 ? miss : 0;
  }

}
