#!/usr/bin/env python3
"""Genera variantes WebP optimizadas junto a las imágenes originales (que no se tocan).

Uso:  python3 tools/optimize_images.py
Requiere Pillow con soporte WebP. Es idempotente: omite lo que ya está generado y es más reciente.
"""
import os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (origen, destino, ancho máximo, calidad)
JOBS = [
    ("images/header_b.jpg", "images/header_b.webp", 1920, 74),          # héroe (LCP)
    ("images/header_b.jpg", "images/header_b-mobile.webp", 960, 72),
    ("images/citas.jpg", "images/citas.webp", 1920, 72),                # fondo de citas
]
for name in ("Mathematica", "ciencia", "excel", "html5", "maths", "optics", "python", "redes"):
    JOBS.append((f"images/portfolio/originales/{name}.jpg", f"images/portfolio/originales/{name}.webp", 1280, 80))
for name in ("comptiamin.jpg", "mtamin.jpg", "concursomin.jpg", "escner_20200122_3.png", "escner_20200122_4.png",
             "escner_20200122_5.png", "escner_20200122_6.png", "escner_20200122_7.png", "escner_20200122_10.png"):
    stem = os.path.splitext(name)[0]
    JOBS.append((f"data0/images/{name}", f"data0/images/{stem}.webp", 1024, 82))   # slider de certificados


def convert(src, dst, max_w, quality):
    s, d = os.path.join(ROOT, src), os.path.join(ROOT, dst)
    if not os.path.exists(s):
        print("  falta", src); return 0, 0
    if os.path.exists(d) and os.path.getmtime(d) >= os.path.getmtime(s):
        return os.path.getsize(s), os.path.getsize(d)
    im = ImageOps.exif_transpose(Image.open(s)).convert("RGB")
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    im.save(d, "WEBP", quality=quality, method=6)
    return os.path.getsize(s), os.path.getsize(d)


if __name__ == "__main__":
    tot_a = tot_b = 0
    for job in JOBS:
        a, b = convert(*job)
        tot_a += a; tot_b += b
        print(f"{job[1]:55s} {a/1024:8.0f} KB -> {b/1024:6.0f} KB")
    print(f"TOTAL {tot_a/1048576:.1f} MB -> {tot_b/1048576:.1f} MB")
