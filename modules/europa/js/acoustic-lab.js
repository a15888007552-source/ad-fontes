/**
 * 欧罗巴声学与乐律实验室 (Acoustic & Musicology Lab) - 核心引擎
 * Ad Fontes · Annales Musicorum Europae
 * 纯前端 Web Audio API 物理合成器，零外部依赖，100% 离线运行
 */

// 标准音高 C4 = 261.625565 Hz, A4 = 440 Hz
const A4_FREQ = 440;
const C4_FREQ = 261.625565;

// 十二音半音阶名称（从 C 到 B）
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ==========================================================================
// 1. 六大经典历史律制音分与生律数学算法
// ==========================================================================

// 律制定义
export const TUNING_SYSTEMS = {
  '12-tet': {
    name: '现代十二平均律 (12-TET)',
    desc: '将纯八度精确等分为12个均等的半音（每半音100音分）。大三度为400音分，比纯律偏宽约14音分。',
    cents: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
  },
  'pythagorean': {
    name: '毕达哥拉斯律 (五度相生律)',
    desc: '古希腊与先秦三分损益法。完全由纯正五度 (3:2, 702音分) 上下生律。大三度达408音分极其尖锐，极不协和。',
    // C=0, G=702, D=204, A=906, E=408, B=1110, F#=612, C#=114, G#=816, Eb=294, Bb=996, F=498
    cents: [0, 114, 204, 294, 408, 498, 612, 702, 816, 906, 996, 1110]
  },
  'meantone': {
    name: '中庸全音律 (1/4 Comma Meantone)',
    desc: '文艺复兴晚期与巴洛克键盘黄金标准。将五度削窄1/4普通音差（约696.6音分），换取绝美纯正的大三度 (386音分)。但在降A与降E间产生极刺耳的“狼音五度” (737.6音分)。',
    // C=0, C#=76, D=193.2, Eb=310.3, E=386.3, F=503.4, F#=579.5, G=696.6, G#=772.6, A=889.7, Bb=1006.8, B=1082.9
    cents: [0, 76.0, 193.2, 310.3, 386.3, 503.4, 579.5, 696.6, 772.6, 889.7, 1006.8, 1082.9],
    wolfPair: ['G#4', 'Eb5']
  },
  'just': {
    name: '纯律 (Just Intonation / 托勒密五度三度律)',
    desc: '基于自然泛音列比例（4:5:6）。大三度为纯正 5:4 (386音分)，纯五度 3:2 (702音分)，大小全音并存（9:8 与 10:9）。',
    // C: 1/1(0), C#: 16/15(111.7), D: 9/8(203.9), Eb: 6/5(315.6), E: 5/4(386.3), F: 4/3(498.0), F#: 45/32(590.2), G: 3/2(702.0), Ab: 8/5(813.7), A: 5/3(884.4), Bb: 9/5(1017.6), B: 15/8(1088.3)
    cents: [0, 111.7, 203.9, 315.6, 386.3, 498.0, 590.2, 702.0, 813.7, 884.4, 1017.6, 1088.3]
  },
  'thai-7tet': {
    name: '泰王国七平均律 (7-TET)',
    desc: '东南亚传统宫廷皮帕特（Piphat）乐团律制。将八度等分为七个均等音级（每级约171.4音分）。无半音、无导音，呈现独特的南岛/东南亚微分音色彩。',
    cents: [0, 171.4, 342.9, 514.3, 685.7, 857.1, 1028.6, 1200]
  },
  'slendro': {
    name: '爪哇甘美兰斯连德罗五平均律 (Slendro 5-TET)',
    desc: '印尼爪哇/巴厘传统甘美兰青铜锣群两大乐律之一。将八度粗略均分为五个音级（每级约240音分），不含任何西方意义上的半音或大小三度。',
    cents: [0, 240.0, 480.0, 720.0, 960.0, 1200]
  }
};

// ==========================================================================
// 2. 中世纪教会调式与印度古典拉格定义
// ==========================================================================

