/* Revelado suave de tarjetas al entrar en pantalla.
   Sin IntersectionObserver o con "reduced motion" todo queda visible. */
(function () {
   var els = document.querySelectorAll('.entry, .skill-group, .pub-list li');
   var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if (!('IntersectionObserver' in window) || reduce || !els.length) return;
   document.documentElement.className += ' js-reveal';
   var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
         if (e.isIntersecting) { e.target.className += ' is-visible'; io.unobserve(e.target); }
      });
   }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
   Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();
