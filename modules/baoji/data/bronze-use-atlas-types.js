/*
 * 宝鸡青铜器博物院 · Bronze Use Atlas
 * Master type inventory.  The map and the type-card drawer are rendered from
 * this file; local photography is an evidence layer, never a taxonomy gate.
 */
(function (root) {
  'use strict';

  const sourceCatalog = {
    'BAOJI-OFFICIAL': {
      label: '宝鸡青铜器博物院 · 馆方入口',
      institution: '宝鸡青铜器博物院',
      href: 'https://www.bjqtm.com/'
    },
    'BAOJI-PHOTO-INDEX': {
      label: '宝鸡现场照片索引 · 对象记录',
      institution: '宝鸡青铜器博物院专题现场归档',
      href: ''
    },
    'NMC-RITUAL': {
      label: '中国国家博物馆 · 鼎颂礼赞：青铜鼎与中国古代礼制',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/yj/kydt/202110/t20211021_251801.shtml'
    },
    'NMC-YU-CLASS': {
      label: '中国国家博物馆 · 铜盂',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/zp/zpml/kgfjp/202107/t20210728_250873.shtml'
    },
    'NMC-YU-OBJECT': {
      label: '中国国家博物馆 · “匽侯”青铜盂',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/zp/zpml/kgfjp/202108/t20210802_250933.shtml'
    },
    'NMC-JUE': {
      label: '中国国家博物馆 · 青铜爵类馆藏对象',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/zp/zpml/csp/202208/t20220830_257125.shtml'
    },
    'NMC-HU': {
      label: '中国国家博物馆 · 青铜壶类馆藏对象',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/zp/zpml/kgfjp/202110/t20211026_251830.shtml'
    },
    'NMC-PAN': {
      label: '中国国家博物馆 · 虢季子白盘',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/zp/zpml/csp/202008/t20200826_247376_wap.shtml'
    },
    'NMC-HE': {
      label: '中国国家博物馆 · 盉类馆藏与盘盉关系',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/zp/zpml/kgfjp/202209/t20220901_257143.shtml'
    },
    'NMC-MUSIC': {
      label: '中国国家博物馆 · 青铜乐器与礼乐材料',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/yj/kydt/202110/t20211021_251801.shtml'
    },
    'NMC-WEAPONS': {
      label: '中国国家博物馆 · 青铜兵器馆藏',
      institution: '中国国家博物馆',
      href: 'https://m.chnmuseum.cn/zp/zpml/csp/jsq/'
    },
    'NMC-BIANNAO': {
      label: '中国国家博物馆 · 青铜编铙',
      institution: '中国国家博物馆',
      href: 'https://www.chnmuseum.cn/zp/zpml/kgfjp/202107/t20210728_250900.shtml'
    },
    'MET-FANG': {
      label: '大都会艺术博物馆 · 西汉钫',
      institution: 'The Metropolitan Museum of Art',
      href: 'https://www.metmuseum.org/art/collection/search/53779'
    },
    'MAOLING-ZHONG': {
      label: '茂陵博物馆 · 西汉阳信家铜锺',
      institution: '茂陵博物馆',
      href: 'https://www.maoling.com/cangpinzhanshi/186.html'
    },
    'NMNS-DIAODOU': {
      label: '国立自然科学博物馆 · 兽足铜鐎斗',
      institution: '国立自然科学博物馆',
      href: 'https://www.nmns.edu.tw/ch/research/specimen/featured/Collection-000104/'
    }
  };

  const categories = [
    { id: 'food-cooking', order: 1, nameZh: '食器 / 炊器', nameEn: 'FOOD & COOKING', definition: '从受火、蒸煮到熟食盛放，观察器腹、足部与案面之间的动作关系。', actions: '烹 · 蒸 · 盛 · 奉', theme: 'food', background: 'assets/category-food-v2.png' },
    { id: 'wine', order: 2, nameZh: '酒器', nameEn: 'WINE VESSELS', definition: '区分贮酒、温酒、斟酒、饮酒与奉置，不把酒器压缩成一种饮酒杯。', actions: '盛 · 温 · 斟 · 饮 · 奉', theme: 'wine', background: 'assets/category-wine-v3.png' },
    { id: 'water-pouring', order: 3, nameZh: '水器 / 调和器', nameEn: 'WATER & POURING', definition: '以盛、注、承与洗的方向阅读盘、匜、盉、鉴之间的差别。', actions: '盛 · 注 · 承 · 洗', theme: 'water', background: 'assets/category-water-v2.png' },
    { id: 'measures', order: 4, nameZh: '量器', nameEn: 'MEASURES', definition: '只有在器形、铭文与容量证据共同支持时，才把对象纳入度量衡路径。', actions: '量 · 校 · 定', theme: 'measures', background: 'assets/category-measures-v2.png' },
    { id: 'music', order: 5, nameZh: '乐器', nameEn: 'MUSICAL BRONZES', definition: '把器体、悬挂、击奏与编列关系放在声音和礼乐制度中观察。', actions: '铸 · 悬 · 击 · 和', theme: 'music', background: 'assets/category-music-v3.png' },
    { id: 'ritual-accessories', order: 6, nameZh: '礼仪附属 / 承置 / 取用', nameEn: 'RITUAL ACCESSORIES', definition: '关注承置、取用与辅助动作，避免把禁、勺、匕等误写成独立容器。', actions: '承 · 取 · 持 · 奉', theme: 'ritual', background: 'assets/category-ritual-v2.png' },
    { id: 'daily-life', order: 7, nameZh: '生活器具', nameEn: 'DAILY & DOMESTIC', definition: '从照面、照明、受热与日常操作出发，保留器物用途的语境差异。', actions: '照 · 明 · 熏 · 用', theme: 'daily', background: 'assets/category-daily-v3.png' },
    { id: 'chariot-harness', order: 8, nameZh: '车马器', nameEn: 'CHARIOT & HARNESS', definition: '纳入车舆与马具构件，区分装饰、连接与承载功能。', actions: '驾 · 系 · 承 · 饰', theme: 'chariot', background: 'assets/category-chariot-v2.png' },
    { id: 'architecture', order: 9, nameZh: '建筑铜构件', nameEn: 'ARCHITECTURAL BRONZES', definition: '以连接、固定和建筑部位为线索阅读明确的铜制构件。', actions: '接 · 固 · 饰', theme: 'architecture', background: 'assets/category-architecture-v2.png' },
    { id: 'other', order: 10, nameZh: '其他青铜器具', nameEn: 'OTHER BRONZE OBJECTS', definition: '收录功能明确、又不适合前述类别的器具。', actions: '持 · 系 · 用', theme: 'other', background: 'assets/category-other-v2.png' },
    { id: 'weapons', order: 11, nameZh: '兵器', nameEn: 'BRONZE WEAPONS', definition: '以援、胡、内、銎、刃与机括结构区分勾、刺、砍、射等动作。', actions: '刺 · 勾 · 斩 · 射', theme: 'weapons', background: 'assets/category-weapons-v3.png' }
  ];

  const categoryById = Object.fromEntries(categories.map((category) => [category.id, category]));
  const existingDetailVersions = {
    ding: 'v2',
    gui: 'v1',
    li: 'v1',
    yan: 'v1',
    dou: 'v1',
    zun: 'v1',
    you: 'v1',
    jue: 'v1',
    gu: 'v1',
    zhi: 'v1',
    hu: 'v1',
    pan: 'v1',
    he: 'v1',
    yu: 'v1'
  };
  const defaultRelations = {
    'food-cooking': ['ding', 'gui', 'yan'],
    wine: ['zun', 'you', 'jue'],
    'water-pouring': ['pan', 'yi', 'he'],
    measures: ['sheng', 'liang', 'dou-measure'],
    music: ['zhong', 'bianzhong', 'bo'],
    'ritual-accessories': ['jin', 'dou-ladle', 'shao'],
    'daily-life': ['jing', 'deng', 'lu'],
    'chariot-harness': ['danglu', 'e-shi', 'zhou-shi'],
    architecture: ['longwen-jianfang', 'longwen-goujian'],
    other: ['gaozubei', 'daigou'],
    weapons: ['ge-weapon', 'mao-weapon', 'jian-weapon']
  };
  const defaultKeywords = {
    'food-cooking': { form: ['口沿', '腹体', '足部'], action: ['置器', '受火', '盛食'], content: ['熟食', '礼食'] },
    wine: { form: ['口沿', '器腹', '足部'], action: ['置器', '盛酒', '奉置'], content: ['酒液', '酒礼'] },
    'water-pouring': { form: ['口沿', '腹体', '承托'], action: ['盛水', '倾注', '承接'], content: ['水', '液体'] },
    measures: { form: ['器壁', '容积', '铭文'], action: ['量取', '校准', '定制'], content: ['容量', '度量'] },
    music: { form: ['器体', '钮 / 耳', '悬挂结构'], action: ['悬置', '击奏', '编列'], content: ['声响', '音列'] },
    'ritual-accessories': { form: ['连接部', '持握部', '承托部'], action: ['承置', '取用', '奉持'], content: ['器物关系', '动作条件'] },
    'daily-life': { form: ['器面', '底部', '受热部'], action: ['照面', '点燃', '承热'], content: ['光', '香 / 热'] },
    'chariot-harness': { form: ['连接部', '孔 / 扣', '装饰面'], action: ['安装', '系固', '随车'], content: ['车舆关系', '马具关系'] },
    architecture: { form: ['筒体', '接合面', '纹饰面'], action: ['套接', '固定', '装饰'], content: ['建筑节点', '构件关系'] },
    other: { form: ['器身', '连接部', '受力面'], action: ['持握', '系挂', '使用'], content: ['具体对象', '语境材料'] },
    weapons: { form: ['刃部', '援 / 銎', '装柄部'], action: ['装柄', '挥击', '穿刺'], content: ['兵器组合', '使用痕迹'] }
  };

  function detailPageFor(slug) {
    return existingDetailVersions[slug]
      ? `../../../output/baoji-bronze-use-atlas/prototype-${slug}-${existingDetailVersions[slug]}/index.html`
      : `types/${slug}/index.html`;
  }

  function type(spec) {
    const category = categoryById[spec.categoryId];
    const defaults = defaultKeywords[spec.categoryId];
    const localGroups = spec.localBaojiGroupIds || [];
    return {
      id: spec.slug,
      slug: spec.slug,
      nameZh: spec.nameZh,
      nameEn: spec.nameEn,
      romanization: spec.romanization,
      categoryId: spec.categoryId,
      categoryZh: category.nameZh,
      categoryEn: category.nameEn,
      shortFunction: spec.shortFunction,
      formKeywords: spec.formKeywords || defaults.form,
      actionKeywords: spec.actionKeywords || defaults.action,
      contentKeywords: spec.contentKeywords || defaults.content,
      relationTypeIds: spec.relationTypeIds || defaultRelations[spec.categoryId],
      canonical: true,
      displayInAtlas: spec.displayInAtlas !== false,
      materialClass: spec.materialClass || 'bronze',
      inventoryStatus: spec.inventoryStatus || 'EXISTING',
      crossMuseumRefs: spec.crossMuseumRefs || [],
      crossMuseumObjects: spec.crossMuseumObjects || [],
      sourceIds: spec.sourceIds || ['NMC-RITUAL'],
      localBaojiGroupIds: localGroups,
      officialExampleLinks: spec.officialExampleLinks || [],
      detailPage: spec.detailPage || detailPageFor(spec.slug),
      visualAsset: spec.visualAsset || category.background,
      visualAssetOverride: spec.visualAsset || null,
      visualAssetSet: spec.visualAssetSet || null,
      categoryVisualSet: category.visualSet || null,
      evidenceLevel: spec.evidenceLevel || (localGroups.length ? 'LOCAL + SOURCE' : 'SOURCE-LED'),
      notes: spec.notes || '器物的具体功能需结合形制、使用痕迹与出土语境判断。'
    };
  }

  const types = [
    // A · Food & cooking
    type({ slug: 'ding', nameZh: '鼎', nameEn: 'TRIPOD', romanization: 'DING', categoryId: 'food-cooking', shortFunction: '炊煮 · 盛食 · 礼仪', localBaojiGroupIds: ['photo-group-3222', 'photo-group-3232', 'photo-group-3333'], relationTypeIds: ['li', 'yan', 'gui'], sourceIds: ['BAOJI-OFFICIAL', 'BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'li', nameZh: '鬲', nameEn: 'STEAMED-LEG VESSEL', romanization: 'LI', categoryId: 'food-cooking', shortFunction: '受火 · 炊煮 · 承托', localBaojiGroupIds: ['photo-group-3218', 'photo-group-3372', 'photo-group-3393'], relationTypeIds: ['ding', 'yan'], sourceIds: ['BAOJI-OFFICIAL', 'BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'yan', nameZh: '甗', nameEn: 'STEAMER', romanization: 'YAN', categoryId: 'food-cooking', shortFunction: '蒸食 · 受火 · 分层', localBaojiGroupIds: ['photo-group-3186', 'photo-group-3505'], relationTypeIds: ['li', 'ding', 'gui'], sourceIds: ['BAOJI-OFFICIAL', 'BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'gui', nameZh: '簋', nameEn: 'FOOD CONTAINER', romanization: 'GUI', categoryId: 'food-cooking', shortFunction: '盛食 · 礼食 · 陈设', localBaojiGroupIds: ['photo-group-3198', 'photo-group-3314', 'photo-group-3479', 'photo-group-3476'], relationTypeIds: ['ding', 'dou', 'fu'], sourceIds: ['BAOJI-OFFICIAL', 'BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'fu', nameZh: '簠', nameEn: 'RECTANGULAR FOOD CONTAINER', romanization: 'FU', categoryId: 'food-cooking', shortFunction: '盛黍稷 · 礼食', relationTypeIds: ['gui', 'dun', 'xu'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/fu-use-hero.png', notes: '簠以方形器体及盖身关系区别于圆腹簋，定名还需结合口沿、足部与铭文。' }),
    type({ slug: 'xu', nameZh: '盨', nameEn: 'LIDDED FOOD CONTAINER', romanization: 'XU', categoryId: 'food-cooking', shortFunction: '盛食 · 盖合 · 礼食', localBaojiGroupIds: ['photo-group-3602'], relationTypeIds: ['gui', 'fu', 'dun'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], visualAsset: 'assets/types/xu-use-hero.png' }),
    type({ slug: 'dou', nameZh: '豆', nameEn: 'STEMMED FOOD DISH', romanization: 'DOU', categoryId: 'food-cooking', shortFunction: '盛食 · 高置 · 奉食', relationTypeIds: ['gui', 'ding', 'yu'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/dou-use-hero.png', notes: '豆的高柄与斗的量取功能不同；高足杯不自动等同于豆。' }),
    type({ slug: 'dun', nameZh: '敦', nameEn: 'COVERED FOOD CONTAINER', romanization: 'DUN', categoryId: 'food-cooking', shortFunction: '盛食 · 盖合 · 陈设', relationTypeIds: ['gui', 'xu', 'ding'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/dun-use-hero.png', notes: '敦的盖身关系与器腹形态需按具体器例区分，不能直接并入簋。' }),
    type({ slug: 'yu', nameZh: '盂', nameEn: 'DEEP CONTAINER', romanization: 'YU', categoryId: 'food-cooking', shortFunction: '盛食 · 盛水 · 容纳', localBaojiGroupIds: ['photo-group-3437', 'photo-group-3337'], relationTypeIds: ['gui', 'pan', 'hu'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-YU-CLASS', 'NMC-YU-OBJECT'] }),
    type({ slug: 'pen', nameZh: '盆', nameEn: 'BASIN / DEEP BOWL', romanization: 'PEN', categoryId: 'food-cooking', shortFunction: '承接 · 盛放 · 语境使用', localBaojiGroupIds: ['photo-group-3396', 'photo-group-3792'], relationTypeIds: ['yu', 'pan', 'jian-water'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], visualAsset: 'assets/types/pen-use-hero.png', notes: '盆与盂、盘在口腹比例和动作路径上相邻，不能只凭圆形外观互换。' }),
    type({ slug: 'fu-metal', nameZh: '鍑', nameEn: 'METAL CAULDRON', romanization: 'FU', categoryId: 'food-cooking', shortFunction: '炊煮 · 受火 · 容纳', relationTypeIds: ['ding', 'li', 'yan'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/fu-metal-use-hero.png', notes: '鍑属于大口釜类炊器，器腹、口沿和受火痕迹随时代与地区而变化。' }),
    type({ slug: 'fu-cauldron', nameZh: '釜', nameEn: 'CAULDRON', romanization: 'FU', categoryId: 'food-cooking', shortFunction: '煮沸 · 受火 · 炊煮', relationTypeIds: ['ding', 'li', 'fu-metal'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/fu-cauldron-use-hero.png', notes: '釜的炊煮属性需由受火、器底与器壁形态共同支持。' }),
    type({ slug: 'zeng', nameZh: '甑', nameEn: 'STEAMING VESSEL', romanization: 'ZENG', categoryId: 'food-cooking', shortFunction: '蒸食 · 透汽 · 分层', relationTypeIds: ['yan', 'li'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '甑是具有箅孔的上层蒸食器，可与釜、鬲等受火器配合；单独的甑与上甑下釜的完整甗结构有别。' }),

    // B · Wine vessels
    type({ slug: 'jue', nameZh: '爵', nameEn: 'WINE CUP', romanization: 'JUE', categoryId: 'wine', shortFunction: '温酒 · 斟饮 · 奉酒', localBaojiGroupIds: ['photo-group-3354'], relationTypeIds: ['jiao', 'zhi', 'zun'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-JUE'] }),
    type({ slug: 'jiao', nameZh: '角', nameEn: 'HORN-SHAPED WINE VESSEL', romanization: 'JIAO', categoryId: 'wine', shortFunction: '温酒 · 斟饮 · 礼酒', relationTypeIds: ['jue', 'jia', 'zhi'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/jiao-use-hero.png', notes: '角与爵的流、尾、足部关系不同，不能按“饮酒器”一词合并。' }),
    type({ slug: 'gu', nameZh: '觚', nameEn: 'TALL WINE VESSEL', romanization: 'GU', categoryId: 'wine', shortFunction: '盛酒 · 奉酒 · 陈设', localBaojiGroupIds: ['photo-group-3205'], relationTypeIds: ['zhi', 'zun', 'jue'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'zhi', nameZh: '觯', nameEn: 'WINE CUP / POURING VESSEL', romanization: 'ZHI', categoryId: 'wine', shortFunction: '饮酒 · 斟酒 · 礼仪', localBaojiGroupIds: ['photo-group-3293', 'photo-group-3357', 'photo-group-3583'], relationTypeIds: ['jue', 'gu', 'zun'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'jia', nameZh: '斝', nameEn: 'WINE-WARMING VESSEL', romanization: 'JIA', categoryId: 'wine', shortFunction: '温酒 · 受热 · 奉酒', localBaojiGroupIds: ['photo-group-3194'], relationTypeIds: ['jue', 'jiao', 'zun'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], visualAssetSet: { hero: 'assets/jia/jia-use-hero.png', form: 'assets/jia/jia-section-form.png', action: 'assets/jia/jia-section-action.png', contents: 'assets/jia/jia-section-contents.png', ritual: 'assets/jia/jia-section-ritual.png', relations: 'assets/jia/jia-section-relations.png', evidence: 'assets/jia/jia-section-evidence.png' } }),
    type({ slug: 'zun', nameZh: '尊', nameEn: 'WINE CONTAINER', romanization: 'ZUN', categoryId: 'wine', shortFunction: '盛酒 · 奉酒 · 陈设', localBaojiGroupIds: ['photo-group-3243', 'photo-group-3268', 'photo-group-3454'], relationTypeIds: ['you', 'jue', 'gu'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'you', nameZh: '卣', nameEn: 'LIDDED WINE CONTAINER', romanization: 'YOU', categoryId: 'wine', shortFunction: '贮酒 · 提携 · 奉酒', localBaojiGroupIds: ['photo-group-3263', 'photo-group-3273', 'photo-group-3424'], relationTypeIds: ['zun', 'hu', 'fangyi'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'lei', nameZh: '罍', nameEn: 'LARGE WINE CONTAINER', romanization: 'LEI', categoryId: 'wine', shortFunction: '贮酒 · 盛液 · 陈设', localBaojiGroupIds: ['photo-group-3306', 'photo-group-3546'], relationTypeIds: ['zun', 'hu', 'you'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], visualAsset: 'assets/types/lei-use-hero.png', notes: '罍与壶都能进入液体容纳路径，但器体比例、口部与时代变化不可混写。' }),
    type({ slug: 'hu', nameZh: '壶', nameEn: 'LIQUID CONTAINER', romanization: 'HU', categoryId: 'wine', shortFunction: '盛液 · 储存 · 倾注', localBaojiGroupIds: ['photo-group-3290', 'photo-group-3636', 'photo-group-3719'], relationTypeIds: ['lei', 'you', 'he'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-HU'] }),
    type({ slug: 'gong', nameZh: '觥', nameEn: 'ANIMAL-SHAPED WINE VESSEL', romanization: 'GONG', categoryId: 'wine', shortFunction: '盛酒 · 倾注 · 礼仪', relationTypeIds: ['zun', 'you', 'jue'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/gong-use-hero.png', notes: '觥的动物形态与盖、流等构件需以具体器例说明，不以想象复原补足。' }),
    type({ slug: 'fangyi', nameZh: '方彝', nameEn: 'LIDDED SQUARE WINE VESSEL', romanization: 'FANGYI', categoryId: 'wine', shortFunction: '贮酒 · 盖合 · 陈设', localBaojiGroupIds: ['photo-group-3249', 'photo-group-3624'], relationTypeIds: ['zun', 'you', 'lei'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], visualAssetSet: { hero: 'assets/fangyi/fangyi-use-hero.png', form: 'assets/fangyi/fangyi-section-form.png', action: 'assets/fangyi/fangyi-section-action.png', contents: 'assets/fangyi/fangyi-section-contents.png', ritual: 'assets/fangyi/fangyi-section-ritual.png', relations: 'assets/fangyi/fangyi-section-relations.png', evidence: 'assets/fangyi/fangyi-section-evidence.png' }, notes: '方彝是具体方形器类，不把所有称“彝”的对象泛化为方彝。' }),
    type({ slug: 'bu', nameZh: '瓿', nameEn: 'WIDE-BODIED WINE VESSEL', romanization: 'BU', categoryId: 'wine', shortFunction: '盛酒 · 容纳 · 陈设', relationTypeIds: ['zun', 'lei', 'hu'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/bu-use-hero.png' }),
    type({ slug: 'fou', nameZh: '缶', nameEn: 'LARGE CONTAINER', romanization: 'FOU', categoryId: 'wine', shortFunction: '盛液 · 储存 · 容器', relationTypeIds: ['hu', 'lei', 'zun'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/fou-use-hero.png', notes: '缶的时代、形制与盛液用途需由实物、铭文和出土组合共同判断，不能仅据字形或容量单位推定。' }),
    type({ slug: 'zhi-cup', nameZh: '卮', nameEn: 'CYLINDRICAL WINE CUP', romanization: 'ZHI', categoryId: 'wine', shortFunction: '饮酒 · 持握 · 随宴', relationTypeIds: ['jue', 'zhi', 'gu'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '卮以筒形杯身、鋬与低足形成便于持握的饮酒器形。它与觯同音而器名、字形和典型轮廓均不同。' }),
    type({ slug: 'fang-wine', nameZh: '钫', nameEn: 'SQUARE WINE VESSEL', romanization: 'FANG', categoryId: 'wine', shortFunction: '盛酒 · 贮液 · 陈设', relationTypeIds: ['hu', 'zhong-wine', 'lei'], sourceIds: ['MET-FANG'], inventoryStatus: 'ADD', officialExampleLinks: ['https://www.metmuseum.org/art/collection/search/53779'] }),
    type({ slug: 'zhong-wine', nameZh: '锺', nameEn: 'ZHONG WINE VESSEL', romanization: 'ZHONG', categoryId: 'wine', shortFunction: '盛酒 · 贮液 · 计量', relationTypeIds: ['hu', 'fang-wine', 'lei'], sourceIds: ['MAOLING-ZHONG'], inventoryStatus: 'ADD', officialExampleLinks: ['https://www.maoling.com/cangpinzhanshi/186.html'] }),

    // C · Water & pouring
    type({ slug: 'pan', nameZh: '盘', nameEn: 'BASIN', romanization: 'PAN', categoryId: 'water-pouring', shortFunction: '承水 · 盥洗 · 接取', localBaojiGroupIds: ['photo-group-3325', 'photo-group-3634'], relationTypeIds: ['yi', 'he', 'yu'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-PAN'] }),
    type({ slug: 'yi', nameZh: '匜', nameEn: 'POURING VESSEL', romanization: 'YI', categoryId: 'water-pouring', shortFunction: '注水 · 倾注 · 盥洗', localBaojiGroupIds: ['photo-group-3524', 'photo-group-3748', 'photo-group-3754'], relationTypeIds: ['pan', 'he', 'jian-water'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/yi-use-hero.png', notes: '匜以流与持握结构区分于盉；宝鸡本地器例可与盘、盉等水器合看其注水结构。' }),
    type({ slug: 'he', nameZh: '盉', nameEn: 'SPOUTED VESSEL', romanization: 'HE', categoryId: 'water-pouring', shortFunction: '盛液 · 倾注 · 配合', localBaojiGroupIds: ['photo-group-3386', 'photo-group-3541', 'photo-group-3740'], relationTypeIds: ['pan', 'yi', 'hu'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-HE'] }),
    type({ slug: 'jian-water', nameZh: '鉴', nameEn: 'LARGE WATER BASIN', romanization: 'JIAN', categoryId: 'water-pouring', shortFunction: '盛水 · 承接 · 照容', relationTypeIds: ['pan', 'yu', 'yi'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/jian-water-use-hero.png', notes: '鉴的容量与器体规模使其与盘、盂形成比较路径；具体动作仍需器例支持。' }),
    type({ slug: 'xi', nameZh: '洗', nameEn: 'WASH BASIN', romanization: 'XI', categoryId: 'water-pouring', shortFunction: '承水 · 洗濯 · 接取', relationTypeIds: ['pan', 'jian-water', 'yi'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/xi-use-hero.png' }),
    type({ slug: 'ying', nameZh: '鎣', nameEn: 'LIDDED WATER VESSEL', romanization: 'YING', categoryId: 'water-pouring', shortFunction: '盛水 · 注水 · 盥洗', relationTypeIds: ['he', 'yi', 'pan'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', crossMuseumRefs: ['陕西历史博物馆 · 伯百父鎣'], notes: '鎣是与盥洗、注水相关的有盖水器，流、鋬和盖合关系共同限定动作；伯百父鎣等实物说明其形制不能并入盉或匜。' }),

    // D · Measures
    type({ slug: 'sheng', nameZh: '升', nameEn: 'MEASURE', romanization: 'SHENG', categoryId: 'measures', shortFunction: '量取 · 校准 · 定量', relationTypeIds: ['dou-measure', 'liang', 'tongliang'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/sheng-use-hero.png', notes: '只有器形、铭文或计量关系共同支持时，才以升作为量器对象。' }),
    type({ slug: 'dou-measure', nameZh: '斗', nameEn: 'MEASURING SCOOP', romanization: 'DOU', categoryId: 'measures', shortFunction: '量取 · 转移 · 定量', localBaojiGroupIds: ['photo-group-3558'], relationTypeIds: ['sheng', 'liang', 'shao'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], notes: '量斗用于量取与转移，和高柄盛食的豆属于两种器物，不能因读音相近而混同。' }),
    type({ slug: 'hu-measure', nameZh: '斛', nameEn: 'LARGE MEASURE', romanization: 'HU', categoryId: 'measures', shortFunction: '容量 · 计量 · 校准', relationTypeIds: ['sheng', 'liang', 'tongliang'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/hu-measure-use-hero.png', notes: '“斛”作为器名必须有具体对象证据，不能因出现斛字就自动视为标准量器。' }),
    type({ slug: 'liang', nameZh: '量', nameEn: 'BRONZE MEASURE', romanization: 'LIANG', categoryId: 'measures', shortFunction: '定量 · 校制 · 度量', relationTypeIds: ['sheng', 'hu-measure', 'tongliang'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/liang-use-hero.png' }),
    type({ slug: 'tongliang', nameZh: '铜量', nameEn: 'BRONZE CAPACITY STANDARD', romanization: 'TONGLIANG', categoryId: 'measures', shortFunction: '容量 · 度量衡 · 校制', relationTypeIds: ['sheng', 'liang', 'hu-measure'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/tongliang-use-hero.png', notes: '以度量衡属性为核心的器具，必须区分容量单位、器名与具体对象。' }),
    type({ slug: 'fangsheng', nameZh: '方升', nameEn: 'RECTANGULAR CAPACITY MEASURE', romanization: 'FANGSHENG', categoryId: 'measures', shortFunction: '量取 · 校准 · 定制', relationTypeIds: ['sheng', 'dou-measure', 'tongliang'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '方升以方形容腔和柄部构成可操作的容量标准。铭文、实测容量与制度背景必须共同支持其量器身份。' }),
    type({ slug: 'quan', nameZh: '权', nameEn: 'CALIBRATED WEIGHT', romanization: 'QUAN', categoryId: 'measures', shortFunction: '称量 · 校准 · 定制', relationTypeIds: ['liang', 'fangsheng', 'tongliang'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '权是衡器系统中的称量砝码，重量、铭文和成组关系用于确认其计量功能。外形近铃或坠饰的对象不能只凭轮廓归为权。' }),

    // E · Musical bronzes
    type({ slug: 'zhong', nameZh: '钟', nameEn: 'BELL', romanization: 'ZHONG', categoryId: 'music', shortFunction: '悬置 · 击奏 · 发声', localBaojiGroupIds: ['photo-group-3400', 'photo-group-3433', 'photo-group-3649'], relationTypeIds: ['bianzhong', 'bo', 'nao'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-MUSIC'] }),
    type({ slug: 'bianzhong', nameZh: '编钟', nameEn: 'TUNED BELL SET', romanization: 'BIANZHONG', categoryId: 'music', shortFunction: '编列 · 悬挂 · 合奏', localBaojiGroupIds: ['photo-group-3551'], relationTypeIds: ['zhong', 'bo', 'zheng'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-MUSIC'] }),
    type({ slug: 'bo', nameZh: '镈', nameEn: 'LARGE BELL', romanization: 'BO', categoryId: 'music', shortFunction: '悬置 · 击奏 · 礼乐', localBaojiGroupIds: ['photo-group-3656'], relationTypeIds: ['zhong', 'bianzhong', 'nao'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-MUSIC'] }),
    type({ slug: 'nao', nameZh: '铙', nameEn: 'HAND BELL', romanization: 'NAO', categoryId: 'music', shortFunction: '持奏 · 击发 · 节奏', relationTypeIds: ['zhong', 'ling', 'zheng'], sourceIds: ['NMC-MUSIC'], visualAsset: 'assets/types/nao-use-hero.png' }),
    type({ slug: 'zheng', nameZh: '钲', nameEn: 'RITUAL GONG', romanization: 'ZHENG', categoryId: 'music', shortFunction: '悬置 · 击奏 · 指令', relationTypeIds: ['zhong', 'nao', 'ling'], sourceIds: ['NMC-MUSIC'], visualAsset: 'assets/types/zheng-use-hero.png' }),
    type({ slug: 'ling', nameZh: '铃', nameEn: 'BELL', romanization: 'LING', categoryId: 'music', shortFunction: '悬系 · 摇动 · 发声', relationTypeIds: ['nao', 'zhong', 'zheng'], sourceIds: ['NMC-MUSIC'], visualAsset: 'assets/types/ling-use-hero.png' }),
    type({ slug: 'chenyu', nameZh: '錞于', nameEn: 'RITUAL PERCUSSION BRONZE', romanization: 'CHENYU', categoryId: 'music', shortFunction: '悬置 · 击奏 · 合乐', relationTypeIds: ['zhong', 'bo', 'zheng'], sourceIds: ['NMC-MUSIC'], visualAsset: 'assets/types/chenyu-use-hero.png' }),
    type({ slug: 'bianbo', nameZh: '编镈', nameEn: 'GRADUATED BO-BELL SET', romanization: 'BIANBO', categoryId: 'music', shortFunction: '编列 · 悬置 · 合奏', relationTypeIds: ['bo', 'bianzhong', 'zhong'], sourceIds: ['NMC-MUSIC'], inventoryStatus: 'ENSEMBLE_SYSTEM', notes: '编镈是镈类乐器按大小与音高组织的编悬系统，不等同于单件镈。成组关系、悬挂方式和音列共同构成其礼乐身份。' }),
    type({ slug: 'duo', nameZh: '铎', nameEn: 'HAND BELL', romanization: 'DUO', categoryId: 'music', shortFunction: '持柄 · 摇奏 · 传令', relationTypeIds: ['ling', 'zheng', 'nao'], sourceIds: ['NMC-MUSIC'], inventoryStatus: 'ADD', notes: '铎具有持握或悬系结构，并以舌或击奏方式发声。它与钟、铃相邻，但器体尺度和使用动作不同。' }),
    type({ slug: 'judiao', nameZh: '句鑃', nameEn: 'GOU-DIAO BELL', romanization: 'JUDIAO', categoryId: 'music', shortFunction: '持柄 · 击奏 · 礼乐', relationTypeIds: ['nao', 'zheng', 'duo'], sourceIds: ['NMC-MUSIC'], inventoryStatus: 'ADD', notes: '句鑃以细长柄部和向下张开的器口形成鲜明轮廓，常见于吴越礼乐传统。它不能使用普通甬钟或铙的器形替代。' }),
    type({ slug: 'tonggu', nameZh: '铜鼓', nameEn: 'BRONZE DRUM', romanization: 'TONGGU', categoryId: 'music', shortFunction: '击奏 · 聚众 · 礼仪', relationTypeIds: ['zhong', 'chenyu', 'bianzhong'], sourceIds: ['NMC-MUSIC'], inventoryStatus: 'ADD', notes: '铜鼓以宽阔鼓面和中空鼓身整体铸成，击奏面、纹饰区和器腹共同参与声音与仪式。它不是木鼓的铜质附件，也不是钟类。' }),
    type({ slug: 'qing', nameZh: '磬', nameEn: 'STONE CHIME', romanization: 'QING', categoryId: 'music', shortFunction: '悬置 · 击奏 · 金石合乐', relationTypeIds: ['bianqing', 'bianzhong', 'zhong'], sourceIds: ['NMC-MUSIC'], materialClass: 'stone', inventoryStatus: 'ADJACENT_NON_BRONZE', notes: '磬以石或玉材制成，曲折片状器体经悬挂敲击发声；它常与青铜编钟共同构成金石合奏。' }),
    type({ slug: 'bianqing', nameZh: '编磬', nameEn: 'GRADUATED STONE CHIME SET', romanization: 'BIANQING', categoryId: 'music', shortFunction: '编列 · 悬置 · 合奏', relationTypeIds: ['qing', 'bianzhong', 'bianbo'], sourceIds: ['NMC-MUSIC'], materialClass: 'mixed', inventoryStatus: 'ADJACENT_NON_BRONZE', notes: '编磬由多件石质或玉质磬按音列编悬，和编钟共同构成金石礼乐系统；编列、悬架与测音资料决定其音序关系。' }),
    type({ slug: 'biannao', nameZh: '编铙', nameEn: 'GRADUATED NAO SET', romanization: 'BIANNAO', categoryId: 'music', shortFunction: '编列 · 植奏 · 合乐', relationTypeIds: ['nao', 'bianzhong', 'bianbo'], sourceIds: ['NMC-BIANNAO'], inventoryStatus: 'ADD', officialExampleLinks: ['https://www.chnmuseum.cn/zp/zpml/kgfjp/202107/t20210728_250900.shtml'] }),

    // F · Ritual accessories / holding / taking
    type({ slug: 'jin', nameZh: '禁', nameEn: 'Vessel Stand', romanization: 'JIN', categoryId: 'ritual-accessories', shortFunction: '承置 · 抬高 · 稳定', localBaojiGroupIds: ['photo-group-3255'], relationTypeIds: ['zun', 'you', 'hu'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], notes: '禁是承置器，不是容器；其功能来自支撑面与器物组合。' }),
    type({ slug: 'dou-ladle', nameZh: '挹酒斗', nameEn: 'WINE LADLE', romanization: 'YIJIU DOU', categoryId: 'ritual-accessories', shortFunction: '挹酒 · 转移 · 斟酌', relationTypeIds: ['jin', 'shao', 'zun'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/dou-ladle-use-hero.png', notes: '挹酒斗是长柄取酒器，与容量量器之斗同名而功能不同，持柄、斗部与酒器组合是辨别要点。' }),
    type({ slug: 'shao', nameZh: '勺', nameEn: 'Ladle', romanization: 'SHAO', categoryId: 'ritual-accessories', shortFunction: '挹取 · 转移 · 奉持', relationTypeIds: ['yu', 'pan', 'zun'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/shao-use-hero.png' }),
    type({ slug: 'bi', nameZh: '匕', nameEn: 'Serving Knife / Spoon', romanization: 'BI', categoryId: 'ritual-accessories', shortFunction: '取食 · 分取 · 奉持', localBaojiGroupIds: ['photo-group-3531'], relationTypeIds: ['gui', 'ding', 'yu'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], notes: '匕以长柄和浅斗挹取或分送食物；只有具备刃部和相应装柄结构的同名器物才涉及兵器解释。' }),
    type({ slug: 'zan', nameZh: '瓒', nameEn: 'Libation Ladle', romanization: 'ZAN', categoryId: 'ritual-accessories', shortFunction: '挹酒 · 奠献 · 奉持', relationTypeIds: ['zun', 'you', 'shao'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/zan-use-hero.png' }),
    type({ slug: 'zu', nameZh: '俎', nameEn: 'RITUAL STAND', romanization: 'ZU', categoryId: 'ritual-accessories', shortFunction: '承牲 · 陈设 · 奉献', relationTypeIds: ['jin', 'an', 'qizuo'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '俎以低案或框架结构承置牲体与礼物，是礼仪陈设中的承托器。它与禁、案相邻，但承置对象和制度语境不同。' }),
    type({ slug: 'an', nameZh: '案', nameEn: 'SERVING TABLE', romanization: 'AN', categoryId: 'ritual-accessories', shortFunction: '承置 · 陈设 · 奉食', relationTypeIds: ['zu', 'jin', 'qizuo'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '案以平整案面和低足承放器物或食物，属于组合关系中的承置设施。其身份需由案面、足部和出土组合共同判断。' }),
    type({ slug: 'qizuo', nameZh: '器座', nameEn: 'VESSEL STAND', romanization: 'QIZUO', categoryId: 'ritual-accessories', shortFunction: '承托 · 稳定 · 陈设', relationTypeIds: ['jin', 'an', 'zu'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '器座以镂空或承口结构支撑另一件器物，本身不是独立容器。承托面、受力痕迹和配套器物决定具体用途。' }),

    // G · Daily / domestic
    type({ slug: 'jing', nameZh: '镜', nameEn: 'MIRROR', romanization: 'JING', categoryId: 'daily-life', shortFunction: '照面 · 握持 · 随身', localBaojiGroupIds: ['photo-group-3554', 'photo-group-3708'], relationTypeIds: ['deng', 'gaozubei'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], notes: '镜以反照面、钮与背饰为观察重点，不套用容器功能模板。' }),
    type({ slug: 'deng', nameZh: '灯', nameEn: 'LAMP', romanization: 'DENG', categoryId: 'daily-life', shortFunction: '照明 · 承油 · 点燃', localBaojiGroupIds: ['photo-group-3878'], relationTypeIds: ['lu', 'xunlu'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'lu', nameZh: '炉', nameEn: 'BRAZIER', romanization: 'LU', categoryId: 'daily-life', shortFunction: '受热 · 燃烧 · 承置', relationTypeIds: ['xunlu', 'ding', 'fu-cauldron'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/lu-use-hero.png', notes: '炉的受热与承置功能依器底、炉膛和通风结构判断。' }),
    type({ slug: 'xunlu', nameZh: '熏炉', nameEn: 'CENSER', romanization: 'XUNLU', categoryId: 'daily-life', shortFunction: '焚香 · 受热 · 散香', crossMuseumObjects: [{"title":"博山熏炉","museum":"西安博物院","period":"汉代","itemId":"xian-018-4907","image":"../xian-museum/assets/photos/focus-4907.webp","href":"../xian-museum/index.html?item=xian-018-4907#collection","note":"山形炉盖密布通烟孔，炉腹与炉盖共同构成焚香、导烟的完整结构，是汉代博山炉的典型器例。"},{"title":"飞鸟带柄铜熏炉","museum":"西安博物院","period":"年代待考","itemId":"xian-036-4992","image":"../xian-museum/assets/photos/focus-4992.webp","href":"../xian-museum/index.html?item=xian-036-4992#collection","note":"镂孔炉盖与长柄便于导烟和移持；馆藏资料尚未明确年代，相关判断以器物结构为限。"}], relationTypeIds: ['lu', 'deng'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/xunlu-use-hero.png' }),
    type({ slug: 'lian', nameZh: '奁', nameEn: 'COSMETIC BOX', romanization: 'LIAN', categoryId: 'daily-life', shortFunction: '收纳 · 盖合 · 妆用', relationTypeIds: ['he-box', 'jing', 'daigou'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '奁是收纳妆具或小件物品的有盖容器，盖身配合和内部空间构成主要功能。它不因圆腹带盖就等同于敦。' }),
    type({ slug: 'he-box', nameZh: '盒', nameEn: 'LIDDED BOX', romanization: 'HE', categoryId: 'daily-life', shortFunction: '收纳 · 盖合 · 随用', relationTypeIds: ['lian', 'jing', 'daigou'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '盒以低矮盖身和小型收纳空间适应日常使用，材质和时代变化较大。具体功能需由内容物、磨损和出土语境确认。' }),
    type({ slug: 'daigou', nameZh: '带钩', nameEn: 'BELT HOOK', romanization: 'DAIGOU', categoryId: 'daily-life', shortFunction: '系束 · 扣合 · 随身', relationTypeIds: ['tongjie', 'jing'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/daigou-use-hero.png', notes: '带钩通过钩首、钩体和钮部连接腰带，是服用系统中的随身器具。具体年代与佩系方式需依对象证据。' }),
    type({ slug: 'tongjie', nameZh: '铜节', nameEn: 'BRONZE TALLY', romanization: 'TONGJIE', categoryId: 'daily-life', shortFunction: '凭验 · 传达 · 佩持', relationTypeIds: ['hufu', 'tongyin', 'daigou'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '铜节以特定轮廓、铭文和分合关系承担通行或调发凭验。它属于制度性随身器，不按装饰件或兵器处理。' }),
    type({ slug: 'louhu', nameZh: '漏壶', nameEn: 'CLEPSYDRA VESSEL', romanization: 'LOUHU', categoryId: 'daily-life', shortFunction: '计时 · 滴漏 · 校时', relationTypeIds: ['hu', 'tongliang', 'deng'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '漏壶通过容器水位和稳定滴流记录时间，出水口、刻度与配套装置是判断重点。它是计时器具，不是普通贮水壶。' }),
    type({ slug: 'yundou', nameZh: '熨斗', nameEn: 'HEATED IRONING PAN', romanization: 'YUNDOU', categoryId: 'daily-life', shortFunction: '承炭 · 加热 · 整衣', relationTypeIds: ['lu', 'xingzao', 'deng'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '熨斗以浅盘承热并借长柄控制移动，用于整平织物。受热痕迹、柄部结构和使用语境共同支持其功能。' }),
    type({ slug: 'zhen', nameZh: '铜镇', nameEn: 'BRONZE WEIGHT', romanization: 'TONGZHEN', categoryId: 'daily-life', shortFunction: '压席 · 镇物 · 陈设', crossMuseumObjects: [{"title":"人形铜镇","museum":"西安博物院","period":"年代待考","itemId":"xian-017-4905","image":"../xian-museum/assets/photos/focus-4905.webp","href":"../xian-museum/index.html?item=xian-017-4905#collection","note":"人形器身低矮而重心稳定，适合置于席角压固铺陈；具体年代仍待考。"},{"title":"鎏金凤鸟铜镇","museum":"西安博物院","period":"年代待考","itemId":"xian-042-5008","image":"../xian-museum/assets/photos/focus-5008.webp","href":"../xian-museum/index.html?item=xian-042-5008#collection","note":"四件凤鸟形镇物低重心、成组保存，鎏金工艺兼顾陈设效果与席镇功能；具体年代仍待考。"}], relationTypeIds: ['jing', 'lian', 'xingzao'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', crossMuseumRefs: ['西安博物院 · 人形铜镇 / 凤鸟铜镇', '陕西历史博物馆 · 鎏金铜虎镇'], notes: '铜镇以紧凑重量和稳定底面压席或镇物，常结合动物或人物造型；承重姿态与底面磨损可帮助区别镇物和小型雕塑。' }),
    type({ slug: 'xingzao', nameZh: '行灶', nameEn: 'PORTABLE STOVE', romanization: 'XINGZAO', categoryId: 'daily-life', shortFunction: '承锅 · 通火 · 炊用', crossMuseumObjects: [{"title":"三眼行灶","museum":"西安博物院","period":"汉代","itemId":"xian-013-4888","image":"../xian-museum/assets/photos/focus-4888.webp","href":"../xian-museum/index.html?item=xian-013-4888#collection","note":"三处灶眼、火门与承锅面组成可移动炊事结构，可同时安置多件炊器。"}], relationTypeIds: ['lu', 'yundou', 'fu-cauldron'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', crossMuseumRefs: ['西安博物院 · 三眼行灶'], notes: '行灶以火门、灶眼和承锅结构构成可移动的炊事设施。西安博物院的三眼行灶说明灶具本身应与锅釜分列。' }),
    type({ slug: 'diaodou', nameZh: '刁斗', nameEn: 'LONG-HANDLED CAMP KETTLE', romanization: 'DIAODOU', categoryId: 'daily-life', shortFunction: '炊煮 · 持柄 · 行军', relationTypeIds: ['fu-cauldron', 'yundou', 'xingzao'], sourceIds: ['NMNS-DIAODOU'], inventoryStatus: 'ADD', officialExampleLinks: ['https://www.nmns.edu.tw/ch/research/specimen/featured/Collection-000104/'] }),

    // H · Chariot / harness (non-weapon components only)
    type({ slug: 'danglu', nameZh: '当卢', nameEn: 'HORSE-FRONT ORNAMENT', romanization: 'DANGLU', categoryId: 'chariot-harness', shortFunction: '马具 · 系固 · 装饰', localBaojiGroupIds: ['photo-group-3323'], relationTypeIds: ['e-shi', 'zhou-shi'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'e-shi', nameZh: '轭饰', nameEn: 'YOKE ORNAMENT', romanization: 'ESHI', categoryId: 'chariot-harness', shortFunction: '车具 · 连接 · 装饰', localBaojiGroupIds: ['photo-group-3518'], relationTypeIds: ['danglu', 'zhou-shi'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'] }),
    type({ slug: 'zhou-shi', nameZh: '车軎', nameEn: 'AXLE-END FITTING', romanization: 'WEI', categoryId: 'chariot-harness', shortFunction: '车舆 · 套轴 · 承载', relationTypeIds: ['e-shi', 'cheyu-shi', 'chexia'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/zhou-shi-use-hero.png' }),
    type({ slug: 'cheyu-shi', nameZh: '车舆饰', nameEn: 'CHARIOT FITTING', romanization: 'CHEYUSHI', categoryId: 'chariot-harness', shortFunction: '车舆 · 固定 · 装饰', localBaojiGroupIds: ['photo-group-3515'], relationTypeIds: ['zhou-shi', 'e-shi'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/cheyu-shi-use-hero.png' }),
    type({ slug: 'xian', nameZh: '衔', nameEn: 'HORSE BIT', romanization: 'XIAN', categoryId: 'chariot-harness', shortFunction: '控御 · 连接 · 受力', relationTypeIds: ['biao', 'luanling', 'danglu'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '衔置于马口并与镳、辔相连，关节和衔环承担控御时的受力。它是马具构件，不按兵器归类。' }),
    type({ slug: 'biao', nameZh: '镳', nameEn: 'CHEEKPIECE', romanization: 'BIAO', categoryId: 'chariot-harness', shortFunction: '络马 · 连接 · 控御', relationTypeIds: ['xian', 'luanling', 'danglu'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '镳位于马颊两侧，与衔和辔带共同组成控御系统。孔位、磨损和成对关系是识别重点。' }),
    type({ slug: 'luanling', nameZh: '銮铃', nameEn: 'CHARIOT BELL', romanization: 'LUANLING', categoryId: 'chariot-harness', shortFunction: '随车 · 发声 · 仪仗', relationTypeIds: ['xian', 'danglu', 'cheyu-shi'], sourceIds: ['NMC-MUSIC'], inventoryStatus: 'ADD', notes: '銮铃安装于车马系统，随行进振动发声并参与仪仗秩序。它的装配位置和摇奏方式与礼乐钟、铃不同。' }),
    type({ slug: 'chexia', nameZh: '车辖', nameEn: 'LINCHPIN', romanization: 'CHEXIA', categoryId: 'chariot-harness', shortFunction: '固轴 · 限位 · 行车', relationTypeIds: ['zhou-shi', 'cheyu-shi', 'gaigongmao'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '车辖穿入轴端以限制车轮脱出，与车軎形成明确机械配合。孔、销和磨损方向能够检验其安装方式。' }),
    type({ slug: 'gaigongmao', nameZh: '盖弓帽', nameEn: 'CANOPY-RIB TERMINAL', romanization: 'GAIGONGMAO', categoryId: 'chariot-harness', shortFunction: '套接 · 固定 · 装饰', relationTypeIds: ['chexia', 'cheyu-shi', 'zhou-shi'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '盖弓帽套接在车盖弓端部，保护并装饰细长构件。其筒形接口与端饰决定它不是普通佩饰。' }),
    type({ slug: 'chema-paoshi', nameZh: '车马泡饰', nameEn: 'HARNESS BOSS', romanization: 'CHEMA PAOSHI', categoryId: 'chariot-harness', shortFunction: '系固 · 装饰 · 护带', localBaojiGroupIds: ['photo-group-3632'], relationTypeIds: ['danglu', 'biao', 'cheyu-shi'], sourceIds: ['NMC-RITUAL'], notes: '泡饰以隆起圆面和背部系扣安装于车马带具，兼具装饰与护带作用。背部连接结构比正面纹样更能限定其用途。' }),

    // I · Architectural bronzes
    type({ slug: 'longwen-jianfang', nameZh: '龙纹单头齿方筒形铜构件', nameEn: 'DRAGON-MOTIF ARCHITECTURAL FITTING', romanization: 'LONGWEN JIANFANG', categoryId: 'architecture', shortFunction: '套接 · 固定 · 建筑装饰', localBaojiGroupIds: ['photo-group-3669'], relationTypeIds: ['longwen-goujian'], sourceIds: ['BAOJI-OFFICIAL', 'NMC-RITUAL'], visualAsset: 'assets/types/longwen-jianfang-use-hero.png', notes: '保留建筑部件的连接与固定语义，不把纹饰本身当作器物功能。' }),
    type({ slug: 'longwen-goujian', nameZh: '龙纹铜构件', nameEn: 'DRAGON-MOTIF BRONZE FITTING', romanization: 'LONGWEN GOUJIAN', categoryId: 'architecture', shortFunction: '连接 · 固定 · 装饰', localBaojiGroupIds: ['photo-group-3672'], relationTypeIds: ['longwen-jianfang'], sourceIds: ['BAOJI-OFFICIAL', 'NMC-RITUAL'], visualAsset: 'assets/types/longwen-goujian-use-hero.png', notes: '建筑功能明确时归入构件类；对象名称和部位仍需馆方资料核对。' }),
    type({ slug: 'pushou', nameZh: '铺首', nameEn: 'DOOR ESCUTCHEON', romanization: 'PUSHOU', categoryId: 'architecture', shortFunction: '衔环 · 固定 · 门饰', relationTypeIds: ['menhuan', 'mending', 'jianzhu-shijian'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '铺首以兽面衔环或承环结构固定在门扉、棺椁等表面，连接与装饰同时发生。兽面、环座和铆接痕迹共同限定其身份。' }),
    type({ slug: 'menhuan', nameZh: '门环', nameEn: 'DOOR RING', romanization: 'MENHUAN', categoryId: 'architecture', shortFunction: '启闭 · 持握 · 门饰', relationTypeIds: ['pushou', 'mending', 'jianzhu-shijian'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '门环作为启闭和叩击构件，通过环座与门扉连接。它可与铺首组合，但圆环本身不等同于兽面铺首。' }),
    type({ slug: 'mending', nameZh: '门钉', nameEn: 'DOOR STUD', romanization: 'MENDING', categoryId: 'architecture', shortFunction: '固定 · 加固 · 门饰', relationTypeIds: ['pushou', 'menhuan', 'jianzhu-shijian'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '门钉以钉体和隆起钉帽固定、加固并组织门扉表面。成组排列属于建筑装配关系，不应当作散置小饰件。' }),
    type({ slug: 'jianzhu-shijian', nameZh: '铜制建筑饰件', nameEn: 'ARCHITECTURAL ORNAMENT', romanization: 'JIANZHU SHIJIAN', categoryId: 'architecture', shortFunction: '包护 · 固定 · 装饰', relationTypeIds: ['longwen-goujian', 'pushou', 'mending'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', notes: '铜制建筑饰件覆盖或连接梁、角、门扉等节点，孔位和包边关系反映安装方式。只有建筑部位明确的对象才进入此类。' }),

    // J · Other non-weapon bronze objects
    type({ slug: 'gaozubei', nameZh: '高足杯', nameEn: 'TALL-FOOTED CUP', romanization: 'GAOZUBEI', categoryId: 'other', shortFunction: '承饮 · 高置 · 取用', localBaojiGroupIds: ['photo-group-3190'], relationTypeIds: ['dou', 'jue', 'yu'], sourceIds: ['BAOJI-PHOTO-INDEX', 'NMC-RITUAL'], notes: '高足杯作为独立对象保留，不因高足外形自动改名为豆。' }),
    type({ slug: 'tongshi', nameZh: '铜饰件', nameEn: 'BRONZE FITTING / ORNAMENT', romanization: 'TONGSHI', categoryId: 'other', shortFunction: '装饰 · 固定 · 随身', crossMuseumObjects: [{"title":"嵌眼纹玻璃鎏金神兽形青铜饰件","museum":"西安博物院","period":"年代待考","itemId":"xian-043-5011","image":"../xian-museum/assets/photos/focus-5011.webp","href":"../xian-museum/index.html?item=xian-043-5011#collection","note":"神兽形铜饰件兼用嵌玻璃与鎏金工艺；原装位置与具体年代未定，现阶段宜按通用装配饰件理解。"}], relationTypeIds: ['daigou', 'cheyu-shi'], sourceIds: ['NMC-RITUAL'], visualAsset: 'assets/types/tongshi-use-hero.png', notes: '仅在对象功能明确而不属于建筑、车马或礼仪附属器时使用此类。' }),
    type({ slug: 'hufu', nameZh: '虎符', nameEn: 'TIGER TALLY', romanization: 'HUFU', categoryId: 'other', shortFunction: '分合 · 凭验 · 调发', crossMuseumObjects: [{"title":"齐郡太守虎符","museum":"西安博物院","period":"汉代","itemId":"xian-009-4876","image":"../xian-museum/assets/photos/focus-4876.webp","href":"../xian-museum/index.html?item=xian-009-4876#collection","note":"伏虎形符身可以分合，铭文与形制共同指向调兵凭信制度，是汉代虎符的完整器例。"},{"title":"鲁王虎符","museum":"西安博物院","period":"汉代","itemId":"xian-010-4878","image":"../xian-museum/assets/photos/focus-4878.webp","href":"../xian-museum/index.html?item=xian-010-4878#collection","note":"虎形符身用于分合验信，馆藏定名保留了它与鲁王封国之间的制度联系。"}], relationTypeIds: ['tongjie', 'tongyin', 'tongban'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', crossMuseumRefs: ['西安博物院 · 齐郡太守虎符 / 鲁王虎符'], notes: '虎符以可分合的虎形器体和铭文承担军政调发凭验，本身不是兵器；符身、合缝与文字共同构成验信条件。' }),
    type({ slug: 'tongyin', nameZh: '铜印', nameEn: 'BRONZE SEAL', romanization: 'TONGYIN', categoryId: 'other', shortFunction: '钤印 · 凭信 · 行政', relationTypeIds: ['hufu', 'tongjie', 'tongban'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', crossMuseumRefs: ['陕西历史博物馆 · 霞州指挥使铜印 / 总领军马铜印'], notes: '铜印由印面、反书印文和钮部构成文书与身份凭信，其功能依赖文字内容、佩系方式与相应制度环境。' }),
    type({ slug: 'tongbi', nameZh: '铜币', nameEn: 'BRONZE CURRENCY', romanization: 'TONGBI', categoryId: 'other', shortFunction: '交换 · 计值 · 流通', relationTypeIds: ['tongliang', 'quan', 'tongyin'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', crossMuseumRefs: ['陕西历史博物馆 · 贵霜铜币'], notes: '铜币以铸造形制、重量和文字进入交换与计值体系，单枚器物的年代与流通范围仍需结合钱文、形制和出土环境判断。' }),
    type({ slug: 'zaoxiang', nameZh: '铜造像', nameEn: 'BRONZE DEVOTIONAL IMAGE', romanization: 'TONG ZAOXIANG', categoryId: 'other', shortFunction: '造像 · 供奉 · 礼拜', crossMuseumObjects: [{"title":"鎏金西方三圣铜造像","museum":"西安博物院","period":"唐代","itemId":"xian-053-5049","image":"../xian-museum/assets/photos/focus-5049.webp","href":"../xian-museum/index.html?item=xian-053-5049#collection","note":"三尊造像构成西方三圣组合，鎏金表面与人物配置呈现唐代佛教铜造像的成组供奉方式。"},{"title":"鎏金带头光铜立佛造像","museum":"西安博物院","period":"年代待考","itemId":"xian-056-5055","image":"../xian-museum/assets/photos/focus-5055.webp","href":"../xian-museum/index.html?item=xian-056-5055#collection","note":"立佛、头光与鎏金表面构成完整礼拜形象；馆藏资料尚未明确具体年代。"}], relationTypeIds: ['tongshi', 'gaozubei', 'tongban'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', crossMuseumRefs: ['西安博物院 · 鎏金铜造像', '陕西历史博物馆 · 佛菩萨三尊铜造像'], notes: '铜造像以人物或神佛形象、台座和表面工艺进入供奉与礼拜语境。它属于铸造图像类型，不与一般铜饰件合并。' }),
    type({ slug: 'tongban', nameZh: '铜板', nameEn: 'BRONZE PLATE / PRINTING BLOCK', romanization: 'TONGBAN', categoryId: 'other', shortFunction: '刻写 · 印制 · 记录', relationTypeIds: ['tongyin', 'tongjie', 'hufu'], sourceIds: ['NMC-RITUAL'], inventoryStatus: 'ADD', crossMuseumRefs: ['陕西历史博物馆 · “交钞”铜板'], notes: '铜板若带反字、栏格或印制痕迹，可作为版具承担复制文字和图案的功能，与普通建筑包片或装饰铜片不同。' }),

    // K · Bronze weapons
    type({ slug: 'jian-weapon', nameZh: '剑', nameEn: 'SWORD', romanization: 'JIAN', categoryId: 'weapons', shortFunction: '刺击 · 劈斩 · 佩持', localBaojiGroupIds: ['photo-group-3659'], relationTypeIds: ['dao-weapon', 'mao-weapon', 'ge-weapon'], sourceIds: ['NMC-WEAPONS'] }),
    type({ slug: 'ge-weapon', nameZh: '戈', nameEn: 'DAGGER-AXE', romanization: 'GE', categoryId: 'weapons', shortFunction: '勾啄 · 横击 · 装柲', localBaojiGroupIds: ['photo-group-3694', 'photo-group-3845'], relationTypeIds: ['ji-weapon', 'mao-weapon', 'yue-weapon'], sourceIds: ['NMC-WEAPONS'] }),
    type({ slug: 'mao-weapon', nameZh: '矛', nameEn: 'SPEARHEAD', romanization: 'MAO', categoryId: 'weapons', shortFunction: '穿刺 · 装柲 · 列阵', relationTypeIds: ['ji-weapon', 'ge-weapon', 'zu-arrowhead'], sourceIds: ['NMC-WEAPONS'], inventoryStatus: 'ADD' }),
    type({ slug: 'ji-weapon', nameZh: '戟', nameEn: 'HALBERD', romanization: 'JI', categoryId: 'weapons', shortFunction: '勾刺 · 啄击 · 装柲', relationTypeIds: ['ge-weapon', 'mao-weapon', 'yue-weapon'], sourceIds: ['NMC-WEAPONS'], inventoryStatus: 'ADD', officialExampleLinks: ['https://www.chnmuseum.cn/zp/zpml/kgfjp/202110/t20211026_251849.shtml'] }),
    type({ slug: 'yue-weapon', nameZh: '钺', nameEn: 'BATTLE AXE', romanization: 'YUE', categoryId: 'weapons', shortFunction: '斩击 · 仪仗 · 装柄', relationTypeIds: ['ge-weapon', 'dao-weapon', 'ji-weapon'], sourceIds: ['NMC-WEAPONS'], inventoryStatus: 'ADD' }),
    type({ slug: 'dao-weapon', nameZh: '刀', nameEn: 'KNIFE', romanization: 'DAO', categoryId: 'weapons', shortFunction: '切割 · 劈斩 · 持握', crossMuseumObjects: [{"title":"鎏金盘蛇柄环首刀","museum":"西安博物院","period":"汉代","itemId":"xian-002-4857","image":"../xian-museum/assets/photos/featured-4857.webp","href":"../xian-museum/index.html?item=xian-002-4857#collection","note":"环首、盘蛇柄与刀身构成完整持握和劈切结构，是汉代环首刀的清楚器例。"}], relationTypeIds: ['jian-weapon', 'yue-weapon', 'ge-weapon'], sourceIds: ['NMC-WEAPONS'], inventoryStatus: 'ADD' }),
    type({ slug: 'zu-arrowhead', nameZh: '镞', nameEn: 'ARROWHEAD', romanization: 'ZU', categoryId: 'weapons', shortFunction: '穿刺 · 装杆 · 远射', relationTypeIds: ['nuji', 'mao-weapon', 'jian-weapon'], sourceIds: ['NMC-WEAPONS'], inventoryStatus: 'ADD' }),
    type({ slug: 'nuji', nameZh: '弩机', nameEn: 'CROSSBOW TRIGGER', romanization: 'NUJI', categoryId: 'weapons', shortFunction: '扣弦 · 击发 · 远射', localBaojiGroupIds: ['photo-group-3847'], relationTypeIds: ['zu-arrowhead', 'jian-weapon', 'mao-weapon'], sourceIds: ['NMC-WEAPONS'], officialExampleLinks: ['https://www.chnmuseum.cn/zp/zpml/kgfjp/202110/t20211027_251877.shtml'] }),
  ];

  root.BAOJI_BRONZE_ATLAS = {
    version: '2.0.0',
    categories,
    types,
    sources: sourceCatalog,
    weaponTerms: [],
    counts: {
      categories: categories.length,
      canonicalNonWeaponTypes: types.filter((item) => item.canonical).length,
      canonicalBronzeTypes: types.filter((item) => item.canonical && item.materialClass === 'bronze').length,
      adjacentNonBronzeTypes: types.filter((item) => item.canonical && item.materialClass !== 'bronze').length,
      localBaojiTypes: types.filter((item) => item.localBaojiGroupIds.length).length,
      externalAuthorityOnlyTypes: types.filter((item) => !item.localBaojiGroupIds.length).length,
      weaponTypesIncluded: types.filter((item) => item.categoryId === 'weapons').length
    }
  };
})(window);
