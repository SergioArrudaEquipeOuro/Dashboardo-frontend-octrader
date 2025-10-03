import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Bot } from 'src/app/models/bot';

type MarketDir = 'stocks' | 'crypto' | 'commodities' | 'forex' | 'indices';

interface RawOp {
  id: number;
  saldo?: number | null;
  lucro?: number | null;
  abertura?: number | null;
  fechamento?: number | null;
  volume?: number | null;
  token?: string;
  data: string; // ISO
  visivel?: boolean;
}

interface Operation {
  id: number;
  amount: number;         // saldo da operação (>=0 ou negativo), exibido como USD
  date: Date;
  status: 'finished' | 'active';
  token?: string;
  asset: string;          // ex.: 'EUR / USD', 'BTC', 'NVDA'
  direction: MarketDir;   // nova coluna
  __key: string;          // interno p/ trackBy
}

@Component({
  selector: 'app-painel-client09',
  templateUrl: './painel-client09.component.html',
  styleUrls: ['./painel-client09.component.css']
})
export class PainelClient09Component implements OnInit, OnChanges {

  @Input() bots: Bot[] = [];           // <-- recebe do pai

  menuOpen = false;
  operations: Operation[] = [];        // render final (0..5)

  ngOnInit(): void { this.rebuild(); }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bots']) this.rebuild();
  }

  // ========= Core =========

  private rebuild(): void {
    console.groupCollapsed('%c[Ops] Montando "Últimas Operações" a partir de bots', 'color:#2e00ab;font-weight:bold;');

    const norm = (s?: string) => (s || '').toLowerCase().trim() as MarketDir;

    // 1) Flatten: todas as operações de todos os bots, com enriquecimento
    const all: Operation[] = [];
    const byDirCount: Record<MarketDir, number> = { stocks: 0, crypto: 0, commodities: 0, forex: 0, indices: 0 };

    for (const b of (this.bots || [])) {
      const dir = norm(b.direcaoMercado) as MarketDir;
      if (!['stocks', 'crypto', 'commodities', 'forex', 'indices'].includes(dir)) continue;

      const ops: RawOp[] = (b as any).operacoesList ?? [];
      byDirCount[dir] += ops.length;

      for (const op of ops) {
        const d = this.safeDate(op.data);
        const token = op.token;
        const amount = this.safeNumber(op.saldo);     // regra: sempre saldo
        const status = this.statusFromBot(b, d);
        const asset = this.symbolFromBot(b, op);

        all.push({
          id: op.id,
          amount,
          date: d,
          status,
          token,
          asset,
          direction: dir,
          __key: `${dir}-${op.id}-${b.symbol ?? ''}-${op.token ?? ''}-${d.getTime()}`
        });
      }
    }

    console.table([
      { Direcao: 'stocks', Ops: byDirCount.stocks },
      { Direcao: 'crypto', Ops: byDirCount.crypto },
      { Direcao: 'commodities', Ops: byDirCount.commodities },
      { Direcao: 'forex', Ops: byDirCount.forex },
      { Direcao: 'indices', Ops: byDirCount.indices },
    ]);
    console.log('Total de operações coletadas:', all.length);

    // 2) Ordena por data desc
    all.sort((a, b) => b.date.getTime() - a.date.getTime());

    // 3) Seleciona preferencialmente a última por direção (no máx. 1 por direção)
    const order: MarketDir[] = ['indices', 'crypto', 'stocks', 'forex', 'commodities']; // ordem de preferência
    const selected: Operation[] = [];
    const usedKeys = new Set<string>();

    for (const dir of order) {
      const found = all.find(o => o.direction === dir && !usedKeys.has(o.__key));
      if (found) {
        selected.push(found);
        usedKeys.add(found.__key);
      }
    }

    // 4) Completa até 5 com as próximas mais recentes ainda não usadas
    if (selected.length < 5) {
      for (const o of all) {
        if (selected.length >= 5) break;
        if (!usedKeys.has(o.__key)) {
          selected.push(o);
          usedKeys.add(o.__key);
        }
      }
    }

    // 5) Limite e atribui
    this.operations = selected.slice(0, 5);

    console.table(this.operations.map(o => ({
      ID: o.id,
      Token: o.token,
      Data: o.date.toISOString(),
      Status: o.status,
      Direcao: o.direction,
      Ativo: o.asset,
      Aplicacao_Saldo: o.amount
    })));
    console.groupEnd();
    console.log('OPERACOES:', this.operations)
  }

  // ========= Helpers =========

  private assetLabel(symbol?: string, nomeAtivo?: string, dir?: MarketDir): string {
    const s = (symbol || '').toUpperCase().trim();
    if (dir === 'forex' && /^[A-Z]{6}$/.test(s)) {
      return `${s.substring(0, 3)} / ${s.substring(3)}`; // EURUSD -> EUR / USD
    }
    // mantém como veio, ou cai no nome do ativo
    return s || (nomeAtivo ?? '—');
  }

  private statusFromBot(bot: Bot, opDate: Date): 'finished' | 'active' {
    const s = (bot.status || '').toUpperCase();
    if (s === 'FINISHED') return 'finished';
    if (s === 'ACTIVE') return 'active';
    // fallback por dataFim
    const now = Date.now();
    const end = bot.dataFim ? Date.parse(bot.dataFim) : NaN;
    if (Number.isFinite(end) && end < now) return 'finished';
    return 'active';
  }

  private safeNumber(v: any): number {
    return (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
  }

  private safeDate(iso: string): Date {
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d : new Date();
  }

  // ========= Template API =========

  trackById = (_: number, op: Operation) => op.__key;

  view(op: Operation): void {
    console.log('Ver operação', op);
    // TODO: abrir modal de detalhes se quiser
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; }

  onMenu(action: 'export' | 'refresh'): void {
    this.menuOpen = false;
    if (action === 'export') {
      console.log('Exportar CSV (implementar download se desejar)');
    }
    if (action === 'refresh') {
      this.rebuild();
    }
  }

  urlSymbol(symbol: any): string {
    const base = (symbol || '').toString().trim().toUpperCase();
    return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(base)}.png`;
  }


  private symbolFromBot(bot: Bot, op: RawOp): string {
    const s = (bot.symbol ?? '').toString().trim().toUpperCase();
    if (s) return s;

    // Fallbacks seguros caso o bot não tenha symbol:
    const t = (op.token ?? '').toString().trim().toUpperCase();
    if (t) return t;

    return (bot.nomeAtivo ?? '—');
  }

}
