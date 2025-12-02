import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ContentComponent } from './components/contets-dashboard/content/content.component';
import { DialogRankingComponent } from './dialog/dialog-ranking/dialog-ranking.component';
import { MatDialogModule } from '@angular/material/dialog';
import { DasboardClientContent01Component } from './components/contets-dashboard/dasboard-client-content01/dasboard-client-content01.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './pages/login/login.component';
import { LoadComponent } from './components/load/load.component';
import { DashboardClientContent02Component } from './components/contets-dashboard/dashboard-client-content02/dashboard-client-content02.component';
import { DashboardClientContent03Component } from './components/contets-dashboard/dashboard-client-content03/dashboard-client-content03.component';
import { DashboardClientContent04Component } from './components/contets-dashboard/dashboard-client-content04/dashboard-client-content04.component';
import { DashboardClientContent05Component } from './components/contets-dashboard/dashboard-client-content05/dashboard-client-content05.component';
import { DashboardClientContent06Component } from './components/contets-dashboard/dashboard-client-content06/dashboard-client-content06.component';
import { DashboardClientContent07Component } from './components/contets-dashboard/dashboard-client-content07/dashboard-client-content07.component';
import { DashboardClientContent08Component } from './components/contets-dashboard/dashboard-client-content08/dashboard-client-content08.component';
import { AssingComponent } from './components/assing/assing.component';
import { DashboardAdminComponent } from './pages/admin/dashboard-admin/dashboard-admin.component';
import { DashboardAdminContent01Component } from './pages/admin/components/dashboard-admin-content01/dashboard-admin-content01.component';
import { DashboardAdminContent02Component } from './pages/admin/components/dashboard-admin-content02/dashboard-admin-content02.component';
import { DashboardAdminContent03Component } from './pages/admin/components/dashboard-admin-content03/dashboard-admin-content03.component';
import { DashboardAdminContent04Component } from './pages/admin/components/dashboard-admin-content04/dashboard-admin-content04.component';
import { DashboardAdminContent05Component } from './pages/admin/components/dashboard-admin-content05/dashboard-admin-content05.component';
import { DashboardAdminContent06Component } from './pages/admin/components/dashboard-admin-content06/dashboard-admin-content06.component';
import { DashboardAdminContent07Component } from './pages/admin/components/dashboard-admin-content07/dashboard-admin-content07.component';
import { DashboardAdminContent08Component } from './pages/admin/components/dashboard-admin-content08/dashboard-admin-content08.component';
import { DashboardAdminContent09Component } from './pages/admin/components/dashboard-admin-content09/dashboard-admin-content09.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { DashboardGerenteContent01Component } from './pages/gerente/components/dashboard-gerente-content01/dashboard-gerente-content01.component';
import { DashboardGerenteComponent } from './pages/gerente/dashboard-gerentee/dashboard-gerente.component';
import { DashboardGerenteContent02Component } from './pages/gerente/components/dashboard-gerente-content02/dashboard-gerente-content02.component';
import { DashboardGerenteContent03Component } from './pages/gerente/components/dashboard-gerente-content03/dashboard-gerente-content03.component';
import { DashboardGerenteContent04Component } from './pages/gerente/components/dashboard-gerente-content04/dashboard-gerente-content04.component';
import { DashboardGerenteContent05Component } from './pages/gerente/components/dashboard-gerente-content05/dashboard-gerente-content05.component';
import { DashboardGerenteContent06Component } from './pages/gerente/components/dashboard-gerente-content06/dashboard-gerente-content06.component';
import { DashboardGerenteContent07Component } from './pages/gerente/components/dashboard-gerente-content07/dashboard-gerente-content07.component';
import { DashboardGerenteContent08Component } from './pages/gerente/components/dashboard-gerente-content08/dashboard-gerente-content08.component';
import { DashboardGerenteContent09Component } from './pages/gerente/components/dashboard-gerente-content09/dashboard-gerente-content09.component';
import { DashboardBrokerComponent } from './pages/broker/dashboard-broker/dashboard-broker.component';
import { DashboardBrokerContent01Component } from './pages/broker/components/dashboard-broker-content01/dashboard-broker-content01.component';
import { DashboardBrokerContent02Component } from './pages/broker/components/dashboard-broker-content02/dashboard-broker-content02.component';
import { DashboardBrokerContent03Component } from './pages/broker/components/dashboard-broker-content03/dashboard-broker-content03.component';
import { DashboardBrokerContent04Component } from './pages/broker/components/dashboard-broker-content04/dashboard-broker-content04.component';
import { DashboardBrokerContent05Component } from './pages/broker/components/dashboard-broker-content05/dashboard-broker-content05.component';
import { DashboardBrokerContent06Component } from './pages/broker/components/dashboard-broker-content06/dashboard-broker-content06.component';
import { DashboardBrokerContent07Component } from './pages/broker/components/dashboard-broker-content07/dashboard-broker-content07.component';
import { DashboardBrokerContent08Component } from './pages/broker/components/dashboard-broker-content08/dashboard-broker-content08.component';
import { DashboardBrokerContent09Component } from './pages/broker/components/dashboard-broker-content09/dashboard-broker-content09.component';
import { CommonModule, DatePipe } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { DashboardAdminContent10Component } from './pages/admin/components/dashboard-admin-content10/dashboard-admin-content10.component';
import { Login2Component } from './pages/login2/login2.component';
import { GraficoTradingviewComponent } from './components/grafico-tradingview/grafico-tradingview.component';
import { DashboardAdminContent11Component } from './pages/admin/components/dashboard-admin-content11/dashboard-admin-content11.component';
import { TestComponent } from './components/test/test.component';
import { FilterPipe } from './components/pipe/filter.pipe';
import { AdminPainel01Component } from './pages/admin/paineis/admin-painel01/admin-painel01.component';
import { FilterByPipe } from './components/pipe/FilterByPipe';
import { AdminPainel02Component } from './pages/admin/paineis/admin-painel02/admin-painel02.component';
import { AdminPainel03Component } from './pages/admin/paineis/admin-painel03/admin-painel03.component';
import { AdminPainel04Component } from './pages/admin/paineis/admin-painel04/admin-painel04.component';
import { DashboardAdminContent12Component } from './pages/admin/components/dashboard-admin-content12/dashboard-admin-content12.component';
import { AdminPainel05Component } from './pages/admin/paineis/admin-painel05/admin-painel05.component';
import { AdminPainel06Component } from './pages/admin/paineis/admin-painel06/admin-painel06.component';
import { DashboardAdminContent13Component } from './pages/admin/components/dashboard-admin-content13/dashboard-admin-content13.component';
import { AdminPainel07Component } from './pages/admin/paineis/admin-painel07/admin-painel07.component';
import { PainelClient01Component } from './components/painel-client/painel-client01/painel-client01.component';
import { PainelClient02Component } from './components/painel-client/painel-client02/painel-client02.component';
import { PainelClient03Component } from './components/painel-client/painel-client03/painel-client03.component';
import { PainelClient04Component } from './components/painel-client/painel-client04/painel-client04.component';
import { DashboardAdminContent14Component } from './pages/admin/components/dashboard-admin-content14/dashboard-admin-content14.component';
import { PainelClient05Component } from './components/painel-client/painel-client05/painel-client05.component';
import { PainelClient06Component } from './components/painel-client/painel-client06/painel-client06.component';
import { PainelClient07Component } from './components/painel-client/painel-client07/painel-client07.component';
import { PainelClient08Component } from './components/painel-client/painel-client08/painel-client08.component';
import { PainelClient09Component } from './components/painel-client/painel-client09/painel-client09.component';
import { PainelClient10Component } from './components/painel-client/painel-client10/painel-client10.component';
import { PainelAdm01Component } from './components/painel-adm/painel-adm01/painel-adm01.component';
import { PainelAdm02Component } from './components/painel-adm/painel-adm02/painel-adm02.component';
import { PainelBroker01Component } from './components/painel-broker/painel-broker01/painel-broker01.component';
import { PainelAdm03Component } from './components/painel-adm/painel-adm03/painel-adm03.component';
import { PainelClient11Component } from './components/painel-client/painel-client11/painel-client11.component';
import { HomebrokerComponent } from './pages/homebroker/homebroker.component';
import { DashboardAdmin15Component } from './pages/admin/dashboard-admin15/dashboard-admin15.component';
import { DashboardAdminContent15Component } from './pages/admin/components/dashboard-admin-content15/dashboard-admin-content15.component';
import { Homebroker2Component } from './pages/homebroker2/homebroker2.component';
import { DashboardBrokerContent10Component } from './pages/broker/components/dashboard-broker-content10/dashboard-broker-content10.component';
import { EsqueceuSenhaComponent } from './components/esqueceu-senha/esqueceu-senha.component';

