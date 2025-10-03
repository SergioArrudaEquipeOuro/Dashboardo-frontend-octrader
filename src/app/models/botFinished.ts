export enum EnumStatusBot {
    ACTIVE = 'ACTIVE',
    WAIT = 'WAIT',
    CHECKED = 'CHECKED',
    FINISHED = 'FINISHED',
    DISABLED = 'DISABLED'
}

export enum EnumMercado {
    CRYPTOCURRENCIES = 'CRYPTOCURRENCIES',
    STOCKS = 'STOCKS',
    FOREX = 'FOREX',
    COMMODITIES = 'COMMODITIES',
    INDEX = 'INDEX'
}

export interface BotFinished {
    id?: number;
    token: string;
    saldo: number;
    status: EnumStatusBot;
    novasOperacoesDiarias: boolean;
    dataInicio: Date;
    dataFim: Date;
    dataControle: Date;
    iniciar: boolean;
    listaOperacoesDiarias: boolean;
    lucroOperacaoMaxima: number;
    variacaoDiariaMaxima: number;
    projecao: number;
    pause: boolean;
    valorDiarioNegativo: boolean;
    direcaoMercado: EnumMercado;
    listaOperacoes: number[];
    listaEspera: number[];
    listaValorTotalDia: number[];
    lucroTotal: number;
    perdaTotal: number;
    valorInicial: number;
    ativo: string;
    nomeCliente: string;
}
