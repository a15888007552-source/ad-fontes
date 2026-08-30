(() => {
  'use strict';
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  function closeNav() { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeNav(); toggle.focus(); }
  });
  const progress = document.querySelector('.reading-progress span');
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.querySelector(link.hash));
  let scheduled = false;
  function updateProgress() {
    const range = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0})`;
    let active = -1;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= innerHeight * .32) active = index;
    });
    links.forEach((link, index) => {
      const current = index === active;
      link.classList.toggle('is-active', current);
      if (current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    scheduled = false;
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  addEventListener('resize', updateProgress);
  addEventListener('load', updateProgress);
  const carousel = document.querySelector('.object-carousel');
  const objects = [...carousel.querySelectorAll('.object-feature')];
  const objectLinks = [...document.querySelectorAll('.object-index a')];
  const previous = document.querySelector('[data-object-prev]');
  const next = document.querySelector('[data-object-next]');
  const count = document.getElementById('object-count');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let objectIndex = -1;
  let scrollEnd;
  function markObject(index, writeHash = true) {
    if (index === objectIndex) return;
    objectIndex = index;
    objects.forEach((object, i) => {
      object.inert = i !== index;
      object.classList.toggle('is-current', i === index);
    });
    carousel.dispatchEvent(new CustomEvent('objectchange', { detail: { index } }));
    objectLinks.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
    previous.disabled = index === 0;
    next.disabled = index === objects.length - 1;
    count.textContent = `${String(index + 1).padStart(2, '0')} / 03`;
    if (writeHash) history.replaceState(null, '', `#${objects[index].id}`);
  }
  function showObject(index, smooth = true, writeHash = true) {
    if (index < 0 || index >= objects.length) return;
    markObject(index, writeHash);
    carousel.scrollTo({ left: index * carousel.clientWidth, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
  }
  objectLinks.forEach((link, index) => {
    link.addEventListener('click', event => { event.preventDefault(); showObject(index); });
  });
  previous.addEventListener('click', () => showObject(objectIndex - 1));
  next.addEventListener('click', () => showObject(objectIndex + 1));
  carousel.addEventListener('scroll', () => {
    clearTimeout(scrollEnd);
    scrollEnd = setTimeout(() => markObject(Math.max(0, Math.min(objects.length - 1, Math.round(carousel.scrollLeft / carousel.clientWidth)))), 120);
  }, { passive: true });
  carousel.addEventListener('keydown', event => {
    if (event.target.closest('a,button,summary')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    showObject(objectIndex + (event.key === 'ArrowRight' ? 1 : -1));
  });
  let wheelSum = 0;
  let wheelUsed = false;
  let wheelEnd;
  carousel.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    // Keep ordinary vertical reading available over the text, including on short screens.
    if (!horizontal && !event.target.closest('.object-art')) return;
    const delta = (horizontal ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? carousel.clientHeight : 1);
    if (!delta) return;
    clearTimeout(wheelEnd);
    wheelEnd = setTimeout(() => { wheelSum = 0; wheelUsed = false; }, 180);
    if (wheelUsed) { event.preventDefault(); return; }
    if ((delta < 0 && objectIndex === 0) || (delta > 0 && objectIndex === objects.length - 1)) return;
    event.preventDefault();
    wheelSum += delta;
    if (Math.abs(wheelSum) < 28) return;
    wheelUsed = true;
    showObject(objectIndex + Math.sign(wheelSum));
  }, { passive: false });
  function objectFromHash() {
    const index = objects.findIndex(object => `#${object.id}` === location.hash);
    if (index !== -1) showObject(index, false, false);
  }
  addEventListener('hashchange', objectFromHash);
  addEventListener('resize', () => showObject(objectIndex, false, false));
  showObject(0, false, false);
  objectFromHash();
  updateProgress();
})();
