/**
 * 欧罗巴声学与乐律实验室 (Acoustic Lab UI & Controller)
 * 渲染全套交互面板、钢琴键盘、微音表、调式拉格卡片、十二音矩阵与示波器
 */

import {
  SoundEngine,
  TUNING_SYSTEMS,
  CHURCH_MODES,
  INDIAN_THAATS,
  SCHOENBERG_OP25_ROW,
  compute12ToneMatrix
} from './acoustic-lab.js';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function createAcousticLabUI(container) {
  const engine = new SoundEngine();
  let currentTab = 'tuning';
  let animId = null;

  // 17键音符列表（从 C4 到 E5）
  const KEYBOARD_NOTES = [
    { note: 'C4', isBlack: false },
    { note: 'C#4', isBlack: true },
    { note: 'D4', isBlack: false },
    { note: 'D#4', isBlack: true },
    { note: 'E4', isBlack: false },
    { note: 'F4', isBlack: false },
    { note: 'F#4', isBlack: true },
    { note: 'G4', isBlack: false },
    { note: 'G#4', isBlack: true },
    { note: 'A4', isBlack: false },
    { note: 'A#4', isBlack: true },
    { note: 'B4', isBlack: false },
    { note: 'C5', isBlack: false },
    { note: 'C#5', isBlack: true },
    { note: 'D5', isBlack: false },
    { note: 'D#5', isBlack: true },
    { note: 'E5', isBlack: false }
  ];

  // 渲染整体框架 HTML
  container.innerHTML = `
    <div class="acoustic-lab-root">
      <header class="lab-header">
        <div class="lab-title-area">
          <h2>欧罗巴声学与乐律实验室 <span class="latin">LABORATORIUM HARMONICUM</span></h2>
          <p>基于原生 Web Audio API 物理合成引擎 · 亲耳听辨历史律制微音差、中世纪教会调式、东方拉格与现代十二音序列</p>
        </div>
        <div class="lab-visualizer-card">
          <canvas id="lab-osc-canvas" width="320" height="84"></canvas>
          <div class="lab-visualizer-status" id="lab-osc-status">● 物理声学示波器就绪 · 点击发声</div>
        </div>
      </header>

      <nav class="lab-nav" role="tablist">
        <button class="lab-tab-btn active" data-tab="tuning">⚖️ 乐律与微音听辨 (Temperament)</button>
        <button class="lab-tab-btn" data-tab="modes">⛪ 教会调式与拉格 (Modes & Ragas)</button>
        <button class="lab-tab-btn" data-tab="harmonies">🎼 和声切片与现代技法 (Harmonies)</button>
        <button class="lab-tab-btn" data-tab="matrix">🎲 勋伯格十二音序列计算机 (12-Tone Matrix)</button>
      </nav>

      <!-- 面板 1: 乐律与微音听辨 -->
      <section class="lab-panel active" id="panel-tuning">
        <div class="lab-grid-2">
          <div>
            <div class="lab-card" style="margin-bottom: 20px;">
              <h3 class="lab-card-title">
                <span>选择历史或民族律制</span>
                <small id="current-tuning-name" class="lab-card-badge">当前：现代十二平均律</small>
              </h3>
              <div class="tuning-selector" id="tuning-chips-container"></div>
              <p id="tuning-description" class="tuning-quote-box"></p>
            </div>

            <div class="lab-card">
              <h3 class="lab-card-title">
                <span>交互琴键 (C4 – E5)</span>
                <span class="lab-card-hint">支持鼠标点击与长按</span>
              </h3>
              <div class="keyboard-wrapper">
                <div class="keyboard" id="piano-keyboard"></div>
              </div>

              <div class="audition-pills">
                <span class="audition-label">一键听辨：</span>
                <button class="audition-btn" id="btn-play-c-major">▶ 弹奏 C 大调主和弦 (C-E-G)</button>
                <button class="audition-btn" id="btn-play-third-compare">🔍 纯律三度(386c) vs 平均律三度(400c)</button>
                <button class="audition-btn danger" id="btn-play-wolf-fifth">🐺 听辨巴洛克“狼音五度” (G#4 - Eb5)</button>
                <button class="audition-btn" id="btn-play-cadence">⛪ 纯正调律全终止式 (I-IV-V-I)</button>
              </div>
            </div>
          </div>

          <div>
            <div class="lab-card">
              <h3 class="lab-card-title">律制音分 (Cent) 与频率分析</h3>
              <p class="lab-card-hint" style="margin-bottom: 12px;">以 C4 (261.63Hz) 为基准，显示相对于 12-TET 的音分偏离微差：</p>
              <table class="cents-table">
                <thead>
                  <tr>
                    <th>音名</th>
                    <th>当前律制(c)</th>
                    <th>12平均律(c)</th>
                    <th>偏差 (Δc)</th>
                  </tr>
                </thead>
                <tbody id="cents-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- 面板 2: 教会调式与拉格 -->
      <section class="lab-panel" id="panel-modes">
        <div class="drone-switch-bar">
          <span>🪕 <strong>印度谭普拉琴 (Tanpura Drone) 持续背景低音</strong>：采用双正弦与低通滤波物理合成，模拟蚕丝琴弦与琴马微摩擦拍频</span>
          <button class="action-btn" id="btn-toggle-drone">🔊 开启持续嗡鸣低音 (Drone)</button>
        </div>

        <h3 class="mode-section-title">中世纪八大教会调式 (Gregorian Modes)</h3>
        <div class="mode-grid" id="church-modes-grid"></div>

        <h3 class="mode-section-title" style="margin-top: 28px;">北印度古典十大母调 (That System)</h3>
        <div class="mode-grid" id="indian-thaats-grid"></div>
      </section>

      <!-- 面板 3: 和声切片与现代技法 -->
      <section class="lab-panel" id="panel-harmonies">
        <div class="lab-grid-2">
          <div>
            <div class="harmonic-card">
              <h4>1. 瓦格纳“特里斯坦和弦”解构 (The Tristan Chord)</h4>
              <p>《特里斯坦与伊索尔德》序曲开篇第2-3小节。西方现代和声瓦解古典调性功能的里程碑。和弦构成：<strong>F - B - D# - G#</strong>。它既非传统减七、亦非简单增六，带有强烈的悬置欲求与向属七和弦（E7）的半音化解决。</p>
              <div class="harmonic-controls">
                <button class="action-btn" id="btn-tristan-chord">▶ 弹奏特里斯坦孤立和弦 (F-B-D#-G#)</button>
                <button class="action-btn" id="btn-tristan-resolve">▶ 听辨半音化解决至 E7 (G# → A)</button>
                <button class="action-btn" id="btn-tristan-full">▶ 完整演播序曲开篇三小节主题动机</button>
              </div>
            </div>

            <div class="harmonic-card">
              <h4>2. 曼海姆乐派三大管弦乐特效 (Mannheim Effects)</h4>
              <p>18世纪中叶斯塔米茨领导的曼海姆宫廷乐团震动欧洲的独门绝技，奠定古典主义交响乐戏剧性动力学：</p>
              <div class="harmonic-controls">
                <button class="action-btn" id="btn-mannheim-rocket">🚀 曼海姆火箭 (Mannheim Rocket：急速上升三和弦琶音)</button>
                <button class="action-btn" id="btn-mannheim-sigh">💧 曼海姆叹息 (Mannheim Sigh：下行二度倚音与弱化解决)</button>
                <button class="action-btn" id="btn-mannheim-roll">🌊 曼海姆滚奏渐强 (Mannheim Crescendo：音响风暴)</button>
              </div>
            </div>
          </div>

          <div>
            <div class="lab-card">
              <h3 class="lab-card-title">梅西安有限移位调式</h3>
              <p class="lab-card-hint" style="line-height: 1.6; margin-bottom: 14px;">奥利维埃·梅西安在《我的音乐语言的技巧》中总结的不可移位对称调式：</p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="action-btn" id="btn-messiaen-1">▶ 第一调式：全音阶 (Whole-tone Scale)</button>
                <button class="action-btn" id="btn-messiaen-2">▶ 第二调式：八音阶 (Octatonic: 半-全-半-全)</button>
                <button class="action-btn" id="btn-messiaen-3">▶ 普罗科菲耶夫替代和弦 (Neapolitan 6th)</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 面板 4: 勋伯格十二音序列矩阵计算机 -->
      <section class="lab-panel" id="panel-matrix">
        <div class="lab-card">
          <h3 class="lab-card-title">
            <span>勋伯格十二音序列 12×12 计算机 (12-Tone Matrix Engine)</span>
            <span class="lab-card-badge">点击任意行(P)或列(I)即刻自动合成演奏该音列</span>
          </h3>
          <p class="lab-card-hint" style="margin-bottom:16px;line-height:1.65;">
            当前载入：<strong>勋伯格《钢琴组曲》Op.25 原型序列 (E - F - G - Db - Gb - Eb - Ab - D - B - C - A - Bb)</strong>。<br>
            矩阵自动生成 48 种变形：横向为<strong>原形 (Prime, P)</strong> 与<strong>逆行 (Retrograde, R)</strong>；纵向为<strong>倒影 (Inversion, I)</strong> 与<strong>逆行倒影 (Retrograde-Inversion, RI)</strong>。
          </p>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
            <button class="action-btn" id="btn-play-p0">▶ 演奏原型 P0</button>
            <button class="action-btn" id="btn-play-r0">◀ 演奏逆行 R0</button>
            <button class="action-btn" id="btn-play-i0">▼ 演奏倒影 I0</button>
            <button class="action-btn" id="btn-play-ri0">▲ 演奏逆行倒影 RI0</button>
            <button class="audition-btn" id="btn-random-row">🎲 随机生成新十二音序列</button>
          </div>

          <div class="matrix-container">
            <div class="matrix-grid" id="schoenberg-matrix"></div>
          </div>
        </div>
      </section>
    </div>
  `;

  // ==========================================================================
  // 示波器动画循环 (Canvas Oscilloscope)
  // ==========================================================================
  const canvas = container.querySelector('#lab-osc-canvas');
  const canvasCtx = canvas.getContext('2d');
  const oscStatus = container.querySelector('#lab-osc-status');

  function drawOscilloscope() {
    animId = requestAnimationFrame(drawOscilloscope);

    // 背景：优雅温润的古典手稿羊皮纸色
    canvasCtx.fillStyle = '#FAF5E8';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制中心细准线（古籍标尺刻度）
    canvasCtx.strokeStyle = 'rgba(198, 186, 146, 0.65)';
    canvasCtx.lineWidth = 1;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, canvas.height / 2);
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();

    if (!engine.analyser) {
      return;
    }

    const bufferLength = engine.analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    engine.analyser.getByteTimeDomainData(timeData);

    // 绘制波形：深绯红（Rubric Red #8C2B1F / 朱红古籍批注色）
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#8C2B1F';
    canvasCtx.shadowBlur = 0;
    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) canvasCtx.moveTo(x, y);
      else canvasCtx.lineTo(x, y);
      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
  drawOscilloscope();

  // ==========================================================================
  // 选项卡切换逻辑
  // ==========================================================================
  const tabBtns = container.querySelectorAll('.lab-tab-btn');
  const panels = container.querySelectorAll('.lab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tab = btn.dataset.tab;
      currentTab = tab;
      const targetPanel = container.querySelector(`#panel-${tab}`);
      if (targetPanel) targetPanel.classList.add('active');

      // 切换选项卡时静音
      engine.stopAll();
    });
  });

  // ==========================================================================
  // 律制系统交互与钢琴键盘渲染
  // ==========================================================================
  const tuningContainer = container.querySelector('#tuning-chips-container');
  const tuningDesc = container.querySelector('#tuning-description');
  const currentTuningName = container.querySelector('#current-tuning-name');
  const pianoKeyboard = container.querySelector('#piano-keyboard');
  const centsTableBody = container.querySelector('#cents-table-body');

  function renderTuningChips() {
    tuningContainer.innerHTML = '';
    Object.entries(TUNING_SYSTEMS).forEach(([key, item]) => {
      const chip = document.createElement('div');
      chip.className = `tuning-chip ${engine.tuningKey === key ? 'active' : ''}`;
      chip.innerHTML = `
        <div class="tuning-chip-name">${item.name}</div>
        <div class="tuning-chip-desc">${item.desc.substring(0, 36)}…</div>
      `;
      chip.addEventListener('click', () => {
        engine.setTuning(key);
        renderTuningChips();
        updateTuningInfo();
        renderKeyboard();
        renderCentsTable();
      });
      tuningContainer.appendChild(chip);
    });
  }

  function updateTuningInfo() {
    const current = TUNING_SYSTEMS[engine.tuningKey];
    currentTuningName.textContent = `当前：${current.name}`;
    tuningDesc.textContent = current.desc;
    oscStatus.textContent = `● 律制：${current.name}`;
  }

  function renderKeyboard() {
    pianoKeyboard.innerHTML = '';
    const tuning = TUNING_SYSTEMS[engine.tuningKey];

    KEYBOARD_NOTES.forEach((item) => {
      const keyElem = document.createElement('div');
      keyElem.className = `key ${item.isBlack ? 'black' : 'white'}`;
      keyElem.dataset.note = item.note;

      // 提取音名在当前律制中的音分值
      const noteName = item.note.replace(/\d+/, '');
      const noteIdx = PITCH_CLASSES.indexOf(noteName);
      const cent = tuning.cents[noteIdx % tuning.cents.length];

      keyElem.innerHTML = `
        <span class="key-note">${item.note}</span>
        <span class="key-cent">${cent.toFixed(0)}c</span>
      `;

      // 绑定按下与释放
      keyElem.addEventListener('mousedown', () => {
        keyElem.classList.add('pressed');
        engine.startNote(item.note);
      });
      keyElem.addEventListener('mouseup', () => {
        keyElem.classList.remove('pressed');
        engine.stopNote(item.note);
      });
      keyElem.addEventListener('mouseleave', () => {
        keyElem.classList.remove('pressed');
        engine.stopNote(item.note);
      });

      // 触屏支持
      keyElem.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keyElem.classList.add('pressed');
        engine.startNote(item.note);
      });
      keyElem.addEventListener('touchend', (e) => {
        e.preventDefault();
        keyElem.classList.remove('pressed');
        engine.stopNote(item.note);
      });

      pianoKeyboard.appendChild(keyElem);
    });
  }

  function renderCentsTable() {
    centsTableBody.innerHTML = '';
    const tuning = TUNING_SYSTEMS[engine.tuningKey];
    const std12 = TUNING_SYSTEMS['12-tet'].cents;

    PITCH_CLASSES.forEach((name, i) => {
      const curCent = tuning.cents[i % tuning.cents.length];
      const stdCent = std12[i];
      const diff = curCent - stdCent;

      let diffClass = 'diff-zero';
      let diffStr = '0.0';
      if (diff > 0.05) {
        diffClass = 'diff-pos';
        diffStr = `+${diff.toFixed(1)}`;
      } else if (diff < -0.05) {
        diffClass = 'diff-neg';
        diffStr = `${diff.toFixed(1)}`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${name}</strong></td>
        <td>${curCent.toFixed(1)}</td>
        <td>${stdCent.toFixed(1)}</td>
        <td class="${diffClass}">${diffStr}</td>
      `;
      centsTableBody.appendChild(row);
    });
  }

  // 初始化律制界面
  renderTuningChips();
  updateTuningInfo();
  renderKeyboard();
  renderCentsTable();

  // 一键听辨事件绑定
  container.querySelector('#btn-play-c-major').addEventListener('click', () => {
    engine.playNote('C4', 1.8);
    setTimeout(() => engine.playNote('E4', 1.8), 200);
    setTimeout(() => engine.playNote('G4', 1.8), 400);
    setTimeout(() => {
      engine.playNote('C4', 2.0);
      engine.playNote('E4', 2.0);
      engine.playNote('G4', 2.0);
      engine.playNote('C5', 2.0);
    }, 800);
  });

  container.querySelector('#btn-play-third-compare').addEventListener('click', () => {
    // 纯律大三度 (386.3c) vs 12平均律大三度 (400c)
    // 纯律 C4 (261.63Hz) + E4 (327.03Hz)
    const baseC = 261.625565;
    const pureE = baseC * (5 / 4); // 327.03195 Hz
    const eqE = baseC * Math.pow(2, 400 / 1200); // 329.6275 Hz

    oscStatus.textContent = '🔊 正在播放：纯律大三度 5:4 (386音分，清亮无拍频)…';
    engine.playNote('C4', 1.6, baseC);
    engine.playNote('E4', 1.6, pureE);

    setTimeout(() => {
      oscStatus.textContent = '🔊 正在播放：十二平均律大三度 (400音分，稍有振颤拍频)…';
      engine.playNote('C4', 1.6, baseC);
      engine.playNote('E4', 1.6, eqE);
    }, 2000);
  });

  container.querySelector('#btn-play-wolf-fifth').addEventListener('click', () => {
    // 中庸全音律 G#4 到 Eb5 的狼音五度 (737.6 音分)
    const baseC = 261.625565;
    const gSharp4 = baseC * Math.pow(2, 772.6 / 1200); // 408.8 Hz
    const eFlat5 = baseC * 2 * Math.pow(2, 310.3 / 1200); // 625.8 Hz (狼音五度)
    const pureDSharp5 = gSharp4 * 1.5; // 纯五度对照

    oscStatus.textContent = '🐺 听辨巴洛克狼音五度：G#4 与 Eb5 碰撞出的剧烈声学干涉拍频！';
    engine.playNote('G#4', 2.4, gSharp4);
    engine.playNote('Eb5', 2.4, eFlat5);

    setTimeout(() => {
      oscStatus.textContent = '对比：纯正五度 (3:2，平稳协和)…';
      engine.playNote('G#4', 2.0, gSharp4);
      engine.playNote('D#5', 2.0, pureDSharp5);
    }, 2800);
  });

  container.querySelector('#btn-play-cadence').addEventListener('click', () => {
    // 全终止式 I - IV - V - I
    const playChord = (notes, time) => {
      setTimeout(() => {
        notes.forEach(n => engine.playNote(n, 1.2));
      }, time);
    };
    playChord(['C4', 'E4', 'G4'], 0);
    playChord(['F3', 'A4', 'C5'], 800);
    playChord(['G3', 'B4', 'D5'], 1600);
    playChord(['C4', 'E4', 'G4', 'C5'], 2400);
  });

  // ==========================================================================
  // 面板 2: 教会调式与拉格卡片渲染
  // ==========================================================================
  const churchModesGrid = container.querySelector('#church-modes-grid');
  const indianThaatsGrid = container.querySelector('#indian-thaats-grid');

  CHURCH_MODES.forEach(mode => {
    const card = document.createElement('div');
    card.className = 'mode-card';
    card.innerHTML = `
      <div class="mode-card-header">
        <span class="mode-name">${mode.name}</span>
        <span class="mode-greek">${mode.greek}</span>
      </div>
      <div class="mode-formula">正音 Finalis: ${mode.finalis} · 诵音 Tenor: ${mode.tenor}</div>
      <div class="mode-desc">${mode.desc}</div>
      <button class="play-mode-btn">▶ 演奏音阶与终止式</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      oscStatus.textContent = `⛪ 正在演奏：${mode.name}…`;
      mode.scale.forEach((note, idx) => {
        setTimeout(() => engine.playNote(note, 0.6), idx * 250);
      });
      // 结尾弹奏其正音与五度
      setTimeout(() => {
        engine.playNote(`${mode.finalis}4`, 1.5);
      }, mode.scale.length * 250 + 200);
    });
    churchModesGrid.appendChild(card);
  });

  INDIAN_THAATS.forEach(thaat => {
    const card = document.createElement('div');
    card.className = 'mode-card';
    card.innerHTML = `
      <div class="mode-card-header">
        <span class="mode-name">${thaat.name}</span>
        <span class="mode-greek">${thaat.sargam}</span>
      </div>
      <div class="mode-desc"><strong>情调：</strong>${thaat.mood}</div>
      <button class="play-mode-btn">🪕 上行与下行演奏 (Arohana / Avarohana)</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      oscStatus.textContent = `🪕 正在演奏北印古典拉格：${thaat.name}…`;
      const upDown = [...thaat.notes, ...thaat.notes.slice(0, -1).reverse()];
      upDown.forEach((note, idx) => {
        setTimeout(() => engine.playNote(note, 0.5), idx * 220);
      });
    });
    indianThaatsGrid.appendChild(card);
  });

  // 谭普拉琴无人机底噪切换
  const droneBtn = container.querySelector('#btn-toggle-drone');
  droneBtn.addEventListener('click', () => {
    const isOn = engine.toggleDrone();
    droneBtn.textContent = isOn ? '🔇 关闭嗡鸣低音 (Drone)' : '🔊 开启持续嗡鸣低音 (Drone)';
    droneBtn.style.background = isOn ? 'var(--acc)' : '';
    droneBtn.style.color = isOn ? '#FFF' : '';
    droneBtn.style.borderColor = isOn ? 'var(--acc)' : '';
    oscStatus.textContent = isOn ? '🪕 谭普拉琴 (Tanpura) 嗡鸣低音已开启，空间已充满泛音' : '● 谭普拉琴嗡鸣已停止';
  });

  // ==========================================================================
  // 面板 3: 和声切片与管弦特效
  // ==========================================================================
  container.querySelector('#btn-tristan-chord').addEventListener('click', () => {
    oscStatus.textContent = '🎼 瓦格纳特里斯坦和弦：F3 - B3 - D#4 - G#4';
    engine.playNote('F3', 2.8);
    engine.playNote('B3', 2.8);
    engine.playNote('D#4', 2.8);
    engine.playNote('G#4', 2.8);
  });

  container.querySelector('#btn-tristan-resolve').addEventListener('click', () => {
    oscStatus.textContent = '🎼 特里斯坦和弦半音化解决：G#4 升至 A4，下行流动至显性属七和弦 E7…';
    engine.playNote('F3', 2.5);
    engine.playNote('B3', 2.5);
    engine.playNote('D#4', 2.5);
    engine.playNote('G#4', 1.0);
    setTimeout(() => {
      engine.playNote('A4', 1.5);
    }, 1000);
    setTimeout(() => {
      engine.playNote('E3', 2.5);
      engine.playNote('G#3', 2.5);
      engine.playNote('B3', 2.5);
      engine.playNote('D4', 2.5);
    }, 2200);
  });

  container.querySelector('#btn-tristan-full').addEventListener('click', () => {
    oscStatus.textContent = '🎼 《特里斯坦与伊索尔德》序曲开篇完整动机：大提琴弱奏潜入 ➔ 特里斯坦和弦 ➔ 英国管长叹…';
    // A2 - F3 - E3 - D#3 -> 跃上至特里斯坦和弦
    const melody = [
      { n: 'A2', d: 0.8, t: 0 },
      { n: 'F3', d: 0.8, t: 700 },
      { n: 'E3', d: 1.2, t: 1400 },
      { n: 'D#3', d: 1.5, t: 2400 }
    ];
    melody.forEach(m => setTimeout(() => engine.playNote(m.n, m.d), m.t));

    setTimeout(() => {
      engine.playNote('F3', 3.0);
      engine.playNote('B3', 3.0);
      engine.playNote('D#4', 3.0);
      engine.playNote('G#4', 1.2);
    }, 4200);

    setTimeout(() => {
      engine.playNote('A4', 1.8);
    }, 5400);

    setTimeout(() => {
      engine.playNote('E3', 3.0);
      engine.playNote('G#3', 3.0);
      engine.playNote('B3', 3.0);
      engine.playNote('D4', 3.0);
    }, 6600);
  });

  // 曼海姆火箭
  container.querySelector('#btn-mannheim-rocket').addEventListener('click', () => {
    oscStatus.textContent = '🚀 曼海姆火箭 (Mannheim Rocket)：主和弦急速音阶上升琶音与渐强！';
    const notes = ['C3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
    notes.forEach((n, idx) => {
      setTimeout(() => engine.playNote(n, 0.4), idx * 100);
    });
  });

  // 曼海姆叹息
  container.querySelector('#btn-mannheim-sigh').addEventListener('click', () => {
    oscStatus.textContent = '💧 曼海姆叹息 (Mannheim Sigh)：重音二度倚音与弱拍下行消解…';
    engine.playNote('F5', 0.8);
    setTimeout(() => engine.playNote('E5', 1.6), 350);
  });

  // 曼海姆滚奏
  container.querySelector('#btn-mannheim-roll').addEventListener('click', () => {
    oscStatus.textContent = '🌊 曼海姆滚奏渐强 (Mannheim Crescendo)：由弱渐强的管弦乐音响巨浪！';
    const seq = ['C3', 'G2', 'C3', 'G2', 'C3', 'G2', 'C3', 'G2', 'C3', 'G3', 'C4', 'E4', 'G4', 'C5'];
    seq.forEach((n, idx) => {
      setTimeout(() => engine.playNote(n, 0.3), idx * 130);
    });
  });

  // 梅西安调式
  container.querySelector('#btn-messiaen-1').addEventListener('click', () => {
    oscStatus.textContent = '梅西安第一调式 (全音阶 Whole-Tone)：C - D - E - F# - G# - A# - C';
    ['C4', 'D4', 'E4', 'F#4', 'G#4', 'A#4', 'C5'].forEach((n, idx) => {
      setTimeout(() => engine.playNote(n, 0.5), idx * 240);
    });
  });

  container.querySelector('#btn-messiaen-2').addEventListener('click', () => {
    oscStatus.textContent = '梅西安第二调式 (八音阶 Octatonic)：半音与全音交替';
    ['C4', 'C#4', 'D#4', 'E4', 'F#4', 'G4', 'A4', 'Bb4', 'C5'].forEach((n, idx) => {
      setTimeout(() => engine.playNote(n, 0.4), idx * 220);
    });
  });

  container.querySelector('#btn-messiaen-3').addEventListener('click', () => {
    oscStatus.textContent = '拿坡里六和弦 (Neapolitan 6th)：降 II 级大三和弦第一转位 (F - Ab - Db) 解决至主和弦';
    engine.playNote('F3', 1.8);
    engine.playNote('Ab3', 1.8);
    engine.playNote('Db4', 1.8);
    setTimeout(() => {
      engine.playNote('G3', 1.8);
      engine.playNote('B3', 1.8);
      engine.playNote('D4', 1.8);
    }, 1200);
    setTimeout(() => {
      engine.playNote('C3', 2.0);
      engine.playNote('G3', 2.0);
      engine.playNote('C4', 2.0);
      engine.playNote('E4', 2.0);
    }, 2400);
  });

  // ==========================================================================
  // 面板 4: 勋伯格十二音序列矩阵计算机
  // ==========================================================================
  let currentRow = [...SCHOENBERG_OP25_ROW];
  const matrixContainer = container.querySelector('#schoenberg-matrix');

  function renderMatrix() {
    matrixContainer.innerHTML = '';
    const mat = compute12ToneMatrix(currentRow);

    // 顶部表头：左上角空白，随后是 I0..I11
    const corner = document.createElement('div');
    corner.className = 'matrix-cell matrix-header';
    corner.textContent = 'P \\ I';
    matrixContainer.appendChild(corner);

    for (let c = 0; c < 12; c++) {
      const colHeader = document.createElement('div');
      colHeader.className = 'matrix-cell matrix-header';
      colHeader.textContent = `I${mat[0][c]}`;
      colHeader.title = `点击演奏倒影列 I${mat[0][c]}`;
      colHeader.addEventListener('click', () => playMatrixColumn(mat, c));
      matrixContainer.appendChild(colHeader);
    }

    // 每一行：行头 (P0..P11) + 12个单元格
    for (let r = 0; r < 12; r++) {
      const rowHeader = document.createElement('div');
      rowHeader.className = 'matrix-cell matrix-header';
      rowHeader.textContent = `P${mat[r][0]}`;
      rowHeader.title = `点击演奏原型行 P${mat[r][0]}`;
      rowHeader.addEventListener('click', () => playMatrixRow(mat, r));
      matrixContainer.appendChild(rowHeader);

      for (let c = 0; c < 12; c++) {
        const pitchClass = mat[r][c];
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.id = `matrix-cell-${r}-${c}`;
        cell.textContent = PITCH_CLASSES[pitchClass];
        cell.title = `${PITCH_CLASSES[pitchClass]} (音级 ${pitchClass})`;
        cell.addEventListener('click', () => {
          engine.playNote(`${PITCH_CLASSES[pitchClass]}4`, 0.6);
        });
        matrixContainer.appendChild(cell);
      }
    }
  }

  function playMatrixRow(mat, r, reverse = false) {
    let cols = Array.from({ length: 12 }, (_, i) => i);
    if (reverse) cols.reverse();
    const rowName = `${reverse ? 'R' : 'P'}${mat[r][reverse ? 11 : 0]}`;
    oscStatus.textContent = `🎲 正在演奏十二音序列：${rowName}…`;

    cols.forEach((c, idx) => {
      setTimeout(() => {
        const pitchClass = mat[r][c];
        const noteName = `${PITCH_CLASSES[pitchClass]}4`;
        engine.playNote(noteName, 0.35);

        // 高亮当前播放单元格
        const cell = container.querySelector(`#matrix-cell-${r}-${c}`);
        if (cell) {
          cell.classList.add('matrix-playing-cell');
          setTimeout(() => cell.classList.remove('matrix-playing-cell'), 250);
        }
      }, idx * 240);
    });
  }

  function playMatrixColumn(mat, c, reverse = false) {
    let rows = Array.from({ length: 12 }, (_, i) => i);
    if (reverse) rows.reverse();
    const colName = `${reverse ? 'RI' : 'I'}${mat[reverse ? 11 : 0][c]}`;
    oscStatus.textContent = `🎲 正在演奏十二音序列：${colName}…`;

    rows.forEach((r, idx) => {
      setTimeout(() => {
        const pitchClass = mat[r][c];
        const noteName = `${PITCH_CLASSES[pitchClass]}4`;
        engine.playNote(noteName, 0.35);

        const cell = container.querySelector(`#matrix-cell-${r}-${c}`);
        if (cell) {
          cell.classList.add('matrix-playing-cell');
          setTimeout(() => cell.classList.remove('matrix-playing-cell'), 250);
        }
      }, idx * 240);
    });
  }

  renderMatrix();

  container.querySelector('#btn-play-p0').addEventListener('click', () => {
    const mat = compute12ToneMatrix(currentRow);
    playMatrixRow(mat, 0, false);
  });
  container.querySelector('#btn-play-r0').addEventListener('click', () => {
    const mat = compute12ToneMatrix(currentRow);
    playMatrixRow(mat, 0, true);
  });
  container.querySelector('#btn-play-i0').addEventListener('click', () => {
    const mat = compute12ToneMatrix(currentRow);
    playMatrixColumn(mat, 0, false);
  });
  container.querySelector('#btn-play-ri0').addEventListener('click', () => {
    const mat = compute12ToneMatrix(currentRow);
    playMatrixColumn(mat, 0, true);
  });
  container.querySelector('#btn-random-row').addEventListener('click', () => {
    // Fisher-Yates 随机打乱 0..11
    const newRow = Array.from({ length: 12 }, (_, i) => i);
    for (let i = newRow.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newRow[i], newRow[j]] = [newRow[j], newRow[i]];
    }
    currentRow = newRow;
    renderMatrix();
    oscStatus.textContent = '🎲 已随机生成新的十二音序列原型！';
  });

  // 销毁方法
  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    engine.stopAll();
  }

  return { engine, destroy };
}
