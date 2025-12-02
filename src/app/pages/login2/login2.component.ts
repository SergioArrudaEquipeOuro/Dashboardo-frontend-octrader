import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { UserService } from 'src/app/services/user.service';
import { EmailService } from 'src/app/services/email.service';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { UploadService } from 'src/app/services/upload.service';
import { environment } from 'src/environments/environment';

// mesmo interface EmailTemplateOptions já criada no service
interface EmailTemplateOptions {
  enterpriseName?: string;
  logoUrl?: string;
  supportEmail?: string;
  website?: string;
}

declare var bootstrap: any;


@Component({
  selector: 'app-login2',
  templateUrl: './login2.component.html',
  styleUrls: ['./login2.component.css']
})
export class Login2Component implements OnInit, OnDestroy {

  // Estado do formulário
  isLoginMode: boolean = true; // login por padrão

  // Campos (login/cadastro)
  email: string = '';
  senha: string = '';
  nome: string = '';
  cpf: string = '';
  telefoneFixo: string = '';
  senhaCadastro: string = '';
  senhaConfirmacao: string = '';

  // UI/Feedback
  isLoading: boolean = false;
  alertMessage: string | null = null;
  alertType: 'success' | 'danger' | null = null;

  // Empresa ativa (logo)
  activeEnterprise: any;

  forgotEmail: string = '';
  isLoadingForgot: boolean = false;

  /** Converte o nome do arquivo do S3 em URL pública acessível */
  private getEnterpriseLogoPublicUrl(): string {
    if (!this.activeEnterprise?.logoEmpresa) return 'https://i.imgur.com/4x8d9Ri.png';
    return this.uploadService.url() + this.activeEnterprise.logoEmpresa;
  }


  // Subs
  private routeSub?: Subscription;

  constructor(
    private userService: UserService,
    private router: Router,
    private emailService: EmailService,
    private http: HttpClient,
    public dialog: MatDialog,
    private enterpriseService: EnterpriseService,
    private uploadService: UploadService
  ) { }

