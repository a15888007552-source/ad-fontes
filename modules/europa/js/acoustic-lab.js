/**
 * 欧罗巴声学与乐律实验室 (Acoustic & Musicology Lab) - 核心引擎
 * Ad Fontes · Annales Musicorum Europae
 * 纯前端 Web Audio API 物理合成器，零外部依赖，100% 离线运行
 */

// 标准音高 C4 = 261.625565 Hz, A4 = 440 Hz
export const A4_FREQ = 440;
export const C4_FREQ = 261.625565;
export const C3_FREQ = 130.812783;

// 十二音半音阶名称（从 C 到 B）
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ==========================================================================
// 1. 经典历史律制音分与生律数学算法 (包含朱载堉新法密率、三分损益、巴赫良律)
// ==========================================================================

export const TUNING_SYSTEMS = {
  '12-tet': {
    name: '现代十二平均律 (12-TET)',
    desc: '将纯八度精确等分为12个均等的半音（每半音100音分）。大三度为400音分，比纯律偏宽约14音分。',
    cents: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
  },
  'zhu-zaiyu': {
    name: '朱载堉新法密率 (1584 世界首创十二平均律)',
    desc: '明代律学家朱载堉在《律学新说》中首创。以二十五位大算盘精求方根，世界上最早精确求解 2^(1/12) ≈ 1.059463094。早于欧洲斯台文与梅森，彻底解决三分损益黄钟不能还原的千年难题。',
    cents: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100],
    lus: ['黄钟', '大吕', '太簇', '夹钟', '姑洗', '仲吕', '蕤宾', '林钟', '夷则', '南吕', '无射', '应钟']
  },
  'sanfen-sunyi': {
    name: '先秦三分损益十二律 (Sanfen Sunyi 12 Lüs)',
    desc: '《管子》《吕氏春秋》生律法：三分损一（乘2/3）、三分益一（乘4/3）。纯五度 (702音分) 循环往复，至第十二次生律为“清黄钟”，高出原黄钟约23.46音分（古希腊同称毕氏音差），旋宫无法转调还原。',
    cents: [0, 113.7, 203.9, 317.6, 407.8, 498.0, 611.7, 702.0, 815.6, 905.9, 1019.6, 1109.8],
    lus: ['黄钟', '大吕', '太簇', '夹钟', '姑洗', '仲吕', '蕤宾', '林钟', '夷则', '南吕', '无射', '应钟']
  },
  'pythagorean': {
    name: '毕达哥拉斯律 (五度相生律)',
    desc: '西方古希腊与中世纪多声音乐基石。完全由纯正五度 (3:2, 702音分) 上下相生。其纯四度、纯五度极其谐和，但大三度达408音分，在中世纪被判为“刺耳的不协和音程”。',
    cents: [0, 114, 204, 294, 408, 498, 612, 702, 816, 906, 996, 1110]
  },
  'meantone': {
    name: '中庸全音律 (1/4 Comma Meantone)',
    desc: '文艺复兴晚期与早期巴洛克键盘黄金标准。将五度削窄1/4普通音差（约696.6音分），换取纯正的大三度 (386音分)。但在升G与降E间产生高达737.6音分的“狼音五度”，犹如群狼嚎叫。',
    cents: [0, 76.0, 193.2, 310.3, 386.3, 503.4, 579.5, 696.6, 772.6, 889.7, 1006.8, 1082.9],
    wolfPair: ['G#4', 'Eb5']
  },
  'werckmeister-iii': {
    name: '韦克迈斯特第三良律 (Werckmeister III, 1691)',
    desc: '巴赫《平均律键盘曲集》时代的良律（Well-Temperament）。仅将C-G、G-D、D-A、B-F#四个五度削窄1/4音差，其余八个为纯五度。使24个大小调皆可演奏，且各调带有独一无二的调性性格色彩（Affekt）。',
    cents: [0, 90.2, 192.2, 294.1, 390.2, 498.0, 588.3, 696.1, 792.2, 888.3, 996.1, 1092.2]
  },
  'kirnberger-iii': {
    name: '基恩伯格第三良律 (Kirnberger III, 1779)',
    desc: '巴赫弟子基恩伯格设计。保留了四个绝对纯正的大三度（C-E, G-B, D-F#, F-A），使基本近关系调宛如纯律般清澈无暇，而远关系调则具有戏剧性的紧张度。',
    cents: [0, 90.2, 193.2, 294.1, 386.3, 498.0, 590.2, 696.6, 792.2, 889.7, 996.1, 1086.5]
  },
  'just': {
    name: '纯律 (Just Intonation / 托勒密五度三度律)',
    desc: '严格源自自然泛音列简单整数比（4:5:6）。大三度为 5:4 (386音分)，纯五度 3:2 (702音分)。和弦水晶般共振，但大小全音并存（9:8 与 10:9），无法自由转调。',
    cents: [0, 111.7, 203.9, 315.6, 386.3, 498.0, 590.2, 702.0, 813.7, 884.4, 1017.6, 1088.3]
  },
  'thai-7tet': {
    name: '泰王国七平均律 (Thai 7-TET)',
    desc: '东南亚传统宫廷皮帕特（Piphat）乐团律制。将八度等分为七个均等音级（每级约171.4音分）。无半音、无大小三度，呈现迷人的南岛微音色彩。',
    cents: [0, 171.4, 342.9, 514.3, 685.7, 857.1, 1028.6, 1200]
  },
  'slendro': {
    name: '爪哇甘美兰斯连德罗五平均律 (Slendro 5-TET)',
    desc: '印尼爪哇/巴厘传统甘美兰青铜锣群核心律制。将八度粗略均分为五个音级（每级约240音分），不含西方半音，带来金属微拍频共鸣。',
    cents: [0, 240.0, 480.0, 720.0, 960.0, 1200]
  }
};

// ==========================================================================
// 2. 1-16 次自然泛音列定义 (Harmonic Series)
// ==========================================================================

