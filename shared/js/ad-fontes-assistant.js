(() => {
  const script = document.currentScript;
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const endpoint = script?.dataset.endpoint || window.AD_FONTES_ASSISTANT_API || (localHost ? 'http://127.0.0.1:8787/api/chat' : '');

  // Do not show a dead public widget. Configure an HTTPS endpoint before enabling it on Pages.
  if (!endpoint) return;

  const root = document.createElement('div');
  root.className = 'af-assistant';
  root.innerHTML = `
    <button class="af-assistant-launcher" type="button" aria-expanded="false" aria-controls="af-assistant-panel">
      <span class="af-assistant-launcher-mark" aria-hidden="true">?</span>
      <span class="af-assistant-launcher-copy"><strong>研究助手</strong><small>只查本站公开材料</small></span>
    </button>
    <section class="af-assistant-panel" id="af-assistant-panel" role="dialog" aria-modal="false" aria-labelledby="af-assistant-title" hidden>
      <header class="af-assistant-head">
        <div><p class="af-assistant-kicker">Ad Fontes / Reading Desk</p><h2 class="af-assistant-title" id="af-assistant-title">站内研究助手</h2></div>
        <button class="af-assistant-close" type="button" aria-label="关闭研究助手">×</button>
      </header>
      <div class="af-assistant-messages" aria-live="polite" aria-atomic="false"></div>
      <div class="af-assistant-prompts" aria-label="示例问题">
        <button class="af-assistant-prompt" type="button">本站有哪些模块？</button>
        <button class="af-assistant-prompt" type="button">欧罗巴年鉴收录什么？</button>
        <button class="af-assistant-prompt" type="button">乐理模块从哪里讲起？</button>
      </div>
      <form class="af-assistant-form">
        <textarea class="af-assistant-input" rows="2" maxlength="1800" placeholder="问一个关于本站材料的问题……" aria-label="研究助手问题"></textarea>
        <button class="af-assistant-submit" type="submit">发送</button>
      </form>
      <p class="af-assistant-note">回答只依据本站公开页面；材料不足时会明确说明。</p>
    </section>
  `;
  document.body.appendChild(root);

  const launcher = root.querySelector('.af-assistant-launcher');
  const panel = root.querySelector('.af-assistant-panel');
  const close = root.querySelector('.af-assistant-close');
  const messages = root.querySelector('.af-assistant-messages');
  const form = root.querySelector('.af-assistant-form');
  const input = root.querySelector('.af-assistant-input');
  const submit = root.querySelector('.af-assistant-submit');
  let welcomed = false;

  const addMessage = (role, content, sources = []) => {
    const message = document.createElement('div');
    message.className = `af-assistant-message ${role}`;
    content.split(/\n{2,}/).filter(Boolean).forEach((paragraph) => {
      const p = document.createElement('p');
      p.textContent = paragraph.trim();
      message.appendChild(p);
    });
    if (sources.length) {
      const sourceBox = document.createElement('div');
      sourceBox.className = 'af-assistant-sources';
      sources.forEach((source) => {
        const link = document.createElement('a');
        link.href = source.url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = `↗ ${source.title}`;
        sourceBox.appendChild(link);
      });
      message.appendChild(sourceBox);
    }
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  };

  const openPanel = () => {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    if (!welcomed) {
      addMessage('assistant', '我只查阅 Ad Fontes 已公开的页面。你可以问模块内容、人物条目、时间线或页面之间的关系。');
      welcomed = true;
    }
    input.focus();
  };

  const closePanel = () => {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  };

  launcher.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
  close.addEventListener('click', closePanel);
  root.querySelectorAll('.af-assistant-prompt').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = button.textContent;
      input.focus();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || submit.disabled) return;
    addMessage('user', message);
    input.value = '';
    submit.disabled = true;
    const pending = addMessage('assistant pending', '正在查阅本站材料……');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 65_000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `服务返回 ${response.status}`);
      pending.remove();
      addMessage('assistant', data.answer || '没有收到文本回答。', Array.isArray(data.sources) ? data.sources : []);
    } catch (error) {
      pending.remove();
      const reason = error.name === 'AbortError' ? '请求超时了。' : (error.message || '连接失败。');
      addMessage('assistant', `${reason} 请确认本地助手服务已经启动，或稍后再试。`);
    } finally {
      window.clearTimeout(timeout);
      submit.disabled = false;
      input.focus();
    }
  });
})();
