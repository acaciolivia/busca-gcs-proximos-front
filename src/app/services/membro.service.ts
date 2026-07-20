import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Membro } from '../models/membro.model';

/**
 * Serviço Angular para comunicação com a API de membros.
 * Mapeia os endpoints definidos em MembroController.java.
 */
@Injectable({
  providedIn: 'root'
})
export class MembroService {

  private readonly sBaseUrl = `${environment.sApiUrl}/membros`;

  constructor(private oHttp: HttpClient) {}

  /** GET /api/membros — Lista todos os membros */
  listarTodos(): Observable<Membro[]> {
    return this.oHttp.get<Membro[]>(this.sBaseUrl);
  }

  /** GET /api/membros/{id} — Busca membro por ID */
  buscarPorId(nId: number): Observable<Membro> {
    return this.oHttp.get<Membro>(`${this.sBaseUrl}/${nId}`);
  }

  /** POST /api/membros — Cria novo membro */
  criar(oMembro: Partial<Membro>): Observable<Membro> {
    return this.oHttp.post<Membro>(this.sBaseUrl, oMembro);
  }

  /** PUT /api/membros/{id} — Atualiza membro existente */
  atualizar(nId: number, oMembro: Partial<Membro>): Observable<Membro> {
    return this.oHttp.put<Membro>(`${this.sBaseUrl}/${nId}`, oMembro);
  }

  /** DELETE /api/membros/{id} — Remove membro */
  excluir(nId: number): Observable<void> {
    return this.oHttp.delete<void>(`${this.sBaseUrl}/${nId}`);
  }
}
