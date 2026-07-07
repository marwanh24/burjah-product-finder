'use strict';
const cron = require('node-cron');
const { runSync } = require('./sync');

/** يزامن فور الإقلاع، ثم كل 6 ساعات (build_spec.md §2.1). */
function scheduleSync() {
  runSync().catch((err) => console.error('فشلت المزامنة عند الإقلاع:', err));

  cron.schedule('0 */6 * * *', () => {
    runSync().catch((err) => console.error('فشلت المزامنة المجدولة:', err));
  });
}

module.exports = { scheduleSync };
