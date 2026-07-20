/**
 * Utilitários de manipulação de texto e contato.
 * Centralizados aqui para serem reutilizados em listagem e cadastro.
 */

/**
 * Remove acentos e converte para minúsculas, permitindo buscas
 * sem distinção de capitalização ou diacríticos.
 *
 * Ex.: "Maíra"  → "maira"
 *      "São Paulo" → "sao paulo"
 *      "JOÃO"   → "joao"
 */
export function normalizarTexto(sTexto: string | undefined | null): string {
  if (!sTexto) return '';
  return sTexto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')   // remove os diacríticos (Unicode property)
    .toLowerCase()
    .trim();
}

/**
 * Verifica se um termo de busca (já normalizado) aparece em algum dos campos.
 * Cada campo é normalizado antes da comparação.
 */
export function contemTermo(sTermoNormalizado: string, ...lCampos: (string | undefined | null)[]): boolean {
  if (!sTermoNormalizado) return true;
  return lCampos.some(sCampo => normalizarTexto(sCampo).includes(sTermoNormalizado));
}

/**
 * Gera a URL de chamada (tel:) ou WhatsApp (wa.me) a partir do telefone.
 * Para WhatsApp brasileiro, prefixa com +55 quando o número tem 10 ou 11 dígitos.
 *
 * @param sTelefone  telefone no formato livre (com ou sem pontuação)
 * @param bWhatsapp  se true, gera link do WhatsApp; senão, link de discagem
 */
export function gerarLinkContato(sTelefone: string | undefined | null, bWhatsapp: boolean): string {
  if (!sTelefone) return '#';
  const sDigitos = sTelefone.replace(/\D/g, '');
  if (!sDigitos) return '#';

  if (bWhatsapp) {
    // wa.me só aceita dígitos com DDI. Se o número já tem 12+ dígitos, assume DDI incluído.
    const sNumero = sDigitos.length >= 12 ? sDigitos : '55' + sDigitos;
    return `https://wa.me/${sNumero}`;
  }
  return `tel:${sDigitos}`;
}
