import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  fLogin: FormGroup;
  bAutenticando = false;
  bMostrarSenha = false;
  sRotaRedirect = '/cadastro';

  constructor(
    private oFb: FormBuilder,
    private oAuth: AuthService,
    private oRouter: Router,
    private oRoute: ActivatedRoute,
    private oSnackBar: MatSnackBar
  ) {
    this.fLogin = this.oFb.group({
      sSenha: ['', Validators.required]
    });
    this.oRoute.queryParams.subscribe(p => {
      if (p['redirect']) this.sRotaRedirect = p['redirect'];
    });
  }

  entrar(): void {
    if (this.fLogin.invalid || this.bAutenticando) return;
    this.bAutenticando = true;

    const sSenha = this.fLogin.value.sSenha;
    this.oAuth.login(sSenha).subscribe({
      next: () => {
        this.oSnackBar.open('Acesso liberado!', 'Fechar', {
          duration: 2500, panelClass: ['snack-sucesso'],
          horizontalPosition: 'end', verticalPosition: 'bottom'
        });
        this.oRouter.navigateByUrl(this.sRotaRedirect);
      },
      error: (e: { error: string }) => {
        this.bAutenticando = false;
        this.oSnackBar.open(e.error || 'Senha incorreta.', 'Fechar', {
          duration: 4000, panelClass: ['snack-erro'],
          horizontalPosition: 'end', verticalPosition: 'bottom'
        });
        this.fLogin.patchValue({ sSenha: '' });
      }
    });
  }
}
