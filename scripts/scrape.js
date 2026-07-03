// Scraper de ratings de aoe2insights para el Torneo ACI.
// Edita `targets` con los nuevos inscritos y corre:  node scrape.js
// Salida: profiles.json (actual + máximo de 1v1 RM y Team RM por jugador).
// Requisitos: npm install playwright && npx playwright install chromium
const { chromium } = require('playwright');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// fila -> objetivo. Opciones:
//   { q:'texto a buscar', name:'nombre esperado en minúsculas', country:'colombia' }
//   { url:'https://www.aoe2insights.com/user/<id>/' }   // atajo si ya conoces el perfil
const targets = {
  // 16: { q:'ACI NuevoNick', name:'aci nuevonick', country:'colombia' },
  // 17: { url:'https://www.aoe2insights.com/user/123456/' },
};

const num = (s) => (s && s !== '-') ? Number(String(s).replace(/,/g, '')) : null;

async function findUrl(page, t) {
  await page.goto('https://www.aoe2insights.com/search/?q=' + encodeURIComponent(t.q), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(700);
  return await page.evaluate((t) => {
    const tiles = [...document.querySelectorAll('.user-tile.card')];
    const score = (tile) => {
      const nm = ((tile.querySelector('.user-tile-name') || {}).innerText || '').trim().toLowerCase();
      const co = ((tile.querySelector('.user-tile-country') || {}).innerText || '').trim().toLowerCase();
      let s = 0;
      if (t.name && nm === t.name) s += 10; else if (t.name && nm.includes(t.name)) s += 5;
      if (t.country && co.includes(t.country)) s += 3;
      return s;
    };
    let best = null, bs = -1;
    tiles.forEach((tl) => { const s = score(tl); if (s > bs) { bs = s; best = tl; } });
    best = best || tiles[0];
    const a = best && best.querySelector('a.stretched-link');
    return a ? a.href : null;
  }, t);
}

async function scrape(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(900);
  return await page.evaluate(() => {
    const o = {};
    document.querySelectorAll('.card-ranking').forEach((card) => {
      const mode = ((card.querySelector('.card-title') || {}).innerText || '').trim();
      const cur = ((card.querySelector('.rating-big') || {}).innerText || '').trim();
      let ath = null;
      card.querySelectorAll('.rating-detail').forEach((d) => {
        if ((d.getAttribute('title') || '') === 'All Time High') ath = d.innerText.trim();
      });
      o[mode] = { cur, ath };
    });
    return { name: document.title.split("'")[0], ratings: o };
  });
}

(async () => {
  if (Object.keys(targets).length === 0) {
    console.log('No hay objetivos. Edita la constante `targets` en scripts/scrape.js.');
    return;
  }
  const b = await chromium.launch();
  const p = await (await b.newContext({ userAgent: UA })).newPage();
  const out = {};
  for (const [row, t] of Object.entries(targets)) {
    try {
      const url = t.url || await findUrl(p, t);
      const prof = await scrape(p, url);
      const r = prof.ratings;
      const rm1 = r['1v1 RM'] || {}, rmt = r['Team RM'] || {};
      out[row] = {
        url, name: prof.name,
        elo_1v1_act: num(rm1.cur), elo_team_act: num(rmt.cur),
        elo_1v1_max: num(rm1.ath), elo_team_max: num(rmt.ath),
      };
      console.log(`Fila ${row}: ${prof.name}  ${url}`);
      console.log(`  1v1 act=${out[row].elo_1v1_act} max=${out[row].elo_1v1_max} | Team act=${out[row].elo_team_act} max=${out[row].elo_team_max}`);
    } catch (e) {
      console.log('Fila', row, 'ERROR', e.message);
      out[row] = { error: e.message };
    }
  }
  require('fs').writeFileSync('profiles.json', JSON.stringify(out, null, 2));
  console.log('\nEscrito profiles.json');
  await b.close();
})();
