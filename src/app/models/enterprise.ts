export interface WalletDetail {
    id?: any;
    ativo?: string;
    wallet: string;
    rede?: string;
    qrCode?: string;
    visibuly?: boolean;
}

export interface Enterprise {
    id?: number;

    // DADOS DA EMPRESA
    nomeEmpresa: string;
    logoEmpresa?: string;
    nomeDiretor?: string;
    assinaturaDiretor?: string;
    status: boolean;

    // FINANCEIRO (Transferência/PIX)
    transferBanckName?: string;
    transferBanckBanck?: string;
    transferBanckCodeName?: string;
    transferBanckAgency?: string;
    transferBanckCNPJ?: string;
    transferBanckAccount?: string;
    transferBanckAccountType?: string;
    transferBanckKeyTypePix?: string;
    transferBanckKeyPix?: string;
    transferBanckQrCodePix?: string;
    transferBanckCopyKey?: string;

    walletDetails?: WalletDetail[];

    // REDIRECIONAMENTO
    checkout?: string;
    homeBroker?: string;

    // ANUNCIOS
    propagandaUrl?: string;
    propagandaToken?: string;

    // PERMISSOES
    // CONTRATO
    contratoAutomatizado?: boolean;
    contratoSaldoAutomatizado?: boolean;
    contratoCreditoAutomatizado?: boolean;
    contratoEmprestimoAutomatizado?: boolean;

    // BROKER
    emailBrokerAutoPreenchimento?: boolean;
    brokerCriarRelease?: boolean;
    brokerReprovarRelease?: boolean;
    brokerDeletarRelease?: boolean;
    brokerCriarContrato?: boolean;
    brokerAssinarContrato?: boolean;
    brokerEditarCliente?: boolean;
    brokerEdiatarSaldo?: boolean;
    brokerEdiatarCredito?: boolean;
    brokerEdiatarEmprestimo?: boolean;
    brokerEdiatarSaldoUtip?: boolean;

    // SUPORTE
    suporteEditarCliente?: boolean;
    suporteEditarSaldoCliente?: boolean;
    suporteEditarCreditoCliente?: boolean;
    suporteEditarEmprestimoCliente?: boolean;
    suporteEditarSaldoUtipCliente?: boolean;
    suporteCriarContrato?: boolean;
    suporteAssinarContrato?: boolean;
    suporteDeletearContrato?: boolean;
    suporteCriarRelease?: boolean;
    suporteAprovarRelease?: boolean;
    suporteReprovarRelease?: boolean;
    suporteDeletarRelease?: boolean;

    // FINANCEIRO
    financeiroEditarCliente?: boolean;
    financeiroEditarSaldoCliente?: boolean;
    financeiroEditarCreditoCliente?: boolean;
    financeiroEditarEmprestimoCliente?: boolean;
    financeiroEditarSaldoUtipCliente?: boolean;
    financeiroCriarContrato?: boolean;
    financeiroAssinarContrato?: boolean;
    financeiroDeletearContrato?: boolean;
    financeiroCriarRelease?: boolean;
    financeiroAprovarRelease?: boolean;
    financeiroReprovarRelease?: boolean;
    financeiroDeletarRelease?: boolean;

    // MANAGER
    managerEditarCliente?: boolean;
    managerEditarSaldoCliente?: boolean;
    managerEditarCreditoCliente?: boolean;
    managerEditarEmprestimoCliente?: boolean;
    managerEditarSaldoUtipCliente?: boolean;
    managerCriarContrato?: boolean;
    managerAssinarContrato?: boolean;
    managerDeletearContrato?: boolean;
    managerCriarRelease?: boolean;
    managerAprovarRelease?: boolean;
    managerReprovarRelease?: boolean;
    managerDeletarRelease?: boolean;

    // BOT
    historicoAutoDelete?: boolean;
    historicoAutoDeleteDias?: number;  // Short no backend
    limiteDiasOperacaoBot?: number;    // Short no backend
}
