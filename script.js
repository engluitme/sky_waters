/* Hero carousel */
(function () {
  const sl = document.getElementById('sl');
  const sd = document.getElementById('sd');
  if (!sl || !sd) return;

  let cur = 0;
  let t;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function slides() {
    return [...sl.children].filter(slide => !slide.hidden);
  }

  function slideLeft(slide) {
    return slide.getBoundingClientRect().left - sl.getBoundingClientRect().left + sl.scrollLeft;
  }

  function renderDots() {
    sd.replaceChildren();
    slides().forEach((slide, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Photo ${i + 1}`);
      b.addEventListener('click', () => {
        go(i);
        restart();
      });
      sd.appendChild(b);
    });
  }

  function mark() {
    const visibleSlides = slides();
    if (!visibleSlides.length) {
      cur = 0;
      sd.hidden = true;
      return;
    }
    sd.hidden = false;
    cur = visibleSlides.reduce((closest, slide, i) =>
      Math.abs(slideLeft(slide) - sl.scrollLeft) < Math.abs(slideLeft(visibleSlides[closest]) - sl.scrollLeft) ? i : closest, 0);
    [...sd.children].forEach((b, i) => {
      b.setAttribute('aria-current', i === cur ? 'true' : 'false');
    });
  }

  function go(i) {
    const visibleSlides = slides();
    if (!visibleSlides.length) return;
    cur = (i + visibleSlides.length) % visibleSlides.length;
    sl.scrollTo({ left: slideLeft(visibleSlides[cur]), behavior: 'smooth' });
  }

  sl.addEventListener('scroll', () => {
    clearTimeout(sl._t);
    sl._t = setTimeout(mark, 60);
    mark();
  }, { passive: true });

  document.querySelector('.sb.p')?.addEventListener('click', () => {
    go(cur - 1);
    restart();
  });
  document.querySelector('.sb.n')?.addEventListener('click', () => {
    go(cur + 1);
    restart();
  });

  sl.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') {
      go(cur - 1);
      restart();
    }
    if (e.key === 'ArrowRight') {
      go(cur + 1);
      restart();
    }
  });

  function stop() { clearInterval(t); }
  function restart() {
    stop();
    if (!reduced && slides().length > 1) t = setInterval(() => go(cur + 1), 5000);
  }

  const parent = sl.parentNode;
  ['pointerdown', 'touchstart', 'mouseenter', 'focusin'].forEach(ev => {
    parent.addEventListener(ev, stop, { passive: true });
  });
  ['mouseleave', 'focusout'].forEach(ev => {
    parent.addEventListener(ev, restart);
  });
  sl.addEventListener('touchend', restart, { passive: true });
  new MutationObserver(() => {
    renderDots();
    mark();
    restart();
  }).observe(sl, { childList: true, attributes: true, attributeFilter: ['hidden'] });

  window.addEventListener('resize', () => {
    sl.scrollTo({ left: cur * sl.clientWidth });
  });

  renderDots();
  mark();
  restart();
})();

/* Contact form → WhatsApp */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const status = document.getElementById('contact-status');

  form.addEventListener('submit', e => {
    e.preventDefault();

    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const email = form.elements.email.value.trim();
    const service = form.elements.service.value;
    const details = form.elements.message.value.trim();
    const whatsappNumber = form.dataset.whatsappNumber || '263713041100';

    if (!name || !phone || !service || !details) {
      status.textContent = 'Please fill in all required fields.';
      return;
    }

    if (!/^[0-9]{7,15}$/.test(whatsappNumber)) {
      status.textContent = 'The WhatsApp contact number is not configured correctly. Please contact us directly.';
      return;
    }

    const message = [
      'Quote request from website',
      `Name: ${name}`,
      `Phone / WhatsApp: ${phone}`,
      `Email: ${email || 'Not provided'}`,
      `Service: ${service}`,
      `Project details: ${details}`
    ].join('\n');

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');

    if (win) {
      status.textContent = 'WhatsApp opened with your request. Just hit send.';
      form.reset();
    } else {
      status.innerHTML = '';
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Open WhatsApp to send your request';
      status.appendChild(a);
    }
  });
})();

/* Division carousels */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.sl2').forEach((sl, index) => {
    const box = sl.parentNode;
    const sd = box.querySelector('.sd2');
    if (!sd) return;

    let cur = 0;
    let t;

    function slides() {
      return [...sl.children].filter(slide => !slide.hidden);
    }

    function slideLeft(slide) {
      return slide.getBoundingClientRect().left - sl.getBoundingClientRect().left + sl.scrollLeft;
    }

    function renderDots() {
      sd.replaceChildren();
      slides().forEach((slide, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `Photo ${i + 1}`);
        b.addEventListener('click', () => {
          go(i);
          restart();
        });
        sd.appendChild(b);
      });
    }

    function mark() {
      const visibleSlides = slides();
      if (!visibleSlides.length) {
        cur = 0;
        sd.hidden = true;
        return;
      }
      sd.hidden = false;
      cur = visibleSlides.reduce((closest, slide, i) =>
        Math.abs(slideLeft(slide) - sl.scrollLeft) < Math.abs(slideLeft(visibleSlides[closest]) - sl.scrollLeft) ? i : closest, 0);
      [...sd.children].forEach((b, i) => {
        b.setAttribute('aria-current', i === cur ? 'true' : 'false');
      });
    }

    function go(i) {
      const visibleSlides = slides();
      if (!visibleSlides.length) return;
      cur = (i + visibleSlides.length) % visibleSlides.length;
      sl.scrollTo({ left: slideLeft(visibleSlides[cur]), behavior: 'smooth' });
    }

    sl.addEventListener('scroll', mark, { passive: true });

    box.querySelector('.sb2.p')?.addEventListener('click', () => {
      go(cur - 1);
      restart();
    });
    box.querySelector('.sb2.n')?.addEventListener('click', () => {
      go(cur + 1);
      restart();
    });

    sl.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') {
        go(cur - 1);
        restart();
      }
      if (e.key === 'ArrowRight') {
        go(cur + 1);
        restart();
      }
    });

    function stop() { clearInterval(t); }
    function restart() {
      stop();
      if (!reduced && slides().length > 1) t = setInterval(() => go(cur + 1), 6000 + index * 1500);
    }

    ['pointerdown', 'touchstart', 'mouseenter', 'focusin'].forEach(ev => {
      box.addEventListener(ev, stop, { passive: true });
    });
    ['mouseleave', 'focusout'].forEach(ev => {
      box.addEventListener(ev, restart);
    });
    sl.addEventListener('touchend', restart, { passive: true });
    new MutationObserver(() => {
      renderDots();
      mark();
      restart();
    }).observe(sl, { childList: true, attributes: true, attributeFilter: ['hidden'] });

    window.addEventListener('resize', () => {
      sl.scrollTo({ left: cur * sl.clientWidth });
    });

    renderDots();
    mark();
    restart();
  });
})();