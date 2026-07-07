'use strict';
/**
 * محرك القرار — شجرة ثابتة بالكامل (لا ذكاء اصطناعي)، ينفّذ تسلسل logic_prompt.md §21:
 * collectAnswers -> filterHardConstraints -> selectFamilies -> checkLiveAvailability
 * -> applyBudget -> rankResults -> buildCards.
 * يعمل داخل Node (اختبارات) وداخل المتصفح (مضمّن inline في الويدجت) بلا فروقات.
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else root.DecisionEngine = mod;
})(typeof self !== 'undefined' ? self : this, function () {
  // ============================================================
  // ثوابت مشتقة من logic_prompt.md §4-§7
  // ============================================================

  // §5.1 نطاق مقاس الثوب التقريبي حسب العمر (متداخل عمداً)
  const THOB_SIZE_RANGE_BY_AGE = {
    '1-3': [26, 32],
    '4-6': [33, 40],
    '7-9': [38, 46],
    '10-12': [46, 52],
  };

  // §5.2 ربط مقاس السديري بنطاق مقاس الثوب المقابل
  const VEST_TO_THOB_RANGE = [
    { vestSize: 10, thobRange: [22, 24] },
    { vestSize: 12, thobRange: [25, 28] },
    { vestSize: 14, thobRange: [29, 32] },
    { vestSize: 16, thobRange: [33, 36] },
    { vestSize: 18, thobRange: [37, 41] },
    { vestSize: 20, thobRange: [42, 45] },
    { vestSize: 22, thobRange: [46, 52] },
  ];

  // خيارات مبسّطة لسؤال المناسبة في الويدجت (build_spec.md §5.4) -> مجموعة مناسبات كنسية (logic_prompt.md §4)
  const OCCASION_UI_MAP = {
    'زواج': ['زواج'],
    'تصوير': ['تصوير'],
    'عيد': ['عيد'],
    'عيد_زيارة': ['عيد', 'زيارة'],
    'زيارة': ['زيارة'],
    'مدرسة_يومي': ['مدرسة', 'يومي'],
    'مدرسة': ['مدرسة'],
    'يومي': ['يومي'],
    'بدون': ['بدون'],
    'هدية': ['هدية'],
  };

  // خيارات مبسّطة لسؤال الستايل/المسار (build_spec.md §5.4) -> مسار + تفضيل أسلوب/فخامة (قابل للتجاوز فقط)
  const TRACK_UI_MAP = {
    'ثوب_سادة': { track: 'ثوب', styleHint: 'هادئ وبسيط' },
    'ثوب_مطرز': { track: 'ثوب', styleHint: 'تطريز واضح مميز' },
    'طقم': { track: 'طقم' },
    'إطلالة_فخمة': { track: 'ثوب', luxuryHint: 'فاخر ومميز' },
    'اختر_لي': { track: 'اختر لي' },
    // مسارات إضافية يدعمها المحرك (غير مربوطة بزر مباشر في الويدجت الحالي، تُستخدم من "اختر لي" أو اختبارات)
    'سديري_مستقل': { track: 'سديري مستقل' },
    'دقلة': { track: 'دقلة' },
  };

  const COLORTYPE_WHITE_FAMILY = new Set(['أبيض', 'أوف وايت']);

  function normalizeOccasionSet(occasionChoice) {
    return new Set(OCCASION_UI_MAP[occasionChoice] || [occasionChoice]);
  }

  function resolveTrack(answers) {
    if (answers._resolvedTrack) return answers._resolvedTrack; // تجاوز داخلي لتشغيل مسار محدد أثناء "اختر لي"
    if (answers.age === 'مواليد') return 'إطلالة مواليد'; // §13.1 العمر يفرض المسار بلا نقاش
    const mapped = TRACK_UI_MAP[answers.styleChoice];
    return mapped ? mapped.track : answers.styleChoice;
  }

  // ============================================================
  // 1) collectAnswers — تحقق الحد الأدنى (العمر/المناسبة/المسار/الميزانية إلزامية قبل التوصية، §2/§6)
  // ============================================================
  function collectAnswers(rawAnswers) {
    const missing = [];
    if (!rawAnswers.age) missing.push('age');
    if (!rawAnswers.occasionChoice) missing.push('occasionChoice');
    if (!rawAnswers.styleChoice) missing.push('styleChoice');
    if (rawAnswers.budget === undefined || rawAnswers.budget === null) missing.push('budget');
    return { complete: missing.length === 0, missing, answers: rawAnswers };
  }

  // ============================================================
  // 2) filterHardConstraints — القسم 7.1: عمر/مناسبة/مسار/لون/نوع لون/موسم/مقاس/بيع/ظهور/مخزون
  //    (البيع/الظهور/المخزون تُفحص لاحقاً في checkLiveAvailability بعد جلب live.json)
  // ============================================================
  function filterHardConstraints(catalogEntries, answers) {
    const track = resolveTrack(answers);
    const occasionSet = normalizeOccasionSet(answers.occasionChoice);
    const requestedColors = (answers.colors || []).filter((c) => c && c !== 'بدون تفضيل');

    return catalogEntries.filter((p) => {
      if (p.excludeFromStandalone && track !== 'طقم') return false;

      // القسم 19: لا سديري بُرجة للزيارات — مطبّق أصلاً عبر occasions الثابتة في products.json.
      // القسم 10.1: السديري المستقل يفترض أن العميل يملك ثوباً مناسباً مسبقاً — لا نفترض ذلك أبداً؛
      // يُفعَّل فقط إن أكّد المستخدم صراحة (answers.hasThobForVest === true).
      if (track === 'سديري مستقل' && !answers.hasThobForVest) return false;

      // للطقم: البطاقة تمثّل الإطلالة الكاملة، فلا نعرض سديري المكوّن كنتيجة مستقلة —
      // فقط الثوب (يُجمع مع أرخص سديري متوافق في applyBudget) أو الطقم أحادي القطعة.
      const trackMatches =
        (track === 'ثوب' && p.track && p.track.includes('ثوب')) ||
        (track === 'طقم' && p.taqmFamily && (p.taqmRole === 'ثوب' || p.taqmRole === 'طقم كامل')) ||
        (track === 'سديري مستقل' && p.track && p.track.includes('سديري مستقل')) ||
        (track === 'دقلة' && p.track && p.track.includes('دقلة')) ||
        (track === 'إطلالة مواليد' && p.track && p.track.includes('إطلالة مواليد'));
      if (!trackMatches) return false;

      // المناسبة (صلبة) — للطقم نستخدم occasions_taqm الخاصة بسياق الطقم
      const productOccasions =
        track === 'طقم' ? p.occasions_taqm || p.occasions : p.occasions;
      if (productOccasions) {
        const overlap = productOccasions.some((o) => occasionSet.has(o));
        if (!overlap) return false;
      }

      // نوع اللون (صلب) — مقارنة تقريبية بالخريطة الثابتة؛ التأكيد الدقيق لاحقاً من live.json
      if (requestedColors.length) {
        const colorTypeForCheck =
          track === 'طقم' && p.taqmColorType ? p.taqmColorType : p.colorType;
        if (colorTypeForCheck && colorTypeForCheck.length) {
            const wantsWhiteFamily = requestedColors.some((c) => COLORTYPE_WHITE_FAMILY.has(c));
            const wantsColored = requestedColors.some((c) => !COLORTYPE_WHITE_FAMILY.has(c));
            const hasWhiteFamily = colorTypeForCheck.some((c) => COLORTYPE_WHITE_FAMILY.has(c));
            const hasColored = colorTypeForCheck.includes('ملوّن');
            const passes = (wantsWhiteFamily && hasWhiteFamily) || (wantsColored && hasColored);
            if (!passes) return false;
        } else if (p.colorCompat && p.colorCompat !== 'varies') {
          // سديري/دقلة: colorCompat = أبيض|أوف وايت|الاثنين
          const wantsWhiteFamily = requestedColors.some((c) => COLORTYPE_WHITE_FAMILY.has(c));
          if (wantsWhiteFamily && p.colorCompat !== 'الاثنين' && !requestedColors.includes(p.colorCompat)) {
            return false;
          }
        }
      }

      // العمر (صلب لغير الثوب/الطقم — عبر ageGroup الصريح إن وُجد؛ مقاس الثوب يُفحص عبر availableSizes لاحقاً)
      if (p.ageGroup) {
        if (p.ageGroup === 'مواليد' && answers.age !== 'مواليد') return false;
        if (p.ageGroup !== 'مواليد' && answers.age === 'مواليد') return false;
        if (p.ageGroup.includes('-') && answers.ageYears !== undefined) {
          const [min, max] = p.ageGroup.split('-').map(Number);
          if (answers.ageYears < min || answers.ageYears > max) return false;
        }
      } else if (answers.age === 'مواليد' && track !== 'إطلالة مواليد') {
        return false; // مواليد لا يدخل مساراً غير مسار المواليد إلا عبر ageGroup الصريح
      }

      return true;
    });
  }

  // ============================================================
  // 3) selectFamilies — ترتيب العائلات حسب جداول rankings.json بحسب المناسبة+المسار
  // ============================================================
  function familyRankKey(product, track) {
    if (track === 'طقم') return product.taqmFamily;
    return product.family;
  }

  function selectFamilies(candidates, answers, rankings) {
    const track = resolveTrack(answers);
    const occasionSet = normalizeOccasionSet(answers.occasionChoice);
    const primaryOccasion = Array.from(occasionSet)[0];

    let orderTable = null;
    if (track === 'ثوب') orderTable = rankings.thob;
    else if (track === 'طقم') orderTable = rankings.taqm;
    else if (track === 'سديري مستقل') orderTable = rankings.sideriMostaqel;
    else if (track === 'دقلة') orderTable = rankings.daglah;
    else if (track === 'إطلالة مواليد') orderTable = rankings.berbetoz;

    const order = orderTable ? orderTable[primaryOccasion] || [] : [];
    return candidates.map((p) => ({
      ...p,
      _familyRank: order.indexOf(familyRankKey(p, track)),
    }));
  }

  // ============================================================
  // 4) checkLiveAvailability — القسم 3 و21.5-6: توفر فعلي + مقاس ضمن النطاق + لون مطلوب
  // ============================================================
  function checkLiveAvailability(candidates, live, answers) {
    const requestedColors = (answers.colors || []).filter((c) => c && c !== 'بدون تفضيل');
    const sizeRange = THOB_SIZE_RANGE_BY_AGE[answers.age] || null;
    // تعذّر تحميل live.json بالكامل (فشل الشبكة) — حالة مختلفة عن غياب سجل منتج واحد
    // (الأخير لا يُفترض حدوثه في الإنتاج لأن sync.js يكتب سجلاً لكل ID، حتى عند الفشل).
    const liveUnavailableEntirely = !live || !live.products;

    return candidates
      .map((p) => {
        const liveRecord = live && live.products ? live.products[p.id] : undefined;
        if (!liveRecord) {
          if (liveUnavailableEntirely) {
            return { ...p, _live: null, _liveVerified: false, _matchedColors: [], _matchedSizes: [] };
          }
          return null; // منتج غير موجود في live.json رغم نجاح تحميله — لا نجزم بتوفره
        }
        if (!liveRecord.eligible) return null; // مخفي/نافد/غير مباع — لا يُعرض إطلاقاً

        const availableSizes = liveRecord.availableSizes || {};
        let matchedColors = Object.keys(availableSizes);
        if (requestedColors.length) {
          matchedColors = matchedColors.filter((c) => requestedColors.includes(c));
        }

        // لكل لون مطابق، صفِّ المقاسات ضمن النطاق التقريبي (إن وُجد نطاق؛ الفئات ذات ageGroup الصريح تتجاوز هذا الفحص)
        const matchedSizesByColor = {};
        let anySizeAvailable = false;
        for (const color of matchedColors) {
          let sizes = availableSizes[color] || [];
          if (sizeRange && !p.ageGroup) {
            sizes = sizes.filter((s) => s >= sizeRange[0] && s <= sizeRange[1]);
          }
          if (sizes.length) {
            matchedSizesByColor[color] = sizes;
            anySizeAvailable = true;
          }
        }

        if (!matchedColors.length || !anySizeAvailable) return null;

        return {
          ...p,
          _live: liveRecord,
          _liveVerified: true,
          _matchedColors: Object.keys(matchedSizesByColor),
          _matchedSizes: matchedSizesByColor,
        };
      })
      .filter(Boolean);
  }

  // ============================================================
  // 5) applyBudget — القسم 6: السعر المخفض الفعلي؛ الطقم = إجمالي المكوّنين
  // ============================================================
  function effectivePrice(liveRecord) {
    if (!liveRecord) return null;
    return liveRecord.hasDiscount ? liveRecord.salePrice : liveRecord.basePrice;
  }

  function applyBudget(candidates, answers, live) {
    if (answers.budget === undefined || answers.budget === null) return candidates;
    const track = resolveTrack(answers);
    return candidates
      .map((p) => {
        let price = effectivePrice(p._live);
        // مبلغ الطقم = إجمالي الثوب + السديري (§12.6) — فقط حين المسار الفعلي هو "طقم".
        // بعض أثواب الطقم (كالهيبة) لها أيضاً taqmRole لأنها تُستخدم كثوب مستقل أيضاً؛
        // لا نجمع سعر السديري إلا حين المستخدم فعلاً في مسار الطقم.
        if (track === 'طقم' && p.taqmRole === 'ثوب' && p.taqmPairIds && p.taqmPairIds.length) {
          // القسم 12.6: الميزانية = إجمالي المخفض للمكوّنين. نأخذ أرخص سديري متوفر متوافق كتقدير.
          const pairPrices = p.taqmPairIds
            .map((vid) => live && live.products && live.products[vid])
            .filter((v) => v && v.eligible)
            .map((v) => effectivePrice(v))
            .filter((n) => n !== null);
          if (pairPrices.length) {
            price = (price || 0) + Math.min(...pairPrices);
          }
        }
        const overBudget = price !== null && price > answers.budget;
        return { ...p, _price: price, _overBudget: overBudget, _overBudgetBy: overBudget ? price - answers.budget : 0 };
      })
      .filter((p) => p._price !== null);
  }

  // ============================================================
  // 6) rankResults — القسم 7.3: أقل تجاوزات للقابل للتجاوز (أسلوب/فخامة)، ثم ترتيب العائلة، ثم الأرخص
  // ============================================================
  function styleLuxuryMismatchScore(p, answers) {
    let mismatches = 0;
    const mapped = TRACK_UI_MAP[answers.styleChoice];
    if (mapped && mapped.styleHint && p.style && !p.style.includes(mapped.styleHint)) mismatches += 1;
    if (mapped && mapped.luxuryHint && p.luxury !== mapped.luxuryHint) mismatches += 1;
    return mismatches;
  }

  function rankResults(candidates, answers) {
    const withinBudget = candidates.filter((p) => !p._overBudget);
    const pool = withinBudget.length ? withinBudget : candidates; // §18 أقرب بديل عند عدم وجود مطابق كامل

    return pool
      .map((p) => ({ ...p, _mismatch: styleLuxuryMismatchScore(p, answers) }))
      .sort((a, b) => {
        if (a._overBudget !== b._overBudget) return a._overBudget ? 1 : -1;
        if (a._mismatch !== b._mismatch) return a._mismatch - b._mismatch;
        const rankA = a._familyRank === -1 ? Infinity : a._familyRank;
        const rankB = b._familyRank === -1 ? Infinity : b._familyRank;
        if (rankA !== rankB) return rankA - rankB;
        return (a._price || 0) - (b._price || 0);
      });
  }

  // ============================================================
  // 7) buildCards — القسم 8/20/22: أفضل / أبسط / أفخم
  // ============================================================
  function pickSkinToneColor(matchedColors, skinTone, skinToneColorWeights) {
    if (!skinTone || !skinToneColorWeights || !skinToneColorWeights[skinTone]) return matchedColors[0];
    const preferred = skinToneColorWeights[skinTone];
    // رتّب حسب أولوية التفضيل نفسها لا حسب ترتيب matchedColors العشوائي
    const found = preferred.find((c) => matchedColors.includes(c));
    return found || matchedColors[0];
  }

  function toCard(p, answers, skinToneColorWeights) {
    const color = pickSkinToneColor(p._matchedColors, answers.skinTone, skinToneColorWeights);
    const sizes = p._matchedSizes[color] || [];
    return {
      id: p.id,
      family: p.family,
      name: (p._live && p._live.name) || p.family,
      image: p._live ? p._live.image : null,
      url: p._live ? p._live.url : null,
      price: p._price,
      basePrice: p._live ? p._live.basePrice : null,
      salePrice: p._live ? p._live.salePrice : null,
      hasDiscount: p._live ? p._live.hasDiscount : false,
      color,
      availableSizes: sizes,
      overBudget: p._overBudget,
      overBudgetBy: p._overBudgetBy,
      mismatch: p._mismatch,
      mismatchReason: p._mismatch > 0 ? 'الأسلوب أو مستوى الفخامة المطلوب غير متوفر تماماً — أقرب بديل' : null,
    };
  }

  function buildCards(ranked, answers, options = {}) {
    if (!ranked.length) {
      return { empty: true, message: 'ما وجدنا خياراً يطابق كل الشروط. جرّبي تعديل شرط واحد (الأسلوب أو الفخامة) مع إبقاء العمر/المناسبة/اللون كما هي.' };
    }
    const skinToneColorWeights = options.skinToneColorWeights;

    if (answers.styleChoice === 'اختر_لي') {
      const best = ranked[0];
      const simpler = ranked.find((p) => p.id !== best.id && (p._price || 0) <= (best._price || 0)) || ranked[1];
      const fancier = ranked.find((p) => p.id !== best.id && p.id !== (simpler && simpler.id) && (p._price || 0) >= (best._price || 0)) ||
        ranked.find((p) => p.id !== best.id && p.id !== (simpler && simpler.id));

      const cards = [
        { role: 'best', label: 'الاختيار الأفضل', card: toCard(best, answers, skinToneColorWeights) },
      ];
      if (simpler) cards.unshift({ role: 'simpler', label: 'بديل أكثر بساطة', card: toCard(simpler, answers, skinToneColorWeights) });
      if (fancier) cards.push({ role: 'fancier', label: 'بديل أكثر فخامة', card: toCard(fancier, answers, skinToneColorWeights) });

      return { empty: false, mode: 'choose-for-me', cards };
    }

    return {
      empty: false,
      mode: 'direct',
      cards: ranked.map((p) => ({ role: 'result', label: null, card: toCard(p, answers, skinToneColorWeights) })),
    };
  }

  // ينفّذ السلسلة الكاملة (2-6) لمسار محدد بالضبط، ويرجّع القائمة المرتّبة الخام (بلا buildCards).
  function runPipelineForTrack(entries, answers, forcedTrack, rankings, live) {
    const trackedAnswers = forcedTrack ? { ...answers, _resolvedTrack: forcedTrack } : answers;
    let candidates = filterHardConstraints(entries, trackedAnswers);
    candidates = selectFamilies(candidates, trackedAnswers, rankings);
    candidates = checkLiveAvailability(candidates, live, trackedAnswers);
    candidates = applyBudget(candidates, trackedAnswers, live);
    return rankResults(candidates, trackedAnswers);
  }

  // ============================================================
  // التنسيق العام
  // ============================================================
  function recommend(rawAnswers, { catalog, rankings, live, skinToneColorWeights } = {}) {
    const collected = collectAnswers(rawAnswers);
    if (!collected.complete) {
      return { empty: true, incomplete: true, missing: collected.missing };
    }
    const answers = collected.answers;
    const entries = Object.entries(catalog).map(([id, meta]) => ({ id, ...meta }));

    const baseTrack = resolveTrack(answers);

    if (baseTrack !== 'اختر لي') {
      const ranked = runPipelineForTrack(entries, answers, null, rankings, live);
      return buildCards(ranked, answers, { skinToneColorWeights });
    }

    // مسار "اختر لي" (logic_prompt.md §14): جرّب أنواع الإطلالة بترتيب المناسبة، وتوقف
    // عند أول نوع يوفّر 3 مؤهلة؛ إن لم يبلغ أي نوع 3، استخدم أغنى نتيجة كأقرب بديل (§18).
    const occasionSet = normalizeOccasionSet(answers.occasionChoice);
    const primaryOccasion = Array.from(occasionSet)[0];
    const trackOrder = (rankings.chooseForMeTrackOrder && rankings.chooseForMeTrackOrder[primaryOccasion]) || ['ثوب'];

    let bestRanked = [];
    for (const candidateTrack of trackOrder) {
      const ranked = runPipelineForTrack(entries, answers, candidateTrack, rankings, live);
      if (ranked.length >= 3) { bestRanked = ranked; break; }
      if (ranked.length > bestRanked.length) bestRanked = ranked;
    }
    return buildCards(bestRanked, answers, { skinToneColorWeights });
  }

  return {
    recommend,
    collectAnswers,
    filterHardConstraints,
    selectFamilies,
    checkLiveAvailability,
    applyBudget,
    rankResults,
    buildCards,
    resolveTrack,
    normalizeOccasionSet,
    THOB_SIZE_RANGE_BY_AGE,
    VEST_TO_THOB_RANGE,
    OCCASION_UI_MAP,
    TRACK_UI_MAP,
  };
});
