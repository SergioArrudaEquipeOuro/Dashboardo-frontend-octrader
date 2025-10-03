import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CoinService, Memecoin } from 'src/app/services/coin.service';
import {
  createChart,
  type IChartApi,
  ColorType,
  CandlestickSeries,
} from 'lightweight-charts';

@Component({
  selector: 'app-dashboard-admin-content14',
  templateUrl: './dashboard-admin-content14.component.html',
  styleUrls: ['./dashboard-admin-content14.component.css']
})
export class DashboardAdminContent14Component implements OnInit, OnDestroy {

  memecoins: Memecoin[] = [];
  filtradas: Memecoin[] = [];
  selecionada: Memecoin | null = null;

  form!: FormGroup;
  carregando = false;
  salvando = false;
  buscando = false;
  termo = '';

  @HostListener('document:keydown.escape', ['$event'])
  onEsc() { if (this.showChart) this.fecharGrafico(); }

  alerta: { tipo: 'success' | 'danger' | 'warning' | 'info', msg: string } | null = null;

  // controles auxiliares
  emailWhitelist = '';
  qtdHistoricosExcluir: number | null = null;

  // --- gráfico ---
  @ViewChild('chartContainer', { static: false }) chartEl?: ElementRef<HTMLDivElement>;
  showChart = false;
  chartMemecoin: Memecoin | null = null;
  carregandoChart = false;
  limiteVelas = 1000;

  private chart?: IChartApi;
  // pega exatamente o tipo que addSeries retorna (evita incompatibilidades de generics)
  private candleSeries?: ReturnType<IChartApi['addSeries']>;
  public historicoBruto: any[] = [];

  constructor(
    private fb: FormBuilder,
    private coin: CoinService
  ) { }

  ngOnInit(): void {
    this.criarForm();
    this.carregarMemecoins();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.disposeChart();
  }

  private criarForm() {
    this.form = this.fb.group({
      id: [null],
      nome: ['', [Validators.required, Validators.minLength(2)]],
      symbol: ['', [Validators.required, Validators.maxLength(16)]],
      image: ['', [Validators.required]], // <- removido ']' extra
      valorAtual: [0, [Validators.required, Validators.min(0)]],
      valorAlvo: [null],
      variacaoMaxima: [1, [Validators.required, Validators.min(0)]],
      taxa: [0, [Validators.required, Validators.min(0)]],
      aportIn: [null],
      aportOut: [null],
      maxOperacoesHistorico: [5000, [Validators.required, Validators.min(100)]],
      allowAllUsers: [false],
      whitelistedEmails: [[] as string[]]
    });
  }


  private carregarMemecoins() {
    this.buscando = true;
    this.coin.buscarTodasMemecoins().subscribe({
      next: (lista) => {
        this.memecoins = (lista || []).map(m => ({
          ...m,
          whitelistedEmails: m.whitelistedEmails ?? []
        }));
        this.aplicarFiltro();
        console.log(lista)
      },
      error: () => this.showAlert('danger', 'Falha ao carregar memecoins.'),
      complete: () => (this.buscando = false)
    });
  }

  aplicarFiltro() {
    const t = (this.termo || '').toLowerCase().trim();
    this.filtradas = !t
      ? [...this.memecoins]
      : this.memecoins.filter(m =>
        (m.nome || '').toLowerCase().includes(t) ||
        (m.symbol || '').toLowerCase().includes(t)
      );
  }

