(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => value * value * (3 - 2 * value);
  let paused = media.matches;
  try { paused = paused || localStorage.getItem('how-motion') === 'paused'; } catch {}

  // Keep complete headings available to assistive technology while animating their parts
  const title = $('#hero-title');
  title.setAttribute('aria-label', 'A little flour A lot of Salento');
  $('.hero-prelude').setAttribute('aria-hidden', 'true');
  $$('.hero-line').forEach((line, row) => {
    const text = line.textContent;
    line.setAttribute('aria-hidden', 'true');
    line.replaceChildren();
    [...text].forEach((letter, index) => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.style.setProperty('--i', String(index + row * 3));
      span.textContent = letter === ' ' ? '\u00a0' : letter;
      line.append(span);
    });
  });

  const chapters = $$('.journey-section');
  const journeyLinks = $$('[data-journey]');
  const ribbon = $('.type-ribbon');
  const colourStops = [
    [$('#experience'), 0], [$('#make'), 1], [$('#included'), 1],
    [$('#location'), 0], [$('.faq'), 0], [$('#calendar'), .88], [$('footer'), 1]
  ];
  let scheduled = false;

  function updateJourney() {
    scheduled = false;
    const viewport = Math.max(1, window.innerHeight);
    const scroll = Math.max(0, window.scrollY);
    let active = chapters[0];
    chapters.forEach(section => {
      if (section.getBoundingClientRect().top <= viewport * .42) active = section;
    });
    journeyLinks.forEach(link => {
      if (link.dataset.journey === active.dataset.chapter) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
    const total = root.scrollHeight - viewport;
    $('#journey-progress').style.transform = `scaleX(${clamp(total > 0 ? scroll / total : 0)})`;
    document.body.classList.toggle('has-scrolled', scroll > 60);
    if (paused) return;

    // Interpolate one shared canvas through the sections without replacing native scrolling
    const marker = scroll + viewport * .48;
    const stops = [[0, 0], ...colourStops.map(([element, warmth]) => {
      const rect = element.getBoundingClientRect();
      return [scroll + rect.top + Math.min(rect.height * .2, viewport * .22), warmth];
    })];
    let warm = stops[stops.length - 1][1];
    for (let i = 1; i < stops.length; i++) {
      if (marker <= stops[i][0]) {
        const [start, from] = stops[i - 1];
        const [end, to] = stops[i];
        const progress = smooth(clamp((marker - start) / Math.max(1, end - start)));
        warm = from + (to - from) * progress;
        break;
      }
    }
    root.style.setProperty('--warm', warm.toFixed(3));
    root.style.setProperty('--haze', (.15 + (1 - warm) * .22).toFixed(3));

    const ribbonRect = ribbon.getBoundingClientRect();
    const ribbonProgress = clamp((viewport - ribbonRect.top) / (viewport + ribbonRect.height));
    root.style.setProperty('--ribbon-x', `${(-70 - ribbonProgress * 340).toFixed(1)}px`);

  }

  function scheduleFrame() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateJourney);
  }
  const toggle = $('#motion-toggle');
  function setMotion(value) {
    paused = value;
    root.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Enable motion' : 'Pause motion';
    if (paused) {
      $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
      root.style.setProperty('--warm', '.15');
    }
    scheduleFrame();
  }
  setMotion(paused);
  toggle.addEventListener('click', () => {
    setMotion(!paused);
    try { localStorage.setItem('how-motion', paused ? 'paused' : 'enabled'); } catch {}
  });
  media.addEventListener('change', event => setMotion(event.matches));

  if ('IntersectionObserver' in window && !paused) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .06, rootMargin: '0px 0px -20px 0px' });
    $$('[data-reveal]').forEach(element => {
      element.classList.add('reveal-ready');
      observer.observe(element);
    });
  }
  window.addEventListener('scroll', scheduleFrame, { passive: true });
  window.addEventListener('resize', scheduleFrame);
  window.addEventListener('pageshow', scheduleFrame);
  document.fonts?.ready.then(scheduleFrame);

  const tabs = $$('[data-lesson]');
  const verbs = ['Discover', 'Knead', 'Shape', 'Finish'];
  let lesson = 0;
  function selectLesson(index, focus = false) {
    lesson = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      $('#lesson-panel-' + i).hidden = i !== index;
    });
    $('#lesson-count').textContent = `0${index + 1} / 04`;
    $('#lesson-verb').textContent = verbs[index];
    $('#lesson-status').textContent = `Step ${index + 1} of 4`;
    $('.lesson-photo').dataset.stage = String(index);
    $('#next-lesson').hidden = index === 3;
    $('#finish-lesson').hidden = index !== 3;
    const panel = $('#lesson-panel-' + index);
    if (!paused && panel.animate) panel.animate([
      { opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 440, easing: 'cubic-bezier(.2,.75,.25,1)' });
    if (focus) tabs[index].focus();
    scheduleFrame();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectLesson(index));
    tab.addEventListener('keydown', event => {
      let target = index;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = tabs.length - 1;
      else return;
      event.preventDefault();
      selectLesson(target, true);
    });
  });
  $('#next-lesson').addEventListener('click', () => {
    selectLesson(Math.min(tabs.length - 1, lesson + 1));
    if (lesson === tabs.length - 1) $('#finish-lesson').focus();
  });

  const bagToggle = $('.bag-toggle');
  bagToggle.addEventListener('click', () => {
    const open = bagToggle.getAttribute('aria-expanded') !== 'true';
    bagToggle.setAttribute('aria-expanded', String(open));
    $('#bag-details').hidden = !open;
    $('.bag-scene').classList.toggle('is-open', open);
  });
  $$('.soft-detail').forEach(detail => detail.addEventListener('toggle', () => {
    if (detail.open && !paused && detail.animate) detail.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 240 });
    scheduleFrame();
  }));
  window.addEventListener('how:booking-change', event => {
    const selected = event.detail.selected;
    $('#booking-step-date').classList.toggle('is-complete', !!selected);
    $('#booking-step-date').classList.toggle('is-current', !selected);
    $('#booking-step-guests').classList.toggle('is-current', !!selected);
    $('#booking-step-confirm').classList.toggle('is-ready', !!event.detail.ready);
    $('.booking-summary').classList.toggle('has-date', !!selected);
  });
})();
