'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const scriptPath = path.join(__dirname, '../shared/site-shell.js');
const {legacyBeilinTarget} = require(scriptPath);

test('only the exact, established Beilin aliases redirect', () => {
  for (const base of ['', '/ad-fontes']) {
    for (const suffix of ['', '/', '/index.html', '/main.html']) {
      assert.equal(legacyBeilinTarget(base + '/modules/modules/beilin' + suffix), base + '/modules/beilin/index.html');
    }
  }
  for (const pathname of ['/ad-fontes/', '/ad-fontes/no-such-page', '/modules/beilin',
    '/ad-fontes/anything/modules/modules/beilin/', '/other/modules/modules/beilin/',
    '/ad-fontes/modules/modules/beilin/extra', '/ad-fontes/modules/modules/beilin-fake',
    '/ad-fontes/modules/modules/beilin//', '/ad-fontes/modules/modules/beilin/INDEX.html']) {
    assert.equal(legacyBeilinTarget(pathname), null, pathname);
  }
});

function render(pathname, storageBlocked = false) {
  const missing = {textContent: ''};
  const redirects = [];
  const document = {readyState:'complete', documentElement:{dataset:{}},
    querySelectorAll:()=>[], getElementById:()=>missing};
  vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), {
    document, window:{matchMedia:()=>({matches:false})},
    localStorage:{getItem:()=>{if (storageBlocked) throw Error('blocked'); return null;}},
    location:{pathname, search:'?q=history', hash:'#item', replace:url=>redirects.push(url)},
  });
  return {missing, redirects};
}

test('ordinary 404 exposes literal path and never redirects, even with blocked storage', () => {
  const pathname='/ad-fontes/missing-%3Cscript%3E';
  const result=render(pathname, true);
  assert.equal(result.missing.textContent, pathname);
  assert.deepEqual(result.redirects, []);
});

test('known alias preserves search and fragment', () => {
  assert.deepEqual(render('/ad-fontes/modules/modules/beilin').redirects,
    ['/ad-fontes/modules/beilin/index.html?q=history#item']);
});

test('404 is index-excluded and does not promise a nonexistent redirect', () => {
  const html=fs.readFileSync(path.join(__dirname, '../404.html'), 'utf8');
  assert.match(html, /name="robots" content="noindex"/);
  assert.match(html, /id="missing-path"/);
  assert.match(html, /<main\b/);
  assert.doesNotMatch(html, /正在跳转/);
});