  novaMemecoin() {
    this.selecionada = null;
    this.form.reset({
      id: null,
      nome: '',
      symbol: '',
      image: '',
      valorAtual: 0,
      valorAlvo: null,
      variacaoMaxima: 1,
      taxa: 0,
      aportIn: null,
      aportOut: null,
      maxOperacoesHistorico: 5000,
      allowAllUsers: false,
      whitelistedEmails: []
    });
    this.emailWhitelist = '';
    this.qtdHistoricosExcluir = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editar(m: Memecoin) {
    this.selecionada = m;
    this.form.patchValue({
      ...m,
      whitelistedEmails: m.whitelistedEmails ?? []
    });
    this.emailWhitelist = '';
    this.qtdHistoricosExcluir = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  salvar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showAlert('warning', 'Preencha os campos obrigatórios.');
      return;
    }

    this.salvando = true;
    const payload: Memecoin = this.form.value;

    const req$ = payload.id
      ? this.coin.atualizarMemecoin(payload.id, payload)
      : this.coin.criarMemecoin(payload);

    req$.subscribe({
      next: (res) => {
        this.showAlert('success', payload.id ? 'Memecoin atualizada.' : 'Memecoin criada.');
        this.carregarMemecoins();
        this.selecionada = res;
        this.form.patchValue(res);
      },
      error: () => this.showAlert('danger', 'Erro ao salvar memecoin.'),
      complete: () => (this.salvando = false)
    });
  }

  confirmarExcluir(m: Memecoin) {
    const ok = confirm(`Excluir a memecoin "${m.nome}"? Esta ação é irreversível.`);
    if (!ok || !m.id) return;

    this.carregando = true;
    this.coin.deletarMemecoin(m.id).subscribe({
      next: () => {
        this.showAlert('success', 'Memecoin excluída com sucesso.');
        this.memecoins = this.memecoins.filter(x => x.id !== m.id);
        this.aplicarFiltro();
        if (this.selecionada?.id === m.id) this.novaMemecoin();
      },
      error: (err) => this.showAlert('danger', err?.error?.error || 'Erro ao excluir memecoin.'),
      complete: () => (this.carregando = false)
    });
  }

  toggleActive(m: Memecoin) {
    if (!m.id) return;
    const novo = !m.active;
    this.coin.atualizarStatusActive(m.id, novo).subscribe({
      next: (res) => {
        m.active = res.active;
        this.showAlert('success', `Status "active" atualizado para ${res.active ? 'ativado' : 'desativado'}.`);
      },
      error: () => this.showAlert('danger', 'Falha ao atualizar status active.')
    });
  }

  toggleAllowAll() {
    const id = this.form.value.id as number | null;
    if (!id) {
      this.showAlert('warning', 'Salve a memecoin antes de alterar permitir todos.');
      return;
    }
    const novo = !this.form.value.allowAllUsers;
    this.coin.atualizarAllowAllUsers(id, novo).subscribe({
      next: (res) => {
        this.form.patchValue({ allowAllUsers: res.allowAllUsers });
        const idx = this.memecoins.findIndex(x => x.id === id);
        if (idx >= 0) this.memecoins[idx].allowAllUsers = res.allowAllUsers;
        this.showAlert('success', `Acesso geral ${res.allowAllUsers ? 'ativado' : 'desativado'}.`);
      },
      error: () => this.showAlert('danger', 'Falha ao atualizar acesso geral.')
    });
  }

  addEmail() {
    const id = this.form.value.id as number | null;
    const email = (this.emailWhitelist || '').trim();
    if (!id) return this.showAlert('warning', 'Salve a memecoin antes de gerenciar a whitelist.');
    if (!email) return;

    this.coin.adicionarEmailWhitelist(id, email).subscribe({
      next: (res) => {
        this.form.patchValue({ whitelistedEmails: res.whitelistedEmails || [] });
        const local = this.memecoins.find(x => x.id === id);
        if (local) local.whitelistedEmails = res.whitelistedEmails || [];
        this.emailWhitelist = '';
        this.showAlert('success', 'E-mail adicionado à whitelist.');
      },
      error: () => this.showAlert('danger', 'Falha ao adicionar e-mail.')
    });
  }

