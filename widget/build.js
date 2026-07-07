#!/usr/bin/env node
/**
 * يجمّع ويدجت بُرجة في ملف HTML واحد جاهز للصق في خانة "محتوى HTML" بمحرر ثيم سلة
 * (build_spec.md §5.1: كل شيء inline، بلا مفتاح API، بلا مكتبات خارجية).
 * تشغيل: node widget/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const products = fs.readFileSync(path.join(root, 'data', 'products.json'), 'utf8');
const rankings = fs.readFileSync(path.join(root, 'data', 'rankings.json'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'engine', 'decisionEngine.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'src', 'styles.css'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, 'src', 'app.js'), 'utf8');

const html = `<!-- مساعد بُرجة العربية للاختيار — يُلصق كاملاً في خانة "محتوى HTML" بمحرر ثيم سلة. -->
<!-- قبل اللصق: عدّل رابط LIVE_JSON_URL داخل app.js (أسفل هذا الملف) إلى رابط خدمة Render الفعلي بعد نشرها. -->
<div data-burjah-widget class="burjah-widget"></div>
<style>
${css}
</style>
<script>
window.BURJAH_PRODUCTS = ${products};
window.BURJAH_RANKINGS = ${rankings};
</script>
<script>
${engineSource}
</script>
<script>
${appSource}
</script>
`;

const outPath = path.join(__dirname, 'dist', 'burjah-widget.html');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(`تم بناء الويدجت -> ${outPath} (${(html.length / 1024).toFixed(1)} كيلوبايت)`);
