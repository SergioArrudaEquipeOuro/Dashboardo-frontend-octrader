import {
  Component, Input, OnInit, OnChanges, SimpleChanges,
  ViewChild, ElementRef, AfterViewInit, HostListener
} from '@angular/core';
import { Bot } from 'src/app/models/bot';

type Key = 'indices' | 'stocks' | 'crypto' | 'forex' | 'commodities';

interface Pos {
  x: number; y: number;
  r: number; size: number;
  fixed?: boolean;
}

@Component({
  selector: 'app-painel-client07',
  templateUrl: './painel-client07.component.html',
  styleUrls: ['./painel-client07.component.css']
})
export class PainelClient07Component implements OnInit, OnChanges, AfterViewInit {

  @Input() bots: Bot[] = [];

  @ViewChild('stage', { static: true }) stageRef!: ElementRef<HTMLDivElement>;

  // Paleta fixa do projeto
  indices     = { label: 'Índices',     color: '#ff7a3d', value: 0 };
  stocks      = { label: 'Ações',       color: '#2ac3fd', value: 0 }; // central (fixa)
  crypto      = { label: 'Cripto',      color: '#00ff84', value: 0 };
  forex       = { label: 'Forex',       color: '#ffd84a', value: 0 };
  commodities = { label: 'Commodities', color: '#ff6ad5', value: 0 };

  // posições calculadas
  private pos: Record<Key, Pos> = {
    indices:     { x: 0, y: 0, r: 0, size: 0 },
    stocks:      { x: 0, y: 0, r: 0, size: 0, fixed: true }, // mantém no centro
    crypto:      { x: 0, y: 0, r: 0, size: 0 },
    forex:       { x: 0, y: 0, r: 0, size: 0 },
    commodities: { x: 0, y: 0, r: 0, size: 0 },
  };

  ngOnInit(): void { this.buildBubbles(); }
  ngAfterViewInit(): void { this.layoutBubbles(); }

  @HostListener('window:resize') onResize() { this.layoutBubbles(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bots']) {
      this.buildBubbles();
      this.layoutBubbles();
    }
  }

  /** Soma e % por categoria */
  private buildBubbles(): void {
    const norm = (s?: string) => (s || '').toLowerCase().trim();
    const sums = { indices: 0, stocks: 0, crypto: 0, forex: 0, commodities: 0 };

    for (const b of (this.bots || [])) {
      const dir = norm((b as any).direcaoMercado);
      const saldo = this.safeSaldo((b as any).saldo);
      if (dir in sums) (sums as any)[dir] += saldo;
    }

    const total = Object.values(sums).reduce((a, b) => a + b, 0);
    const toPct = (v: number) => total > 0 ? (v / total) * 100 : 0;

    this.indices.value     = +toPct(sums.indices).toFixed(2);
    this.stocks.value      = +toPct(sums.stocks).toFixed(2);
    this.crypto.value      = +toPct(sums.crypto).toFixed(2);
    this.forex.value       = +toPct(sums.forex).toFixed(2);
    this.commodities.value = +toPct(sums.commodities).toFixed(2);
  }

  private safeSaldo(v: any): number {
    return (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
  }

  /** Mapeia a % para tamanho da bolha (px) */
  bubbleSize(percent: number): number {
    const size = 36 + percent * 1.6;
    return Math.round(Math.max(42, Math.min(size, 160)));
  }

  formatPct(v: number): string {
    if (Number.isInteger(v)) return v < 10 ? v.toFixed(1) + '%' : v + '%';
    return v.toFixed(1) + '%';
  }

  /** ---- LAYOUT SEM COLISÕES ---- */
  private layoutBubbles(): void {
    const stage = this.stageRef?.nativeElement;
    if (!stage) return;

    const w = stage.clientWidth || 360;
    const h = stage.clientHeight || 260;
    const pad = 6; // gap entre bolhas

    // preparar tamanhos/raios
    const keys: Key[] = ['indices', 'crypto', 'stocks', 'forex', 'commodities'];
    for (const k of keys) {
      const val = (this as any)[k].value as number;
      const size = this.bubbleSize(val);
      this.pos[k].size = size;
      this.pos[k].r = size / 2;
    }

    // âncoras iniciais semelhantes ao layout original
    const anchor: Record<Key, { x: number; y: number }> = {
      indices:     { x: 0.28 * w, y: 0.22 * h },
      crypto:      { x: 0.70 * w, y: 0.22 * h },
      stocks:      { x: 0.50 * w, y: 0.50 * h },
      forex:       { x: 0.45 * w, y: 0.78 * h },
      commodities: { x: 0.70 * w, y: 0.78 * h },
    };
    for (const k of keys) {
      this.pos[k].x = anchor[k].x;
      this.pos[k].y = anchor[k].y;
    }

    // resolve colisões (repulsão simples)
    const clamp = (p: Pos) => {
      p.x = Math.max(p.r + pad, Math.min(w - p.r - pad, p.x));
      p.y = Math.max(p.r + pad, Math.min(h - p.r - pad, p.y));
    };

    let iter = 0;
    const maxIter = 180;
    while (iter++ < maxIter) {
      let moved = false;

      for (let i = 0; i < keys.length; i++) {
        const ki = keys[i];
        const bi = this.pos[ki];

        for (let j = i + 1; j < keys.length; j++) {
          const kj = keys[j];
          const bj = this.pos[kj];

          let dx = bj.x - bi.x;
          let dy = bj.y - bi.y;
          let dist = Math.hypot(dx, dy) || 0.001;

          const minDist = bi.r + bj.r + pad;
          if (dist < minDist) {
            const overlap = (minDist - dist);
            const ux = dx / dist, uy = dy / dist;

            const moveI = bi.fixed ? 0 : overlap * 0.5;
            const moveJ = bj.fixed ? overlap : overlap * 0.5;

            bi.x -= ux * moveI; bi.y -= uy * moveI; clamp(bi);
            bj.x += ux * moveJ; bj.y += uy * moveJ; clamp(bj);

            moved = true;
          }
        }
      }
      if (!moved) break;
    }

    // fallback: se ainda houver colisão, reduzir levemente e tentar de novo
    if (this.anyCollision(keys, pad)) {
      for (const k of keys) { this.pos[k].r *= 0.94; this.pos[k].size = this.pos[k].r * 2; }
      this.layoutBubbles();
      return;
    }
  }

  private anyCollision(keys: Key[], pad: number): boolean {
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = this.pos[keys[i]], b = this.pos[keys[j]];
        if (Math.hypot(b.x - a.x) + Math.hypot(b.y - a.y) < a.r + b.r + pad - 0.5) return true;
      }
    }
    return false;
  }

  /** estilo inline de cada bolha (pos, size e z-index). Cor vem do [style.--c] no HTML */
  styleBubble(k: Key) {
    const info = (this as any)[k] as { value: number };
    const p = this.pos[k];
    const size = p.size || this.bubbleSize(info.value);
    const zi = 1000 + Math.round(1000 - size); // menores por cima

    return {
      width: `${size}px`,
      height: `${size}px`,
      left: `${p.x}px`,
      top: `${p.y}px`,
      zIndex: zi
    } as const;
  }
}
