/* Addressable reading controls layered over the unchanged proceedings renderer. */
(function () {
  'use strict';
  let installed = false;
  function install() {
    const app = window.ProceedingsApp, routes = window.ProceedingsRoutes;
    if (installed || !app?.ready || !routes) return;
    installed = true;
    const panel = document.getElementById('panel'), lightbox = document.getElementById('lightbox');
    const main = document.querySelector('main'), baseTitle = document.title;
    const records = new Map(app.talks.map(record => [record.id, record]));
    const references = window.ProceedingsReferences;
    const sessions = new Map(references.sessions.items.map(item => [item.id, item]));
    const speakers = new Map(references.speakers.items.map(item => [item.id, item]));
    const sessionFor = new Map(references.sessions.items.flatMap(item => item.recordIds.map(id => [id, item.id])));
    const labels = {overview:'概览', keynote:'主旨发言', all:'全部发言', schedule:'会程日历', photos:'现场照片', themes:'主题地图'};
    const old = Object.fromEntries(['go','openPanel','closePanel','openLB','openStreamLB','closeLB'].map(name => [name, app[name]]));
    let activeRoute = {kind:'view', id:app.cur || 'overview'}, appliedHash = null;
    let returnFocus = null, imageFocus = null, backgroundState = null, navigating = false;
    const filterKey = () => JSON.stringify(['type','day','cat','q'].map(key => app.filters[key]));
    let renderedAllFilters = app._rendered.all ? filterKey() : null;

    const tools = document.createElement('section');
    tools.className = 'proceedings-reader-tools';
    tools.innerHTML = '<nav aria-label="纪要导航"><a href="../../index.html">首页</a><a href="../index.html">馆藏目录</a><a href="#view=overview" data-proceedings-route>纪要概览</a><button type="button" data-copy-link>复制当前链接</button></nav><p id="proceedings-route-status" role="status" aria-live="polite" tabindex="-1"></p>';
    main.before(tools);
    const routeStatus = document.getElementById('proceedings-route-status');
    const feedback = document.createElement('div');
    feedback.className = 'proceedings-copy-feedback';
    feedback.innerHTML = '<p id="proceedings-copy-status" role="status" aria-live="polite"></p><label hidden>链接地址<input id="proceedings-copy-value" type="text" readonly></label>';
    tools.append(feedback);
    const copyStatus = feedback.querySelector('p'), copyValue = feedback.querySelector('input');
    const background = [...document.querySelectorAll('header.topbar,nav.tabs,main,footer'), tools];
    panel.inert = true;
    panel.setAttribute('aria-hidden', 'true');
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', '图片浏览');
    lightbox.inert = true;
    lightbox.querySelector('.lb-close')?.setAttribute('aria-label', '关闭图片');
    lightbox.querySelector('.lb-prev')?.setAttribute('aria-label', '上一张图片');
    lightbox.querySelector('.lb-next')?.setAttribute('aria-label', '下一张图片');

    const entityRoute = record => ({kind:record.session_type === 'poster' ? 'poster' : 'presentation', id:record.id});
    const hashOf = route => routes.serializeRoute(route);
    const currentView = () => routes.VIEW_IDS.includes(app.cur) ? app.cur : 'overview';
    function focus(element) {if (element) {element.setAttribute('tabindex', '-1'); element.focus({preventScroll:true});}}
    function setBackground(blocked) {
      if (blocked && !backgroundState) {
        backgroundState = background.map(element => [element, element.inert]);
        background.forEach(element => {element.inert = true;});
      } else if (!blocked && backgroundState) {
        backgroundState.forEach(([element, inert]) => {element.inert = inert;});
        backgroundState = null;
      }
    }
    function link(route, text) {
      const anchor = document.createElement('a');
      anchor.href = hashOf(route); anchor.dataset.proceedingsRoute = ''; anchor.textContent = text;
      return anchor;
    }
    function copyButton(route) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.copyLink = hashOf(route); button.textContent = '复制链接';
      return button;
    }
    function enhance(root) {
      root.querySelectorAll('.card[onclick],.kcard[onclick],.sch-talk[onclick]').forEach(card => {
        if (card.dataset.proceedingsEnhanced) return;
        const id = card.getAttribute('onclick').match(/App\.openPanel\('([^']+)'\)/)?.[1];
        const record = records.get(id); if (!record) return;
        card.dataset.proceedingsEnhanced = 'true'; card.dataset.recordId = id;
        const title = card.querySelector('h3,.st-title'), byline = card.querySelector('.c-author,.k-author,.st-name');
        if (title) title.replaceChildren(link(entityRoute(record), title.textContent));
        if (byline) {
          const anchor = link({kind:'speaker',id:'speaker-' + id}, byline.textContent);
          anchor.title = '查看原署名记录'; byline.replaceChildren(anchor);
        }
        const actions = document.createElement('span'); actions.className = 'proceedings-record-links';
        actions.append(copyButton(entityRoute(record))); card.append(actions);
      });
      root.querySelectorAll('.sch-room').forEach(room => {
        if (room.querySelector('.proceedings-session-link')) return;
        const id = room.querySelector('[data-record-id]')?.dataset.recordId;
        const sessionId = sessionFor.get(id); if (!sessionId) return;
        const action = link({kind:'session',id:sessionId}, '日程分组'); action.className = 'proceedings-session-link';
        room.querySelector('.rname').append(action, copyButton({kind:'session',id:sessionId}));
      });
      root.querySelectorAll('.gallery img[onclick],.pcell[onclick]').forEach(element => {
        element.tabIndex = 0; element.setAttribute('role', 'button');
        element.setAttribute('aria-label', element.classList.contains('pcell') ? '查看照片：' + element.textContent.trim() : '放大查看图片');
        element.dataset.proceedingsActivate = '';
      });
    }
    for (const [name, view] of [['renderOverview','overview'],['renderKeynotes','keynote'],['renderAll','all'],['renderSchedule','schedule'],['renderThemes','themes'],['renderPhotos','photos'],['drawPhotos','photos']]) {
      const render = app[name];
      app[name] = function (...args) {
        const result = render.apply(this, args);
        if (name === 'renderAll') renderedAllFilters = filterKey();
        enhance(document.getElementById('view-' + view)); saveState(); return result;
      };
    }
    function saveState() {
      if (appliedHash === null || navigating) return;
      const state = {...(history.state || {}), proceedings:{view:currentView(), filters:{...app.filters}}};
      history.replaceState(state, '', location.href);
    }
    function goOriginal(view) {
      old.go.call(app, view);
      if (view === 'all' && renderedAllFilters !== filterKey()) app.renderAll();
      enhance(document.getElementById('view-' + view));
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo({top:0,behavior:'instant'});
    }
    function closeOriginal() {
      old.closePanel.call(app); panel.inert = true; panel.setAttribute('aria-hidden', 'true');
      delete panel.dataset.routeKind; delete panel.dataset.routeId;
      document.body.classList.remove('proceedings-record-open');
      tools.append(feedback); setBackground(false);
    }
    function resolve(route) {
      if (route.kind === 'view') return routes.VIEW_IDS.includes(route.id) ? route : null;
      if (route.kind === 'session' || route.kind === 'speaker') return (route.kind === 'session' ? sessions : speakers).has(route.id) ? route : null;
      const record = records.get(route.id);
      return record && entityRoute(record).kind === route.kind ? route : null;
    }
    function referencePanel(route) {
      const reference = (route.kind === 'session' ? sessions : speakers).get(route.id);
      const members = reference.recordIds.map(id => records.get(id)), first = members[0];
      const title = route.kind === 'speaker' ? first.name : [first.day ? '6月' + first.day.slice(3) + '日' : '', first.period, first.room].filter(Boolean).join(' · ');
      panel.innerHTML = '<div class="panel-head"><button class="close" type="button">×</button><span class="p-type"></span><h2></h2><div class="p-aff"></div></div><div class="panel-body"><div class="proceedings-reference-records"></div></div>';
      panel.querySelector('.close').addEventListener('click', () => app.closePanel());
      panel.querySelector('.p-type').textContent = route.kind === 'speaker' ? '原署名记录' : '日程分组';
      panel.querySelector('h2').textContent = title;
      panel.querySelector('.p-aff').textContent = route.kind === 'speaker' ? (first.affiliation || '') : members.length + ' 条发言与展板';
      panel.querySelector('.proceedings-reference-records').innerHTML = members.map(record => app.card(record)).join('');
      panel.classList.add('open'); document.getElementById('overlay').classList.add('open'); panel.scrollTop = 0;
    }
    function decoratePanel(route) {
      const head = panel.querySelector('.panel-head'), heading = head.querySelector('h2');
      heading.id = 'proceedings-panel-title';
      panel.dataset.routeKind = route.kind; panel.dataset.routeId = route.id;
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', heading.id); panel.setAttribute('aria-hidden', 'false'); panel.inert = false;
      head.querySelector('.close').setAttribute('aria-label', '关闭详情，返回' + labels[currentView()]);
      const actions = document.createElement('div'); actions.className = 'proceedings-entry-tools';
      actions.append(link(route, '独立地址'), copyButton(route));
      const print = document.createElement('button'); print.type = 'button'; print.dataset.printRecord = ''; print.textContent = '打印'; actions.append(print);
      if (route.kind === 'presentation' || route.kind === 'poster') {
        actions.append(link({kind:'speaker',id:'speaker-' + route.id}, '原署名记录'));
        if (sessionFor.has(route.id)) actions.append(link({kind:'session',id:sessionFor.get(route.id)}, '日程分组'));
      }
      head.append(actions, feedback);
      const source = document.createElement('section'); source.className = 'proceedings-print-source';
      const address = document.createElement('p'); address.textContent = '独立地址：' + new URL(hashOf(route), location.href).href; source.append(address);
      document.querySelectorAll('footer p').forEach(paragraph => {const copy = document.createElement('p'); copy.textContent = paragraph.textContent; source.append(copy);});
      panel.append(source);
      enhance(panel); document.body.classList.add('proceedings-record-open'); setBackground(true);
      document.getElementById('proceedings-opening-skip')?.click();
      document.title = heading.textContent + ' — ' + baseTitle;
      focus(heading);
    }
    function navigate(requested, mode = 'push', restore = null) {
      const route = resolve(requested);
      if (mode === 'push') saveState();
      navigating = true;
      if (!route) {
        app.closeLB(); closeOriginal(); goOriginal('overview');
        activeRoute = {kind:'invalid',hash:location.hash}; appliedHash = location.hash;
        routeStatus.replaceChildren(document.createTextNode('未找到此地址对应的条目。'), link({kind:'view',id:'overview'}, '返回纪要概览'));
        tools.querySelector('[data-copy-link]').disabled = true;
        document.title = '未找到条目 — ' + baseTitle; navigating = false; saveState(); focus(routeStatus); return false;
      }
      if (restore?.filters) {
        app.filters = {...app.filters, ...restore.filters}; document.getElementById('search').value = app.filters.q;
        if (app._rendered.all) app.renderAll();
      }
      if (restore?.view && routes.VIEW_IDS.includes(restore.view) && currentView() !== restore.view) goOriginal(restore.view);
      routeStatus.textContent = ''; copyStatus.textContent = ''; copyValue.parentElement.hidden = true;
      if (app.lbOpen) app.closeLB();
      if (route.kind === 'view') {
        const wasOpen = panel.classList.contains('open'); closeOriginal();
        if (currentView() !== route.id) goOriginal(route.id);
        else {
          if (route.id === 'all' && renderedAllFilters !== filterKey()) app.renderAll();
          enhance(document.getElementById('view-' + route.id));
        }
        document.title = labels[route.id] + ' — ' + baseTitle;
        if (wasOpen && returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({preventScroll:true});
        else if (mode !== 'initial') focus(document.querySelector('#view-' + route.id + ' h1,#view-' + route.id + ' h2'));
      } else {
        if (!panel.classList.contains('open')) returnFocus = document.activeElement;
        if (route.kind === 'session' || route.kind === 'speaker') referencePanel(route);
        else old.openPanel.call(app, route.id);
        decoratePanel(route);
      }
      activeRoute = route;
      const hash = hashOf(route), state = {...(history.state || {}), proceedings:{view:currentView(),filters:{...app.filters}}};
      if (mode === 'push' && location.hash !== hash) history.pushState(state, '', hash);
      else history.replaceState(state, '', hash);
      appliedHash = location.hash;
      navigating = false;
      tools.querySelector('[data-copy-link]').dataset.copyLink = hash;
      tools.querySelector('[data-copy-link]').disabled = false;
      return true;
    }
    app.go = view => navigate({kind:'view',id:view});
    app.openPanel = id => {const record = records.get(id); return record ? navigate(entityRoute(record)) : false;};
    app.closePanel = () => panel.classList.contains('open') ? navigate({kind:'view',id:currentView()}) : undefined;
    function openLightbox(method, args) {
      imageFocus = document.activeElement; old[method].apply(app, args);
      if (app.lbOpen) {setBackground(true); panel.inert = true; lightbox.inert = false; lightbox.querySelector('.lb-close').focus();}
    }
    app.openLB = (...args) => openLightbox('openLB', args);
    app.openStreamLB = (...args) => openLightbox('openStreamLB', args);
    app.closeLB = () => {
      const wasOpen = app.lbOpen; old.closeLB.call(app); lightbox.inert = true;
      if (panel.classList.contains('open')) panel.inert = false; else setBackground(false);
      if (wasOpen && imageFocus?.isConnected) imageFocus.focus({preventScroll:true});
    };
    async function copy(hash) {
      const value = new URL(hash || hashOf(activeRoute), location.href).href;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(value); copyStatus.textContent = '链接已复制。'; copyValue.parentElement.hidden = true;
      } catch (_) {
        copyStatus.textContent = '未能自动复制，请复制下方链接。'; copyValue.value = value;
        copyValue.parentElement.hidden = false; copyValue.focus(); copyValue.select();
      }
    }
    document.addEventListener('click', event => {
      const anchor = event.target.closest('a[data-proceedings-route]');
      if (anchor) {
        event.stopPropagation();
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); navigate(routes.parseHash(anchor.hash)); return;
      }
      const button = event.target.closest('[data-copy-link],[data-print-record]');
      if (button) {
        event.preventDefault(); event.stopPropagation();
        if (button.hasAttribute('data-copy-link')) void copy(button.dataset.copyLink);
        else window.print();
      }
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && (app.lbOpen || panel.classList.contains('open'))) {
        event.preventDefault(); event.stopImmediatePropagation(); if (app.lbOpen) app.closeLB(); else app.closePanel(); return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-proceedings-activate]')) {
        event.preventDefault(); event.target.click(); return;
      }
      const modal = app.lbOpen ? lightbox : panel.classList.contains('open') ? panel : null;
      if (event.key !== 'Tab' || !modal) return;
      const controls = [...modal.querySelectorAll('a[href],button,input,[tabindex="0"]')].filter(element => !element.disabled && !element.closest('[hidden],[inert]'));
      if (!controls.length) {event.preventDefault(); focus(modal); return;}
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {event.preventDefault(); first.focus();}
    }, true);
    function restoreRoute() {
      if (appliedHash === location.hash) return;
      navigate(routes.parseHash(location.hash), 'restore', history.state?.proceedings);
    }
    window.addEventListener('hashchange', restoreRoute);
    window.addEventListener('popstate', restoreRoute);
    window.ProceedingsReader = {navigate, get route() {return activeRoute;}};
    navigate(routes.parseHash(location.hash), 'initial', history.state?.proceedings);
  }
  if (window.ProceedingsApp?.ready) install();
  else window.addEventListener('proceedings:ready', install, {once:true});
})();
