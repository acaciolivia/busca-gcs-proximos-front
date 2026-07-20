import {
  HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor que:
 *  1. Adiciona o header X-Auth-Token quando há sessão ativa.
 *  2. Captura 401 (sessão expirada/inválida) e redireciona para /login.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private oAuth: AuthService, private oRouter: Router) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const sToken = this.oAuth.obterToken();
    const oReqFinal = sToken
      ? req.clone({ setHeaders: { 'X-Auth-Token': sToken } })
      : req;

    return next.handle(oReqFinal).pipe(
      catchError((oErro: HttpErrorResponse) => {
        if (oErro.status === 401 && !req.url.includes('/api/auth/')) {
          // Sessão expirou ou foi invalidada — limpa localmente e manda pra login.
          sessionStorage.clear();
          this.oRouter.navigate(['/login'], {
            queryParams: { redirect: this.oRouter.url }
          });
        }
        return throwError(() => oErro);
      })
    );
  }
}
