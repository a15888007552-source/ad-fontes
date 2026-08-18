(() => {
  const canvas = document.querySelector("#seal-viewer");
  const stage = document.querySelector("[data-seal-viewer]");
  const status = document.querySelector("#seal-viewer-status");
  if (!canvas || !stage) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const TAU = Math.PI * 2;
  const state = {
    yaw: -0.62,
    pitch: -0.42,
    zoom: 1,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    dpr: 1,
  };
  const faces = [];

  const addFace = (points, color, label = "jade") => faces.push({ points, color, label });

  const rotateXZ = (x, z, angle) => [
    x * Math.cos(angle) - z * Math.sin(angle),
    x * Math.sin(angle) + z * Math.cos(angle),
  ];

  const addPrism = (cx, cy, cz, width, height, depth, color, angle = 0, label = "jade") => {
    const corners = [
      [-width / 2, -depth / 2], [width / 2, -depth / 2],
      [width / 2, depth / 2], [-width / 2, depth / 2],
    ].map(([x, z]) => {
      const [rx, rz] = rotateXZ(x, z, angle);
      return [cx + rx, cy, cz + rz];
    });
    const top = corners.map(([x, , z]) => [x, cy + height / 2, z]);
    const bottom = corners.map(([x, , z]) => [x, cy - height / 2, z]);
    addFace(top, color, label);
    addFace(bottom.slice().reverse(), color, label);
    for (let i = 0; i < 4; i += 1) {
      const next = (i + 1) % 4;
      addFace([top[i], top[next], bottom[next], bottom[i]], color, label);
    }
  };

  const addEllipsoid = (cx, cy, cz, rx, ry, rz, color, latitudes = 7, longitudes = 12, label = "jade") => {
    for (let lat = 0; lat < latitudes; lat += 1) {
      const t0 = (lat / latitudes) * Math.PI;
      const t1 = ((lat + 1) / latitudes) * Math.PI;
      for (let lon = 0; lon < longitudes; lon += 1) {
        const p0 = (lon / longitudes) * TAU;
        const p1 = ((lon + 1) / longitudes) * TAU;
        const point = (theta, phi) => [
          cx + rx * Math.sin(theta) * Math.cos(phi),
          cy + ry * Math.cos(theta),
          cz + rz * Math.sin(theta) * Math.sin(phi),
        ];
        addFace([point(t0, p0), point(t0, p1), point(t1, p1), point(t1, p0)], color, label);
      }
    }
  };

  const addBox = (cx, cy, cz, width, height, depth, color, label = "jade") => {
    const corners = [
      [-width / 2, -depth / 2], [width / 2, -depth / 2],
      [width / 2, depth / 2], [-width / 2, depth / 2],
    ];
    const top = corners.map(([x, z]) => [cx + x, cy + height / 2, cz + z]);
    const bottom = corners.map(([x, z]) => [cx + x, cy - height / 2, cz + z]);
    addFace(top, color, label);
    addFace(bottom.slice().reverse(), color, label);
    for (let i = 0; i < 4; i += 1) {
      const next = (i + 1) % 4;
      addFace([top[i], top[next], bottom[next], bottom[i]], color, label);
    }
  };

  /* 印台：近方形白玉印台，四面略收分，符合汉代玉玺的比例 */
  const addSealBody = () => {
    const bodyHeight = 0.72;
    const rings = [
      { y: -bodyHeight / 2, half: 0.5 },
      { y: bodyHeight / 2 - 0.06, half: 0.47 },
      { y: bodyHeight / 2, half: 0.47 },
    ];
    const ring = ({ y, half }) => [
      [-half, y, -half], [half, y, -half], [half, y, half], [-half, y, half],
    ];
    for (let i = 0; i < rings.length - 1; i += 1) {
      const a = ring(rings[i]);
      const b = ring(rings[i + 1]);
      for (let side = 0; side < 4; side += 1) {
        const next = (side + 1) % 4;
        addFace([a[side], a[next], b[next], b[side]], i === 0 ? "#e6ddc8" : "#ece4d1", "jade");
      }
    }
    addFace(ring(rings[0]).slice().reverse(), "#ddd2b6", "jade");
    addFace(ring(rings[rings.length - 1]), "#f5efe1", "jade");
  };

  /* 螭虎钮：弓背、昂首、四足收拢的蹲踞姿态，用环形截面沿拱弧扫出躯体 */
  const addArchedBody = () => {
    const R = 0.18;
    const rx = 0.145;
    const ry = 0.115;
    const baseY = 0.36;
    const steps = 14;
    const ringSteps = 10;
    const centerAt = (theta) => [0, baseY + R * (1 - Math.cos(theta)), R * Math.sin(theta)];
    for (let i = 0; i < steps; i += 1) {
      const t0 = -1.08 + (i / steps) * 2.16;
      const t1 = -1.08 + ((i + 1) / steps) * 2.16;
      for (let j = 0; j < ringSteps; j += 1) {
        const p0 = (j / ringSteps) * TAU;
        const p1 = ((j + 1) / ringSteps) * TAU;
        const pt = (t, p) => {
          const c = centerAt(t);
          return [
            c[0] + rx * Math.cos(p),
            c[1] + ry * Math.sin(p) * Math.cos(t),
            c[2] + ry * Math.sin(p) * Math.sin(t),
          ];
        };
        addFace([pt(t0, p0), pt(t0, p1), pt(t1, p1), pt(t1, p0)], "#f0e9d8", "jade");
      }
    }
  };

  const addChiTiger = () => {
    addArchedBody();
    /* 头部与吻部 */
    addEllipsoid(0, 0.6, -0.26, 0.145, 0.125, 0.16, "#f0e9d8", 6, 9, "jade");
    addEllipsoid(0, 0.555, -0.42, 0.085, 0.06, 0.09, "#eae0c9", 5, 8, "jade");
    /* 双耳 */
    addEllipsoid(-0.08, 0.7, -0.24, 0.04, 0.06, 0.028, "#ece3cc", 4, 7, "jade");
    addEllipsoid(0.08, 0.7, -0.24, 0.04, 0.06, 0.028, "#ece3cc", 4, 7, "jade");
    /* 短尾 */
    addEllipsoid(0, 0.62, 0.235, 0.052, 0.082, 0.06, "#ece3cc", 5, 8, "jade");
    /* 四足 */
    addPrism(-0.16, 0.36, -0.135, 0.09, 0.1, 0.09, "#e6dcc4", -0.18, "jade");
    addPrism(0.16, 0.36, -0.135, 0.09, 0.1, 0.09, "#e6dcc4", 0.18, "jade");
    addPrism(-0.16, 0.36, 0.135, 0.09, 0.1, 0.09, "#e6dcc4", -0.18, "jade");
    addPrism(0.16, 0.36, 0.135, 0.09, 0.1, 0.09, "#e6dcc4", 0.18, "jade");
  };

  const buildModel = () => {
    addSealBody();
    addChiTiger();
  };

  const transform = ([x, y, z]) => {
    const cy = Math.cos(state.yaw);
    const sy = Math.sin(state.yaw);
    const cp = Math.cos(state.pitch);
    const sp = Math.sin(state.pitch);
    const xr = x * cy + z * sy;
    const zr = -x * sy + z * cy;
    const yr = y * cp - zr * sp;
    const zr2 = y * sp + zr * cp;
    return [xr, yr, zr2];
  };

  const shade = (face, points) => {
    const a = points[0];
    const b = points[1];
    const c = points[2];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.max(0.0001, Math.hypot(nx, ny, nz));
    const light = Math.abs((nx * -0.34 + ny * 0.86 + nz * 0.42) / length);
    const amount = 0.7 + light * 0.3;
    const rgb = face.color.match(/[0-9a-f]{2}/gi)?.map((part) => parseInt(part, 16)) || [210, 200, 170];
    return `rgb(${Math.round(rgb[0] * amount)}, ${Math.round(rgb[1] * amount)}, ${Math.round(rgb[2] * amount)})`;
  };

  const draw = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width, height) * 0.36 * state.zoom;
    const cx = width / 2;
    const cy = height * 0.585;
    const projected = faces.map((face) => {
      const points = face.points.map(transform);
      const depth = points.reduce((sum, point) => sum + point[2], 0) / points.length;
      return { face, points, depth };
    }).sort((a, b) => a.depth - b.depth);

    projected.forEach(({ face, points }) => {
      const screen = points.map(([x, y]) => [cx + x * scale, cy - y * scale]);
      ctx.beginPath();
      screen.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fillStyle = shade(face, points);
      ctx.fill();
      ctx.strokeStyle = face.label === "seal" ? "rgba(116, 57, 47, .7)" : "rgba(86, 73, 45, .34)";
      ctx.lineWidth = face.label === "seal" ? 1.1 : 0.65;
      ctx.stroke();
    });

    /* 印面：自下方观看时，在印台上按 2×2 排布“皇后之玺”四字（示意标注） */
    if (state.pitch > 0.5) {
      const faceY = -0.3605;
      const q = (sx, sz) => transform([sx * 0.25, faceY, sz * 0.25]);
      const toScreen = ([x, y]) => [cx + x * scale, cy - y * scale];
      const tl = toScreen(q(-1, -1));
      const tr = toScreen(q(1, -1));
      const bl = toScreen(q(-1, 1));
      const br = toScreen(q(1, 1));
      const size = Math.max(8, Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) * 0.95);
      const angle = Math.atan2(tr[1] - tl[1], tr[0] - tl[0]);
      ctx.save();
      ctx.font = `600 ${size}px "STKaiti","KaiTi","STSong","SimSun",serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      [["皇", tl], ["后", tr], ["之", bl], ["玺", br]].forEach(([ch, p]) => {
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(139, 73, 58, .85)";
        ctx.fillText(ch, 0, 1.5);
        ctx.fillStyle = "rgba(139, 73, 58, .95)";
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }

    if (state.pitch > 0.52) {
      ctx.save();
      ctx.font = `${Math.max(10, Math.round(width * 0.018))}px "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = "rgba(138, 73, 58, .92)";
      ctx.textAlign = "center";
      ctx.fillText("皇后之玺 · 印面示意", cx, height - Math.max(18, height * 0.06));
      ctx.restore();
    }
  };

  const setStatus = (text) => { if (status) status.textContent = text; };

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(rect.width * state.dpr));
    canvas.height = Math.max(1, Math.round(rect.height * state.dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    draw();
  };

  const reset = (view = "reset") => {
    if (view === "top") { state.yaw = -0.62; state.pitch = -0.95; state.zoom = 1.08; setStatus("顶部视角 · 螭虎钮"); }
    else if (view === "seal") { state.yaw = 0.4; state.pitch = 0.92; state.zoom = 1.02; setStatus("底部视角 · 印面示意"); }
    else { state.yaw = -0.62; state.pitch = -0.42; state.zoom = 1; setStatus("模型已就绪 · 拖动查看"); }
    draw();
  };

  const begin = (event) => {
    state.dragging = true;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    canvas.classList.add("is-dragging");
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* synthetic test events have no active pointer */ }
    }
    setStatus("正在旋转 · 松开查看");
  };

  const move = (event) => {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.yaw += dx * 0.012;
    state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + dy * 0.012));
    draw();
  };

  const end = (event) => {
    if (!state.dragging || event.pointerId !== state.pointerId) return;
    state.dragging = false;
    canvas.classList.remove("is-dragging");
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    setStatus("模型已就绪 · 拖动查看");
  };

  canvas.addEventListener("pointerdown", begin);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.zoom = Math.max(0.72, Math.min(1.42, state.zoom - event.deltaY * 0.001));
    setStatus(`缩放 ${Math.round(state.zoom * 100)}% · 拖动旋转`);
    draw();
  }, { passive: false });
  canvas.addEventListener("keydown", (event) => {
    const amount = event.shiftKey ? 0.18 : 0.08;
    if (event.key === "ArrowLeft") state.yaw -= amount;
    else if (event.key === "ArrowRight") state.yaw += amount;
    else if (event.key === "ArrowUp") state.pitch = Math.max(-1.35, state.pitch - amount);
    else if (event.key === "ArrowDown") state.pitch = Math.min(1.35, state.pitch + amount);
    else if (event.key === "+" || event.key === "=") state.zoom = Math.min(1.42, state.zoom + 0.06);
    else if (event.key === "-" || event.key === "_") state.zoom = Math.max(0.72, state.zoom - 0.06);
    else if (event.key.toLowerCase() === "r") return reset();
    else return;
    event.preventDefault();
    setStatus("键盘旋转 · 方向键查看");
    draw();
  });

  document.querySelectorAll("[data-seal-view]").forEach((button) => {
    button.addEventListener("click", () => { reset(button.dataset.sealView); canvas.focus(); });
  });

  buildModel();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize, { passive: true });
  resize();
})();
