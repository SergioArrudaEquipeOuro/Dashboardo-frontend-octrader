import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { RendaFixaService, CofrinhoRendaFixa, CofrinhoMovimento, RendimentoDiario } from 'src/app/services/renda-fixa.service';

type Aba = 'depositar' | 'sacar' | 'extrato' | null;

@Component({
  selector: 'app-painel-client10',
  templateUrl: './painel-client10.component.html',
  styleUrls: ['./painel-client10.component.css']
})
export class PainelClient10Component implements OnInit, OnChanges {
  @Input() user: any;

  loading = false;
  creating = false;
  executando = false;
  erro: string | null = null;

  rendimentosPorDia: Record<number, RendimentoDiario[]> = {};
  carregandoRendimentos: Record<number, boolean> = {};

  meusCofrinhos: CofrinhoRendaFixa[] = [];

  private abas: Record<number, Aba> = {};
  valorDeposito: Record<number, number | null> = {};
  valorSaque: Record<number, number | null> = {};
  movimentos: Record<number, CofrinhoMovimento[]> = {};
  carregandoExtrato: Record<number, boolean> = {};

  // criação de cofrinho
  novoNome: string = '';
  novoUsarMeta: boolean = false;
  novoMeta: number | null = null;

  constructor(private renda: RendaFixaService) { }

  ngOnInit(): void {
    if (this.user?.id) this.recarregar();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']?.currentValue?.id) this.recarregar();
  }

  get novoMetaInvalid(): boolean {
    // só invalida se usuário preencheu e for negativo
    return this.novoUsarMeta && this.novoMeta != null && Number(this.novoMeta) < 0;
  }

  /* ======== PROGRESSO (saldo vs meta) ======== */
  hasMeta(c: CofrinhoRendaFixa): boolean {
    const meta = Number((c as any)?.meta ?? 0);
    return !!meta && meta > 0;
  }
  getProgressWidth(c: CofrinhoRendaFixa) {
    const meta = Number((c as any)?.meta ?? 0);
    const saldo = Number((c as any)?.saldo ?? 0);
    if (!meta || meta <= 0) return { width: '0%' };
    const pct = Math.max(0, Math.min(100, (saldo / meta) * 100));
    return { width: pct + '%' };
  }

  trackById(_: number, c: CofrinhoRendaFixa) {
    return c.id;
  }

  aba(id: number): Aba {
    return this.abas[id] ?? null; // começa fechado
  }
  setAba(id: number, a: Aba) {
    this.abas[id] = a;
  }

  toggleDepositar(id: number) {
    this.setAba(id, this.aba(id) === 'depositar' ? null : 'depositar');
  }
  toggleSacar(id: number) {
    this.setAba(id, this.aba(id) === 'sacar' ? null : 'sacar');
  }
  toggleExtrato(id: number) {
    const abrir = this.aba(id) !== 'extrato';
    this.setAba(id, abrir ? 'extrato' : null);
    if (abrir) this.carregarExtrato(id);
  }

  private roundTo(v: number, d: number) {
    const f = Math.pow(10, d);
    return Math.round((v + Number.EPSILON) * f) / f;
  }
  setPercentDeposito(id: number, pct: number) {
    const saldoUser = Number(this.user?.saldo) || 0;
    this.valorDeposito[id] = this.roundTo((saldoUser * pct) / 100, 2);
  }
  setPercentSaque(id: number, pct: number) {
    const card = this.meusCofrinhos.find(x => x.id === id);
    const disp = Number((card as any)?.saldo || 0);
    this.valorSaque[id] = this.roundTo((disp * pct) / 100, 2);
  }

  podeDepositar(id: number): boolean {
    const v = +(this.valorDeposito[id] ?? 0);
    return v > 0 && !this.executando;
  }
  podeSacar(id: number): boolean {
    const card = this.meusCofrinhos.find(x => x.id === id);
    const v = +(this.valorSaque[id] ?? 0);
    const disp = Number((card as any)?.saldo || 0);
    return v > 0 && v <= disp && !this.executando;
  }

  recarregar(): void {
    if (!this.user?.id) return;
    this.loading = true;
    this.erro = null;
    this.renda.listarPorUsuario(this.user.id).subscribe({
      next: lista => {
        this.meusCofrinhos = Array.isArray(lista) ? lista : [];
        for (const c of this.meusCofrinhos) {
          if (this.valorDeposito[c.id] == null) this.valorDeposito[c.id] = null;
          if (this.valorSaque[c.id] == null) this.valorSaque[c.id] = null;
          // mantém todos fechados por padrão
          if (this.abas[c.id] === undefined) this.abas[c.id] = null;
        }
      },
      error: () => {
        this.erro = 'Falha ao carregar cofrinhos.';
        this.meusCofrinhos = [];
      },
      complete: () => (this.loading = false)
    });
  }

