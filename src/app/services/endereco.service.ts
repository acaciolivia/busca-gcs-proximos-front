import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Endereco } from '../models/endereco.model';
import { EnderecoProximo } from '../models/endereco-proximo.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EnderecoService {

  private readonly sBaseUrl = `${environment.sApiUrl}/enderecos`;

  constructor(private oHttp: HttpClient) {}

  /** Lista todos os endereços cadastrados */
  listarTodos(): Observable<Endereco[]> {
    return this.oHttp.get<Endereco[]>(this.sBaseUrl);
  }

  /** Busca um endereço pelo ID */
  buscarPorId(nId: number): Observable<Endereco> {
    return this.oHttp.get<Endereco>(`${this.sBaseUrl}/${nId}`);
  }

  /** Cria um novo endereço (back-end consulta ViaCEP e geocodifica) */
  criar(oEndereco: Partial<Endereco>): Observable<Endereco> {
    return this.oHttp.post<Endereco>(this.sBaseUrl, oEndereco);
  }

  /** Atualiza um endereço existente */
  atualizar(nId: number, oEndereco: Partial<Endereco>): Observable<Endereco> {
    return this.oHttp.put<Endereco>(`${this.sBaseUrl}/${nId}`, oEndereco);
  }

  /** Remove um endereço pelo ID */
  excluir(nId: number): Observable<void> {
    return this.oHttp.delete<void>(`${this.sBaseUrl}/${nId}`);
  }

  /**
   * Consulta o ViaCEP via back-end para autopreenchimento do formulário.
   * Não salva nada no banco de dados.
   */
  consultarCep(sCep: string): Observable<Endereco> {
    const sCepLimpo = sCep.replace(/\D/g, '');
    return this.oHttp.get<Endereco>(`${this.sBaseUrl}/cep/${sCepLimpo}`);
  }

  /**
   * Busca endereços cadastrados ordenados por distância crescente.
   * @param sCep     CEP de referência do usuário
   * @param nRaioKm  Raio máximo em km (opcional; undefined = todos)
   */
  buscarProximos(sCep: string, nRaioKm?: number): Observable<EnderecoProximo[]> {
    const sCepLimpo = sCep.replace(/\D/g, '');
    let oParams = new HttpParams().set('cep', sCepLimpo);
    if (nRaioKm && nRaioKm > 0) {
      oParams = oParams.set('raioKm', nRaioKm.toString());
    }
    return this.oHttp.get<EnderecoProximo[]>(`${this.sBaseUrl}/proximos`, { params: oParams });
  }
}
