export interface software {
    id: number;
    token: string;
    OD: boolean;
    opDiariasFinalizadas: boolean;
    dataInicio: Date;
    dataFim: Date;
    dataControle: Date;
    iniciar: boolean;
    opDiarias: boolean;
    saldo: number;
    lucroMaximo: number;
    lucroMinimo: number;
    variacaoMaxima: number;
    variacaoMinima: number;
    projecao: number;
    pause: boolean;
    valorDiarioNegativo: boolean;
    direcaoMercado: string;
    ListaOperacoes: number[];
    ListaValorTotalDia: number[];
    sacar: boolean;
    lucroTotal: number;
    PerdaTotal: number;
    valorInicial: number;
    ativo: boolean;
    nomeAtivo: string;
    nomeCliente: string;
    totalDias: number;
    diaAtual: number;
    operacoesRestantes: number;
    ListaJurosDiarios: number[];
    lucroDiario: number;
    operacoesList:any[];
  }
  