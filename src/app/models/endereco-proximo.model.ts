import { Endereco } from './endereco.model';

/**
 * Modelo de resposta para busca por proximidade.
 * Estende Endereco (que já inclui lMembros) adicionando
 * a distância calculada em quilômetros.
 */
export interface EnderecoProximo extends Endereco {
  dDistanciaKm: number;
}
