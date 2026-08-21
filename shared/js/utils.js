/* Small, dependency-free helpers for future module migrations. */
export function byId(id) {
  return document.getElementById(id);
}

export function prefersReducedMotion() {
  return Boolean(
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
