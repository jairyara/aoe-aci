# Proceso: completar ELO de inscritos — Torneo ACI

Guía reproducible para llenar las columnas de rating y siembra en
`Inscripcion Torneo ACI (Respuestas).xlsx` a partir de los nicks del formulario.
Pensado para **próximas iteraciones** (llegarán más inscritos).

> Fuente de datos: **https://www.aoe2insights.com** · Última corrida: **2026-07-02** · Método: **Playwright (navegador real)**

---

## 1. Contexto y estructura del Excel

El Excel viene del Google Form de inscripción. Columnas relevantes:

| Col | Encabezado | Origen |
|-----|-----------|--------|
| A | Marca temporal | formulario |
| B | Dirección de correo | formulario (útil para desempatar cuentas) |
| **C** | **Nickname** | formulario → **clave de búsqueda** |
| **D** | **Elo actual 1v1** | aoe2insights (RM 1v1, valor actual) |
| **E** | **Elo Actual RM team** | aoe2insights (RM Team, valor actual) |
| **F** | **Elo max historico 1v1** | aoe2insights (RM 1v1, All Time High) |
| **G** | **Elo Max historico RM Team** | aoe2insights (RM Team, All Time High) |
| **H** | **Promedio** | fórmula ponderada (ver §5) |
| I | Objetivo | formulario |
| J–M | Disponibilidad horaria | formulario |

Hay una hoja **`Notas`** con: pesos editables (B3:B6), mapeo nick→cuenta, y pendientes.

---

## 2. Regla de acceso (importante)

`aoe2insights.com` **responde 403 a peticiones directas** (curl / fetch / WebFetch).
Hay que usar un **navegador real** → Playwright con Chromium y un `User-Agent` normal.

- Búsqueda: `https://www.aoe2insights.com/search/?q=<nick>` (form GET, param `q`).
- Perfil: `https://www.aoe2insights.com/user/<id>/`.
- Usar `waitUntil: 'domcontentloaded'` (NO `networkidle`, se cuelga) + `waitForTimeout(~800ms)`.

---

## 3. Reglas de emparejamiento (nick del formulario → cuenta real)

El torneo es **ACI**, así que la mayoría de jugadores llevan el **tag de clan `ACI`** y son
de **Colombia/México**. Orden de prioridad para elegir la cuenta correcta entre resultados:

1. **Tag ACI + nombre coincide** → casi siempre es la cuenta correcta (confianza alta).
2. **Nombre exacto + país esperado** (Colombia/México/LatAm) → alta.
3. **`aka` (alias) coincide con el nick o el email** → sólido. Ej: la cuenta de "Fok Israhell"
   es `ACI F0K 1sr4h3ll`, confirmada porque su alias incluía `mauro.gongorar7` = su email.
4. Si el nick trae paréntesis/adornos (`Dross (Malandrin)`), **buscar solo el núcleo** (`Dross`,
   o mejor `ACI Dross`). Los paréntesis suelen dar "No players found".
5. Si hay ambigüedad real (varias cuentas plausibles, sin tag ACI, país neutro) →
   **NO adivinar**: dejar en blanco y **preguntar al usuario** (él verifica manualmente).

### Casos límite ya resueltos (histórico)
- **ID de perfil ≠ ID de URL.** El número que muestra el perfil (ej. `# 11325276`) NO es el de
  la URL. Hay que obtener el `href` real (`/user/11738813/`) desde el resultado de búsqueda.
- **Nick genérico** (ej. `SHAN` → 5.000+ resultados): buscar con el tag (`ACI Shan`) para filtrar.
- **Sin rating 1v1**: algunos solo tienen RM Team (ej. ACI Artanisx). Ver §5 (renormalización).
- **Envíos duplicados**: mismo email dos veces (ej. Tyuered) → llenar igual pero **marcar duplicado**.
- **1v1 "provisional"**: si `actual == máx` (nunca perdió punto) son pocas partidas/colocación →
  menos fiable que su RM Team (miles de juegos). Considerar subir peso de Team.

---

## 4. Cómo leer los datos del perfil

En la página de perfil, cada modo es una tarjeta `.card-ranking`:
- `h3.card-title` → modo: **`1v1 RM`**, **`Team RM`**, `1v1 EW`, `Team EW`.
- `.rating-big` → **rating actual**.
- `.rating-detail[title="All Time High"]` → **rating máximo (peak)**.
- Si el modo no tiene datos, `.rating-big` muestra `-`.

