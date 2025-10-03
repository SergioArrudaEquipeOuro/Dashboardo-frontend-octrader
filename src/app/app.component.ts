import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'dashboard';
  public currentLang: string;

  constructor(
    private translate: TranslateService
  ) {
    this.translate.addLangs(['en', 'pt', 'es', 'zh-TW', 'ru']);
    const savedLang = localStorage.getItem('language');
    const browserLang = this.translate.getBrowserLang();

    // Use o idioma salvo no localStorage ou o idioma do navegador
    this.currentLang = savedLang || (browserLang.match(/en|pt|es|zh-TW|ru/) ? browserLang : 'en');
    this.translate.setDefaultLang(this.currentLang);
    this.translate.use(this.currentLang);
  }
}
