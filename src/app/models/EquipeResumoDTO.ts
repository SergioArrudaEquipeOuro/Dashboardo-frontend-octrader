export interface UsuarioResumo {
  id: number;
  nome: string;
  email: string;
}

export interface EquipeResumoDTO {
  id: number;
  nome: string;
  gerente: UsuarioResumo | null;
  membros: UsuarioResumo[];
  clientes: UsuarioResumo[];
}
