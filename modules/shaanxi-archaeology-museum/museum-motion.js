(() => {
  const init = () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    document.documentElement.classList.add("motion-ready");

    if (!reducedMotion) {
      const opening = document.createElement("div");
      opening.className = "museum-opening";
      opening.setAttribute("aria-hidden", "true");
      opening.innerHTML = `
        <div class="museum-opening-inner">
          <div class="museum-opening-seal">考</div>
          <p class="museum-opening-overline">Shaanxi Archaeology Museum</p>
          <p class="museum-opening-title">考古圣地<span>华章陕西</span></p>
          <div class="museum-opening-rule"><i></i></div>
          <p class="museum-opening-caption">器物 · 地层 · 时间</p>
        </div>
        <button class="museum-opening-skip" type="button" aria-label="跳过开场动画">跳过</button>`;
      document.body.prepend(opening);
      document.body.classList.add("museum-opening-active");

      let openingClosed = false;
      const closeOpening = () => {
        if (openingClosed) return;
        openingClosed = true;
        opening.classList.add("is-leaving");
        document.body.classList.remove("museum-opening-active");
        window.setTimeout(() => opening.remove(), 960);
      };

      opening.querySelector(".museum-opening-skip")?.addEventListener("click", closeOpening);
      window.setTimeout(closeOpening, 2650);
    }

    const progress = document.createElement("div");
    progress.className = "museum-scroll-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.append(progress);

    let progressFrame = 0;
    const updateProgress = () => {
      progressFrame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / scrollRange))})`;
    };
    window.addEventListener("scroll", () => {
      if (!progressFrame) progressFrame = window.requestAnimationFrame(updateProgress);
    }, { passive: true });
    updateProgress();

    const observer = !reducedMotion && "IntersectionObserver" in window
      ? new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        }, { rootMargin: "0px 0px -8%", threshold: 0.08 })
      : null;

    const prepared = new WeakSet();
    const attachCardLight = (card) => {
      if (!finePointer || card.dataset.motionLight === "true") return;
      card.dataset.motionLight = "true";
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--card-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        card.style.setProperty("--card-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      });
    };

    const prepareReveal = (element, index = 0) => {
      if (!(element instanceof Element) || prepared.has(element)) return;
      prepared.add(element);
      element.classList.add("reveal-item");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 65}ms`);
      if (element.matches(".artifact-catalog-card")) attachCardLight(element);
      if (observer) observer.observe(element);
      else element.classList.add("is-visible");
    };

    document.querySelectorAll(".feature-card, .artifact-catalog-intro, .artifact-catalog-toolbar, .artifact-catalog-card, .artifact-catalog-pager")
      .forEach((element, index) => prepareReveal(element, index));

    const catalogRoot = document.querySelector("#artifact-catalog-root");
    if (catalogRoot) {
      const catalogObserver = new MutationObserver((mutations) => {
        let index = 0;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches(".artifact-catalog-intro, .artifact-catalog-toolbar, .artifact-catalog-card, .artifact-catalog-pager")) {
              prepareReveal(node, index++);
            }
            node.querySelectorAll?.(".artifact-catalog-intro, .artifact-catalog-toolbar, .artifact-catalog-card, .artifact-catalog-pager")
              .forEach((element) => prepareReveal(element, index++));
          });
        });
      });
      catalogObserver.observe(catalogRoot, { childList: true, subtree: true });
    }

    const hero = document.querySelector(".theme-card");
    if (hero && !reducedMotion) {
      const field = document.createElement("div");
      field.className = "museum-motion-field";
      field.setAttribute("aria-hidden", "true");
      hero.prepend(field);

      if (finePointer) {
        let fieldFrame = 0;
        let fieldX = 0;
        let fieldY = 0;
        const updateField = () => {
          fieldFrame = 0;
          field.style.setProperty("--field-x", `${fieldX}px`);
          field.style.setProperty("--field-y", `${fieldY}px`);
        };
        hero.addEventListener("pointermove", (event) => {
          const rect = hero.getBoundingClientRect();
          fieldX = ((event.clientX - rect.left) / rect.width - 0.5) * 24;
          fieldY = ((event.clientY - rect.top) / rect.height - 0.5) * 18;
          if (!fieldFrame) fieldFrame = window.requestAnimationFrame(updateField);
        });
        hero.addEventListener("pointerleave", () => {
          fieldX = 0;
          fieldY = 0;
          if (!fieldFrame) fieldFrame = window.requestAnimationFrame(updateField);
        });
      }
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
