(() => {
  const client = window.AdFontesAuth?.client;
  const storageKey = "ad-fontes-pending-code";
  let session = null;
  let mode = "login";
  let method = "password";
  let resetPassword = false;
  let pending = null;
  let busy = false;
  let cooldownUntil = 0;

  const dialog = document.createElement("dialog");
  dialog.id = "ad-fontes-auth-dialog";
  dialog.className = "auth-dialog";
  dialog.setAttribute("aria-labelledby", "af-auth-title");
  dialog.innerHTML = [
    '<div class="auth-dialog-body">',
    '<button class="auth-close" type="button" data-action="close" aria-label="关闭账户窗口">×</button>',
    '<p class="auth-wordmark">AD FONTES · 溯源</p>',
    '<section data-pane="auth">',
    '<div class="auth-tabs" role="tablist" aria-label="账户操作">',
    '<button id="af-tab-login" type="button" role="tab" aria-selected="true" aria-controls="af-auth-panel" data-mode="login">登录</button>',
    '<button id="af-tab-register" type="button" role="tab" aria-selected="false" aria-controls="af-auth-panel" tabindex="-1" data-mode="register">注册</button>',
    '</div>',
    '<div id="af-auth-panel" role="tabpanel" aria-labelledby="af-tab-login">',
    '<h2 id="af-auth-title" hidden>登录</h2>',
    '<p class="auth-intro" data-intro>登录你的 Ad Fontes 账户。</p>',
    '<form data-form="credentials">',
    '<label for="af-auth-email">邮箱</label>',
    '<input id="af-auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>',
    '<div data-password-field>',
    '<label for="af-auth-password">密码</label>',
    '<input id="af-auth-password" name="password" type="password" autocomplete="current-password" required>',
    '</div>',
    '<button class="auth-primary" type="submit" data-submit>登录</button>',
    '<div class="auth-links" data-method-links>',
    '<button class="auth-link" type="button" data-action="method">用验证码登录</button>',
    '<button class="auth-link" type="button" data-action="forgot">忘记密码</button>',
    '</div></form>',
    '<form data-form="code" hidden>',
    '<p class="auth-intro" data-sent-to></p>',
    '<label for="af-auth-code">6 位验证码</label>',
    '<input id="af-auth-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>',
    '<button class="auth-primary" type="submit" data-verify>验证并登录</button>',
    '<div class="auth-links">',
    '<button class="auth-link" type="button" data-action="change-email">更换邮箱</button>',
    '<button class="auth-link" type="button" data-action="resend">重新发送</button>',
    '</div></form></div></section>',
    '<section data-pane="password" hidden>',
    '<h2 data-password-title>设置密码</h2>',
    '<p class="auth-intro">设置后，下次可以直接用邮箱和密码登录。</p>',
    '<form data-form="password">',
    '<label for="af-new-password">新密码 · 至少 8 位</label>',
    '<input id="af-new-password" name="password" type="password" autocomplete="new-password" minlength="8" required>',
    '<label for="af-confirm-password">确认密码</label>',
    '<input id="af-confirm-password" name="confirm" type="password" autocomplete="new-password" minlength="8" required>',
    '<button class="auth-primary" type="submit">保存密码</button>',
    '<div class="auth-links"><button class="auth-link" type="button" data-action="skip-password">稍后设置</button></div>',
    '</form></section>',
    '<section data-pane="account" hidden>',
    '<h2>我的账户</h2>',
    '<p class="auth-account-email" data-account-email></p>',
    '<button class="auth-primary" type="button" data-action="signout">注销登录</button>',
    '<div class="auth-links"><button class="auth-link" type="button" data-action="set-password">设置 / 修改密码</button></div>',
    '</section>',
    '<p class="auth-status" role="status" aria-live="polite"></p>',
    '</div>'
  ].join("");
  document.body.append(dialog);

  const find = (selector) => dialog.querySelector(selector);
  const credentials = find('[data-form="credentials"]');
  const codeForm = find('[data-form="code"]');
  const passwordForm = find('[data-form="password"]');
  const emailInput = find("#af-auth-email");
  const passwordInput = find("#af-auth-password");
  const codeInput = find("#af-auth-code");
  const status = find(".auth-status");

  const setStatus = (message = "", error = false) => {
    status.textContent = message;
    status.dataset.error = String(error);
  };
  const showPane = (name) => {
    for (const pane of dialog.querySelectorAll("[data-pane]")) pane.hidden = pane.dataset.pane !== name;
    const oldTitle = find("#af-pane-title");
    if (oldTitle) oldTitle.removeAttribute("id");
    if (name !== "auth") find('[data-pane="' + name + '"] h2').id = "af-pane-title";
    dialog.setAttribute("aria-labelledby", name === "auth" ? "af-auth-title" : "af-pane-title");
  };
  const remainingSeconds = () => Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  const refreshButtons = () => {
    for (const button of dialog.querySelectorAll('button:not([data-action="close"])')) button.disabled = busy;
    const remaining = remainingSeconds();
    const resend = find('[data-action="resend"]');
    resend.disabled = busy || remaining > 0;
    resend.textContent = remaining ? remaining + " 秒后重发" : "重新发送";
    if (method === "otp" || mode === "register") find("[data-submit]").disabled = busy || remaining > 0;
  };
  const setBusy = (value) => { busy = value; dialog.setAttribute("aria-busy", String(value)); refreshButtons(); };
  const clearPending = () => {
    pending = null;
    codeInput.value = "";
    try { sessionStorage.removeItem(storageKey); } catch (_) {}
  };
  const updateAccount = (nextSession) => {
    session = nextSession;
    for (const button of document.querySelectorAll(".auth-corner[data-auth-open]")) {
      button.textContent = session?.user ? "我的账户" : "登录 / 注册";
      button.setAttribute("aria-label", session?.user ? "打开我的账户" : "打开登录与注册窗口");
    }
    find("[data-account-email]").textContent = session?.user?.email || "";
  };
  const renderAuth = () => {
    showPane("auth");
    for (const tab of dialog.querySelectorAll("[data-mode]")) {
      const selected = tab.dataset.mode === mode;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    find("#af-auth-panel").setAttribute("aria-labelledby", "af-tab-" + mode);
    find("#af-auth-title").textContent = mode === "register" ? "注册" : "登录";
    const usePassword = mode === "login" && method === "password";
    find("[data-password-field]").hidden = !usePassword;
    passwordInput.required = usePassword;
    find("[data-method-links]").hidden = mode === "register";
    find('[data-action="method"]').textContent = usePassword ? "用验证码登录" : "用密码登录";
    find('[data-action="forgot"]').hidden = !usePassword;
    find("[data-intro]").textContent = mode === "register" ? "用邮箱验证码创建账户，验证后可设置密码。" : resetPassword ? "先验证邮箱，再设置新密码。" : usePassword ? "登录你的 Ad Fontes 账户。" : "向已注册的邮箱发送登录验证码。";
    find("[data-submit]").textContent = usePassword ? "登录" : "发送验证码";
    credentials.hidden = Boolean(pending);
    codeForm.hidden = !pending;
    find("[data-verify]").textContent = resetPassword ? "验证邮箱" : mode === "register" ? "验证并注册" : "验证并登录";
    if (pending) find("[data-sent-to]").textContent = "验证码已发送至 " + pending.email;
    refreshButtons();
  };
  const errorMessage = (error, context) => {
    const code = error?.code || "";
    const message = String(error?.message || "").toLowerCase();
    if (code === "invalid_credentials") return "邮箱或密码不正确，请重试。";
    if (code === "otp_expired") return "验证码不正确或已过期，请重试或重新发送。";
    if (code === "user_not_found" || message.includes("signups not allowed")) return "这个邮箱尚未注册，请切换到注册。";
    if (code.includes("rate_limit") || error?.status === 429 || message.includes("rate limit")) return "请求较频繁，请稍后再试。";
    if (code === "weak_password") return "密码强度不足，请使用更长的密码，并组合字母和数字。";
    if (code === "same_password") return "新密码与当前密码相同，请换一个。";
    if (message.includes("fetch") || message.includes("network")) return "网络连接失败，请稍后重试。";
    return context === "password" ? "密码未能保存，请稍后重试。" : context === "code" ? "验证码未能验证，请检查后重试。" : context === "send" ? "验证码未能发送，请稍后重试。" : "登录失败，请检查邮箱和密码。";
  };
  const showPassword = (reset = false) => {
    showPane("password");
    passwordForm.reset();
    find("[data-password-title]").textContent = reset ? "设置新密码" : "设置密码";
    setStatus();
    find("#af-new-password").focus();
  };
  const authenticated = (nextSession, byPassword = false) => {
    updateAccount(nextSession);
    clearPending();
    passwordInput.value = "";
    setStatus();
    if (!byPassword && (resetPassword || !nextSession.user.user_metadata?.ad_fontes_password_set)) showPassword(resetPassword);
    else dialog.close();
  };
  const open = () => {
    if (dialog.open) return;
    setStatus();
    if (session?.user) showPane("account");
    else renderAuth();
    dialog.showModal();
    if (!client) setStatus("账户服务暂未加载，请刷新页面后重试。", true);
    if (!session?.user) (pending ? codeInput : emailInput).focus();
  };
  window.AdFontesAuthUI = { open };

  document.addEventListener("click", (event) => {
    if (!event.target.closest?.("[data-auth-open]")) return;
    event.preventDefault();
    open();
  });
  dialog.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (!busy && event.target.matches("[role='tab']") && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      mode = event.key === "Home" ? "login" : event.key === "End" ? "register" : mode === "login" ? "register" : "login";
      method = "password";
      resetPassword = false;
      clearPending();
      setStatus();
      renderAuth();
      find('[data-mode="' + mode + '"]').focus();
    }
  });
  dialog.addEventListener("click", async (event) => {
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
      return;
    }
    const tab = event.target.closest("[data-mode]");
    if (tab && !busy) {
      mode = tab.dataset.mode;
      method = "password";
      resetPassword = false;
      clearPending();
      setStatus();
      renderAuth();
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "close") { dialog.close(); return; }
    if (busy || !action) return;
    if (action === "method" || action === "forgot") {
      method = action === "forgot" ? "otp" : method === "password" ? "otp" : "password";
      resetPassword = action === "forgot";
      clearPending();
      setStatus();
      renderAuth();
      emailInput.focus();
    } else if (action === "change-email") {
      clearPending();
      setStatus();
      renderAuth();
      emailInput.focus();
    } else if (action === "resend") {
      await sendCode(pending?.email);
    } else if (action === "set-password") {
      showPassword(true);
    } else if (action === "skip-password") {
      dialog.close();
    } else if (action === "signout" && client) {
      setBusy(true);
      setStatus("正在注销登录……");
      try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        updateAccount(null);
        clearPending();
        mode = "login";
        method = "password";
        resetPassword = false;
        renderAuth();
        setStatus("已注销登录。");
      } catch (_) { setStatus("注销登录失败，请稍后重试。", true); }
      finally { setBusy(false); }
    }
  });

  async function sendCode(email) {
    if (!client || busy || remainingSeconds() > 0 || !email) return;
    setBusy(true);
    setStatus("正在发送验证码……");
    try {
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: mode === "register" } });
      if (error) throw error;
      cooldownUntil = Date.now() + 60000;
      pending = { email, mode, resetPassword, sentAt: Date.now() };
      try { sessionStorage.setItem(storageKey, JSON.stringify(pending)); } catch (_) {}
      renderAuth();
      setStatus("请在邮箱中查看 6 位验证码。");
      codeInput.focus();
    } catch (error) { setStatus(errorMessage(error, "send"), true); }
    finally { setBusy(false); }
  }

  credentials.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client || busy) return;
    const email = emailInput.value.trim().toLowerCase();
    if (mode === "register" || method === "otp") { await sendCode(email); return; }
    setBusy(true);
    setStatus("正在登录……");
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password: passwordInput.value });
      if (error) throw error;
      if (!data.session) throw new Error("No session");
      authenticated(data.session, true);
    } catch (error) { setStatus(errorMessage(error, "login"), true); }
    finally { setBusy(false); }
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6); });
  codeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client || busy || !pending) return;
    setBusy(true);
    setStatus("正在验证……");
    try {
      const { data, error } = await client.auth.verifyOtp({ email: pending.email, token: codeInput.value.trim(), type: "email" });
      if (error) throw error;
      if (!data.session) throw new Error("No session");
      authenticated(data.session);
    } catch (error) { setStatus(errorMessage(error, "code"), true); }
    finally { setBusy(false); }
  });
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client || busy || !session?.user) return;
    const password = find("#af-new-password").value;
    if (password !== find("#af-confirm-password").value) { setStatus("两次输入的密码不一致。", true); find("#af-confirm-password").focus(); return; }
    setBusy(true);
    setStatus("正在保存密码……");
    try {
      const { data, error } = await client.auth.updateUser({ password, data: { ad_fontes_password_set: true } });
      if (error) throw error;
      if (data.user) updateAccount({ ...session, user: data.user });
      passwordForm.reset();
      resetPassword = false;
      dialog.close();
    } catch (error) { setStatus(errorMessage(error, "password"), true); }
    finally { setBusy(false); }
  });

  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (saved?.email && ["login", "register"].includes(saved.mode) && Date.now() - saved.sentAt < 3600000) {
      pending = saved;
      mode = saved.mode;
      method = "otp";
      resetPassword = Boolean(saved.resetPassword);
      cooldownUntil = saved.sentAt + 60000;
      emailInput.value = saved.email;
    }
  } catch (_) {}
  setInterval(refreshButtons, 1000);
  if (client) {
    client.auth.onAuthStateChange((_event, nextSession) => updateAccount(nextSession));
    client.auth.getSession().then(({ data, error }) => {
      updateAccount(error ? null : data.session);
      const query = new URLSearchParams(window.location.search);
      if (query.get("auth") === "login" || query.get("auth") === "account") {
        query.delete("auth");
        const search = query.toString();
        history.replaceState(null, "", window.location.pathname + (search ? "?" + search : "") + window.location.hash);
        open();
      }
    }).catch(() => updateAccount(null));
  }
})();
