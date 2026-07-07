'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { scheduleSync } = require('./cron');

const LIVE_JSON_PATH = path.join(__dirname, '..', 'data', 'live.json');
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://burjah.com';

const app = express();

// CORS: فقط نطاق burjah.com مسموح له بقراءة live.json (build_spec.md §2.3).
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET'],
  })
);

app.get('/live.json', (req, res) => {
  if (!fs.existsSync(LIVE_JSON_PATH)) {
    return res.status(503).json({ error: 'لا تتوفر بيانات مزامنة بعد. حاول لاحقاً.' });
  }
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(LIVE_JSON_PATH);
});

app.get('/health', (req, res) => {
  const exists = fs.existsSync(LIVE_JSON_PATH);
  let generatedAt = null;
  if (exists) {
    try {
      generatedAt = JSON.parse(fs.readFileSync(LIVE_JSON_PATH, 'utf8')).generatedAt;
    } catch (e) {
      /* ignore */
    }
  }
  res.json({ ok: true, liveJsonExists: exists, generatedAt });
});

app.listen(PORT, () => {
  console.log(`باك-إند مزامنة بُرجة يعمل على المنفذ ${PORT}`);
  scheduleSync();
});
