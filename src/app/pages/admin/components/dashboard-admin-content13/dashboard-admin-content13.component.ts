import { Component, HostListener, Input, OnInit } from '@angular/core';
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
  @Input() user: any;

  historicosOriginais: Historico[] = [];
  historicosFiltrados: Historico[] = [];

  // Página
  readonly pageSize = 10;              // máximo 20 por página
  paginaAtual = 1;                     // começa na 1

  viewMode: 'cards' | 'table' = 'cards';

  form: FormGroup;

  total = 0;
  filtrados = 0;

  uniqueTitulos: string[] = [];
  uniqueAssuntos: string[] = [];

  // Menus por item
  rowMenuOpenId: number | null = null;

  // Edição
  editOpen = false;
  editSaving = false;
  editTarget?: Historico;
  editForm!: FormGroup;

  // Delete
  deleteOpen = false;
  deleteTarget?: Historico;
  deletePassword = '';
  deleteError?: string;

  // Chips de filtros
  activeFilterChips: string[] = [];

  constructor(
    private fb: FormBuilder,
    private historicoService: HistoricoService
  ) {
    // filtros
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

    // form do modal de edição
    this.editForm = this.fb.group({
      id: [null],
      titulo: [''],
      assunto: [''],
      autor: [''],
      emailCliente: [''],
      emailBrokere: [''],
      obs: [''],
      visibily: [true],
      visibilyNotificacao: [false],
      date: [''] // string ISO
    });
  }

  ngOnInit(): void {
    this.carregar();
    this.form.valueChanges.subscribe(() => {
      this.aplicarFiltros();   // sempre filtra sobre TODOS os históricos
      this.firstPage();        // e volta para a página 1
    });
  }

  /* =========================
     Carregamento + opções únicas
     ========================= */
  private carregar(): void {
    this.loading = true;
    this.error = undefined;

    this.historicoService.listAll().subscribe({
      next: (dados) => {
        this.historicosOriginais = this.ordenarPorData(dados ?? [], true);
        this.historicosFiltrados = [...this.historicosOriginais];

        this.total = this.historicosOriginais.length;
        this.filtrados = this.historicosFiltrados.length;

        this.computeUniqueOptions();
        this.buildActiveFilterChips();
        this.paginaAtual = 1; // reset
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Falha ao carregar históricos.';
        console.error(err);
        this.loading = false;
      }
    });
  }

  private computeUniqueOptions(): void {
    const norm = (s?: string) => (s ?? '').trim();
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

    const mapTit = new Map<string, string>();
    const mapAss = new Map<string, string>();

    for (const h of this.historicosOriginais) {
      const t = norm(h.titulo);
      if (t) {
        const k = t.toLowerCase();
        if (!mapTit.has(k)) mapTit.set(k, t);
      }
      const a = norm(h.assunto);
      if (a) {
        const k = a.toLowerCase();
        if (!mapAss.has(k)) mapAss.set(k, a);
      }
    }

    this.uniqueTitulos = Array.from(mapTit.values()).sort(collator.compare);
    this.uniqueAssuntos = Array.from(mapAss.values()).sort(collator.compare);
  }

  /* =========================
     Filtros / ordenação
     ========================= */
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

    let lista = [...this.historicosOriginais]; // FILTRA SOBRE TODOS

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
    this.filtrados = lista.length;

    // Se a página atual ficou fora do range, volta pra 1
    if (this.paginaAtual > this.totalPaginas) this.paginaAtual = 1;

    // atualiza chips
    this.buildActiveFilterChips();
  }

  /* =========================
     Paginação
     ========================= */
  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.historicosFiltrados.length / this.pageSize));
  }

  get inicioPagina(): number {
    return (this.paginaAtual - 1) * this.pageSize;
  }

  get fimPagina(): number {
    return Math.min(this.inicioPagina + this.pageSize, this.historicosFiltrados.length);
  }

  get paginaHistoricos(): Historico[] {
    return this.historicosFiltrados.slice(this.inicioPagina, this.fimPagina);
  }

  setPage(p: number) {
    const alvo = Math.min(Math.max(1, p), this.totalPaginas);
    if (alvo !== this.paginaAtual) {
      this.paginaAtual = alvo;
      this.scrollToTop();
    }
  }

  nextPage() { this.setPage(this.paginaAtual + 1); }
  prevPage() { this.setPage(this.paginaAtual - 1); }
  firstPage() { this.setPage(1); }
  lastPage() { this.setPage(this.totalPaginas); }

  private scrollToTop() {
    try {
      // sobe a página para início do conteúdo
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { /* noop */ }
  }

  /* =========================
     Chips de filtros ativos
     ========================= */
  private buildActiveFilterChips(): void {
    const v = this.form.value;
    const chips: string[] = [];

    const pushIf = (label: string, val?: string) => {
      const t = (val ?? '').trim();
      if (t) chips.push(`${label}: ${t}`);
    };

    pushIf('Busca', v.buscaLivre);
    pushIf('Título', v.titulo);
    pushIf('Assunto', v.assunto);
    pushIf('Autor', v.autor);
    pushIf('Email cliente', v.emailCliente);
    pushIf('Email broker', v.emailBrokere);

    if (v.visibily !== 'any') chips.push(`Visível: ${String(v.visibily) === 'true' ? 'Sim' : 'Não'}`);
    if (v.visibilyNotificacao !== 'any') chips.push(`Notificação: ${String(v.visibilyNotificacao) === 'true' ? 'Ativa' : 'Inativa'}`);

    chips.push(`Ordenação: ${v.ordenarPorDataDesc ? 'Mais novo → antigo' : 'Mais antigo → novo'}`);

    this.activeFilterChips = chips;
  }

  trackByChip(_i: number, chip: string) { return chip; }

  /* =========================
     UI helpers
     ========================= */
  alternarView(mode: 'cards' | 'table') { this.viewMode = mode; }
  limparFiltros() {
    this.form.reset({
      buscaLivre: '', titulo: '', emailCliente: '', emailBrokere: '',
      assunto: '', autor: '', visibily: 'any', visibilyNotificacao: 'any',
      ordenarPorDataDesc: true
    });
    this.firstPage();
  }
  atualizar() { this.carregar(); }
  trackById(_i: number, h: Historico) { return h.id ?? _i; }

  /* =========================
     Menus de ação
     ========================= */
  toggleRowMenu(id: number) {
    this.rowMenuOpenId = (this.rowMenuOpenId === id) ? null : id;
  }

  onRootClick() {
    this.rowMenuOpenId = null;
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.rowMenuOpenId = null;
    if (this.editOpen) this.closeEdit();
    if (this.deleteOpen) this.closeDelete();
  }

  /* =========================
     Editar
     ========================= */
  openEdit(h: Historico, ev?: Event) {
    ev?.stopPropagation();
    this.editTarget = { ...h };
    this.editForm.setValue({
      id: h.id ?? null,
      titulo: h.titulo ?? '',
      assunto: h.assunto ?? '',
      autor: h.autor ?? '',
      emailCliente: h.emailCliente ?? '',
      emailBrokere: h.emailBrokere ?? '',
      obs: h.obs ?? '',
      visibily: h.visibily ?? false,
      visibilyNotificacao: h.visibilyNotificacao ?? false,
      date: h.date ?? ''
    });
    this.editOpen = true;
    this.rowMenuOpenId = null;
  }

  closeEdit() {
    if (this.editSaving) return;
    this.editOpen = false;
    this.editTarget = undefined;
  }

  saveEdit() {
    if (!this.editTarget?.id) return;
    const id = this.editTarget.id;

    const payload: Historico = {
      id,
      ...this.editForm.value
    };

    this.editSaving = true;
    this.historicoService.update(id, payload).subscribe({
      next: (updated) => {
        // Atualiza listas
        const apply = (arr: Historico[]) => {
          const i = arr.findIndex(x => x.id === id);
          if (i >= 0) arr[i] = { ...arr[i], ...updated };
        };
        apply(this.historicosOriginais);
        apply(this.historicosFiltrados);

        // Atualiza filtros e paginação
        this.computeUniqueOptions();
        this.aplicarFiltros();

        this.editSaving = false;
        this.closeEdit();
      },
      error: (err) => {
        console.error(err);
        this.editSaving = false;
        alert('Falha ao salvar edição.');
      }
    });
  }

  /* =========================
     Deletar (senha "delete")
     ========================= */
  openDelete(h: Historico, ev?: Event) {
    ev?.stopPropagation();
    this.deleteTarget = h;
    this.deletePassword = '';
    this.deleteError = undefined;
    this.deleteOpen = true;
    this.rowMenuOpenId = null;
  }

  closeDelete() {
    this.deleteOpen = false;
    this.deleteTarget = undefined;
    this.deletePassword = '';
    this.deleteError = undefined;
  }

  confirmDelete() {
    if (!this.deleteTarget?.id) return;
    if (this.deletePassword !== 'delete') {
      this.deleteError = 'Senha inválida. Digite exatamente: delete';
      return;
    }

    const id = this.deleteTarget.id;
    this.historicoService.delete(id).subscribe({
      next: () => {
        this.historicosOriginais = this.historicosOriginais.filter(h => h.id !== id);
        this.historicosFiltrados = this.historicosFiltrados.filter(h => h.id !== id);

        this.total = this.historicosOriginais.length;
        this.filtrados = this.historicosFiltrados.length;

        this.computeUniqueOptions();
        this.aplicarFiltros();   // revalida paginação
        this.closeDelete();
      },
      error: (err) => {
        console.error(err);
        this.deleteError = 'Falha ao deletar. Tente novamente.';
      }
    });
  }
}
