import { Bot } from './bot';

export interface KeyPass {
    id: number;
    robotExpiration?: number;

    codKeyPass?: string;
    emailBroker?: string;

    primeiro?: string;   // KeyPassOrderSaldo enum (usar string para simplificar no TS)
    segundo?: string;
    terceiro?: string;

    data?: string;       // Instant → string ISO
    dataInicio?: string;
    dataFim?: string;

    ativo?: boolean;
    robotExpirationPermissao?: boolean;
    permissaoClienteDeleteBot?: boolean;
    valorDiarioNegativo?: boolean;
    sacar?: boolean;
    loss?: boolean;

    projecao?: number;

    broker?: any;
    bot?: Bot;
}
