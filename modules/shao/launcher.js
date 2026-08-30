(function () {
  'use strict';
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem('shao-theme');
    if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  } catch (_) {}
  document.getElementById('toggle').addEventListener('click', function () {
    var current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.dataset.theme = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('shao-theme', root.dataset.theme); } catch (_) {}
  });

  var address = document.getElementById('remote-address');
  var open = document.getElementById('remote-open');
  var copy = document.getElementById('copy-address');
  var status = document.getElementById('copy-status');
  // Only the local configuration is fetched. A CORS or mixed-content failure
  // must never be interpreted as evidence that the remote service is offline.
  fetch('config.json').then(function (response) {
    if (!response.ok) throw new Error('configuration unavailable');
    return response.json();
  }).then(function (config) {
    var url = new URL(config.remoteUrl);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error('invalid remote URL');
    address.textContent = url.href;
    open.href = url.href;
    open.hidden = false;
    copy.disabled = false;
    copy.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(url.href);
        status.textContent = '远程入口地址已复制。';
      } catch (_) {
        var range = document.createRange();
        range.selectNodeContents(address);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = '无法自动复制，地址已选中，请按 Ctrl+C 或使用设备的复制命令。';
      }
    });
  }).catch(function () {
    address.textContent = '入口配置暂不可用';
    status.textContent = '未能读取本站入口配置，远程服务状态仍未验证。';
  });
})();
