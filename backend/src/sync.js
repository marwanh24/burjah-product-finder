'use strict';
const fs = require('fs');
const path = require('path');
const { client, getProduct, getAllVariants } = require('./sallaClient');
const { parseVariantName } = require('./parseVariantName');

const PRODUCTS_JSON_PATH = path.join(__dirname, '..', '..', 'data', 'products.json');
const LIVE_JSON_PATH = path.join(__dirname, '..', 'data', 'live.json');

function buildVariantRecords(rawVariants) {
  const records = [];
  for (const v of rawVariants) {
    const { size, color } = parseVariantName(v.name);
    records.push({
      variantId: v.id,
      size,
      color,
      stock: v.stock_quantity || 0,
      barcode: v.barcode || null,
    });
  }
  return records;
}

function buildAvailableSizes(variantRecords) {
  const byColor = {};
  for (const v of variantRecords) {
    if (v.stock > 0 && v.color && v.size !== null) {
      if (!byColor[v.color]) byColor[v.color] = new Set();
      byColor[v.color].add(v.size);
    }
  }
  const result = {};
  for (const [color, sizes] of Object.entries(byColor)) {
    result[color] = Array.from(sizes).sort((a, b) => a - b);
  }
  return result;
}

/** دالة نقية بلا شبكة — تُبنى منها سهولة الاختبار (test/run-tests.js). */
function shapeProductRecord(product, rawVariants) {
  const variantRecords = buildVariantRecords(rawVariants);
  const availableSizes = buildAvailableSizes(variantRecords);

  const status = product.status;
  const visibleInWeb = product.is_available === true;
  const eligible = status === 'sale' && visibleInWeb;

  // ملاحظة مهمة (تأكدت بالاختبار الحي): لا يوجد حقل has_special_price على مستوى
  // المنتج في /products/{id} (فقط داخل كل عنصر sku). الخصم الفعلي يُكتشف بمقارنة
  // regular_price (السعر الأساسي قبل الخصم) بـ price (السعر الحالي الفعلي).
  const currentPrice = product.price ? product.price.amount : null;
  const regularPrice = product.regular_price ? product.regular_price.amount : null;
  const hasDiscount =
    currentPrice !== null && regularPrice !== null && regularPrice > currentPrice;

  return {
    name: product.name,
    status,
    visibleInWeb,
    eligible,
    image: product.main_image || null,
    url: (product.urls && product.urls.customer) || product.url || null,
    basePrice: hasDiscount ? regularPrice : currentPrice,
    salePrice: hasDiscount ? currentPrice : null,
    hasDiscount,
    variants: variantRecords.map((v) => ({
      variantId: v.variantId,
      size: v.size,
      color: v.color,
      stock: v.stock,
    })),
    availableSizes,
    // ملاحظة: cost_price ممنوع تصديره — build_spec.md §2.3. لا تضفه هنا مهما حدث.
  };
}

async function syncOneProduct(http, productId) {
  const [product, rawVariants] = await Promise.all([
    getProduct(http, productId),
    getAllVariants(http, productId),
  ]);
  return shapeProductRecord(product, rawVariants);
}

async function runSync({ productIds } = {}) {
  const catalog = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'));
  const ids = productIds || Object.keys(catalog);
  const http = client();

  const products = {};
  const errors = [];

  for (const id of ids) {
    try {
      products[id] = await syncOneProduct(http, id);
    } catch (err) {
      errors.push({ id, message: err.message });
      // أبقِ السجل خاملاً بدل حذفه أو إسقاط كل المزامنة (لا تجزم بتوفر عند فشل التحقق).
      products[id] = {
        eligible: false,
        error: err.message,
      };
    }
  }

  const liveJson = {
    generatedAt: new Date().toISOString(),
    products,
  };

  fs.mkdirSync(path.dirname(LIVE_JSON_PATH), { recursive: true });
  fs.writeFileSync(LIVE_JSON_PATH, JSON.stringify(liveJson, null, 2), 'utf8');

  if (errors.length) {
    console.error(`تحذير: فشلت مزامنة ${errors.length} منتج:`, errors);
  }
  console.log(`تمت المزامنة: ${Object.keys(products).length} منتج -> ${LIVE_JSON_PATH}`);
  return liveJson;
}

module.exports = {
  runSync,
  syncOneProduct,
  shapeProductRecord,
  buildVariantRecords,
  buildAvailableSizes,
};

if (require.main === module) {
  runSync().catch((err) => {
    console.error('فشلت المزامنة:', err);
    process.exit(1);
  });
}