  ngOnInit(): void {
    this.getActiveEnterprise();
    this.closeDialog();

    // 1) Define o modo pela URL na carga
    this.syncModeWithRoute(this.router.url);

    // 2) Se a rota mudar, sincroniza novamente o modo com a URL
    this.routeSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.syncModeWithRoute(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  // --------- Sincronização URL -> modo (apenas em navegação/primeira carga) ----------
  private syncModeWithRoute(url: string): void {
    // Se a URL contiver "/register", inicia em cadastro; caso contrário, login
    const isRegister = /\/register($|[/?#])/i.test(url);
    this.isLoginMode = !isRegister;
  }

  // --------- UI ----------
  closeDialog(): void {
    this.dialog.closeAll();
  }

  onToggleMode(): void {
    // Alterna manualmente sem navegar — funciona mesmo estando em /register
    this.isLoginMode = !this.isLoginMode;
  }

  onSubmit(): void {
    if (this.isLoginMode) {
      this.onLogin();
    } else {
      this.onSignup();
    }
  }

  showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = null;
      this.alertType = null;
    }, 5000);
  }

  getProfileImageUrl(imgPerfil: string | undefined): string {
    return `${this.uploadService.url()}${imgPerfil}`;
  }


  // --------- Empresa ----------
  getActiveEnterprise(): void {
    this.enterpriseService.getActiveEnterprise()
      .pipe()
      .subscribe({
        next: (e: any) => {
          this.activeEnterprise = e ?? null;
          if (this.activeEnterprise?.logoEmpresa) {
            this.activeEnterprise.logoUrl = this.getEnterpriseLogoPublicUrl();
          }
          this.isLoading = false;
        },
        error: () => {
          this.activeEnterprise = null;
          this.isLoading = false;
        }
      });
  }

  // --------- Login ----------
  onLogin(): void {
    this.isLoading = true;

    if (!this.email.trim() || !this.senha.trim()) {
      this.showAlert('Por favor, preencha todos os campos.', 'danger');
      this.isLoading = false;
      return;
    }

    this.getIpAddress()
      .then(ip => {
        this.userService.login(this.email, this.senha, ip).subscribe({
          next: result => {
            if ((result as any).error) {
              this.showAlert((result as any).error, 'danger');
            } else {
              localStorage.setItem('authToken', result.token);
              this.getUserRoleAndRedirect(result.token);
              // Opcional: enviar notificação de login
              // this.sendLoginHtmlEmail(this.email);
            }
            this.isLoading = false;
          },
          error: err => {
            const msg = err.error || 'Erro no login. Verifique suas credenciais.';
            this.showAlert(msg, 'danger');
            this.isLoading = false;
          }
        });
      })
      .catch(() => {
        this.showAlert('Erro ao obter IP do usuário.', 'danger');
        this.isLoading = false;
      });
  }

  // --------- Cadastro ----------
  onSignup(): void {
    this.isLoading = true;

    if (!this.areAllFieldsFilled()) {
      this.showAlert('Por favor, preencha todos os campos obrigatórios.', 'danger');
      this.isLoading = false;
      return;
    }

    if (this.senhaCadastro !== this.senhaConfirmacao) {
      this.showAlert('As senhas não coincidem.', 'danger');
      this.isLoading = false;
      return;
    }

    const novoUsuario = {
      nome: this.nome,
      email: this.email,
      cpf: this.cpf,
      telefoneFixo: this.telefoneFixo,
      senha: this.senhaCadastro,
      role: 'CLIENTE'
    };

    this.userService.createUsuario(novoUsuario).subscribe({
      next: () => {
        this.showAlert('Cadastro realizado com sucesso!', 'success');
        this.sendWelcomeHtmlEmail(this.email, this.nome);
        this.isLoading = false;

        // Mantém a URL; apenas alterna manualmente para login
        this.isLoginMode = true;
      },
      error: () => {
        this.isLoading = false;
        this.showAlert('Erro ao realizar cadastro.', 'danger');
      }
    });
  }

  areAllFieldsFilled(): boolean {
    return this.nome.trim() !== '' &&
      this.email.trim() !== '' &&
      this.cpf.trim() !== '' &&
      this.telefoneFixo.trim() !== '' &&
      this.senhaCadastro.trim() !== '' &&
      this.senhaConfirmacao.trim() !== '';
  }

  // --------- Util ---------
  getIpAddress(): Promise<string> {
    return new Promise((resolve) => {
      // Tenta o primeiro serviço
      this.http.get<{ ip: string }>('https://api.ipify.org?format=json').subscribe({
        next: (data) => resolve(data.ip),
        error: () => {
          // Se falhar, tenta um serviço alternativo
          this.http.get<{ ip: string }>('https://jsonip.com').subscribe({
            next: (data) => resolve(data.ip),
            error: () => resolve('') // Retorna vazio se ambos falharem
          });
        }
      });
    });
  }

  getUserRoleAndRedirect(token: string): void {
    this.userService.getByToken(token).subscribe({
      next: (user) => {
        switch (user.role) {
          case 'CLIENTE':
            this.router.navigate(['/dashboard']);
            break;
          case 'ROOT':
          case 'ADMINISTRADOR':
          case 'SUPORTE':
          case 'MANAGER':
          case 'FINANCEIRO':
            this.router.navigate(['/admin']);
            break;
          case 'BROKER':
            this.router.navigate(['/broker']);
            break;
          case 'GERENTE':
            this.router.navigate(['/gerente']);
            break;
          default:
            this.showAlert('Role desconhecida.', 'danger');
        }
      },
      error: () => {
        this.showAlert('Erro ao obter informações do usuário.', 'danger');
      }
    });
  }

  // --------- Emails (opcional) ---------
  sendLoginHtmlEmail(email: string): void {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const options = this.getEnterpriseEmailOptions();

    const htmlBody = this.emailService.createHtmlBody(`
    <h2>Notificação de Login</h2>
    <p>Olá,</p>
    <p>Detectamos um novo acesso à sua conta:</p>
    <ul>
      <li><strong>Data:</strong> ${date}</li>
      <li><strong>Hora:</strong> ${time}</li>
    </ul>
    <p>Se não reconhece esta atividade, entre em contato com o suporte imediatamente.</p>
  `, this.buildEmailTemplateOptions());

    const emailRequest = {
      to: email,
      subject: 'Notificação de Login',
      htmlBody
    };

    this.emailService.sendHtmlEmail(emailRequest).subscribe({
      next: () => console.log('Notificação de login enviada com sucesso.'),
      error: (error) => console.error('Erro ao enviar notificação de login:', error)
    });
  }


  sendWelcomeHtmlEmail(email: string, name: string): void {
    const options = this.getEnterpriseEmailOptions();

    const htmlBody = this.emailService.createHtmlBody(`
    <h2>Bem-vindo(a)</h2>
    <p>Olá, <strong>${name}</strong>!</p>
    <p>Seu cadastro foi realizado com sucesso em nossa plataforma.</p>
  `, this.buildEmailTemplateOptions());

    const emailRequest = {
      to: email,
      subject: 'Bem-vindo!',
      htmlBody
    };

    this.emailService.sendHtmlEmail(emailRequest).subscribe({
      next: () => console.log('Email de boas-vindas enviado com sucesso.'),
      error: (error) => console.error('Erro ao enviar email de boas-vindas:', error)
    });
  }


  // --------- Forgot Password (igual ao componente antigo, adaptado) ----------
  onForgotPasswordSubmit(form?: any): void {
    // Validação básica
    if (!this.forgotEmail || !this.forgotEmail.trim()) {
      this.showAlert('Por favor, informe o email para recuperar a senha.', 'danger');
      return;
    }

    this.isLoadingForgot = true;

    // Busca o usuário pelo email
    this.userService.getUsuarioByEmail(this.forgotEmail).subscribe({
      next: (user) => {
        const token = user.token ? user.token : user.tokenIdentificacao;

        // MONTE A URL DE RESET AQUI (ajuste para sua app atual)
        // Exemplo:
        const resetLink = `https://app.octrader.com/ForgotPassword/${token}`;

        // Se seu EmailService tiver sendEmail(texto simples), use isso:
        /*
        const emailRequest = {
          to: this.forgotEmail,
          subject: 'Password Reset Request',
          text: `You have requested to reset your password. Please click the link below to reset your password:\n\n
  ${resetLink}\n\n
  If you did not request a password reset, please ignore this email.\n
  OCTRADER.\n
  ${this.activeEnterprise?.site || 'https://octrader.com'}`
        };
  
        this.emailService.sendEmail(emailRequest).subscribe({
          next: () => {
            this.showAlert('Email de recuperação enviado com sucesso!', 'success');
            this.isLoadingForgot = false;
            this.forgotEmail = '';
            this.closeForgotPasswordModal();
          },
          error: (error) => {
            console.error('Erro ao enviar email de recuperação:', error);
            this.showAlert('Erro ao tentar enviar email, tente novamente mais tarde.', 'danger');
            this.isLoadingForgot = false;
          }
        });
        */

        // OU, se você quiser usar HTML + template (createHtmlBody + sendHtmlEmail):
        const htmlBody = this.emailService.createHtmlBody(
          `
        <h2>Password recovery</h2>
        <p>We received a password recovery request for this email address.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
        <p>If you did not request this, please ignore this message.</p>
        `,
          this.buildEmailTemplateOptions()
        );

        const emailRequest = {
          to: this.forgotEmail,
          subject: 'Password recovery',
          htmlBody: htmlBody
        };

        this.emailService.sendHtmlEmail(emailRequest).subscribe({
          next: () => {
            this.showAlert(
              'If the email address is registered, we will send the recovery instructions.',
              'success'
            );
            this.isLoadingForgot = false;
            this.forgotEmail = '';
            this.closeForgotPasswordModal();
          },
          error: (error) => {
            console.error('Error sending recovery email:', error);
            this.showAlert('The recovery email could not be sent.', 'danger');
            this.isLoadingForgot = false;
          }
        });
      },
      error: (error) => {
        console.error('Error searching for user by email.', error);
        this.showAlert('Error locating user with this email.', 'danger');
        this.isLoadingForgot = false;
      }
    });
  }


  private closeForgotPasswordModal(): void {
    const modalElement = document.getElementById('forgotPasswordModal');
    if (modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
      modalInstance.hide();
    }
  }


  // login2.component.ts (dentro da classe Login2Component)

  private getEnterpriseEmailOptions() {
    const enterpriseName =
      this.activeEnterprise?.nomeEmpresa ||
      this.activeEnterprise?.nome ||
      '';

    const logoUrl = this.activeEnterprise?.logoEmpresa
      ? this.getProfileImageUrl(this.activeEnterprise.logoEmpresa)
      : '';

    const supportEmail =
      this.activeEnterprise?.emailSuporte ||
      this.activeEnterprise?.emailSuporteContato ||
      '';

    const website =
      this.activeEnterprise?.site ||
      this.activeEnterprise?.website ||
      '';

    return { enterpriseName, logoUrl, supportEmail, website };
  }


  private buildEmailTemplateOptions(): EmailTemplateOptions {
    return {
      enterpriseName: this.activeEnterprise?.nomeEmpresa || '',
      logoUrl: this.getEnterpriseLogoPublicUrl(),
      supportEmail: this.activeEnterprise?.emailSuporte || '',
      website: this.activeEnterprise?.site || ''
    };
  }

}
