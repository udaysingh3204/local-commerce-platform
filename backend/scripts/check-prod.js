const https = require('https');

function get(url, label) {
  return new Promise(resolve => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ label, status: res.statusCode, body: d.substring(0, 150) }));
    }).on('error', e => resolve({ label, status: 0, body: e.message }));
  });
}

async function main() {
  const base = 'https://local-commerce-platform-production.up.railway.app';
  const results = await Promise.all([
    get(base + '/health', 'Railway /health'),
    get(base + '/api/payment/config', 'Railway /payment/config'),
    get(base + '/api/stores', 'Railway /stores'),
    get('https://local-commerce-platform.vercel.app', 'Vercel Customer'),
    get('https://admin-dashboard-ruddy-eight-35.vercel.app', 'Vercel Admin'),
    get('https://delivery-dashboard-three-murex.vercel.app', 'Vercel Delivery'),
    get('https://supplier-dashboard-tau.vercel.app', 'Vercel Supplier'),
    get('https://vendor-dashboard-rho.vercel.app', 'Vercel Vendor'),
  ]);

  results.forEach(r => {
    let extra = '';
    if (r.label.includes('health')) {
      try { const h = JSON.parse(r.body); extra = `db:${h.db} redis:${h.redis}`; } catch {}
    }
    if (r.label.includes('payment')) {
      try { const p = JSON.parse(r.body); extra = `key:${p.key ? 'SET' : 'MISSING'} isMock:${p.isMock}`; } catch {}
    }
    if (r.label.includes('stores')) {
      try { const arr = JSON.parse(r.body); extra = `count:${arr.length}`; } catch {}
    }
    const icon = r.status === 200 ? '✓' : '✗';
    console.log(`${icon} ${r.label.padEnd(28)} ${r.status} ${extra}`);
  });
}

main();