  criarCofrinho(): void {
    const uid = this.user?.id;
    if (uid == null || this.novoMetaInvalid) return;

    this.creating = true;
    this.erro = null;

    const nome = (this.novoNome || '').trim() || undefined;

    // Toggle ligado + sem valor => null; se preenchido, envia número
    let meta: number | null = null;
    if (this.novoUsarMeta) {
      if (this.novoMeta === null || this.novoMeta === undefined || (this.novoMeta as any) === '') {
        meta = null;
      } else {
        const n = Number(this.novoMeta);
        meta = isNaN(n) ? null : n;
      }
    }

    this.renda.criarCofrinho(uid, nome, meta).subscribe({
      next: dto => {
        this.meusCofrinhos = [dto, ...this.meusCofrinhos];
        // NÃO abre nada automaticamente: inicia fechado
        this.abas[dto.id] = null;
        this.valorDeposito[dto.id] = null;
        this.valorSaque[dto.id] = null;

        // reset inputs
        this.novoNome = '';
        this.novoUsarMeta = false;
        this.novoMeta = null;
      },
      error: e => {
        this.erro = e?.error?.error || 'Falha ao criar cofrinho.';
      },
      complete: () => (this.creating = false)
    });
  }

  /** Extrai uma mensagem útil do erro HTTP do backend */
  private extractApiError(e: any, fallback = 'Falha no depósito.'): string {
    const raw = e?.error;
    if (typeof raw === 'string' && raw.trim()) return raw;                 // texto puro
    const msg = raw?.error || raw?.message || raw?.detail || raw?.title;   // payload JSON comum
    if (msg) return String(msg);
    // alguns servidores devolvem objeto vazio com apenas status
    switch (e?.status) {
      case 400: return 'Requisição inválida.';
      case 401:
      case 403: return 'Acesso negado.';
      case 404: return 'Cofrinho não encontrado.';
      default: return fallback;
    }
  }

  /** Depositar com mensagem clara de "saldo insuficiente" quando ocorrer */
  confirmarDeposito(id: number) {
    const v = +(this.valorDeposito[id] ?? 0);
    if (!this.podeDepositar(id)) return;

    this.executando = true;
    this.erro = null;

    this.renda.depositar(id, v).subscribe({
      next: dto => {
        alert('Depósito realizado com sucesso.');
        this.replaceCard(dto);
        this.valorDeposito[id] = null;
        if ((dto as any)?.usuario?.saldo != null) this.user.saldo = (dto as any).usuario.saldo;
      },
      error: e => {
        // 1) tenta usar a mensagem exata do backend (ex.: "Saldo insuficiente do usuário para depósito.")
        let msg = this.extractApiError(e, 'Falha no depósito.');

        // 2) se o backend não trouxe algo claro, faz checagem local e explica o motivo
        const saldoUser = Number(this.user?.saldo) || 0;
        if (!msg || /falha no depósito/i.test(msg)) {
          if (v > saldoUser) msg = 'Saldo insuficiente do usuário para depósito.';
        }

        alert(msg);
      },
      complete: () => (this.executando = false)
    });
  }


  confirmarSaque(id: number) {
    const v = +(this.valorSaque[id] ?? 0);
    if (!this.podeSacar(id)) return;
    this.executando = true;
    this.erro = null;
    this.renda.sacar(id, v).subscribe({
      next: dto => {
        alert('Saque realizado com sucesso.');
        this.replaceCard(dto);
        this.valorSaque[id] = null;
        if ((dto as any)?.usuario?.saldo != null) this.user.saldo = (dto as any).usuario.saldo;
      },
      error: e => alert(e?.error?.error || 'Falha no saque.'),
      complete: () => (this.executando = false)
    });
  }

  excluirCofrinho(c: CofrinhoRendaFixa) {
    if (!confirm(`Deseja realmente excluir "${(c as any).nome || 'Cofre-' + (c as any).id}"? Se houver saldo, ele será devolvido ao seu usuário.`)) return;
    this.executando = true;
    this.renda.deletar((c as any).id).subscribe({
      next: () => {
        alert('Cofrinho deletado.');
        this.recarregar();
      },
      error: e => alert(e?.error?.error || 'Falha ao deletar cofrinho.'),
      complete: () => (this.executando = false)
    });
  }

  private replaceCard(updated: CofrinhoRendaFixa) {
    const idx = this.meusCofrinhos.findIndex(c => (c as any).id === (updated as any).id);
    if (idx >= 0)
      this.meusCofrinhos = [
        ...this.meusCofrinhos.slice(0, idx),
        updated,
        ...this.meusCofrinhos.slice(idx + 1)
      ];
  }

  carregarExtrato(id: number) {
    this.carregandoExtrato[id] = true;
    this.renda.movimentos(id).subscribe({
      next: arr => (this.movimentos[id] = arr || []),
      error: () => (this.movimentos[id] = []),
      complete: () => (this.carregandoExtrato[id] = false)
    });

    this.carregandoRendimentos[id] = true;
    this.renda.rendimentosDiarios(id).subscribe({
      next: arr => (this.rendimentosPorDia[id] = arr || []),
      error: () => (this.rendimentosPorDia[id] = []),
      complete: () => (this.carregandoRendimentos[id] = false)
    });
  }
}
