# eisaacjc.github.io/
## Repositorio de mi Portafolio de evidencias, curriculum online

https://eisaacjc.github.io/

## Rendimiento y animaciones
- `python3 tools/optimize_images.py` genera variantes WebP (héroe, citas, modales del portafolio y slider de certificados) junto a los originales, que no se modifican. Carga inicial ≈ 1.5 MB (antes ≈ 15 MB).
- `js/perf.js` detecta Ahorro de datos / 2G / ≤ 2 GB de RAM / ≤ 2 núcleos y marca `<html class="lite">` (menos partículas, sin desenfoques).
- `js/physics.js`: campo gravitatorio en el héroe, interferencia de doble rendija en «Filosofía» y resortes amortiguados en botones/foto. Solo se anima lo visible, respeta `prefers-reduced-motion` e incluye un botón para pausar.
