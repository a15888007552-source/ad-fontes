(() => {
  const destination = window.location.pathname + window.location.search + window.location.hash;
  const loginUrl = "/login/?next=" + encodeURIComponent(destination);
  const client = window.AdFontesAuth?.client;

  if (!client) {
    window.location.replace(loginUrl);
    return;
  }

  client.auth.getSession()
    .then(({ data, error }) => {
      if (error || !data.session?.user) {
        window.location.replace(loginUrl);
        return;
      }
      document.documentElement.classList.remove("auth-pending");
    })
    .catch(() => window.location.replace(loginUrl));
})();