export const HARMONIC_SERIES = [
  { n: 1, ratio: 1, name: '第1分音 (基音)', note: 'C3', cents: 0, interval: '同度 1:1', role: '决定绝对音高与基频' },
  { n: 2, ratio: 2, name: '第2分音 (八度)', note: 'C4', cents: 1200, interval: '纯八度 2:1', role: '谐和骨干支撑' },
  { n: 3, ratio: 3, name: '第3分音 (十二度)', note: 'G4', cents: 1902, interval: '纯五度+八度 3:1', role: '五度相生律源泉 (+2c)' },
  { n: 4, ratio: 4, name: '第4分音 (双八度)', note: 'C5', cents: 2400, interval: '双八度 4:1', role: '二次谐振' },
  { n: 5, ratio: 5, name: '第5分音 (十七度)', note: 'E5', cents: 2786, interval: '纯大三度+双八度 5:1', role: '纯律大三度核心（比钢琴低14音分）' },
  { n: 6, ratio: 6, name: '第6分音 (十九度)', note: 'G5', cents: 3102, interval: '纯五度+双八度 6:1', role: '确立大三和弦大五度' },
  { n: 7, ratio: 7, name: '第7分音 (自然小七度)', note: 'Bb5', cents: 3369, interval: '自然小七度 7:1', role: '失谐自然七度（比钢琴低31音分！蓝调音源头）' },
  { n: 8, ratio: 8, name: '第8分音 (三八度)', note: 'C6', cents: 3600, interval: '三八度 8:1', role: '八度节点' },
  { n: 9, ratio: 9, name: '第9分音 (大全音)', note: 'D6', cents: 3804, interval: '大全音 9:8', role: '纯律大全音 (+4c)' },
  { n: 10, ratio: 10, name: '第10分音 (大三度)', note: 'E6', cents: 3986, interval: '纯大三度 5:4', role: '第5分音之高八度' },
  { n: 11, ratio: 11, name: '第11分音 (半增四度)', note: 'F#6', cents: 4151, interval: '中立四度 11:8', role: '极特殊微音（比钢琴低49音分，在F与F#正中间）' },
  { n: 12, ratio: 12, name: '第12分音 (纯五度)', note: 'G6', cents: 4302, interval: '纯五度 3:2', role: '五度强化' },
  { n: 13, ratio: 13, name: '第13分音 (中立小六度)', note: 'Ab6', cents: 4441, interval: '小六度 13:8', role: '偏高41音分，钢琴无法演奏' },
  { n: 14, ratio: 14, name: '第14分音 (自然七度)', note: 'Bb6', cents: 4569, interval: '自然小七度', role: '第7分音之高八度' },
  { n: 15, ratio: 15, name: '第15分音 (纯大七度)', note: 'B6', cents: 4688, interval: '纯大七度 15:8', role: '纯律导音 (-12c)' },
  { n: 16, ratio: 16, name: '第16分音 (四八度)', note: 'C7', cents: 4800, interval: '四八度 16:1', role: '听觉可辨泛音列高限' }
];

// ==========================================================================
// 3. 中世纪教会调式与印度古典拉格定义
// ==========================================================================

