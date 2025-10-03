import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadComponent } from 'src/app/components/load/load.component';
import { EmailService } from 'src/app/services/email.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  ip: string = '';
  email: string = '';
  senha: string = '';
  nome: string = '';
  cpf: string = '';
  telefoneFixo: string = '';
  senhaCadastro: string = '';
  senhaConfirmacao: string = '';
  alertMessage: string | null = null;
  alertType: string | null = null;
  isLoading: boolean = false;
  senhaFieldType: string = 'password';
  senhaIcon: string = 'fa-eye';
  senhaCadastroFieldType: string = 'password';
  senhaCadastroIcon: string = 'fa-eye';
  senhaConfirmacaoFieldType: string = 'password';
  senhaConfirmacaoIcon: string = 'fa-eye';
  isLogin: boolean = true;

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private emailService: EmailService,
    public dialog: MatDialog
  ) { }

  checkRoute(): void {
    const path = this.route.snapshot.routeConfig?.path;
    if (path === 'register') {
      this.isLogin = false;
    } else {
      this.isLogin = true;
    }
  }


  ngOnInit(): void {
    this.closeDialog();
    this.checkRoute();
    this.setupListeners();
    this.updateLayout();
    window.addEventListener('resize', this.updateLayout.bind(this));
    //this.sendWelcomeHtmlEmail('paulomirandamaster@gmail.com', 'Paulo Miranda')
  }

  toggleSenhaVisibility(): void {
    if (this.senhaFieldType === 'password') {
      this.senhaFieldType = 'text';
      this.senhaIcon = 'fa fa-eye-slash'; // Ícone de olho com barra
    } else {
      this.senhaFieldType = 'password';
      this.senhaIcon = 'fa fa-eye'; // Ícone de olho aberto
    }
  }
  
  toggleSenhaCadastroVisibility(): void {
    if (this.senhaCadastroFieldType === 'password') {
      this.senhaCadastroFieldType = 'text';
      this.senhaCadastroIcon = 'fa fa-eye-slash'; // Ícone de olho com barra
    } else {
      this.senhaCadastroFieldType = 'password';
      this.senhaCadastroIcon = 'fa fa-eye'; // Ícone de olho aberto
    }
  }
  
  toggleSenhaConfirmacaoVisibility(): void {
    if (this.senhaConfirmacaoFieldType === 'password') {
      this.senhaConfirmacaoFieldType = 'text';
      this.senhaConfirmacaoIcon = 'fa fa-eye-slash'; // Ícone de olho com barra
    } else {
      this.senhaConfirmacaoFieldType = 'password';
      this.senhaConfirmacaoIcon = 'fa fa-eye'; // Ícone de olho aberto
    }
  }
  

  onLogin(event: Event): void {
    event.preventDefault();
    this.isLoading = true;
    // Verifica se o email e senha foram preenchidos
    if (!this.email || !this.email.trim()) {
      this.showAlert('Por favor, insira seu email.', 'danger');
      this.isLoading = false;
      return;
    }

    if (!this.senha || !this.senha.trim()) {
      this.showAlert('Por favor, insira sua senha.', 'danger');
      this.isLoading = false;
      return;
    }

    this.load();

    this.getIpAddress().then(ip => {
      this.ip = ip;
      localStorage.setItem('userIp', this.ip);
      this.userService.login(this.email, this.senha, this.ip).subscribe({
        next: (response) => {
          localStorage.setItem('authToken', response.token);
          console.log('authToken sucesso')
          this.isLoading = false;
          this.sendLoginHtmlEmail(this.email);
          this.getUserRoleAndRedirect(response.token);
        },
        error: (error) => {
          console.error('Erro:', error);
          this.isLoading = false;

          // Tratamento de erros da API
          let errorMessage = 'Ocorreu um erro desconhecido';
          if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.message) {
            errorMessage = error.message;
          } else if (error.statusText) {
            errorMessage = error.statusText;
          }

          this.closeDialog();
          this.showAlert('Erro: ' + errorMessage, 'danger');
        }
      });
    });
  }


  getUserRoleAndRedirect(token: string): void {
    this.userService.getUsuarioByToken(token).subscribe({
      next: (user) => {
        console.log('Usuário role:', user.role);  // Adicione esta linha para depuração
        switch (user.role) {
          case 'CLIENTE':
            console.log('Redirecionando para /dashboard');
            this.router.navigate(['/dashboard']);
            break;
          case 'ROOT':
          case 'ADMINISTRADOR':
          case 'SUPORTE':
          case 'MANAGER':
          case 'FINANCEIRO':
            console.log('Redirecionando para /admin');
            this.router.navigate(['/admin']);
            break;
          case 'BROKER':
            console.log('Redirecionando para /broker');
            this.router.navigate(['/broker']);
            break;
          case 'GERENTE':
            console.log('Redirecionando para /gerente');
            this.router.navigate(['/gerente']);
            break;
          default:
            console.error('Role desconhecido:', user.role);
            this.showAlert('Error, unknown role.', 'danger');
        }
      },
      error: (error) => {
        console.error('Erro ao obter o usuário pelo token:', error);
        this.showAlert('Error, try again later.', 'danger');
      }
    });
  }


  onSignup(event: Event): void {
    event.preventDefault();
    this.isLoading = true;
    this.load();

    // Verificação de campos obrigatórios
    if (!this.areAllFieldsFilled()) {
      this.showAlert('Por favor, preencha todos os campos obrigatórios.', 'danger');
      this.isLoading = false;
      this.closeDialog();
      return;
    }

    if (this.senhaCadastro !== this.senhaConfirmacao) {
      this.showAlert('As senhas não coincidem.', 'danger');
      this.isLoading = false;
      this.closeDialog();
      return;
    }

    const novoUsuario = {
      nome: this.nome,
      email: this.email,
      cpf: this.cpf,
      telefoneFixo: this.telefoneFixo,
      senha: this.senhaCadastro,
      role:"CLIENTE"
    };

    this.userService.createUsuario(novoUsuario).subscribe({
      next: (response) => {
        this.showAlert('Cadastro realizado com sucesso!', 'success');
        this.isLoading = false;
        this.sendWelcomeHtmlEmail(this.email, this.nome);
        this.closeDialog();
        window.location.reload();
      },
      error: (error) => {
        this.isLoading = false;
        let errorMessage = 'Erro desconhecido. Tente novamente mais tarde.';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.errors && Array.isArray(error.error.errors)) {
            errorMessage = error.error.errors.join(', ');
          } else if (error.message) {
            errorMessage = error.message;
          }
        }
        this.showAlert(errorMessage, 'danger');
        this.closeDialog();
      }
    });
  }

  // Função para verificar se todos os campos obrigatórios foram preenchidos
  areAllFieldsFilled(): boolean {
    return this.nome.trim() !== '' &&
      this.email.trim() !== '' &&
      this.cpf.trim() !== '' &&
      this.telefoneFixo.trim() !== '' &&
      this.senhaCadastro.trim() !== '' &&
      this.senhaConfirmacao.trim() !== '';
  }


  getIpAddress(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get<{ ip: string }>('https://api.ipify.org?format=json').subscribe(
        data => {
          //console.log('IP Address:', data.ip);
          resolve(data.ip);
        },
        error => {
          console.error('Error getting IP address:', error);
          reject(error);
        }
      );
    });
  }

  sendWelcomeEmail(email: string, name: string): void {
    const emailRequest = {
      to: email,
      subject: 'Welcome!',
      text: `Hello ${name},\n\nWelcome to our platform! We are happy to have you with us.\n\nBest regards,\nPHP Team`
    };

    this.emailService.sendEmail(emailRequest).subscribe({
      next: (response) => {
        console.log('Email de boas-vindas enviado com sucesso!', response);
      },
      error: (error) => {
        console.error('Erro ao enviar email de boas-vindas:', error);
      }
    });
  }

  sendLoginEmail(email: string): void {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const emailRequest = {
      to: email,
      subject: 'Login Notification',
      text: `Hello,\n\nWe are writing to inform you that a login to your account was detected on ${date} at ${time} (GMT). If this activity was carried out by you, you may disregard this message. However, if you did not perform this login, it is imperative that you contact our support team immediately to secure your account.\n\nFor your security, we recommend that you regularly update your password and monitor your account for any unusual activity. Our support team is available 24/7 to assist you with any concerns you may have.\n\nThank you for choosing PHP (Private Holding Partners).\n\nYours sincerely,\nPHP Support Team`
    };

    this.emailService.sendEmail(emailRequest).subscribe({
      next: (response) => {
        console.log('Login notification email sent successfully!', response);
      },
      error: (error) => {
        console.error('Error sending login notification email:', error);
      }
    });
  }

  load() {
    // Salvar a posição de rolagem atual
    const scrollPosition = window.pageYOffset;

    const dialogRef = this.dialog.open(LoadComponent, {

      disableClose: true,
      autoFocus: false
    });

    // Restaurar a posição de rolagem
    dialogRef.afterOpened().subscribe(() => {
      window.scrollTo(0, scrollPosition);
    });

    return dialogRef;
  }

  closeDialog(): void {
    this.dialog.closeAll();
  }

  showAlert(message: string, type: string): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = null;
      this.alertType = null;
    }, 7000);
  }

  sendLoginHtmlEmail(email: string): void {
    const now = new Date();
    const date = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const text = `
      New access to your account has been identified\n\n
      Hello, Partner!\n\n
      We have detected new access to your account on ${date} at ${time} (GMT). If it was you, no action is necessary. However, if you did not perform this login, please contact our support team immediately to secure your account.\n\n
      Thank you for choosing PHP (Private Holding Partners).\n\n
      Yours sincerely,
      PHP Support Team\n
      https://phptrader.com/
    `;
    const htmlBody = this.emailService.createHtmlBody(text);

    const htmlEmailRequest = {
      to: email,
      subject: 'Login Notification',
      htmlBody: htmlBody
    };

    this.emailService.sendHtmlEmail(htmlEmailRequest).subscribe({
      next: (response) => {
        console.log('HTML Welcome email sent successfully!', response);
      },
      error: (error) => {
        console.error('Error sending HTML Welcome email:', error);
      }
    });
  }

  sendWelcomeHtmlEmail(email: string, name: string): void {
    const text = `
    Hello welcome!\n\n
    It is with great pleasure that we receive your registration at PRIVATE HOLDING PARTNERS! Congratulations on taking this important step towards improving your skills and developing in the capital markets.\n
    At PHP, you'll find a vibrant community and valuable resources to help you on your journey. Our Brokerage offers detailed tutorials, advanced tools and specialized support to ensure you have all the conditions to achieve success.\n
    We are here to help you turn your ideas into reality. Explore our portfolio, participate in our forums and don't hesitate to reach out to us whenever you need us. Together, we will build something extraordinary!\n
    Once again, welcome! We are excited to have you with us and look forward to seeing your achievements.\n\n
    Yours sincerely,\n\n


    To access your account click on the link and enter your email and password:\nhttps://phptrader.com/login\n
    PHP Team.\n
    https://phptrader.com/
  `;

    const htmlBody = this.emailService.createHtmlBody(text);

    const htmlEmailRequest = {
      to: email,
      subject: 'Welcome!',
      htmlBody: htmlBody
    };

    this.emailService.sendHtmlEmail(htmlEmailRequest).subscribe({
      next: (response) => {
        console.log('HTML Welcome email sent successfully!', response);
      },
      error: (error) => {
        console.error('Error sending HTML Welcome email:', error);
      }
    });
  }

  setupListeners(): void {
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');

    signUpButton?.addEventListener('click', () => {
      container?.classList.add("right-panel-active");
    });

    signInButton?.addEventListener('click', () => {
      container?.classList.remove("right-panel-active");
    });


  }



















  isLoginFormActive: boolean = true; // Controla o formulário ativo (login por padrão)
isDesktop: boolean = window.innerWidth > 768; // Detecta se é desktop ou mobile



ngOnDestroy(): void {
  window.removeEventListener('resize', this.updateLayout.bind(this));
}

updateLayout(): void {
  this.isDesktop = window.innerWidth > 768;
}

toggleForm(): void {
  this.isLoginFormActive = !this.isLoginFormActive;
}

}
