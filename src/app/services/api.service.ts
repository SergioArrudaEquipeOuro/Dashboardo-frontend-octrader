// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export type MarketCategory = 'forex' | 'indices' | 'commodities' | 'crypto' | 'stocks';

export type IntradayInterval = '1min' | '5min' | '15min' | '30min';

export interface Candle {
  t: string;  // ISO-8601 UTC
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface SymbolHistoryResponse {
  symbol: string;
  timezone: string; // "UTC"
  intervals: Record<IntradayInterval, Candle[]>;
  meta: {
    limit: number;
    fetchedAt: string;
    source: string; // "FMP"
    from?: string;
    to?: string;
    nonadjusted?: boolean;
  };
}


@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'https://backend-symbols-5111a39b4a17.herokuapp.com/api/v1/market';
  private newsBaseUrl = 'https://backend-symbols-5111a39b4a17.herokuapp.com/api/v1/news';
  private fmpApiKey = '7285569846d061e49b73fac2b36e376e'

  // (opcional) usar o /profile direto da FMP para pegar logo — use só para testes
  private fmpBase = 'https://financialmodelingprep.com';
  private historyBaseUrl = 'https://backend-symbols-5111a39b4a17.herokuapp.com/api/v1/history';
  private fmpKey = this.fmpApiKey; // defina em environment.ts para testar

  // cache de logos no front (symbol -> url)
  private logoCache = new Map<string, string>();
  private inflight = new Map<string, Observable<string | null>>();

  constructor(private http: HttpClient) { }

