// src/app/services/etf.model.ts
export type EtfStatus = 'ACTIVE' | 'PAUSED' | 'DELETED';
export type EtfCategory = 'OIL' | 'CRYPTO' | 'AI' | 'GLOBAL' | 'TREASURIES' | 'OTHER';

export interface Etf {
    id?: number;
    code: string;
    img: string;
    name: string;
    category: EtfCategory;
    description?: string;

    currentNav: number;
    monthlyTargetPct: number;     // ex: 0.032
    dailyVolatilityPct: number;   // ex: 0.0025

    weekdaysOnly: boolean;
    valuationZoneId: string;      // "America/Chicago"
    createdDate?: string;         // yyyy-MM-dd
    lastValuationDate?: string;   // yyyy-MM-dd

    status: EtfStatus;

    buyFeePct: number;            // 0.001
    sellFeePct: number;

    level1MaxCotas: number;       // L1/L2 limites
    level2MaxCotas: number;

    sellRestrictionEnabled: boolean;
    sellAllowedFrom?: string | null; // yyyy-MM-dd ou null

    historyLimit: number;
    seedSalt?: string | null;

    version?: number;

    cotaMinima?: number | null;
    nivel01?: number | null;
    nivel02?: number | null;
    nivel03?: number | null;
}

export interface EtfHistory {
    id: number;
    etf?: Etf | number;
    valuationDate: string;   // yyyy-MM-dd
    dailyReturnPct: number;  // fração (0.0021)
    navBefore: number;
    navAfter: number;
    overrideApplied: boolean;
    seedInfo?: string;
    createdAt: string;       // ISO
}

export interface TradeRequest {
    usuarioId: number;       // Integer no backend
    cotas: number;
}

export type TxType = 'BUY' | 'SELL' | 'OVERRIDE';

export interface EtfTransaction {
    id?: number;
    etf: Etf | number;
    usuario: any; // pode ser number se o backend serializar só o id
    type: TxType;
    cotas: number;
    pricePerCota: number;
    feeAmount: number;
    totalUsd: number; // BUY: negativo (débito) | SELL: positivo (crédito)
    createdAt: string;
    notes?: string;
}


export interface EtfPositionView {
    etfId: number;
    code: string;
    name: string;
    cotas: number;
    avgPrice: number;
    currentNav: number;
    marketValue: number;
    pnlUsd: number;
    pnlPct: number;
}
