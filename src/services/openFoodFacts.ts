export type LookupResult =
  | { status: 'found'; name: string; category: string }
  | { status: 'not_found' }
  | { status: 'error' };

// Module-level cache — survives re-renders, cleared only on app reload
const sessionCache = new Map<string, LookupResult>();

function mapCategoryTags(tags: string[]): string {
  const t = tags.join(' ').toLowerCase();
  if (/dairy|milk|cheese|yogurt|butter|cream/.test(t)) return 'dairy';
  if (/beverage|drink|juice|water|soda|coffee|tea|beer|wine|spirits/.test(t)) return 'beverages';
  if (/meat|poultry|chicken|beef|pork|seafood|fish|sausage/.test(t)) return 'meat';
  if (/frozen/.test(t)) return 'frozen';
  if (/snack|chip|crisp|cookie|cracker|candy|chocolate|biscuit|pretzel/.test(t)) return 'snacks';
  if (/fruit|vegetable|produce/.test(t)) return 'produce';
  if (/condiment|sauce|dressing|ketchup|mustard|mayonnaise|vinegar|spice|herb|seasoning/.test(t))
    return 'condiments';
  if (/grain|cereal|bread|pasta|rice|flour|oat|wheat|corn/.test(t)) return 'grains';
  return 'other';
}

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  if (sessionCache.has(barcode)) {
    return sessionCache.get(barcode)!;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,categories_tags`,
      { signal: controller.signal },
    );

    if (!res.ok) {
      // HTTP-level failure (rate limit, transient 5xx, etc.) — not a
      // confirmed "barcode doesn't exist" result, so don't cache it; leave
      // it retryable like the network-error catch block below.
      return { status: 'error' };
    }

    const data = await res.json();

    if (data.status !== 1 || !data.product?.product_name?.trim()) {
      const result: LookupResult = { status: 'not_found' };
      sessionCache.set(barcode, result);
      return result;
    }

    const result: LookupResult = {
      status: 'found',
      name: data.product.product_name.trim(),
      category: mapCategoryTags(data.product.categories_tags ?? []),
    };
    sessionCache.set(barcode, result);
    return result;
  } catch {
    // Network error or timeout — don't cache so the next scan can retry
    return { status: 'error' };
  } finally {
    clearTimeout(timeoutId);
  }
}
