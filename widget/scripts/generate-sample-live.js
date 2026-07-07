'use strict';
// يولّد live.json تجريبياً (بيانات وهمية صريحة) لاختبار الويدجت محلياً فقط — ليس للنشر.
const fs = require('fs');
const path = require('path');
const catalog = require('../../data/products.json');

function priceForLuxury(luxury) {
  if (luxury === 'فاخر ومميز') return 180 + Math.floor(Math.random() * 80);
  if (luxury === 'راقٍ ومتوازن') return 110 + Math.floor(Math.random() * 60);
  if (luxury === 'بسيط وعملي') return 60 + Math.floor(Math.random() * 30);
  return 100 + Math.floor(Math.random() * 50);
}

function sizesForProduct(p) {
  const sizes = {};
  const colors = p.colorType && p.colorType.length ? p.colorType : (p.color ? [p.color] : ['أبيض']);
  colors.forEach((c) => {
    if (c === 'ملوّن') return; // ملوّن ليس اسم لون فعلي — نتجاهله هنا (نحتاج اسم لون حقيقي)
    const arr = [];
    for (let s = 22; s <= 52; s += 2) {
      if (Math.random() > 0.15) arr.push(s);
    }
    if (arr.length) sizes[c] = arr;
  });
  if (!Object.keys(sizes).length) sizes['أبيض'] = [30, 32, 34, 36];
  return sizes;
}

const products = {};
let i = 0;
for (const [id, p] of Object.entries(catalog)) {
  i += 1;
  const eligible = Math.random() > 0.05; // 5% خامل عشوائياً لاختبار حالة الاستبعاد
  const basePrice = priceForLuxury(p.luxury);
  const hasDiscount = Math.random() > 0.7;
  products[id] = {
    name: `[تجريبي] ${p.family || p.taqmFamily || 'منتج'} #${id}`,
    status: eligible ? 'sale' : 'out',
    visibleInWeb: true,
    eligible,
    image: `https://picsum.photos/seed/${id}/500/500`,
    url: `https://burjah.com/product/${id}`,
    basePrice: hasDiscount ? Math.round(basePrice * 1.4) : basePrice,
    salePrice: hasDiscount ? basePrice : null,
    hasDiscount,
    availableSizes: eligible ? sizesForProduct(p) : {},
  };
}

const out = { generatedAt: new Date().toISOString(), products };
fs.writeFileSync(path.join(__dirname, '..', 'sample-live.json'), JSON.stringify(out, null, 2));
console.log(`تم توليد ${i} سجلاً تجريبياً -> widget/sample-live.json`);
