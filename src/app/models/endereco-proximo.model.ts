import { Endereco } from './endereco.model';

/**
 * Modelo de resposta para busca por proximidade.
 * Estende Endereco adicionando a distância calculada em km.
 */
export interface EnderecoProximo extends Endereco {
  dDistanciaKm: number;
}
