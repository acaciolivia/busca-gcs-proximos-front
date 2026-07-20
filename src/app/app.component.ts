import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  sAnoAtual = new Date().getFullYear();

  constructor(private oAuth: AuthService, private oRouter: Router) {}

  get bAutenticado(): boolean {
    return this.oAuth.estaAutenticado();
  }

  sair(): void {
    this.oAuth.logout();
    this.oRouter.navigateByUrl('/');
  }
}
