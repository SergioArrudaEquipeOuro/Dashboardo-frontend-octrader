import { Bot } from "./bot";
import { Contrato } from "./contrato";
import { Equipe } from "./equipe";
import { KeyPass } from "./keyPass";
import { Release } from "./release";

export interface ClientBrokerInfo {
  nome: string;
  email: string;
  tokenIdentificacao: string;
}

export interface User {
  id?: number;
  role?: string;
  email: string;
  senha?: string;
  token?: string;
  ip?: string;
  tokenIdentificacao?: string;
  saldo?: number;
  emprestimo?: number;
  saldoAplicado?: number;
  credito?: number;
  obs?: string;
  tokenIndicacao?: string;
  imgRG?: string;
  imgCPF?: string;
  imgResidencia?: string;
  imgPerfil?: string;
  imgAssing?: string;
  imgSelfie?: string;
  nome: string;
  estadoCivil?: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  emission?: string;
  celular?: string;
  telefoneFixo?: string;
  nacionalidade?: string;
  naturalizado?: string;
  escolaridade?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  estado?: string;
  cidade?: string;
  rendaMensal?: string;
  ativosInvestidos?: string;
  outrasAplicacoes?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoChavePix?: string;
  chavePix?: string;
  criptomoeda?: string;
  carteiraCripto?: string;
  identificacaoEmpresa?: string;
  nomeEmpresa?: string;
  ocupacaoProfissional?: string;
  profissao?: string;
  ultimoLogin?: string;
  viewImgRG?: boolean
  viewImgCPF?: boolean
  viewImgResidencia?: boolean
  viewImgPerfila?: boolean
  viewImgAssing?: boolean
  viewImgSelfie?: boolean
  sac?: boolean
  analista?: string;

  // Relacionamentos
  clientes?: User[];
  broker?: User;
  release?: Release[];
  botList?: Bot[];
  equipes?: Equipe[];
  contratos?: Contrato[];
  keyPasses?: KeyPass
  listaClientes?: User[];
  selected?: boolean;
  brokerName?: string;
  clientesInfo?: ClientBrokerInfo[];
  analistaInfo?: ClientBrokerInfo;
  equipesClienteInfo?: string[];
}