export const CHURCH_MODES = [
  { id: 'dorian', name: '多利亚 (Dorian)', greek: 'Protus authenticus', finalis: 'D', tenor: 'A', scale: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5'], desc: '第一教会正调式。中世纪平歌最常用的严肃端庄调式，小调色彩带自然大六度。' },
  { id: 'hypodorian', name: '副多利亚 (Hypodorian)', greek: 'Protus plagalis', finalis: 'D', tenor: 'F', scale: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'], desc: '第二教会副调式。音域下移四度，诵音（Tenor）降至 F。' },
  { id: 'phrygian', name: '弗里几亚 (Phrygian)', greek: 'Deuterus authenticus', finalis: 'E', tenor: 'C', scale: ['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'], desc: '第三教会正调式。独特的小二度开端，带有神秘而哀婉的古希腊与安纳托利亚气质。' },
  { id: 'hypophrygian', name: '副弗里几亚 (Hypophrygian)', greek: 'Deuterus plagalis', finalis: 'E', tenor: 'A', scale: ['B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'], desc: '第四教会副调式。音域为 B-B，诵音为 A。' },
  { id: 'lydian', name: '利地亚 (Lydian)', greek: 'Tritus authenticus', finalis: 'F', tenor: 'C', scale: ['F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'], desc: '第五教会正调式。特有的增四度（Tritone）音，明亮神圣，常用于复调弥撒。' },
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
  { id: 'todi', name: '托迪 (Todi)', sargam: 'S r g M# P d N S\'', notes: ['C4', 'Db4', 'Eb4', 'F#4', 'G4', 'Ab4', 'B4', 'C5'], mood: '上午十时、极度紧绷张力、灵魂探索的微音高峰' },
  { id: 'asavari', name: '阿萨瓦里 (Asavari)', sargam: 'S R g M P d n S\'', notes: ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'], mood: '早晨、庄严宏伟、带降Ga与降Dha哀愁色彩' },
  { id: 'marwa', name: '马尔瓦 (Marwa)', sargam: 'S r G M# P D N S\'', notes: ['C4', 'Db4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5'], mood: '日落薄暮、极度不安渴望、含增四度与降Re' },
  { id: 'poorvi', name: '普尔维 (Poorvi)', sargam: 'S r G M# P d N S\'', notes: ['C4', 'Db4', 'E4', 'F#4', 'G4', 'Ab4', 'B4', 'C5'], mood: '薄暮祈祷、深沉神圣、降Re降Dha与升Ma交织' }
];

// 勋伯格经典十二音序列（以《钢琴组曲》Op.25 为基准）
export const SCHOENBERG_OP25_ROW = [4, 5, 7, 1, 6, 3, 8, 2, 11, 0, 9, 10]; // E, F, G, Db, Gb, Eb, Ab, D, B, C, A, Bb

// ==========================================================================
// 4. Web Audio 物理发声与真实声学采样引擎 (Acoustic Grand Piano & Historic Instruments)
// ==========================================================================

const MIDI_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export function freqToSampleInfo(freq) {
  const midi = 69 + 12 * Math.log2(Math.max(10, freq) / 440);
  const roundedMidi = Math.min(108, Math.max(21, Math.round(midi)));
  const octave = Math.floor(roundedMidi / 12) - 1;
  const noteName = MIDI_NOTE_NAMES[roundedMidi % 12] + octave;
  const baseFreq = 440 * Math.pow(2, (roundedMidi - 69) / 12);
  const playbackRate = freq / baseFreq;
  return { roundedMidi, noteName, baseFreq, playbackRate };
}

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.instrumentBus = null;
    this.dryGain = null;
    this.wetGain = null;
    this.convolver = null;
    this.reverbEnabled = true;

    // 当前选定音色: 'piano' (默认真实音乐会大三角钢琴) | 'harpsichord' | 'strings' | 'sine'
    this.currentInstrument = 'piano';

    // 活跃声部与延音踏板
    this.activeVoices = new Map();
    this.sustainPedal = false;
    this.sustainedVoices = new Set();

    // 谭普拉无人机
    this.droneGain = null;
    this.droneOscs = [];
    this.isDroneOn = false;

    // 当前律制
    this.tuningKey = '12-tet';

    // 泛音加法合成
    this.harmonicVoices = new Map();

    // 真实声学采样缓存 Map<noteName, AudioBuffer>
    this.sampleCache = {
      piano: new Map(),
      harpsichord: new Map()
    };
    this.loadingPromises = new Map();
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // 总音量
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.82, this.ctx.currentTime);

    // 空间混响 (Concert Hall Reverb) 模拟维也纳金色大厅木质空间共鸣
    this.instrumentBus = this.ctx.createGain();
    this.instrumentBus.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.setValueAtTime(this.reverbEnabled ? 0.28 : 0.0001, this.ctx.currentTime);

    this.convolver = this.createConcertHallReverb(2.6, 2.1);

    this.instrumentBus.connect(this.dryGain);
    this.instrumentBus.connect(this.convolver);
    this.convolver.connect(this.wetGain);

    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.masterGain);

    // 示波器与频谱分析器
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // 立即后台预加载键盘常用核心音区 (C4–E5) 与低音根音 (C2–C4)
    this.preloadCoreSamples();
  }

  createConcertHallReverb(duration = 2.5, decay = 2.0) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const factor = Math.exp(-decay * t);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  ensureContext() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 预加载核心真实声学钢琴采样
  preloadCoreSamples() {
    const coreKeys = [
      'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4',
      'C5', 'Db5', 'D5', 'Eb5', 'E5',
      'F2', 'B2', 'C3', 'Eb3', 'E3', 'G3', 'Ab3', 'A3', 'Bb3', 'C6', 'E6', 'G6', 'C7'
    ];
    coreKeys.forEach((note) => {
      this.loadSample('piano', note);
    });
  }

  async loadSample(instrument, noteName) {
    if (!this.ctx) return null;
    if (this.sampleCache[instrument]?.has(noteName)) {
      return this.sampleCache[instrument].get(noteName);
    }
    const cacheKey = `${instrument}:${noteName}`;
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const promise = (async () => {
      try {
        const url = `./assets/audio/${instrument}/${noteName}.mp3`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
        if (!this.sampleCache[instrument]) {
          this.sampleCache[instrument] = new Map();
        }
        this.sampleCache[instrument].set(noteName, audioBuf);
        return audioBuf;
      } catch (err) {
        return null;
      } finally {
        this.loadingPromises.delete(cacheKey);
      }
    })();

    this.loadingPromises.set(cacheKey, promise);
    return promise;
  }

  setTuning(key) {
    if (TUNING_SYSTEMS[key]) {
      this.tuningKey = key;
    }
  }

  setInstrument(name) {
    if (['piano', 'harpsichord', 'strings', 'sine'].includes(name)) {
      this.currentInstrument = name;
      if (name === 'harpsichord') {
        ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'C3', 'G3'].forEach(n => this.loadSample('harpsichord', n));
      }
    }
  }

  setReverb(enabled) {
    this.reverbEnabled = !!enabled;
    if (!this.wetGain || !this.dryGain) return;
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (this.reverbEnabled) {
      this.wetGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.linearRampToValueAtTime(0.28, now + 0.12);
      this.dryGain.gain.linearRampToValueAtTime(0.85, now + 0.12);
    } else {
      this.wetGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
      this.dryGain.gain.linearRampToValueAtTime(1.0, now + 0.12);
    }
  }

  setSustainPedal(down) {
    this.sustainPedal = !!down;
    if (!this.sustainPedal) {
      this.sustainedVoices.forEach(voice => {
        this.stopVoice(voice);
      });
      this.sustainedVoices.clear();
    }
  }

  // 根据当前律制计算具体音符的精确 Hz
  getFrequency(noteStr) {
    const match = noteStr.match(/^([A-Ga-g][#b]?)(-?\d+)$/);
    if (!match) return 440;
    let [_, name, octStr] = match;
    let octave = parseInt(octStr, 10);
    
    name = name.toUpperCase();
    if (name === 'DB') { name = 'C#'; }
    else if (name === 'EB') { name = 'D#'; }
    else if (name === 'GB') { name = 'F#'; }
    else if (name === 'AB') { name = 'G#'; }
    else if (name === 'BB') { name = 'A#'; }

    const noteIdx = NOTE_NAMES.indexOf(name);
    if (noteIdx === -1) return 440;

    const tuning = TUNING_SYSTEMS[this.tuningKey] || TUNING_SYSTEMS['12-tet'];
    const centFromC = tuning.cents[noteIdx % tuning.cents.length];
    
    const baseC = C4_FREQ * Math.pow(2, octave - 4);
    const freq = baseC * Math.pow(2, centFromC / 1200);
    return freq;
  }

  // 触发单音 (支持真实斯坦威钢琴、羽管键琴、古提琴与纯正弦)
  playNote(noteStr, duration = 1.4, customFreq = null, velocity = 0.85) {
    this.ensureContext();
    const freq = customFreq || this.getFrequency(noteStr);
    const now = this.ctx.currentTime;

    if (this.currentInstrument === 'piano' || this.currentInstrument === 'harpsichord') {
      const { noteName, playbackRate } = freqToSampleInfo(freq);
      const cachedBuf = this.sampleCache[this.currentInstrument]?.get(noteName);

      if (cachedBuf) {
        this.playSampleVoice(cachedBuf, playbackRate, now, duration, velocity);
        return;
      }

      // 若采样正在加载，先用物理建模发声保底，并启动异步加载
      this.loadSample(this.currentInstrument, noteName);
      this.playPhysicalAcousticVoice(freq, now, duration, velocity);
      return;
    }

    if (this.currentInstrument === 'strings') {
      this.playBowedStringsVoice(freq, now, duration, velocity);
      return;
    }

    // 纯正弦波
    this.playSineVoice(freq, now, duration, velocity);
  }

  // 播放采样单音
  playSampleVoice(buffer, playbackRate, startTime, duration, velocity = 0.85) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, startTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.95, startTime + 0.005);

    // 自然声音衰减或平滑关音
    const releaseStart = startTime + Math.max(0.2, duration - 0.2);
    gainNode.gain.setValueAtTime(velocity * 0.95, releaseStart);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseStart + 0.35);

    source.connect(gainNode);
    gainNode.connect(this.instrumentBus);

    source.start(startTime);
    source.stop(releaseStart + 0.4);
    return { source, gainNode };
  }

  // 物理声学声学打击弦保底模型 (Acoustic Hammer Strike Physical Model)
  playPhysicalAcousticVoice(freq, startTime, duration, velocity = 0.85) {
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.5, startTime + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    // 琴槌击弦瞬态冲激
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    // 泛音列谐振 (轻微色散非谐性)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.0015, startTime);

    const osc3 = this.ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3.004, startTime);

    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.35, startTime);
    const g3 = this.ctx.createGain();
    g3.gain.setValueAtTime(0.15, startTime);

    // 动态低通滤波器 (琴槌击弦力度敏感)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(12000, freq * 6), startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 2.5, startTime + duration * 0.5);

    osc1.connect(gainNode);
    osc2.connect(g2);
    g2.connect(gainNode);
    osc3.connect(g3);
    g3.connect(gainNode);

    gainNode.connect(filter);
    filter.connect(this.instrumentBus);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(startTime + duration + 0.1);
    osc2.stop(startTime + duration + 0.1);
    osc3.stop(startTime + duration + 0.1);
  }

  // 维奥尔古提琴与弓弦乐器模型 (Bowed Strings Model)
  playBowedStringsVoice(freq, startTime, duration, velocity = 0.85) {
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.35, startTime + 0.15); // 慢起弓
    gainNode.gain.setValueAtTime(velocity * 0.35, startTime + duration - 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.2);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.001, startTime); // 微合唱

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, startTime);
    filter.Q.setValueAtTime(3.5, startTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.instrumentBus);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.3);
    osc2.stop(startTime + duration + 0.3);
  }

  // 赫姆霍兹纯正弦波 (Pure Sine Model)
  playSineVoice(freq, startTime, duration, velocity = 0.85) {
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.35, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    osc.connect(gainNode);
    gainNode.connect(this.instrumentBus);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  // 持续按下琴键 (Hold key)
  startNote(noteStr, velocity = 0.85) {
    this.ensureContext();
    if (this.activeVoices.has(noteStr)) return;
    const freq = this.getFrequency(noteStr);
    const now = this.ctx.currentTime;

    if (this.currentInstrument === 'piano' || this.currentInstrument === 'harpsichord') {
      const { noteName, playbackRate } = freqToSampleInfo(freq);
      const cachedBuf = this.sampleCache[this.currentInstrument]?.get(noteName);

      if (cachedBuf) {
        const source = this.ctx.createBufferSource();
        source.buffer = cachedBuf;
        source.playbackRate.setValueAtTime(playbackRate, now);

        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(velocity * 0.95, now + 0.006);

        source.connect(gainNode);
        gainNode.connect(this.instrumentBus);
        source.start(now);

        this.activeVoices.set(noteStr, { source, gainNode, isSample: true });
        return;
      }
    }

    // 物理声学持续音
    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(velocity * 0.38, now + 0.02);

    const osc = this.ctx.createOscillator();
    osc.type = this.currentInstrument === 'sine' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    osc.connect(voiceGain);
    voiceGain.connect(this.instrumentBus);
    osc.start(now);

    this.activeVoices.set(noteStr, { osc, gain: voiceGain, isSample: false });
  }

  // 松开琴键 (Release key)
  stopNote(noteStr) {
    if (!this.activeVoices.has(noteStr)) return;
    const voice = this.activeVoices.get(noteStr);
    this.activeVoices.delete(noteStr);

    if (this.sustainPedal) {
      this.sustainedVoices.add(voice);
      return;
    }

    this.stopVoice(voice);
  }

  stopVoice(voice) {
    const now = this.ctx.currentTime;
    if (voice.gainNode) {
      // 真实琴弦制音器落弦阻尼
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
      voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      try { voice.source?.stop(now + 0.3); } catch(e) {}
    } else if (voice.gain) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      try { voice.osc?.stop(now + 0.22); } catch(e) {}
    }
  }

  // 停止所有发音
  stopAll() {
    this.activeVoices.forEach((voice) => {
      this.stopVoice(voice);
    });
    this.activeVoices.clear();
    this.sustainedVoices.forEach(v => this.stopVoice(v));
    this.sustainedVoices.clear();
    this.stopDrone();
    this.stopAllHarmonics();
  }

  // 齐鸣演奏和弦 (Simultaneous Chord Play - 微人性化分音铺展)
  playChord(notes, duration = 2.5, arpeggiateMs = 8) {
    this.ensureContext();
    notes.forEach((noteStr, idx) => {
      setTimeout(() => {
        this.playNote(noteStr, duration);
      }, idx * arpeggiateMs);
    });
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
    const freqs = [196.00, 261.63, 262.2, 130.81];
    this.droneOscs = freqs.map((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(f, now);
      
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

  // ========================================================================
  // 泛音加法合成器 (Additive Synthesis Engine for Harmonics)
  // ========================================================================

  playHarmonicPartial(n, baseFreq = C3_FREQ, duration = 1.2) {
    this.ensureContext();
    const freq = baseFreq * n;
    const now = this.ctx.currentTime;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35 / Math.sqrt(n), now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  setHarmonicPartialActive(n, baseFreq, gainVal) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    if (this.harmonicVoices.has(n)) {
      const v = this.harmonicVoices.get(n);
      if (gainVal <= 0.001) {
        v.gain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
        setTimeout(() => {
          try { v.osc.stop(); } catch(e) {}
          this.harmonicVoices.delete(n);
        }, 120);
      } else {
        v.gain.gain.linearRampToValueAtTime(gainVal, now + 0.05);
      }
    } else if (gainVal > 0.001) {
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(gainVal, now + 0.05);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * n, now);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);
      osc.start(now);

      this.harmonicVoices.set(n, { osc, gain: gainNode });
    }
  }

  stopAllHarmonics() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.harmonicVoices.forEach((v) => {
      try {
        v.gain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
        v.osc.stop(now + 0.12);
      } catch(e) {}
    });
    this.harmonicVoices.clear();
  }

  // ========================================================================
  // 20世纪先锋技法物理声学模型
  // ========================================================================

  // 斯克里亚宾神秘和弦 (Scriabin Mystic Chord: C - F# - Bb - E - A - D)
  playScriabinMystic(duration = 3.5) {
    this.ensureContext();
    const freqs = [130.81, 185.00, 233.08, 329.63, 440.00, 587.33]; // C3, F#3, Bb3, E4, A4, D5
    const now = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.18, now + 0.05 + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const osc = this.ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  // 利盖蒂微复调音块 (Ligeti Micropolyphonic Sound Mass)
  playLigetiCluster(duration = 4.5) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    // 12个紧密半音微复调层叠 (从 F3 到 E4，每半音带 ±3音分微拍频)
    const baseFreqs = [
      174.61, 185.00, 196.00, 207.65, 220.00, 233.08,
      246.94, 261.63, 277.18, 293.66, 311.13, 329.63
    ];

    baseFreqs.forEach((f, idx) => {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      // 缓入与缓出 (像星云一般缓缓弥漫)
      g.gain.linearRampToValueAtTime(0.08, now + 1.0 + Math.random() * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      // 添加极微小的随机颤音相干性
      osc.frequency.setValueAtTime(f * (1 + (Math.random() - 0.5) * 0.006), now);

      // 微弱低频 LFO 颤音
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.2 + idx * 0.15, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(1.5, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(now);
      lfo.stop(now + duration + 0.1);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.1);
    });
  }

  // 彭德雷茨基弦乐音簇滑音 (Penderecki Tone Cluster Glissando)
  playPendereckiCluster(duration = 3.8) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    // 16把弦乐在 1800Hz - 3200Hz 极高音区撕裂滑奏
    for (let i = 0; i < 16; i++) {
      const startF = 1800 + i * 85 + (Math.random() - 0.5) * 40;
      const endF = startF * (0.65 + (Math.random() - 0.5) * 0.15); // 向下滑奏

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(endF, now + duration * 0.85);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(startF, now);
      filter.frequency.exponentialRampToValueAtTime(endF, now + duration * 0.85);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration + 0.1);
    }
  }

  // 普隆普-莱费尔特拍频实验 (Plomp-Levelt Beat Frequency)
  playPlompBeats(beatHz = 4.0, baseF = 440, duration = 2.5) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.3, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseF, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseF + beatHz, now);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
  }

  // 1. 试听毕达哥拉斯音差 (Pythagorean Comma · 23.46c · 约3.57Hz慢拍频)
  playPythagoreanComma(duration = 2.8) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const baseF = C4_FREQ; // 261.63 Hz (黄钟)
    const pythF = baseF * (531441 / 524288); // 265.19 Hz (清黄钟，高出23.46音分)

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseF, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(pythF, now);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
  }

  // 2. 试听普通音差 (Syntonic Comma · 21.51c · 纯律 vs 毕氏大三度 · 约4.1Hz拍频)
  playSyntonicComma(duration = 2.8) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const justE4 = C4_FREQ * 1.25; // 327.03 Hz (纯律大三度 5:4)
    const pythE4 = C4_FREQ * (81 / 64); // 331.12 Hz (五度相生大三度 81:64)

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(justE4, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(pythE4, now);

    osc1.connect(g);
    osc2.connect(g);
    g.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
  }

  // 3. 试听小半音差 (Diesis · 41.06c · 中庸全音律狼音差 · 约9.9Hz粗糙感)
  playDiesisComma(duration = 2.8) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const f1 = 415.30; // G#4
    const f2 = 415.30 * (128 / 125); // Ab4 (~425.26 Hz)

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(f1, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(f2, now);

    // 软化微弱低通滤波
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
  }

  // 经典功能和声终止式 (Functional Cadences)
  playCadence(type = 'authentic') {
    this.ensureContext();
    if (type === 'authentic') {
      const chords = [
        { notes: ['C3', 'G3', 'C4', 'E4', 'G4'], d: 0.9 },
        { notes: ['F2', 'A3', 'C4', 'F4', 'A4'], d: 0.9 },
        { notes: ['G2', 'G3', 'B3', 'D4', 'F4'], d: 1.1 },
        { notes: ['C3', 'G3', 'C4', 'E4', 'C5'], d: 2.2 }
      ];
      chords.forEach((c, idx) => {
        setTimeout(() => this.playChord(c.notes, c.d), idx * 800);
      });
    } else if (type === 'plagal') {
      const chords = [
        { notes: ['C3', 'G3', 'C4', 'E4', 'G4'], d: 1.1 },
        { notes: ['F2', 'A3', 'C4', 'F4', 'C5'], d: 1.4 },
        { notes: ['C3', 'G3', 'C4', 'E4', 'G4'], d: 2.5 }
      ];
      chords.forEach((c, idx) => {
        setTimeout(() => this.playChord(c.notes, c.d), idx * 1000);
      });
    } else if (type === 'deceptive') {
      const chords = [
        { notes: ['C3', 'G3', 'C4', 'E4'], d: 0.9 },
        { notes: ['F2', 'A3', 'C4', 'F4'], d: 0.9 },
        { notes: ['G2', 'G3', 'B3', 'D4', 'F4'], d: 1.1 },
        { notes: ['A2', 'E3', 'A3', 'C4', 'E4'], d: 2.4 }
      ];
      chords.forEach((c, idx) => {
        setTimeout(() => this.playChord(c.notes, c.d), idx * 850);
      });
    } else if (type === 'neapolitan') {
      const chords = [
        { notes: ['C3', 'G3', 'C4', 'Eb4'], d: 0.9 },
        { notes: ['F2', 'Ab3', 'Db4', 'F4'], d: 1.1 },
        { notes: ['G2', 'G3', 'B3', 'D4', 'F4'], d: 1.1 },
        { notes: ['C3', 'G3', 'C4', 'Eb4', 'C5'], d: 2.5 }
      ];
      chords.forEach((c, idx) => {
        setTimeout(() => this.playChord(c.notes, c.d), idx * 900);
      });
    }
  }

  // 塔尔蒂尼“第三音”/差音实验 (Tartini Combination Tone: f1, f2 -> f2 - f1)
  playTartiniTones(f1 = 800, f2 = 1000, duration = 3.0) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.25, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(f1, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(f2, now);

    const diffF = Math.abs(f2 - f1);
    const oscDiff = this.ctx.createOscillator();
    oscDiff.type = 'triangle';
    oscDiff.frequency.setValueAtTime(diffF, now);
    const diffGain = this.ctx.createGain();
    diffGain.gain.setValueAtTime(0.12, now);

    osc1.connect(g);
    osc2.connect(g);
    oscDiff.connect(diffGain);
    diffGain.connect(g);
    g.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    oscDiff.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
    oscDiff.stop(now + duration + 0.1);
  }

  // 约翰·凯奇预置钢琴物理发声 (Prepared Piano Synthesis Models)
  playPreparedPianoBolt(baseFreq = 220, duration = 1.2) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const freqs = [baseFreq, baseFreq * 2.76, baseFreq * 5.4, baseFreq * 8.91];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.2 / (idx + 1), now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration * (1 / (idx + 1)));

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  }

  playPreparedPianoRubber(baseFreq = 160, duration = 0.5) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.35, now + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  playPreparedPianoCoin(baseFreq = 330, duration = 1.6) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);

    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(38, now);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(45, now);
    lfo.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(3, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.25, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + duration + 0.05);
    osc.stop(now + duration + 0.05);
  }

  playCageSonataFragment() {
    const pattern = [
      { type: 'bolt', f: 220, t: 0 },
      { type: 'rubber', f: 140, t: 160 },
      { type: 'coin', f: 380, t: 320 },
      { type: 'bolt', f: 290, t: 520 },
      { type: 'rubber', f: 120, t: 720 },
      { type: 'coin', f: 440, t: 880 },
      { type: 'bolt', f: 180, t: 1100 }
    ];
    pattern.forEach(p => {
      setTimeout(() => {
        if (p.type === 'bolt') this.playPreparedPianoBolt(p.f, 1.0);
        else if (p.type === 'rubber') this.playPreparedPianoRubber(p.f, 0.4);
        else if (p.type === 'coin') this.playPreparedPianoCoin(p.f, 1.2);
      }, p.t);
    });
  }

  // 韦伯恩 Op.28 对称序列 (BACH 动机晶体衍生)
  playWebernRow(duration = 0.35) {
    const notes = ['Bb3', 'A3', 'C4', 'B3', 'D#4', 'E4', 'C#4', 'D4', 'F#4', 'F4', 'Ab4', 'G4'];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playNote(n, duration), idx * 220);
    });
  }

  // 全序列主义四维参数实验 (Total Serialism)
  playTotalSerialism() {
    const pitches = ['C3', 'Eb4', 'F#3', 'B4', 'G3', 'C#5', 'A2', 'D4', 'Ab3', 'E5', 'Bb2', 'F4'];
    const durations = [0.15, 0.45, 0.25, 0.6, 0.1, 0.5, 0.3, 0.7, 0.18, 0.38, 0.55, 0.8];
    pitches.forEach((p, idx) => {
      setTimeout(() => {
        this.playNote(p, durations[idx]);
      }, idx * 240);
    });
  }

  // 泽纳基斯《变态》连续高斯滑奏音响曲面 (Xenakis Metastaseis Glissandi)
  playXenakisGlissando(duration = 4.0) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const glissLines = [
      { start: 220, end: 580 },
      { start: 330, end: 190 },
      { start: 440, end: 880 },
      { start: 660, end: 310 },
      { start: 165, end: 415 }
    ];

    glissLines.forEach(line => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(line.start, now);
      osc.frequency.exponentialRampToValueAtTime(line.end, now + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.08, now + 0.3);
      g.gain.setValueAtTime(0.08, now + duration - 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  }

  // 空气柱开管 vs 闭管物理驻波声学对比 (Open vs Closed Pipe Acoustics)
  playPipeResonance(isOpen = true, duration = 2.4) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const baseFreq = 130.81; // C3
    // 开管 λ=2L 产生全谐波(1,2,3,4,5,6)；闭管 λ=4L 仅产生奇次谐波(1,3,5,7)
    const partials = isOpen
      ? [
          { n: 1, g: 0.35 },
          { n: 2, g: 0.22 },
          { n: 3, g: 0.16 },
          { n: 4, g: 0.11 },
          { n: 5, g: 0.08 },
          { n: 6, g: 0.05 }
        ]
      : [
          { n: 1, g: 0.38 },
          { n: 3, g: 0.26 },
          { n: 5, g: 0.14 },
          { n: 7, g: 0.08 }
        ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * p.n, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(p.g, now + 0.08);
      g.gain.setValueAtTime(p.g * 0.9, now + duration - 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  }

  // 亥姆霍兹共鸣腔空腔共振 (Helmholtz Resonator Cavity)
  playHelmholtzCavity(duration = 2.0) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260.0, now); // 亥姆霍兹标准中空腔共鸣频率

    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260.0, now);
    filter.Q.setValueAtTime(12, now); // 高Q值强共振

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(now);
    osc.start(now);
    noise.stop(now + duration + 0.05);
    osc.stop(now + duration + 0.05);
  }

  // 古希腊四分音四音列 (Enharmonic Tetrachord)
  playEnharmonicTetrachord() {
    const freqs = [329.63, 339.2, 349.23, 440.0]; // E4, E+1/4, F4, A4
    freqs.forEach((f, idx) => {
      setTimeout(() => {
        this.playNote('E4', 0.55, f);
      }, idx * 300);
    });
  }

  // 印度 22 斯鲁提微音阶梯片断 (Shruti Microtonal Sequence)
  playShrutiScale() {
    const baseSa = 261.63; // C4
    // 选取代表性微差音分阶梯 (0, 22, 90, 112, 182, 204, 294, 316, 386, 408, 498, 520)
    const shrutiCents = [0, 22, 90, 112, 182, 204, 294, 316, 386, 408, 498, 702];
    shrutiCents.forEach((cents, idx) => {
      const f = baseSa * Math.pow(2, cents / 1200);
      setTimeout(() => {
        this.playNote('C4', 0.35, f);
      }, idx * 200);
    });
  }
}

