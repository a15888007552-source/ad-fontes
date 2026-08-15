(() => {
  const init = () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("motion-lite-ready");

    if (!reducedMotion) {
      const opening = document.createElement("div");
      opening.className = "museum-opening-lite";
      opening.innerHTML = `
        <div class="museum-opening-lite__inner" aria-hidden="true">
          <div class="museum-opening-lite__seal">考</div>
          <p class="museum-opening-lite__title">考古圣地<span>华章陕西</span></p>
          <p class="museum-opening-lite__caption">器物 · 地层 · 时间</p>
        </div>
        <button class="museum-opening-lite__skip" type="button">跳过</button>`;
      document.body.prepend(opening);
      document.body.classList.add("museum-opening-active");

      let closed = false;
      const closeOpening = () => {
        if (closed) return;
        closed = true;
        opening.classList.add("is-leaving");
        document.body.classList.remove("museum-opening-active");
        window.setTimeout(() => opening.remove(), 650);
      };

      opening.querySelector(".museum-opening-lite__skip")?.addEventListener("click", closeOpening);
      window.setTimeout(closeOpening, 1500);
    }

    const progress = document.createElement("div");
    progress.className = "museum-scroll-progress-lite";
    progress.setAttribute("aria-hidden", "true");
    document.body.append(progress);

    let scrollFrame = 0;
    const paintProgress = () => {
      scrollFrame = 0;
      const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / range))})`;
    };
    window.addEventListener("scroll", () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(paintProgress);
    }, { passive: true });
    paintProgress();

    const intersection = !reducedMotion && "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            intersection.unobserve(entry.target);
          });
        }, { rootMargin: "0px 0px -6%", threshold: 0.05 })
      : null;

    const prepared = new WeakSet();
    const prepare = (element, order = 0) => {
      if (!(element instanceof Element) || prepared.has(element)) return;
      prepared.add(element);
      element.classList.add("motion-lite-reveal");
      element.style.setProperty("--motion-delay", `${Math.min(order % 5, 4) * 45}ms`);
      if (intersection) intersection.observe(element);
      else element.classList.add("is-visible");
    };

    const selector = ".feature-card, .artifact-catalog-intro, .artifact-catalog-toolbar, .artifact-catalog-card, .artifact-catalog-pager";
    document.querySelectorAll(selector).forEach((element, index) => prepare(element, index));

    const catalogRoot = document.querySelector("#artifact-catalog-root");
    if (catalogRoot) {
      const additions = new MutationObserver((mutations) => {
        let order = 0;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches(selector)) prepare(node, order++);
            node.querySelectorAll?.(selector).forEach((element) => prepare(element, order++));
          });
        });
      });
      additions.observe(catalogRoot, { childList: true, subtree: true });
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
