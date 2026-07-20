import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Grupo } from '../models/grupo.model';

/**
 * Serviço Angular para CRUD de grupos/células.
 * Mapeia os endpoints definidos em GrupoController.java.
 */
@Injectable({ providedIn: 'root' })
export class GrupoService {

  private readonly sBaseUrl = `${environment.sApiUrl}/grupos`;

  constructor(private oHttp: HttpClient) {}

  /** GET /api/grupos — lista todos (sem lMembros) */
  listarTodos(): Observable<Grupo[]> {
    return this.oHttp.get<Grupo[]>(this.sBaseUrl);
  }

  /** GET /api/grupos/{id} — detalhe completo (com lMembros) */
  buscarPorId(nId: number): Observable<Grupo> {
    return this.oHttp.get<Grupo>(`${this.sBaseUrl}/${nId}`);
  }

  /** POST /api/grupos — cria grupo */
  criar(oGrupo: Partial<Grupo>): Observable<Grupo> {
    return this.oHttp.post<Grupo>(this.sBaseUrl, oGrupo);
  }

  /** PUT /api/grupos/{id} — atualiza grupo */
  atualizar(nId: number, oGrupo: Partial<Grupo>): Observable<Grupo> {
    return this.oHttp.put<Grupo>(`${this.sBaseUrl}/${nId}`, oGrupo);
  }

  /** DELETE /api/grupos/{id} — exclui (desvincula membros) */
  excluir(nId: number): Observable<void> {
    return this.oHttp.delete<void>(`${this.sBaseUrl}/${nId}`);
  }

  /** POST /api/grupos/{id}/membros/{idMembro} */
  adicionarMembro(nGrupoId: number, nMembroId: number): Observable<void> {
    return this.oHttp.post<void>(`${this.sBaseUrl}/${nGrupoId}/membros/${nMembroId}`, null);
  }

  /** DELETE /api/grupos/{id}/membros/{idMembro} */
  removerMembro(nGrupoId: number, nMembroId: number): Observable<void> {
    return this.oHttp.delete<void>(`${this.sBaseUrl}/${nGrupoId}/membros/${nMembroId}`);
  }
}
