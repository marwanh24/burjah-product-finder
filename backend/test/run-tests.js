'use strict';
/**
 * اختبارات القبول (build_spec.md §6) — بلا شبكة، تعمل على بيانات حقيقية مُلتقطة
 * فعلياً من Salla MCP (ثوب الهيبة 2142939960) محفوظة في test/fixtures/.
 * تشغيل: npm test
 */
const assert = require('assert');
const path = require('path');
const { parseVariantName } = require('../src/parseVariantName');
const { buildVariantRecords, buildAvailableSizes, shapeProductRecord } = require('../src/sync');

const variantsFixture = require('./fixtures/haiba-variants-sample.json');
const productFixture = require('./fixtures/haiba-product-sample.json');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('اختبار 3 — فكّ اسم المتغيّر (parseVariantName):');
test('يفكّك "30 / أوف وايت" بشكل طبيعي', () => {
  const { size, color } = parseVariantName('30 / أوف وايت');
  assert.strictEqual(size, 30);
  assert.strictEqual(color, 'أوف وايت');
});
test('يفكّك الاسم المشوّه "49 / أبيض / 49 / 49..." إلى size:49 color:أبيض بلا تكرار', () => {
  const { size, color } = parseVariantName('49 / أبيض / 49 / 49 / 49 / 49 / 49 / 49 / 49');
  assert.strictEqual(size, 49);
  assert.strictEqual(color, 'أبيض');
});
test('يتحقق أن المقاس ضمن نطاق الثياب 22-52 حين يُطلب', () => {
  assert.strictEqual(parseVariantName('30 / أبيض', { minSize: 22, maxSize: 52 }).sizeInRange, true);
  assert.strictEqual(parseVariantName('5 / أبيض', { minSize: 22, maxSize: 52 }).sizeInRange, false);
});

console.log('\nاختبار 1+2 — الترقيم والمقاس النافد (باستخدام عيّنة حقيقية من ثوب الهيبة):');
const variantRecords = buildVariantRecords(variantsFixture);
test('كل المتغيّرات في العيّنة تُفكّك دون فقدان (4 عناصر)', () => {
  assert.strictEqual(variantRecords.length, 4);
});
const availableSizes = buildAvailableSizes(variantRecords);
test('مقاس 26/أبيض (مخزون 0) لا يظهر في availableSizes', () => {
  assert.ok(!availableSizes['أبيض'] || !availableSizes['أبيض'].includes(26));
});
test('مقاس 22/أبيض (مخزون 10) يظهر في availableSizes', () => {
  assert.ok(availableSizes['أبيض'].includes(22));
});
test('مقاس 49/أبيض (مخزون 12، اسم مشوّه) يظهر رغم التشويه', () => {
  assert.ok(availableSizes['أبيض'].includes(49));
});

console.log('\nاختبار 4 — سرّية cost_price:');
const shaped = shapeProductRecord(productFixture, variantsFixture);
test('shapeProductRecord لا يُصدّر cost_price في أي مستوى', () => {
  const serialized = JSON.stringify(shaped);
  assert.ok(!serialized.includes('cost_price'));
  assert.ok(!serialized.includes('80')); // القيمة السرّية نفسها لا يجب أن تظهر
});
test('shapeProductRecord يحسب eligible=true عند status=sale و is_available=true', () => {
  assert.strictEqual(shaped.eligible, true);
});
test('shapeProductRecord يكتشف الخصم عبر مقارنة regular_price بـ price (وُجد فعلياً في الحي)', () => {
  // ملاحظة: لا يوجد حقل has_special_price على مستوى المنتج في /products/{id} —
  // الخصم الحقيقي فقط عبر regular_price(217.39) > price(136.96).
  assert.strictEqual(shaped.hasDiscount, true);
  assert.strictEqual(shaped.salePrice, 136.96);
  assert.strictEqual(shaped.basePrice, 217.39);
});
test('shapeProductRecord لا يخترع خصماً حين regular_price == price', () => {
  const noDiscountFixture = { ...productFixture, regular_price: { amount: 136.96 } };
  const r = shapeProductRecord(noDiscountFixture, variantsFixture);
  assert.strictEqual(r.hasDiscount, false);
  assert.strictEqual(r.salePrice, null);
  assert.strictEqual(r.basePrice, 136.96);
});
test('shapeProductRecord لا يخلط بيانات — الاسم/الصورة/الرابط من نفس السجل فقط', () => {
  assert.strictEqual(shaped.name, 'ثوب الهيبة');
  assert.strictEqual(shaped.url, 'https://burjah.com/qGKWaWD');
  assert.ok(shaped.image.startsWith('https://cdn.salla.sa/'));
});

console.log('\nاختبار — منتج غير مؤهل (status != sale أو is_available=false) يُوسم eligible:false:');
test('status=out يعطي eligible:false', () => {
  const r = shapeProductRecord({ ...productFixture, status: 'out' }, variantsFixture);
  assert.strictEqual(r.eligible, false);
});
test('is_available=false يعطي eligible:false', () => {
  const r = shapeProductRecord({ ...productFixture, is_available: false }, variantsFixture);
  assert.strictEqual(r.eligible, false);
});

console.log(`\n${passed} اختبار(ات) نجحت.`);
if (process.exitCode) {
  console.error('توجد اختبارات فاشلة.');
} else {
  console.log('كل الاختبارات ناجحة.');
}
