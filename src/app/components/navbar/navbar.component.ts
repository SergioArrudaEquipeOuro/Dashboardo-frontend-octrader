import { Component, HostListener, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import * as bootstrap from 'bootstrap';
import { User } from 'src/app/models/user';
import { EnterpriseService } from 'src/app/services/enterprise.service';
import { UploadService } from 'src/app/services/upload.service';
import { UserService } from 'src/app/services/user.service';


@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  selectedTab: string = localStorage.getItem('selectedTab') || 'switch-01';
  user!: User;
  activeEnterprise: any;
  isLoading = true;
  isSidebarOpen = true; // desktop: aberto por padrão
  isMobile = false;
  public currentLang: string;
  langOpen = false;

  langs = [
    { value: 'en', label: 'English', flag: 'us' },
    { value: 'pt', label: 'Português', flag: 'br' },
    { value: 'es', label: 'Español', flag: 'es' },
    { value: 'zh-TW', label: '繁體中文', flag: 'tw' },
    { value: 'ru', label: 'Русский', flag: 'ru' },
  ];

  constructor(
    public dialog: MatDialog,
    private userService: UserService,
    private router: Router,
    private enterpriseService: EnterpriseService,
    private uploadService: UploadService,
    private translate: TranslateService,
  ) {
    this.translate.addLangs(['en', 'pt', 'es', 'zh-TW', 'ru']);
    const savedLang = localStorage.getItem('language');
    const browserLang = this.translate.getBrowserLang();

    // Use o idioma salvo no localStorage ou o idioma do navegador
    this.currentLang = savedLang || (browserLang.match(/en|pt|es|zh-TW|ru/) ? browserLang : 'en');
    this.translate.setDefaultLang(this.currentLang);
    this.translate.use(this.currentLang);
  }

  ngOnInit(): void {
    this.getActiveEnterprise();
    this.isMobile = window.innerWidth < 992; // breakpoint lg
    this.isSidebarOpen = !this.isMobile;     // no mobile, começa fechado
    this.getUsuarioByToken();
  }

  toggleLang(ev: Event) {
    ev.stopPropagation();
    this.langOpen = !this.langOpen;
  }

  setLang(code: string, ev?: Event) {
    if (ev) ev.stopPropagation();
    this.translate.use(code);
    localStorage.setItem('language', code);
    this.currentLang = code;
    this.langOpen = false;
  }

  getLangLabel(code: string): string {
    const f = this.langs.find(l => l.value === code);
    return f ? f.label : code;
  }

  getFlagClass(code: string): string {
    const f = this.langs.find(l => l.value === code);
    return f ? f.flag : 'us';
  }

  @HostListener('document:click')
  closeLangOnOutsideClick() {
    if (this.langOpen) this.langOpen = false;
  }

  getProfileImageUrl(imgPerfil: string | undefined): string {
    if (!imgPerfil) {
      return 'https://img.freepik.com/vetores-premium/icone-de-perfil-de-usuario-em-estilo-plano-ilustracao-em-vetor-avatar-membro-em-fundo-isolado-conceito-de-negocio-de-sinal-de-permissao-humana_157943-15752.jpg'; // URL de uma imagem padrão caso o usuário não tenha foto
    }
    return `${this.uploadService.url()}${imgPerfil}`;
  }

    getProfileImageUrl2(imgPerfil: string | undefined): string {
    return `${this.uploadService.url()}${imgPerfil}`;
  }

  getActiveEnterprise(): void {
    this.enterpriseService.getActiveEnterprise()
      .pipe()
      .subscribe({
        next: (e: any) => {
          this.activeEnterprise = e ?? null;
          this.isLoading = false;
          this.openModal()
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
          if (this.user.role === 'CLIENTE') {
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

  openModal(): void {
    // Obter as URLs do localStorage e da ActiveEnterprise
    const propagandaUrlStorage = localStorage.getItem('propagandaUrl');
    const lastOpenedTimeStorage = localStorage.getItem('propagandaLastOpened');
    const propagandaUrl = this.activeEnterprise?.propagandaUrl;


    // Verificar se já passaram mais de 6 horas desde a última abertura
    const currentTime = new Date().getTime(); // Timestamp atual
    const sixHoursInMillis = 1 * 60 * 60 * 1000; // 6 horas em milissegundos
    const isSixHoursElapsed = lastOpenedTimeStorage
      ? currentTime - parseInt(lastOpenedTimeStorage, 10) > sixHoursInMillis
      : true;

    // Abrir o modal se as URLs forem diferentes ou se já passaram mais de 6 horas
    if (propagandaUrl && (propagandaUrlStorage !== propagandaUrl || isSixHoursElapsed)) {
      const modalElement = document.getElementById('prop');
      if (modalElement) {
        // Mostrar o modal usando Bootstrap
        const bootstrapModal = new bootstrap.Modal(modalElement);
        bootstrapModal.show();

        // Atualizar o localStorage com a nova URL e o timestamp da abertura
        localStorage.setItem('propagandaUrl', propagandaUrl);
        localStorage.setItem('propagandaLastOpened', currentTime.toString());
      }
    }
  }

  getFirstName(fullName: string | undefined): string {
    if (!fullName) return 'Carregando...';
    return fullName.split(' ')[0];
  }


  switchLanguage(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const language = selectElement.value;
    this.translate.use(language);
    localStorage.setItem('language', language);
    this.currentLang = language; // Atualize o idioma atual
  }
}
