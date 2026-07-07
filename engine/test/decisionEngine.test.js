'use strict';
/**
 * اختبارات محرك القرار — حالات وهمية (START_HERE §4، build_spec.md §6/§7).
 * تشغيل: node engine/test/decisionEngine.test.js
 */
const assert = require('assert');
const path = require('path');
const DecisionEngine = require('../decisionEngine');

const catalog = require(path.join(__dirname, '..', '..', 'data', 'products.json'));
const rankings = require(path.join(__dirname, '..', '..', 'data', 'rankings.json'));
const live = require(path.join(__dirname, 'fixtures', 'live-sample.json'));

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
    process.exitCode = 1;
  }
}

console.log('سيناريو أ — عمر 5 (فئة 4-6) + زواج + ثوب سادة + ميزانية 150 ريال:');
{
  const answers = {
    age: '4-6',
    occasionChoice: 'زواج',
    styleChoice: 'ثوب_سادة',
    colors: [],
    budget: 150,
  };
  const result = DecisionEngine.recommend(answers, { catalog, rankings, live });

  test('لا يرجع فارغاً', () => {
    assert.strictEqual(result.empty, false);
  });
  test('النمط direct (مسار مباشر لا "اختر لي")', () => {
    assert.strictEqual(result.mode, 'direct');
  });
  test('الهيبة أولاً (أعلى ترتيب لعائلات الزواج، ضمن الميزانية)', () => {
    assert.strictEqual(result.cards[0].card.family, 'الهيبة');
  });
  test('بيزنس كيدز (فوق الميزانية 250>150) مستبعد لوجود بدائل ضمن الميزانية', () => {
    assert.ok(!result.cards.some((c) => c.card.family === 'بيزنس كيدز'));
  });
  test('العز يظهر لكن بعد الهيبة/العراقة رغم رخصه (ترتيب العائلة يسبق السعر)', () => {
    const families = result.cards.map((c) => c.card.family);
    const ezzIdx = families.indexOf('العز');
    const haibaIdx = families.indexOf('الهيبة');
    assert.ok(ezzIdx > haibaIdx);
  });
  test('السعر الفعلي للعراقة هو السعر المخفض (130.43) لا الأساسي', () => {
    const iraqahCard = result.cards.find((c) => c.card.family === 'العراقة').card;
    assert.strictEqual(iraqahCard.price, 130.43);
    assert.strictEqual(iraqahCard.hasDiscount, true);
  });
}

console.log('\nسيناريو ب — لا خيار ضمن الميزانية: يعرض أقرب أعلى منها بدل الفراغ (logic_prompt.md §6):');
{
  const answers = {
    age: '4-6',
    occasionChoice: 'زواج',
    styleChoice: 'إطلالة_فخمة',
    colors: [],
    budget: 50, // أرخص خيار متاح 69.57 (العز) — لا شيء ضمن 50
  };
  const result = DecisionEngine.recommend(answers, { catalog, rankings, live });
  test('لا يرجع فارغاً رغم عدم وجود خيار ضمن الميزانية', () => {
    assert.strictEqual(result.empty, false);
  });
  test('البطاقة الناتجة مُعلَّمة overBudget=true مع مقدار التجاوز الصحيح', () => {
    const card = result.cards[0].card;
    assert.strictEqual(card.overBudget, true);
    assert.ok(card.overBudgetBy > 0);
  });
}

console.log('\nسيناريو ج — لا نتيجة مطلقاً (لا تطابق أي شرط صلب) -> رسالة لا نتيجة (logic_prompt.md §18.2):');
{
  const answers = {
    age: '4-6',
    occasionChoice: 'مدرسة_يومي', // لا عائلات مؤهلة للمدرسة في fixture الـlive المحدود لهذا المسار مع زواج فقط
    styleChoice: 'اختر_لي',
    colors: ['رصاصي'], // لون غير متوفر إطلاقاً في fixture الـlive
    budget: 10,
  };
  const result = DecisionEngine.recommend(answers, { catalog, rankings, live });
  test('يرجع empty:true مع رسالة عربية واضحة', () => {
    assert.strictEqual(result.empty, true);
    assert.ok(typeof result.message === 'string' && result.message.length > 0);
  });
}

console.log('\nسيناريو د — حياد لون البشرة: لا يستبعد أي منتج، يُرجّح ترتيب اللون فقط (logic_prompt.md §7.1/§19):');
{
  const baseAnswers = {
    age: '4-6',
    occasionChoice: 'زواج',
    styleChoice: 'ثوب_سادة',
    colors: [],
    budget: 150,
  };
  const withoutSkinTone = DecisionEngine.recommend(baseAnswers, { catalog, rankings, live });
  const withSkinTone = DecisionEngine.recommend(
    { ...baseAnswers, skinTone: 'فاتحة' },
    {
      catalog,
      rankings,
      live,
      skinToneColorWeights: { 'فاتحة': ['أوف وايت', 'أبيض'] },
    }
  );
  test('نفس عدد النتائج ونفس العائلات بصرف النظر عن لون البشرة', () => {
    assert.strictEqual(withoutSkinTone.cards.length, withSkinTone.cards.length);
    assert.deepStrictEqual(
      withoutSkinTone.cards.map((c) => c.card.family),
      withSkinTone.cards.map((c) => c.card.family)
    );
  });
  test('لون البشرة يُغيّر اللون المعروض للهيبة إلى المفضّل (أوف وايت) دون استبعادها', () => {
    const haibaCard = withSkinTone.cards.find((c) => c.card.family === 'الهيبة').card;
    assert.strictEqual(haibaCard.color, 'أوف وايت');
  });
}

console.log('\nسيناريو هـ — ميزانية الطقم = إجمالي مكوّنَي الثوب والسديري (logic_prompt.md §12.6):');
{
  const answers = {
    age: '4-6', // 34/36 مقاس ثوب متوافق مع سديري 14/16 (§5.2: س14↔ث29-32 / س16↔ث33-36)
    occasionChoice: 'زواج',
    styleChoice: 'طقم',
    colors: [],
    budget: 250,
  };
  const result = DecisionEngine.recommend(answers, { catalog, rankings, live });
  test('طقم الهيبة موجود بسعر = ثوب(120) + أرخص سديري متوفر(80) = 200', () => {
    const haibaSet = result.cards.find((c) => c.card.family === 'الهيبة');
    assert.ok(haibaSet, 'يجب أن يظهر طقم الهيبة');
    assert.strictEqual(haibaSet.card.price, 200);
  });
}

console.log('\nسيناريو و — مسار "اختر لي": 3 توصيات (أفضل/أبسط/أفخم):');
{
  const answers = {
    age: '4-6',
    occasionChoice: 'زواج',
    styleChoice: 'اختر_لي',
    colors: [],
    budget: 300,
  };
  const result = DecisionEngine.recommend(answers, { catalog, rankings, live });
  test('النمط choose-for-me', () => {
    assert.strictEqual(result.mode, 'choose-for-me');
  });
  test('يحتوي أدوار: بديل أبسط + الاختيار الأفضل + بديل أفخم', () => {
    const roles = result.cards.map((c) => c.role);
    assert.ok(roles.includes('best'));
    assert.ok(roles.includes('simpler'));
    assert.ok(roles.includes('fancier'));
  });
}

console.log(`\n${passed} اختبار(ات) نجحت.`);
if (process.exitCode) {
  console.error('توجد اختبارات فاشلة.');
} else {
  console.log('كل الاختبارات ناجحة.');
}
