/**
 * Interface que representa um membro da igreja.
 * Segue a notação húngara adotada no projeto:
 *   n  = número (Long/number)
 *   s  = string
 *   b  = boolean
 *   dt = data/hora
 */
export interface Membro {
  nId?:             number;
  sNome:            string;
  sTelefone?:       string;
  sFuncao:          string;
  /** Indica se o telefone é WhatsApp (clicável → abre o app) */
  bWhatsapp?:       boolean;
  /** Indica se a pessoa autorizou ser contactada pela igreja */
  bAceitaContato?:  boolean;
  /** Indica se o membro está desigrejado (afastado da igreja) */
  bDesigrejado?:    boolean;
  nEnderecoId?:     number;

  /** Grupo/célula ao qual o membro pertence (opcional — RN-001) */
  nGrupoId?:        number;
  sNomeGrupo?:      string;
  sNomeLiderGrupo?: string;
  dtCriacao?:       string;
  dtAtualizacao?:   string;
}

/** Opções de função disponíveis na igreja */
export const FUNCOES_IGREJA: string[] = [
  'Membro',
  'Diácono',
  'Presbítero',
  'Evangelista',
  'Pastor',
  'Pastor Auxiliar',
  'Missionário',
  'Líder de Célula',
  'Líder de Louvor',
  'Auxiliar',
  'Visitante'
];
