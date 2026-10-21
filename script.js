/* ============================================================
   script.js – Skywaterszw
   ============================================================ */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     Generic slider builder
     ---------------------------------------------------------- */
  function buildSlider(sliderEl, dotsEl, prevBtn, nextBtn, opts) {
    if (!sliderEl) return;

    var n = sliderEl.children.length;
    if (n === 0) return;

    var cur = 0;
    var timer = null;
    var interval = (opts && opts.interval) || 5000;

    // Create dots
    for (var i = 0; i < n; i++) {
      (function (idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Photo ' + (idx + 1));
        b.addEventListener('click', function () {
          goTo(idx);
          restart();
        });
        dotsEl.appendChild(b);
      })(i);
    }

    function mark() {
      cur = Math.round(sliderEl.scrollLeft / sliderEl.clientWidth) || 0;
      var dots = dotsEl.children;
      for (var i = 0; i < dots.length; i++) {
        dots[i].setAttribute('aria-current', i === cur ? 'true' : 'false');
      }
    }

    function goTo(i) {
      cur = (i + n) % n;
      sliderEl.scrollTo({
        left: cur * sliderEl.clientWidth,
        behavior: 'smooth'
      });
    }

    function stop() {
      if (timer) clearInterval(timer);
    }

    function restart() {
      stop();
      if (!reducedMotion && interval > 0) {
        timer = setInterval(function () {
          goTo(cur + 1);
        }, interval);
      }
    }

    // Scroll listener with debounce
    var scrollTimer;
    sliderEl.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(mark, 60);
      mark();
    }, { passive: true });

    // Prev / Next buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goTo(cur - 1);
        restart();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goTo(cur + 1);
        restart();
      });
    }

    // Keyboard
    sliderEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        goTo(cur - 1);
        restart();
      }
      if (e.key === 'ArrowRight') {
        goTo(cur + 1);
        restart();
      }
    });

    // Pause on interaction
    ['pointerdown', 'touchstart', 'mouseenter', 'focusin'].forEach(function (ev) {
      (sliderEl.parentNode || sliderEl).addEventListener(ev, stop, { passive: true });
    });
    ['mouseleave', 'focusout'].forEach(function (ev) {
      (sliderEl.parentNode || sliderEl).addEventListener(ev, restart);
    });
    sliderEl.addEventListener('touchend', restart, { passive: true });

    // Resize
    window.addEventListener('resize', function () {
      sliderEl.scrollTo({ left: cur * sliderEl.clientWidth });
    });

    // Init
    mark();
    restart();
  }

  /* ----------------------------------------------------------
     Hero slider
     ---------------------------------------------------------- */
  buildSlider(
    document.getElementById('heroSlider'),
    document.getElementById('heroDots'),
    document.querySelector('.hero-slider-wrap .slider-btn.prev'),
    document.querySelector('.hero-slider-wrap .slider-btn.next'),
    { interval: 5000 }
  );

  /* ----------------------------------------------------------
     Division sliders
     ---------------------------------------------------------- */
  var divisionSliders = [
    { sliderId: 'divSlider0', dotsId: 'divDots0' },
    { sliderId: 'divSlider1', dotsId: 'divDots1' },
    { sliderId: 'divSlider2', dotsId: 'divDots2' }
  ];

  divisionSliders.forEach(function (cfg, idx) {
    var slider = document.getElementById(cfg.sliderId);
    var dots = document.getElementById(cfg.dotsId);
    if (!slider || !dots) return;

    var parent = slider.parentNode;
    var prevBtn = parent.querySelector('.division-slider-btn.prev');
    var nextBtn = parent.querySelector('.division-slider-btn.next');

    buildSlider(slider, dots, prevBtn, nextBtn, {
      interval: 6000 + idx * 1500
    });
  });

  /* ----------------------------------------------------------
     BLANKET SCROLL EFFECT (mobile only)
     ---------------------------------------------------------- */
  var heroBlanket = document.getElementById('heroBlanket');
  var mobileQuery = window.matchMedia('(max-width: 900px)');

  function applyBlanket() {
    if (!heroBlanket) return;

    // Only on mobile & if no reduced motion preference
    if (!mobileQuery.matches || reducedMotion) {
      heroBlanket.style.transform = '';
      return;
    }

    var scrolled = window.scrollY || window.pageYOffset;
    var translateY = scrolled * 0.25;

    var maxMove = 120;
    if (translateY > maxMove) translateY = maxMove;

    heroBlanket.style.transform = 'translateY(' + translateY + 'px)';
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        applyBlanket();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', applyBlanket);

  // Initial call
  applyBlanket();

  /* ----------------------------------------------------------
     Contact form – simple feedback
     ---------------------------------------------------------- */
  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = this.querySelector('button');
      btn.textContent = 'Thank you – we’ll be in touch!';
      btn.disabled = true;
    });
  }

})();