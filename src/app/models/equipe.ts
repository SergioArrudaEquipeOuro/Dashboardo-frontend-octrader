export interface Equipe {
  id?: number;         // <-- opcional
  nome: string;
  gerente?: any;
  brokers?: any[];
  clientes?: any[];
}