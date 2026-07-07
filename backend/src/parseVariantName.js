'use strict';

/**
 * يفكّك حقل name القادم من Salla variants (مثل "30 / أوف وايت" أو
 * الصيغة المشوّهة "49 / أبيض / 49 / 49 / 49 / 49 / 49 / 49 / 49").
 * القاعدة (build_spec.md §1.2): المقاس = أول جزء رقمي، اللون = أول جزء غير رقمي، تجاهل التكرار.
 */
function parseVariantName(name, { minSize, maxSize } = {}) {
  const tokens = String(name || '')
    .split('/')
    .map((t) => t.trim())
    .filter(Boolean);

  let size = null;
  let color = null;
  for (const token of tokens) {
    if (size === null && /^\d+$/.test(token)) {
      size = parseInt(token, 10);
    } else if (color === null && !/^\d+$/.test(token)) {
      color = token;
    }
    if (size !== null && color !== null) break;
  }

  const sizeInRange =
    size !== null && (minSize === undefined || (size >= minSize && size <= maxSize));

  return { size, color, sizeInRange, raw: name };
}

module.exports = { parseVariantName };