// ==========================================================================
// 5. 勋伯格十二音序列矩阵计算算法
// ==========================================================================

export function compute12ToneMatrix(primeRow) {
  const matrix = Array.from({ length: 12 }, () => Array(12).fill(0));
  const p0 = primeRow[0];

  for (let c = 0; c < 12; c++) {
    matrix[0][c] = primeRow[c];
  }

  for (let r = 1; r < 12; r++) {
    const interval = (primeRow[r] - p0 + 12) % 12;
    matrix[r][0] = (p0 - interval + 12) % 12;
  }

  for (let r = 1; r < 12; r++) {
    const shift = (matrix[r][0] - matrix[0][0] + 12) % 12;
    for (let c = 1; c < 12; c++) {
      matrix[r][c] = (matrix[0][c] + shift) % 12;
    }
  }

  return matrix;
}

// ==========================================================================
// 6. 五线谱声学几何标尺与音阶矩阵映射 (Musical Staff Acoustics & Geometry)
// ==========================================================================

export const GCLEF_PATH = "M602 978 659 695Q668 696 677.0 696.0Q686 696 694 696Q772 696 838.0 665.5Q904 635 952.0 584.5Q1000 534 1026.5 468.5Q1053 403 1053 333Q1053 276 1035.5 223.5Q1018 171 984.5 127.5Q951 84 903.0 51.5Q855 19 794 3L828 -174Q830 -188 831.5 -200.5Q833 -213 833 -227Q833 -279 814.5 -325.0Q796 -371 763.5 -406.0Q731 -441 688.0 -461.5Q645 -482 596 -482Q551 -482 508.0 -468.5Q465 -455 431.5 -430.5Q398 -406 377.5 -370.0Q357 -334 357 -289Q357 -246 381.5 -212.5Q406 -179 462 -171Q467 -170 472.5 -169.5Q478 -169 483 -169Q511 -169 534.0 -180.5Q557 -192 573.5 -211.0Q590 -230 598.5 -253.5Q607 -277 607 -302Q607 -335 590.0 -366.0Q573 -397 536 -414Q550 -419 563.0 -420.5Q576 -422 590 -422Q628 -422 658.5 -406.5Q689 -391 710.0 -365.0Q731 -339 742.5 -303.5Q754 -268 754 -227Q754 -215 751.5 -194.0Q749 -173 747 -161L718 -11Q691 -18 647 -18Q548 -18 451.5 3.0Q355 24 277.5 75.0Q200 126 149.0 210.5Q98 295 91 422Q90 432 90.0 442.0Q90 452 90 462Q90 556 116.0 646.5Q142 737 199 815Q265 901 342.0 962.0Q419 1023 513 1073Q498 1149 487.5 1204.0Q477 1259 470.0 1297.5Q463 1336 459.0 1361.0Q455 1386 452.5 1402.0Q450 1418 449.5 1428.0Q449 1438 449 1447Q449 1485 460.0 1519.5Q471 1554 492.0 1580.5Q513 1607 543.5 1623.0Q574 1639 613 1639Q661 1639 698.0 1616.5Q735 1594 759.5 1559.0Q784 1524 796.5 1481.0Q809 1438 809 1397Q809 1338 790.5 1280.0Q772 1222 742.5 1168.0Q713 1114 676.0 1065.5Q639 1017 602 978ZM629 1485Q597 1485 578.5 1471.5Q560 1458 550.5 1440.0Q541 1422 538.5 1403.5Q536 1385 536 1375Q536 1302 550.0 1238.0Q564 1174 575 1113Q613 1135 641.5 1164.5Q670 1194 689.0 1227.0Q708 1260 717.5 1294.0Q727 1328 727 1358Q727 1380 722.5 1403.0Q718 1426 707.0 1444.0Q696 1462 677.0 1473.5Q658 1485 629 1485ZM705 55 619 513Q581 504 552.5 482.5Q524 461 505.0 431.5Q486 402 476.5 367.5Q467 333 467 298Q467 285 468.5 272.0Q470 259 472 247Q425 269 401.0 309.0Q377 349 377 398Q377 447 394.0 491.0Q411 535 440.5 571.0Q470 607 508.5 634.0Q547 661 590 677Q579 735 569 785L543 918Q473 852 404.0 786.5Q335 721 271 646Q250 621 230.0 594.0Q210 567 195.0 537.5Q180 508 171.0 476.5Q162 445 162 411Q163 341 184.5 287.5Q206 234 242.0 193.5Q278 153 325.5 125.5Q373 98 425.0 81.0Q477 64 530.5 56.5Q584 49 632 49Q669 49 705 55ZM691 520 779 75Q824 87 858.0 112.5Q892 138 914.5 171.0Q937 204 948.0 241.5Q959 279 959 316Q959 374 935.5 413.0Q912 452 874.0 476.0Q836 500 788.0 510.0Q740 520 691 520Z";

