/* perf.js — se carga en <head>, antes del primer pintado.
   Detecta dispositivos/conexiones limitados y marca <html class="lite"> para que
   CSS y physics.js reduzcan efectos costosos (blur, partículas, canvas). */
(function () {
   var root = document.documentElement;
   var lite = false;
   try {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
      lite = !!(
         c.saveData ||                                              // "Ahorro de datos" activado
         /(^|-)2g$/.test(c.effectiveType || '') ||                  // 2g / slow-2g
         (navigator.deviceMemory && navigator.deviceMemory <= 2) || // <= 2 GB de RAM
         (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
      );
   } catch (e) { /* sin Network Information API: modo normal */ }
   if (lite) root.className += ' lite';
})();
