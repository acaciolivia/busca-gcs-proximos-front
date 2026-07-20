import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResposta {
  sToken: string;
  nHorasValido: number;
}

/**
 * Serviço de autenticação. Mantém o token de sessão no sessionStorage
 * (some quando o navegador é fechado, ao contrário do localStorage).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly sBaseUrl = `${environment.sApiUrl}/auth`;
  private readonly sChaveToken    = 'ipf_auth_token';
  private readonly sChaveExpiracao = 'ipf_auth_expira_em';

  constructor(private oHttp: HttpClient) {}

  /** Tenta autenticar com a senha. Em sucesso, salva o token. */
  login(sSenha: string): Observable<LoginResposta> {
    return this.oHttp.post<LoginResposta>(`${this.sBaseUrl}/login`, { sSenha })
      .pipe(tap(oResp => this.salvarSessao(oResp.sToken, oResp.nHorasValido)));
  }

  /** Verifica no backend se o token atual ainda é válido. */
  verificarSessao(): Observable<boolean> {
    if (!this.obterToken()) return of(false);
    return this.oHttp.get<{ bValido: boolean }>(`${this.sBaseUrl}/verificar`)
      .pipe(
        map(o => o.bValido),
        catchError(() => of(false))
      );
  }

  /** Encerra a sessão local e no backend. */
  logout(): void {
    if (this.obterToken()) {
      this.oHttp.post(`${this.sBaseUrl}/logout`, null).subscribe({
        next: () => {}, error: () => {}
      });
    }
    sessionStorage.removeItem(this.sChaveToken);
    sessionStorage.removeItem(this.sChaveExpiracao);
  }

  /** True se há token válido (sem expiração) no sessionStorage. */
  estaAutenticado(): boolean {
    const sToken = this.obterToken();
    if (!sToken) return false;
    const sExpira = sessionStorage.getItem(this.sChaveExpiracao);
    if (!sExpira) return false;
    const nExpira = Number(sExpira);
    if (Date.now() > nExpira) {
      sessionStorage.removeItem(this.sChaveToken);
      sessionStorage.removeItem(this.sChaveExpiracao);
      return false;
    }
    return true;
  }

  /** Retorna o token atual ou null. */
  obterToken(): string | null {
    return sessionStorage.getItem(this.sChaveToken);
  }

  private salvarSessao(sToken: string, nHorasValido: number): void {
    const nExpira = Date.now() + nHorasValido * 3600 * 1000;
    sessionStorage.setItem(this.sChaveToken, sToken);
    sessionStorage.setItem(this.sChaveExpiracao, String(nExpira));
  }
}