export const FCLEF_PATH = "M275 999Q285 1007 299 1013Q311 1018 328.5 1022.5Q346 1027 369 1027Q403 1027 429.5 1014.5Q456 1002 474.5 981.0Q493 960 503.0 932.5Q513 905 513 876Q513 841 499.5 812.5Q486 784 464.0 764.0Q442 744 414.0 733.5Q386 723 356 723Q311 723 265.0 745.0Q219 767 181.5 810.0Q144 853 120.0 916.5Q96 980 96 1062Q96 1171 133.5 1252.0Q171 1333 234.5 1385.5Q298 1438 381.0 1464.0Q464 1490 554 1490Q658 1490 744.5 1458.5Q831 1427 893.5 1364.5Q956 1302 990.5 1208.0Q1025 1114 1025 988Q1025 865 997.5 765.0Q970 665 922.0 585.0Q874 505 809.5 444.0Q745 383 672.0 338.0Q599 293 521.0 262.5Q443 232 367.0 214.0Q291 196 221.5 188.0Q152 180 96 180V318Q137 318 191.5 322.5Q246 327 307.0 340.0Q368 353 432.0 375.0Q496 397 557.0 432.0Q618 467 672.0 516.0Q726 565 767.0 632.0Q808 699 831.5 784.5Q855 870 855 978Q855 1083 830.5 1155.0Q806 1227 764.5 1271.0Q723 1315 668.5 1334.0Q614 1353 554 1353Q500 1353 448.0 1338.0Q396 1323 355.5 1289.0Q315 1255 290.5 1199.0Q266 1143 266 1062Q266 1048 267.0 1036.5Q268 1025 270 1017Q272 1007 275 999ZM1223 1024Q1177 1024 1144.5 1057.0Q1112 1090 1112 1136Q1112 1182 1144.5 1214.0Q1177 1246 1223 1246Q1270 1246 1303.0 1214.0Q1336 1182 1336 1136Q1336 1090 1303.0 1057.0Q1270 1024 1223 1024ZM1223 580Q1177 580 1144.5 613.0Q1112 646 1112 692Q1112 738 1144.5 771.5Q1177 805 1223 805Q1270 805 1303.0 771.5Q1336 738 1336 692Q1336 646 1303.0 613.0Q1270 580 1223 580Z";

