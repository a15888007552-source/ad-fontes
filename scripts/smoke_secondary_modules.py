"""Reusable checks for the final smoke; caller owns the browser and page.

Call run_secondary_smoke(page, base_url) with a synchronous Playwright Page and
the site root URL. This module never starts a browser or accesses private text.
Busoni loading/failure/focus tests replace unlock with synthetic local results;
they do not read or decrypt payload.enc.json or use any real password.
"""


def run_secondary_smoke(page, base_url):
    base_url = base_url.rstrip('/') + '/'
    passed = []

    page.goto(base_url + 'modules/shao/')
    page.wait_for_function("document.querySelector('#copy-address').disabled === false")
    assert page.locator('#remote-health').inner_text() == '状态未验证'
    assert page.locator('#remote-open').get_attribute('href').startswith(('http://', 'https://'))
    page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:async()=>{throw new Error('denied')}}})")
    page.locator('#copy-address').click()
    page.wait_for_function("document.querySelector('#copy-status').textContent.includes('地址已选中')")
    passed.append('Shao configuration, unverified state, denied-clipboard fallback')

    # Bypass storage access for this key, without reading or changing any saved value.
    page.add_init_script("""if(location.pathname.includes('/modules/busoni/')){
      for(const method of ['getItem','setItem','removeItem']){
        const original=Storage.prototype[method];
        Storage.prototype[method]=function(key,...args){
          if(key==='ad-fontes-busoni-password')return method==='getItem'?null:undefined;
          return original.call(this,key,...args);
        };
      }
    }""")
    page.goto(base_url + 'modules/busoni/')
    assert page.locator('#finding-aid').is_visible()
    page.locator('#pwd').fill('synthetic-ui-test')
    page.locator('#show-password').click()
    assert page.locator('#pwd').get_attribute('type') == 'text'
    page.locator('#show-password').click()
    assert page.locator('#pwd').get_attribute('type') == 'password'
    page.evaluate("const e=new KeyboardEvent('keyup');Object.defineProperty(e,'getModifierState',{value:key=>key==='CapsLock'});document.querySelector('#pwd').dispatchEvent(e)")
    assert 'Caps Lock' in page.locator('#caps').inner_text()
    page.evaluate("window.unlock=()=>new Promise((resolve,reject)=>{window.rejectSyntheticUnlock=reject})")
    page.locator('#unlockBtn').click()
    assert page.locator('#unlockBtn').is_disabled()
    assert page.locator('#unlockForm').get_attribute('aria-busy') == 'true'
    page.evaluate("window.rejectSyntheticUnlock(new Error('synthetic failure'))")
    page.wait_for_function("!document.querySelector('#unlockBtn').disabled")
    assert page.locator('#err').inner_text().startswith('未能解锁')
    assert page.locator('#pwd').evaluate('(el)=>el===document.activeElement')
    page.evaluate("window.unlock=async()=>'<main id=synthetic-unlocked><h1>UI focus test</h1></main>'")
    page.locator('#unlockBtn').click()
    page.wait_for_function("document.activeElement && document.activeElement.id === 'synthetic-unlocked'")
    passed.append('Busoni public Finding Aid, visibility, synthetic loading/failure/success focus; no private payload')

    page.goto(base_url + 'modules/philosophy/?q=术语#p18')
    assert page.locator('#view-translation').is_visible()
    assert page.locator('#search').input_value() == '术语'
    assert page.locator('#p18').is_visible()
    page.reload()
    assert page.locator('#p18').is_visible()
    page.locator('#tabs button[data-view="notes"]').click()
    page.go_back()
    assert page.locator('#view-translation').is_visible()
    page.go_forward()
    assert page.locator('#view-notes').is_visible()
    page.goto(base_url + 'modules/philosophy/#chapter-10')
    assert page.locator('#view-translation').is_visible()
    page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:async(text)=>{window.copiedReference=text}}})")
    page.locator('#chapter-10 .copy-reference').click()
    page.wait_for_function("(window.copiedReference||'').includes('#chapter-10')")
    page.goto(base_url + 'modules/philosophy/#note157')
    assert page.locator('#view-notes').is_visible()
    page.emulate_media(media='print')
    assert page.locator('#view-notes').is_visible()
    assert not page.locator('#tabs').is_visible()
    page.emulate_media(media='screen')
    passed.append('Philosophy page/chapter/note URLs, search reload, history, citation and print')

    page.goto(base_url + 'modules/theory/?q=泛音#v=foundation&item=f-harmonics')
    assert page.locator('#v-foundation').is_visible()
    assert page.locator('#finder').input_value() == '泛音'
    page.reload()
    assert page.locator('#finder').input_value() == '泛音'
    page.locator('#tabs button[data-v="harmony"]').click()
    page.go_back()
    assert page.locator('#v-foundation').is_visible()
    page.go_forward()
    assert page.locator('#v-harmony').is_visible()
    page.goto(base_url + 'modules/theory/#n-guido')
    assert page.locator('#v-notation').is_visible()
    page.evaluate("Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:async(text)=>{window.copiedReference=text}}})")
    page.locator('#n-guido .copy-reference').click()
    page.wait_for_function("(window.copiedReference||'').includes('item=n-guido')")
    page.locator('#toggle').click()
    theme = page.locator('html').get_attribute('data-theme')
    page.reload()
    assert page.locator('html').get_attribute('data-theme') == theme
    page.goto(base_url + 'modules/theory/#v=notation&item=missing')
    assert page.locator('#v-notation').is_visible()
    assert '未找到该条目' in page.locator('#reader-status').inner_text()
    passed.append('Theory concept URLs, legacy anchors, search reload, history, citation, theme and invalid item')
    return passed