export const CHURCH_MODES = [
  { id: 'dorian', name: '多利亚 (Dorian)', greek: 'Protus authenticus', finalis: 'D', tenor: 'A', scale: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'], desc: '第一教会正调式。中世纪平歌最常用的严肃端庄调式，小调色彩带大六度。' },
  { id: 'hypodorian', name: '副多利亚 (Hypodorian)', greek: 'Protus plagalis', finalis: 'D', tenor: 'F', scale: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'], desc: '第二教会副调式。音域下移四度，诵音（Tenor）降至 F。' },
  { id: 'phrygian', name: '弗里几亚 (Phrygian)', greek: 'Deuterus authenticus', finalis: 'E', tenor: 'C', scale: ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'], desc: '第三教会正调式。独特的小二度开端，带有神秘而哀婉的古希腊与安纳托利亚气质。' },
  { id: 'hypophrygian', name: '副弗里几亚 (Hypophrygian)', greek: 'Deuterus plagalis', finalis: 'E', tenor: 'A', scale: ['B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], desc: '第四教会副调式。音域为 B-B，诵音为 A。' },
  { id: 'lydian', name: '利地亚 (Lydian)', greek: 'Tritus authenticus', finalis: 'F', tenor: 'C', scale: ['F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'], desc: '第五教会正调式。特有的增四度（Trirone）音，明亮神圣，常用于复调弥撒。' },
  { id: 'hypolydian', name: '副利地亚 (Hypolydian)', greek: 'Tritus plagalis', finalis: 'F', tenor: 'A', scale: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], desc: '第六教会副调式。音域 C-C，诵音为 A。' },
  { id: 'mixolydian', name: '混合利地亚 (Mixolydian)', greek: 'Tetrardus authenticus', finalis: 'G', tenor: 'D', scale: ['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'], desc: '第七教会正调式。大调色彩但第七级为小七度（降VII），质朴庄严。' },
  { id: 'hypomixolydian', name: '副混合利地亚 (Hypomixolydian)', greek: 'Tetrardus plagalis', finalis: 'G', tenor: 'C', scale: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'], desc: '第八教会副调式。音域 D-D，诵音提升至 C。' }
];

export const INDIAN_THAATS = [
  { id: 'bilawal', name: '比拉瓦尔 (Bilawal)', sargam: 'S R G M P D N S\'', notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], mood: '平静光明、清晨、对应自然大调式' },
  { id: 'kalyan', name: '卡利扬 (Kalyan / Yaman)', sargam: 'S R G M# P D N S\'', notes: ['C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5'], mood: '黄昏、祝福、神圣爱意，含增四度微音' },
  { id: 'khamaj', name: '卡马杰 (Khamaj)', sargam: 'S R G M P D n S\'', notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5'], mood: '轻柔妩媚、夜幕初垂、轻古典图姆里（Thumri）' },
  { id: 'kafi', name: '卡菲 (Kafi)', sargam: 'S R g M P D n S\'', notes: ['C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5'], mood: '春雨、思念，对应多利亚调式，民间霍利节欢歌' },
  { id: 'bhairav', name: '拜拉夫 (Bhairav)', sargam: 'S r G M P d N S\'', notes: ['C4', 'Db4', 'E4', 'F4', 'G4', 'Ab4', 'B4', 'C5'], mood: '破晓黎明、沉思敬畏，含小二度降Re与降Dha微音滑奏' },
  { id: 'bhairavi', name: '拜拉维 (Bhairavi)', sargam: 'S r g M P d n S\'', notes: ['C4', 'Db4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'], mood: '音乐会终曲压轴之王、忧郁悲悯、全降音弗里几亚色彩' },
  { id: 'todi', name: '托迪 (Todi)', sargam: 'S r g M# P d N S\'', notes: ['C4', 'Db4', 'Eb4', 'F#4', 'G4', 'Ab4', 'B4', 'C5'], mood: '上午十时、极度紧绷张力、灵魂探索的微音高峰' }
];

// 勋伯格经典十二音序列（以《钢琴组曲》Op.25 为基准）
export const SCHOENBERG_OP25_ROW = [4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10]; // E, F, G, Db, Gb, Eb, Ab, D, B, C, A, Bb

// ==========================================================================
// 3. Web Audio 物理发声合成引擎
// ==========================================================================

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.activeVoices = new Map();
    this.droneGain = null;
    this.droneOscs = [];
    this.isDroneOn = false;
    this.tuningKey = '12-tet';
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    
    // 总输出与增益控制
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // 示波器分析器
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setTuning(key) {
    if (TUNING_SYSTEMS[key]) {
      this.tuningKey = key;
    }
  }

  // 根据当前律制计算具体音符的精确 Hz
  getFrequency(noteStr) {
    // 解析音名与八度 (例如 "C4", "G#4", "Eb5")
    const match = noteStr.match(/^([A-Ga-g][#b]?)(-?\d+)$/);
    if (!match) return 440;
    let [_, name, octStr] = match;
    let octave = parseInt(octStr, 10);
    
    // 统一转大写与降号转升号
    name = name.toUpperCase();
    if (name === 'DB') { name = 'C#'; }
    else if (name === 'EB') { name = 'D#'; }
    else if (name === 'GB') { name = 'F#'; }
    else if (name === 'AB') { name = 'G#'; }
    else if (name === 'BB') { name = 'A#'; }

    const noteIdx = NOTE_NAMES.indexOf(name);
    if (noteIdx === -1) return 440;

    const tuning = TUNING_SYSTEMS[this.tuningKey];
    const centFromC = tuning.cents[noteIdx % tuning.cents.length];
    
    // 以 C4 (261.6256 Hz) 为基准
    // 基频 = C4 * 2^(octave - 4) * 2^(cents / 1200)
    const baseC = C4_FREQ * Math.pow(2, octave - 4);
    const freq = baseC * Math.pow(2, centFromC / 1200);
    return freq;
  }

  // 触发单音 (包含温润的泛音列结构与包络)
  playNote(noteStr, duration = 0.8, customFreq = null) {
    this.ensureContext();
    const freq = customFreq || this.getFrequency(noteStr);
    const now = this.ctx.currentTime;

    // 组合泛音 (基频 + 二次泛音 + 三次微弱泛音)
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(0.35, now + 0.02); // 攻击时间
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // 1. 基频 (三角波带来柔和木质感)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);

    // 2. 八度泛音 (正弦波)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now);
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.25, now);

    // 连接
    osc1.connect(voiceGain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(voiceGain);
    voiceGain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
  }

  // 持续按下琴键
  startNote(noteStr) {
    this.ensureContext();
    if (this.activeVoices.has(noteStr)) return;
    const freq = this.getFrequency(noteStr);
    const now = this.ctx.currentTime;

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(0.3, now + 0.03);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(voiceGain);
    voiceGain.connect(this.masterGain);
    osc.start(now);

    this.activeVoices.set(noteStr, { osc, gain: voiceGain });
  }

  // 松开琴键
  stopNote(noteStr) {
    if (!this.activeVoices.has(noteStr)) return;
    const { osc, gain } = this.activeVoices.get(noteStr);
    const now = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.stop(now + 0.16);
    this.activeVoices.delete(noteStr);
  }

  // 停止所有发音
  stopAll() {
    this.activeVoices.forEach((voice, key) => {
      this.stopNote(key);
    });
    this.stopDrone();
  }

  // 谭普拉琴无人机低音嗡鸣 (Tanpura Drone on C)
  toggleDrone() {
    this.ensureContext();
    if (this.isDroneOn) {
      this.stopDrone();
    } else {
      this.startDrone();
    }
    return this.isDroneOn;
  }

  startDrone() {
    if (this.isDroneOn) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, now);
    this.droneGain.gain.linearRampToValueAtTime(0.18, now + 1.5);
    this.droneGain.connect(this.masterGain);

    // 谭普拉通常调为 Pa-Sa-Sa-Sa (G3, C4, C4, C3)
    const freqs = [196.00, 261.63, 262.2, 130.81]; // 带有极其微小的拍频 (Beat)
    this.droneOscs = freqs.map((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(f, now);
      
      // 低通滤波削去锯齿波的高频毛刺，模拟蚕丝琴弦的浑厚感
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600 + i * 150, now);

      osc.connect(filter);
      filter.connect(this.droneGain);
      osc.start(now);
      return osc;
    });
    this.isDroneOn = true;
  }

  stopDrone() {
    if (!this.isDroneOn || !this.droneGain) return;
    const now = this.ctx.currentTime;
    this.droneGain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
    setTimeout(() => {
      this.droneOscs.forEach(osc => {
        try { osc.stop(); } catch(e) {}
      });
      this.droneOscs = [];
      this.isDroneOn = false;
    }, 550);
  }
}

// ==========================================================================
// 4. 勋伯格十二音序列矩阵计算算法
// ==========================================================================

export function compute12ToneMatrix(primeRow) {
  // primeRow 是长度为 12 的数组，元素为 0..11
  const matrix = Array.from({ length: 12 }, () => Array(12).fill(0));
  const p0 = primeRow[0];

  // 第一行为 P0 (原始序列)
  for (let c = 0; c < 12; c++) {
    matrix[0][c] = primeRow[c];
  }

  // 第一列为 I0 (倒影序列)：I[r] = (p0 - (primeRow[r] - p0) + 12) % 12
  for (let r = 1; r < 12; r++) {
    const interval = (primeRow[r] - p0 + 12) % 12;
    matrix[r][0] = (p0 - interval + 12) % 12;
  }

  // 补全其余单元格：第 r 行是基于 matrix[r][0] 的移位原形
  for (let r = 1; r < 12; r++) {
    const shift = (matrix[r][0] - matrix[0][0] + 12) % 12;
    for (let c = 1; c < 12; c++) {
      matrix[r][c] = (matrix[0][c] + shift) % 12;
    }
  }

  return matrix;
}
