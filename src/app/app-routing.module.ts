import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListagemComponent } from './pages/listagem/listagem.component';
import { CadastroComponent } from './pages/cadastro/cadastro.component';
import { GruposComponent }   from './pages/grupos/grupos.component';
import { LoginComponent }    from './pages/login/login.component';
import { authGuard }         from './shared/auth.guard';

const routes: Routes = [
  { path: '',         component: ListagemComponent },
  { path: 'login',    component: LoginComponent },
  { path: 'cadastro', component: CadastroComponent, canActivate: [authGuard] },
  { path: 'grupos',   component: GruposComponent,   canActivate: [authGuard] },
  { path: '**',       redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
