import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'src/app/services/user.service';
import { EmailService } from 'src/app/services/email.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { UploadService } from 'src/app/services/upload.service';

@Component({
  selector: 'app-login2',
  templateUrl: './login2.component.html',
  styleUrls: ['./login2.component.css']
})
export class Login2Component implements OnInit {

  isLoginMode: boolean = true; // Controla o modo do formulário (login ou cadastro)
  email: string = '';
  senha: string = '';
  nome: string = '';
  cpf: string = '';
  telefoneFixo: string = '';
  senhaCadastro: string = '';
  senhaConfirmacao: string = '';
  isLoading: boolean = false;
  alertMessage: string | null = null;
  alertType: string | null = null;

  activeEnterprise: any;

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
    //this.sendWelcomeHtmlEmail('alexmedeiros0171@gmail.com', 'Alex Medeiros')
    //this.sendLoginHtmlEmail('alexmedeiros0171@gmail.com')
  }

  getActiveEnterprise(): void {
    this.enterpriseService.getActiveEnterprise()
      .pipe()
      .subscribe({
        next: (e: any) => {
          this.activeEnterprise = e ?? null;
          this.isLoading = false;
        },
        error: () => {
          this.activeEnterprise = null;
          this.isLoading = false;
        }
      });
  }

  closeDialog(): void {
    this.dialog.closeAll();
  }

  onToggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
  }

  onSubmit(): void {
    if (this.isLoginMode) {
      this.onLogin();
    } else {
      this.onSignup();
    }
  }

  // Método para login
  // Método para login
  onLogin(): void {
    this.isLoading = true;

    if (!this.email.trim() || !this.senha.trim()) {
      this.showAlert('Por favor, preencha todos os campos.', 'danger');
      this.isLoading = false;
      return;
    }

    this.getIpAddress()
      .then(ip => {
        // Chama o serviço de login
        this.userService
          .login(this.email, this.senha, ip)
          .subscribe({
            next: result => {
              // Se vier um erro no corpo, o status será 200 mas conterá chave 'error'
              if ((result as any).error) {
                this.showAlert((result as any).error, 'danger');
              } else {
                // Login bem-sucedido
                localStorage.setItem('authToken', result.token);
                this.getUserRoleAndRedirect(result.token);
              }
              this.isLoading = false;
            },
            error: err => {
              // Se o backend retornar 400 com mensagem no body, err.error será aquela string
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


  // Método para cadastro
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
        this.onToggleMode(); // Voltar para o modo de login após o cadastro
      },
      error: () => {
        this.isLoading = false;
        this.showAlert('Erro ao realizar cadastro.', 'danger');
      }
    });
  }

  // Verifica se todos os campos obrigatórios foram preenchidos no cadastro
  areAllFieldsFilled(): boolean {
    return this.nome.trim() !== '' &&
      this.email.trim() !== '' &&
      this.cpf.trim() !== '' &&
      this.telefoneFixo.trim() !== '' &&
      this.senhaCadastro.trim() !== '' &&
      this.senhaConfirmacao.trim() !== '';
  }

  // Obtém o endereço IP do usuário
  getIpAddress(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get<{ ip: string }>('https://api.ipify.org?format=json').subscribe(
        data => resolve(data.ip),
        error => reject(error)
      );
    });
  }

  // Redireciona o usuário com base na role
  getUserRoleAndRedirect(token: string): void {
    this.userService.getByToken(token).subscribe({
      next: (user) => {
        console.log(user)
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

  // Envia um email de notificação de login
  sendLoginHtmlEmail(email: string): void {
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const htmlBody = this.emailService.createHtmlBody(`
      <h2>Notificação de Login</h2>
      <p>Olá,</p>
      <p>Detectamos um novo acesso à sua conta:</p>
      <ul>
        <li><strong>Data:</strong> ${date}</li>
        <li><strong>Hora:</strong> ${time}</li>
      </ul>
      <p>Se não reconhece esta atividade, entre em contato com o suporte imediatamente.</p>
    `);

    const emailRequest = {
      to: email,
      subject: 'Notificação de Login',
      htmlBody: htmlBody
    };

    this.emailService.sendHtmlEmail(emailRequest).subscribe({
      next: () => console.log('Notificação de login enviada com sucesso.'),
      error: (error) => console.error('Erro ao enviar notificação de login:', error)
    });
  }


  // Envia um email de boas-vindas ao usuário com HTML
  sendWelcomeHtmlEmail(email: string, name: string): void {
    const htmlBody = this.emailService.createHtmlBody(`Olá, ${name}!\nBem-vindo à nossa plataforma.`);

    const emailRequest = {
      to: email,
      subject: 'Bem-vindo!',
      htmlBody: htmlBody
    };

    this.emailService.sendHtmlEmail(emailRequest).subscribe({
      next: () => console.log('Email de boas-vindas enviado com sucesso.'),
      error: (error) => console.error('Erro ao enviar email de boas-vindas:', error)
    });
  }


  // Exibe mensagens de alerta
  showAlert(message: string, type: string): void {
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
}
