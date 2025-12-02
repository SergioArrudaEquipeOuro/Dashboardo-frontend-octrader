import { Component, OnInit } from '@angular/core';
import { HistoricoBot, HistoricoBotService } from 'src/app/services/historico-bot.service';

type FilterType = 'broker' | 'idBot' | 'idUsuario' | 'tokenBot';

@Component({
  selector: 'app-admin-painel07',
  templateUrl: './admin-painel07.component.html',
  styleUrls: ['./admin-painel07.component.css']
})
export class AdminPainel07Component implements OnInit {

  loading = false;
  errorMsg: string | null = null;

  // dados
  historicos: HistoricoBot[] = [];
  private allHistoricos: HistoricoBot[] = [];

  // filtro
  filterType: FilterType = 'broker';
  query = '';

  constructor(private hbService: HistoricoBotService) { }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = null;

    this.hbService.getAll().subscribe({
      next: (list) => {
        const ordered = (list || []).sort((a, b) => {
          const da = new Date(a.date || 0).getTime();
          const db = new Date(b.date || 0).getTime();
          return db - da;
        });
        this.allHistoricos = ordered;
        this.historicos = ordered;
        this.loading = false;
        // Reaplica filtro se houver query
        if (this.query?.trim()) this.applyFilter();
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || err?.message || 'Falha ao carregar histórico.';
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    const q = (this.query || '').trim();
    if (!q) {
      this.historicos = this.allHistoricos.slice();
      return;
    }

    const lower = q.toLowerCase();

    this.historicos = this.allHistoricos.filter(h => {
      switch (this.filterType) {
        case 'broker':
          return (h.broker || '').toLowerCase().includes(lower);
        case 'idBot': {
          const n = Number(q);
          if (Number.isNaN(n)) return false;
          return (h.idBot ?? -1) === n || (h.id ?? -1) === n;
        }
        case 'idUsuario': {
          const n = Number(q);
          if (Number.isNaN(n)) return false;
          return (h.idUsuario ?? -1) === n;
        }
        case 'tokenBot':
          return (h.tokenBot || '').toLowerCase().includes(lower);
        default:
          return true;
      }
    });
  }

  clearFilter(): void {
    this.query = '';
    this.historicos = this.allHistoricos.slice();
  }

  // Helpers para UX do placeholder/label
  placeholderFor(t: FilterType): string {
    switch (t) {
      case 'broker': return 'Ex.: broker@dominio.com';
      case 'idBot': return 'Ex.: 27';
      case 'idUsuario': return 'Ex.: 35';
      case 'tokenBot': return 'Ex.: XDAJ-732-ECY09';
    }
  }
  labelFor(t: FilterType): string {
    switch (t) {
      case 'broker': return 'e-mail do broker';
      case 'idBot': return 'ID do bot';
      case 'idUsuario': return 'ID do cliente';
      case 'tokenBot': return 'token do bot';
    }
  }

  // (mantém seus helpers existentes)
  fmtPct(v?: number) {
    if (v === null || v === undefined) return '—';
    return `${v.toFixed(2)}%`;
  }

  fmtNum(v?: number, digits: string = '1.2-2') {
    if (v === null || v === undefined) return '—';
    return v;
  }

  hasFinishBlock(h: HistoricoBot): boolean {
    return !!(h.saldoUsuarioAntesDoBotFinish !== undefined ||
      h.creditoUsuarioAntesDoBotFinish !== undefined ||
      h.emprestimoUsuarioAntesDoBotFinish !== undefined ||
      h.saldoUsuarioDepoisDoBotFinish !== undefined ||
      h.creditoUsuarioDepoisDoBotFinish !== undefined ||
      h.emprestimoUsuarioDepoisDoBotFinish !== undefined ||
      h.status || h.dateFinalizacao || h.saldoFinalBot !== undefined);
  }
}