export const NOTE_STAFF_MAP = {
  'A3':  { diatonic: -2, acc: '',  name: 'A3',  solfege: 'La', lu: '低南吕' },
  'B3':  { diatonic: -1, acc: '',  name: 'B3',  solfege: 'Ti', lu: '低应钟' },
  'C4':  { diatonic: 0,  acc: '',  name: 'C4',  solfege: 'Do', lu: '黄钟' },
  'C#4': { diatonic: 0,  acc: '♯', name: 'C#4', solfege: 'Di', lu: '大吕' },
  'Db4': { diatonic: 1,  acc: '♭', name: 'Db4', solfege: 'Ra', lu: '大吕' },
  'D4':  { diatonic: 1,  acc: '',  name: 'D4',  solfege: 'Re', lu: '太簇' },
  'D#4': { diatonic: 1,  acc: '♯', name: 'D#4', solfege: 'Ri', lu: '夹钟' },
  'Eb4': { diatonic: 2,  acc: '♭', name: 'Eb4', solfege: 'Me', lu: '夹钟' },
  'E4':  { diatonic: 2,  acc: '',  name: 'E4',  solfege: 'Mi', lu: '姑洗' },
  'F4':  { diatonic: 3,  acc: '',  name: 'F4',  solfege: 'Fa', lu: '仲吕' },
  'F#4': { diatonic: 3,  acc: '♯', name: 'F#4', solfege: 'Fi', lu: '蕤宾' },
  'Gb4': { diatonic: 4,  acc: '♭', name: 'Gb4', solfege: 'Se', lu: '蕤宾' },
  'G4':  { diatonic: 4,  acc: '',  name: 'G4',  solfege: 'Sol', lu: '林钟' },
  'G#4': { diatonic: 4,  acc: '♯', name: 'G#4', solfege: 'Si', lu: '夷则' },
  'Ab4': { diatonic: 5,  acc: '♭', name: 'Ab4', solfege: 'Le', lu: '夷则' },
  'A4':  { diatonic: 5,  acc: '',  name: 'A4',  solfege: 'La', lu: '南吕' },
  'A#4': { diatonic: 5,  acc: '♯', name: 'A#4', solfege: 'Li', lu: '无射' },
  'Bb4': { diatonic: 6,  acc: '♭', name: 'Bb4', solfege: 'Te', lu: '无射' },
  'B4':  { diatonic: 6,  acc: '',  name: 'B4',  solfege: 'Ti', lu: '应钟' },
  'C5':  { diatonic: 7,  acc: '',  name: 'C5',  solfege: 'Do', lu: '清黄钟' },
  'C#5': { diatonic: 7,  acc: '♯', name: 'C#5', solfege: 'Di', lu: '清大吕' },
  'Db5': { diatonic: 8,  acc: '♭', name: 'Db5', solfege: 'Ra', lu: '清大吕' },
  'D5':  { diatonic: 8,  acc: '',  name: 'D5',  solfege: 'Re', lu: '清太簇' },
  'D#5': { diatonic: 8,  acc: '♯', name: 'D#5', solfege: 'Ri', lu: '清夹钟' },
  'Eb5': { diatonic: 9,  acc: '♭', name: 'Eb5', solfege: 'Me', lu: '清夹钟' },
  'E5':  { diatonic: 9,  acc: '',  name: 'E5',  solfege: 'Mi', lu: '清姑洗' },
  'F5':  { diatonic: 10, acc: '',  name: 'F5',  solfege: 'Fa', lu: '清仲吕' },
  'F#5': { diatonic: 10, acc: '♯', name: 'F#5', solfege: 'Fi', lu: '清蕤宾' },
  'G5':  { diatonic: 11, acc: '',  name: 'G5',  solfege: 'Sol', lu: '清林钟' },
  'A5':  { diatonic: 12, acc: '',  name: 'A5',  solfege: 'La', lu: '清南吕' },
  'B5':  { diatonic: 13, acc: '',  name: 'B5',  solfege: 'Ti', lu: '清应钟' },
  'C6':  { diatonic: 14, acc: '',  name: 'C6',  solfege: 'Do', lu: '重清黄钟' }
};

