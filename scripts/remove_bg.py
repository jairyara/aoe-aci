#!/usr/bin/env python3
"""Quita el fondo de imágenes tipo "sticker" para el showmatch (sorteo.html).

Detecta el fondo de tablero de ajedrez (dos grises oscuros) que traen las
capturas de stickers y lo vuelve transparente mediante un flood-fill desde los
bordes, que se detiene en el borde blanco del sujeto. Luego recorta al
contenido. El resultado es un PNG con canal alfa listo para subir en los inputs
"Imagen participante 1/2".

Uso:
    venv/bin/python3 remove_bg.py entrada.png                # -> entrada-nobg.png
    venv/bin/python3 remove_bg.py entrada.png -o salida.png
    venv/bin/python3 remove_bg.py a.png b.png c.png          # varias a la vez
    venv/bin/python3 remove_bg.py '../assets/Screenshot*.png'  # glob

Requiere Pillow:  venv/bin/pip install Pillow
"""
import argparse
import glob
import os
import sys
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit("Falta Pillow. Instala con:  venv/bin/pip install Pillow")

# Grises del tablero de ajedrez que macOS hornea al capturar transparencia.
CHECKER = [(39, 39, 41), (28, 28, 30)]


def make_is_bg(max_lum, neutral_tol, dist_tol):
    """Devuelve un predicado 'es fondo' con los umbrales dados."""
    def is_bg(p):
        r, g, b = p[0], p[1], p[2]
        if max(r, g, b) > max_lum:                    # demasiado claro -> sujeto/borde
            return False
        if max(abs(r - g), abs(g - b), abs(r - b)) > neutral_tol:  # con color -> no es gris
            return False
        return min(abs(r - c[0]) + abs(g - c[1]) + abs(b - c[2]) for c in CHECKER) <= dist_tol
    return is_bg


def remove_bg(path, out, max_lum, neutral_tol, dist_tol, crop):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    is_bg = make_is_bg(max_lum, neutral_tol, dist_tol)

    seen = bytearray(w * h)
    q = deque()

    def try_seed(x, y):
        i = y * w + x
        if not seen[i] and is_bg(px[x, y]):
            seen[i] = 1
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    removed = 0
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        removed += 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not seen[i] and is_bg(px[nx, ny]):
                    seen[i] = 1
                    q.append((nx, ny))

    if crop:
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)

    im.save(out)
    return removed, im.size


def default_out(path):
    base, _ = os.path.splitext(path)
    return base + "-nobg.png"


def main():
    ap = argparse.ArgumentParser(description="Quita el fondo de tablero de stickers -> PNG transparente.")
    ap.add_argument("inputs", nargs="+", help="Imagen(es) de entrada (acepta globs).")
    ap.add_argument("-o", "--output", help="Ruta de salida (solo si hay una sola entrada).")
    ap.add_argument("--max-lum", type=int, default=70, help="Luminancia máx para considerar fondo (def 70).")
    ap.add_argument("--neutral-tol", type=int, default=14, help="Tolerancia de neutralidad de gris (def 14).")
    ap.add_argument("--dist-tol", type=int, default=45, help="Distancia máx a un gris del tablero (def 45).")
    ap.add_argument("--no-crop", action="store_true", help="No recortar al contenido.")
    args = ap.parse_args()

    files = []
    for pat in args.inputs:
        hits = sorted(glob.glob(pat))
        files.extend(hits if hits else [pat])

    if args.output and len(files) != 1:
        sys.exit("-o/--output solo se puede usar con una única imagen de entrada.")

    for f in files:
        if not os.path.isfile(f):
            print(f"  ! no existe: {f}")
            continue
        out = args.output or default_out(f)
        removed, size = remove_bg(f, out, args.max_lum, args.neutral_tol, args.dist_tol, not args.no_crop)
        print(f"{os.path.basename(f)} -> {os.path.basename(out)}  (px removidos: {removed}, tamaño: {size[0]}x{size[1]})")


if __name__ == "__main__":
    main()
