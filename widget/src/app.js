(function () {
  'use strict';

  // ============================================================
  // إعداد — استبدل هذا الرابط برابط خدمة Render الفعلي بعد النشر (build_spec.md §2/§5.1)
  // ============================================================
  const LIVE_JSON_URL = 'https://YOUR-RENDER-SERVICE.onrender.com/live.json';

  // ============================================================
  // أيقونات خطّية بسيطة (SVG مضمّن — لا مكتبات خارجية، logic_prompt.md §22.15)
  // ============================================================
  function icon(pathD, viewBox) {
    return '<svg width="22" height="22" viewBox="' + (viewBox || '0 0 24 24') +
      '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      pathD + '</svg>';
  }
  const ICONS = {
    baby: icon('<circle cx="12" cy="8" r="4"/><path d="M6 20c0-3 2.5-5 6-5s6 2 6 5"/>'),
    toddler: icon('<circle cx="12" cy="6" r="3"/><path d="M7 21v-4a5 5 0 0 1 10 0v4"/>'),
    kid: icon('<circle cx="12" cy="5" r="3"/><path d="M6 21l1-9h10l1 9"/>'),
    kid2: icon('<circle cx="12" cy="5" r="3"/><path d="M5 21l2-10h10l2 10"/>'),
    preteen: icon('<circle cx="12" cy="4.5" r="2.8"/><path d="M5 21l1.5-11h11L19 21"/>'),
    wedding: icon('<circle cx="8.5" cy="14.5" r="4.5"/><circle cx="15.5" cy="14.5" r="4.5"/><path d="M12 4v4"/>'),
    eid: icon('<path d="M17 12a5 5 0 1 1-6-4.9A6.5 6.5 0 1 0 17 12z"/>'),
    school: icon('<path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>'),
    camera: icon('<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M9 7l1.5-2h3L15 7"/>'),
    none: icon('<circle cx="12" cy="12" r="9"/><path d="M8 8l8 8"/>'),
    plain: icon('<path d="M9 3h6l1 4-1 14H9L8 7z"/>'),
    embroidered: icon('<path d="M9 3h6l1 4-1 14H9L8 7z"/><path d="M9.5 8h5M9.5 11h5M9.5 14h5"/>'),
    set: icon('<path d="M8 4h3l1 3-1 13H8L7 7z"/><path d="M14 5h4l1 3-1 9h-4z"/>'),
    luxury: icon('<path d="M12 2l1.8 4.6L18 8l-4.2 1.4L12 14l-1.8-4.6L6 8l4.2-1.4z"/><path d="M5 18l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
    shuffle: icon('<path d="M3 6h4l7 12h4"/><path d="M3 16h4l2.5-4.3"/><path d="M17 6h4M17 16h4"/><path d="M18.5 4.5L21 6l-2.5 1.5M18.5 17.5L21 16l-2.5-1.5"/>'),
  };

  // ============================================================
  // بيانات الأسئلة
  // ============================================================
  const AGE_OPTIONS = [
    { value: 'مواليد', label: 'مواليد حتى سنة', icon: ICONS.baby },
    { value: '1-3', label: '1 - 3 سنوات', icon: ICONS.toddler },
    { value: '4-6', label: '4 - 6 سنوات', icon: ICONS.kid },
    { value: '7-9', label: '7 - 9 سنوات', icon: ICONS.kid2 },
    { value: '10-12', label: '10 - 12 سنة', icon: ICONS.preteen },
  ];
  const OCCASION_OPTIONS = [
    { value: 'زواج', label: 'زواج أو مناسبة فخمة', icon: ICONS.wedding },
    { value: 'عيد_زيارة', label: 'عيد أو زيارة', icon: ICONS.eid },
    { value: 'مدرسة_يومي', label: 'مدرسة أو يومي', icon: ICONS.school },
    { value: 'تصوير', label: 'تصوير', icon: ICONS.camera },
    { value: 'بدون', label: 'بدون مناسبة', icon: ICONS.none },
  ];
  const STYLE_OPTIONS = [
    { value: 'ثوب_سادة', label: 'ثوب سادة', icon: ICONS.plain },
    { value: 'ثوب_مطرز', label: 'ثوب مطرز', icon: ICONS.embroidered },
    { value: 'طقم', label: 'طقم ثوب مع سديري', icon: ICONS.set },
    { value: 'إطلالة_فخمة', label: 'إطلالة فخمة', icon: ICONS.luxury },
    { value: 'اختر_لي', label: 'اختاروا لي', icon: ICONS.shuffle },
  ];
  const SKIN_OPTIONS = [
    { value: 'فاتحة جداً', label: 'فاتحة جداً', swatch: '#f6dfc9' },
    { value: 'فاتحة', label: 'فاتحة', swatch: '#e8c19e' },
    { value: 'متوسطة', label: 'متوسطة', swatch: '#c98d5f' },
    { value: 'داكنة', label: 'داكنة', swatch: '#8a5a35' },
  ];
  // ترجيح ترتيب الألوان فقط داخل النتائج المؤهلة أصلاً — لا يُستبعد بها أي منتج إطلاقاً
  // (logic_prompt.md §7.1 و§19: "لا تستخدم لون البشرة كعامل استبعاد").
  const SKIN_COLOR_WEIGHTS = {
    'فاتحة جداً': ['رصاصي', 'سماوي', 'عنابي', 'أبيض', 'أوف وايت'],
    'فاتحة': ['أوف وايت', 'بيج', 'أخضر', 'أبيض'],
    'متوسطة': ['أبيض', 'أوف وايت', 'سماوي', 'بيج'],
    'داكنة': ['أبيض', 'أوف وايت', 'عنابي', 'أخضر'],
  };
  const COLOR_OPTIONS = [
    { value: 'أبيض', label: 'أبيض', swatch: '#ffffff' },
    { value: 'أوف وايت', label: 'أوف وايت', swatch: '#f1e7d6' },
    { value: 'سماوي', label: 'سماوي', swatch: '#8ec9e0' },
    { value: 'رصاصي', label: 'رصاصي', swatch: '#9aa0a6' },
    { value: 'بيج', label: 'بيج', swatch: '#e3c9a2' },
    { value: 'أخضر', label: 'أخضر', swatch: '#6f9c76' },
    { value: 'عنابي', label: 'عنابي', swatch: '#7a2733' },
  ];

  const STEPS = ['age', 'occasion', 'style', 'skin', 'colors', 'budget'];
  const STEP_TITLES = {
    age: 'كم عمر طفلك؟',
    occasion: 'الإطلالة لأي مناسبة؟',
    style: 'أي ستايل تفضّلين؟',
    skin: 'وش أقرب درجة لبشرة طفلك؟',
    colors: 'أي الألوان تفضّلين؟',
    budget: 'وش الميزانية التقريبية؟ (بالريال)',
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function mount(root) {
    const state = {
      screen: 'hero', // hero | question | results
      stepIndex: 0,
      answers: { colors: [] },
      live: null,
      liveError: false,
      liveLoading: true,
    };

    fetch(LIVE_JSON_URL)
      .then((r) => {
        if (!r.ok) throw new Error('bad status ' + r.status);
        return r.json();
      })
      .then((data) => {
        state.live = data;
        state.liveLoading = false;
        if (state.screen === 'results') render();
      })
      .catch(() => {
        state.liveError = true;
        state.liveLoading = false;
        if (state.screen === 'results') render();
      });

    function render() {
      if (state.screen === 'hero') return renderHero();
      if (state.screen === 'question') return renderQuestion();
      if (state.screen === 'results') return renderResults();
    }

    function renderHero() {
      root.innerHTML =
        '<div class="bw-hero">' +
        '<div class="bw-hero-content">' +
        '<p class="bw-eyebrow">✨ مساعد بُرجة للاختيار</p>' +
        '<h2 class="bw-title">محتارة وش تختارين لطفلك؟</h2>' +
        '<p class="bw-subtitle">جاوبي على 6 أسئلة سريعة، ونرشّح لك أنسب إطلالة متوفرة الآن بسعرها الصحيح.</p>' +
        '<button class="bw-cta" data-action="start">ابدئي الآن ←</button>' +
        '<div class="bw-trust-row">' +
        '<div class="bw-trust-item">اختيارات عصرية وفاخرة</div>' +
        '<div class="bw-trust-item">منتجات بجودة عالية</div>' +
        '<div class="bw-trust-item">تناسب كل المناسبات</div>' +
        '</div>' +
        '<div class="bw-how">' +
        '<h3>كيف تعمل الأداة؟</h3>' +
        '<div class="bw-how-step"><span class="bw-how-num">1</span> جاوبي على الأسئلة</div>' +
        '<div class="bw-how-step"><span class="bw-how-num">2</span> نحلل اختياراتك</div>' +
        '<div class="bw-how-step"><span class="bw-how-num">3</span> نرشّح لك الأنسب</div>' +
        '</div>' +
        '</div>' +
        '<div class="bw-hero-media">' +
        '<img src="https://cdn.salla.sa/ZqYBZ/ba28aece-5b3d-4a6d-88a8-ef127864b025-500x500-BUG3Ba1HXSlqSVhfertxBs2XT0kUivlaDJ4ZnblR.jpg" alt="طفل يرتدي ثوباً من برجة العربية" loading="lazy"/>' +
        '</div>' +
        '</div>';
      root.querySelector('[data-action="start"]').addEventListener('click', () => {
        state.screen = 'question';
        state.stepIndex = 0;
        render();
      });
    }

    function currentStep() { return STEPS[state.stepIndex]; }

    function isStepAnswered(step) {
      if (step === 'age') return !!state.answers.age;
      if (step === 'occasion') return !!state.answers.occasionChoice;
      if (step === 'style') return !!state.answers.styleChoice;
      if (step === 'skin') return !!state.answers.skinTone;
      if (step === 'colors') return true; // متعدد الاختيار، اختياري (يجوز "بدون تفضيل")
      if (step === 'budget') return state.answers.budget !== undefined && state.answers.budget !== null && state.answers.budget !== '';
      return false;
    }

    function renderProgressDots() {
      let html = '<div class="bw-progress">';
      STEPS.forEach((s, i) => {
        const cls = i === state.stepIndex ? 'is-active' : i < state.stepIndex ? 'is-done' : '';
        html += '<span class="bw-dot ' + cls + '"></span>';
      });
      html += '<span class="bw-progress-label">' + (state.stepIndex + 1) + ' من ' + STEPS.length + '</span></div>';
      return html;
    }

    function optionCardsHtml(options, selected, multi) {
      return '<div class="bw-options">' + options.map((o) => {
        const isSelected = multi ? selected.includes(o.value) : selected === o.value;
        return (
          '<button type="button" class="bw-option' + (isSelected ? ' is-selected' : '') + '" data-value="' + escapeHtml(o.value) + '">' +
          '<span class="bw-option-icon">' + o.icon + '</span>' +
          '<span>' + escapeHtml(o.label) + '</span>' +
          '</button>'
        );
      }).join('') + '</div>';
    }

    function colorGridHtml(selected) {
      let html = '<div class="bw-color-grid">';
      COLOR_OPTIONS.forEach((c) => {
        const isSelected = selected.includes(c.value);
        html +=
          '<button type="button" class="bw-color-chip' + (isSelected ? ' is-selected' : '') + '" data-value="' + escapeHtml(c.value) + '">' +
          '<span class="bw-color-swatch" style="background:' + c.swatch + '"></span>' +
          '<span>' + escapeHtml(c.label) + '</span>' +
          '</button>';
      });
      const noPrefSelected = selected.includes('بدون تفضيل');
      html +=
        '<button type="button" class="bw-color-chip' + (noPrefSelected ? ' is-selected' : '') + '" data-value="بدون تفضيل">' +
        '<span class="bw-color-swatch" style="background:#fff;border:1px dashed #999"></span>' +
        '<span>ما عندي تفضيل</span>' +
        '</button>';
      html += '</div>';
      return html;
    }

    function renderQuestion() {
      const step = currentStep();
      let bodyHtml = '';

      if (step === 'age') bodyHtml = optionCardsHtml(AGE_OPTIONS, state.answers.age, false);
      else if (step === 'occasion') bodyHtml = optionCardsHtml(OCCASION_OPTIONS, state.answers.occasionChoice, false);
      else if (step === 'style') bodyHtml = optionCardsHtml(STYLE_OPTIONS, state.answers.styleChoice, false);
      else if (step === 'skin') bodyHtml = optionCardsHtml(SKIN_OPTIONS.map((o) => ({ ...o, icon: '<span class="bw-color-swatch" style="background:' + o.swatch + ';display:inline-block;width:100%;height:100%;border-radius:50%"></span>' })), state.answers.skinTone, false);
      else if (step === 'colors') bodyHtml = colorGridHtml(state.answers.colors || []);
      else if (step === 'budget') {
        bodyHtml =
          '<input type="number" min="0" step="10" class="bw-budget-input" placeholder="مثال: 200" value="' +
          (state.answers.budget || '') + '" data-role="budget-input" inputmode="numeric" />';
      }

      root.innerHTML =
        '<div class="bw-question-screen">' +
        renderProgressDots() +
        '<h2 class="bw-question-title">' + STEP_TITLES[step] + '</h2>' +
        bodyHtml +
        '<div class="bw-nav-row">' +
        '<button class="bw-btn-secondary" data-action="back">رجوع</button>' +
        '<button class="bw-btn-primary" data-action="next"' + (isStepAnswered(step) ? '' : ' disabled') + '>' +
        (state.stepIndex === STEPS.length - 1 ? 'النتائج' : 'التالي') +
        '</button>' +
        '</div>' +
        '</div>';

      if (step !== 'budget') {
        root.querySelectorAll('.bw-option, .bw-color-chip').forEach((btn) => {
          btn.addEventListener('click', () => {
            const value = btn.getAttribute('data-value');
            if (step === 'age') state.answers.age = value;
            else if (step === 'occasion') state.answers.occasionChoice = value;
            else if (step === 'style') state.answers.styleChoice = value;
            else if (step === 'skin') state.answers.skinTone = value;
            else if (step === 'colors') {
              const list = state.answers.colors || [];
              if (value === 'بدون تفضيل') {
                state.answers.colors = list.includes('بدون تفضيل') ? [] : ['بدون تفضيل'];
              } else {
                let next = list.filter((v) => v !== 'بدون تفضيل');
                next = next.includes(value) ? next.filter((v) => v !== value) : next.concat(value);
                state.answers.colors = next;
              }
            }
            render();
          });
        });
      } else {
        const input = root.querySelector('[data-role="budget-input"]');
        input.addEventListener('input', () => {
          const n = parseFloat(input.value);
          state.answers.budget = input.value === '' ? null : (isNaN(n) ? null : n);
          root.querySelector('[data-action="next"]').disabled = !isStepAnswered('budget');
        });
      }

      root.querySelector('[data-action="back"]').addEventListener('click', () => {
        if (state.stepIndex === 0) { state.screen = 'hero'; render(); return; }
        state.stepIndex -= 1;
        render();
      });
      root.querySelector('[data-action="next"]').addEventListener('click', () => {
        if (!isStepAnswered(step)) return;
        if (state.stepIndex === STEPS.length - 1) {
          state.screen = 'results';
          render();
        } else {
          state.stepIndex += 1;
          render();
        }
      });
    }

    function priceBlockHtml(card) {
      if (card.hasDiscount) {
        return (
          '<div class="bw-card-price-row">' +
          '<span class="bw-price-now">' + card.price.toFixed(2) + ' ر.س</span>' +
          '<span class="bw-price-was">' + card.basePrice.toFixed(2) + ' ر.س</span>' +
          '</div>'
        );
      }
      return '<div class="bw-card-price-row"><span class="bw-price-now">' + (card.price != null ? card.price.toFixed(2) + ' ر.س' : '—') + '</span></div>';
    }

    function cardHtml(entry) {
      const card = entry.card;
      const isBest = entry.role === 'best';
      const roleLabel = entry.label || '';
      let alertHtml = '';
      if (card.overBudget) {
        alertHtml += '<div class="bw-card-alert">أعلى من الميزانية بمقدار ' + card.overBudgetBy.toFixed(2) + ' ر.س</div>';
      }
      if (card.mismatchReason) {
        alertHtml += '<div class="bw-card-alert">' + card.mismatchReason + '</div>';
      }
      const imgSrc = card.image || '';
      const imgHtml = imgSrc
        ? '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(card.name) + '" loading="lazy"/>'
        : '<div class="bw-card-alert">لا تتوفر صورة — ' + escapeHtml(card.name) + '</div>';

      return (
        '<div class="bw-card' + (isBest ? ' is-best' : '') + '">' +
        (isBest ? '<div class="bw-card-badge">الاختيار الأفضل</div>' : '') +
        (roleLabel && !isBest ? '<div class="bw-card-role">' + escapeHtml(roleLabel) + '</div>' : '') +
        imgHtml +
        '<div class="bw-card-name">' + escapeHtml(card.name) + '</div>' +
        priceBlockHtml(card) +
        (card.availableSizes && card.availableSizes.length
          ? '<div class="bw-size-note">المقاسات المتاحة: ' + card.availableSizes.join('، ') + '</div>'
          : '') +
        alertHtml +
        (card.url
          ? '<a class="bw-card-cta" href="' + escapeHtml(card.url) + '" target="_blank" rel="noopener">عرض المنتج</a>'
          : '<span class="bw-card-alert">رابط المنتج غير متاح حالياً</span>') +
        (isBest && card.url ? '<a class="bw-card-cta-extra" href="' + escapeHtml(card.url) + '" target="_blank" rel="noopener">أضف للسلة</a>' : '') +
        '</div>'
      );
    }

    function renderResults() {
      if (state.liveLoading) {
        root.innerHTML =
          '<div class="bw-state-box">' +
          '<div class="bw-skeleton" style="width:60%;margin:0 auto"></div>' +
          '<div class="bw-skeleton" style="width:40%;margin:8px auto"></div>' +
          'جاري التحقق من المنتجات المتاحة…' +
          '</div>';
        return;
      }
      if (state.liveError || !state.live) {
        root.innerHTML =
          '<div class="bw-state-box">' +
          '<p>تعذّر التحقق المباشر من التوفر والأسعار الآن.</p>' +
          '<p>التوفر غير مؤكد حالياً — الرجاء المحاولة مرة أخرى بعد قليل.</p>' +
          '<div class="bw-restart-row"><button class="bw-restart-btn" data-action="restart">↻ حاولي مرة أخرى</button></div>' +
          '</div>';
        root.querySelector('[data-action="restart"]').addEventListener('click', () => {
          state.screen = 'hero';
          state.stepIndex = 0;
          render();
        });
        return;
      }

      const result = window.DecisionEngine.recommend(state.answers, {
        catalog: window.BURJAH_PRODUCTS,
        rankings: window.BURJAH_RANKINGS,
        live: state.live,
        skinToneColorWeights: SKIN_COLOR_WEIGHTS,
      });

      if (result.empty) {
        root.innerHTML =
          '<div class="bw-state-box">' +
          '<p>' + escapeHtml(result.message || 'ما وجدنا خياراً يطابق كل الشروط.') + '</p>' +
          '<div class="bw-restart-row"><button class="bw-restart-btn" data-action="restart">↻ غيّري إجاباتك</button></div>' +
          '</div>';
        root.querySelector('[data-action="restart"]').addEventListener('click', () => {
          state.screen = 'question';
          state.stepIndex = 0;
          render();
        });
        return;
      }

      const suitableColors = {};
      result.cards.forEach((c) => {
        if (c.card.color) suitableColors[c.card.color] = COLOR_OPTIONS.find((o) => o.value === c.card.color) || { swatch: '#ccc' };
      });

      root.innerHTML =
        '<div>' +
        '<h2 class="bw-results-title">✨ اختيارنا الأنسب لطفلك</h2>' +
        '<p class="bw-summary-line">العمر: ' + escapeHtml(state.answers.age) +
        ' · المناسبة: ' + escapeHtml(state.answers.occasionChoice) +
        ' · الميزانية: ' + escapeHtml(state.answers.budget) + ' ر.س</p>' +
        '<div class="bw-cards-row">' + result.cards.map(cardHtml).join('') + '</div>' +
        (Object.keys(suitableColors).length
          ? '<div class="bw-suitable-colors"><h4>الألوان الأنسب لطفلك</h4><div class="bw-suitable-colors-row">' +
            Object.entries(suitableColors).map(([name, o]) =>
              '<span class="bw-suitable-color"><span style="background:' + o.swatch + '"></span>' + escapeHtml(name) + '</span>'
            ).join('') + '</div></div>'
          : '') +
        '<p class="bw-availability-note">المقاسات تقريبية بناءً على العمر والمتوفر، والمرجع النهائي جدول المقاسات قبل إتمام الطلب.</p>' +
        '<div class="bw-restart-row"><button class="bw-restart-btn" data-action="restart">↻ غيّري إجاباتك</button></div>' +
        '</div>';

      root.querySelector('[data-action="restart"]').addEventListener('click', () => {
        state.screen = 'question';
        state.stepIndex = 0;
        render();
      });
    }

    render();
  }

  function init() {
    document.querySelectorAll('[data-burjah-widget]').forEach(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