export const STAVE_SCALE_PRESETS = {
  'chromatic': {
    id: 'chromatic',
    name: '17半音全阶 (C4 – E5)',
    notes: ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5', 'C#5', 'D5', 'D#5', 'E5'],
    desc: '覆盖键盘全部17个半音阶，可观察所有律制半音微差与律吕对齐'
  },
  'major': {
    id: 'major',
    name: 'C大调自然七声音阶 (Diatonic Major)',
    notes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    desc: 'C-D-E-F-G-A-B-C，全-全-半-全-全-全-半，古典大小调体系基石'
  },
  'pentatonic': {
    id: 'pentatonic',
    name: '先秦正声五声音阶 (宫·商·角·徵·羽)',
    notes: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
    desc: '先秦《管子》《吕氏春秋》五正声，除清角与变宫，天然协和'
  },
  'pythagorean': {
    id: 'pythagorean',
    name: '毕达哥拉斯纯五度相生链 (Circle of 5ths)',
    notes: ['F4', 'C4', 'G4', 'D4', 'A4', 'E4', 'B4'],
    desc: '以 3:2 纯五度向上与向下回旋相生链（F-C-G-D-A-E-B）'
  },
  'triad': {
    id: 'triad',
    name: '主三和弦与减七和弦对比',
    notes: ['C4', 'E4', 'G4', 'C5', 'Eb4', 'F#4', 'A4'],
    desc: '协和主三和弦 (C-E-G) vs 极度张力不协和减七和弦 (C-Eb-F#-A)'
  }
};

