#!/usr/bin/env node
/**
 * مولّد products.json و rankings.json من قواعد logic_prompt.md (الأقسام 9-17).
 * هذا الملف هو مصدر الحقيقة القابل للصيانة — يُعاد تشغيله عند إضافة/تعديل منتج.
 * تشغيل: node build-catalog.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const products = {}; // id (string) -> record

function mergeArrayUnique(a = [], b = []) {
  return Array.from(new Set([...a, ...b]));
}

function upsert(id, patch) {
  const key = String(id);
  const existing = products[key] || { id: Number(id) };
  const merged = { ...existing };
  for (const [k, v] of Object.entries(patch)) {
    if (Array.isArray(v)) {
      merged[k] = mergeArrayUnique(existing[k], v);
    } else if (v !== undefined) {
      merged[k] = v;
    }
  }
  products[key] = merged;
}

// ============================================================
// القسم 9 — مسار الثوب
// ============================================================
const THOB_FAMILIES = {
  'الهيبة': {
    ids: [2142939960, 2001973449, 812590588, 576778699],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['هادئ وبسيط', 'تفاصيل خفيفة وأنيقة'],
    baseColors: ['أبيض', 'أوف وايت'],
    luxury: 'فاخر ومميز',
  },
  'العراقة': {
    ids: [1179255884, 1097711035, 1172845662],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['هادئ وبسيط', 'تفاصيل خفيفة وأنيقة'],
    baseColors: ['أبيض', 'أوف وايت'],
    luxury: 'راقٍ ومتوازن',
  },
  'التميز': {
    ids: [1791107324],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['هادئ وبسيط', 'تفاصيل خفيفة وأنيقة'],
    baseColors: ['أبيض', 'أوف وايت'],
    luxury: 'راقٍ ومتوازن',
  },
  'الأندلسي': {
    ids: [2028154067, 1760340536, 898461215, 568900714, 198793024, 1286835428, 240849998],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز واضح مميز'],
    baseColors: ['أبيض', 'أوف وايت'],
    luxury: 'راقٍ ومتوازن',
  },
  'العز': {
    ids: [1434664687, 1610404332, 2101791437, 1261663722, 1121657063, 1509466944],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية', 'مدرسة', 'يومي', 'بدون'],
    style: ['هادئ وبسيط', 'تفاصيل خفيفة وأنيقة'],
    baseColors: ['أبيض', 'أوف وايت'],
    luxury: 'راقٍ ومتوازن',
  },
  'الأصالة': {
    ids: [1740341873, 1423088233, 1579119821],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['هادئ وبسيط', 'تفاصيل خفيفة وأنيقة'],
    baseColors: [], // ملوّن فقط
    luxury: 'راقٍ ومتوازن',
  },
  'بيزنس كيدز': {
    ids: [415690051, 890370559],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['هادئ وبسيط', 'تفاصيل خفيفة وأنيقة'],
    baseColors: ['أبيض', 'أوف وايت'],
    luxury: 'راقٍ ومتوازن',
  },
  'كلاسيك': {
    ids: [977782911, 1668487917, 1761004349, 66649037, 1608345848, 1623074804],
    occasions: ['زيارة', 'مدرسة', 'يومي'],
    style: ['هادئ وبسيط'],
    baseColors: ['أبيض', 'أوف وايت'],
    luxury: 'بسيط وعملي',
  },
  'كلاسيك 2': {
    ids: [819100028, 703135707],
    occasions: ['زيارة', 'مدرسة', 'يومي'],
    style: ['هادئ وبسيط'],
    baseColors: ['أبيض', 'أوف وايت'],
    luxury: 'بسيط وعملي',
  },
};

// 9.6 — الموسم للمتغيّرات الملوّنة (قائمة IDs محددة، أدق من التعميم العائلي)
const THOB_SEASON = {
  صيفي: [2001973449, 812590588, 576778699, 1179255884, 898461215, 2101791437, 1261663722,
    1121657063, 1509466944, 1740341873, 1423088233, 1579119821, 977782911, 1668487917, 1761004349],
  شتوي: [568900714, 198793024, 1286835428, 240849998],
};

function thobColorAndSeason(id, baseColors) {
  const colorType = [...baseColors];
  let season = null;
  if (THOB_SEASON.صيفي.includes(id)) { colorType.push('ملوّن'); season = 'صيفي'; }
  else if (THOB_SEASON.شتوي.includes(id)) { colorType.push('ملوّن'); season = 'شتوي'; }
  return { colorType, season };
}

for (const [family, def] of Object.entries(THOB_FAMILIES)) {
  for (const id of def.ids) {
    const { colorType, season } = thobColorAndSeason(id, def.baseColors);
    upsert(id, {
      family,
      type: 'ثوب',
      track: ['ثوب'],
      occasions: def.occasions,
      style: def.style,
      colorType,
      season,
      luxury: def.luxury,
      excludeFromStandalone: false,
    });
  }
}

// ============================================================
// القسم 10 — مسار السديري المستقل
// ============================================================
const SIDERI_EXCLUDED = {
  'الهيبة': [241660433, 1001685420, 645064359, 1278897044],
  'العراقة': [1644720348, 22702539, 1689370233],
  'الأصالة': [1946293942, 431600612, 741262391],
};

const SIDERI_FAMILIES = {
  'سديري بُرجة': {
    ids: [946403147, 892130700, 442232196, 582169231],
    occasions: ['زواج', 'تصوير', 'عيد', 'هدية'], // لا زيارات
    style: ['تطريز واضح فخم'],
    luxury: 'فاخر ومميز',
    colorCompat: { 946403147: 'أوف وايت', 892130700: 'أبيض', 442232196: 'أوف وايت', 582169231: 'الاثنين' },
  },
  'الوقار': {
    ids: [1871908626, 1980539415, 1556743946, 1044989526],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['هادئ بسيط'],
    luxury: 'فاخر ومميز',
    colorCompat: { 1871908626: 'أبيض', 1980539415: 'أبيض', 1556743946: 'الاثنين', 1044989526: 'أبيض' },
  },
  'الرفعة': {
    ids: [1215354434, 1808952165, 1836209164, 1296795808],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز خفيف'],
    luxury: 'راقٍ ومتوازن',
    colorCompat: { 1215354434: 'أبيض', 1808952165: 'أوف وايت', 1836209164: 'أوف وايت', 1296795808: 'الاثنين' },
  },
  'طويق': {
    ids: [295316796, 2084667959, 1460807930, 2004662672],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['هادئ بسيط'],
    luxury: 'راقٍ ومتوازن',
    colorCompat: { 295316796: 'أوف وايت', 2084667959: 'الاثنين', 1460807930: 'أوف وايت', 2004662672: 'varies' },
    mawalidMerged: [2004662672],
  },
  'العراقة المستقل': {
    ids: [697801811, 1649130611, 1398977643, 1627500556],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز واضح فخم'],
    luxury: 'راقٍ ومتوازن',
    colorCompat: { 697801811: 'أوف وايت', 1649130611: 'أوف وايت', 1398977643: 'أوف وايت', 1627500556: 'varies' },
    mawalidMerged: [1627500556],
  },
  'الفخر': {
    ids: [863888434, 546634794, 1677937890, 2112026118],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز خفيف'],
    luxury: 'فاخر ومميز',
    colorCompat: { 863888434: 'أبيض', 546634794: 'أوف وايت', 1677937890: 'أبيض', 2112026118: 'varies' },
    mawalidMerged: [2112026118],
  },
  'الروشان': {
    ids: [1126666114, 1276614974, 1451703347],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز واضح فخم'],
    luxury: 'راقٍ ومتوازن',
    colorCompat: { 1126666114: 'الاثنين', 1276614974: 'أوف وايت', 1451703347: 'أبيض' },
  },
  'ثقافتنا': {
    ids: [167236188, 1708412751, 1737714039, 1197521945, 2133781076],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز خفيف'],
    luxury: 'راقٍ ومتوازن',
    colorCompat: { 167236188: 'الاثنين', 1708412751: 'أبيض', 1737714039: 'الاثنين', 1197521945: 'varies', 2133781076: 'أوف وايت' },
    mawalidMerged: [1197521945],
  },
  'الحضارة': {
    ids: [1017816716, 701586080, 1674818938, 106339781],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز خفيف'],
    luxury: 'فاخر ومميز',
    colorCompat: { 1017816716: 'أوف وايت', 701586080: 'الاثنين', 1674818938: 'أوف وايت', 106339781: 'varies' },
    mawalidMerged: [106339781],
  },
  'المخملي': {
    ids: [1988728910, 1563950401, 1738575942, 882746827, 2028270246],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز خفيف'],
    luxury: 'فاخر ومميز',
    colorCompat: { 1988728910: 'الاثنين', 1563950401: 'أوف وايت', 1738575942: 'أبيض', 882746827: 'الاثنين', 2028270246: 'varies' },
    mawalidMerged: [2028270246],
  },
  'الجص الحساوي': {
    ids: [1791454528, 247109260, 94917960, 654522397],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز خفيف'],
    luxury: 'فاخر ومميز',
    colorCompat: { 1791454528: 'أبيض', 247109260: 'varies', 94917960: 'أوف وايت', 654522397: 'أوف وايت' },
    mawalidMerged: [247109260],
  },
  'الشال': {
    ids: [1071770541, 2128937638, 1343028383, 475756765],
    occasions: ['زواج', 'تصوير', 'عيد', 'زيارة', 'هدية'],
    style: ['تطريز خفيف'],
    luxury: 'فاخر ومميز',
    colorCompat: { 1071770541: 'أوف وايت', 2128937638: 'الاثنين', 1343028383: 'أبيض', 475756765: 'varies' },
    mawalidMerged: [475756765],
  },
};

// 10.8 ترتيب العائلات (يُخزَّن في rankings.json)
const SIDERI_ORDER = {
  wedding: ['سديري بُرجة', 'الوقار', 'الرفعة', 'الفخر', 'المخملي', 'الحضارة', 'طويق', 'العراقة المستقل', 'الروشان', 'ثقافتنا', 'الجص الحساوي', 'الشال'],
  visit: ['الوقار', 'الرفعة', 'الفخر', 'المخملي', 'الحضارة', 'طويق', 'العراقة المستقل', 'الروشان', 'ثقافتنا', 'الجص الحساوي', 'الشال'],
};

for (const [family, def] of Object.entries(SIDERI_FAMILIES)) {
  for (const id of def.ids) {
    upsert(id, {
      family,
      type: 'سديري',
      track: ['سديري مستقل'],
      occasions: def.occasions,
      style: def.style,
      luxury: def.luxury,
      colorCompat: def.colorCompat[id] || null,
      isMawalidMerged: !!(def.mawalidMerged || []).includes(id),
      excludeFromStandalone: false,
    });
  }
}
// سديريات الأطقم مستبعدة من المستقل
for (const [family, ids] of Object.entries(SIDERI_EXCLUDED)) {
  for (const id of ids) {
    upsert(id, { excludeFromStandalone: true });
  }
}

// ============================================================
// القسم 11 — مسار الدقلة
// ============================================================
const DAGLAH_FAMILIES = {
  'الرفعة': {
    style: ['تفاصيل أو تطريز خفيف أنيق'],
    luxury: 'فاخر ومميز',
    items: [
      { id: 1307592319, color: 'بيج', colorCompat: 'الاثنين', ageGroup: '1-12' },
      { id: 922504616, color: 'رصاصي', colorCompat: 'الاثنين', ageGroup: '1-12' },
    ],
  },
  'الأصالة': {
    style: ['تفاصيل أو تطريز خفيف أنيق'],
    luxury: 'فاخر ومميز',
    items: [
      { id: 70330785, color: 'أوف وايت', colorCompat: 'أوف وايت', ageGroup: '1-12' },
      { id: 1385409065, color: 'كحلي', colorCompat: 'أبيض', ageGroup: '1-12' },
      { id: 1151913706, color: null, colorCompat: 'varies', ageGroup: 'مواليد', isMawalid: true },
    ],
  },
  'الشموخ': {
    style: ['تفاصيل أو تطريز خفيف أنيق'],
    luxury: 'فاخر ومميز',
    items: [
      { id: 1365148497, color: 'أسود', colorCompat: 'الاثنين', ageGroup: '1-12' },
      { id: 1083042171, color: 'كموني', colorCompat: 'أوف وايت', ageGroup: '1-12' },
      { id: 2090845131, color: null, colorCompat: 'varies', ageGroup: 'مواليد', isMawalid: true },
    ],
  },
  'الروشان': {
    style: ['تطريز واضح فخم'],
    luxury: 'فاخر ومميز',
    items: [
      { id: 1879206948, color: 'رصاصي بحري', colorCompat: 'أبيض', ageGroup: '1-12' },
      { id: 2143862071, color: 'أوف وايت', colorCompat: 'أوف وايت', ageGroup: '1-12' },
      { id: 1264758411, color: 'أسود', colorCompat: 'الاثنين', ageGroup: '1-12' },
      { id: 1967237797, color: null, colorCompat: 'الاثنين', ageGroup: 'مواليد', isMawalid: true },
    ],
  },
};
const DAGLAH_ORDER = ['الرفعة', 'الأصالة', 'الشموخ', 'الروشان'];

for (const [family, def] of Object.entries(DAGLAH_FAMILIES)) {
  for (const item of def.items) {
    upsert(item.id, {
      family,
      type: 'دقلة',
      track: ['دقلة'],
      occasions: ['زواج', 'تصوير', 'عيد', 'هدية'],
      style: def.style,
      luxury: def.luxury,
      color: item.color,
      colorCompat: item.colorCompat,
      ageGroup: item.ageGroup,
      isMawalid: !!item.isMawalid,
      excludeFromStandalone: false,
    });
  }
}

// ============================================================
// القسم 12 — طقم ثوب مع سديري
// ============================================================
const TAQM_FAMILIES = {
  'طقم الهيبة': {
    thobs: [2142939960, 2001973449, 812590588, 576778699],
    vests: [241660433, 1001685420, 645064359, 1278897044],
    style: ['هادئ وفخم'],
    colorType: ['أبيض', 'أوف وايت', 'ملوّن'],
    season: 'صيفي', // فقط للمتغيّر الملوّن
  },
  'طقم العراقة': {
    thobs: [1179255884, 1097711035, 1172845662],
    vests: [1644720348, 22702539, 1689370233],
    style: ['تفاصيل خفيفة أنيقة'],
    colorType: ['أبيض', 'أوف وايت', 'ملوّن'],
    season: 'صيفي',
  },
  'طقم الأصالة': {
    thobs: [1740341873, 1423088233, 1579119821],
    vests: [1946293942, 431600612, 741262391],
    style: ['تفاصيل خفيفة أنيقة'],
    colorType: ['ملوّن'],
    season: 'صيفي',
  },
};
const TAQM_FAKHAMA_SHITWI = {
  family: 'طقم الفخامة الشتوي',
  style: ['تفاصيل خفيفة أنيقة'],
  colorType: ['ملوّن'],
  season: 'شتوي',
  items: [
    { id: 1602543628, color: 'كحلي' },
    { id: 554285626, color: 'أسود' },
    { id: 1611518259, color: 'بيج كموني' },
    { id: 1361373483, color: 'رصاصي' },
  ],
};
const TAQM_ORDER = ['طقم الهيبة', 'طقم العراقة', 'طقم الأصالة', 'طقم الفخامة الشتوي'];

for (const [family, def] of Object.entries(TAQM_FAMILIES)) {
  for (const id of def.thobs) {
    upsert(id, {
      track: ['طقم'],
      taqmFamily: family,
      taqmRole: 'ثوب',
      taqmPairIds: def.vests,
      // ملاحظة: لا نمس style/luxury/colorType/season الأساسية (خاصة بمسار الثوب المستقل، القسم 9).
      // كل سمات سياق الطقم مُنفصلة بادئة taqm* لتفادي خلط القسمين 9 و12.
      taqmStyle: def.style,
      taqmLuxury: 'فاخر ومميز',
      taqmColorType: def.colorType,
      taqmSeason: def.season,
      occasions_taqm: ['زواج', 'تصوير', 'عيد', 'هدية'],
    });
  }
  for (const id of def.vests) {
    upsert(id, {
      family,
      type: 'سديري طقم',
      track: ['طقم'],
      taqmFamily: family,
      taqmRole: 'سديري',
      taqmPairIds: def.thobs,
      style: def.style,
      luxury: 'فاخر ومميز',
      colorType: def.colorType,
      season: def.season,
      occasions: ['زواج', 'تصوير', 'عيد', 'هدية'],
      excludeFromStandalone: true,
    });
  }
}
for (const item of TAQM_FAKHAMA_SHITWI.items) {
  upsert(item.id, {
    family: TAQM_FAKHAMA_SHITWI.family,
    type: 'طقم كامل',
    track: ['طقم'],
    taqmFamily: TAQM_FAKHAMA_SHITWI.family,
    taqmRole: 'طقم كامل',
    style: TAQM_FAKHAMA_SHITWI.style,
    luxury: 'فاخر ومميز',
    colorType: TAQM_FAKHAMA_SHITWI.colorType,
    season: TAQM_FAKHAMA_SHITWI.season,
    color: item.color,
    occasions: ['زواج', 'تصوير', 'عيد', 'هدية'],
    excludeFromStandalone: false,
  });
}
// بربتوز الهيبة مستبعد من طقم الهيبة صراحة (13.1 / 12.6)
upsert(1101568151, { note: 'بربتوز الهيبة — لا يدخل مسار الطقم، مواليد فقط' });

// ============================================================
// القسم 13 — إطلالة المواليد
// ============================================================
const BERBETOZ_FAMILIES = {
  'بربتوز': {
    ids: [948849211],
    style: ['هادئ بسيط'],
    luxury: 'راقٍ ومتوازن',
    colorType: ['أبيض', 'أوف وايت'],
  },
  'بربتوز الهيبة': {
    ids: [1101568151],
    style: ['تفاصيل خفيفة أنيقة'],
    luxury: 'فاخر ومميز',
    colorType: ['أبيض', 'أوف وايت'],
  },
  'بربتوز بيزنس كيدز': {
    ids: [333405938],
    style: ['هادئ بسيط'],
    luxury: 'راقٍ ومتوازن',
    colorType: ['أبيض', 'أوف وايت'],
  },
  'بربتوز العز': {
    ids: [1035028448],
    style: ['تفاصيل خفيفة أنيقة'],
    luxury: 'راقٍ ومتوازن',
    colorType: ['أسود'],
  },
};
const BERBETOZ_ANDALUSI = {
  family: 'بربتوز أندلسي',
  style: ['تطريز واضح مميز'],
  luxury: 'فاخر ومميز',
  items: [
    { id: 1240365053, color: 'أبيض', season: null },
    { id: 488403802, color: 'أوف وايت', season: null },
    { id: 1775084579, color: 'زيتي', season: 'شتوي' },
    { id: 585654168, color: 'أسود', season: null },
    { id: 2127481995, color: 'كموني', season: 'شتوي' },
    { id: 20869000, color: 'سماوي', season: 'شتوي' },
    { id: 1077118593, color: 'رصاصي فاتح', season: 'شتوي' },
    { id: 889769611, color: 'رصاصي غامق', season: 'شتوي' },
    { id: 1249102644, color: 'كحلي', season: null },
  ],
};
const BERBETOZ_ORDER = ['بربتوز الهيبة', 'بربتوز أندلسي', 'بربتوز بيزنس كيدز', 'بربتوز العز', 'بربتوز'];

for (const [family, def] of Object.entries(BERBETOZ_FAMILIES)) {
  for (const id of def.ids) {
    upsert(id, {
      family,
      type: 'بربتوز',
      track: ['إطلالة مواليد'],
      occasions: ['زواج', 'تصوير', 'عيد', 'هدية'],
      style: def.style,
      luxury: def.luxury,
      colorType: def.colorType,
      ageGroup: 'مواليد',
      excludeFromStandalone: false,
    });
  }
}
for (const item of BERBETOZ_ANDALUSI.items) {
  upsert(item.id, {
    family: BERBETOZ_ANDALUSI.family,
    type: 'بربتوز',
    track: ['إطلالة مواليد'],
    occasions: ['زواج', 'تصوير', 'عيد', 'هدية'],
    style: BERBETOZ_ANDALUSI.style,
    luxury: BERBETOZ_ANDALUSI.luxury,
    color: item.color,
    season: item.season,
    colorType: item.season ? ['ملوّن'] : [item.color],
    ageGroup: 'مواليد',
    excludeFromStandalone: false,
  });
}
// سديريات/دقلات المواليد المجمّعة موسومة أعلاه بالفعل (isMawalidMerged / isMawalid)
// ثوب عادي 6-12 شهر يدخل بمقاس 22 فقط — لا يحتاج IDs إضافية، القيد على المقاس وليس على المنتج.

// ============================================================
// القسم 16-17 — الإكسسوارات
// ============================================================
const ACCESSORIES_MAWALID = {
  'صندل جلد H': { ids: [1972114864], compat: ['بربتوز', 'سديري', 'دقلة', 'ثوب عادي مواليد'] },
  'صندل جلد': { ids: [759043357], compat: ['بربتوز', 'سديري', 'دقلة', 'ثوب عادي مواليد'] },
  'ميني سكارف': { ids: [40711558, 35217922], compat: ['بربتوز'] },
  'شرقي': { ids: [1995329713, 1016769486, 804849479, 1099615887], compat: ['بربتوز', 'سديري', 'دقلة', 'ثوب عادي مواليد'] },
};
const ACCESSORIES_MAWALID_ORDER = ['ميني سكارف', 'شرقي', 'صندل جلد H', 'صندل جلد'];

for (const [family, def] of Object.entries(ACCESSORIES_MAWALID)) {
  for (const id of def.ids) {
    upsert(id, {
      family,
      type: 'إكسسوار مواليد',
      track: ['إكسسوار'],
      ageGroup: 'مواليد',
      compatibleWith: def.compat,
      excludeFromStandalone: false,
      luxury: null,
    });
  }
}

const ACCESSORIES_1_12 = {
  'الساعات': { ids: [2110595941, 119100182, 1760139841], ageGroup: '5-12' },
  'السبح الفاخرة': { ids: [520215680, 1205800622, 249197326], ageGroup: '1-12' },
  'نظارات أطفال': { ids: [2095209306, 723936353, 1912347387], ageGroup: '5-12' },
};
const ACCESSORIES_1_12_PRIORITY_5_12 = ['الساعات', 'السبح الفاخرة', 'نظارات أطفال'];
const ACCESSORIES_1_12_PRIORITY_1_4 = ['السبح الفاخرة'];

for (const [family, def] of Object.entries(ACCESSORIES_1_12)) {
  for (const id of def.ids) {
    upsert(id, {
      family,
      type: 'إكسسوار',
      track: ['إكسسوار'],
      ageGroup: def.ageGroup,
      compatibleWith: ['ثوب', 'طقم', 'سديري مستقل', 'دقلة'],
      excludeFromStandalone: false,
      luxury: null,
    });
  }
}

// ============================================================
// كتابة الملفات
// ============================================================
const outDir = path.join(__dirname);
fs.writeFileSync(path.join(outDir, 'products.json'), JSON.stringify(products, null, 2), 'utf8');

const rankings = {
  thob: {
    'زواج': ['الهيبة', 'العراقة', 'بيزنس كيدز', 'الأصالة', 'الأندلسي', 'التميز', 'العز'],
    'تصوير': ['الهيبة', 'العراقة', 'بيزنس كيدز', 'الأصالة', 'الأندلسي', 'التميز', 'العز'],
    'عيد': ['الهيبة', 'العراقة', 'بيزنس كيدز', 'الأصالة', 'الأندلسي', 'التميز', 'العز'],
    'هدية': ['الهيبة', 'العراقة', 'بيزنس كيدز', 'الأصالة', 'الأندلسي', 'التميز', 'العز'],
    'زيارة': ['التميز', 'بيزنس كيدز', 'العز', 'الهيبة', 'العراقة', 'الأصالة', 'كلاسيك', 'كلاسيك 2', 'الأندلسي'],
    'مدرسة': ['كلاسيك 2', 'كلاسيك', 'العز'],
    'يومي': ['كلاسيك 2', 'كلاسيك', 'العز'],
    'بدون': ['العز'],
  },
  sideriMostaqel: {
    'زواج': SIDERI_ORDER.wedding,
    'تصوير': SIDERI_ORDER.wedding,
    'عيد': SIDERI_ORDER.wedding,
    'هدية': SIDERI_ORDER.wedding,
    'زيارة': SIDERI_ORDER.visit,
  },
  daglah: {
    'زواج': DAGLAH_ORDER, 'تصوير': DAGLAH_ORDER, 'عيد': DAGLAH_ORDER, 'هدية': DAGLAH_ORDER,
  },
  taqm: {
    'زواج': TAQM_ORDER, 'تصوير': TAQM_ORDER, 'عيد': TAQM_ORDER, 'هدية': TAQM_ORDER,
  },
  berbetoz: {
    'زواج': BERBETOZ_ORDER, 'تصوير': BERBETOZ_ORDER, 'عيد': BERBETOZ_ORDER, 'هدية': BERBETOZ_ORDER,
  },
  // 13.2 ترتيب أنواع إطلالة المواليد
  mawalidTrackOrder: {
    'زواج': ['بربتوز', 'سديري مستقل', 'دقلة', 'ثوب عادي'],
    'تصوير': ['بربتوز', 'سديري مستقل', 'دقلة', 'ثوب عادي'],
    'عيد': ['بربتوز', 'سديري مستقل', 'دقلة', 'ثوب عادي'],
    'هدية': ['بربتوز', 'سديري مستقل', 'دقلة', 'ثوب عادي'],
  },
  // 14.1 ترتيب أنواع الإطلالة لمسار "اختر لي" (أعمار 1-12)
  chooseForMeTrackOrder: {
    'زواج': ['طقم', 'ثوب', 'سديري مستقل', 'دقلة'],
    'تصوير': ['طقم', 'ثوب', 'سديري مستقل', 'دقلة'],
    'عيد': ['طقم', 'ثوب', 'سديري مستقل', 'دقلة'],
    'هدية': ['طقم', 'ثوب', 'سديري مستقل', 'دقلة'],
    'زيارة': ['سديري مستقل', 'ثوب'], // بثوب موجود: سديري ثم ثوب؛ بلا ثوب: ثوب فقط (يُطبَّق بمنطق شرطي في المحرك)
    'مدرسة': ['ثوب'],
    'يومي': ['ثوب'],
    'بدون': ['ثوب'],
  },
  accessoriesMawalidOrder: ACCESSORIES_MAWALID_ORDER,
  accessories1to12Priority: {
    '5-12': ACCESSORIES_1_12_PRIORITY_5_12,
    '1-4': ACCESSORIES_1_12_PRIORITY_1_4,
  },
};
fs.writeFileSync(path.join(outDir, 'rankings.json'), JSON.stringify(rankings, null, 2), 'utf8');

const count = Object.keys(products).length;
console.log(`تم توليد products.json بعدد ${count} منتج، و rankings.json.`);
