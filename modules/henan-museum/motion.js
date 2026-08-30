(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const opening = document.querySelector('#museum-opening');
  const hero = document.querySelector('.hero');
  const header = document.querySelector('.site-header');
  const toggles = [...document.querySelectorAll('[data-motion-toggle]')];
  let paused = false;
  let openingActive = false;
  let exitTimer;
  let settleTimer;
  let heroVisible = true;
  let sceneFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let artworkFrame = 0;
  const motionOn = () => !reduced.matches && !paused;

  function settleOpening() {
    if (!opening) return;
    const restoreFocus = opening.contains(document.activeElement);
    opening.hidden = true;
    opening.classList.remove('is-leaving');
    if (restoreFocus) document.querySelector('.hero-enter')?.focus({ preventScroll: true });
  }
  function finishOpening(immediate = false) {
    clearTimeout(exitTimer);
    clearTimeout(settleTimer);
    openingActive = false;
    root.classList.remove('is-opening');
    root.classList.add('is-entered');
    if (!opening || opening.hidden) return;
    if (immediate || !motionOn()) settleOpening();
    else {
      opening.classList.add('is-leaving');
      settleTimer = setTimeout(settleOpening, 560);
    }
  }
  function playOpening() {
    clearTimeout(exitTimer);
    clearTimeout(settleTimer);
    if (!opening || !motionOn()) { finishOpening(true); return; }
    opening.hidden = true;
    opening.classList.remove('is-leaving');
    root.classList.remove('is-entered');
    // A single layout flush restarts the short sequence on an explicit replay.
    void opening.offsetWidth;
    opening.hidden = false;
    openingActive = true;
    root.classList.add('is-opening');
    exitTimer = setTimeout(() => finishOpening(), 1300);
  }
  opening?.querySelector('.opening-skip')?.addEventListener('click', () => finishOpening(true));
  document.querySelectorAll('[data-opening-replay]').forEach(button => {
    button.addEventListener('click', () => {
      if (!motionOn()) return;
      window.scrollTo({ top: 0, behavior: 'instant' });
      playOpening();
      opening?.querySelector('.opening-skip')?.focus({ preventScroll: true });
    });
  });
  document.addEventListener('keydown', event => {
    if (openingActive && event.key === 'Escape') finishOpening(true);
  });
  document.addEventListener('focusin', event => {
    if (openingActive && !opening.contains(event.target)) finishOpening(true);
  });
  // Scrolling is an explicit intention to read; never hold the visitor in the opening.
  addEventListener('wheel', () => { if (openingActive) finishOpening(true); }, { passive: true });
  addEventListener('touchstart', () => { if (openingActive) finishOpening(true); }, { passive: true });

  const revealNodes = [...document.querySelectorAll(
    '.museum-photo, .museum-intro>.eyebrow, .museum-intro>h2, .museum-statistics, ' +
    '.museum-prose>div, .museum-intro>.text-link, .treasure-heading, .object-index, ' +
    '.object-toolbar, .object-art, .object-copy, .music-title, .music-copy, ' +
    '.collection>.section-heading, .ru-art, .collection-list>a, .colophon>div'
  )];
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveals.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -35px 0px' });
    revealNodes.forEach((node, index) => {
      node.classList.add('reveal');
      node.style.setProperty('--reveal-delay', (index % 3) * 55 + 'ms');
      if (!motionOn()) node.classList.add('is-visible');
      reveals.observe(node);
    });
  }

  const dust = hero?.querySelector('.hero-dust');
  function addDust() {
    if (!dust || dust.childElementCount || !finePointer.matches || !motionOn()) return;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 19; i++) {
      const mote = document.createElement('i');
      mote.style.setProperty('--x', 22 + ((i * 37) % 76) + '%');
      mote.style.setProperty('--y', 16 + ((i * 23) % 78) + '%');
      mote.style.setProperty('--size', (i % 4 === 0 ? 2.3 : 1.3) + 'px');
      mote.style.setProperty('--duration', 6 + (i % 5) + 's');
      mote.style.setProperty('--delay', -(i * .67) + 's');
      fragment.append(mote);
    }
    dust.append(fragment);
  }
  const scenes = [hero, document.querySelector('.music-chapter')].filter(Boolean);
  if ('IntersectionObserver' in window) {
    const sceneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('in-view', entry.isIntersecting);
        if (entry.target === hero) {
          heroVisible = entry.isIntersecting;
          if (heroVisible) scheduleScene();
        }
      });
    });
    scenes.forEach(scene => sceneObserver.observe(scene));
  } else scenes.forEach(scene => scene.classList.add('in-view'));

  function updateScene() {
    sceneFrame = 0;
    header?.classList.toggle('is-scrolled', scrollY > 24);
    if (!hero || !heroVisible || document.hidden || !motionOn() || !finePointer.matches) return;
    const rect = hero.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    hero.style.setProperty('--hero-scroll', progress * 38 + 'px');
    hero.style.setProperty('--hero-x', pointerX * -7 + 'px');
    hero.style.setProperty('--hero-y', pointerY * -5 + 'px');
  }
  function scheduleScene() {
    if (!sceneFrame) sceneFrame = requestAnimationFrame(updateScene);
  }
  hero?.addEventListener('pointermove', event => {
    if (!motionOn() || !finePointer.matches) return;
    const rect = hero.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - .5;
    pointerY = (event.clientY - rect.top) / rect.height - .5;
    hero.style.setProperty('--light-x', (pointerX + .5) * 100 + '%');
    hero.style.setProperty('--light-y', (pointerY + .5) * 100 + '%');
    scheduleScene();
  });
  hero?.addEventListener('pointerleave', () => { pointerX = pointerY = 0; scheduleScene(); });
  addEventListener('scroll', scheduleScene, { passive: true });
  addEventListener('resize', scheduleScene, { passive: true });

  const artworks = [...document.querySelectorAll('.object-art, .ru-art')];
  function resetArtwork(art) {
    art.style.setProperty('--tilt-x', '0deg');
    art.style.setProperty('--tilt-y', '0deg');
  }
  artworks.forEach(art => {
    art.classList.add('art-tilt');
    art.addEventListener('pointermove', event => {
      if (!motionOn() || !finePointer.matches) return;
      if (artworkFrame) cancelAnimationFrame(artworkFrame);
      artworkFrame = requestAnimationFrame(() => {
        artworkFrame = 0;
        const rect = art.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
        art.style.setProperty('--art-x', x * 100 + '%');
        art.style.setProperty('--art-y', y * 100 + '%');
        art.style.setProperty('--tilt-x', (.5 - y) * 2.2 + 'deg');
        art.style.setProperty('--tilt-y', (x - .5) * 2.2 + 'deg');
      });
    });
    art.addEventListener('pointerleave', () => {
      if (artworkFrame) cancelAnimationFrame(artworkFrame);
      artworkFrame = 0;
      resetArtwork(art);
    });
  });
  document.querySelector('.object-carousel')?.addEventListener('objectchange', event => {
    const slides = [...event.currentTarget.querySelectorAll('.object-feature')];
    slides.forEach(slide => slide.classList.remove('object-arriving'));
    const selected = slides[event.detail.index];
    if (selected && motionOn()) {
      void selected.offsetWidth;
      selected.classList.add('object-arriving');
    }
  });

  function syncMotion() {
    const enabled = motionOn();
    root.classList.toggle('motion-off', !enabled);
    toggles.forEach(button => {
      button.setAttribute('aria-pressed', String(enabled));
      button.textContent = enabled ? '暂停动效' : '开启动效';
      button.disabled = reduced.matches;
      button.title = reduced.matches ? '已遵循系统的减少动态效果设置' : '';
    });
    document.querySelectorAll('[data-opening-replay]').forEach(button => {
      button.disabled = !enabled;
    });
    if (!enabled) {
      finishOpening(true);
      revealNodes.forEach(node => node.classList.add('is-visible'));
      artworks.forEach(resetArtwork);
      if (sceneFrame) cancelAnimationFrame(sceneFrame);
      if (artworkFrame) cancelAnimationFrame(artworkFrame);
      sceneFrame = artworkFrame = 0;
    } else { addDust(); scheduleScene(); }
  }
  toggles.forEach(button => button.addEventListener('click', () => { paused = !paused; syncMotion(); }));
  reduced.addEventListener('change', syncMotion);
  finePointer.addEventListener('change', () => {
    artworks.forEach(resetArtwork);
    addDust();
    scheduleScene();
  });
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('motion-background', document.hidden);
    if (document.hidden) {
      finishOpening(true);
      if (sceneFrame) cancelAnimationFrame(sceneFrame);
      if (artworkFrame) cancelAnimationFrame(artworkFrame);
      sceneFrame = artworkFrame = 0;
    } else scheduleScene();
  });
  addEventListener('pageshow', event => { if (event.persisted) finishOpening(true); });

  root.classList.add('motion-ready');
  syncMotion();
  if (!document.hidden) playOpening();
  else finishOpening(true);
})();
