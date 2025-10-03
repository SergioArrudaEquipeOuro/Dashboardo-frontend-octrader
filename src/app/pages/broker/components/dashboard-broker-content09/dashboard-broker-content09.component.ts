import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { KeyPass } from 'src/app/models/keyPass';
import { KeyPassService } from 'src/app/services/key-pass.service';

type OrderPos = 'primeiro' | 'segundo' | 'terceiro';
type OrderOpt = '' | 'SALDO' | 'CREDITO' | 'EMPRESTIMO';

@Component({
  selector: 'app-dashboard-broker-content09',
  templateUrl: './dashboard-broker-content09.component.html',
  styleUrls: ['./dashboard-broker-content09.component.css']
})
export class DashboardBrokerContent09Component implements OnInit, OnChanges {

  @Input() user: any;
  @Input() activeEnterprise: any;

  today: string = this.formatLocalDate(new Date());

  keyPasses: KeyPass[] = [];
  filteredKeyPasses: KeyPass[] = [];
  deletingId: number | null = null;

  // filtros
  filters: any = { codKeyPass: '', ativo: '', dataInicio: '', dataFim: '' };

  // modal novo keypass
  showCreateModal = false;
  showConfirmModal = false;
  isSaving = false;
  alertType: 'success' | 'danger' | '' = '';
  alertMessage = '';

  // simulação na prévia
  simBase = 100;
  get projectedValue(): number {
    const base = Number(this.simBase) || 0;
    const pct = Number(this.newKeyPass.projecao ?? 0) || 0;
    return base * (1 + pct / 100);
  }

  newKeyPass: Partial<KeyPass & { dataInicioLocal?: string; dataFimLocal?: string }> = {
    robotExpiration: undefined,
    emailBroker: '',
    primeiro: 'SALDO',
    segundo: 'CREDITO',
    terceiro: 'EMPRESTIMO',
    ativo: false,
    robotExpirationPermissao: false,
    permissaoClienteDeleteBot: false,
    valorDiarioNegativo: false,
    sacar: false,
    loss: false,
    projecao: undefined,
  };

  constructor(private keyPassService: KeyPassService) { }

  ngOnInit(): void { if (this.user?.id) this.loadKeyPasses(); }
  ngOnChanges(changes: SimpleChanges): void { if (changes['user'] && this.user?.id) this.loadKeyPasses(); }

  // ===== helpers de data =====
  private parseISODate(value?: string): Date | null { if (!value) return null; const d = new Date(value); return isNaN(d.getTime()) ? null : d; }

  private parseLocalDateInput(value?: string): Date | null {
    if (!value) return null; const p = value.split('-'); if (p.length !== 3) return null;
    const d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d.getTime()) ? null : d;
  }