Mapeo a columnas: `1v1 RM`→ D (actual) / F (máx) · `Team RM`→ E (actual) / G (máx).

---

## 5. Fórmula de siembra (columna H)

**Promedio ponderado**, pesos editables en hoja `Notas!B3:B6`:

```
H = D·0.35  (1v1 actual)
  + E·0.30  (Team actual)
  + F·0.20  (1v1 máximo)
  + G·0.15  (Team máximo)
```

- Prioriza **forma actual** sobre techo histórico, y da leve ventaja al **1v1 individual**;
  el máx estabiliza. Los pesos deben sumar **1.00** (validado en `Notas!B7`).
- Fórmula Excel (fila r): `=ROUND(D{r}*Notas!$B$3+E{r}*Notas!$B$4+F{r}*Notas!$B$5+G{r}*Notas!$B$6,0)`
- **Jugadores sin 1v1** (solo Team): renormalizar con las categorías de equipo:
  `=ROUND((E{r}*Notas!$B$4+G{r}*Notas!$B$6)/(Notas!$B$4+Notas!$B$6),0)` — marcar ⚠️ (no 100% comparable).
- Para cambiar el criterio (torneo 1v1 puro, o comunidad team-focused) → solo editar B3:B6.

Siembra = ordenar por H descendente.

---

## 6. Procedimiento para AGREGAR nuevos inscritos

1. Leer las filas nuevas del Excel (columna C = nickname, B = email por si hay que desempatar).
2. Por cada nick, correr el scraper (§7): buscar → elegir cuenta según reglas §3 → abrir perfil → leer D/E/F/G.
3. Escribir D:G (enteros, sin comas). Poner la fórmula de H (§5) — para sin-1v1 usar la variante renormalizada.
4. Registrar en hoja `Notas`: fila, nick, cuenta emparejada, país, URL de perfil, confianza.
5. **Los ambiguos NO se adivinan**: dejar D:G en blanco y preguntar al usuario. Él confirma manualmente.
6. Revisar duplicados por email antes de sembrar.
7. (Opcional pero recomendado antes del torneo) **re-scrapear a TODOS** para refrescar ratings, que cambian con el tiempo.

---

## 7. Scripts reutilizables

Requisitos (una vez):
```bash
npm install playwright
npx playwright install chromium
# para el Excel:  python3 -m venv venv && venv/bin/pip install openpyxl
```

### 7.1 Scraper de perfiles (`scrape.js`)
Define los objetivos (nick → query + nombre esperado + país, o URL directa si ya se conoce)
y vuelca `profiles.json` con actual+máx de 1v1 y Team.

```js
const { chromium } = require('playwright');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Edita esta lista con los nuevos inscritos.
// name = substring esperado del nombre (minúsculas); country ayuda a desempatar; url = atajo si ya la sabes.
const targets = {
  // 16: { q:'ACI NuevoNick', name:'aci nuevonick', country:'colombia' },
  // 17: { url:'https://www.aoe2insights.com/user/123456/' },
};

async function findUrl(page, t){
  await page.goto('https://www.aoe2insights.com/search/?q='+encodeURIComponent(t.q),{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(700);
  return await page.evaluate((t)=>{
    const tiles=[...document.querySelectorAll('.user-tile.card')];
    const score=(tile)=>{
      const nm=((tile.querySelector('.user-tile-name')||{}).innerText||'').trim().toLowerCase();
      const co=((tile.querySelector('.user-tile-country')||{}).innerText||'').trim().toLowerCase();
      let s=0;
      if(t.name && nm===t.name) s+=10; else if(t.name && nm.includes(t.name)) s+=5;
      if(t.country && co.includes(t.country)) s+=3;
      return s;
    };
    let best=null,bs=-1; tiles.forEach(tl=>{const s=score(tl); if(s>bs){bs=s;best=tl;}});
    best=best||tiles[0];
    const a=best&&best.querySelector('a.stretched-link');
    return a?a.href:null;
  }, t);
}

async function scrape(page,url){
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForTimeout(900);
  return await page.evaluate(()=>{
    const o={};
    document.querySelectorAll('.card-ranking').forEach(card=>{
      const mode=((card.querySelector('.card-title')||{}).innerText||'').trim();
      const cur=((card.querySelector('.rating-big')||{}).innerText||'').trim();
      let ath=null;
      card.querySelectorAll('.rating-detail').forEach(d=>{ if((d.getAttribute('title')||'')==='All Time High') ath=d.innerText.trim(); });
      o[mode]={cur,ath};
    });
    return {name:document.title.split("'")[0], ratings:o};
  });
}

(async()=>{
  const b=await chromium.launch();
  const p=await (await b.newContext({userAgent:UA})).newPage();
  const out={};
  for(const [row,t] of Object.entries(targets)){
    try{
      const url=t.url||await findUrl(p,t);
      const prof=await scrape(p,url);
      out[row]={url,...prof};
      const r=prof.ratings;
      console.log(`Fila ${row}: ${prof.name} ${url}`);
      console.log('  1v1 RM:',JSON.stringify(r['1v1 RM']||'-'),' Team RM:',JSON.stringify(r['Team RM']||'-'));
    }catch(e){ console.log('Fila',row,'ERROR',e.message); out[row]={error:e.message}; }
  }
  require('fs').writeFileSync('profiles.json',JSON.stringify(out,null,2));
  await b.close();
})();
```
Correr: `node scrape.js`
Nota: `'1v1 RM'` y `'Team RM'` → `.cur` es actual (D/E) y `.ath` es máximo (F/G); quitar la coma de miles antes de escribir (`Number(v.replace(/,/g,''))`).

