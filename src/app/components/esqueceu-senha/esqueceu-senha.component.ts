import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { EmailService } from 'src/app/services/email.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-esqueceu-senha',
  templateUrl: './esqueceu-senha.component.html',
  styleUrls: ['./esqueceu-senha.component.css']
})
export class EsqueceuSenhaComponent implements OnInit {
  user: User | undefined;
  newPassword: string = '';
  confirmNewPassword: string = '';
  alertMessage: string | null = null;
  alertType: string | null = null;
  token: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router, 
    private userService: UserService) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    this.getUserByToken();
  }

  getUserByToken(): void {
    if (this.token) {
      this.userService.getUsuarioByToken(this.token).subscribe(
        user => {
          this.user = user;
        },
        error => {
          console.error('Error trying to find user by token, trying tokenIdentificacao', error);
          this.getUserByTokenIdentificacao();
        }
      );
    } else {
      console.error('Token not found in URL');
      this.showAlert('Token not found in URL', 'danger');
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 3000);
    }
  }

  getUserByTokenIdentificacao(): void {
    if (this.token) {
      this.userService.getByToken(this.token).subscribe(
        user => {
          this.user = user;
        },
        error => {
          console.error('Error trying to find user', error);
          this.showAlert('Error trying to find user', 'danger');
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 3000);
        }
      );
    } else {
      console.error('Token not found in URL');
      this.showAlert('Token not found in URL', 'danger');
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 3000);
    }
  }

  togglePasswordVisibility(inputId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input.type === 'password') {
      input.type = 'text';
    } else {
      input.type = 'password';
    }
  }

  changePassword(): void {
    if (!this.newPassword || !this.confirmNewPassword) {
      this.showAlert('Both password fields are required.', 'danger');
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.showAlert('Passwords do not match. Please try again.', 'danger');
      return;
    }

    if (this.user && this.user.id !== undefined) {
      this.userService.updateSenhaUsuario(this.user.id, this.newPassword).subscribe(
        response => {
          this.showAlert('Password changed successfully!', 'success');
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 3000);
        },
        error => {
          console.error('Error trying to change password', error);
          this.showAlert('Error trying to change password', 'danger');
        }
      );
    }
  }


  showAlert(message: string, type: string): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = null;
      this.alertType = null;
    }, 7000);
  }
}
