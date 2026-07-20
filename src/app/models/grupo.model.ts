import { Membro } from './membro.model';

/**
 * Interface que representa um grupo/célula da igreja.
 *
 * RN-001: cada membro pertence a no máximo um grupo.
 * RN-002: cada grupo tem exatamente um líder.
 */
export interface Grupo {
  nId?:                number;
  sNome:               string;
  sDescricao?:         string;

  /** ID do membro que é o líder (obrigatório no payload de criação/edição). */
  nLiderId:            number;
  /** Nome do líder (somente leitura, vem na resposta). */
  sNomeLider?:         string;

  /** Quantidade de membros do grupo (somente leitura). */
  nQuantidadeMembros?: number;

  /** Lista de membros vinculados (presente apenas no GET de detalhe). */
  lMembros?:           Membro[];

  dtCriacao?:          string;
  dtAtualizacao?:      string;
}
