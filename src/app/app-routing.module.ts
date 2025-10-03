import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LoginComponent } from './pages/login/login.component';
import { AssingComponent } from './components/assing/assing.component';
import { DashboardAdminComponent } from './pages/admin/dashboard-admin/dashboard-admin.component';
import { DashboardGerenteComponent } from './pages/gerente/dashboard-gerentee/dashboard-gerente.component';
import { DashboardBrokerComponent } from './pages/broker/dashboard-broker/dashboard-broker.component';
import { Login2Component } from './pages/login2/login2.component';
import { TestComponent } from './components/test/test.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: Login2Component },
  { path: 'dashboard', component: NavbarComponent },
  { path: 'admin', component: DashboardAdminComponent },
  { path: 'gerente', component: DashboardGerenteComponent },
  { path: 'broker', component: DashboardBrokerComponent },



  { path: 'teste', component: TestComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
