import { Component, Input, OnInit } from '@angular/core';
import { RendaFixaService, CofrinhoRendaFixa } from 'src/app/services/renda-fixa.service';

@Component({
  selector: 'app-painel-adm02',
  templateUrl: './painel-adm02.component.html',
  styleUrls: ['./painel-adm02.component.css']
})
export class PainelAdm02Component implements OnInit {
  @Input() activeEnterprise: any;
  loading = false;
  cofrinhos: CofrinhoRendaFixa[] = [];

  stats = {
    totalCofrinhos: 0,
    totalSaldo: 0,
    taxaTexto: '—',
    taxaDetalhe: '',
    usuariosComCofrinho: 0
  };

  constructor(private rendaFixa: RendaFixaService) { 
    
  }

  ngOnInit(): void {
    
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.rendaFixa.listarTodos().subscribe({
      next: (list) => {
        this.cofrinhos = Array.isArray(list) ? list : [];
        this.computeStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('[Adm02] erro ao listar cofrinhos:', err);
        this.cofrinhos = [];
        this.computeStats(); // zera de forma segura
        this.loading = false;
      }
    });
  }

  private computeStats(): void {
    const cs = this.cofrinhos || [];

    // 1) Quantos cofrinhos
    const totalCofrinhos = cs.length;

    // 2) Valor total somado (saldos atuais)
    const totalSaldo = cs.reduce((acc, c) => acc + (this.num(c.saldo)), 0);

    // 3) Taxa atual (multiplicadorSobreCdi → porcentagem do CDI)
    const mults = cs
      .map(c => this.num(c.multiplicadorSobreCdi))
      .filter(v => Number.isFinite(v) && v > 0);

    let taxaTexto = '—';
    let taxaDetalhe = '';

    if (mults.length > 0) {
      const min = Math.min(...mults);
      const max = Math.max(...mults);
      const avg = mults.reduce((a, b) => a + b, 0) / mults.length;

      const toPct = (x: number) => `${Math.round(x * 100)}% do CDI`;

      if (this.almostEqual(min, max)) {
        // todos iguais → exibir um único valor
        taxaTexto = toPct(min);
        taxaDetalhe = `aplicado em ${mults.length} cofrinho(s)`;
      } else {
        // variados → exibir média e faixa
        taxaTexto = `${toPct(avg)} (média)`;
        taxaDetalhe = `faixa ${toPct(min)} — ${toPct(max)}`;
      }
    }

    // 4) Usuários com cofrinho (distintos)
    const userKeys = new Set<string | number>();
    for (const c of cs) {
      const u = c.usuario as any;
      const key = (u?.id ?? u?.usuarioId ?? u?.email ?? u?.login ?? undefined);
      if (key !== undefined) userKeys.add(key);
    }
    const usuariosComCofrinho = userKeys.size;

    this.stats = {
      totalCofrinhos,
      totalSaldo: +totalSaldo.toFixed(2),
      taxaTexto,
      taxaDetalhe,
      usuariosComCofrinho
    };
  }

  private num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private almostEqual(a: number, b: number, eps = 1e-6): boolean {
    return Math.abs(a - b) <= eps;
  }
}
