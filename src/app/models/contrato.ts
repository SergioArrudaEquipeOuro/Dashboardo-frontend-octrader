export interface Paragrafo {
    id?: number
    titulo?: string;
    texto?: string;
}

export type TypeReleaseUnion =
    | 'DEPOSIT'
    | 'WITHDRAWAL'
    | 'CREDIT'
    | 'LOAN'
    | 'CREDITWITHDRAWA'
    | 'LOANWITHDRAWA'
    | 'TRANSFER';

export interface Contrato {
    id?: number;
    idCliente?: number;
    clientName?: string;
    clientEmail?: string;
    contractName?: string;
    saldo?: number;
    date?: string | Date;
    signed?: boolean;
    activeSymbol?: string;
    typeTransfer?: string;
    automatic?: boolean;
    campoCliente?: string;
    typeRelease?: TypeReleaseUnion;
    paragrafos: Paragrafo[];
}