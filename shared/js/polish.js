/* Ad Fontes · shared polish layer (scroll reveal, zero-config)
   - Reveals card grids and key blocks with a gentle staggered rise.
   - Uses only transform/opacity; IntersectionObserver; respects reduced motion.
   - Progressive enhancement: if anything fails, all content stays visible. */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  if (!('IntersectionObserver' in window)) {
    return;
  }

  var GRID_SELECTOR = [
    '.museum-list',
    '.object-grid',
    '.archive-grid',
    '.treasure-grid',
    '.review-grid',
    '.route-grid',
    '.special-preview',
    '.theme-grid',
    '.catalog-grid',
    '.artifact-grid',
    '.featured-grid',
    '.method-grid',
    '.method-steps',
    '.museum-facts',
    '.source-grid',
    '.seal-viewer-facts'
  ].join(', ');

  var root = document.documentElement;
  var queued = [];

  function indexInParent(el) {
    var children = el.parentNode ? Array.prototype.filter.call(el.parentNode.children, function (n) {
      return n.nodeType === 1;
    }) : [];
    return Math.max(0, children.indexOf(el));
  }

  function prepare(el) {
    if (el.classList.contains('polish-reveal')) return;
    el.classList.add('polish-reveal');
    var i = indexInParent(el);
    var delay = Math.min(i * 70, 420);
    el.style.setProperty('--reveal-delay', delay + 'ms');
  }

  try {
    var grids = document.querySelectorAll(GRID_SELECTOR);
    Array.prototype.forEach.call(grids, function (grid) {
      // skip grids that are inside a hidden container
      var hidden = false;
      for (var n = grid; n; n = n.parentElement) {
        if (n.hidden || (n.tagName === 'DIALOG' && !n.open)) { hidden = true; break; }
      }
      if (hidden) return;
      var kids = Array.prototype.filter.call(grid.children, function (n) {
        return n.nodeType === 1;
      });
      Array.prototype.forEach.call(kids, prepare);
      queued.push.apply(queued, kids);
    });

    // standalone key blocks that benefit from a reveal (feature cards, hero copy)
    var blocks = document.querySelectorAll('.feature-card > .feature-copy, .chapter-hero-copy');
    Array.prototype.forEach.call(blocks, function (el) {
      if (el.closest('.polish-reveal')) return;
      prepare(el);
      queued.push(el);
    });
  } catch (e) {
    return;
  }

  if (!queued.length) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      observer.unobserve(el);
      // small rAF so the transition starts after the class is present
      requestAnimationFrame(function () {
        el.classList.add('is-visible');
      });
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

  queued.forEach(function (el) { observer.observe(el); });

  // Reveal anything already within the viewport on load.
  window.addEventListener('load', function () {
    queued.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.96) {
        el.classList.add('is-visible');
        observer.unobserve(el);
      }
    });
  }, { once: true, passive: true });

  // Grids populated by page scripts (museum card grids, catalog grids):
  // watch for newly added cards and give them the same reveal treatment.
  function isGrid(el) {
    return el && el.matches && el.matches(GRID_SELECTOR);
  }

  function handleMutations(list) {
    list.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (!node.nodeType || node.nodeType !== 1) return;
        var grid = isGrid(node) ? node : node.querySelector ? node.querySelector(GRID_SELECTOR) : null;
        if (!grid) {
          // node itself may be a card inserted into an existing grid
          var parent = node.parentElement;
          if (parent && isGrid(parent)) grid = parent;
        }
        if (!grid) return;
        var hidden = false;
        for (var n = grid; n; n = n.parentElement) {
          if (n.hidden || (n.tagName === 'DIALOG' && !n.open)) { hidden = true; break; }
        }
        if (hidden) return;
        var kids = Array.prototype.filter.call(grid.children, function (n) {
          return n.nodeType === 1;
        });
        Array.prototype.forEach.call(kids, function (kid) {
          if (kid.classList.contains('polish-reveal')) return;
          prepare(kid);
          observer.observe(kid);
        });
      });
    });
  }

  if ('MutationObserver' in window) {
    new MutationObserver(handleMutations).observe(document.body, { childList: true, subtree: true });
  }
})();
