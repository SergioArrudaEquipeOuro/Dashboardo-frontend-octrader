import { Component, OnInit } from '@angular/core';
import { HistoricoBot, HistoricoBotService } from 'src/app/services/historico-bot.service';

@Component({
  selector: 'app-admin-painel07',
  templateUrl: './admin-painel07.component.html',
  styleUrls: ['./admin-painel07.component.css']
})
export class AdminPainel07Component implements OnInit {

  loading = false;
  errorMsg: string | null = null;
  historicos: HistoricoBot[] = [];

  constructor(private hbService: HistoricoBotService) { }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = null;
    this.hbService.getAll().subscribe({
      next: (list) => {
        // ordena do mais recente p/ o mais antigo (por date)
        this.historicos = (list || []).sort((a, b) => {
          const da = new Date(a.date || 0).getTime();
          const db = new Date(b.date || 0).getTime();
          return db - da;
        });
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || err?.message || 'Falha ao carregar histórico.';
        this.loading = false;
      }
    });
  }

  // helpers de exibição
  fmtPct(v?: number) {
    if (v === null || v === undefined) return '—';
    return `${v.toFixed(2)}%`;
  }

  fmtNum(v?: number, digits: string = '1.2-2') {
    if (v === null || v === undefined) return '—';
    // Apenas para manter consistência de exibição; no HTML usamos pipes do Angular.
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