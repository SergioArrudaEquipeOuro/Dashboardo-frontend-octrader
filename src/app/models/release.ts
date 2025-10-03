import { User } from './user';  // Ajuste o caminho conforme necessário

export class Release {
  id?: number;
  clientId?: number;
  clientName?: string;
  emailCliente?: string;
  entryType?: string;
  typeTransfer?: string;
  value?: number;
  coin?: string;
  observacoes?: string;
  proof?: string;
  status?: string;
  email?: string;
  date?: Date;
  approved?: boolean;
  visibily?: boolean;
  fk?: boolean;
  usuario?: Partial<User>;

  constructor(init?: Partial<Release>) {
    Object.assign(this, init);
  }
}
