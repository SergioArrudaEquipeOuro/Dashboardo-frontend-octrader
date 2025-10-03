import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService, MarketCategory } from 'src/app/services/api.service';
import { LeilaoService, Leilao, Lance } from 'src/app/services/leilao.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-client-content05',
  templateUrl: './dashboard-client-content05.component.html',
  styleUrls: ['./dashboard-client-content05.component.css']
})
export class DashboardClientContent05Component implements OnInit, OnChanges {
  @Input() user: any;

  // Lista
  leiloes: Leilao[] = [];
  leiloesFiltrados: Leilao[] = [];
  loadingList = false;
  listError = '';

  // Preço e últimos lances
  precoCarregando = new Set<number>();
  ultimoLancePorLeilao: Record<number, number | null> = {};

  // Modal de lances
  showModal = false;
  selected?: Leilao;
  lances: Lance[] = [];
  loadingLances = false;
  lancesError = '';
  darLanceValor?: number;

  constructor(
    private leilaoSrv: LeilaoService,
    private api: ApiService
  ) { }

  ngOnInit(): void {
    this.carregarLeiloes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && !changes['user'].firstChange) {
      this.carregarLeiloes();
    }
  }

  trackById = (_: number, l: Leilao) => l.id;

  // ========= Helper central para extrair a mensagem exata do backend =========
  private getErrMsg(err: any): string {
    // Erro de rede (sem resposta)
    if (err instanceof HttpErrorResponse && err.status === 0) {
      return 'Falha de conexão com o servidor.';
    }

    // Se veio JSON padrão do Spring: { message, error, status, ... }
    const msgFromJson = err?.error?.message ?? err?.error?.detail ?? err?.message ?? null;

    // Às vezes err.error é string
    const msgFromString = (typeof err?.error === 'string' && err.error.trim().length > 0)
      ? err.error.trim()
      : null;

    // Compose com status se existir (ajuda a depurar e casa com as regras do backend)
    const code = (err as HttpErrorResponse)?.status;
    const base = (msgFromJson ?? msgFromString ?? 'Ocorreu um erro inesperado.').toString();

    // Mostra exatamente a mensagem do backend + o código HTTP (quando houver)
    return (code ? `${base} (HTTP ${code})` : base);
  }

  carregarLeiloes() {
    this.loadingList = true;
    this.listError = '';
    this.leilaoSrv.listarLeiloes().subscribe({
      next: (all) => {
        this.leiloes = Array.isArray(all) ? all : [];
        this.leiloesFiltrados = this.filtrarPorPermissao(this.leiloes, this.user?.email);
        this.preencherUltimosLances(this.leiloesFiltrados);
        this.atualizarValoresAtivos(this.leiloesFiltrados);
      },
      error: (err) => {
        this.listError = this.getErrMsg(err);
      },
      complete: () => (this.loadingList = false)
    });
  }

  private filtrarPorPermissao(lista: Leilao[], email?: string): Leilao[] {
    const e = (email || '').trim().toLowerCase();
    return lista.filter(l => {
      if (l.liberarParaTodosClientes) return true;
      const wl = (l.listaBrancaEmails || []).map(x => (x || '').trim().toLowerCase());
      return !!e && wl.includes(e);
    });
  }

  /** Último lance por leilão (maior) com fallback para lanceInicial */
  private preencherUltimosLances(leiloes: Leilao[]) {
    for (const l of leiloes) {
      this.ultimoLancePorLeilao[l.id] = null;
      this.leilaoSrv.listarLances(l.id).subscribe({
        next: (lances) => {
          if (Array.isArray(lances) && lances.length) {
            const max = Math.max(...lances.map(x => Number(x?.valor ?? 0)));
            this.ultimoLancePorLeilao[l.id] = max;
          } else {
            this.ultimoLancePorLeilao[l.id] = l.lanceInicial ?? 0;
          }
        },
        error: () => {
          this.ultimoLancePorLeilao[l.id] = l.lanceInicial ?? 0;
        }
      });
    }
  }

  /** Atualiza l.valorAtualAtivo a partir das listas do ApiService */
  private atualizarValoresAtivos(leiloes: Leilao[]) {
    const cats: MarketCategory[] = ['stocks', 'forex', 'indices', 'commodities', 'crypto'];
    this.precoCarregando = new Set<number>(leiloes.map(x => x.id));

    forkJoin(cats.map(c => this.api.getCategoryList(c))).subscribe({
      next: (lists) => {
        const all = lists.flat().filter(Boolean);
        const priceBySym = new Map<string, number>();

        for (const it of all) {
          const symRaw = it?.symbol ?? it?.ticker ?? '';
          const sym = this.cleanSymbol(symRaw);
          const price = typeof it?.price === 'number'
            ? it.price
            : (typeof it?.ask === 'number' ? it.ask
              : (typeof it?.bid === 'number' ? it.bid : null));
          if (sym && typeof price === 'number') priceBySym.set(sym, price);
        }

        for (const l of leiloes) {
          const sym = this.cleanSymbol(l.symbolAtivo);
          const p = priceBySym.get(sym);
          if (typeof p === 'number') l.valorAtualAtivo = p;
          this.precoCarregando.delete(l.id);
        }
      },
      error: () => {
        for (const l of leiloes) this.precoCarregando.delete(l.id);
      }
    });
  }

  ultimoLance(l: Leilao): number {
    const v = this.ultimoLancePorLeilao[l.id];
    return v != null ? v : (l.lanceInicial ?? 0);
  }

  abrirModalLances(l: Leilao) {
    this.selected = l;
    this.showModal = true;
    this.lancesError = '';
    this.darLanceValor = undefined;
    this.carregarLances();
  }

  fecharModal() {
    this.showModal = false;
    this.selected = undefined;
    this.lances = [];
    this.lancesError = '';
  }

  carregarLances() {
    if (!this.selected) return;
    this.loadingLances = true;
    this.leilaoSrv.listarLances(this.selected.id).subscribe({
      next: (res) => (this.lances = res),
      error: (err) => (this.lancesError = this.getErrMsg(err)),
      complete: () => (this.loadingLances = false)
    });
  }

  enviarLance() {
    if (!this.selected) return;
    const email = (this.user?.email || '').trim().toLowerCase();
    if (!email) { this.lancesError = 'Não foi possível identificar seu e-mail.'; return; }

    const isIngles = this.selected.tipoLeilao === 'INGLES';
    if (isIngles) {
      if (this.darLanceValor == null || this.darLanceValor <= 0) {
        this.lancesError = 'Informe um valor de lance válido.';
        return;
      }
      const maior = this.maiorLanceAtual(this.selected);
      if (this.darLanceValor <= maior) {
        this.lancesError = `Lance deve ser > ${maior.toLocaleString()}.`;
        return;
      }
      const inc = this.selected.incrementoMinimo ?? 0;
      const minimo = this.minimoAceitavel(this.selected);

      // Mesma regra do backend: exigir >= (maior + inc)
      if (this.darLanceValor < minimo) {
        this.lancesError = inc > 0
          ? `Lance deve ser ≥ maior lance + incremento mínimo (${minimo.toLocaleString()}).`
          : `Lance deve ser ≥ maior lance atual (${maior.toLocaleString()}).`;
        return;
      }
    }

    this.leilaoSrv.darLance(
      this.selected.id,
      email,
      isIngles ? this.darLanceValor : undefined
    ).subscribe({
      next: () => {
        this.darLanceValor = undefined;
        this.carregarLances();
        this.carregarLeiloes();
      },
      error: (err) => (this.lancesError = this.getErrMsg(err))
    });
  }



  fmtData(dt?: string | null) {
    if (!dt) return '—';
    const d = new Date(dt);
    return isNaN(+d) ? dt : d.toLocaleString();
  }

  private cleanSymbol(raw: string): string {
    return (raw || '').trim().replace(/^\^+/, '').replace(/\..*$/, '').toUpperCase();
  }

  public urlSymbol(symbol: string): string {
    const base = (symbol || '').trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }


  maiorLanceAtual(l: Leilao): number {
    const base = l.lanceInicial ?? 0;
    const maxDoCliente = this.ultimoLancePorLeilao[l.id];
    return Math.max(base, typeof maxDoCliente === 'number' ? maxDoCliente : base);
  }

  minimoAceitavel(l: Leilao): number {
    return this.maiorLanceAtual(l); // sem incremento
  }


}
