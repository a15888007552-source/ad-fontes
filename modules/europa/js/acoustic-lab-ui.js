/**
 * 欧罗巴声学与乐律实验室 (Acoustic Lab UI & Controller)
 * 纯正 Ad Fontes 古典手稿风，涵盖律制微音、自然泛音物理加法合成、调式拉格、和声切片、先锋音块与十二音矩阵
 */

import {
  SoundEngine,
  TUNING_SYSTEMS,
  HARMONIC_SERIES,
  CHURCH_MODES,
  INDIAN_THAATS,
  SCHOENBERG_OP25_ROW,
  compute12ToneMatrix,
  C3_FREQ,
  NOTE_NAMES,
  GCLEF_PATH,
  FCLEF_PATH,
  NOTE_STAFF_MAP,
  STAVE_SCALE_PRESETS,
  getNoteStaffProps
} from './acoustic-lab.js';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function createAcousticLabUI(container) {
  const engine = new SoundEngine();
  let currentTab = 'tuning';
  let oscMode = 'waveform'; // 'waveform' 或 'spectrum'
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
          <p>纯前端 Web Audio 物理声学引擎 · 考量东西方律制数理、自然泛音加法合成、教会调式、和声动力学与先锋音块微复调</p>
        </div>
        <div class="lab-visualizer-card">
          <div style="display:flex;justify-content:space-between;align-items:center;width:100%;margin-bottom:6px;">
            <span style="font-family:var(--sans);font-size:11px;color:var(--mut);letter-spacing:.08em;font-weight:600;">物理声学示波器</span>
            <button class="action-btn" id="btn-toggle-osc-mode" style="padding:2px 8px;font-size:11px;">切换至频域谱</button>
          </div>
          <canvas id="lab-osc-canvas" width="320" height="84"></canvas>
          <div class="lab-visualizer-status" id="lab-osc-status">● 示波器就绪 · 点击发声</div>
        </div>
      </header>

      <nav class="lab-nav" role="tablist">
        <button class="lab-tab-btn active" data-tab="tuning">⚖️ 历史律制与中西算律 (Temperament)</button>
        <button class="lab-tab-btn" data-tab="harmonics">🌊 自然泛音与音色物理 (Harmonics)</button>
        <button class="lab-tab-btn" data-tab="modes">⛪ 教会调式与东方拉格 (Modes & Ragas)</button>
        <button class="lab-tab-btn" data-tab="harmonies">🎼 经典和声与声学物理 (Harmonies)</button>
        <button class="lab-tab-btn" data-tab="avantgarde">🌌 先锋音块与微音技法 (Avant-Garde)</button>
        <button class="lab-tab-btn" data-tab="matrix">🎲 勋伯格十二音序列计算机 (12-Tone Matrix)</button>
      </nav>

      <!-- 面板 1: 历史律制与中西算律 -->
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
              <div class="stave-card-header">
                <h3 class="lab-card-title" style="margin-bottom:0;border:none;padding:0;">
                  <span>🎼 古典五线谱音阶视唱与交互演奏 (Interactive Musical Staff)</span>
                  <span class="lab-card-badge" id="stave-active-scale-name">标尺：当前律制17半音全阶</span>
                </h3>
                <div class="stave-scale-filters" id="stave-scale-filters">
                  <button class="stave-filter-chip active" data-scale="chromatic">17半音全阶</button>
                  <button class="stave-filter-chip" data-scale="major">C大调自然音阶 (7音)</button>
                  <button class="stave-filter-chip" data-scale="pentatonic">先秦五声 (宫商角徵羽)</button>
                  <button class="stave-filter-chip" data-scale="pythagorean">毕氏五度相生链</button>
                  <button class="stave-filter-chip" data-scale="triad">主三和弦与减七</button>
                </div>
              </div>

              <p class="lab-card-hint" style="margin:8px 0 10px;line-height:1.6;">
                高音五线谱（G-Clef）物理标尺 · 标出各音在五线谱上的音级位置、加线与升降变音记号 · <strong>直接点击谱上任意音符即可发声</strong>，实时显示音分偏差与中国律吕名：
              </p>

              <!-- 五线谱挂载容器 -->
              <div class="stave-svg-container" id="tuning-stave-container"></div>

              <!-- 五线谱控制工具栏 -->
              <div class="stave-toolbar">
                <div class="stave-play-buttons">
                  <button class="action-btn" id="btn-stave-play-asc">▶ 顺阶演奏 (Ascending)</button>
                  <button class="action-btn" id="btn-stave-play-desc">◀ 逆阶演奏 (Descending)</button>
                  <button class="action-btn" id="btn-stave-play-chord">🎼 纵向和弦齐鸣 (Chord)</button>
                  <button class="action-btn" id="btn-stave-play-arpeggio">🎶 琶音演奏 (Arpeggio)</button>
                  <button class="action-btn danger" id="btn-stave-stop">✕ 停止</button>
                </div>
                <div class="stave-status-pill" id="stave-status-pill">
                  <span id="stave-tip-text">● 点击五线谱任意音符即可发声</span>
                </div>
              </div>

              <h4 class="stave-keyboard-divider">
                <span>🎹 联动琴键 (C4 – E5)</span>
                <span class="lab-card-hint">支持鼠标与触控 · 与上方五线谱双向高亮联动</span>
              </h4>
              <div class="keyboard-wrapper">
                <div class="keyboard" id="piano-keyboard"></div>
              </div>

              <div class="audition-pills">
                <span class="audition-label">一键听辨：</span>
                <button class="audition-btn" id="btn-play-c-major">▶ 弹奏 C 大调主和弦 (C-E-G)</button>
                <button class="audition-btn" id="btn-play-third-compare">🔍 纯律三度(386c) vs 平均律三度(400c)</button>
                <button class="audition-btn danger" id="btn-play-wolf-fifth">🐺 听辨巴洛克“狼音五度” (G#4 - Eb5)</button>
                <button class="audition-btn" id="btn-play-bach-color">🎹 巴赫良律色彩对比 (C大调纯净 vs F#大调紧张)</button>
                <button class="audition-btn" id="btn-play-sanfen-diff">📜 三分损益“黄钟不能还原”旋宫音差</button>
              </div>
            </div>
          </div>

          <div>
            <div class="lab-card">
              <h3 class="lab-card-title">律制音分 (Cent) 与律吕音名</h3>
              <p class="lab-card-hint" style="margin-bottom: 12px;">以 C4 (261.63Hz) 为基准，显示相对于 12-TET 的音分偏离微差与中国律吕对齐：</p>
              <table class="cents-table">
                <thead>
                  <tr>
                    <th>音名 / 律名</th>
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

      <!-- 面板 2: 自然泛音与音色物理 -->
      <section class="lab-panel" id="panel-harmonics">
        <div class="lab-grid-2">
          <div>
            <div class="lab-card" style="margin-bottom: 20px;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
                <h3 class="lab-card-title" style="margin:0;border:none;padding:0;">
                  <span>1 – 16 阶自然泛音列大谱表 (Harmonic Grand Staff)</span>
                </h3>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button class="action-btn" id="btn-play-all-harmonics" style="padding:4px 10px;font-size:12px;">▶ 依次向上演奏泛音阶梯 (1至16阶)</button>
                  <button class="action-btn" id="btn-play-harmonics-chord" style="padding:4px 10px;font-size:12px;">🎼 泛音全共鸣齐鸣</button>
                  <button class="action-btn danger" id="btn-stop-harmonics-stave" style="padding:4px 10px;font-size:12px;">✕ 停止</button>
                </div>
              </div>
              <p class="lab-card-hint" style="margin-bottom: 12px; line-height: 1.6;">
                大谱表（Grand Staff: 高低音联合谱表）呈现基音 C3 (130.81Hz) 起连续 16 阶自然泛音。观察第7分音（自然小七度偏低31音分）与第11分音（半增四度偏低49音分）。<strong>点击谱上任意音符直接试听对应分音</strong>：
              </p>
              
              <!-- 泛音大谱表挂载点 -->
              <div class="stave-svg-container" id="harmonics-grand-staff-container"></div>

              <h4 style="font-family:var(--serif);font-size:14.5px;color:var(--ink);margin:16px 0 8px;border-top:1px solid color-mix(in srgb, var(--line) 60%, transparent);padding-top:10px;">
                <span>各阶分音物理参数与弦乐/管乐手塞音修音注记</span>
              </h4>
              <div class="harmonics-ladder" id="harmonics-ladder"></div>
            </div>
          </div>

          <div>
            <div class="lab-card">
              <h3 class="lab-card-title">
                <span>物理加法合成管风琴 (Additive Synthesis)</span>
                <span class="lab-card-badge">实时叠置泛音塑形音色</span>
              </h3>
              <p class="lab-card-hint" style="margin-bottom: 12px; line-height: 1.6;">
                如同管风琴音栓（Stops）或哈蒙德双排键拉杆，实时开关泛音分音，体验音色如何从纯正弦波演化为乐器：
              </p>
              
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
                <button class="audition-btn" id="btn-preset-sine">纯正弦波 (仅1st)</button>
                <button class="audition-btn" id="btn-preset-flute">木管长笛 (弱二次)</button>
                <button class="audition-btn" id="btn-preset-clarinet">单簧管 (奇次谐波)</button>
                <button class="audition-btn" id="btn-preset-violin">小提琴 (全谐波锯齿)</button>
                <button class="audition-btn" id="btn-preset-organ">管风琴全栓 (Grand Organ)</button>
                <button class="action-btn" id="btn-harmonics-stop" style="color:var(--acc);">✕ 全部静音</button>
              </div>

              <div id="harmonic-sliders-container" style="display:grid;gap:10px;"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- 面板 3: 教会调式与拉格 -->
      <section class="lab-panel" id="panel-modes">
        <div class="drone-switch-bar">
          <span>🪕 <strong>印度谭普拉琴 (Tanpura Drone) 持续背景低音</strong>：采用双正弦与低通滤波物理合成 Pa-Sa-Sa-Sa，模拟蚕丝琴弦与琴马微摩擦拍频</span>
          <button class="action-btn" id="btn-toggle-drone">🔊 开启持续嗡鸣低音 (Drone)</button>
        </div>

        <h3 class="mode-section-title">中世纪八大教会调式 (Gregorian Modes)</h3>
        <div class="mode-grid" id="church-modes-grid"></div>

        <h3 class="mode-section-title" style="margin-top: 28px;">北印度古典十大母调 (That System)</h3>
        <div class="mode-grid" id="indian-thaats-grid"></div>
      </section>

      <!-- 面板 4: 经典和声切片与声学物理 -->
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
              <h3 class="lab-card-title">
                <span>普隆普-莱费尔特拍频与粗糙度实验</span>
                <span class="lab-card-badge">Plomp-Levelt Sensory Roughness</span>
              </h3>
              <p class="lab-card-hint" style="line-height: 1.6; margin-bottom: 12px;">
                当两个纯音频率极度贴近时，产生低频拍频（如 4Hz）；当相距在临界频带（约 12-15Hz）时，产生人类听觉感官最刺耳的“粗糙感峰值”：
              </p>
              
              <div style="margin-bottom: 16px;">
                <label style="font-family:var(--sans);font-size:12px;font-weight:600;display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span>调节拍频差值 (Δf = 440Hz + Δf)：<strong id="beat-label" style="color:var(--acc)">4 Hz</strong></span>
                </label>
                <input type="range" id="beat-slider" min="0" max="35" step="0.5" value="4" style="width:100%;">
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--mut);margin-top:4px;">
                  <span>0Hz (纯同度)</span>
                  <span>4Hz (慢拍)</span>
                  <span>14Hz (粗糙度极值)</span>
                  <span>30Hz (粗糙消退)</span>
                </div>
              </div>
              <button class="action-btn" id="btn-play-beats" style="width:100%;justify-content:center;">▶ 试听当前拍频与粗糙度 (2.5秒)</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 面板 5: 二十世纪先锋音块与微音技法 -->
      <section class="lab-panel" id="panel-avantgarde">
        <div class="lab-grid-2">
          <div>
            <div class="harmonic-card">
              <h4>1. 斯克里亚宾“神秘和弦” (Scriabin Promethean Chord)</h4>
              <p>亚历山大·斯克里亚宾《普罗米修斯：火之诗》Op.60 的核心神秘和声。六音四度叠置：<strong>C - F# - Bb - E - A - D</strong>。融合全音阶与高阶自然泛音，瓦解传统大小调功能，代表俄国白银时代神智学宇宙神秘主义。</p>
              <div class="harmonic-controls">
                <button class="action-btn" id="btn-scriabin-mystic">▶ 演奏神秘和弦 (六度叠置与泛音共鸣)</button>
              </div>
            </div>

            <div class="harmonic-card">
              <h4>2. 利盖蒂微复调音块 (Ligeti Micropolyphonic Sound Mass)</h4>
              <p>《大气》(Atmosphères) 与《永恒之光》核心技法。12个紧密半音微复调声部交织，每个声部带有微小的随机相位、极低频颤音和时间延迟。传统旋律被完全抹去，声音化为静止却内部剧烈翻滚的“音响星云”。</p>
              <div class="harmonic-controls">
                <button class="action-btn" id="btn-ligeti-cluster">🌌 模拟利盖蒂微复调星云音块 (4.5秒缓入弥漫)</button>
              </div>
            </div>

            <div class="harmonic-card">
              <h4>3. 彭德雷茨基音簇与微音滑奏 (Penderecki Tone Cluster)</h4>
              <p>《广岛受难者的挽歌》(Threnody to the Victims of Hiroshima) 极端音响实验。16把弦乐器在 1800Hz - 3200Hz 极高音区演奏带摩擦感的带通滤波密集音簇，并缓慢向下滑奏，带来撕裂般的灾难悲鸣。</p>
              <div class="harmonic-controls">
                <button class="action-btn danger" id="btn-penderecki-cluster">⚡ 演奏极高音区弦乐音簇与微音滑奏 (Threnody)</button>
              </div>
            </div>
          </div>

          <div>
            <div class="lab-card">
              <h3 class="lab-card-title">
                <span>阿洛伊斯·哈巴 24平均律微分音</span>
                <span class="lab-card-badge">24-TET Quarter-Tones</span>
              </h3>
              <p class="lab-card-hint" style="line-height: 1.6; margin-bottom: 12px;">
                捷克先锋作曲家阿洛伊斯·哈巴（Alois Hába）设计的 1/4 音体系（每级50音分），包含古希腊“中立三度”（350音分）与极细腻的滑音微差：
              </p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="action-btn" id="btn-play-quarter-scale">▶ 演奏 C4 起 1/4 音微分音阶 (50c级进)</button>
                <button class="action-btn" id="btn-play-neutral-third">🔍 中立三度 (350c) vs 小三度 (300c) vs 大三度 (400c)</button>
              </div>
            </div>

            <div class="lab-card" style="margin-top: 18px;">
              <h3 class="lab-card-title">梅西安有限移位调式</h3>
              <p class="lab-card-hint" style="line-height: 1.6; margin-bottom: 12px;">奥利维埃·梅西安在《我的音乐语言的技巧》中总结的不可移位对称调式：</p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="action-btn" id="btn-messiaen-1">▶ 第一调式：全音阶 (Whole-tone Scale)</button>
                <button class="action-btn" id="btn-messiaen-2">▶ 第二调式：八音阶 (Octatonic: 半-全-半-全)</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 面板 6: 勋伯格十二音序列矩阵计算机 -->
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
  // 示波器动画循环 (Canvas Oscilloscope: Waveform & Spectrum)
  // ==========================================================================
  const canvas = container.querySelector('#lab-osc-canvas');
  const canvasCtx = canvas.getContext('2d');
  const oscStatus = container.querySelector('#lab-osc-status');
  const btnToggleOscMode = container.querySelector('#btn-toggle-osc-mode');

  btnToggleOscMode.addEventListener('click', () => {
    oscMode = oscMode === 'waveform' ? 'spectrum' : 'waveform';
    btnToggleOscMode.textContent = oscMode === 'waveform' ? '切换至频域谱' : '切换至时域波形';
  });

  function drawOscilloscope() {
    animId = requestAnimationFrame(drawOscilloscope);

    // 背景：优雅温润的古典手稿羊皮纸色
    canvasCtx.fillStyle = '#FAF5E8';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    if (oscMode === 'waveform') {
      // 绘制中心细准线（古籍标尺刻度）
      canvasCtx.strokeStyle = 'rgba(198, 186, 146, 0.65)';
      canvasCtx.lineWidth = 1;
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, canvas.height / 2);
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();

      if (!engine.analyser) return;

      const bufferLength = engine.analyser.frequencyBinCount;
      const timeData = new Uint8Array(bufferLength);
      engine.analyser.getByteTimeDomainData(timeData);

      // 绘制波形：深绯红（Rubric Red #8C2B1F）
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#8C2B1F';
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
    } else {
      // 频域柱状谱 (Spectrum)
      if (!engine.analyser) return;
      const bufferLength = engine.analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      engine.analyser.getByteFrequencyData(freqData);

      const numBars = 36;
      const barWidth = (canvas.width / numBars) - 2;
      for (let i = 0; i < numBars; i++) {
        // 取对数分布频带
        const freqIdx = Math.floor(Math.pow(i / numBars, 1.8) * (bufferLength / 2));
        const val = freqData[freqIdx] || 0;
        const barHeight = (val / 255) * (canvas.height - 10);
        const x = i * (barWidth + 2) + 2;
        const y = canvas.height - barHeight;

        canvasCtx.fillStyle = i % 2 === 0 ? '#8C2B1F' : '#9A7B2D';
        canvasCtx.fillRect(x, y, barWidth, barHeight);
      }
    }
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

      engine.stopAll();
    });
  });

  // ==========================================================================
  // 面板 1: 律制系统交互、五线谱交互台与钢琴键盘渲染
  // ==========================================================================
  const tuningContainer = container.querySelector('#tuning-chips-container');
  const tuningDesc = container.querySelector('#tuning-description');
  const currentTuningName = container.querySelector('#current-tuning-name');
  const pianoKeyboard = container.querySelector('#piano-keyboard');
  const centsTableBody = container.querySelector('#cents-table-body');

  const staveScaleFilters = container.querySelector('#stave-scale-filters');
  const staveActiveScaleName = container.querySelector('#stave-active-scale-name');
  const staveTipText = container.querySelector('#stave-tip-text');

  let activeScaleId = 'chromatic';
  let activeNotes = [...STAVE_SCALE_PRESETS['chromatic'].notes];
  let stavePlaybackTimers = [];

  function stopStavePlayback() {
    stavePlaybackTimers.forEach(tid => clearTimeout(tid));
    stavePlaybackTimers = [];
  }

  function renderStaffSvg() {
    const staveContainer = container.querySelector('#tuning-stave-container');
    if (!staveContainer) return;

    const tuning = TUNING_SYSTEMS[engine.tuningKey] || TUNING_SYSTEMS['12-tet'];
    const std12 = TUNING_SYSTEMS['12-tet'].cents;
    const isChinese = engine.tuningKey === 'zhu-zaiyu' || engine.tuningKey === 'sanfen-sunyi';

    const S = 14; // Staff line spacing
    const staffTopY = 52; // Line 5 (F5) is at 52
    const staffLines = [52, 66, 80, 94, 108]; // F5, D5, B4, G4, E4

    const width = 880;
    const height = 180;
    const numNotes = activeNotes.length;

    const startX = 110;
    const endX = 840;
    const stepX = numNotes > 1 ? (endX - startX) / (numNotes - 1) : 0;

    let notesSvg = '';
    activeNotes.forEach((noteName, idx) => {
      const props = getNoteStaffProps(noteName, staffTopY, S);
      const x = numNotes === 1 ? (startX + endX) / 2 : Math.round(startX + idx * stepX);
      const y = props.y;
      const stemUp = props.stemUp;
      const stemX = stemUp ? x + 5.5 : x - 5.5;
      const stemY2 = stemUp ? y - 36 : y + 36;

      // Ledgers
      let ledgersSvg = '';
      props.ledgerLines.forEach(ly => {
        ledgersSvg += `<line x1="${x - 11}" y1="${ly}" x2="${x + 11}" y2="${ly}" stroke="#5C5438" stroke-width="1.3"/>`;
      });

      // Accidental
      let accSvg = '';
      if (props.acc) {
        accSvg = `<text x="${x - 13}" y="${y + 4}" font-family="'Palatino Linotype', Georgia, serif" font-size="16" font-weight="bold" fill="#7A2E1D" text-anchor="middle">${props.acc}</text>`;
      }

      // Frequency and Cent
      const freq = engine.getFrequency(noteName);
      const pitchIdx = PITCH_CLASSES.indexOf(noteName.replace(/\d+/, ''));
      const curCent = pitchIdx >= 0 ? tuning.cents[pitchIdx % tuning.cents.length] : 0;
      const stdCent = pitchIdx >= 0 ? std12[pitchIdx] : 0;
      const deltaC = curCent - stdCent;
      let deltaStr = `${deltaC > 0 ? '+' : ''}${deltaC.toFixed(1)}c`;
      if (Math.abs(deltaC) < 0.05) deltaStr = '0c';

      // Label on top
      const luLabel = (isChinese && props.lu) ? `<tspan fill="#9A7B2D" font-size="10.5"> (${props.lu})</tspan>` : '';
      const topLabel = `<text x="${x}" y="32" font-family="var(--sans)" font-size="11.5" font-weight="bold" fill="#7A2E1D" text-anchor="middle">${noteName}${luLabel}</text>`;

      // Label on bottom
      const bottomLabel = `
        <text x="${x}" y="148" font-family="var(--mono)" font-size="10" fill="#77704F" text-anchor="middle">${freq.toFixed(1)}Hz</text>
        <text x="${x}" y="163" font-family="var(--mono)" font-size="9.5" fill="${Math.abs(deltaC) > 0.05 ? '#7A2E1D' : '#77704F'}" font-weight="${Math.abs(deltaC) > 0.05 ? '700' : 'normal'}" text-anchor="middle">Δ${deltaStr}</text>
      `;

      notesSvg += `
        <g class="staff-note-node" id="stave-note-${noteName.replace('#', 'sharp')}" data-note="${noteName}" data-x="${x}" data-y="${y}" tabindex="0" role="button" aria-label="音符 ${noteName}">
          <rect x="${x - 16}" y="15" width="32" height="155" fill="transparent" pointer-events="all" style="cursor:pointer;" />
          <circle cx="${x}" cy="${y}" r="18" fill="transparent" pointer-events="all" style="cursor:pointer;" />
          ${ledgersSvg}
          <ellipse class="stave-notehead" cx="${x}" cy="${y}" rx="6.5" ry="4.5" transform="rotate(-22, ${x}, ${y})" fill="#35301F" stroke="#1D1A10" stroke-width="0.5" pointer-events="all"/>
          <line class="stave-stem" x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemY2}" stroke="#35301F" stroke-width="1.3" pointer-events="none"/>
          ${accSvg}
          ${topLabel}
          ${bottomLabel}
        </g>
      `;
    });

    staveContainer.innerHTML = `
      <svg class="acoustic-stave-svg" viewBox="0 0 ${width} ${height}" width="100%">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#FAF5E8" rx="4" pointer-events="none" />
        ${staffLines.map(y => `<line x1="28" y1="${y}" x2="${width - 24}" y2="${y}" stroke="#655D44" stroke-width="1.1" pointer-events="none"/>`).join('\n        ')}
        
        <!-- 左侧开端线与高音谱号 -->
        <line x1="28" y1="52" x2="28" y2="108" stroke="#655D44" stroke-width="2" pointer-events="none"/>
        <g transform="translate(36, 110.0) scale(0.040, -0.040)" pointer-events="none">
          <path d="${GCLEF_PATH}" fill="#7A2E1D"/>
        </g>
        
        <!-- 右侧终止双小节线 -->
        <line x1="${width - 28}" y1="52" x2="${width - 28}" y2="108" stroke="#655D44" stroke-width="1.2" pointer-events="none"/>
        <line x1="${width - 24}" y1="52" x2="${width - 24}" y2="108" stroke="#655D44" stroke-width="3" pointer-events="none"/>

        <!-- 所有音符节点 -->
        ${notesSvg}
      </svg>
    `;

    // 绑定音符点击发声
    staveContainer.querySelectorAll('.staff-note-node').forEach(node => {
      const noteName = node.dataset.note;
      node.addEventListener('click', () => {
        playStaffNote(noteName);
      });
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playStaffNote(noteName);
        }
      });
    });
  }

  function playStaffNote(noteName, duration = 1.4) {
    const freq = engine.getFrequency(noteName);
    engine.playNote(noteName, duration, freq);

    // 高亮五线谱音符
    highlightStaffNote(noteName);

    // 联动高亮钢琴键盘对应按键
    highlightPianoKey(noteName, duration);

    // 状态提示
    const meta = NOTE_STAFF_MAP[noteName] || {};
    const tuning = TUNING_SYSTEMS[engine.tuningKey] || TUNING_SYSTEMS['12-tet'];
    const lu = meta.lu ? ` · 律吕：${meta.lu}` : '';
    if (staveTipText) {
      staveTipText.innerHTML = `🎼 <strong>五线谱弹奏：${noteName}</strong> (唱名: ${meta.solfege || '—'}${lu}) · 频率：<strong>${freq.toFixed(2)} Hz</strong> · 律制：${tuning.name}`;
    }
    oscStatus.textContent = `🎼 五线谱弹奏：${noteName} (${freq.toFixed(2)} Hz)`;
  }

  function highlightStaffNote(noteName) {
    const safeId = noteName.replace('#', 'sharp');
    const node = container.querySelector(`#stave-note-${safeId}`);
    if (!node) return;

    node.classList.add('playing');
    setTimeout(() => node.classList.remove('playing'), 600);

    const ellipse = node.querySelector('.stave-notehead');
    if (ellipse) {
      const cx = ellipse.getAttribute('cx');
      const cy = ellipse.getAttribute('cy');
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', cx);
      ring.setAttribute('cy', cy);
      ring.setAttribute('r', '6');
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', '#8C2B1F');
      ring.setAttribute('stroke-width', '2.5');
      ring.setAttribute('class', 'stave-sound-ring');
      node.appendChild(ring);
      setTimeout(() => ring.remove(), 700);
    }
  }

  function highlightPianoKey(noteName, duration = 1.2) {
    const key = pianoKeyboard.querySelector(`[data-note="${noteName}"]`);
    if (key) {
      key.classList.add('pressed');
      setTimeout(() => key.classList.remove('pressed'), Math.min(duration * 600, 500));
    }
  }

  function updateStaveTipByNote(noteName) {
    const meta = NOTE_STAFF_MAP[noteName] || {};
    const freq = engine.getFrequency(noteName);
    const tuning = TUNING_SYSTEMS[engine.tuningKey] || TUNING_SYSTEMS['12-tet'];
    const lu = meta.lu ? ` · 律吕：${meta.lu}` : '';
    if (staveTipText) {
      staveTipText.innerHTML = `🎹 <strong>琴键点奏：${noteName}</strong> (唱名: ${meta.solfege || '—'}${lu}) · 频率：<strong>${freq.toFixed(2)} Hz</strong> · 律制：${tuning.name}`;
    }
    oscStatus.textContent = `🎹 琴键点奏：${noteName} (${freq.toFixed(2)} Hz)`;
  }

  function renderTuningChips() {
    tuningContainer.innerHTML = '';
    Object.entries(TUNING_SYSTEMS).forEach(([key, item]) => {
      const chip = document.createElement('div');
      chip.className = `tuning-chip ${engine.tuningKey === key ? 'active' : ''}`;
      chip.innerHTML = `
        <div class="tuning-chip-name">${item.name}</div>
        <div class="tuning-chip-desc">${item.desc.substring(0, 38)}…</div>
      `;
      chip.addEventListener('click', () => {
        engine.setTuning(key);
        renderTuningChips();
        updateTuningInfo();
        renderStaffSvg();
        renderKeyboard();
        renderCentsTable();
      });
      tuningContainer.appendChild(chip);
    });
  }

  function updateTuningInfo() {
    const current = TUNING_SYSTEMS[engine.tuningKey] || TUNING_SYSTEMS['12-tet'];
    currentTuningName.textContent = `当前：${current.name}`;
    tuningDesc.textContent = current.desc;
    oscStatus.textContent = `● 律制：${current.name}`;
  }

  function renderKeyboard() {
    pianoKeyboard.innerHTML = '';
    const tuning = TUNING_SYSTEMS[engine.tuningKey] || TUNING_SYSTEMS['12-tet'];

    KEYBOARD_NOTES.forEach((item) => {
      const keyElem = document.createElement('div');
      keyElem.className = `key ${item.isBlack ? 'black' : 'white'}`;
      keyElem.dataset.note = item.note;

      const noteName = item.note.replace(/\d+/, '');
      const noteIdx = PITCH_CLASSES.indexOf(noteName);
      const cent = tuning.cents[noteIdx % tuning.cents.length];

      keyElem.innerHTML = `
        <span class="key-note">${item.note}</span>
        <span class="key-cent">${cent.toFixed(0)}c</span>
      `;

      keyElem.addEventListener('mousedown', () => {
        keyElem.classList.add('pressed');
        engine.startNote(item.note);
        highlightStaffNote(item.note);
        updateStaveTipByNote(item.note);
      });
      keyElem.addEventListener('mouseup', () => {
        keyElem.classList.remove('pressed');
        engine.stopNote(item.note);
      });
      keyElem.addEventListener('mouseleave', () => {
        keyElem.classList.remove('pressed');
        engine.stopNote(item.note);
      });

      keyElem.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keyElem.classList.add('pressed');
        engine.startNote(item.note);
        highlightStaffNote(item.note);
        updateStaveTipByNote(item.note);
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
    const tuning = TUNING_SYSTEMS[engine.tuningKey] || TUNING_SYSTEMS['12-tet'];
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

      const luName = (tuning.lus && tuning.lus[i]) ? ` <span style="font-size:11px;color:var(--gold);font-family:var(--serif);">(${tuning.lus[i]})</span>` : '';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${name}</strong>${luName}</td>
        <td>${curCent.toFixed(1)}</td>
        <td>${stdCent.toFixed(1)}</td>
        <td class="${diffClass}">${diffStr}</td>
      `;
      centsTableBody.appendChild(row);
    });
  }

  // 五线谱尺度选择按钮
  if (staveScaleFilters) {
    staveScaleFilters.querySelectorAll('.stave-filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        staveScaleFilters.querySelectorAll('.stave-filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeScaleId = btn.dataset.scale;
        activeNotes = [...(STAVE_SCALE_PRESETS[activeScaleId]?.notes || STAVE_SCALE_PRESETS['chromatic'].notes)];
        if (staveActiveScaleName) {
          staveActiveScaleName.textContent = `标尺：${STAVE_SCALE_PRESETS[activeScaleId].name}`;
        }
        renderStaffSvg();
      });
    });
  }

  // 五线谱工具栏演奏按钮
  container.querySelector('#btn-stave-play-asc').addEventListener('click', () => {
    stopStavePlayback();
    activeNotes.forEach((n, idx) => {
      const tid = setTimeout(() => {
        playStaffNote(n, 0.45);
      }, idx * 280);
      stavePlaybackTimers.push(tid);
    });
  });

  container.querySelector('#btn-stave-play-desc').addEventListener('click', () => {
    stopStavePlayback();
    const rev = [...activeNotes].reverse();
    rev.forEach((n, idx) => {
      const tid = setTimeout(() => {
        playStaffNote(n, 0.45);
      }, idx * 280);
      stavePlaybackTimers.push(tid);
    });
  });

  container.querySelector('#btn-stave-play-chord').addEventListener('click', () => {
    stopStavePlayback();
    engine.playChord(activeNotes, 2.5);
    activeNotes.forEach(n => {
      highlightStaffNote(n);
      highlightPianoKey(n, 2.2);
    });
    if (staveTipText) {
      staveTipText.innerHTML = `🎼 <strong>五线谱纵向和弦齐鸣</strong>：正在同时发响 ${activeNotes.length} 个音级之复合和声！`;
    }
  });

  container.querySelector('#btn-stave-play-arpeggio').addEventListener('click', () => {
    stopStavePlayback();
    activeNotes.forEach((n, idx) => {
      const tid = setTimeout(() => {
        playStaffNote(n, 1.2);
      }, idx * 100);
      stavePlaybackTimers.push(tid);
    });
  });

  container.querySelector('#btn-stave-stop').addEventListener('click', () => {
    stopStavePlayback();
    engine.stopAll();
    if (staveTipText) staveTipText.innerHTML = '● 演奏已停止';
  });

  renderTuningChips();
  updateTuningInfo();
  renderStaffSvg();
  renderKeyboard();
  renderCentsTable();

  // 一键听辨绑定
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
    const baseC = 261.625565;
    const pureE = baseC * (5 / 4);
    const eqE = baseC * Math.pow(2, 400 / 1200);

    oscStatus.textContent = '🔊 纯律大三度 5:4 (386音分，清亮无拍频)…';
    engine.playNote('C4', 1.6, baseC);
    engine.playNote('E4', 1.6, pureE);

    setTimeout(() => {
      oscStatus.textContent = '🔊 十二平均律大三度 (400音分，振颤拍频)…';
      engine.playNote('C4', 1.6, baseC);
      engine.playNote('E4', 1.6, eqE);
    }, 2000);
  });

  container.querySelector('#btn-play-wolf-fifth').addEventListener('click', () => {
    const baseC = 261.625565;
    const gSharp4 = baseC * Math.pow(2, 772.6 / 1200);
    const eFlat5 = baseC * 2 * Math.pow(2, 310.3 / 1200);
    const pureDSharp5 = gSharp4 * 1.5;

    oscStatus.textContent = '🐺 巴洛克狼音五度：G#4 与 Eb5 碰撞出剧烈干涉狼嚎拍频！';
    engine.playNote('G#4', 2.4, gSharp4);
    engine.playNote('Eb5', 2.4, eFlat5);

    setTimeout(() => {
      oscStatus.textContent = '对比：纯正五度 (3:2，平稳协和)…';
      engine.playNote('G#4', 2.0, gSharp4);
      engine.playNote('D#5', 2.0, pureDSharp5);
    }, 2800);
  });

  container.querySelector('#btn-play-bach-color').addEventListener('click', () => {
    oscStatus.textContent = '🎹 韦克迈斯特良律：正在演奏 C大调（纯正平和）…';
    engine.setTuning('werckmeister-iii');
    renderTuningChips();
    updateTuningInfo();
    renderKeyboard();
    renderCentsTable();

    // 弹奏 C - E - G
    engine.playNote('C4', 1.8);
    engine.playNote('E4', 1.8);
    engine.playNote('G4', 1.8);

    setTimeout(() => {
      oscStatus.textContent = '🎹 韦克迈斯特良律：正在演奏 F#大调（锐利紧绷之张力）…';
      engine.playNote('F#4', 2.0);
      engine.playNote('A#4', 2.0);
      engine.playNote('C#5', 2.0);
    }, 2200);
  });

  container.querySelector('#btn-play-sanfen-diff').addEventListener('click', () => {
    const baseC = 261.625565;
    const qingHuangZhong = baseC * Math.pow(2, 23.46 / 1200); // 清黄钟 (高23.46音分)
    oscStatus.textContent = '📜 三分损益律：黄钟 (C4) 与第十二次生律之清黄钟碰撞（古希腊同称毕氏音差）…';
    engine.playNote('C4', 3.0, baseC);
    engine.playNote('C4', 3.0, qingHuangZhong);
  });

  // ==========================================================================
  // 面板 2: 1-16 阶自然泛音列大谱表与加法合成
  // ==========================================================================
  const harmonicsGrandStaffContainer = container.querySelector('#harmonics-grand-staff-container');
  let harmonicsPlaybackTimers = [];

  function stopHarmonicsPlayback() {
    harmonicsPlaybackTimers.forEach(tid => clearTimeout(tid));
    harmonicsPlaybackTimers = [];
    engine.stopAllHarmonics();
  }

  const HARMONICS_STAFF_SPECS = [
    { n: 1, note: 'C3', y: 154, ledgers: [], acc: '', dev: '0c', role: '基音' },
    { n: 2, note: 'C4', y: 107, ledgers: [107], acc: '', dev: '0c', role: '八度' },
    { n: 3, note: 'G4', y: 76, ledgers: [], acc: '', dev: '+2c', role: '十二度' },
    { n: 4, note: 'C5', y: 58, ledgers: [], acc: '', dev: '0c', role: '双八度' },
    { n: 5, note: 'E5', y: 46, ledgers: [], acc: '', dev: '-14c', role: '大三度' },
    { n: 6, note: 'G5', y: 34, ledgers: [], acc: '', dev: '+2c', role: '十九度' },
    { n: 7, note: 'Bb5', y: 22, ledgers: [28], acc: '♭', dev: '↓-31c', role: '自然七度', isSpecial: true },
    { n: 8, note: 'C6', y: 16, ledgers: [28, 16], acc: '', dev: '0c', role: '三八度' },
    { n: 9, note: 'D6', y: 10, ledgers: [28, 16], acc: '', dev: '+4c', role: '大全音' },
    { n: 10, note: 'E6', y: 4, ledgers: [28, 16, 4], acc: '', dev: '-14c', role: '大三度' },
    { n: 11, note: 'F#6', y: -2, ledgers: [28, 16, 4], acc: '♯', dev: '↓-49c', role: '中立四度', isSpecial: true },
    { n: 12, note: 'G6', y: -8, ledgers: [28, 16, 4, -8], acc: '', dev: '+2c', role: '纯五度' },
    { n: 13, note: 'Ab6', y: -14, ledgers: [28, 16, 4, -8], acc: '♭', dev: '↑+41c', role: '小六度', isSpecial: true },
    { n: 14, note: 'Bb6', y: -20, ledgers: [28, 16, 4, -8, -20], acc: '♭', dev: '↓-31c', role: '自然七度', isSpecial: true },
    { n: 15, note: 'B6', y: -26, ledgers: [28, 16, 4, -8, -20], acc: '', dev: '-12c', role: '大七度' },
    { n: 16, note: 'C7', y: -32, ledgers: [28, 16, 4, -8, -20, -32], acc: '', dev: '0c', role: '四八度' }
  ];

  function renderHarmonicsGrandStaffSvg() {
    if (!harmonicsGrandStaffContainer) return;

    const width = 940;
    const height = 240;
    const viewBox = '0 -42 940 240';

    // Treble Lines (5 lines): 40, 52, 64, 76, 88
    const trebleLines = [40, 52, 64, 76, 88];
    // Bass Lines (5 lines): 126, 138, 150, 162, 174
    const bassLines = [126, 138, 150, 162, 174];

    const startX = 110;
    const endX = 900;
    const stepX = (endX - startX) / (HARMONICS_STAFF_SPECS.length - 1);

    let partialsSvg = '';
    HARMONICS_STAFF_SPECS.forEach((item, idx) => {
      const x = Math.round(startX + idx * stepX);
      const y = item.y;
      const freq = (C3_FREQ * item.n).toFixed(1);
      const stemUp = item.n <= 3 || item.n >= 7;
      const stemX = stemUp ? x + 5.5 : x - 5.5;
      const stemY2 = stemUp ? y - 30 : y + 30;

      // Ledgers
      let ledgersSvg = '';
      item.ledgers.forEach(ly => {
        ledgersSvg += `<line x1="${x - 11}" y1="${ly}" x2="${x + 11}" y2="${ly}" stroke="#5C5438" stroke-width="1.3"/>`;
      });

      // Accidental
      let accSvg = '';
      if (item.acc) {
        accSvg = `<text x="${x - 13}" y="${y + 4}" font-family="'Palatino Linotype', Georgia, serif" font-size="15" font-weight="bold" fill="#7A2E1D" text-anchor="middle">${item.acc}</text>`;
      }

      // Top label: Order & Note
      const orderColor = item.isSpecial ? 'var(--acc)' : 'var(--ink)';
      const topLabel = `
        <text x="${x}" y="-26" font-family="var(--sans)" font-size="11" font-weight="bold" fill="${orderColor}" text-anchor="middle">n=${item.n}</text>
        <text x="${x}" y="-13" font-family="var(--serif)" font-size="12" font-weight="bold" fill="${item.isSpecial ? '#7A2E1D' : '#35301F'}" text-anchor="middle">${item.note}</text>
      `;

      // Bottom label: Hz and Dev
      const devColor = item.isSpecial ? '#7A2E1D' : '#77704F';
      const bottomLabel = `
        <text x="${x}" y="188" font-family="var(--mono)" font-size="9.5" fill="#77704F" text-anchor="middle">${freq}Hz</text>
        <text x="${x}" y="199" font-family="var(--mono)" font-size="9" font-weight="${item.isSpecial ? '700' : 'normal'}" fill="${devColor}" text-anchor="middle">${item.dev}</text>
      `;

      partialsSvg += `
        <g class="staff-note-node" id="harmonic-stave-node-${item.n}" data-n="${item.n}" data-freq="${freq}" tabindex="0" role="button" aria-label="第${item.n}分音 ${item.note}">
          <rect x="${x - 14}" y="-35" width="28" height="242" fill="transparent" pointer-events="all" style="cursor:pointer;" />
          <circle cx="${x}" cy="${y}" r="16" fill="transparent" pointer-events="all" style="cursor:pointer;" />
          ${ledgersSvg}
          <ellipse class="stave-notehead" cx="${x}" cy="${y}" rx="6" ry="4.2" transform="rotate(-20, ${x}, ${y})" fill="#35301F" stroke="#1D1A10" stroke-width="0.5" pointer-events="all"/>
          <line class="stave-stem" x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemY2}" stroke="#35301F" stroke-width="1.2" pointer-events="none"/>
          ${accSvg}
          ${topLabel}
          ${bottomLabel}
        </g>
      `;
    });

    harmonicsGrandStaffContainer.innerHTML = `
      <svg class="acoustic-stave-svg" viewBox="${viewBox}" width="100%">
        <rect x="0" y="-38" width="${width}" height="${height}" fill="#FAF5E8" rx="4" pointer-events="none" />
        
        <!-- 高音谱表五线 -->
        ${trebleLines.map(y => `<line x1="28" y1="${y}" x2="${width - 24}" y2="${y}" stroke="#655D44" stroke-width="1.1" pointer-events="none"/>`).join('\n        ')}
        <!-- 低音谱表五线 -->
        ${bassLines.map(y => `<line x1="28" y1="${y}" x2="${width - 24}" y2="${y}" stroke="#655D44" stroke-width="1.1" pointer-events="none"/>`).join('\n        ')}
        
        <!-- 左侧联合谱表连谱线与花括号轴线 -->
        <line x1="28" y1="40" x2="28" y2="174" stroke="#655D44" stroke-width="2.5" pointer-events="none"/>
        <line x1="24" y1="36" x2="24" y2="178" stroke="#7A2E1D" stroke-width="1.5" pointer-events="none"/>

        <!-- 高音谱号 (Treble Clef) -->
        <g transform="translate(36, 96.0) scale(0.036, -0.036)" pointer-events="none">
          <path d="${GCLEF_PATH}" fill="#7A2E1D"/>
        </g>

        <!-- 低音谱号 (Bass Clef) -->
        <g transform="translate(36, 172.0) scale(0.034, -0.034)" pointer-events="none">
          <path d="${FCLEF_PATH}" fill="#35301F"/>
        </g>

        <!-- 右侧双终止小节线 -->
        <line x1="${width - 28}" y1="40" x2="${width - 28}" y2="174" stroke="#655D44" stroke-width="1.2" pointer-events="none"/>
        <line x1="${width - 24}" y1="40" x2="${width - 24}" y2="174" stroke="#655D44" stroke-width="3" pointer-events="none"/>

        <!-- 16阶泛音音符节点 -->
        ${partialsSvg}
      </svg>
    `;

    // 绑定点击试听对应分音
    harmonicsGrandStaffContainer.querySelectorAll('.staff-note-node').forEach(node => {
      const n = parseInt(node.dataset.n, 10);
      node.addEventListener('click', () => {
        playHarmonicStaveNote(n);
      });
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playHarmonicStaveNote(n);
        }
      });
    });
  }

  function playHarmonicStaveNote(n, duration = 1.6) {
    const item = HARMONIC_SERIES[n - 1];
    if (!item) return;
    const freq = (C3_FREQ * n).toFixed(1);
    engine.playHarmonicPartial(n, C3_FREQ, duration);

    // 高亮大谱表音符节点
    const node = harmonicsGrandStaffContainer.querySelector(`#harmonic-stave-node-${n}`);
    if (node) {
      node.classList.add('playing');
      setTimeout(() => node.classList.remove('playing'), 600);

      const ellipse = node.querySelector('.stave-notehead');
      if (ellipse) {
        const cx = ellipse.getAttribute('cx');
        const cy = ellipse.getAttribute('cy');
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', cx);
        ring.setAttribute('cy', cy);
        ring.setAttribute('r', '6');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#8C2B1F');
        ring.setAttribute('stroke-width', '2.5');
        ring.setAttribute('class', 'stave-sound-ring');
        node.appendChild(ring);
        setTimeout(() => ring.remove(), 700);
      }
    }

    oscStatus.textContent = `🌊 大谱表泛音试听：第 ${n} 阶自然分音 ${item.name} (${freq} Hz · ${item.role})`;
  }

  // 泛音大谱表控制按钮绑定
  container.querySelector('#btn-play-all-harmonics').addEventListener('click', () => {
    stopHarmonicsPlayback();
    oscStatus.textContent = '🌊 正在依次向上演奏 1–16 阶自然泛音阶梯…';
    HARMONIC_SERIES.forEach((item, idx) => {
      const tid = setTimeout(() => {
        playHarmonicStaveNote(item.n, 1.0);
      }, idx * 280);
      harmonicsPlaybackTimers.push(tid);
    });
  });

  container.querySelector('#btn-play-harmonics-chord').addEventListener('click', () => {
    stopHarmonicsPlayback();
    oscStatus.textContent = '🎼 正在齐鸣前 8 阶自然泛音纯物理共鸣（类似大管风琴全音栓）…';
    for (let p = 1; p <= 8; p++) {
      playHarmonicStaveNote(p, 3.2);
    }
  });

  container.querySelector('#btn-stop-harmonics-stave').addEventListener('click', () => {
    stopHarmonicsPlayback();
    oscStatus.textContent = '● 泛音大谱表演奏已停止';
  });

  renderHarmonicsGrandStaffSvg();

  const harmonicsLadder = container.querySelector('#harmonics-ladder');
  const slidersContainer = container.querySelector('#harmonic-sliders-container');

  HARMONIC_SERIES.forEach(item => {
    const row = document.createElement('div');
    row.className = 'harmonic-row-item';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '8px 12px';
    row.style.borderBottom = '1px solid color-mix(in srgb, var(--line) 60%, transparent)';
    row.style.fontSize = '12.5px';

    const freq = (C3_FREQ * item.n).toFixed(1);
    const isSpecial = item.n === 7 || item.n === 11 || item.n === 13;
    const badgeColor = isSpecial ? 'var(--acc)' : 'var(--ink)';

    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <strong style="color:var(--acc);min-width:70px;">n = ${item.n}</strong>
        <span style="font-weight:600;color:${badgeColor};">${item.name} (${item.note})</span>
        <span style="color:var(--mut);font-size:11px;font-family:var(--mono);">${freq} Hz</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="color:var(--mut);font-size:11.5px;">${item.role}</span>
        <button class="action-btn" style="padding:4px 10px;font-size:11.5px;">▶ 试听</button>
      </div>
    `;

    row.querySelector('button').addEventListener('click', () => {
      oscStatus.textContent = `🌊 正在试听：第 ${item.n} 阶自然泛音 ${item.name} (${freq} Hz)`;
      engine.playHarmonicPartial(item.n, C3_FREQ, 1.4);
    });

    harmonicsLadder.appendChild(row);
  });

  // 渲染前8阶加法合成音栓滑杆
  const PARTIAL_NAMES = ['1st 基音', '2nd 八度', '3rd 十二度(五度)', '4th 双八度', '5th 大三度', '6th 十九度', '7th 小七度', '8th 三八度'];
  for (let p = 1; p <= 8; p++) {
    const sWrap = document.createElement('div');
    sWrap.style.display = 'flex';
    sWrap.style.alignItems = 'center';
    sWrap.style.justifyContent = 'space-between';
    sWrap.style.gap = '12px';
    sWrap.innerHTML = `
      <span style="font-size:12px;font-weight:600;min-width:110px;">${PARTIAL_NAMES[p-1]}</span>
      <input type="range" class="harmonic-slider" data-p="${p}" min="0" max="1" step="0.05" value="${p === 1 ? 0.8 : 0}" style="flex:1;">
      <span class="h-val" style="font-size:11px;min-width:32px;text-align:right;font-family:var(--mono);color:var(--acc);">${p === 1 ? '80%' : '0%'}</span>
    `;

    const slider = sWrap.querySelector('input');
    const valSpan = sWrap.querySelector('.h-val');
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      valSpan.textContent = `${Math.round(val * 100)}%`;
      engine.setHarmonicPartialActive(p, C3_FREQ, val * 0.35);
      oscStatus.textContent = `🎛️ 音栓调节：第 ${p} 阶分音增益设置为 ${Math.round(val * 100)}%`;
    });

    slidersContainer.appendChild(sWrap);
  }

  function applyPreset(weights) {
    engine.stopAllHarmonics();
    const sliders = slidersContainer.querySelectorAll('.harmonic-slider');
    sliders.forEach((s, idx) => {
      const p = idx + 1;
      const w = weights[idx] || 0;
      s.value = w;
      s.parentElement.querySelector('.h-val').textContent = `${Math.round(w * 100)}%`;
      if (w > 0.001) {
        engine.setHarmonicPartialActive(p, C3_FREQ, w * 0.35);
      }
    });
  }

  container.querySelector('#btn-preset-sine').addEventListener('click', () => {
    oscStatus.textContent = '🎛️ 载入物理预设：纯正单音 (Pure Sine Wave)';
    applyPreset([0.8, 0, 0, 0, 0, 0, 0, 0]);
  });
  container.querySelector('#btn-preset-flute').addEventListener('click', () => {
    oscStatus.textContent = '🎛️ 载入物理预设：古典木管长笛 (Flute)';
    applyPreset([0.8, 0.35, 0.1, 0, 0, 0, 0, 0]);
  });
  container.querySelector('#btn-preset-clarinet').addEventListener('click', () => {
    oscStatus.textContent = '🎛️ 载入物理预设：单簧管闭管 (Clarinet / 奇次谐波主导 1-3-5-7)';
    applyPreset([0.8, 0.05, 0.6, 0.05, 0.4, 0.05, 0.25, 0]);
  });
  container.querySelector('#btn-preset-violin').addEventListener('click', () => {
    oscStatus.textContent = '🎛️ 载入物理预设：弓弦小提琴 (Violin / 锯齿波全谐波展开)';
    applyPreset([0.8, 0.6, 0.45, 0.35, 0.28, 0.22, 0.18, 0.14]);
  });
  container.querySelector('#btn-preset-organ').addEventListener('click', () => {
    oscStatus.textContent = '🎛️ 载入物理预设：教堂管风琴全栓 (Grand Organ Pleno)';
    applyPreset([0.8, 0.7, 0.6, 0.65, 0.5, 0.4, 0.3, 0.4]);
  });
  container.querySelector('#btn-harmonics-stop').addEventListener('click', () => {
    oscStatus.textContent = '● 泛音加法合成器已全部静音';
    applyPreset([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  // ==========================================================================
  // 面板 3: 教会调式与拉格
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

  const droneBtn = container.querySelector('#btn-toggle-drone');
  droneBtn.addEventListener('click', () => {
    const isOn = engine.toggleDrone();
    droneBtn.textContent = isOn ? '🔇 关闭嗡鸣低音 (Drone)' : '🔊 开启持续嗡鸣低音 (Drone)';
    droneBtn.style.background = isOn ? 'var(--acc)' : '';
    droneBtn.style.color = isOn ? '#FFF' : '';
    droneBtn.style.borderColor = isOn ? 'var(--acc)' : '';
    oscStatus.textContent = isOn ? '🪕 谭普拉琴 (Tanpura) 嗡鸣低音已开启，空间充满泛音' : '● 谭普拉琴嗡鸣已停止';
  });

  // ==========================================================================
  // 面板 4: 和声切片与声学物理
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

  container.querySelector('#btn-mannheim-rocket').addEventListener('click', () => {
    oscStatus.textContent = '🚀 曼海姆火箭 (Mannheim Rocket)：主和弦急速音阶上升琶音与渐强！';
    const notes = ['C3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
    notes.forEach((n, idx) => {
      setTimeout(() => engine.playNote(n, 0.4), idx * 100);
    });
  });

  container.querySelector('#btn-mannheim-sigh').addEventListener('click', () => {
    oscStatus.textContent = '💧 曼海姆叹息 (Mannheim Sigh)：重音二度倚音与弱拍下行消解…';
    engine.playNote('F5', 0.8);
    setTimeout(() => engine.playNote('E5', 1.6), 350);
  });

  container.querySelector('#btn-mannheim-roll').addEventListener('click', () => {
    oscStatus.textContent = '🌊 曼海姆滚奏渐强 (Mannheim Crescendo)：由弱渐强的管弦乐音响巨浪！';
    const seq = ['C3', 'G2', 'C3', 'G2', 'C3', 'G2', 'C3', 'G2', 'C3', 'G3', 'C4', 'E4', 'G4', 'C5'];
    seq.forEach((n, idx) => {
      setTimeout(() => engine.playNote(n, 0.3), idx * 130);
    });
  });

  // 普隆普-莱费尔特拍频滑杆
  const beatSlider = container.querySelector('#beat-slider');
  const beatLabel = container.querySelector('#beat-label');
  beatSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    beatLabel.textContent = `${val.toFixed(1)} Hz`;
  });
  container.querySelector('#btn-play-beats').addEventListener('click', () => {
    const beatVal = parseFloat(beatSlider.value);
    oscStatus.textContent = `🔊 正在试听双纯音干涉：基频 440Hz + 频差 ${beatVal}Hz (产生物理拍频与感官粗糙感)`;
    engine.playPlompBeats(beatVal, 440, 2.5);
  });

  // ==========================================================================
  // 面板 5: 二十世纪先锋音块与微音
  // ==========================================================================
  container.querySelector('#btn-scriabin-mystic').addEventListener('click', () => {
    oscStatus.textContent = '🌌 斯克里亚宾“神秘和弦”：C3 - F#3 - Bb3 - E4 - A4 - D5 (四度叠置普罗米修斯和声)';
    engine.playScriabinMystic(3.5);
  });

  container.querySelector('#btn-ligeti-cluster').addEventListener('click', () => {
    oscStatus.textContent = '🌌 利盖蒂微复调音块《大气》：12声部半音集群云雾，微延迟缓动弥漫…';
    engine.playLigetiCluster(4.5);
  });

  container.querySelector('#btn-penderecki-cluster').addEventListener('click', () => {
    oscStatus.textContent = '⚡ 彭德雷茨基《广岛受难者的挽歌》：16把弦乐极高频音簇与微音撕裂滑奏！';
    engine.playPendereckiCluster(3.8);
  });

  container.querySelector('#btn-play-quarter-scale').addEventListener('click', () => {
    oscStatus.textContent = '🎼 阿洛伊斯·哈巴 24平均律 1/4 音微分音阶 (每级 50 音分微小上行)…';
    const baseC = 261.625565;
    for (let i = 0; i <= 12; i++) {
      const freq = baseC * Math.pow(2, (i * 50) / 1200);
      setTimeout(() => {
        engine.playNote('C4', 0.35, freq);
      }, i * 180);
    }
  });

  container.querySelector('#btn-play-neutral-third').addEventListener('click', () => {
    const baseC = 261.625565;
    const neutralThird = baseC * Math.pow(2, 350 / 1200);
    const minorThird = baseC * Math.pow(2, 300 / 1200);
    const majorThird = baseC * Math.pow(2, 400 / 1200);

    oscStatus.textContent = '🔍 正在试听：小三度 (300音分)…';
    engine.playNote('C4', 1.4, baseC);
    engine.playNote('Eb4', 1.4, minorThird);

    setTimeout(() => {
      oscStatus.textContent = '🔍 正在试听：哈巴中立三度 (350音分，介于大小三度正中间)…';
      engine.playNote('C4', 1.4, baseC);
      engine.playNote('E4', 1.4, neutralThird);
    }, 1800);

    setTimeout(() => {
      oscStatus.textContent = '🔍 正在试听：大三度 (400音分)…';
      engine.playNote('C4', 1.4, baseC);
      engine.playNote('E4', 1.4, majorThird);
    }, 3600);
  });

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

  // ==========================================================================
  // 面板 6: 勋伯格十二音序列矩阵计算机
  // ==========================================================================
  let currentRow = [...SCHOENBERG_OP25_ROW];
  const matrixContainer = container.querySelector('#schoenberg-matrix');

  function renderMatrix() {
    matrixContainer.innerHTML = '';
    const mat = compute12ToneMatrix(currentRow);

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
    const newRow = Array.from({ length: 12 }, (_, i) => i);
    for (let i = newRow.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newRow[i], newRow[j]] = [newRow[j], newRow[i]];
    }
    currentRow = newRow;
    renderMatrix();
    oscStatus.textContent = '🎲 已随机生成新的十二音序列原型！';
  });

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    stopStavePlayback();
    stopHarmonicsPlayback();
    engine.stopAll();
  }

  return { engine, destroy };
}