// Função de fábrica para carregar arquivos de tradução
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    NavbarComponent,
    ContentComponent,
    DialogRankingComponent,
    DasboardClientContent01Component,
    LoginComponent,
    LoadComponent,
    DashboardClientContent02Component,
    DashboardClientContent03Component,
    DashboardClientContent04Component,
    DashboardClientContent05Component,
    DashboardClientContent06Component,
    DashboardClientContent07Component,
    DashboardClientContent08Component,
    AssingComponent,
    DashboardAdminComponent,
    DashboardAdminContent01Component,
    DashboardAdminContent02Component,
    DashboardAdminContent03Component,
    DashboardAdminContent04Component,
    DashboardAdminContent05Component,
    DashboardAdminContent06Component,
    DashboardAdminContent07Component,
    DashboardAdminContent08Component,
    DashboardAdminContent09Component,
    DashboardGerenteContent01Component,
    DashboardGerenteComponent,
    DashboardGerenteContent02Component,
    DashboardGerenteContent03Component,
    DashboardGerenteContent04Component,
    DashboardGerenteContent05Component,
    DashboardGerenteContent06Component,
    DashboardGerenteContent07Component,
    DashboardGerenteContent08Component,
    DashboardGerenteContent09Component,
    DashboardBrokerComponent,
    DashboardBrokerContent01Component,
    DashboardBrokerContent02Component,
    DashboardBrokerContent03Component,
    DashboardBrokerContent04Component,
    DashboardBrokerContent05Component,
    DashboardBrokerContent06Component,
    DashboardBrokerContent07Component,
    DashboardBrokerContent08Component,
    DashboardBrokerContent09Component,
    DashboardAdminContent10Component,
    Login2Component,
    GraficoTradingviewComponent,
    DashboardAdminContent11Component,
    TestComponent,
    FilterPipe,
    AdminPainel01Component,
    FilterByPipe,
    AdminPainel02Component,
    AdminPainel03Component,
    AdminPainel04Component,
    DashboardAdminContent12Component,
    AdminPainel05Component,
    AdminPainel06Component,
    DashboardAdminContent13Component,
    AdminPainel07Component,
    PainelClient01Component,
    PainelClient02Component,
    PainelClient03Component,
    PainelClient04Component,
    DashboardAdminContent14Component,
    PainelClient05Component,
    PainelClient06Component,
    PainelClient07Component,
    PainelClient08Component,
    PainelClient09Component,
    PainelClient10Component,
    PainelAdm01Component,
    PainelAdm02Component,
    PainelBroker01Component,
    PainelAdm03Component,
    PainelClient11Component,
    HomebrokerComponent,
    DashboardAdmin15Component,
    DashboardAdminContent15Component,
    Homebroker2Component,
    DashboardBrokerContent10Component,
    EsqueceuSenhaComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ClipboardModule,
    MatProgressSpinnerModule,
    HighchartsChartModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
