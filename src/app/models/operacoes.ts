import { Bot } from "./bot";

export interface Operacoes {
    id: number;
    saldo: number;
    lucro: number;
    abertura: number;
    fechamento: number;
    volume: number;
    token: string;
    data: Date;
    visivel: boolean;
    bot: Bot;
}
