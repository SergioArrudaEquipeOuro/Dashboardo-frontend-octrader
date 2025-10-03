import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LoadComponent } from 'src/app/components/load/load.component';
import { User } from 'src/app/models/user';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { UploadService } from 'src/app/services/upload.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-dashboard-gerente',
  templateUrl: './dashboard-gerente.component.html',
  styleUrls: ['./dashboard-gerente.component.css']
})
export class DashboardGerenteComponent implements OnInit {
  selectedTab: string = localStorage.getItem('selectedTab') || 'switch-05';
  user!: User;
  activeEnterprise: any;
  isLoading = true;
  isSidebarOpen = true; // desktop: aberto por padrão
  isMobile = false;

  constructor(
    public dialog: MatDialog,
    private userService: UserService,
    private router: Router,
    private enterpriseService: EnterpriseService,
    private uploadService: UploadService
  ) { }

  ngOnInit(): void {
    this.getActiveEnterprise();
    this.isMobile = window.innerWidth < 992;
    this.isSidebarOpen = !this.isMobile;
    this.getUsuarioByToken();
  }

  getProfileImageUrl(imgPerfil: string | undefined): string {
    if (!imgPerfil) {
      return 'https://i.imgur.com/ICbUrx3.png';
    }
    return `${this.uploadService.url()}${imgPerfil}`;
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

  @HostListener('window:resize')
  onResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 992;

    if (this.isMobile && !wasMobile) {
      // Desktop -> Mobile
      this.isSidebarOpen = false;
    } else if (!this.isMobile && wasMobile) {
      // Mobile -> Desktop
      this.isSidebarOpen = true;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    localStorage.setItem('selectedTab', tab);

    // No mobile, fecha após escolher
    if (this.isMobile) this.isSidebarOpen = false;
  }

  /* ======= sua lógica existente mantida ======= */
  getUsuarioByToken(): void {
    const tk = localStorage.getItem('authToken');
    if (tk) {
      this.userService.getByTokenLogin(tk).subscribe(
        data => {
          this.user = data;
          if (this.user?.email) {
            localStorage.setItem('authorEmail', this.user.email);
          }
          if (this.user.role === 'GERENTE') {
            this.router.navigate(['/gerente']);
          } else {
            this.router.navigate(['/']);
          }
        },
        _ => { this.router.navigate(['/']); }
      );
    } else {
      this.router.navigate(['/']);
    }
  }

  off() {
    localStorage.setItem('authToken', '');
    this.router.navigate(['/']);
  }

homebroker() {
  this.enterpriseService.getAllEnterprises().subscribe(
    (enterprises) => {
      if (enterprises && enterprises.length > 0) {
        const homeBroker = enterprises?.[0]?.homeBroker ?? '';
        const name = enterprises[0].nomeEmpresa;
        
        if (homeBroker && homeBroker.trim() !== '') {
          // Pergunta se o usuário quer ir para o homebroker
          const confirmMessage = `Deseja ir para a plataforma ${name}?`;
          
          if (confirm(confirmMessage)) {
            // Abre o homebroker em uma nova aba
            window.open(homeBroker, '_blank');
          }
        } else {
          alert(`A plataforma ${name} está em manutenção.`);
        }
      }
    },
    (error) => {
      console.error('Erro ao buscar Enterprise:', error);
      alert('Erro ao conectar com a plataforma. Tente novamente mais tarde.');
    }
  );
}
}