private localDateToUTCISO(dateStr?: string, isEndDate: boolean = false): string | undefined {
    if (!dateStr) return undefined; 
    const [y, m, d] = dateStr.split('-').map(Number);
    
    // Configura horas, minutos, segundos e milissegundos
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let milliseconds = 0;
    
    if (isEndDate) {
        // Para data fim: 23:59:59.999
        hours = 23;
        minutes = 59;
        seconds = 59;
        milliseconds = 999;
    }
    
    const local = new Date(y, (m || 1) - 1, d || 1, hours, minutes, seconds, milliseconds);
    return new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

  // ===== listagem =====
  loadKeyPasses() {
    this.keyPassService.getKeyPassesByBroker(this.user.id).subscribe({
      next: res => { this.keyPasses = res ?? []; this.filteredKeyPasses = [...this.keyPasses]; this.applyFilters(); },
      error: err => console.error('Erro ao carregar keyPasses', err)
    });
  }

  applyFilters() {
    const codFiltro = (this.filters.codKeyPass ?? '').toLowerCase().trim();
    const filtroAtivo = this.filters.ativo;
    const dIni = this.parseLocalDateInput(this.filters.dataInicio);
    const dFim = this.parseLocalDateInput(this.filters.dataFim); if (dFim) dFim.setHours(23, 59, 59, 999);

    this.filteredKeyPasses = this.keyPasses.filter(kp => {
      const cod = (kp.codKeyPass ?? '').toLowerCase();
      const ativoOk = filtroAtivo === '' || kp.ativo === (filtroAtivo === 'true');
      const ki = this.parseISODate(kp.dataInicio), kf = this.parseISODate(kp.dataFim);
      const iniOk = !dIni || (ki && ki >= dIni);
      const fimOk = !dFim || (kf && kf <= dFim);
      const codOk = !codFiltro || cod.includes(codFiltro);
      return codOk && ativoOk && iniOk && fimOk;
    });
  }

  resetFilters() { this.filters = { codKeyPass: '', ativo: '', dataInicio: '', dataFim: '' }; this.filteredKeyPasses = [...this.keyPasses]; }
  trackById(_i: number, kp: KeyPass) { return kp.id; }

  // ===== modal criação =====
  openCreateModal() {
    this.newKeyPass = {
      robotExpiration: undefined,
      emailBroker: this.user?.email ?? '',
      primeiro: 'SALDO', segundo: 'CREDITO', terceiro: 'EMPRESTIMO',
      ativo: false, robotExpirationPermissao: false, permissaoClienteDeleteBot: false,
      valorDiarioNegativo: false, sacar: false, loss: false, projecao: undefined,
      dataInicioLocal: '', dataFimLocal: ''
    };
    this.simBase = 100;
    this.showCreateModal = true;
    document.body.classList.add('modal-open');
    this.alertType = ''; this.alertMessage = '';
  }
  closeCreateModal() { this.showCreateModal = false; document.body.classList.remove('modal-open'); this.isSaving = false; this.alertType = ''; this.alertMessage = ''; }

  validateDates() {
    this.alertType = '';
    this.alertMessage = '';

    const i = this.newKeyPass.dataInicioLocal;
    const f = this.newKeyPass.dataFimLocal;

    if (i && i < this.today) {
      this.alertType = 'danger';
      this.alertMessage = 'A data de início não pode ser antes de hoje.';
      this.newKeyPass.dataInicioLocal = '';
      return;
    }

    if (i && f && f < i) {
      this.alertType = 'danger';
      this.alertMessage = 'A data de fim não pode ser antes da data de início.';
      this.newKeyPass.dataFimLocal = '';
      return;
    }

    // ===== Validação de limite de dias =====
    if (i && f) {
      const start = this.parseLocalDateInput(i);
      const end = this.parseLocalDateInput(f);
      if (start && end) {
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const limite = this.activeEnterprise?.limiteDiasOperacaoBot ?? 40;

        if (diffDays > limite) {
          this.alertType = 'danger';
          this.alertMessage = `O período não pode exceder ${limite} dias.`;
          this.newKeyPass.dataFimLocal = '';
          return;
        }
      }
    }
  }


  // ===== selects (sem duplicados; primeiro não pode NONE) =====
  isOptionDisabled(opt: OrderOpt, current: OrderPos): boolean {
    if (opt === '') return false; // NONE pode repetir (mas não existe no primeiro select)
    const a = this.newKeyPass.primeiro as OrderOpt || '';
    const b = this.newKeyPass.segundo as OrderOpt || '';
    const c = this.newKeyPass.terceiro as OrderOpt || '';
    if (current === 'primeiro') return opt === b || opt === c;
    if (current === 'segundo') return opt === a || opt === c;
    return opt === a || opt === b;
  }
  onOrderChange(_pos: OrderPos) {
    // segurança extra contra duplicidades
    const vals: Record<OrderPos, OrderOpt> = {
      primeiro: (this.newKeyPass.primeiro as OrderOpt) || '',
      segundo: (this.newKeyPass.segundo as OrderOpt) || '',
      terceiro: (this.newKeyPass.terceiro as OrderOpt) || '',
    };
    const keys: OrderPos[] = ['primeiro', 'segundo', 'terceiro'];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const ki = keys[i], kj = keys[j];
        if (vals[ki] && vals[ki] === vals[kj]) { (this.newKeyPass as any)[kj] = ''; vals[kj] = ''; }
      }
    }
    // primeiro não pode NONE
    if (!this.newKeyPass.primeiro) { this.newKeyPass.primeiro = 'SALDO'; }
  }

  // ===== loss força “sacar” =====
  onLossToggle() {
    if (this.newKeyPass.loss) { this.newKeyPass.sacar = true; }
  }

  // ===== prévia =====
  prepareSave() {
    if (!this.newKeyPass.dataInicioLocal || !this.newKeyPass.dataFimLocal) {
      this.alertType = 'danger'; this.alertMessage = 'Data de início e data de fim são obrigatórias.'; return;
    }
    if (this.newKeyPass.dataInicioLocal < this.today) {
      this.alertType = 'danger'; this.alertMessage = 'A data de início não pode ser antes de hoje.'; return;
    }
    if (this.newKeyPass.dataFimLocal < this.newKeyPass.dataInicioLocal) {
      this.alertType = 'danger'; this.alertMessage = 'A data de fim não pode ser antes da data de início.'; return;
    }
    // primeiro obrigatório
    if (!this.newKeyPass.primeiro) {
      this.alertType = 'danger'; this.alertMessage = 'Selecione a primeira fonte (Primeiro) diferente de NONE.'; return;
    }
    this.showConfirmModal = true;
    document.body.classList.add('modal-open');
  }
  closeConfirmModal() { this.showConfirmModal = false; document.body.classList.remove('modal-open'); }

  // ===== salvar =====