  getMeta(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/meta`);
  }

  getAll(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/all`);
  }

  getCategoryRaw(cat: MarketCategory): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${cat}`);
  }

  getCategoryList(cat: MarketCategory): Observable<any[]> {
    return this.getCategoryRaw(cat).pipe(
      map((resp: any) => {
        if (Array.isArray(resp)) return resp;
        if (resp?.symbolsList && Array.isArray(resp.symbolsList)) return resp.symbolsList; // stocks
        if (resp && resp[cat] && Array.isArray(resp[cat])) return resp[cat];
        return [];
      })
    );
  }

  /**
   * Retorna URL da logo:
   * - Se já vier no JSON (image/logo), usa.
   * - Para 'stocks': tenta /api/v3/profile/{symbol} e lê "image".
   * - Fallback: https://financialmodelingprep.com/image-stock/{SYMBOL}.png
   * Tudo com cache no front.
   */
  getLogoUrlForItem(cat: MarketCategory, item: any): Observable<string | null> {
    const symbol: string = item?.symbol || item?.ticker;
    if (!symbol) return of(null);

    // se já veio no payload
    const pre = item?.image || item?.logo || item?.profile?.image;
    if (pre) {
      this.logoCache.set(symbol, pre);
      return of(pre);
    }

    // cache local
    if (this.logoCache.has(symbol)) {
      return of(this.logoCache.get(symbol)!);
    }

    // apenas stocks costumam ter /profile consistente
    if (cat !== 'stocks') return of(null);

    // evita chamadas repetidas simultâneas
    if (this.inflight.has(symbol)) return this.inflight.get(symbol)!;

    let obs: Observable<string | null>;
    if (this.fmpKey) {
      const url = `${this.fmpBase}/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${this.fmpKey}`;
      obs = this.http.get<any[]>(url).pipe(
        map(arr => {
          const image = Array.isArray(arr) && arr[0]?.image ? arr[0].image : null;
          if (image) this.logoCache.set(symbol, image);
          return image;
        }),
        shareReplay(1)
      );
    } else {
      // fallback simples (funciona para muitas companhias)
      const fallback = `${this.fmpBase}/image-stock/${encodeURIComponent(symbol)}.png`;
      this.logoCache.set(symbol, fallback);
      obs = of(fallback);
    }

    this.inflight.set(symbol, obs);
    // limpe da tabela inflight quando completar
    obs.subscribe({ complete: () => this.inflight.delete(symbol), error: () => this.inflight.delete(symbol) });
    return obs;
  }

  // 🔹 NOVO: USDBRL do cache de FOREX no backend
  getUsdBrl(): Observable<{ pair: string; price: number; lastUpdate: string; raw: any } | null> {
    return this.http.get<any>(`${this.baseUrl}/forex/usdbrl`).pipe(
      map(res => res ?? null)
    );
  }

  // 🔹 (Opcional) helper para pegar só o preço numérico
  getUsdBrlPrice(): Observable<number | null> {
    return this.getUsdBrl().pipe(
      map(res => (res && typeof res.price === 'number' ? res.price : null))
    );
  }

  // 🔹 NOVO: Notícias (cache 5 min no backend, sem refresh a cada 30s)
  getNews(): Observable<any> {
    return this.http.get<any>(`${this.newsBaseUrl}`);
  }

  // 🔹 NOVO: Metadados das notícias
  getNewsMeta(): Observable<{ lastNewsUpdate: string | null; ttlMs: number; hasCache: boolean }> {
    return this.http.get<{ lastNewsUpdate: string | null; ttlMs: number; hasCache: boolean }>(
      `${this.newsBaseUrl}/meta`
    );
  }

  // Helper local para querystring (NOVO, se ainda não existir)
  private toQs(params: Record<string, any>): string {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return q ? `?${q}` : '';
  }

  /* =============== Articles =============== */
  getNewsArticles(page = 0, limit = 20) {
    return this.http.get<any>(`${this.newsBaseUrl}/articles${this.toQs({ page, limit })}`);
  }

  /* =============== Latest feeds (opcionais: from, to, page, limit) =============== */
  getNewsGeneralLatest(opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/general-latest${this.toQs({ from, to, page, limit })}`);
  }

  getNewsPressReleasesLatest(opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/press-releases-latest${this.toQs({ from, to, page, limit })}`);
  }

  getNewsStockLatest(opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/stock-latest${this.toQs({ from, to, page, limit })}`);
  }

  getNewsCryptoLatest(opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/crypto-latest${this.toQs({ from, to, page, limit })}`);
  }

  getNewsForexLatest(opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/forex-latest${this.toQs({ from, to, page, limit })}`);
  }

  /* =============== Searches por símbolo =============== */
  searchPressReleases(symbols: string, opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/press-releases${this.toQs({ symbols, from, to, page, limit })}`);
  }

  searchStockNews(symbols: string, opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/stock${this.toQs({ symbols, from, to, page, limit })}`);
  }

  searchCryptoNews(symbols: string, opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/crypto${this.toQs({ symbols, from, to, page, limit })}`);
  }

  searchForexNews(symbols: string, opts: { from?: string; to?: string; page?: number; limit?: number } = {}) {
    const { from, to, page = 0, limit = 20 } = opts;
    return this.http.get<any>(`${this.newsBaseUrl}/forex${this.toQs({ symbols, from, to, page, limit })}`);
  }


  // 🔹 Dólar (payload simplificado do backend /api/v1/market/dolar)
  getCotacaoDolar(): Observable<{ cotacaoDolar: string; valor: number; lastUpdate: string } | null> {
    return this.http.get<any>(`${this.baseUrl}/dolar`).pipe(
      map(res => res ?? null)
    );
  }

  getCotacaoDolarValor(): Observable<number | null> {
    return this.getCotacaoDolar().pipe(
      map(res => (res && typeof res.valor === 'number') ? res.valor : null)
    );
  }


  /** 
 * Histórico agregado (1m, 5m, 15m, 30m) para um símbolo.
 * Params opcionais:
 *  - limit (padrão 500)
 *  - from / to (ex.: "2025-10-08 09:30:00")
 *  - nonadjusted (true/false)
 */
getHistory(
  symbol: string,
  opts: { limit?: number; from?: string; to?: string; nonadjusted?: boolean } = {}
): Observable<SymbolHistoryResponse> {
  const { limit = 500, from, to, nonadjusted } = opts;
  const qs = this.toQs({ limit, from, to, nonadjusted });
  return this.http
    .get<SymbolHistoryResponse>(`${this.historyBaseUrl}/${encodeURIComponent(symbol)}${qs}`)
    .pipe(shareReplay(1));
}

/** Pega somente um intervalo específico do payload agregado */
getHistoryInterval(
  symbol: string,
  interval: IntradayInterval,
  opts: { limit?: number; from?: string; to?: string; nonadjusted?: boolean } = {}
): Observable<Candle[]> {
  return this.getHistory(symbol, opts).pipe(
    map(res => (res?.intervals?.[interval] ?? []))
  );
}

/** Atalhos práticos por intervalo */
getHistory1m(symbol: string, opts: { limit?: number; from?: string; to?: string; nonadjusted?: boolean } = {}) {
  return this.getHistoryInterval(symbol, '1min', opts);
}

getHistory5m(symbol: string, opts: { limit?: number; from?: string; to?: string; nonadjusted?: boolean } = {}) {
  return this.getHistoryInterval(symbol, '5min', opts);
}

getHistory15m(symbol: string, opts: { limit?: number; from?: string; to?: string; nonadjusted?: boolean } = {}) {
  return this.getHistoryInterval(symbol, '15min', opts);
}

getHistory30m(symbol: string, opts: { limit?: number; from?: string; to?: string; nonadjusted?: boolean } = {}) {
  return this.getHistoryInterval(symbol, '30min', opts);
}

/** Opcional: último preço (close) do intervalo escolhido */
getLastCloseFromInterval(
  symbol: string,
  interval: IntradayInterval,
  opts: { limit?: number; from?: string; to?: string; nonadjusted?: boolean } = {}
): Observable<number | null> {
  return this.getHistoryInterval(symbol, interval, opts).pipe(
    map(arr => (arr.length ? arr[arr.length - 1].c : null))
  );
}

}
