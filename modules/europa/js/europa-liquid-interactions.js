/* Navigation-only progressive enhancement; archive/view logic remains in index.js. */
(() => {
  "use strict";

  const reducedMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const nav = document.querySelector("#views");
  if (!nav || reducedMotion) return;

  let ink = nav.querySelector(".af-liquid-nav-ink");
  if (!ink) {
    ink = document.createElement("span");
    ink.className = "af-liquid-nav-ink";
    ink.setAttribute("aria-hidden", "true");
    nav.append(ink);
  }

  let activeButton = nav.querySelector("button.on");
  let movingTo = null;

  function geometry(button) {
    const navRect = nav.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      left: buttonRect.left - navRect.left,
      top: buttonRect.top - navRect.top,
      width: buttonRect.width,
      height: buttonRect.height
    };
  }

  function writeGeometry(rect) {
    ink.style.left = `${rect.left}px`;
    ink.style.top = `${rect.top}px`;
    ink.style.width = `${rect.width}px`;
    ink.style.height = `${rect.height}px`;
  }

  function clearTravelState() {
    nav.classList.remove("is-liquid-traveling");
    ink.classList.remove("is-moving", "is-forward", "is-backward");
    nav.querySelectorAll(".af-liquid-target").forEach(button => button.classList.remove("af-liquid-target"));
    movingTo = null;
  }

  function settle(button) {
    if (!button) return;
    clearTravelState();
    writeGeometry(geometry(button));
    activeButton = button;
  }

  function moveSurfaceTo(target) {
    const from = activeButton || nav.querySelector("button.on");
    if (!from || !target || from === target) return;

    const fromGeometry = geometry(from);
    const targetGeometry = geometry(target);
    const fromCenter = fromGeometry.left + fromGeometry.width / 2;
    const targetCenter = targetGeometry.left + targetGeometry.width / 2;
    const direction = targetCenter >= fromCenter ? "is-forward" : "is-backward";

    clearTravelState();
    writeGeometry(fromGeometry);
    void ink.offsetWidth;
    writeGeometry(targetGeometry);
    ink.classList.add("is-moving", direction);
    nav.classList.add("is-liquid-traveling");
    target.classList.add("af-liquid-target");
    movingTo = target;
    activeButton = target;
  }

  // Align the surface before handing active-background ownership to the enhancement.
  settle(activeButton);
  nav.classList.add("af-liquid-ready");

  // Capture runs before index.js's bubble handler changes button.on.
  nav.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target.closest("button[data-v]") : null;
    if (target && nav.contains(target)) moveSurfaceTo(target);
  }, true);

  ink.addEventListener("animationend", event => {
    if (event.target !== ink || event.pseudoElement || event.animationName !== "af-liquid-nav-surface-morph") return;
    settle(movingTo || nav.querySelector("button.on"));
  });

  window.addEventListener("resize", () => {
    if (!movingTo) settle(nav.querySelector("button.on") || activeButton);
  }, {passive:true});
})();
