/**
 * Modelo de Endereço.
 * Convenção de variáveis (Hungarian notation):
 *   n = number, s = string, d = double/number decimal, dt = Date/string ISO
 */
export interface Endereco {
  nId?:            number;
  sCep:            string;
  sLogradouro?:    string;
  sNumero?:        string;
  sComplemento?:   string;
  sBairro?:        string;
  sCidade?:        string;
  sEstado?:        string;
  dLatitude?:      number;
  dLongitude?:     number;
  dtCriacao?:      string;
  dtAtualizacao?:  string;
}
