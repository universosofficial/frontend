/**
 * Virtual Human Native Token Constants & Helper Functions
 * 
 * Token Name: Vasos (plural: Vasos, singular: Vaso)
 * Symbol: ◈
 * Code: VASO
 */
export const TOKEN_NAME = 'Vasos';
export const TOKEN_SINGULAR = 'Vaso';
export const TOKEN_CODE = 'VASO';
export const TOKEN_SYMBOL = '◈';

/**
 * Format a number of tokens into a standardized display string.
 * e.g., 25 -> "25 ◈ Vasos"
 */
export function formatTokens(amount: number | string | undefined | null): string {
  const num = Number(amount || 0);
  return `${num} ◈ Vasos`;
}

/**
 * Format a token amount with prefix symbol.
 * e.g., 25 -> "◈ 25 Vasos"
 */
export function formatTokenPrefix(amount: number | string | undefined | null): string {
  const num = Number(amount || 0);
  return `◈ ${num} Vasos`;
}
