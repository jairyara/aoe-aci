# Torneo ACI — Changelog & guía para retomar

> Última sesión: **2026-07-03**. Estado: **todo funcionando**. Próximas modificaciones: **2026-07-04** (día del evento: 8pm Showmatch, 9pm Sorteo, hora COL).
> Hosted by **Before Match**. Tema visual: púrpura/violeta + acero (colores del logo ACI).

---

## 📂 Estructura del proyecto

```
aoe/
├── Inscripcion Torneo ACI (Respuestas).xlsx   # inscritos + ELO + promedio + hoja "Notas"
├── PROCESO_ELO_TORNEO.md                       # cómo llenar ELO desde aoe2insights
├── CHANGELOG.md                                # este archivo
├── sorteo.html                                 # APP principal (sorteo + anuncios) — todo en un archivo
├── scripts/                                    # automatización del scraping de ELO
│   ├── README.md, scrape.js, search.js, write_excel.py
└── assets/
    ├── logo.jpeg           # emblema ACI (ariete + calavera de carnero, violeta)
    ├── logo-data.js        # ^ mismo logo en base64 (const LOGO_DATA) para el canvas
    ├── before match.jpeg   # logo Before Match original (blanco sobre gris)
    ├── before-match.png    # ^ procesado: fondo transparente + 4x calidad
    ├── bm-logo-data.js     # ^ before-match.png en base64 (const BM_LOGO_DATA)
    ├── ariete.mp4          # video del ariete (se reproduce al revelar en el sorteo)
    └── Zero_Hour_Payoff.mp3# música de suspenso del sorteo
```

---

## 🎯 `sorteo.html` — la app (vanilla JS, sin librerías, abre con doble clic)

Dos pestañas en el header: **Sorteo** y **Anuncios**.

### Pestaña Sorteo (estilo bombos del Mundial)
- Pega nicks (`Nick`, `Nick, ELO` o `Nick⇥ELO` desde Excel) → **Preparar bombos**.
- Bombo 1 = mejores por ELO = cabezas de serie; el resto en bombos 2,3,4… Uno de cada bombo por grupo.
- **Sortear siguiente**: ceremonia con modal → música (no reinicia, loop, 50% + slider), efecto tragamonedas, video `ariete.mp4`, confetti, revelación y asignación al grupo. **El modal dura 3400 ms** antes de auto-asignar (o clic en "Asignar"/fuera).
- **Sortear todo**: reparte el resto al instante.
- **Descargar imagen**: PNG del resultado con logo ACI + "Made with ♥ by [logo Before Match]". Se habilita **solo al terminar**.
- Semilla opcional → sorteo reproducible.

### Pestaña Anuncios (piezas gráficas editables, vista previa en vivo, descarga PNG)
1. **Programación del día** (1080×1350) — título, fecha, eventos `HORA | Evento`.
2. **Gran Showmatch** (1080×1350) — título, formato+hora (pill), fecha, 2 participantes con **ELO**, **pozo de premio** (badge dorado), bloque VS.
3. **Banner transmisión** (1920×1080) — estado (pill con punto rojo si "vivo/live"), título, subtítulo, detalle, canal/redes. **Presets**: En vivo · Pronto comenzamos · Volvemos enseguida.

### Mapa de funciones clave (para navegar el JS)
- Sorteo: `prepare()`, `precomputeDraw()`, `revealNext()`, `land()` (timeout **3400**), `commit()`, `buildResultCanvas()` (PNG del resultado).
- Anuncios: `readPoster()`, `renderPoster()` (fija dimensiones del canvas por tipo), `drawSchedule()`, `drawShowmatch()`, `drawStream()`, `switchView()`.
- Audio: `startAudio()` (no reinicia), `resetAudio()`. Video ariete en `land()`/`closeModal()`.

---

## ⚠️ Notas técnicas / gotchas (importantes al modificar)

1. **aoe2insights.com da 403 a fetch/curl directo** → hay que usar **Playwright con navegador real** (UA normal, `waitUntil:'domcontentloaded'`, no `networkidle`). Ver `PROCESO_ELO_TORNEO.md` y `scripts/`.
2. **Canvas + imágenes `file://` = tainting** → `toBlob`/`toDataURL` fallan. Por eso los logos van **incrustados como data-URI** (`logo-data.js`, `bm-logo-data.js`) y así el canvas exporta sin problema. Si agregas otra imagen al canvas, incrústala igual (base64), no la cargues por ruta.
3. **Emoji en canvas** es inconsistente entre navegadores → en el PNG uso el carácter `♥`, no el emoji. En la web (HTML) sí uso ❤️.
4. Regenerar un data-URI: `{ printf 'const X="data:image/png;base64,'; base64 -i archivo.png | tr -d '\n'; printf '";\n'; } > assets/x.js`
5. Selectores de aoe2insights usados: búsqueda `.user-tile.card` (`.user-tile-name`, `.user-tile-country`, `a.stretched-link`); perfil `.card-ranking` (`.card-title`, `.rating-big`, `.rating-detail[title="All Time High"]`).

---

## ✅ Estado del Excel (siembras actuales, promedio ponderado)
Fórmula H = D·0.35 + E·0.30 + F·0.20 + G·0.15 (pesos editables en hoja `Notas!B3:B6`).
Orden actual (ver hoja): El Rey Nocturno 1562 · Jyarar 1409 · Calvohp17 1404 · ACI Granmini 1391 · ACI ARTANISX 1319⚠️(solo Team) · Dross 1292 · SHAN 1286 · GreenMario 1232 · Tyuered 1221 · ACI Kira_game 1194 · ACI Tuffix 1136 · Ummagumma 1126 · Fok Israhell 1086.
Pendientes en `Notas`: filas 7/8 (Tyuered duplicado) → borrar una; faltan ≥3 inscritos por llegar.

---

## 🔧 Cómo probar cambios (lo que usé esta sesión)
- La app se abre con `file://` (doble clic). Para verificar visualmente usé **Playwright headless** generando screenshots/PNGs de los canvas y leyendo la imagen.
- Patrón de test: `chromium.launch()` → `page.goto('file://…/sorteo.html')` → interactuar → `page.evaluate(()=>$("poster").toDataURL())` → guardar PNG y revisar. Escuchar `pageerror`/`console` para detectar errores JS.
- Los scripts de test fueron temporales (scratchpad). El scraping de ELO sí tiene scripts persistentes en `scripts/`.

---

## 📝 Pendiente / para mañana (2026-07-04)
- Modificaciones no especificadas aún ("mañana hacemos las modificaciones").
- Ideas ya propuestas y no pedidas: overlay *lower-third* para gameplay; ELO en minúscula; nombre de casteo/stream en showmatch; pozo de premio también en la pieza de programación; banner cuadrado 1080×1080.
- Cuando lleguen los ≥3 inscritos nuevos: seguir `PROCESO_ELO_TORNEO.md` + `scripts/` para llenar su ELO y re-sembrar.
