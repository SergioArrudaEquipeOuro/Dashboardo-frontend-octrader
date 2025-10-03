import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Bot } from 'src/app/models/bot';                    // ajuste o path se necessário
import { BotService } from 'src/app/services/bot.service';   // ajuste o path se necessário

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css']
})
export class ContentComponent implements OnInit, OnChanges, OnDestroy {

  @Input() user: any;

  bots: Bot[] = [];
  loading = false;
  error?: string;

  private sub?: Subscription;

  constructor(private botService: BotService) { }

  ngOnInit(): void {
    this.tryFetch();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      this.tryFetch();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Tenta buscar se houver um ID válido no user */
  private tryFetch(): void {
    const id = this.getUsuarioId(this.user);
    if (!id) {
      // console.warn('[ContentComponent] Usuário sem ID válido ainda.', this.user);
      return;
    }
    this.fetchBots(id);
  }

  /** Faz a chamada ao serviço e salva em this.bots */
  private fetchBots(usuarioId: number): void {
    this.loading = true;
    this.error = undefined;

    this.sub?.unsubscribe();
    this.sub = this.botService.getByUsuarioId(usuarioId).subscribe({
      next: (bots) => {
        this.bots = bots ?? [];
        // LOG: lista todos os bots no console
        //console.log('[Bots do usuário]', usuarioId, this.bots);
        //try { console.table(this.bots); } catch { /* console.table pode não existir em alguns ambientes */ }
      },
      error: (err) => {
        this.error = 'Falha ao carregar bots.';
        console.error('Erro ao buscar bots do usuário', usuarioId, err);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  /** Botão Manual para recarregar */
  refresh(): void {
    const id = this.getUsuarioId(this.user);
    if (id) this.fetchBots(id);
  }

  /** Tenta descobrir o ID do usuário em diferentes chaves comuns */
  private getUsuarioId(u: any): number | undefined {
    if (!u) return undefined;
    const raw = u.id ?? u.usuarioId ?? u.userId ?? u.ID;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }
}