### 7.2 Explorar/depurar una búsqueda (`search.js`)
Útil cuando un nick no aparece o hay ambigüedad — imprime los primeros resultados.

```js
const { chromium } = require('playwright');
const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
(async()=>{
  const b=await chromium.launch(); const p=await (await b.newContext({userAgent:UA})).newPage();
  const q=process.argv[2]||'ACI';
  await p.goto('https://www.aoe2insights.com/search/?q='+encodeURIComponent(q),{waitUntil:'domcontentloaded',timeout:45000});
  await p.waitForTimeout(700);
  const cards=await p.evaluate(()=>[...document.querySelectorAll('.user-tile.card')].map(t=>({
    name:(t.querySelector('.user-tile-name')||{}).innerText,
    country:((t.querySelector('.user-tile-country')||{}).innerText||'').trim(),
    aka:(t.innerText.match(/aka\s+"([^"]+)"/)||[])[1]||null,
    href:t.querySelector('a.stretched-link')?.getAttribute('href')||null,
  })).slice(0,10));
  cards.forEach((c,i)=>console.log(`${i+1}. ${c.name} [${c.country}]${c.aka?' aka "'+c.aka+'"':''} ${c.href}`));
  await b.close();
})();
```
Correr: `node search.js "ACI Dross"`

### 7.3 Escribir en el Excel (`write.py`)
Usa openpyxl (preserva formato). Ejemplo mínimo para agregar/actualizar filas:

```python
import openpyxl
f='Inscripcion Torneo ACI (Respuestas).xlsx'
wb=openpyxl.load_workbook(f); ws=wb.active
# fila -> (1v1_act D, team_act E, 1v1_max F, team_max G)   None = sin dato
data = {
  # 16:(1300,1350,1420,1500),
}
for r,(d,e,ff,g) in data.items():
    ws.cell(r,4).value=d; ws.cell(r,5).value=e; ws.cell(r,6).value=ff; ws.cell(r,7).value=g
    if d is None:  # sin 1v1: promedio solo Team, renormalizado
        ws.cell(r,8).value=f'=ROUND((E{r}*Notas!$B$4+G{r}*Notas!$B$6)/(Notas!$B$4+Notas!$B$6),0)'
    else:
        ws.cell(r,8).value=f'=ROUND(D{r}*Notas!$B$3+E{r}*Notas!$B$4+F{r}*Notas!$B$5+G{r}*Notas!$B$6,0)'
wb.save(f)
```
Nota: openpyxl **no evalúa** fórmulas; se calculan al abrir en Excel/Google Sheets.
Para verificar el resultado antes, reproducir la fórmula en Python (pesos 0.35/0.30/0.20/0.15).

---

## 8. Checklist rápido por iteración
- [ ] Leer filas nuevas (C = nick, B = email).
- [ ] Actualizar `targets` en `scrape.js` y correr → `profiles.json`.
- [ ] Emparejar según reglas §3 (tag ACI > nombre+país > alias/email). Ambiguos → preguntar.
- [ ] Escribir D:G + fórmula H (`write.py`). Sin-1v1 → variante renormalizada + ⚠️.
- [ ] Registrar cuenta/URL/confianza en hoja `Notas`.
- [ ] Detectar duplicados por email.
- [ ] Re-ordenar siembras por H.
