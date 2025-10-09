/**
 * Backend Price Rounding Utilities
 * Implements consistent auto-rounding logic for Guest Blog Site prices
 */

/**
 * Auto-round price based on decimal value
 * Rules:
 * - If decimal ≤ 0.50: round down to nearest whole number
 * - If decimal > 0.50: round up to nearest whole number
 * 
 * Examples:
 * 123.50 → 123
 * 123.40 → 123
 * 123.60 → 124
 * 123.99 → 124
 */
export const autoRoundPrice = (price: number): number => {
  if (isNaN(price) || price < 0) {
    return 0;
  }

  const wholePart = Math.floor(price);
  const decimalPart = price - wholePart;

  if (decimalPart <= 0.50) {
    return wholePart; // Round down
  } else {
    return wholePart + 1; // Round up
  }
};

/**
 * Parse and round price from string input
 */
export const parseAndRoundPrice = (priceString: string | number): number => {
  const price = typeof priceString === 'string' ? parseFloat(priceString) : priceString;
  return autoRoundPrice(price);
};

/**
 * Validate if a price needs rounding
 */
export const needsRounding = (price: number): boolean => {
  if (isNaN(price)) return false;
  const rounded = autoRoundPrice(price);
  return price !== rounded;
};
