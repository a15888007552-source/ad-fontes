(() => {
  const login = document.querySelector("[data-auth-login]");
  const logout = document.querySelector("[data-auth-logout]");
  if (!login && !logout) return;

  const client = window.AdFontesAuth?.client;
  const update = (session) => {
    const authenticated = Boolean(session?.user);
    if (login) login.hidden = authenticated;
    if (logout) logout.hidden = !authenticated;
  };

  if (!client) {
    update(null);
    return;
  }

  client.auth.onAuthStateChange((_event, session) => update(session));
  client.auth.getSession()
    .then(({ data, error }) => update(error ? null : data.session))
    .catch(() => update(null));
})();
