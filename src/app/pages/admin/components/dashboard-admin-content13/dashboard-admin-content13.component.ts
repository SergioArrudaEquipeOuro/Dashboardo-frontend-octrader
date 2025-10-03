import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Historico, HistoricoService } from 'src/app/services/historico.service';

@Component({
  selector: 'app-dashboard-admin-content13',
  templateUrl: './dashboard-admin-content13.component.html',
  styleUrls: ['./dashboard-admin-content13.component.css']
})
export class DashboardAdminContent13Component implements OnInit {
  loading = false;
  error?: string;

  historicosOriginais: Historico[] = [];
  historicosFiltrados: Historico[] = [];

  viewMode: 'cards' | 'table' = 'cards';

  form: FormGroup;

  // antes: total = signal(0); filtrados = signal(0);
  total = 0;
  filtrados = 0;

  constructor(
    private fb: FormBuilder,
    private historicoService: HistoricoService
  ) {
    this.form = this.fb.group({
      buscaLivre: [''],
      titulo: [''],
      emailCliente: [''],
      emailBrokere: [''],
      assunto: [''],
      autor: [''],
      visibily: ['any'],
      visibilyNotificacao: ['any'],
      ordenarPorDataDesc: [true]
    });
  }

  ngOnInit(): void {
    this.carregar();
    this.form.valueChanges.subscribe(() => this.aplicarFiltros());
  }

  private carregar(): void {
    this.loading = true;
    this.error = undefined;

    this.historicoService.listAll().subscribe({
      next: (dados) => {
        this.historicosOriginais = this.ordenarPorData(dados, true);
        this.historicosFiltrados = [...this.historicosOriginais];

        // antes: this.total.set(...), this.filtrados.set(...)
        this.total = this.historicosOriginais.length;
        this.filtrados = this.historicosFiltrados.length;

        this.loading = false;
      },
      error: (err) => {
        this.error = 'Falha ao carregar históricos.';
        console.error(err);
        this.loading = false;
      }
    });
  }

  private millis(dateStr?: string): number {
    if (!dateStr) return 0;
    const t = Date.parse(dateStr);
    return isNaN(t) ? 0 : t;
  }

  private ordenarPorData(arr: Historico[], desc: boolean): Historico[] {
    return [...arr].sort((a, b) => {
      const ma = this.millis(a.date);
      const mb = this.millis(b.date);
      return desc ? (mb - ma) : (ma - mb);
    });
  }

  aplicarFiltros(): void {
    const {
      buscaLivre, titulo, emailCliente, emailBrokere,
      assunto, autor, visibily, visibilyNotificacao, ordenarPorDataDesc
    } = this.form.value;

    let lista = [...this.historicosOriginais];
    const toStr = (v?: string) => (v ?? '').toLowerCase().trim();

    const fTitulo = toStr(titulo);
    const fEmailCliente = toStr(emailCliente);
    const fEmailBrokere = toStr(emailBrokere);
    const fAssunto = toStr(assunto);
    const fAutor = toStr(autor);
    const fLivre = toStr(buscaLivre);

    if (fTitulo) lista = lista.filter(h => toStr(h.titulo).includes(fTitulo));
    if (fEmailCliente) lista = lista.filter(h => toStr(h.emailCliente).includes(fEmailCliente));
    if (fEmailBrokere) lista = lista.filter(h => toStr(h.emailBrokere).includes(fEmailBrokere));
    if (fAssunto) lista = lista.filter(h => toStr(h.assunto).includes(fAssunto));
    if (fAutor) lista = lista.filter(h => toStr(h.autor).includes(fAutor));

    if (visibily !== 'any') {
      const alvo = String(visibily) === 'true';
      lista = lista.filter(h => h.visibily === alvo);
    }
    if (visibilyNotificacao !== 'any') {
      const alvo = String(visibilyNotificacao) === 'true';
      lista = lista.filter(h => h.visibilyNotificacao === alvo);
    }

    if (fLivre) {
      lista = lista.filter(h => {
        const blocos = [h.titulo, h.assunto, h.autor, h.emailCliente, h.emailBrokere, h.obs].map(toStr);
        return blocos.some(x => x.includes(fLivre));
      });
    }

    lista = this.ordenarPorData(lista, ordenarPorDataDesc);
    this.historicosFiltrados = lista;

    // antes: this.filtrados.set(...)
    this.filtrados = lista.length;
  }

  alternarView(mode: 'cards' | 'table') { this.viewMode = mode; }
  limparFiltros() {
    this.form.reset({
      buscaLivre: '', titulo: '', emailCliente: '', emailBrokere: '',
      assunto: '', autor: '', visibily: 'any', visibilyNotificacao: 'any',
      ordenarPorDataDesc: true
    });
  }
  atualizar() { this.carregar(); }
  trackById(_i: number, h: Historico) { return h.id ?? _i; }
}
