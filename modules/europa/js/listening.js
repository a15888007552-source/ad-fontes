const text = value => typeof value === "string" ? value.trim() : "";
const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function mediaURL(value, embedded = false) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (embedded) {
      for (const key of [...url.searchParams.keys()]) {
        if (/^auto.?play$|^auto.?start$/i.test(key)) url.searchParams.set(key, "0");
      }
      url.searchParams.set("autoplay", "0");
    }
    return url.href;
  } catch { return null; }
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}

export function createListeningLibrary({dataUrl = new URL("../data/listening.json", import.meta.url)} = {}) {
  let people = null;
  let active = null;
  let sequence = 0;

  function stop() {
    const previous = active;
    active = null;
    if (!previous) return;
    if (previous.audio) {
      previous.audio.pause();
      previous.audio.removeAttribute("src");
      previous.audio.load();
    }
    previous.panel.replaceChildren();
    previous.panel.hidden = true;
    previous.row.classList.remove("is-active");
    previous.button.textContent = previous.embedded ? "打开" : "播放";
    previous.button.setAttribute("aria-label", `${previous.embedded ? "打开播放器" : "播放"}，${previous.title}`);
    previous.button.setAttribute("aria-expanded", "false");
    previous.button.setAttribute("aria-pressed", "false");
  }

  function start(track, host, row, button, panel, url) {
    if (active?.button === button) {
      if (active.embedded) stop();
      else if (!active.audio.paused) active.audio.pause();
      else play(active);
      return;
    }
    stop();
    const session = {host, row, button, panel, url, title: text(track.title), embedded: track.media.type === "embed"};
    active = session;
    row.classList.add("is-active");
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    const status = element("p", "listening-status");
    status.setAttribute("role", "status");
    session.status = status;
    if (session.embedded) {
      const frame = element("iframe", "listening-embed");
      if (new URL(url).hostname === "open.spotify.com") frame.classList.add("listening-embed-compact");
      frame.title = `${session.title} · ${text(track.sourceLabel) || "录音播放器"}`;
      // Spotify's official embed uses its own cross-origin player and login flow.
      if (new URL(url).hostname !== "open.spotify.com") frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation");
      frame.setAttribute("allow", "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture");
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.src = url;
      button.textContent = "收起";
      button.setAttribute("aria-label", `关闭播放器，${session.title}`);
      button.setAttribute("aria-pressed", "true");
      status.textContent = "在播放器内开始聆听；无法载入时可访问录音来源。";
      panel.append(frame, status);
    } else {
      const audio = element("audio", "listening-audio");
      audio.controls = true;
      audio.preload = "none";
      audio.setAttribute("aria-label", session.title);
      session.audio = audio;
      const update = () => {
        if (active !== session) return;
        const label = audio.ended ? "重播" : audio.paused ? "继续" : "暂停";
        button.textContent = label;
        button.setAttribute("aria-label", `${label}，${session.title}`);
        button.setAttribute("aria-pressed", String(!audio.paused && !audio.ended));
      };
      ["play", "pause", "ended"].forEach(name => audio.addEventListener(name, update));
      audio.addEventListener("playing", () => { if (active === session) status.textContent = ""; });
      audio.addEventListener("error", () => fail(session));
      panel.append(audio, status);
      audio.src = url;
      play(session);
    }
  }

  function fail(session) {
    if (active !== session) return;
    session.status.textContent = "暂时无法播放，可重试或访问录音来源。";
    session.button.textContent = "重试";
    session.button.setAttribute("aria-label", `重试播放，${session.title}`);
    session.button.setAttribute("aria-pressed", "false");
  }

  function play(session) {
    session.status.textContent = "正在连接录音…";
    try {
      if (session.audio.error) {
        session.audio.src = session.url;
        session.audio.load();
      }
      Promise.resolve(session.audio.play()).catch(() => fail(session));
    } catch { fail(session); }
  }

  function renderTrack(track, host, index) {
    const row = element("li", "listening-track");
    const copy = element("div", "listening-copy");
    const title = element("span", "listening-title", text(track.title));
    title.title = title.textContent;
    copy.append(title);
    const description = [text(track.subtitle), text(track.performer)].filter(Boolean).join(" · ");
    if (description) copy.append(element("span", "listening-credit", description));
    const links = element("span", "listening-links");
    const sourceURL = mediaURL(track.sourceUrl);
    if (sourceURL) {
      const source = element("a", "listening-source", `${text(track.sourceLabel) || "录音来源"} ↗`);
      source.href = sourceURL;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.setAttribute("aria-label", `${text(track.title)}，${text(track.sourceLabel) || "录音来源"}（新窗口）`);
      links.append(source);
    }
    const licenseURL = mediaURL(track.licenseUrl);
    if (licenseURL) {
      const license = element("a", "listening-source listening-license", `${text(track.licenseLabel) || "录音许可"} ↗`);
      license.href = licenseURL;
      license.target = "_blank";
      license.rel = "noopener noreferrer";
      license.setAttribute("aria-label", `${text(track.title)}，${text(track.licenseLabel) || "录音许可"}（新窗口）`);
      links.append(license);
    }
    if (links.children.length) copy.append(links);
    if (text(track.rights) && host.dataset.listeningContext === "detail") copy.append(element("span", "listening-rights", text(track.rights)));
    const kind = track.media?.type;
    const url = ["audio", "embed"].includes(kind) ? mediaURL(track.media?.url, kind === "embed") : null;
    if (url) {
      const button = element("button", "listening-toggle", kind === "embed" ? "打开" : "播放");
      button.type = "button";
      button.setAttribute("aria-label", `${kind === "embed" ? "打开播放器" : "播放"}，${text(track.title)}`);
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-pressed", "false");
      const panel = element("div", "listening-player");
      panel.id = `listening-player-${++sequence}`;
      panel.hidden = true;
      button.setAttribute("aria-controls", panel.id);
      button.addEventListener("click", () => start(track, host, row, button, panel, url));
      row.append(button, copy, panel);
    } else {
      row.append(element("span", "listening-number", String(index + 1).padStart(2, "0")), copy);
      if (!sourceURL) copy.append(element("span", "listening-unavailable", "录音暂未开放"));
    }
    return row;
  }

  function mount(root = document) {
    if (!people) return;
    const hosts = [...(root.matches?.(".person-listening") ? [root] : []), ...root.querySelectorAll(".person-listening")];
    hosts.forEach(host => {
      if (host.dataset.listeningReady) return;
      host.dataset.listeningReady = "true";
      const entry = people[host.dataset.listeningPerson];
      const tracks = (Array.isArray(entry?.tracks) ? entry.tracks : []).filter(track => track && text(track.title));
      if (!tracks.length && !text(entry?.note)) return;
      host.hidden = false;
      if (!tracks.length) {
        host.append(element("p", "listening-note", text(entry.note)));
        return;
      }
      const heading = element("h5", "listening-heading", "代表作品 · 聆听");
      const list = element("ol", "listening-tracks");
      tracks.forEach((track, index) => list.append(renderTrack(track, host, index)));
      host.append(heading, list);
    });
  }

  function markup(person, context = "card") {
    return `<section class="person-listening" data-listening-person="${escape(person.i)}" data-listening-context="${escape(context)}" aria-label="${escape(person.n)}的作品与录音" hidden></section>`;
  }

  // Only watch the two replaceable panels, not map or graph mutations.
  const observer = new MutationObserver(() => { if (active && !active.host.isConnected) stop(); });
  ["#v-alm", "#dwrap"].forEach(selector => {
    const panel = document.querySelector(selector);
    if (panel) observer.observe(panel, {childList: true});
  });
  document.querySelector("#dlg")?.addEventListener("close", stop);
  window.addEventListener("pagehide", stop);

  const ready = fetch(dataUrl).then(response => {
    if (!response.ok) throw new Error(`Listening catalogue unavailable (${response.status})`);
    return response.json();
  }).then(data => {
    if (!data?.people || typeof data.people !== "object" || Array.isArray(data.people)) throw new Error("Invalid listening catalogue");
    people = data.people;
    mount();
  }).catch(error => console.warn("[AD FONTES]", error.message));

  return {markup, mount, stop, ready};
}