confirmSave() {
    this.onOrderChange('primeiro'); // sanity
    if (!this.newKeyPass.primeiro) { this.newKeyPass.primeiro = 'SALDO'; }

    const payload: any = {
        robotExpiration: this.newKeyPass.robotExpiration ?? undefined,
        emailBroker: (this.newKeyPass.emailBroker ?? '').trim() || undefined,
        primeiro: this.newKeyPass.primeiro || undefined,
        segundo: this.newKeyPass.segundo || undefined,
        terceiro: this.newKeyPass.terceiro || undefined,
        dataInicio: this.localDateToUTCISO(this.newKeyPass.dataInicioLocal, false), // início do dia
        dataFim: this.localDateToUTCISO(this.newKeyPass.dataFimLocal, true), // fim do dia (23:59:59)
        ativo: false,
        robotExpirationPermissao: !!this.newKeyPass.robotExpirationPermissao,
        permissaoClienteDeleteBot: !!this.newKeyPass.permissaoClienteDeleteBot,
        valorDiarioNegativo: !!this.newKeyPass.valorDiarioNegativo,
        sacar: !!this.newKeyPass.sacar,
        loss: !!this.newKeyPass.loss,
        projecao: this.newKeyPass.projecao ?? undefined,
    };

    this.isSaving = true;
    this.keyPassService.createKeyPass(this.user.id, payload).subscribe({
        next: () => { this.isSaving = false; this.closeConfirmModal(); this.closeCreateModal(); this.loadKeyPasses(); },
        error: err => { this.isSaving = false; this.alertType = 'danger'; this.alertMessage = err?.error?.error || 'Falha ao criar KeyPass'; }
    });
}

  // ===== deletar keypass (apenas inativos) =====
  onDeleteKeyPass(kp: KeyPass) {
    if (kp.ativo) return;
    const ok = confirm(`Confirma excluir o KeyPass #${kp.id} (${kp.codKeyPass || '-'})?`);
    if (!ok) return;
    this.deletingId = kp.id;
    this.keyPassService.deleteKeyPass(kp.id).subscribe({
      next: () => { this.deletingId = null; this.keyPasses = this.keyPasses.filter(x => x.id !== kp.id); this.applyFilters(); },
      error: err => { this.deletingId = null; this.alertType = 'danger'; this.alertMessage = err?.error || 'Falha ao excluir KeyPass'; console.error('Erro ao deletar KeyPass', err); }
    });
  }

  // Define/atualiza o valor padrão (30) quando habilitar "Permitir expiração"
  onRobotPermToggle(): void {
    let days = this.activeEnterprise.historicoAutoDeleteDias;
    if (this.newKeyPass.robotExpirationPermissao) {
      // se não tiver valor ou for < 1, seta 30
      const v = Number(this.newKeyPass.robotExpiration || 0);
      this.newKeyPass.robotExpiration = v >= 1 ? v : days;
    } else {
      // se desabilitar, você pode manter o valor ou limpar. Aqui vamos manter.
      // this.newKeyPass.robotExpiration = undefined; // se preferir limpar, descomente
    }
  }

  // Lucro projetado = resultado - base
  get projectedProfit(): number {
    const base = Number(this.simBase) || 0;
    return this.projectedValue - base;
  }

  private formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
