'use strict';
const axios = require('axios');

const BASE_URL = process.env.SALLA_API_BASE_URL || 'https://api.salla.dev/admin/v2';

function client() {
  const token = process.env.SALLA_API_TOKEN;
  if (!token) {
    throw new Error('SALLA_API_TOKEN غير موجود في متغيرات البيئة.');
  }
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20000,
  });
}

async function getProduct(http, productId) {
  const { data } = await http.get(`/products/${productId}`);
  return data.data;
}

/** يجلب كل صفحات /products/{id}/variants ويدمجها (لا يكتفِ بالصفحة الأولى — build_spec.md §1.2). */
async function getAllVariants(http, productId) {
  let page = 1;
  let all = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await http.get(`/products/${productId}/variants`, { params: { page } });
    all = all.concat(data.data || []);
    const totalPages = data.pagination && data.pagination.totalPages;
    if (!totalPages || page >= totalPages) break;
    page += 1;
  }
  return all;
}

module.exports = { client, getProduct, getAllVariants, BASE_URL };
