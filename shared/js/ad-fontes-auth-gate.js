(() => {
  const root = document.documentElement;
  const client = window.AdFontesAuth?.client;
  const notice = document.createElement("section");
  notice.className = "auth-gate-notice";
  notice.innerHTML = `<h1>欧罗巴音乐家年鉴</h1><p>登录后继续阅读。</p><div class="auth-gate-actions"><button type="button" data-auth-open>登录 / 注册</button><a href="/">返回首页</a></div>`;
  document.body.append(notice);

  const update = (session) => {
    const authenticated = Boolean(session?.user);
    root.classList.remove("auth-pending");
    root.classList.toggle("auth-required", !authenticated);
    notice.hidden = authenticated;
    for (const element of document.querySelectorAll("#app, #europa-opening, #intro, #dlg, .mirror-switch")) element.inert = !authenticated;
    if (authenticated) {
      for (const script of document.querySelectorAll("script[data-auth-src]")) {
        const module = document.createElement("script");
        module.type = "module";
        module.src = script.dataset.authSrc;
        script.replaceWith(module);
      }
    } else {
      for (const dialog of document.querySelectorAll("dialog[open]:not(.auth-dialog)")) dialog.close();
      window.AdFontesAuthUI?.open();
    }
  };

  if (!client) { update(null); return; }
  client.auth.onAuthStateChange((_event, session) => update(session));
  client.auth.getSession().then(({ data, error }) => update(error ? null : data.session)).catch(() => update(null));
})();
