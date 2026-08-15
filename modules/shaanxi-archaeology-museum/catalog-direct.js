(() => {
  const removeRedundantCatalogIntro = () => {
    const root = document.querySelector("#artifact-catalog-root");
    const section = root?.closest("#other");
    if (!root || !section) return;

    root.replaceChildren();
    section.replaceChildren(root);
    section.classList.add("catalog-only");
    section.removeAttribute("aria-labelledby");
    section.setAttribute("aria-label", "文物目录");
  };

  removeRedundantCatalogIntro();
})();