  removeEmail(email: string) {
    const id = this.form.value.id as number | null;
    if (!id) return this.showAlert('warning', 'Salve a memecoin antes de gerenciar a whitelist.');

    this.coin.removerEmailWhitelist(id, email).subscribe({
      next: (res) => {
        this.form.patchValue({ whitelistedEmails: res.whitelistedEmails || [] });
        const local = this.memecoins.find(x => x.id === id);
        if (local) local.whitelistedEmails = res.whitelistedEmails || [];
        this.showAlert('success', 'E-mail removido da whitelist.');
      },
      error: () => this.showAlert('danger', 'Falha ao remover e-mail.')
    });
  }

  excluirHistoricosAntigos() {
    const id = this.form.value.id as number | null;
    const qtd = this.qtdHistoricosExcluir ?? 0;
    if (!id) return this.showAlert('warning', 'Selecione uma memecoin salva.');
    if (qtd <= 0) return this.showAlert('warning', 'Informe uma quantidade válida.');

    this.coin.deletarHistoricosAntigos(id, qtd).subscribe({
      next: (res) => this.showAlert('success', res?.message || `Excluídos ${qtd} históricos antigos.`),
      error: () => this.showAlert('danger', 'Falha ao excluir históricos.')
    });
  }

  // --- GRÁFICO ---
  abrirGrafico(m: Memecoin) {
    if (!m?.id) return;
    this.chartMemecoin = m;
    this.showChart = true;
    this.carregarHistorico(m.id);
    setTimeout(() => this.initChart(), 0);
    window.addEventListener('resize', this.onResize);
  }

  fecharGrafico() {
    this.showChart = false;
    this.chartMemecoin = null;
    this.historicoBruto = [];
    this.disposeChart();
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (this.chart && this.chartEl?.nativeElement) {
      const { clientWidth } = this.chartEl.nativeElement;
      this.chart.applyOptions({ width: clientWidth });
    }
  };

  private initChart() {
    if (!this.chartEl?.nativeElement) return;
    this.disposeChart();

    const container = this.chartEl.nativeElement;

    this.chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      grid: { vertLines: { color: '#eee' }, horzLines: { color: '#f4f4f4' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightOffset: 6, barSpacing: 8 },
      localization: { locale: 'pt-BR' },
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      borderVisible: false,
    });

    const { clientWidth } = container;
    this.chart.applyOptions({ width: clientWidth });
    this.renderizarGrafico();
  }

  private disposeChart() {
    if (this.chart) {
      this.chart.remove();
      this.chart = undefined;
      this.candleSeries = undefined;
    }
  }

  private carregarHistorico(memecoinId: number) {
    this.carregandoChart = true;
    this.coin.obterHistorico(memecoinId).subscribe({
      next: (hist) => {
        this.historicoBruto = Array.isArray(hist) ? hist : [];
        this.renderizarGrafico();
      },
      error: () => { this.historicoBruto = []; },
      complete: () => { this.carregandoChart = false; }
    });
  }

  recarregarHistorico() {
    if (!this.chartMemecoin?.id) return;
    this.carregarHistorico(this.chartMemecoin.id);
  }

  renderizarGrafico() {
    if (!this.chart || !this.candleSeries) return;

    const ordenado = [...this.historicoBruto].sort(
      (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
    );

    const data = (this.limiteVelas ? ordenado.slice(-this.limiteVelas) : ordenado)
      .map((h: any) => ({
        time: Math.floor(new Date(h.dataHora).getTime() / 1000),
        open: Number(h.valorAbertura),
        high: Number(h.valorMaximo),
        low: Number(h.valorMinimo),
        close: Number(h.valorFechamento),
      }));

    // @ts-expect-error – o tipo inferido de series data varia por versão; os campos estão corretos
    this.candleSeries.setData(data);
    this.chart.timeScale().fitContent();
  }

  private showAlert(tipo: 'success' | 'danger' | 'warning' | 'info', msg: string) {
    this.alerta = { tipo, msg };
    setTimeout(() => (this.alerta = null), 4000);
  }

  // Helpers de UI
  f(c: string) { return this.form.get(c); }
  invalido(c: string) {
    const ctl = this.f(c);
    return !!ctl && ctl.invalid && (ctl.touched || ctl.dirty);
  }
}