export function getNoteStaffProps(noteName, staffTopY = 48, lineSpacing = 14) {
  const meta = NOTE_STAFF_MAP[noteName] || { diatonic: 0, acc: '', name: noteName, solfege: '', lu: '' };
  // Line 1 (E4) = staffTopY + 4 * lineSpacing = 104
  // Middle C4 is diatonic 0 -> Y = 118 (one ledger line below)
  const y = (staffTopY + 5 * lineSpacing) - (meta.diatonic * (lineSpacing / 2));
  const stemUp = y > (staffTopY + 2 * lineSpacing); // below middle line B4 (76)

  // Ledger lines
  const ledgerLines = [];
  if (y >= staffTopY + 5 * lineSpacing) {
    ledgerLines.push(staffTopY + 5 * lineSpacing); // 118 (C4)
    if (y >= staffTopY + 6 * lineSpacing) {
      ledgerLines.push(staffTopY + 6 * lineSpacing); // 132 (A3)
    }
  } else if (y <= staffTopY - lineSpacing) {
    ledgerLines.push(staffTopY - lineSpacing); // 34 (A5)
    if (y <= staffTopY - 2 * lineSpacing) {
      ledgerLines.push(staffTopY - 2 * lineSpacing); // 20 (C6)
    }
  }

  return {
    name: noteName,
    diatonic: meta.diatonic,
    acc: meta.acc,
    solfege: meta.solfege,
    lu: meta.lu,
    y,
    stemUp,
    ledgerLines
  };
}

