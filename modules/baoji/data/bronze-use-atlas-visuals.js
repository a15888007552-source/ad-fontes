/* Baoji Bronze Use Atlas · canonical visual identity and scene placement. */
(function (root) {
  'use strict';

  const atlas = root.BAOJI_BRONZE_ATLAS;
  if (!atlas) return;

  const photoBacked = new Set([
    'ding', 'li', 'yan', 'gui', 'yu', 'jue', 'gu', 'zhi', 'zun', 'you', 'hu', 'pan',
    'he', 'dou-measure', 'zhong', 'bianzhong', 'bo', 'jin', 'bi', 'jing', 'deng',
    'danglu', 'e-shi', 'gaozubei'
  ]);

  const contextHeroTypes = new Set([
    'ding', 'li', 'yan', 'gui', 'dou', 'yu', 'jue', 'gu', 'zhi', 'zun', 'you', 'hu', 'pan', 'he', 'jia',
    'fangyi', 'fang-wine', 'zhong-wine', 'biannao', 'diaodou', 'ji-weapon', 'ge-weapon', 'yue-weapon',
    'mao-weapon', 'jian-weapon', 'dao-weapon', 'nuji', 'zu-arrowhead'
  ]);

  const shapeSpecs = {
    ding: ['tripod-cooking-vessel', '双耳、深腹、三足或方体四足'],
    li: ['lobed-tripod-cooking-vessel', '袋足或分裆三足，火焰可进入足间'],
    yan: ['compound-steamer', '上甑下鬲或釜，箅孔分隔上下器体'],
    zeng: ['perforated-steamer-bowl', '有箅孔的上层蒸器，不带下部受火器'],
    fu: ['rectangular-lidded-food-vessel', '方形盖身、斜壁与短足'],
    xu: ['rounded-rectangular-lidded-food-vessel', '圆角长方腹、上下合盖'],
    dun: ['globular-covered-food-vessel', '圆腹或近球形，上下合盖，整体浑圆'],
    dou: ['stemmed-food-dish', '浅盘、高柄、圈足'],
    fangyi: ['square-lidded-wine-vessel', '方形高体、屋顶形盖、圈足'],
    zhi: ['oval-wine-cup', '椭圆或圆腹小型饮酒器'],
    'zhi-cup': ['cylindrical-handled-cup', '筒形杯身、鋬与低足'],
    'fang-wine': ['square-section-wine-vessel', '方口、方颈、方腹、圈足与铺首衔环'],
    'zhong-wine': ['globular-zhong-wine-vessel', '侈口、束颈、广肩、鼓腹、圈足与双环'],
    he: ['lidded-spouted-water-vessel', '盖、流、鋬与足部围绕倾注组织'],
    yi: ['open-spouted-pouring-vessel', '敞口浅腹、前流后鋬'],
    ying: ['lidded-water-pouring-vessel', '有盖圆腹水器，流与鋬配合'],
    'dou-measure': ['handled-measuring-scoop', '斗腔与长柄构成量取工具'],
    fangsheng: ['rectangular-handled-measure', '方形容腔与直柄'],
    quan: ['looped-calibration-weight', '紧凑砝码体与顶部系环'],
    zhong: ['suspended-yong-bell', '甬部、枚、鼓部与弧形口沿'],
    bianzhong: ['graduated-zhong-ensemble', '多件甬钟按尺寸与音列编悬'],
    bo: ['flat-bottomed-bo-bell', '钮悬、平口大型镈钟'],
    bianbo: ['graduated-bo-ensemble', '多件平口镈按音列编悬'],
    nao: ['upright-handled-nao', '器口朝上、柄部向下的铙'],
    zheng: ['slender-suspended-zheng', '细长钟体与悬挂构件'],
    duo: ['handled-clapper-bell', '宽口钟体、短柄与内舌'],
    ling: ['small-jingle-bell', '小型中空铃体与内舌'],
    chenyu: ['barrel-shaped-chunyu', '上钮下口、桶形中空器体'],
    judiao: ['long-handled-goudiao', '细长柄部与下张器口'],
    tonggu: ['cast-bronze-drum', '宽阔鼓面与桶形中空鼓身'],
    qing: ['l-shaped-stone-chime', '曲折片状石或玉质磬体'],
    bianqing: ['graduated-stone-chime-ensemble', '多件石或玉磬按音列编悬'],
    biannao: ['graduated-upright-nao-set', '多件器口朝上、柄部向下的铙按音列编排'],
    jin: ['openwork-vessel-platform', '平面承托台与镂空支撑'],
    'dou-ladle': ['long-handled-wine-ladle', '小斗腔与长柄'],
    zu: ['low-ritual-butcher-stand', '低矮案面或框架与短足'],
    an: ['low-serving-table', '平整案面与低足'],
    qizuo: ['openwork-vessel-support', '承口与镂空支座'],
    jing: ['round-bronze-mirror', '圆形照面、背钮与纹饰区'],
    deng: ['raised-lamp', '灯盘、支柱与足座'],
    lian: ['cylindrical-lidded-cosmetic-box', '圆筒形盖身与短足'],
    'he-box': ['low-round-lidded-box', '低矮圆盒与严密盖合'],
    daigou: ['belt-hook', '钩首、弓形钩体与背钮'],
    tongjie: ['inscribed-tally', '可佩持的节形凭验器'],
    louhu: ['outlet-clepsydra', '储水器身、刻度与低位出水口'],
    yundou: ['long-handled-heating-pan', '浅盘承热部与长柄'],
    zhen: ['compact-domestic-weight', '稳定底面与紧凑动物或人物造型'],
    xingzao: ['portable-multiple-burner-stove', '灶眼、火门与便携灶体'],
    diaodou: ['long-handled-tripod-camp-kettle', '小型圆腹、兽足或三足与长柄'],
    xian: ['jointed-horse-bit', '关节衔体与两端衔环'],
    biao: ['paired-cheekpieces', '成对长条镳体与系孔'],
    luanling: ['stemmed-chariot-jingle', '铃体、内舌与安装柄'],
    chexia: ['axle-linchpin', '穿轴销体与限位端头'],
    'zhou-shi': ['socketed-axle-end-fitting', '套接筒体与轴端装饰面'],
    gaigongmao: ['tubular-canopy-terminal', '细长套筒与端饰'],
    'chema-paoshi': ['domed-harness-boss', '隆起泡面与背部系扣'],
    pushou: ['animal-mask-ring-escutcheon', '兽面衔环与固定铆位'],
    menhuan: ['architectural-door-ring', '重环与独立环座'],
    mending: ['hemispherical-door-stud', '隆起钉帽与后部钉体'],
    'jianzhu-shijian': ['architectural-cladding-fitting', '包边、连接孔与装饰面'],
    hufu: ['split-tiger-tally', '虎形器体可沿中线分合'],
    tongyin: ['square-bronze-seal', '印面、钮部与佩系孔'],
    tongbi: ['bronze-currency-system', '铸币形制、孔位与重量体系'],
    zaoxiang: ['cast-devotional-image', '人物或神佛造像与台座'],
    tongban: ['flat-printing-or-recording-plate', '平整版面、版框与反字结构']
    ,'jian-weapon': ['double-edged-bronze-sword', '双刃剑身、脊、格与茎部']
    ,'ge-weapon': ['bronze-dagger-axe', '横向援、长胡、内与穿孔']
    ,'mao-weapon': ['socketed-bronze-spearhead', '双刃叶形锋部与中空銎']
    ,'ji-weapon': ['combined-ge-mao-halberd', '矛锋与横向戈援组合成十字形']
    ,'yue-weapon': ['broad-ceremonial-battle-axe', '宽阔弧刃、阑与装柄孔']
    ,'dao-weapon': ['single-edged-bronze-knife', '单刃弧形刀身与短柄']
    ,'zu-arrowhead': ['socketed-bronze-arrowheads', '小型三棱或双翼锋体与铤或銎']
    ,nuji: ['bronze-crossbow-trigger', '悬刀、牙、望山与机郭组合']
  };

  const categoryFallback = {
    'food-cooking': ['food-or-cooking-vessel', '口、腹、盖、耳与足部构成食器或炊器轮廓'],
    wine: ['wine-vessel', '口颈、器腹、流鋬或提梁构成酒器轮廓'],
    'water-pouring': ['water-vessel', '盛、注、承或洗相关的口腹与持握结构'],
    measures: ['measuring-object', '容量、重量或校准结构'],
    music: ['sound-producing-object', '器体、悬挂或持握与击奏结构'],
    'ritual-accessories': ['ritual-accessory', '承置、取用或奉持结构'],
    'daily-life': ['domestic-object', '日常持握、受热、照明或收纳结构'],
    'chariot-harness': ['chariot-or-harness-fitting', '车马系统中的连接、受力或装饰结构'],
    architecture: ['architectural-bronze-fitting', '建筑节点的套接、固定或装饰结构'],
    other: ['bronze-object', '明确的器用结构'],
    weapons: ['bronze-weapon', '刃、援、胡、銎、柄部或机括构成兵器轮廓']
  };

  function cardHeroAsset(type, category, canonicalAsset) {
    if (contextHeroTypes.has(type.id)) return `assets/context/${type.id}/${type.id}-section-form.png`;
    return type.visualAssetSet?.hero
      || type.visualAssetOverride
      || (type.visualAsset !== category.background ? type.visualAsset : '')
      || canonicalAsset;
  }

  const sceneLayouts = {
    'food-cooking': {
      yan: [47, 22, 10, 30], fu: [60, 22, 12, 24], xu: [73, 22, 11, 24], dun: [87, 22, 12, 26],
      ding: [39, 50, 13, 29], li: [51, 50, 11, 28], gui: [64, 50, 13, 26], yu: [76, 51, 12, 24], pen: [89, 51, 14, 27],
      dou: [36, 73, 10, 27], 'fu-metal': [54, 73, 15, 26], 'fu-cauldron': [71, 73, 15, 29], zeng: [88, 73, 13, 28]
    },
    wine: {
      jue: [34, 21, 9, 31], jiao: [45, 21, 9, 31], gu: [58, 21, 8, 31], zhi: [66, 22, 7, 22], jia: [77, 21, 10, 31], zun: [91, 21, 10, 31],
      you: [35, 50, 11, 29], lei: [49, 50, 13, 31], hu: [64, 50, 11, 31], gong: [77, 50, 11, 31], fangyi: [91, 50, 11, 31],
      bu: [33, 81, 11, 28], fou: [47, 81, 13, 29], 'zhi-cup': [61, 81, 11, 27], 'fang-wine': [76, 80, 11, 31], 'zhong-wine': [91, 80, 11, 31]
    },
    'water-pouring': {
      pan: [43, 35, 18, 24], yi: [67, 35, 18, 27], he: [89, 34, 17, 31],
      'jian-water': [45, 74, 22, 31], xi: [69, 75, 18, 23], ying: [90, 74, 17, 32]
    },
    measures: {
      sheng: [36, 33, 12, 27], 'dou-measure': [52, 34, 13, 25], 'hu-measure': [74, 33, 17, 34], liang: [91, 34, 13, 27],
      tongliang: [45, 72, 19, 34], fangsheng: [74, 72, 22, 28], quan: [92, 73, 10, 25]
    },
    music: {
      bianzhong: [33, 19, 18, 27], bianbo: [54, 18, 24, 28], biannao: [72, 19, 13, 28], bianqing: [88, 19, 18, 28],
      zhong: [36, 50, 10, 27], bo: [48, 50, 11, 29], nao: [60, 50, 9, 27], qing: [72, 50, 10, 28], tonggu: [88, 50, 17, 29],
      zheng: [34, 79, 10, 28], duo: [47, 79, 11, 28], ling: [56, 80, 8, 22], chenyu: [69, 79, 12, 27], judiao: [84, 79, 10, 29]
    },
    'ritual-accessories': {
      jin: [42, 38, 17, 23], 'dou-ladle': [59, 37, 14, 30], shao: [74, 38, 13, 27], bi: [90, 38, 12, 24],
      zan: [31, 74, 15, 28], zu: [47, 74, 17, 25], an: [68, 74, 22, 24], qizuo: [90, 73, 14, 28]
    },
    'daily-life': {
      jing: [32, 37, 14, 29], deng: [45, 37, 12, 31], lu: [56, 37, 13, 29], xunlu: [68, 37, 13, 29], lian: [80, 37, 11, 28], 'he-box': [91, 38, 12, 23],
      daigou: [17, 76, 9, 22], tongjie: [24, 76, 8, 23], louhu: [35, 75, 13, 32], yundou: [49, 76, 16, 24], diaodou: [64, 76, 15, 25], zhen: [76, 77, 10, 22], xingzao: [90, 75, 19, 29]
    },
    'chariot-harness': {
      danglu: [32, 35, 9, 31], 'e-shi': [42, 35, 12, 29], 'zhou-shi': [56, 35, 12, 25], 'cheyu-shi': [68, 35, 12, 25], xian: [86, 36, 18, 22],
      biao: [33, 74, 12, 31], luanling: [45, 74, 10, 28], chexia: [60, 74, 13, 24], gaigongmao: [73, 74, 10, 30], 'chema-paoshi': [89, 74, 14, 25]
    },
    architecture: {
      'longwen-jianfang': [45, 35, 17, 24], 'longwen-goujian': [63, 35, 16, 24], pushou: [82, 35, 17, 31],
      menhuan: [45, 70, 17, 29], mending: [63, 69, 14, 25], 'jianzhu-shijian': [82, 70, 15, 30]
    },
    other: {
      gaozubei: [43, 34, 12, 31], tongshi: [55, 34, 11, 26], hufu: [68, 34, 15, 28], tongyin: [88, 34, 15, 27],
      tongbi: [45, 73, 17, 26], zaoxiang: [62, 72, 13, 31], tongban: [84, 72, 24, 28]
    },
    weapons: {
      'ji-weapon': [47, 24, 12, 31], 'ge-weapon': [61, 24, 12, 31], 'yue-weapon': [76, 25, 13, 31], 'mao-weapon': [88, 24, 9, 31],
      'jian-weapon': [46, 72, 10, 37], 'dao-weapon': [57, 72, 10, 34], nuji: [72, 72, 17, 27], 'zu-arrowhead': [90, 73, 13, 27]
    }
  };

  function scenePlacement(index, total) {
    const rows = total > 7 ? 2 : 1;
    const columns = Math.ceil(total / rows);
    const row = Math.floor(index / columns);
    const column = index % columns;
    const countInRow = row === rows - 1 ? total - columns * row : columns;
    const x = countInRow === 1 ? 50 : 9 + (82 * column / (countInRow - 1));
    const y = rows === 1 ? 65 : (row === 0 ? 43 : 76);
    const width = Math.min(rows === 1 ? 18 : 13.5, 82 / Math.max(countInRow, 1) + 2.2);
    return { x: Number(x.toFixed(2)), y, width: Number(width.toFixed(2)), z: row + 2 };
  }

  const records = [];
  const scenes = {};
  atlas.categories.forEach((category) => {
    const types = atlas.types.filter((type) => type.displayInAtlas && type.categoryId === category.id);
    const sceneLayout = sceneLayouts[category.id] || null;
    scenes[category.id] = {
      categoryId: category.id,
      atmosphere: `atmosphere-${category.theme}`,
      backgroundContainsObjects: Boolean(sceneLayout),
      objectTypeIds: types.map((type) => type.id)
    };
    types.forEach((type, index) => {
      const [shapeClass, canonicalForm] = shapeSpecs[type.id] || categoryFallback[type.categoryId];
      const extension = photoBacked.has(type.id) ? 'jpg' : 'png';
      const asset = `assets/canonical/${type.id}.${extension}`;
      const position = scenePlacement(index, types.length);
      const rect = sceneLayout?.[type.id] || null;
      const framing = photoBacked.has(type.id) ? 'photo' : (type.inventoryStatus === 'EXISTING' ? 'legacy-right' : 'isolated');
      records.push({
        typeId: type.id,
        nameZh: type.nameZh,
        asset,
        cardHeroAsset: cardHeroAsset(type, category, asset),
        material: type.materialClass,
        materialClass: type.materialClass,
        shapeClass,
        canonicalForm,
        sourceRefs: [...type.sourceIds, ...type.crossMuseumRefs],
        categoryId: type.categoryId,
        scenePosition: { x: position.x, y: position.y },
        sceneScale: position.width,
        sceneRect: rect ? { x: rect[0], y: rect[1], width: rect[2], height: rect[3] } : null,
        sceneZIndex: position.z,
        framing,
        displayInAtlas: true,
        verified: true
      });
    });
  });

  root.BAOJI_BRONZE_ATLAS_VISUALS = {
    version: '2.0.0',
    records,
    scenes,
    debugQuery: 'atlasDebug',
    counts: {
      displayTypes: records.length,
      bronzeTypes: records.filter((record) => record.materialClass === 'bronze').length,
      adjacentMaterialTypes: records.filter((record) => record.materialClass !== 'bronze').length
    }
  };
})(window);
