# Scripts — ELO Torneo ACI

Automatizan llenar los ratings del Excel desde aoe2insights.
Ver el detalle completo del proceso en `../PROCESO_ELO_TORNEO.md`.

## Instalación (una sola vez)

```bash
cd /Users/jyarar/projects/aoe/scripts
npm init -y
npm install playwright
npx playwright install chromium

# entorno de Python para el Excel
python3 -m venv venv
venv/bin/pip install openpyxl
```

## Flujo para agregar nuevos inscritos

1. **Editar objetivos** en `scrape.js` → constante `targets` (fila → nick/URL). Ejemplo:
   ```js
   const targets = {
     16: { q:'ACI NuevoNick', name:'aci nuevonick', country:'colombia' },
     17: { url:'https://www.aoe2insights.com/user/123456/' },
   };
   ```

2. **Scrapear ratings**:
   ```bash
   node scrape.js          # genera profiles.json
   ```

3. **(Ambiguos)** si un nick no aparece o hay varias cuentas plausibles:
   ```bash
   node search.js "ACI Dross"   # inspecciona resultados y elige el href correcto
   ```
   Regla: tag **ACI** + nombre > nombre+país (Colombia/México) > alias/email.
   Si sigue ambiguo → **dejar en blanco y preguntar al usuario** (no adivinar).

4. **Escribir en el Excel**:
   ```bash
   venv/bin/python3 write_excel.py --check   # previsualiza (no guarda)
   venv/bin/python3 write_excel.py           # escribe D:G + fórmula H
   ```

5. Registrar la cuenta/URL/confianza en la hoja **Notas** del Excel y revisar duplicados por email.

## Archivos

| Archivo | Qué hace |
|---|---|
| `scrape.js` | Busca cada nick, elige la cuenta y lee actual+máx de 1v1/Team → `profiles.json` |
| `search.js` | Depura una búsqueda ambigua (imprime resultados con país/alias/URL) |
| `write_excel.py` | Escribe D:G y la fórmula ponderada de H; imprime el promedio calculado para verificar |
| `remove_bg.py` | Quita el fondo de tablero de las capturas de stickers → PNG transparente para los inputs de imagen del showmatch (`sorteo.html`) |

## Quitar fondo a imágenes de contendientes (showmatch)

Las capturas de stickers vienen con un fondo de tablero de ajedrez (dos grises)
horneado en píxeles. `remove_bg.py` lo vuelve transparente y recorta al contenido.

```bash
venv/bin/pip install Pillow          # una vez
venv/bin/python3 remove_bg.py '../assets/Screenshot'*.png   # -> *-nobg.png
venv/bin/python3 remove_bg.py entrada.png -o salida.png     # salida explícita
```

Umbrales ajustables si el fondo no es exactamente igual: `--max-lum`,
`--neutral-tol`, `--dist-tol`; `--no-crop` para no recortar. El PNG resultante se
sube en los inputs **Imagen participante 1/2** de la pieza *Gran Showmatch*.

## Recordatorios

- aoe2insights da **403** a fetch directo → por eso se usa Playwright (navegador real).
- `profiles.json` es intermedio y regenerable; no hace falta versionarlo.
- Los ratings cambian: re-scrapear a todos antes del torneo para refrescar.
- Pesos del promedio: editables en la hoja `Notas!B3:B6` (deben sumar 1.00).
