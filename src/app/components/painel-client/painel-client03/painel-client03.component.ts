import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { BotService } from 'src/app/services/bot.service';

type MarketDirection = 'forex' | 'indexes' | 'commodities' | 'crypto' | 'stocks';
interface AssetLite { symbol: string; name?: string; price?: number | string | null; }

@Component({
  selector: 'app-painel-client03',
  templateUrl: './painel-client03.component.html',
  styleUrls: ['./painel-client03.component.css']
})
export class PainelClient03Component implements OnInit, OnChanges {
  // Inputs já existentes
  @Input() user: any;
  @Input() asset?: AssetLite | null;
  @Input() direction: MarketDirection = 'stocks';
  @Input() openNonce = 0;
  @Input() activeEnterprise: any;
  @Input() lvl: any;

  // Campos
  codKeyPass = '';
  profile = 'scalping';
  stopType = 'PERCENT';
  volume: number | null = null;
  stopWin: number | null = null;
  stopLoss: number | null = null;
  saldo: number | null = null;

  // UI
  loading = false;
  successMsg: string | null = null;
  errorMsg: string | null = null;
  private successTimer: any;
  private errorTimer: any;



  profiles = [
    { value: 'scalping', label: 'Scalping' },
    { value: 'swing', label: 'Swing' },
    { value: 'trend', label: 'Trend Following' },
  ];
  stopTypes = [
    { value: 'PERCENT', label: 'Percentual (%)' },
    { value: 'FIXED', label: 'Fixo (valor)' },
  ];



  constructor(private botService: BotService) { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['openNonce'] && !changes['openNonce'].firstChange) {
      this.resetForm(false);
    }
    // se lvl mudar, re-clampa o que já estiver digitado
    if (changes['lvl'] && !changes['lvl'].firstChange) {
      this.enforceSaldoCap();
    }
  }

  /** Há limitação de saldo? (depende do botNivel) */
  get hasBotNivelLimit(): boolean {
    return !!(this.activeEnterprise && this.activeEnterprise.botNivel === true);
  }

  /** Max de saldo conforme lvl quando botNivel estiver ativo.
   *  Assumido: lvl=1 -> 100, lvl=2 -> 1000, lvl=3 -> ilimitado.
   */
  get maxSaldo(): number | null {
    const n = Number(this.lvl);
    if (n === 1) return 100;
    if (n === 2) return 1000;
    if (n === 3) return null; // ilimitado
    return null;
  }

  /** Clampa e normaliza o saldo digitado */
  onSaldoChange(v: any): void {
    let val = Number(v);
    if (Number.isNaN(val)) {
      this.saldo = null;
      return;
    }
    if (val < 0) val = 0;
    const max = this.maxSaldo;
    if (max != null && val > max) val = max;
    this.saldo = val;
  }

  private getClienteId(): number | null {
    return this.user?.clienteId ?? this.user?.id ?? null;
  }

  get symbol(): string {
    return (this.asset?.symbol ?? '').toString().toUpperCase();
  }
  get nomeAtivo(): string {
    return (this.asset?.name ?? '-').toString();
  }

  canSubmit(): boolean {
    const clienteId = this.getClienteId();
    const volOk = this.volume !== null && +this.volume! > 0;
    const saldoOk = this.saldo !== null && +this.saldo! > 0;
    const stopsOk = this.stopWin !== null && this.stopLoss !== null;
    return !!(
      clienteId &&
      this.codKeyPass &&
      this.direction &&
      this.symbol &&
      this.nomeAtivo &&
      this.profile &&
      this.stopType &&
      volOk &&
      stopsOk &&
      saldoOk &&
      !this.loading
    );
  }

  submit(): void {
    this.clearTimers();
    this.successMsg = null;
    this.errorMsg = null;

    const clienteId = this.getClienteId();
    if (!this.canSubmit() || !clienteId) {
      this.errorMsg = 'Preencha todos os campos obrigatórios.';
      this.errorTimer = setTimeout(() => (this.errorMsg = null), 5000);
      return;
    }

    const payload: any = {
      direcaoMercado: this.direction,
      symbol: this.symbol,
      nomeAtivo: this.nomeAtivo,
      profile: this.profile,
      stopType: this.stopType,
      volume: +this.volume!,
      stopWin: +this.stopWin!,
      stopLoss: +this.stopLoss!,
      saldo: +this.saldo!,
      valorInicial: +this.saldo!,
      lvl: this.lvl
    };

    this.loading = true;
    this.botService.createBot(this.codKeyPass, clienteId, payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (created) => {
          this.successMsg = `Automatizaçao criada com sucesso!`;
          this.resetForm(false); // limpa campos, mantém a mensagem
          this.successTimer = setTimeout(() => (this.successMsg = null), 5000);
        },
        error: (err) => {
          this.errorMsg = err?.error?.message || err?.message || 'Falha ao criar a automatizaçao.';
          this.errorTimer = setTimeout(() => (this.errorMsg = null), 5000);
        }
      });
  }

  closeSuccess(): void {
    this.successMsg = null;
    this.clearTimers();
  }

  closeError(): void {
    this.errorMsg = null;
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.successTimer) { clearTimeout(this.successTimer); this.successTimer = null; }
    if (this.errorTimer) { clearTimeout(this.errorTimer); this.errorTimer = null; }
  }

  private resetForm(clearMessages = true): void {
    this.codKeyPass = '';
    this.profile = 'scalping';
    this.stopType = 'PERCENT';
    this.volume = null;
    this.stopWin = null;
    this.stopLoss = null;
    this.saldo = null;
    if (clearMessages) {
      this.successMsg = null;
      this.errorMsg = null;
      this.clearTimers();
    }
  }

  // Clampa em tempo real e reflete no campo (impossível ficar > max)
  get maxSaldoText(): string {
    const max = this.maxSaldo;
    return max != null ? max.toFixed(2) : 'ILIMITADO';
  }

  /** Clampa em tempo real e espelha no input (impede exceder o limite) */
  onSaldoInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    let val = Number(input.value);

    if (Number.isNaN(val)) {
      this.saldo = null;
      return;
    }

    if (val < 0) val = 0;

    const max = this.maxSaldo;
    if (max != null && val > max) {
      val = max;
    }

    this.saldo = val;
    input.value = this.saldo != null ? String(this.saldo) : '';
  }

  /** Caso lvl mude com valor já digitado */
  private enforceSaldoCap(): void {
    if (this.saldo == null) return;
    const max = this.maxSaldo;
    if (this.saldo < 0) this.saldo = 0;
    if (max != null && this.saldo > max) this.saldo = max;
  }



}