// src/app/components/dashboard-admin-content08/dashboard-admin-content08.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { User } from 'src/app/models/user';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-dashboard-admin-content08',
  templateUrl: './dashboard-admin-content08.component.html',
  styleUrls: ['./dashboard-admin-content08.component.css']
})
export class DashboardAdminContent08Component implements OnInit {
  user: User = {} as User;
  userForm!: FormGroup;
  alertMessage: string | null = null;
  alertType: string | null = null;
  isSubmitting = false;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
  ) {
    this.userForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator });
  }

  ngOnInit(): void {
    this.getUsuarioByToken();
  }

  get f(): { [key: string]: AbstractControl } {
    return this.userForm.controls;
  }

  /** Validador: campos iguais */
  private passwordsMatchValidator(group: AbstractControl) {
    const a = group.get('newPassword')?.value;
    const b = group.get('confirmNewPassword')?.value;
    return a && b && a === b ? null : { notMatching: true };
  }

  getUsuarioByToken2(): void {
    const tk = localStorage.getItem('authToken');
    if (tk !== null) {
      this.userService.getUsuarioByToken(tk).subscribe({
        next: (data) => { this.user = data; },
        error: (err) => { console.error('Error fetching user by token:', err); }
      });
    } else {
      console.error('Auth token is null');
    }
  }



  getUsuarioByToken(): void {
    const tk = localStorage.getItem('authToken');
    if (tk) {
      this.userService.getByTokenLogin(tk).subscribe(
        data => {
          this.user = data;

        },
      );
    }
  }

  togglePasswordVisibility(inputId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  }

  changePassword(): void {
    if (!this.user || this.user.id == null) {
      this.showAlert('Usuário inválido para alterar senha.', 'danger');
      return;
    }

    if (this.userForm.invalid) {
      if (this.userForm.errors?.['notMatching']) {
        this.showAlert('As senhas não conferem.', 'danger');
      } else {
        this.showAlert('Preencha corretamente os campos.', 'danger');
      }
      return;
    }

    const newPassword = this.f['newPassword'].value as string;

    this.isSubmitting = true;
    this.userService.updateSenhaUsuario(this.user.id, newPassword).subscribe({
      next: (res) => {
        this.showAlert('Senha alterada com sucesso!', 'success');
        this.userForm.reset();
      },
      error: (err) => {
        console.error('Error trying to change password', err);
        this.showAlert('Erro ao tentar alterar a senha.', 'danger');
      }
    }).add(() => this.isSubmitting = false);
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
