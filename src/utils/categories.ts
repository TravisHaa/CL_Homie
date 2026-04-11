export const PANTRY_CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'frozen',
  'snacks',
  'beverages',
  'condiments',
  'grains',
  'other',
] as const;

export const SHOPPING_CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'frozen',
  'snacks',
  'beverages',
  'condiments',
  'grains',
  'cleaning',
  'other',
] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];
export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];
