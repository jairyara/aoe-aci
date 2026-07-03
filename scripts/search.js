// Depurar una búsqueda ambigua en aoe2insights.
// Uso:  node search.js "ACI Dross"
// Imprime los primeros resultados con nombre, país, alias y URL de perfil.
const { chromium } = require('playwright');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

(async () => {
  const q = process.argv[2] || 'ACI';
  const b = await chromium.launch();
  const p = await (await b.newContext({ userAgent: UA })).newPage();
  await p.goto('https://www.aoe2insights.com/search/?q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.waitForTimeout(700);
  const count = await p.evaluate(() => (document.body.innerText.match(/([\d,]+)\s+results?/) || document.body.innerText.match(/No players found/) || ['?'])[0]);
  const cards = await p.evaluate(() => [...document.querySelectorAll('.user-tile.card')].map((t) => {
    const r = {};
    t.querySelectorAll('.rating-pill').forEach((pill) => {
      const m = pill.querySelector('small')?.innerText, v = pill.querySelector('strong')?.innerText;
      if (m) r[m.trim()] = v?.trim();
    });
    return {
      name: (t.querySelector('.user-tile-name') || {}).innerText,
      country: ((t.querySelector('.user-tile-country') || {}).innerText || '').trim(),
      aka: (t.innerText.match(/aka\s+"([^"]+)"/) || [])[1] || null,
      href: t.querySelector('a.stretched-link')?.getAttribute('href') || null,
      ratings: r,
    };
  }).slice(0, 10));
  console.log(`"${q}"  [${count}]`);
  cards.forEach((c, i) => console.log(`${i + 1}. ${c.name} [${c.country}]${c.aka ? ' aka "' + c.aka + '"' : ''} ${c.href}  ${JSON.stringify(c.ratings)}`));
  await b.close();
})();
