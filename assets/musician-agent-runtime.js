(function () {
  "use strict";

  const evidenceByPerson = window.MUSICIAN_AGENT_EVIDENCE || {};
  const workPaths = Array.isArray(window.ANNALES_WORK_PATHS) ? window.ANNALES_WORK_PATHS : [];
  const questionTracks = {
    aesthetics: new Set(["aesthetics-and-poetics", "reception-and-scholarship"]),
    letters: new Set(["letters-and-self-presentation"]),
    biography: new Set(["biography", "letters-and-self-presentation"]),
    recording: new Set(["performance-and-recordings"]),
    works: new Set(["works-and-versions", "letters-and-self-presentation", "performance-and-recordings"]),
    rights: new Set(["rights-and-access"]),
    overview: null
  };

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("zh-CN").replace(/[\s·—–_，。、《》“”'"()（）:：]/g, "");
  }

  function questionKind(query) {
    const q = normalize(query);
    if (/美学|思想|主义|观念|古典|理论|形式|和声|十二音|印象|民族/.test(q)) return "aesthetics";
    if (/书信|通信|自述|档案|来往/.test(q)) return "letters";
    if (/生平|经历|传记|出生|时期|性格|人格|心理|气质|为人|个性|人物|personality|character|temperament|psychology|biograph/.test(q)) return "biography";
    if (/权利|版权|许可|授权|公版|公共版权|开放|托管|再利用|下载条件|地域|法域|rights|copyright|licen[cs]e|publicdomain|openaccess/.test(q)) return "rights";
    if (/版本|修订|校样|作品|乐谱|总谱|谱本|声乐谱|钢琴谱|手稿|亲笔稿|原稿|展映|首演|分谱|首版|出版|版本史|时间线|馆藏号|目录号|对象|候选|比较|对照|差异|区别|异同|分别能证明|能证明|score|premiere|manuscript|firstedition|catalogue|[ed]\d{7}|#\d{4,6}|eb\d{3,}|partb\d+/.test(q)) return "works";
    if (/录音|唱片|播放|phonograph|recording/.test(q)) return "recording";
    if (/演奏|performance/.test(q)) return "works";
    return "overview";
  }

  const retrievalGenericTerms = new Set([
    "布索尼", "德彪西", "勋伯格", "马勒", "斯特拉文斯基", "德沃夏克", "贝多芬", "busoni", "debussy", "schoenberg", "mahler", "stravinsky", "dvorak", "beethoven", "igmg", "l17",
    "美学", "思想", "美学思想", "美学思想与作品版本", "主义", "观念", "古典", "理论", "形式", "和声", "印象", "民族", "书信", "通信", "书信和自述", "自述", "档案", "来往", "生平", "生平与性格", "经历", "传记", "出生", "时期", "性格", "人格", "心理", "气质", "为人", "个性", "人物", "权利", "版权", "版权与公开许可", "公开许可", "许可", "授权", "公版", "公共版权", "开放", "托管", "再利用", "下载条件", "地域", "法域", "版本", "作品版本", "修订", "校样", "作品", "作品和版本", "手稿", "乐谱", "总谱", "谱本", "声乐谱", "钢琴谱", "演奏", "首演", "录音", "播放", "著作", "研究", "比较", "对照", "差异", "区别", "异同", "比较一下", "比较哪些", "simrock", "victor", "gmw", "score", "partitur", "recording", "work", "id", "cary", "rights", "copyright", "license", "publicdomain", "openaccess", "personality", "character", "temperament", "psychology", "biography"
  ]);

  const retrievalAliases = Object.freeze({
    "阿莱基诺": ["阿尔莱基诺", "arlecchino"],
    "阿尔莱基诺": ["阿莱基诺", "arlecchino"],
    "arlecchino": ["阿莱基诺", "阿尔莱基诺"],
    "布索尼小提琴协奏曲": ["Konzert für die Violine mit Orchester", "Violin Concerto in D major", "Op.35a", "K 243", "BV 243", "E0400469", "GND 300338821", "1897-10-08", "Berliner Sing-Akademie", "Henri Petri", "Part.B.1407", "178701", "Sibley 1802/18915", "CHSA 5333", "Francesca Dego", "Dalia Stasevska"],
    "op35a": ["布索尼小提琴协奏曲", "Konzert für die Violine mit Orchester", "K 243", "BV 243", "E0400469", "178701", "Part.B.1407", "CHSA 5333"],
    "k243": ["布索尼小提琴协奏曲", "Violin Concerto in D major", "Op.35a", "BV 243", "E0400469", "178701", "CHSA 5333"],
    "bv243": ["布索尼小提琴协奏曲", "Violin Concerto in D major", "Op.35a", "K 243", "E0400469", "178701", "CHSA 5333"],
    "e0400469": ["布索尼小提琴协奏曲", "Konzert für die Violine mit Orchester", "Op.35a", "K 243", "BV 243", "GND 300338821", "1897-10-08"],
    "178701": ["布索尼小提琴协奏曲", "Violin Concerto in D major", "Op.35a", "K 243", "Part.B.1407", "Sibley 1802/18915", "1913 reprint"],
    "chsa5333": ["布索尼小提琴协奏曲", "Violin Concerto in D major", "Op.35a", "K 243", "Francesca Dego", "Dalia Stasevska", "BBC Symphony Orchestra", "2023-07-04", "2023-07-05"],
    "180218915": ["布索尼小提琴协奏曲", "Op.35a", "K 243", "Part.B.1407", "178701", "Sibley"],
    "对位幻想曲": ["Fantasia contrappuntistica", "Edizione definitiva", "Edizione minore", "K 256", "K 256a", "K 256b", "E0400018", "E0400395", "D0100553", "V.A.3491", "V.A.3829", "EB 5196", "240168", "FRBNF41011337", "Viktoria Postnikova", "Frederick Stock"],
    "fantasia contrappuntistica": ["对位幻想曲", "Edizione definitiva", "Edizione minore", "K 256", "K 256a", "K 256b", "E0400018", "E0400395", "D0100553", "V.A.3491", "V.A.3829", "EB 5196", "240168", "FRBNF41011337", "Viktoria Postnikova", "Frederick Stock"],
    "k256": ["对位幻想曲", "Fantasia contrappuntistica", "Edizione definitiva", "E0400018", "V.A.3491", "FRBNF46641557", "Viktoria Postnikova", "FRBNF41011337"],
    "k256a": ["对位幻想曲", "Fantasia contrappuntistica", "Edizione minore", "E0400395", "V.A.3829", "240168", "Sibley 1802/15904"],
    "k256b": ["对位幻想曲", "Fantasia contrappuntistica", "Ausgabe für 2 Klaviere", "EB 5196", "plate 28713", "FRBNF42884968"],
    "240168": ["对位幻想曲", "Fantasia contrappuntistica", "Edizione minore", "K 256a", "V.A.3829", "Sibley 1802/15904", "Coulonnus", "US-R"],
    "frbnf41011337": ["对位幻想曲", "Fantasia contrappuntistica", "K 256", "Viktoria Postnikova", "Studio 103", "Radio France", "Erato 2292454782", "2564 64390-2"],
    "e0400018": ["对位幻想曲", "Fantasia contrappuntistica", "Edizione definitiva", "K 256", "GND 300858655", "V.A.3491"],
    "e0400395": ["对位幻想曲", "Fantasia contrappuntistica", "Edizione minore", "K 256a", "GND 300241879", "V.A.3829", "240168"],
    "d0100553": ["对位幻想曲", "Fantasia contrappuntistica", "Robert Freund", "Edizione minore", "1912-10-25"],
    "随想曲": ["Capriccio", "Capriccio for Piano and Orchestra", "K050", "IIS 82", "50-1", "50-2", "50-3", "R.M.V. 470", "R.M.V. 502", "756428", "50-4", "50-5", "50-6", "B. & H. 16990", "H.P.S. 610", "WLX1353", "six-side plan", "1949 修订"],
    "capriccio": ["随想曲", "Capriccio for Piano and Orchestra", "K050", "IIS 82", "50-1", "50-2", "50-3", "R.M.V. 470", "R.M.V. 502", "756428", "50-4", "50-5", "50-6", "B. & H. 16990", "H.P.S. 610", "WLX1353", "six-side plan", "1949 修订"],
    "k050": ["随想曲", "Capriccio", "Capriccio for Piano and Orchestra", "IIS 82", "50-1", "50-2", "50-3", "R.M.V. 470", "R.M.V. 502", "756428", "50-4", "50-5", "50-6", "B. & H. 16990", "H.P.S. 610", "WLX1353"],
    "756428": ["随想曲", "Capriccio", "Capriccio for Piano and Orchestra", "K050", "IIS 82", "50-3", "R.M.V. 502", "Madcapellan"],
    "rmv470": ["随想曲", "Capriccio", "K050", "50-1", "50-2", "R.M.V. 470", "Exemplaire corrigé"],
    "rmv502": ["随想曲", "Capriccio", "K050", "50-3", "R.M.V. 502", "756428", "155 errors"],
    "bh16990": ["随想曲", "Capriccio", "K050", "50-4", "B. & H. 16990", "1952"],
    "hps610": ["随想曲", "Capriccio", "K050", "50-5", "H.P.S. 610", "1952"],
    "wlx1353": ["随想曲", "Capriccio", "K050", "1930-05-08", "1930-05-10", "six-side plan", "Ansermet", "Straram"],
    "春之祭": ["The Rite of Spring", "Le Sacre du printemps", "K015", "W 21", "MS-20648", "MS-20644", "M1523.S92 S2", "FRBNF39684784", "15-1", "15-5", "15-15", "R.M.V. 196", "R.M.V. 197", "R.M.V. 197b", "FRBNF43287612", "858822", "B. & H. 16333", "H.P.S. 638", "1928-06-27", "1940-04-19", "1960-01-05", "FRBNF48516607"],
    "the rite of spring": ["春之祭", "Le Sacre du printemps", "K015", "MS-20648", "MS-20644", "M1523.S92 S2", "FRBNF39684784", "15-1", "15-5", "15-15", "FRBNF43287612", "858822", "FRBNF48516607"],
    "le sacre du printemps": ["春之祭", "The Rite of Spring", "K015", "MS-20648", "MS-20644", "M1523.S92 S2", "FRBNF39684784", "15-1", "15-5", "15-15", "FRBNF43287612", "858822", "FRBNF48516607"],
    "k015": ["春之祭", "The Rite of Spring", "Le Sacre du printemps", "W 21", "MS-20648", "MS-20644", "15-1", "15-2", "15-3", "15-4", "15-5", "15-6", "15-13", "15-14", "15-15", "R.M.V. 196", "R.M.V. 197", "R.M.V. 197b", "FRBNF43287612", "858822", "B. & H. 16333", "H.P.S. 638"],
    "ms20648": ["春之祭", "The Rite of Spring", "Le Sacre du printemps", "K015", "FRBNF42661447", "自笔草稿", "seven notebooks", "150 pages"],
    "ms20644": ["春之祭", "The Rite of Spring", "Le Sacre du printemps", "K015", "FRBNF42663730", "Part I", "Introduction", "46 pages"],
    "frbnf42661447": ["春之祭", "The Rite of Spring", "K015", "MS-20648", "自笔草稿"],
    "frbnf42663730": ["春之祭", "The Rite of Spring", "K015", "MS-20644", "Part I", "Introduction"],
    "frbnf39684784": ["春之祭", "The Rite of Spring", "K015", "1913-05-29", "Théâtre des Champs-Élysées", "Nijinsky", "Piltz", "Monteux"],
    "frbnf43287612": ["春之祭", "The Rite of Spring", "K015", "1921", "139 pages", "F. H. Schneider", "IFN-10862562", "R.M.V. 197", "R.M.V. 197b", "858822"],
    "rmv196": ["春之祭", "The Rite of Spring", "K015", "15-1", "15-2", "R.M.V. 196", "four-hand reduction"],
    "rmv197": ["春之祭", "The Rite of Spring", "K015", "15-3", "15-4", "15-5", "15-6", "R.M.V. 197", "R.M.V. 197b", "FRBNF43287612", "858822"],
    "bh16333": ["春之祭", "The Rite of Spring", "K015", "15-14", "15-15", "B. & H. 16333", "H.P.S. 638", "1948"],
    "hps638": ["春之祭", "The Rite of Spring", "K015", "15-14", "B. & H. 16333", "H.P.S. 638", "1948"],
    "火鸟": ["The Firebird", "L'Oiseau de feu", "L'oiseau de feu", "Жар-птица", "Zhar-ptitsa", "K010", "IIS 10", "524046", "plate 34920", "FRBNF40148407", "FRBNF13919969", "Victrola 6492", "Victrola 6493", "b16732448", "1919 组曲"],
    "the firebird": ["火鸟", "L'Oiseau de feu", "Жар-птица", "Zhar-ptitsa", "K010", "IIS 10", "524046", "FRBNF40148407", "Victrola 6492", "b16732448"],
    "l'oiseau de feu": ["火鸟", "The Firebird", "Жар-птица", "Zhar-ptitsa", "K010", "IIS 10", "524046", "FRBNF40148407", "Victrola 6492", "b16732448"],
    "жар-птица": ["火鸟", "The Firebird", "L'Oiseau de feu", "Zhar-ptitsa", "K010", "IIS 10", "524046", "FRBNF40148407", "Victrola 6492", "b16732448"],
    "k010": ["火鸟", "The Firebird", "L'Oiseau de feu", "Жар-птица", "IIS 10", "524046", "plate 34920", "Victrola 6492", "Victrola 6493"],
    "524046": ["火鸟", "The Firebird", "L'Oiseau de feu", "K010", "IIS 10", "P. Jurgenson", "plate 34920", "US-R", "Sibley"],
    "b16732448": ["火鸟", "The Firebird", "1919 组曲", "Victrola 6492", "Victrola 6493", "Stokowski", "Philadelphia Symphony Orchestra", "1924-10-13", "1924-12-08"],
    "诗篇交响曲": ["Symphony of Psalms", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "cb383859428", "Columbia album 162", "LFX 179", "LFX 181", "LX 1500", "LX 1505"],
    "symphony of psalms": ["诗篇交响曲", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "cb383859428", "Columbia album 162", "LFX 179", "LFX 181", "LX 1500", "LX 1505"],
    "symphonie de psaumes": ["诗篇交响曲", "Symphony of Psalms", "K052", "IIS 71", "W 60", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "cb383859428", "Columbia album 162", "LFX 179", "LFX 181", "LX 1500", "LX 1505"],
    "k052": ["诗篇交响曲", "Symphony of Psalms", "Symphonie de Psaumes", "IIS 71", "W 60", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "cb383859428", "Columbia album 162", "LFX 179", "LFX 181", "LX 1500", "LX 1505"],
    "907486": ["诗篇交响曲", "Symphony of Psalms", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "cb383859428", "Columbia album 162", "LFX 179", "LFX 181", "LX 1500", "LX 1505"],
    "frbnf38385942": ["诗篇交响曲", "Symphony of Psalms", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "cb383859428", "Columbia album 162", "LFX 179", "LFX 181", "LX 1500", "LX 1505"],
    "cb383859428": ["诗篇交响曲", "Symphony of Psalms", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "Columbia album 162", "LFX 179", "LFX 181", "LX 1500", "LX 1505"],
    "lfx179": ["诗篇交响曲", "Symphony of Psalms", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "cb383859428", "Columbia album 162", "LFX 181", "LX 1500", "LX 1505"],
    "lx1500": ["诗篇交响曲", "Symphony of Psalms", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "cb383859428", "Columbia album 162", "LFX 179", "LFX 181", "LX 1505"],
    "贝多芬第九交响曲": ["Symphony No. 9 in D minor", "Beethoven Ninth", "Op.125", "1824-05-07", "Kärntnertortheater", "Mus.ms.autogr. Beethoven, L. v. 35, 78a", "Mus.ms.autogr. Beethoven, L. v. 2", "Artaria 204", "PPN756658373", "HCB Mh 2", "HCB Mh 28", "HCB C Md 6", "Beeth.MS. 43", "46254", "FRBNF38127570"],
    "beethoven ninth": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Op.125", "Kärntnertortheater", "Artaria 204", "PPN756658373", "HCB Mh 2", "HCB Mh 28", "HCB C Md 6", "46254", "FRBNF38127570"],
    "第九交响曲op125": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Beethoven Ninth", "Kärntnertortheater", "Mus.ms.autogr. Beethoven, L. v. 2", "Artaria 204", "PPN756658373", "HCB Mh 2", "HCB Mh 28", "HCB C Md 6", "46254", "FRBNF38127570"],
    "op125": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Beethoven Ninth", "1824-05-07", "Kärntnertortheater", "Mus.ms.autogr. Beethoven, L. v. 2", "Artaria 204", "PPN756658373", "HCB Mh 2", "HCB Mh 28", "HCB C Md 6", "46254", "FRBNF38127570"],
    "ppn756658373": ["Mus.ms.autogr. Beethoven, L. v. 2", "Artaria 204", "工作总谱", "分散手稿"],
    "artaria204": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Op.125", "PPN756658373", "Mus.ms.autogr. Beethoven, L. v. 2", "工作总谱", "分散手稿"],
    "hcbmh2": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Op.125", "HCB BMh 5/45", "第二乐章尾声", "Peter Gläser"],
    "hcbmh28": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Op.125", "长号声部", "1824"],
    "hcbcmd6": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Op.125", "Schott", "plate 2322", "1826", "46254"],
    "46254": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Op.125", "HCB C Md 6", "Schott", "plate 2322", "1826", "D-BNba"],
    "frbnf38127570": ["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Op.125", "Leonard Bernstein", "New York Philharmonic", "MK42224", "NUMAV-524518", "SDC 12-4730"],
    "自新大陆": ["第九交响曲", "Symphony No.9", "Op.95", "new world"],
    "new world": ["自新大陆", "第九交响曲", "Symphony No.9", "Op.95"],
    "狂欢节序曲": ["Karneval", "Carneval", "Carnival Overture", "Op.92", "B169", "B 169", "Nature, Life and Love", "Life (Czech Carnival)", "Op.91", "231804", "plate 10103", "Sibley", "1802/18497", "18063", "M1004 .D98C", "39087011183193score.pdf", "ME 9705", "1935", "November 1935", "8.111331", "0747313333127"],
    "karneval": ["狂欢节序曲", "Carneval", "Carnival Overture", "Op.92", "B169", "B 169", "Nature, Life and Love", "Life (Czech Carnival)", "231804", "plate 10103", "Sibley", "1802/18497", "18063", "39087011183193score.pdf", "ME 9705", "1935", "8.111331"],
    "carneval": ["狂欢节序曲", "Karneval", "Carnival Overture", "Op.92", "B169", "B 169", "Nature, Life and Love", "Life (Czech Carnival)", "231804", "plate 10103", "Sibley", "1802/18497", "18063", "39087011183193score.pdf", "ME 9705", "1935", "8.111331"],
    "carnival overture": ["狂欢节序曲", "Karneval", "Carneval", "Op.92", "B169", "B 169", "Nature, Life and Love", "Life (Czech Carnival)", "231804", "plate 10103", "Sibley", "1802/18497", "18063", "39087011183193score.pdf", "ME 9705", "1935", "8.111331"],
    "231804": ["狂欢节序曲", "Karneval", "Carneval", "Carnival Overture", "Op.92", "B 169", "plate 10103", "C.G. Röder", "Sibley", "US-R", "1802/18497", "18063", "M1004 .D98C", "39087011183193score.pdf"],
    "1802/18497": ["狂欢节序曲", "Carneval", "Carnival Overture", "Op.92", "B 169", "231804", "plate 10103", "Sibley", "institutionalItemId 18063", "M1004 .D98C", "39087011183193score.pdf"],
    "18063": ["狂欢节序曲", "Carneval", "Carnival Overture", "Op.92", "B 169", "231804", "plate 10103", "Sibley", "1802/18497", "M1004 .D98C", "39087011183193score.pdf"],
    "39087011183193score.pdf": ["狂欢节序曲", "Carneval", "Carnival Overture", "Op.92", "B 169", "231804", "plate 10103", "Sibley", "1802/18497", "18063", "M1004 .D98C"],
    "nature, life and love": ["狂欢节序曲", "Karneval", "Carnival Overture", "Life (Czech Carnival)", "Op.91", "Op.92", "B 169", "1892-04-28", "1894"],
    "me9705": ["狂欢节序曲", "Carneval", "Carnival Overture", "Václav Talich", "Czech Philharmonic Orchestra", "His Master's Voice", "c.1920–1940", "1935 identity not cross-linked"],
    "8.111331": ["狂欢节序曲", "Carneval", "Carnival Overture", "Op.92", "B 169", "Václav Talich", "Czech Philharmonic Orchestra", "Naxos Historical", "November 1935", "0747313333127", "2009"],
    "0747313333127": ["狂欢节序曲", "Carneval", "Carnival Overture", "Op.92", "B 169", "Václav Talich", "Czech Philharmonic Orchestra", "Naxos Historical 8.111331", "November 1935", "2009"],
    "第八交响曲": ["德沃夏克第八交响曲", "Symphony No. 8", "Dvořák Symphony No. 8", "Op.88", "B 163", "1890-02-02", "Novello", "plate 9231", "405841", "FRBNF38360915", "DB2691", "2EA 2808"],
    "德沃夏克第八交响曲": ["第八交响曲", "Symphony No. 8", "Dvořák Symphony No. 8", "Op.88", "B 163", "405841", "FRBNF38360915", "DB2691"],
    "dvorak 8": ["第八交响曲", "德沃夏克第八交响曲", "Symphony No. 8", "Op.88", "B 163", "405841", "FRBNF38360915"],
    "dvorak symphony no.8": ["第八交响曲", "德沃夏克第八交响曲", "Dvořák Symphony No. 8", "Op.88", "B 163", "405841", "FRBNF38360915"],
    "b163": ["第八交响曲", "Symphony No. 8", "Op.88", "Novello", "plate 9231", "405841", "FRBNF38360915"],
    "405841": ["第八交响曲", "Symphony No. 8", "Op.88", "B 163", "Novello", "plate 9231", "PMLP08825-DvorakSymph8.pdf"],
    "frbnf38360915": ["第八交响曲", "Symphony No. 8", "Symphony no. 4 in G major", "HMV album 248", "DB2691", "DB2695", "2EA 2808", "2EA 2817"],
    "cb38360915r": ["第八交响曲", "Symphony No. 8", "FRBNF38360915", "HMV album 248", "DB2691", "DB2695"],
    "db2691": ["第八交响曲", "Symphony No. 8", "FRBNF38360915", "HMV album 248", "DB2692", "DB2693", "DB2694", "DB2695", "2EA 2808", "2EA 2809"],
    "2ea2808": ["第八交响曲", "Symphony No. 8", "DB2691", "2EA 2817", "1935-11-23", "Abbey Road"],
    "8111045": ["第八交响曲", "Symphony No. 8", "Naxos Historical 8.111045", "1935-11-23", "1935-11-28", "Abbey Road Studio No. 1"],
    "水仙女": ["Rusalka", "露莎卡", "Op.114", "B.203", "1901-03-31", "Národní divadlo", "Karel Kovařovic", "27706", "27707", "27708", "OM 2905", "BA 10438", "SU 3718-2", "Gabriela Beňačková", "Václav Neumann"],
    "rusalka": ["水仙女", "露莎卡", "Op.114", "B.203", "1901-03-31", "Národní divadlo", "Karel Kovařovic", "27706", "27707", "27708", "OM 2905", "BA 10438", "SU 3718-2", "Gabriela Beňačková", "Václav Neumann"],
    "op114": ["水仙女", "Rusalka", "B.203", "1901-03-31", "27706", "27707", "27708", "OM 2905", "BA 10438", "SU 3718-2"],
    "b203": ["水仙女", "Rusalka", "Op.114", "1901-03-31", "27706", "27707", "27708", "OM 2905", "SU 3718-2"],
    "27706": ["水仙女", "Rusalka", "Op.114", "B.203", "Title Preliminaries Act I", "27707", "27708", "1910", "Josa Will"],
    "su37182": ["水仙女", "Rusalka", "Op.114", "B.203", "Gabriela Beňačková", "Václav Neumann", "Czech Philharmonic Orchestra", "1983-08-24", "1985", "2003-05-19"],
    "月光小丑": ["月迷彼埃罗", "Pierrot lunaire", "Op.21", "IAS 31", "Work ID 478", "Albertine Zehme", "Choralionsaal", "1912-10-16", "source B", "object 1503", "LOC 2008573417", "source C", "object 1504", "Morgan 115629", "CM*", "object 1505", "U.E.5334", "object 1506", "H24", "object 1508", "827605", "03959", "R006400", "C010384", "Columbia M 461", "1940-09-24", "HCD113852"],
    "月迷彼埃罗": ["月光小丑", "Pierrot lunaire", "Op.21", "IAS 31", "Work ID 478", "Albertine Zehme", "1912-10-16", "1503", "1504", "1505", "1506", "1508", "115629", "827605", "03959", "R006400", "C010384", "Columbia M 461"],
    "pierrot lunaire": ["月光小丑", "月迷彼埃罗", "Op.21", "IAS 31", "Work ID 478", "Albertine Zehme", "Choralionsaal", "1912-10-16", "1503", "1504", "1505", "1506", "1508", "115629", "827605", "03959", "R006400", "C010384", "Columbia M 461", "HCD113852"],
    "op21": ["月光小丑", "月迷彼埃罗", "Pierrot lunaire", "IAS 31", "Work ID 478", "U.E.5334", "827605", "03959", "R006400", "C010384"],
    "ias31": ["月光小丑", "月迷彼埃罗", "Pierrot lunaire", "Op.21", "Work ID 478", "U.E.5334", "827605", "03959"],
    "workid478": ["月光小丑", "月迷彼埃罗", "Pierrot lunaire", "Op.21", "IAS 31", "1912-03-12", "1912-07-24", "1912-10-09", "1912-10-16", "Albertine Zehme"],
    "1503": ["月光小丑", "Pierrot lunaire", "source B", "first draft", "MS21", "LOC 2008573417", "49 source pages", "24 folios", "827605"],
    "1504": ["月光小丑", "Pierrot lunaire", "source C", "Sammelautograph", "Stichvorlage", "Morgan 115629", "48 leaves", "1913-12-23", "1914-01-31"],
    "1505": ["月光小丑", "Pierrot lunaire", "CM*", "1912 performing materials", "Verschollen", "Albertine Zehme"],
    "1506": ["月光小丑", "Pierrot lunaire", "source D", "U.E.5334", "1914", "first print", "03959", "78 pages"],
    "1508": ["月光小丑", "Pierrot lunaire", "source D2", "H24", "85 pages", "1922", "1927", "1940 recording"],
    "115629": ["月光小丑", "Pierrot lunaire", "Morgan", "source C", "1504", "autograph manuscript", "1912?"],
    "827605": ["月光小丑", "Pierrot lunaire", "LOC 2008573417", "source B", "1503", "Brodie_H", "64 pages", "December 3"],
    "03959": ["月光小丑", "Pierrot lunaire", "U.E.5334", "source D", "1506", "Universal Edition", "1914", "Dover 1994", "Unknown", "74 pages"],
    "r006400": ["月光小丑", "Pierrot lunaire", "1940-09-24", "Los Angeles", "Erika Stiedry-Wagner", "Edward Steuermann", "Rudolf Kolisch", "Arnold Schönberg", "C010384", "Columbia M 461"],
    "c010384": ["月光小丑", "Pierrot lunaire", "R006400", "Columbia M 461", "4 mono 78-rpm discs", "8 sides", "1940?", "1941", "e11-000165-000172-b01"],
    "m461": ["月光小丑", "Pierrot lunaire", "Columbia M 461", "R006400", "C010384", "1940-09-24", "1940?", "1941", "League of Composers"],
    "h24": ["月光小丑", "Pierrot lunaire", "source D2", "object 1508", "85 pages", "performance annotations", "1940 recording"],
    "升华之夜": ["净化之夜", "净夜", "Verklärte Nacht", "Verklarte Nacht", "Transfigured Night", "Op.4", "03938", "Verlag Dreililien", "R000870", "CVE-81508", "RCA Victor M 207", "Eugene Ormandy"],
    "净化之夜": ["升华之夜", "净夜", "Verklärte Nacht", "Verklarte Nacht", "Transfigured Night", "Op.4", "03938", "R000870", "CVE-81508"],
    "净夜": ["升华之夜", "净化之夜", "Verklärte Nacht", "Verklarte Nacht", "Transfigured Night", "Op.4", "03938", "R000870", "CVE-81508"],
    "verklarte": ["升华之夜", "净化之夜", "净夜", "Verklärte Nacht", "Transfigured Night", "Op.4", "03938", "R000870", "CVE-81508"],
    "transfigured": ["升华之夜", "净化之夜", "净夜", "Verklärte Nacht", "Verklarte Nacht", "Op.4", "03938", "R000870", "CVE-81508"],
    "03938": ["升华之夜", "Verklärte Nacht", "Verklarte Nacht", "Op.4", "Verlag Dreililien", "plate 345", "1905"],
    "r000870": ["升华之夜", "Verklärte Nacht", "Verklarte Nacht", "Op.4", "Eugene Ormandy", "Minneapolis Symphony Orchestra", "CVE-81508", "RCA Victor M 207", "1934"],
    "cve-81508": ["升华之夜", "Verklärte Nacht", "Verklarte Nacht", "Op.4", "R000870", "Eugene Ormandy", "Minneapolis Symphony Orchestra", "RCA Victor M 207", "1934"],
    "第二弦乐四重奏": ["弦乐四重奏第 2 号", "String Quartet No.2", "Streichquartett Nr. 2", "Op.10", "IAS 36", "Work ID 404", "Source Aa", "object 1142", "MS 77", "Source B", "object 1146", "ML30.8b.S3 op.10", "Source Ea", "object 1150", "Bösendorfersaal", "1908-12-21", "1909 Selbstverlag", "29725", "U.E. 2993", "W.Ph.V. 229", "R003235", "Clemence Gifford", "Kolisch String Quartet", "1936-12-31"],
    "弦乐四重奏第2号": ["第二弦乐四重奏", "String Quartet No.2", "Streichquartett Nr. 2", "Op.10", "IAS 36", "Work ID 404", "Source Aa", "MS 77", "Source B", "ML30.8b.S3 op.10", "Source Ea", "29725", "R003235"],
    "string quartet no.2": ["第二弦乐四重奏", "Streichquartett Nr. 2", "Op.10", "IAS 36", "Work ID 404", "Source Aa", "MS 77", "Source B", "ML30.8b.S3 op.10", "Source Ea", "29725", "R003235", "Kolisch String Quartet"],
    "streichquartett nr.2": ["第二弦乐四重奏", "String Quartet No.2", "Op.10", "IAS 36", "Work ID 404", "Source Aa", "MS 77", "Source B", "ML30.8b.S3 op.10", "Source Ea", "29725", "R003235", "Kolisch String Quartet"],
    "op10": ["第二弦乐四重奏", "String Quartet No.2", "Streichquartett Nr. 2", "IAS 36", "Work ID 404", "Source Aa", "MS 77", "Source B", "ML30.8b.S3 op.10", "Source Ea", "29725", "R003235"],
    "workid404": ["第二弦乐四重奏", "String Quartet No.2", "Streichquartett Nr. 2", "Op.10", "IAS 36", "Source Aa", "MS 77", "Source B", "ML30.8b.S3 op.10", "Source Ea", "1909 Selbstverlag"],
    "ms77": ["第二弦乐四重奏", "Op.10", "Work ID 404", "Source Aa", "object 1142", "III sketchbook"],
    "1142": ["第二弦乐四重奏", "Op.10", "Work ID 404", "Source Aa", "MS 77", "sketchbook"],
    "ml308bs3op10": ["第二弦乐四重奏", "Op.10", "Work ID 404", "Source B", "object 1146", "Library of Congress"],
    "1146": ["第二弦乐四重奏", "Op.10", "Work ID 404", "Source B", "ML30.8b.S3 op.10", "autograph score"],
    "1150": ["第二弦乐四重奏", "Op.10", "Work ID 404", "Source Ea", "1909 Selbstverlag", "first print"],
    "29725": ["第二弦乐四重奏", "String Quartet No.2", "Streichquartett Nr. 2", "Op.10", "U.E. 2993", "W.Ph.V. 229", "Revised 1921"],
    "r003235": ["第二弦乐四重奏", "String Quartet No.2", "Streichquartett Nr. 2", "Op.10", "Clemence Gifford", "Kolisch String Quartet", "1936-12-31", "United Artists film studio"],
    "r019894": ["第二弦乐四重奏", "String Quartet No.2", "Streichquartett Nr. 2", "Op.10", "Clemence Gifford", "Kolisch String Quartet", "1936-12-29", "adjacent ASC recording object"],
    "期待": ["Erwartung", "Expectation", "Op.17", "IAS 4", "Work ID 472", "Marie Pappenheim", "MS17", "U.E.5361", "1917-04-05", "1924-06-06", "528621", "R005379", "C019827", "WER 50 001", "Helga Pilarczyk", "Hermann Scherchen"],
    "erwartung": ["期待", "Expectation", "Op.17", "IAS 4", "Work ID 472", "Marie Pappenheim", "MS17", "U.E.5361", "1917-04-05", "1924-06-06", "528621", "R005379", "C019827", "WER 50 001", "Helga Pilarczyk", "Hermann Scherchen"],
    "expectation": ["期待", "Erwartung", "Op.17", "IAS 4", "Work ID 472", "MS17", "U.E.5361", "528621", "R005379", "WER 50 001"],
    "op17": ["期待", "Erwartung", "Expectation", "IAS 4", "Work ID 472", "MS17", "U.E.5361", "528621", "R005379"],
    "528621": ["期待", "Erwartung", "Op.17", "U.E.5361", "1916 imprint", "1917-04-05", "Daphnis", "64 pages"],
    "r005379": ["期待", "Erwartung", "Op.17", "Helga Pilarczyk", "Nordwestdeutsche Philharmonie", "Hermann Scherchen", "1960", "C019827", "WER 50 001"],
    "c019827": ["期待", "Erwartung", "Op.17", "R005379", "WER 50 001", "1962?", "mono LP"],
    "wer50001": ["期待", "Erwartung", "Op.17", "R005379", "C019827", "Helga Pilarczyk", "Hermann Scherchen", "1962?"],
    "古雷之歌": ["Gurre-Lieder", "Gurre Lieder", "Gurre Songs", "Work ID 480", "Cary 0282", "U.E.3697", "U.E.6300", "1910-01-14", "1912-11-08", "1913-02-23", "Franz Schreker", "40031", "39996", "39997", "Leopold Stokowski", "14 Schallplatten", "FRBNF38067361", "VOX VBX204", "René Leibowitz"],
    "gurre-lieder": ["古雷之歌", "Gurre Lieder", "Gurre Songs", "Work ID 480", "Cary 0282", "U.E.3697", "U.E.6300", "1913-02-23", "Franz Schreker", "40031", "39996", "39997", "Leopold Stokowski", "FRBNF38067361", "VOX VBX204", "René Leibowitz"],
    "gurrelieder": ["古雷之歌", "Gurre-Lieder", "Gurre Songs", "Work ID 480", "Cary 0282", "U.E.3697", "U.E.6300", "1913-02-23", "Franz Schreker", "40031", "39996", "39997", "Leopold Stokowski", "FRBNF38067361", "VOX VBX204", "René Leibowitz"],
    "gurresongs": ["古雷之歌", "Gurre-Lieder", "Gurre Lieder", "Work ID 480", "Cary 0282", "U.E.3697", "U.E.6300", "1913-02-23", "40031", "FRBNF38067361"],
    "workid480": ["古雷之歌", "Gurre-Lieder", "Cary 0282", "U.E.3697", "U.E.6300", "1910-01-14", "1913-02-23"],
    "cary0282": ["古雷之歌", "Gurre-Lieder", "Work ID 480", "Partiturreinschrift C", "Pierpont Morgan Library", "U.E.3697", "U.E.6300"],
    "ue3697": ["古雷之歌", "Gurre-Lieder", "1912-11-08", "Erstdruck", "facsimile study score", "source D", "500 copies"],
    "u.e.3697": ["古雷之歌", "Gurre-Lieder", "1912-11-08", "Erstdruck", "facsimile study score", "source D", "500 copies"],
    "ue6300": ["古雷之歌", "Gurre-Lieder", "1920-08-31", "revised engraved score", "source H", "40031", "39996", "39997", "BEL-1005"],
    "u.e.6300": ["古雷之歌", "Gurre-Lieder", "1920-08-31", "revised engraved score", "source H", "40031", "39996", "39997", "BEL-1005"],
    "40031": ["古雷之歌", "Gurre-Lieder", "Part I", "U.E.6300", "39996", "39997", "Daphnis", "95 pages"],
    "39996": ["古雷之歌", "Gurre-Lieder", "Part II", "U.E.6300", "40031", "39997", "Daphnis", "11 pages"],
    "39997": ["古雷之歌", "Gurre-Lieder", "Part III", "U.E.6300", "40031", "39996", "Daphnis", "83 pages"],
    "frbnf38067361": ["古雷之歌", "Gurre-Lieder", "cb38067361f", "VOX VBX204", "René Leibowitz", "New symphony society of Paris", "1963", "AB/63-73", "SD 30-137709"],
    "cb38067361f": ["古雷之歌", "Gurre-Lieder", "FRBNF38067361", "VOX VBX204", "René Leibowitz", "1963"],
    "vbx204": ["古雷之歌", "Gurre-Lieder", "FRBNF38067361", "René Leibowitz", "Vox productions", "3 LP", "1963"],
    "马勒第一交响曲": ["第一交响曲", "Mahler Symphony No. 1", "Mahler 1", "GMW 11", "GMW 11,1", "GMW 11,2", "Blumine", "Titan", "V-001-002162", "Ph.64", "MS 506", "Ph.151", "L1.UE.375", "L17.IGMG.2", "Record 113738", "A-003-000088", "LP-0001", "Columbia SL-218", "Bruno Walter", "1954-01-25"],
    "第一交响曲": ["马勒第一交响曲", "Mahler Symphony No. 1", "Mahler 1", "GMW 11", "GMW 11,1", "GMW 11,2", "Blumine", "V-001-002162", "Ph.64", "MS 506", "Ph.151", "L1.UE.375", "L17.IGMG.2", "A-003-000088", "Bruno Walter"],
    "mahler 1": ["马勒第一交响曲", "第一交响曲", "Mahler Symphony No. 1", "GMW 11", "GMW 11,1", "GMW 11,2", "Blumine", "V-001-002162", "Ph.64", "MS 506", "Ph.151", "L1.UE.375", "L17.IGMG.2", "A-003-000088"],
    "mahler symphony no.1": ["马勒第一交响曲", "第一交响曲", "Mahler 1", "GMW 11", "GMW 11,1", "GMW 11,2", "Blumine", "V-001-002162", "Ph.64", "MS 506", "Ph.151", "L1.UE.375", "L17.IGMG.2", "A-003-000088"],
    "gmw11": ["马勒第一交响曲", "第一交响曲", "Mahler Symphony No. 1", "GMW 11,1", "GMW 11,2", "Blumine", "V-001-002162", "Ph.64", "MS 506", "Ph.151", "L1.UE.375", "L17.IGMG.2", "A-003-000088"],
    "gmw11,1": ["马勒第一交响曲", "第一交响曲", "Symphonische Dichtung in zwei Abteilungen", "V-001-002162", "1889-11-20", "Vigadó"],
    "gmw11,2": ["马勒第一交响曲", "第一交响曲", "Titan", "Blumine", "Ph.64", "MS 506", "Renovatum 16. August 1893"],
    "v001002162": ["马勒第一交响曲", "第一交响曲", "GMW 11,1", "1889-11-20", "Vigadó", "Symphonische Dichtung"],
    "ph.64": ["马勒第一交响曲", "GMW 11,2", "Titan", "Blumine", "Yale MS 506", "32240"],
    "ms506": ["马勒第一交响曲", "GMW 11,2", "Titan", "Blumine", "Ph.64", "Yale Beinecke"],
    "ph.151": ["马勒第一交响曲", "四乐章刻版底本", "L1.UE.375", "AC14010561", "Ferdinand Weidig", "32241"],
    "l1.ue.375": ["马勒第一交响曲", "四乐章刻版底本", "Ph.151", "AC14010561", "Ferdinand Weidig"],
    "ac14010561": ["马勒第一交响曲", "四乐章刻版底本", "Ph.151", "L1.UE.375"],
    "l17.igmg.2": ["马勒第一交响曲", "1899 Weinberger", "首版演出分谱", "AC13945592", "Henry Boewig", "1909 Carnegie Hall"],
    "ac13945592": ["马勒第一交响曲", "L17.IGMG.2", "1899 Weinberger", "首版演出分谱", "Henry Boewig"],
    "a003000088": ["马勒第一交响曲", "GMW 11", "1954-01-25", "Bruno Walter", "New York Philharmonic", "LP-0001", "Columbia SL-218"],
    "lp0001": ["马勒第一交响曲", "A-003-000088", "Bruno Walter", "New York Philharmonic", "Columbia SL-218", "1955 LP"],
    "第二交响曲": ["复活交响曲", "复活", "Symphony No.2", "Resurrection Symphony", "Auferstehung", "GMW 30", "415748", "Friedrich Hofmeister", "Oskar Fried", "Fülöp 2.0010", "FRBNF38500698", "GEMMCDS9929"],
    "复活交响曲": ["第二交响曲", "复活", "Symphony No.2", "Resurrection Symphony", "Auferstehung", "GMW 30", "415748", "Friedrich Hofmeister", "Oskar Fried", "Fülöp 2.0010", "FRBNF38500698", "GEMMCDS9929"],
    "复活": ["第二交响曲", "复活交响曲", "Symphony No.2", "Resurrection Symphony", "Auferstehung", "GMW 30", "415748", "Friedrich Hofmeister", "Oskar Fried", "Fülöp 2.0010", "FRBNF38500698", "GEMMCDS9929"],
    "resurrection": ["第二交响曲", "复活交响曲", "复活", "Symphony No.2", "Auferstehung", "GMW 30", "415748", "Friedrich Hofmeister", "Oskar Fried", "Fülöp 2.0010", "FRBNF38500698", "GEMMCDS9929"],
    "auferstehung": ["第二交响曲", "复活交响曲", "复活", "Symphony No.2", "Resurrection Symphony", "GMW 30", "415748", "Friedrich Hofmeister", "Oskar Fried", "Fülöp 2.0010", "FRBNF38500698", "GEMMCDS9929"],
    "415748": ["第二交响曲", "复活交响曲", "复活", "Symphony No.2", "Resurrection Symphony", "Auferstehung", "GMW 30", "Friedrich Hofmeister"],
    "gemmcds9929": ["第二交响曲", "复活交响曲", "Symphony No.2", "Resurrection Symphony", "Oskar Fried", "Fülöp 2.0010", "FRBNF38500698"],
    "frbnf38500698": ["第二交响曲", "复活交响曲", "Symphony No.2", "Resurrection Symphony", "Oskar Fried", "Fülöp 2.0010", "GEMMCDS9929"],
    "马勒第五交响曲": ["第五交响曲", "Symphony No. 5", "Symphony No.5", "GMW 44", "IGM 11", "Cary 509", "V-001-002141", "1904-10-18", "Gürzenich", "C. F. Peters", "plate 8951", "111956", "EP 10800", "FRBNF38483090", "Harmonia mundi 1955179", "Hermann Scherchen", "Orchestre national de l'ORTF"],
    "mahler 5": ["马勒第五交响曲", "Symphony No. 5", "GMW 44", "IGM 11", "Cary 509", "V-001-002141", "111956", "FRBNF38483090", "1955179"],
    "mahler symphony no.5": ["马勒第五交响曲", "Symphony No. 5", "GMW 44", "IGM 11", "Cary 509", "V-001-002141", "111956", "FRBNF38483090"],
    "gmw44": ["马勒第五交响曲", "Symphony No. 5", "IGM 11", "Cary 509", "V-001-002141", "plate 8951", "111956", "EP 10800"],
    "igm11": ["马勒第五交响曲", "Symphony No. 5", "GMW 44", "Cary 509", "V-001-002141", "111956"],
    "v001002141": ["马勒第五交响曲", "Symphony No. 5", "GMW 44", "1904-10-18", "Gürzenich", "Concert-Gesellschaft Köln"],
    "cary509": ["马勒第五交响曲", "Symphony No. 5", "GMW 44", "1903 Oct", "Record 115214"],
    "111956": ["马勒第五交响曲", "Symphony No. 5", "GMW 44", "C. F. Peters", "plate 8951", "249 pages", "Sibley"],
    "frbnf38483090": ["马勒第五交响曲", "Symphony No. 5", "Hermann Scherchen", "Orchestre national de l'ORTF", "1965", "Harmonia mundi 1955179", "NUMAV-437807"],
    "cb38483090b": ["马勒第五交响曲", "Symphony No. 5", "FRBNF38483090", "Hermann Scherchen", "Orchestre national de l'ORTF", "1955179"],
    "1955179": ["马勒第五交响曲", "Symphony No. 5", "FRBNF38483090", "Hermann Scherchen", "Harmonia mundi France", "2000"],
    "ep10800": ["马勒第五交响曲", "Symphony No. 5", "GMW 44", "Reinhold Kubik", "2002", "C. F. Peters"],
    "马勒第六交响曲": ["Symphony No. 6", "Mahler 6", "GMW 46", "L17.IGMG.15", "plate 4526", "1906-05-27", "Essen", "514284", "Leonard Bernstein", "New York Philharmonic", "FRBNF37806932", "CBS S77218"],
    "mahler 6": ["马勒第六交响曲", "Symphony No. 6", "GMW 46", "L17.IGMG.15", "plate 4526", "514284", "Bernstein", "FRBNF37806932"],
    "mahler symphony no.6": ["马勒第六交响曲", "Mahler 6", "GMW 46", "L17.IGMG.15", "plate 4526", "514284", "Bernstein", "CBS S77218"],
    "gmw46": ["马勒第六交响曲", "Symphony No. 6", "L17.IGMG.15", "plate 4526", "514284", "1906-05-27"],
    "l17igmg15": ["马勒第六交响曲", "Symphony No. 6", "GMW 46", "Stichvorlage", "AC14005792", "plate 4526"],
    "514284": ["马勒第六交响曲", "Symphony No. 6", "GMW 46", "C. F. Kahnt Nachfolger", "plate 4526", "AGN5497.0001.001"],
    "frbnf37806932": ["马勒第六交响曲", "Symphony No. 6", "Leonard Bernstein", "New York Philharmonic", "1967-05-06", "CBS S77218", "CBS S75623", "CBS S75666"],
    "cb378069328": ["马勒第六交响曲", "Symphony No. 6", "FRBNF37806932", "Leonard Bernstein", "New York Philharmonic", "CBS S77218"],
    "s77218": ["马勒第六交响曲", "Symphony No. 6", "FRBNF37806932", "CBS", "S75623", "S75666", "1968"],
    "m3s776": ["马勒第六交响曲", "Symphony No. 6", "Leonard Bernstein", "New York Philharmonic", "1967-05-06", "SMK60208"],
    "smk60208": ["马勒第六交响曲", "Symphony No. 6", "Leonard Bernstein", "New York Philharmonic", "M3S776", "1967-05-06"],
    "牧神午后前奏曲": ["牧神的午后前奏曲", "Prélude à l’après-midi d’un faune", "Prelude to the Afternoon of a Faun", "Faune", "Faun", "FL 87", "CD 87", "MS-17685", "E. 1091 F.", "14736", "W 837", "CFR 475", "CFR 476", "FRBNF37899136", "NUMAUD-1082650"],
    "牧神的午后前奏曲": ["牧神午后前奏曲", "Prélude à l’après-midi d’un faune", "Prelude to the Afternoon of a Faun", "Faune", "Faun", "FL 87", "CD 87", "MS-17685", "E. 1091 F.", "14736", "W 837", "CFR 475", "CFR 476", "FRBNF37899136", "NUMAUD-1082650"],
    "faune": ["牧神午后前奏曲", "牧神的午后前奏曲", "Prélude à l’après-midi d’un faune", "Prelude to the Afternoon of a Faun", "FL 87", "CD 87", "MS-17685", "E. 1091 F.", "14736", "W 837", "CFR 475", "CFR 476"],
    "faun": ["牧神午后前奏曲", "牧神的午后前奏曲", "Prélude à l’après-midi d’un faune", "Prelude to the Afternoon of a Faun", "FL 87", "CD 87", "MS-17685", "E. 1091 F.", "14736", "W 837", "CFR 475", "CFR 476"],
    "fl87": ["牧神午后前奏曲", "牧神的午后前奏曲", "Prélude à l’après-midi d’un faune", "Faune", "MS-17685", "E. 1091 F.", "14736", "W 837", "CFR 475", "CFR 476"],
    "w837": ["牧神午后前奏曲", "Prélude à l’après-midi d’un faune", "Faune", "FL 87", "CFR 475", "CFR 476", "FRBNF37899136", "NUMAUD-1082650"],
    "cfr475": ["牧神午后前奏曲", "Prélude à l’après-midi d’un faune", "Faune", "FL 87", "W 837", "CFR 476", "FRBNF37899136"],
    "cfr476": ["牧神午后前奏曲", "Prélude à l’après-midi d’un faune", "Faune", "FL 87", "W 837", "CFR 475", "FRBNF37899136"],
    "德彪西弦乐四重奏": ["G 小调弦乐四重奏", "String Quartet in G minor", "Quatuor à cordes", "FL 91", "FL 85", "CD 91", "1893-12-29", "Quatuor Ysaÿe", "11939", "D. & F. 4738", "FRBNF13911421", "FRBNF37824471", "D15085", "LX 427", "NUMAUD-1082690"],
    "小调弦乐四重奏": ["德彪西弦乐四重奏", "G 小调弦乐四重奏", "String Quartet in G minor", "Quatuor à cordes", "FL 91", "FL 85", "CD 91", "1893-12-29", "Quatuor Ysaÿe", "11939", "D. & F. 4738", "FRBNF13911421", "FRBNF37824471", "D15085", "D15088", "LX 427", "LX 434", "NUMAUD-1082690", "bpt6k1082690g"],
    "g小调弦乐四重奏": ["德彪西弦乐四重奏", "String Quartet in G minor", "Quatuor à cordes", "FL 91", "FL 85", "CD 91", "11939", "D. & F. 4738", "FRBNF13911421", "FRBNF37824471", "D15085", "LX 427", "NUMAUD-1082690"],
    "string quartet in g minor": ["德彪西弦乐四重奏", "G 小调弦乐四重奏", "Quatuor à cordes", "Op.10", "FL 91", "11939", "D15085", "LX 427"],
    "quatuor à cordes": ["德彪西弦乐四重奏", "G 小调弦乐四重奏", "String Quartet in G minor", "Op.10", "FL 91", "11939", "D15085", "LX 427"],
    "fl91": ["德彪西弦乐四重奏", "G 小调弦乐四重奏", "String Quartet in G minor", "Quatuor à cordes", "FL 85", "CD 91", "FRBNF13911421"],
    "frbnf13911421": ["德彪西弦乐四重奏", "G 小调弦乐四重奏", "FL 91", "1893-12-29", "Quatuor Ysaÿe"],
    "11939": ["德彪西弦乐四重奏", "G 小调弦乐四重奏", "String Quartet in G minor", "FL 91", "Durand", "D. & F. 4738", "Project Gutenberg"],
    "frbnf37824471": ["德彪西弦乐四重奏", "G 小调弦乐四重奏", "FL 91", "D15085", "D15088", "LX 427", "LX 434", "NUMAUD-1082690"],
    "cb37824471q": ["FRBNF37824471", "德彪西弦乐四重奏", "D15085", "D15088", "LX 427", "LX 434", "NUMAUD-1082690"],
    "d15085": ["德彪西弦乐四重奏", "FRBNF37824471", "D15088", "LX 427", "LX 434", "NUMAUD-1082690"],
    "lx427": ["德彪西弦乐四重奏", "FRBNF37824471", "D15085", "LX 434", "NUMAUD-1082690"],
    "numaud-1082690": ["德彪西弦乐四重奏", "FRBNF37824471", "D15085", "D15088", "LX 427", "LX 434", "bpt6k1082690g"],
    "bpt6k1082690g": ["德彪西弦乐四重奏", "FRBNF37824471", "NUMAUD-1082690", "D15085", "LX 427"],
    "德彪西游戏": ["Jeux", "poème dansé", "CD 133", "FL 133", "FL 126", "1913-05-15", "FRBNF13911402", "FRBNF40175015", "FRBNF39615654", "15762", "D. & F. 8958", "FRBNF38088447", "C 30 A 294"],
    "cd133": ["德彪西游戏", "Jeux", "poème dansé", "FL 133", "FL 126", "FRBNF13911402", "FRBNF40175015", "15762", "D. & F. 8958", "FRBNF38088447"],
    "fl133": ["德彪西游戏", "Jeux", "poème dansé", "CD 133", "FL 126", "FRBNF13911402", "FRBNF40175015", "15762", "FRBNF38088447"],
    "frbnf13911402": ["德彪西游戏", "Jeux", "CD 133", "FL 133", "FL 126", "1913-05-15", "FRBNF40175015", "15762"],
    "frbnf40175015": ["德彪西游戏", "Jeux", "FL 133", "1913-05-15", "Théâtre des Champs-Élysées", "Vaslav Nijinsky", "Pierre Monteux", "FRBNF13911402"],
    "frbnf39615654": ["德彪西游戏", "Jeux", "1913-06-09", "Robert Godet", "FRBNF13911402", "FRBNF40175015"],
    "15762": ["德彪西游戏", "Jeux", "CD 133", "FL 133", "D. & F. 8958", "Durand", "118 pages"],
    "frbnf38088447": ["德彪西游戏", "Jeux", "FL 133", "Vega", "C 30 A 294", "C 30 A 295", "C 30 A 296", "Manuel Rosenthal"],
    "c30a294": ["德彪西游戏", "Jeux", "FL 133", "FRBNF38088447", "Vega", "C 30 A 295", "C 30 A 296", "Manuel Rosenthal"],
    "佩利亚斯与梅丽桑德": ["佩列阿斯与梅丽桑德", "Pelléas et Mélisande", "Pelleas et Melisande", "FL 93", "CD 93", "L.88", "16926", "FRBNF42253396", "FRBNF37893971", "DB-5161", "DB-5180", "NUMAUD-1083134", "Roger Désormière"],
    "佩列阿斯与梅丽桑德": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "Pelleas et Melisande", "FL 93", "CD 93", "L.88", "16926", "FRBNF42253396", "FRBNF37893971", "DB-5161", "DB-5180", "NUMAUD-1083134", "Roger Désormière"],
    "pelleas": ["佩利亚斯与梅丽桑德", "佩列阿斯与梅丽桑德", "Pelléas et Mélisande", "Pelleas et Melisande", "FL 93", "CD 93", "L.88", "16926", "FRBNF42253396", "FRBNF37893971", "DB-5161", "DB-5180", "Roger Désormière"],
    "melisande": ["佩利亚斯与梅丽桑德", "佩列阿斯与梅丽桑德", "Pelléas et Mélisande", "Pelleas et Melisande", "FL 93", "CD 93", "16926", "FRBNF37893971", "DB-5161", "DB-5180"],
    "fl93": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "Pelleas et Melisande", "CD 93", "L.88", "16926", "FRBNF42253396", "FRBNF37893971", "DB-5161", "DB-5180"],
    "cd93": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "Pelleas et Melisande", "FL 93", "L.88", "16926", "FRBNF42253396", "FRBNF37893971", "DB-5161", "DB-5180"],
    "16926": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "Pelleas et Melisande", "FL 93", "CD 93", "E. 1418 F.", "1904", "1905 配器修订"],
    "frbnf42253396": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "1902-04-30", "Opéra-Comique", "Mary Garden", "Jean Périer"],
    "frbnf37893971": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "Roger Désormière", "Irène Joachim", "Jacques Jansen", "DB-5161", "DB-5180", "NUMAUD-1083134", "1941"],
    "db-5161": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "FRBNF37893971", "DB-5180", "Roger Désormière", "1941"],
    "db-5180": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "FRBNF37893971", "DB-5161", "Roger Désormière", "1941"],
    "numaud-1083134": ["佩利亚斯与梅丽桑德", "Pelléas et Mélisande", "FRBNF37893971", "DB-5161", "DB-5180", "Roger Désormière"],
    "浮士德博士": ["Doktor Faust", "Doctor Faust", "K 303", "BV 303", "IFB 84", "Philipp Jarnach", "Antony Beaumont", "755854", "FRBNF43655454", "OC 956", "4260034869561", "NUMAV-961736", "Wolfgang Koch", "Catherine Naglestad", "Tomáš Netopil", "2008-06-28"],
    "doktor faust": ["浮士德博士", "Doctor Faust", "K 303", "BV 303", "IFB 84", "Philipp Jarnach", "Antony Beaumont", "755854", "FRBNF43655454", "OC 956", "4260034869561", "NUMAV-961736", "Wolfgang Koch", "Catherine Naglestad", "Tomáš Netopil", "2008-06-28"],
    "doctor faust": ["浮士德博士", "Doktor Faust", "K 303", "BV 303", "IFB 84", "Philipp Jarnach", "Antony Beaumont", "755854", "FRBNF43655454", "OC 956", "4260034869561", "NUMAV-961736", "Wolfgang Koch", "Catherine Naglestad", "Tomáš Netopil", "2008-06-28"],
    "k303": ["浮士德博士", "Doktor Faust", "Doctor Faust", "BV 303", "IFB 84", "755854", "FRBNF43655454", "OC 956", "Tomáš Netopil"],
    "bv303": ["浮士德博士", "Doktor Faust", "Doctor Faust", "K 303", "IFB 84", "755854", "FRBNF43655454", "OC 956", "Tomáš Netopil"],
    "frbnf43655454": ["浮士德博士", "Doktor Faust", "K 303", "BV 303", "OC 956", "4260034869561", "NUMAV-961736", "Wolfgang Koch", "Catherine Naglestad", "Tomáš Netopil", "2008-06-28"],
    "oc956": ["浮士德博士", "Doktor Faust", "K 303", "BV 303", "FRBNF43655454", "4260034869561", "NUMAV-961736", "Wolfgang Koch", "Catherine Naglestad", "Tomáš Netopil"],
    "4260034869561": ["浮士德博士", "Doktor Faust", "K 303", "BV 303", "FRBNF43655454", "OC 956", "NUMAV-961736", "Tomáš Netopil"],
    "悲歌摇篮曲": ["哀歌摇篮曲", "Berceuse élégiaque", "Berceuse elegiaque", "Op.42", "K 252a", "BV 252a", "E0400015", "40079", "Part.B.2147", "1911-02-21", "Carnegie Hall", "Gustav Mahler", "FRBNF38132444", "AV 6110", "NUMAV-527614"],
    "哀歌摇篮曲": ["悲歌摇篮曲", "Berceuse élégiaque", "Berceuse elegiaque", "Op.42", "K 252a", "BV 252a", "E0400015", "40079", "1911-02-21", "Carnegie Hall", "FRBNF38132444", "AV 6110"],
    "berceuse élégiaque": ["悲歌摇篮曲", "哀歌摇篮曲", "Berceuse elegiaque", "Op.42", "K 252a", "BV 252a", "E0400015", "40079", "Part.B.2147", "1911-02-21", "Carnegie Hall", "Gustav Mahler", "FRBNF38132444", "AV 6110", "NUMAV-527614"],
    "berceuse elegiaque": ["悲歌摇篮曲", "哀歌摇篮曲", "Berceuse élégiaque", "Op.42", "K 252a", "BV 252a", "E0400015", "40079", "Part.B.2147", "1911-02-21", "Carnegie Hall", "Gustav Mahler", "FRBNF38132444", "AV 6110", "NUMAV-527614"],
    "k252a": ["悲歌摇篮曲", "Berceuse élégiaque", "Berceuse elegiaque", "Op.42", "BV 252a", "E0400015", "40079", "FRBNF38132444", "AV 6110"],
    "bv252a": ["悲歌摇篮曲", "Berceuse élégiaque", "Berceuse elegiaque", "Op.42", "K 252a", "E0400015", "40079", "FRBNF38132444", "AV 6110"],
    "40079": ["悲歌摇篮曲", "Berceuse élégiaque", "Berceuse elegiaque", "Op.42", "K 252a", "BV 252a", "Part.B.2147", "Breitkopf & Härtel", "Konrad Stein"],
    "frbnf38132444": ["悲歌摇篮曲", "Berceuse élégiaque", "K 252a", "BV 252a", "AV 6110", "AD 100", "Camerata de Versailles", "Amaury du Closel", "NUMAV-527614", "P 1986", "1987"],
    "av6110": ["悲歌摇篮曲", "Berceuse élégiaque", "K 252a", "FRBNF38132444", "AD 100", "Camerata de Versailles", "Amaury du Closel", "NUMAV-527614"],
    "numav-527614": ["悲歌摇篮曲", "Berceuse élégiaque", "K 252a", "FRBNF38132444", "AV 6110"],
    "费德里奥": ["Fidelio", "Leonore", "莱奥诺拉", "Op.72", "ILB 67", "HCB Mh 1", "HCB BBr 63", "HCB Mh 47b", "Hat man nicht auch Gold beineben", "Georg Friedrich Treitschke", "Karl Friedrich Weinmüller", "51212", "FRBNF37819229", "CND535", "CND536", "CND537", "Wolfgang Windgassen", "Martha Mödl", "Wilhelm Furtwängler"],
    "fidelio": ["费德里奥", "Leonore", "莱奥诺拉", "Op.72", "ILB 67", "HCB Mh 1", "HCB BBr 63", "HCB Mh 47b", "Hat man nicht auch Gold beineben", "Georg Friedrich Treitschke", "Karl Friedrich Weinmüller", "51212", "FRBNF37819229", "CND535", "CND536", "CND537", "Wolfgang Windgassen", "Martha Mödl", "Wilhelm Furtwängler"],
    "leonore": ["费德里奥", "Fidelio", "莱奥诺拉", "Op.72", "ILB 67", "HCB Mh 1", "HCB BBr 63", "HCB Mh 47b", "Hat man nicht auch Gold beineben", "51212", "FRBNF37819229", "CND535", "CND536", "CND537", "Martha Mödl", "Wilhelm Furtwängler"],
    "op72": ["费德里奥", "Fidelio", "Leonore", "莱奥诺拉", "ILB 67", "HCB Mh 1", "HCB BBr 63", "HCB Mh 47b", "51212", "FRBNF37819229", "CND535", "CND536", "CND537"],
    "hcbbbr63": ["费德里奥", "Fidelio", "Op.72", "Georg Friedrich Treitschke", "1814", "修订", "推迟演出"],
    "hcbmh47b": ["费德里奥", "Fidelio", "Op.72", "Hat man nicht auch Gold beineben", "Rocco", "Karl Friedrich Weinmüller", "1814", "校订抄本"],
    "frbnf37819229": ["费德里奥", "Fidelio", "Op.72", "CND535", "CND536", "CND537", "Wolfgang Windgassen", "Martha Mödl", "Wilhelm Furtwängler"],
    "cnd535": ["费德里奥", "Fidelio", "Op.72", "FRBNF37819229", "CND536", "CND537", "Wilhelm Furtwängler"],
    "cnd536": ["费德里奥", "Fidelio", "Op.72", "FRBNF37819229", "CND535", "CND537", "Wilhelm Furtwängler"],
    "cnd537": ["费德里奥", "Fidelio", "Op.72", "FRBNF37819229", "CND535", "CND536", "Wilhelm Furtwängler"],
    "大地之歌": ["Das Lied von der Erde", "Song of the Earth", "GMW 49-O", "GMW 49-K", "V-001-001144", "20582", "FRBNF37833899", "ROX 165", "ROX 171", "1936-05-24"],
    "das lied von der erde": ["大地之歌", "Song of the Earth", "GMW 49-O", "GMW 49-K", "V-001-001144", "20582", "FRBNF37833899", "ROX 165", "ROX 171", "1936-05-24"],
    "song of the earth": ["大地之歌", "Das Lied von der Erde", "GMW 49-O", "GMW 49-K", "V-001-001144", "20582", "FRBNF37833899", "ROX 165", "ROX 171", "1936-05-24"],
    "gmw49-o": ["大地之歌", "Das Lied von der Erde", "GMW 49-K", "V-001-001144", "20582", "FRBNF37833899", "ROX 165", "ROX 171", "1936-05-24"],
    "gmw49-k": ["大地之歌", "Das Lied von der Erde", "GMW 49-O", "V-001-001144", "20582", "FRBNF37833899", "ROX 165", "ROX 171", "1936-05-24"],
    "frbnf37833899": ["大地之歌", "Das Lied von der Erde", "GMW 49-O", "1936-05-24", "ROX 165", "ROX 171"],
    "rox165": ["大地之歌", "Das Lied von der Erde", "FRBNF37833899", "ROX 171", "1936-05-24"],
    "rox171": ["大地之歌", "Das Lied von der Erde", "FRBNF37833899", "ROX 165", "1936-05-24"],
    "大提琴协奏曲": ["B 小调大提琴协奏曲", "Cello Concerto", "Op.104", "B 191", "S 76/1540", "Simrock 10548", "Victor DM 458"],
    "小调大提琴协奏曲": ["B 小调大提琴协奏曲", "Cello Concerto", "Op.104", "B 191", "S 76/1540", "Simrock 10548", "Victor DM 458"],
    "cello concerto": ["B 小调大提琴协奏曲", "大提琴协奏曲", "Op.104", "B 191", "S 76/1540", "Simrock 10548", "Victor DM 458"],
    "b191": ["B 小调大提琴协奏曲", "大提琴协奏曲", "Cello Concerto", "Op.104", "S 76/1540", "Simrock 10548", "Victor DM 458"],
    "op104": ["B 小调大提琴协奏曲", "大提琴协奏曲", "Cello Concerto", "B 191", "S 76/1540", "Simrock 10548", "Victor DM 458"],
    "英雄交响曲": ["第三交响曲", "Eroica", "Sinfonia eroica", "Op.55", "ILB 274", "HCB C Md 44,2", "46066", "FRBNF37833140", "CHAX 112", "LX 532"],
    "第三交响曲": ["英雄交响曲", "Eroica", "Sinfonia eroica", "Op.55", "ILB 274", "HCB C Md 44,2", "1805-04-07", "46066", "FRBNF37833140"],
    "eroica": ["英雄交响曲", "第三交响曲", "Sinfonia eroica", "Op.55", "HCB C Md 44,2", "46066", "FRBNF37833140", "1936-05-22"],
    "sinfoniaeroica": ["Eroica", "英雄交响曲", "第三交响曲", "Op.55", "ILB 274"],
    "op55": ["英雄交响曲", "第三交响曲", "Eroica", "ILB 274", "HCB C Md 44,2", "46066", "FRBNF37833140"],
    "ilb274": ["英雄交响曲", "第三交响曲", "Eroica", "Op.55", "FRBNF13908221"],
    "frbnf13908221": ["英雄交响曲", "第三交响曲", "Eroica", "Op.55", "ILB 274"],
    "hcbcmd442": ["英雄交响曲", "Eroica", "Cianchettini & Sperati", "plate 27", "46066", "130 pages"],
    "46066": ["英雄交响曲", "Eroica", "Op.55", "HCB C Md 44,2", "Cianchettini & Sperati", "plate 27"],
    "pmlp02581": ["英雄交响曲", "Eroica", "Op.55", "46066"],
    "frbnf37833140": ["英雄交响曲", "Eroica", "Op.55", "CHAX 112", "LX 532", "1936-05-22"],
    "cb37833140k": ["FRBNF37833140", "英雄交响曲", "Eroica", "CHAX 112", "LX 532"],
    "chax112": ["英雄交响曲", "Eroica", "Op.55", "FRBNF37833140", "CHAX 123", "LX 532"],
    "lx532": ["英雄交响曲", "Eroica", "FRBNF37833140", "LX 537", "CHAX 112", "1936-05-22"],
    "19360522": ["英雄交响曲", "Eroica", "Op.55", "FRBNF37833140", "Grosser Musikvereinsaal"],
    "彼得鲁什卡": ["Petruška", "Petrushka", "Petrouchka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "FRBNF13919984", "FRBNF40990883", "FRBNF39684785", "RES-2248", "btv1b8415108j", "925571", "R.M.V. 127", "FRBNF37831942", "L 2173", "L 2175", "AX3867", "AX3872"],
    "petrushka": ["彼得鲁什卡", "Petruška", "Petrouchka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "FRBNF13919984", "FRBNF40990883", "FRBNF39684785", "925571", "R.M.V. 127", "FRBNF37831942", "L 2173", "AX3867"],
    "petrouchka": ["彼得鲁什卡", "Petruška", "Petrushka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "FRBNF13919984", "FRBNF40990883", "FRBNF39684785", "925571", "R.M.V. 127", "FRBNF37831942", "L 2173", "AX3867"],
    "petruška": ["彼得鲁什卡", "Petrushka", "Petrouchka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "FRBNF13919984", "FRBNF40990883", "FRBNF39684785", "925571", "R.M.V. 127", "FRBNF37831942", "L 2173", "AX3867"],
    "k012": ["彼得鲁什卡", "Petrushka", "Petrouchka", "W 18a", "FRBNF13919984", "925571", "FRBNF37831942"],
    "w18a": ["彼得鲁什卡", "Petruška", "Petrushka", "Petrouchka", "K012", "FRBNF13919984", "925571", "FRBNF37831942"],
    "frbnf13919984": ["彼得鲁什卡", "Petruška", "Petrushka", "W 18a", "K012", "1911-06-13", "1946", "1947"],
    "frbnf40990883": ["彼得鲁什卡", "Pétrouchka", "1911-06-13", "Ballets Russes", "RES-2248", "btv1b8415108j"],
    "frbnf39684785": ["彼得鲁什卡", "Petrouchka", "1911-06-13", "Théâtre du Châtelet", "Karsavina", "Nijinsky", "Monteux"],
    "925571": ["彼得鲁什卡", "Petrushka", "K012", "W 18a", "R.M.V. 127", "1912", "1913", "US-CAe"],
    "frbnf37831942": ["彼得鲁什卡", "Petrouchka", "Columbia L 2173", "Columbia L 2175", "AX3867", "AX3872"],
    "cb378319420": ["FRBNF37831942", "彼得鲁什卡", "Petrouchka", "L 2173", "L 2175", "AX3867", "AX3872"],
    "l2173": ["彼得鲁什卡", "Petrouchka", "FRBNF37831942", "L 2175", "AX3867", "AX3872"],
    "ax3867": ["彼得鲁什卡", "Petrouchka", "FRBNF37831942", "L 2173", "L 2175", "AX3872"],
    "btv1b8415108j": ["彼得鲁什卡", "Pétrouchka", "FRBNF40990883", "RES-2248", "1911-06-13"],
    "小提琴协奏曲": ["D 大调小提琴协奏曲", "Violin Concerto in D major", "Op.61", "FRBNF13908230", "1806-12-23", "Mus.Hs.17538", "Add MS 47851", "C 61/29", "C 61/40", "HCB Br 222", "NE 161", "HCB Mh 20", "HCB Mh 21", "HCB Mh 22", "387210", "Gb 19", "D.B. 990", "Fritz Kreisler", "Leo Blech", "8.110909"],
    "大调小提琴协奏曲": ["小提琴协奏曲", "Violin Concerto in D major", "Op.61", "FRBNF13908230", "1806-12-23", "Mus.Hs.17538", "Add MS 47851", "C 61/29", "C 61/40", "HCB Mh 20", "HCB Mh 21", "HCB Mh 22", "387210", "Gb 19", "Fritz Kreisler", "Leo Blech", "8.110909"],
    "violin concerto": ["D 大调小提琴协奏曲", "小提琴协奏曲", "Violin Concerto in D major", "Op.61", "FRBNF13908230", "1806-12-23", "Mus.Hs.17538", "Add MS 47851", "C 61/29", "C 61/40", "HCB Mh 20", "HCB Mh 21", "HCB Mh 22", "387210", "Gb 19", "Fritz Kreisler", "Leo Blech", "8.110909"],
    "op61": ["D 大调小提琴协奏曲", "Violin Concerto", "FRBNF13908230", "Mus.Hs.17538", "Add MS 47851", "C 61/29", "C 61/40", "HCB Br 222", "NE 161", "HCB Mh 20", "HCB Mh 21", "HCB Mh 22", "387210", "Gb 19", "8.110909"],
    "frbnf13908230": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "1806-12-23", "1808"],
    "mushs17538": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "387210", "A-Wn", "276 pages", "Österreichische Nationalbibliothek", "complete facsimile"],
    "addms47851": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "British Library", "copy with autograph annotations", "before August 1808", "missing opening leaf"],
    "c6129": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Bureau des Arts et d'Industrie", "plate 583", "99 images"],
    "c6140": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Clementi", "London", "1810", "29 pages", "32 images"],
    "hcbbr222": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Simrock", "1807-04-26", "publication proposal", "b0278"],
    "ne161": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Pleyel", "1807-04-26", "publication proposal", "b0277"],
    "hcbmh20": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "piano cadenza", "timpani", "ca.1809", "Beethoven 102 pag 17"],
    "hcbmh21": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Eingang von dem Andante zum Rondo", "ca.1809", "Beethoven 102 pag 22"],
    "hcbmh22": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Zweiter Eingang in's Thema vom Rondo", "ca.1809", "Beethvn 102 pag 25"],
    "387210": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Mus.Hs.17538", "A-Wn", "PMLP01796", "276 pages"],
    "pmlp01796": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Mus.Hs.17538", "387210"],
    "gb19": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Fritz Kreisler", "Leo Blech", "Electrola", "D.B. 990", "D.B. 995", "4-07981", "4-07992", "1926-12-14"],
    "gd1737": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Fritz Kreisler", "Leo Blech", "Electrola original album", "Gb 19"],
    "gd1272": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Fritz Kreisler", "Leo Blech", "Electrola", "BIEM", "after 1929", "Gb 19"],
    "db990": ["D 大调小提琴协奏曲", "Op.61", "Gb 19", "D.B. 995", "4-07981", "CwR 631", "Fritz Kreisler", "Leo Blech"],
    "407981": ["D 大调小提琴协奏曲", "Op.61", "Gb 19", "4-07992", "D.B. 990", "D.B. 995", "CwR 631", "CwR 642"],
    "8110909": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Fritz Kreisler", "Leo Blech", "Berlin State Opera Orchestra", "Naxos Historical", "1926", "2000"],
    "fritzkreisler": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Leo Blech", "Berlin State Opera Orchestra", "8.110909", "1926"],
    "leoblech": ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "Fritz Kreisler", "Berlin State Opera Orchestra", "8.110909", "1926"]
  });

  const personInlineAliases = Object.freeze({
    busoni: Object.freeze({
      "布索尼小提琴协奏曲": Object.freeze(["Konzert für die Violine mit Orchester", "Violin Concerto in D major", "Op.35a", "K 243", "BV 243", "E0400469", "GND 300338821", "1897-10-08", "Berliner Sing-Akademie", "Henri Petri", "Part.B.1407", "178701", "Sibley 1802/18915", "CHSA 5333", "Francesca Dego", "Dalia Stasevska", "BBC Symphony Orchestra"]),
      "Violin Concerto in D major": Object.freeze(["布索尼小提琴协奏曲", "Konzert für die Violine mit Orchester", "Op.35a", "K 243", "BV 243", "E0400469", "1897-10-08", "Part.B.1407", "178701", "CHSA 5333"]),
      "Op.35a": Object.freeze(["布索尼小提琴协奏曲", "Violin Concerto in D major", "K 243", "BV 243", "E0400469", "178701", "CHSA 5333"]),
      "K 243": Object.freeze(["布索尼小提琴协奏曲", "Violin Concerto in D major", "Op.35a", "BV 243", "E0400469", "178701", "CHSA 5333"])
    }),
    debussy: Object.freeze({
      "德彪西弦乐四重奏": Object.freeze(["G 小调弦乐四重奏", "String Quartet in G minor", "Quatuor à cordes", "FL 91", "FL 85", "1893-12-29", "Quatuor Ysaÿe", "11939", "D. & F. 4738", "FRBNF13911421", "FRBNF37824471", "D15085", "D15088", "LX 427", "LX 434", "NUMAUD-1082690", "bpt6k1082690g"]),
      "G 小调弦乐四重奏": Object.freeze(["德彪西弦乐四重奏", "String Quartet in G minor", "Quatuor à cordes", "FL 91", "FL 85", "1893-12-29", "Quatuor Ysaÿe", "11939", "D. & F. 4738", "FRBNF13911421", "FRBNF37824471", "D15085", "D15088", "LX 427", "LX 434", "NUMAUD-1082690", "bpt6k1082690g"]),
      "String Quartet in G minor": Object.freeze(["德彪西弦乐四重奏", "G 小调弦乐四重奏", "Quatuor à cordes", "FL 91", "FL 85", "1893-12-29", "Quatuor Ysaÿe", "11939", "D. & F. 4738", "FRBNF13911421", "FRBNF37824471", "D15085", "D15088", "LX 427", "LX 434", "NUMAUD-1082690", "bpt6k1082690g"]),
      "游戏": Object.freeze(["Jeux", "poème dansé", "CD 133", "FL 133", "FL 126", "1913-05-15", "Théâtre des Champs-Élysées", "Vaslav Nijinsky", "Pierre Monteux", "FRBNF13911402", "FRBNF40175015", "FRBNF39615654", "15762", "D. & F. 8958", "FRBNF38088447", "C 30 A 294", "Manuel Rosenthal"]),
      "Jeux": Object.freeze(["德彪西游戏", "游戏", "poème dansé", "CD 133", "FL 133", "FL 126", "1913-05-15", "FRBNF13911402", "FRBNF40175015", "FRBNF39615654", "15762", "D. & F. 8958", "FRBNF38088447", "C 30 A 294"]),
      "CD 133": Object.freeze(["德彪西游戏", "游戏", "Jeux", "FL 133", "FL 126", "FRBNF13911402", "15762", "D. & F. 8958", "FRBNF38088447"])
    }),
    mahler: Object.freeze({
      "第五交响曲": Object.freeze(["马勒第五交响曲", "Symphony No. 5", "Symphony No.5", "GMW 44", "IGM 11", "Cary 509", "Record 115214", "V-001-002141", "1904-10-18", "Gürzenich", "Concert-Gesellschaft Köln", "C. F. Peters", "plate 8951", "111956", "EP 10800", "FRBNF38483090", "cb38483090b", "Harmonia mundi 1955179", "Hermann Scherchen", "Orchestre national de l'ORTF"]),
      "Symphony No. 5": Object.freeze(["马勒第五交响曲", "第五交响曲", "GMW 44", "IGM 11", "Cary 509", "Record 115214", "V-001-002141", "1904-10-18", "111956", "plate 8951", "EP 10800", "FRBNF38483090", "1955179"]),
      "GMW 44": Object.freeze(["马勒第五交响曲", "第五交响曲", "Symphony No. 5", "IGM 11", "Cary 509", "Record 115214", "V-001-002141", "111956", "EP 10800", "FRBNF38483090"]),
      "V-001-002141": Object.freeze(["马勒第五交响曲", "第五交响曲", "Symphony No. 5", "GMW 44", "1904-10-18", "Gürzenich", "Concert-Gesellschaft Köln", "Gürzenich-Orchester"])
    }),
    stravinsky: Object.freeze({
      "随想曲": Object.freeze(["Capriccio", "Capriccio for Piano and Orchestra", "K050", "IIS 82", "50-1", "50-2", "50-3", "R.M.V. 470", "R.M.V. 502", "Exemplaire corrigé", "756428", "50-4", "50-5", "50-6", "B. & H. 16990", "H.P.S. 610", "WLX1353", "1930-05-08", "six-side plan"]),
      "Capriccio": Object.freeze(["随想曲", "Capriccio for Piano and Orchestra", "K050", "IIS 82", "50-1", "50-2", "50-3", "R.M.V. 470", "R.M.V. 502", "Exemplaire corrigé", "756428", "50-4", "50-5", "50-6", "B. & H. 16990", "H.P.S. 610", "WLX1353", "1930-05-08", "six-side plan"]),
      "K050": Object.freeze(["随想曲", "Capriccio", "IIS 82", "50-1", "50-2", "50-3", "R.M.V. 470", "R.M.V. 502", "756428", "50-4", "50-5", "50-6", "B. & H. 16990", "H.P.S. 610", "WLX1353"]),
      "50-1": Object.freeze(["随想曲", "Capriccio", "K050", "R.M.V. 470", "50-2", "50-3", "Exemplaire corrigé"]),
      "50-2": Object.freeze(["随想曲", "Capriccio", "K050", "R.M.V. 470", "50-1", "23 corrections", "Errata"]),
      "50-3": Object.freeze(["随想曲", "Capriccio", "K050", "R.M.V. 502", "756428", "155 errors"]),
      "50-4": Object.freeze(["随想曲", "Capriccio", "K050", "B. & H. 16990", "1949", "1952"]),
      "50-5": Object.freeze(["随想曲", "Capriccio", "K050", "H.P.S. 610", "1949", "1952"]),
      "50-6": Object.freeze(["随想曲", "Capriccio", "K050", "1949", "1952", "840552", "B & H 17167"]),
      "春之祭": Object.freeze(["The Rite of Spring", "Le Sacre du printemps", "K015", "W 21", "MS-20648", "FRBNF42661447", "MS-20644", "FRBNF42663730", "M1523.S92 S2", "FRBNF39684784", "15-1", "15-2", "15-3", "15-4", "15-5", "15-6", "R.M.V. 196", "R.M.V. 197", "R.M.V. 197b", "FRBNF43287612", "858822", "15-13", "15-14", "15-15", "B. & H. 16333", "H.P.S. 638", "1928-06-27", "1940-04-19", "1960-01-05", "FRBNF48516607"]),
      "The Rite of Spring": Object.freeze(["春之祭", "Le Sacre du printemps", "K015", "W 21", "MS-20648", "MS-20644", "M1523.S92 S2", "FRBNF39684784", "15-1", "15-5", "15-15", "FRBNF43287612", "858822", "FRBNF48516607"]),
      "Le Sacre du printemps": Object.freeze(["春之祭", "The Rite of Spring", "K015", "W 21", "MS-20648", "MS-20644", "M1523.S92 S2", "FRBNF39684784", "15-1", "15-5", "15-15", "FRBNF43287612", "858822", "FRBNF48516607"]),
      "K015": Object.freeze(["春之祭", "The Rite of Spring", "Le Sacre du printemps", "W 21", "MS-20648", "MS-20644", "15-1", "15-2", "15-3", "15-4", "15-5", "15-6", "R.M.V. 196", "R.M.V. 197", "R.M.V. 197b", "FRBNF43287612", "858822", "15-13", "15-14", "15-15", "B. & H. 16333", "H.P.S. 638"]),
      "MS-20648": Object.freeze(["春之祭", "The Rite of Spring", "Le Sacre du printemps", "K015", "FRBNF42661447", "自笔草稿", "seven notebooks", "150 pages"]),
      "MS-20644": Object.freeze(["春之祭", "The Rite of Spring", "Le Sacre du printemps", "K015", "FRBNF42663730", "Part I", "Introduction", "46 pages"]),
      "15-1": Object.freeze(["春之祭", "The Rite of Spring", "K015", "R.M.V. 196", "1913", "four-hand reduction"]),
      "15-2": Object.freeze(["春之祭", "The Rite of Spring", "K015", "R.M.V. 196", "1914", "corrected edition"]),
      "15-3": Object.freeze(["春之祭", "The Rite of Spring", "K015", "R.M.V. 197", "1921", "1922", "full score"]),
      "15-4": Object.freeze(["春之祭", "The Rite of Spring", "K015", "R.M.V. 197b", "1922", "pocket score"]),
      "15-5": Object.freeze(["春之祭", "The Rite of Spring", "K015", "Errata", "3 pages", "79 entries", "Full Score first copy ambiguity"]),
      "15-6": Object.freeze(["春之祭", "The Rite of Spring", "K015", "R.M.V. 197b", "1924", "pocket score reprint"]),
      "15-13": Object.freeze(["春之祭", "The Rite of Spring", "K015", "Danse sacrale", "1943 revision", "1945", "Associated Music Publishers"]),
      "15-14": Object.freeze(["春之祭", "The Rite of Spring", "K015", "1948", "B. & H. 16333", "H.P.S. 638", "pocket score"]),
      "15-15": Object.freeze(["春之祭", "The Rite of Spring", "K015", "1948", "B. & H. 16333", "revised full score"]),
      "FRBNF43287612": Object.freeze(["春之祭", "The Rite of Spring", "K015", "1921", "139 pages", "F. H. Schneider", "IFN-10862562", "858822"]),
      "彼得鲁什卡": Object.freeze(["Petruška", "Petrushka", "Petrouchka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "FRBNF13919984", "FRBNF40990883", "FRBNF39684785", "RES-2248", "btv1b8415108j", "925571", "R.M.V. 127", "FRBNF37831942", "L 2173", "L 2175", "AX3867", "AX3872"]),
      "Petrushka": Object.freeze(["彼得鲁什卡", "Petruška", "Petrouchka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "FRBNF13919984", "FRBNF40990883", "FRBNF39684785", "RES-2248", "btv1b8415108j", "925571", "R.M.V. 127", "FRBNF37831942", "L 2173", "L 2175", "AX3867", "AX3872"]),
      "Petrouchka": Object.freeze(["彼得鲁什卡", "Petruška", "Petrushka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "FRBNF13919984", "FRBNF40990883", "FRBNF39684785", "RES-2248", "btv1b8415108j", "925571", "R.M.V. 127", "FRBNF37831942", "L 2173", "L 2175", "AX3867", "AX3872"]),
      "Petruška": Object.freeze(["彼得鲁什卡", "Petrushka", "Petrouchka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "FRBNF13919984", "FRBNF40990883", "FRBNF39684785", "RES-2248", "btv1b8415108j", "925571", "R.M.V. 127", "FRBNF37831942", "L 2173", "L 2175", "AX3867", "AX3872"]),
      "诗篇交响曲": Object.freeze(["Symphony of Psalms", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "1930-12-13", "Palais des Beaux-Arts", "Ernest Ansermet", "Serge Koussevitzky", "Boston Symphony Orchestra", "907486", "PMLP1198805", "R.M.V. 517", "R.M.V. 561", "B. & H. 16328", "FRBNF38385942", "cb383859428", "Columbia album 162", "LFX 179", "LFX 181", "LX 1500", "LX 1505"]),
      "Symphony of Psalms": Object.freeze(["诗篇交响曲", "Symphonie de Psaumes", "K052", "IIS 71", "W 60", "1930-12-13", "907486", "R.M.V. 517", "B. & H. 16328", "FRBNF38385942", "Columbia album 162", "LFX 179", "LX 1500"]),
      "Symphonie de Psaumes": Object.freeze(["诗篇交响曲", "Symphony of Psalms", "K052", "IIS 71", "W 60", "1930-12-13", "907486", "R.M.V. 517", "FRBNF38385942", "LFX 179", "LX 1500"]),
      "K052": Object.freeze(["诗篇交响曲", "Symphony of Psalms", "Symphonie de Psaumes", "IIS 71", "1930-12-13", "907486", "R.M.V. 517", "B. & H. 16328", "FRBNF38385942"])
    }),
    dvorak: Object.freeze({
      "水仙女": Object.freeze(["Rusalka", "露莎卡", "Op.114", "B.203", "1901-03-31", "Národní divadlo", "National Theatre", "Karel Kovařovic", "Robert Polák", "Růžena Maturová", "Bohumil Pták", "27706", "27707", "27708", "PMLP25047", "OM 2905", "BA 10438", "SU 3718-2", "Gabriela Beňačková", "Václav Neumann"]),
      "Rusalka": Object.freeze(["水仙女", "露莎卡", "Op.114", "B.203", "1901-03-31", "Národní divadlo", "Karel Kovařovic", "27706", "27707", "27708", "PMLP25047", "OM 2905", "BA 10438", "SU 3718-2", "Gabriela Beňačková", "Václav Neumann"]),
      "Op.114": Object.freeze(["水仙女", "Rusalka", "B.203", "1901-03-31", "27706", "27707", "27708", "OM 2905", "BA 10438", "SU 3718-2"]),
      "B.203": Object.freeze(["水仙女", "Rusalka", "Op.114", "1901-03-31", "27706", "27707", "27708", "OM 2905", "SU 3718-2"])
    }),
    beethoven: Object.freeze({
      "D 大调小提琴协奏曲": Object.freeze(["小提琴协奏曲", "Violin Concerto in D major", "Violin Concerto", "Op.61", "FRBNF13908230", "1806-12-23", "Mus.Hs.17538", "Add MS 47851", "C 61/29", "plate 583", "C 61/40", "HCB Br 222", "NE 161", "HCB Mh 20", "HCB Mh 21", "HCB Mh 22", "387210", "PMLP01796", "Gb 19", "Gd 1737", "Gd 1272", "D.B. 990", "D.B. 995", "Fritz Kreisler", "Leo Blech", "Berlin State Opera Orchestra", "8.110909"]),
      "小提琴协奏曲": Object.freeze(["D 大调小提琴协奏曲", "Violin Concerto in D major", "Violin Concerto", "Op.61", "FRBNF13908230", "1806-12-23", "Mus.Hs.17538", "Add MS 47851", "C 61/29", "C 61/40", "HCB Br 222", "NE 161", "HCB Mh 20", "HCB Mh 21", "HCB Mh 22", "387210", "PMLP01796", "Gb 19", "D.B. 990", "D.B. 995", "Fritz Kreisler", "Leo Blech", "8.110909"]),
      "Violin Concerto in D major": Object.freeze(["D 大调小提琴协奏曲", "小提琴协奏曲", "Violin Concerto", "Op.61", "FRBNF13908230", "1806-12-23", "Mus.Hs.17538", "Add MS 47851", "C 61/29", "C 61/40", "HCB Mh 20", "HCB Mh 21", "HCB Mh 22", "387210", "Gb 19", "Fritz Kreisler", "Leo Blech", "8.110909"]),
      "Violin Concerto": Object.freeze(["D 大调小提琴协奏曲", "小提琴协奏曲", "Violin Concerto in D major", "Op.61", "FRBNF13908230", "Mus.Hs.17538", "Add MS 47851", "C 61/29", "C 61/40", "HCB Mh 20", "HCB Mh 21", "HCB Mh 22", "387210", "Gb 19", "Fritz Kreisler", "Leo Blech", "8.110909"]),
      "Add MS 47851": Object.freeze(["D 大调小提琴协奏曲", "Op.61", "British Library", "copy with autograph annotations", "before August 1808", "missing opening leaf"]),
      "HCB Mh 20": Object.freeze(["D 大调小提琴协奏曲", "Op.61", "钢琴版华彩", "定音鼓", "约 1809", "Beethoven 102 pag 17"]),
      "HCB Mh 21": Object.freeze(["D 大调小提琴协奏曲", "Op.61", "Eingang von dem Andante zum Rondo", "约 1809", "Beethoven 102 pag 22"]),
      "HCB Mh 22": Object.freeze(["D 大调小提琴协奏曲", "Op.61", "Zweiter Eingang in's Thema vom Rondo", "约 1809", "Beethvn 102 pag 25"]),
      "C 61/40": Object.freeze(["D 大调小提琴协奏曲", "Op.61", "Clementi", "London", "1810", "29 pages", "32 images"]),
      "Gb 19": Object.freeze(["D 大调小提琴协奏曲", "Op.61", "Fritz Kreisler", "Leo Blech", "Electrola", "D.B. 990", "D.B. 995", "4-07981", "4-07992", "1926-12-14"]),
      "第九交响曲": Object.freeze(["贝多芬第九交响曲", "Symphony No. 9 in D minor", "Beethoven Ninth", "Op.125", "1824-05-07", "Kärntnertortheater", "Mus.ms.autogr. Beethoven, L. v. 35, 78a", "Mus.ms.autogr. Beethoven, L. v. 2", "Artaria 204", "PPN756658373", "HCB Mh 2", "HCB BMh 5/45", "HCB Mh 28", "HCB C Md 6", "Beeth.MS. 43", "46254", "FRBNF38127570"]),
      "Symphony No. 9": Object.freeze(["贝多芬第九交响曲", "第九交响曲", "Symphony No. 9 in D minor", "Op.125", "Kärntnertortheater", "Artaria 204", "PPN756658373", "HCB Mh 2", "HCB Mh 28", "HCB C Md 6", "46254", "FRBNF38127570"]),
      "Op.125": Object.freeze(["贝多芬第九交响曲", "第九交响曲", "Symphony No. 9 in D minor", "1824-05-07", "Kärntnertortheater", "Mus.ms.autogr. Beethoven, L. v. 2", "Artaria 204", "PPN756658373", "HCB Mh 2", "HCB Mh 28", "HCB C Md 6", "46254", "FRBNF38127570"])
    })
  });

  const personQueryTerms = Object.freeze({
    busoni: ["费鲁乔", "布索尼", "busoni"],
    debussy: ["克洛德", "德彪西", "debussy"],
    schoenberg: ["阿诺尔德", "勋伯格", "schoenberg"],
    mahler: ["古斯塔夫", "马勒", "mahler"],
    stravinsky: ["伊戈尔", "斯特拉文斯基", "stravinsky"],
    dvorak: ["安东宁", "德沃夏克", "dvorak"],
    beethoven: ["路德维希", "贝多芬", "beethoven", "ludwig van beethoven"]
  });

  const answerabilityRules = Object.freeze([
    Object.freeze({
      topicId: "personality",
      patterns: [/性格|人格|心理|气质|为人|个性|personality|character|temperament|psychology|psychological/],
      reason: "当前证据库没有足以支持整体性格或心理判断的独立材料；只能报告有明确来源的自我呈现、传记描述或同时代见证，不能把它们合成为人格结论。",
      nextHumanAction: "人工按时期对读书信、日记、同时代见证和传记编者说明，并为每条材料登记来源角色、页码、版本和复核人后再回答。"
    }),
    Object.freeze({
      topicId: "full-correspondence",
      patterns: [/全部书信|全部通信|完整通信|通信全集|全套书信|allcorrespondence|fullcorrespondence|completecorrespondence/],
      reason: "当前只完成有边界的通信抽读或选本阅读，不能声称覆盖人物全部通信。",
      nextHumanAction: "先确定通信全集、馆藏范围、编校版本和缺失件，再逐封建立可回链的人工阅读队列。"
    })
  ]);

  function answerabilityFor(query) {
    const value = String(query || "").toLocaleLowerCase("zh-CN");
    const rule = answerabilityRules.find((candidate) => candidate.patterns.some((pattern) => pattern.test(value)));
    return rule ? { status: "not_answerable", topicId: rule.topicId, reason: rule.reason, nextHumanAction: rule.nextHumanAction } : { status: "answerable", topicId: null, reason: null, nextHumanAction: null };
  }

  function comparisonRequested(query) {
    return /比较|对照|差异|区别|异同|compare|comparison|contrast|difference/i.test(String(query || ""));
  }

  function queryTerms(query, personId = null) {
    const raw = String(query || "").toLocaleLowerCase("zh-CN");
    const ignoredTerms = new Set([...retrievalGenericTerms, ...(personQueryTerms[personId] || [])]);
    const rawTerms = [
      ...(raw.match(/[\u4e00-\u9fff]{2,}/g) || []),
      ...(raw.match(/\bgmw\s*\d+(?:-[a-z])?\b/gi) || []),
      ...(raw.match(/[a-z][a-z0-9-]{2,}/gi) || [])
    ];
    const personNeedles = personQueryTerms[personId] || [];
    const terms = rawTerms
      .map((term) => personNeedles.reduce((value, needle) => value.replaceAll(needle.toLocaleLowerCase("zh-CN"), ""), term.trim()).replace(/^(?:的|与|和|及|关于|对|把)+/g, "").replace(/(?:的|与|和|及)+$/g, ""))
      .filter((term) => term.length >= 2 && !ignoredTerms.has(term));
    const expanded = [];
    for (const term of terms) expanded.push(term, ...(retrievalAliases[term] || retrievalAliases[normalize(term)] || []));
    const normalizedQuery = normalize(query);
    for (const [alias, expansions] of Object.entries(personInlineAliases[personId] || {})) {
      if (normalizedQuery.includes(normalize(alias))) expanded.push(alias, ...expansions);
    }
    return [...new Set(expanded)];
  }

  function workAliasScopeTerms(query) {
    const normalizedQuery = normalize(query);
    const scoped = [];
    for (const [alias, expansions] of Object.entries(retrievalAliases)) {
      const normalizedAlias = normalize(alias);
      if (normalizedAlias && normalizedQuery.includes(normalizedAlias)) scoped.push(alias, ...expansions);
    }
    return [...new Set(scoped)];
  }

  function retrievalCorpus(item) {
    return compact([item.id, item.claim, item.sourceLabel, item.sourceRef, item.locator].join(" "));
  }

  function retrievalScore(item, terms, query, kind) {
    const corpus = retrievalCorpus(item);
    const compactId = compact(item.id);
    const compactRef = compact(item.sourceRef);
    const identityCorpus = compact([item.id, item.sourceLabel, item.locator].join(" "));
    let score = 0;
    let matchedTerm = false;
    for (const term of terms) {
      const needle = compact(term);
      if (!needle || needle.length < 2 || !corpus.includes(needle)) continue;
      matchedTerm = true;
      score += compactId.includes(needle) || compactRef.includes(needle) ? 12 : 6;
      if (/[0-9-]/.test(needle)) score += 6;
    }
    const normalizedQuery = normalize(query);
    const scoreQuery = /乐谱|总谱|声乐谱|钢琴谱|score|partitur/.test(normalizedQuery);
    if (matchedTerm && kind === "works" && /score-file-candidate|holograph-score-file-candidate|verified-score-file-object/.test(item.kind || "") && scoreQuery) score += 8;
    if (matchedTerm && kind === "works" && /^imslp:/i.test(item.sourceRef || "") && scoreQuery) score += 4;
    if (matchedTerm && kind === "works" && /声乐谱|钢琴缩编|vocalscore|klavierauszug/.test(normalizedQuery) && /声乐谱|vocalscore|klavierauszug/.test(identityCorpus)) score += 10;
    if (matchedTerm && kind === "works" && /管弦总谱|fullscore|partitur/.test(normalizedQuery) && /管弦总谱|fullscore|partitur/.test(identityCorpus)) score += 10;
    return score;
  }

  function workPathEvidenceScope(personId, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery || !personId || !workPaths.length) return null;
    const candidates = workPaths
      .filter((path) => path.personId === personId)
      .map((path) => {
        let score = 0;
        const titleValues = [path.title, path.originalTitle].map(normalize).filter((value) => value.length >= 3);
        const numberValues = (path.workNumbers || []).map(normalize).filter((value) => value.length >= 3);
        const keywordValues = (path.keywords || []).map(normalize).filter((value) => value.length >= 4);
        if (titleValues.some((value) => normalizedQuery.includes(value))) score += 120;
        for (const value of numberValues) {
          if (normalizedQuery.includes(value)) score += /\d/.test(value) ? 70 : 30;
        }
        for (const value of keywordValues) {
          if (!normalizedQuery.includes(value)) continue;
          score += /\d/.test(value) ? 45 : value.length >= 8 ? 24 : 12;
        }
        return { path, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);
    if (!candidates.length) return null;
    const [best, second] = candidates;
    if (second && second.score >= best.score * 0.72) return null;
    const evidenceIds = new Set(best.path.evidenceRefs || []);
    return evidenceIds.size ? evidenceIds : null;
  }

  function retrieveEvidence(items, query, kind, personId = null) {
    const terms = queryTerms(query, personId);
    const ranked = (items || []).map((item, index) => ({ item, index, score: retrievalScore(item, terms, query, kind) }));
    if (terms.length && !ranked.some((entry) => entry.score > 0)) return [];
    const positive = ranked.filter((entry) => !terms.length || entry.score > 0);
    const pathEvidenceIds = ["works", "recording"].includes(kind) ? workPathEvidenceScope(personId, query) : null;
    const pathScoped = pathEvidenceIds ? positive.filter((entry) => pathEvidenceIds.has(entry.item.id)) : [];
    if (pathScoped.length) {
      return pathScoped
        .sort((left, right) => right.score - left.score || left.index - right.index)
        .map((entry) => entry.item);
    }
    const scopedTerms = ["works", "recording"].includes(kind) ? workAliasScopeTerms(query) : [];
    const workScoped = scopedTerms.length
      ? positive.filter((entry) => scopedTerms.some((term) => retrievalCorpus(entry.item).includes(compact(term))))
      : positive;
    const selected = workScoped.length ? workScoped : positive;
    return selected
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .map((entry) => entry.item);
  }

  function compact(value) {
    return String(value || "").toLocaleLowerCase("zh-CN").replace(/[\s·—–_，。、《》“”'"()（）:：.;,!?！？#]/g, "");
  }

  function locatorCandidates(locator) {
    const value = String(locator || "").trim();
    const candidates = new Set(value ? [value] : []);
    for (const token of value.match(/(?:PDF\s*)?p{1,2}\.??\s*\d+(?:\s*[—–-]\s*\d+)?/gi) || []) candidates.add(token);
    for (const token of value.match(/\b(?:DOI|ID|URN|file|No\.)\s*[:#]?\s*[\w.-]+/gi) || []) candidates.add(token);
    return [...candidates].filter(Boolean);
  }

  function answerContains(value, needle) {
    const answer = String(value || "");
    const rawNeedle = String(needle || "").trim();
    return Boolean(rawNeedle && (answer.toLocaleLowerCase("zh-CN").includes(rawNeedle.toLocaleLowerCase("zh-CN")) || compact(answer).includes(compact(rawNeedle))));
  }

  function validationFailure(reason, extra = {}) {
    return { valid: false, reason, citedSourceRefs: [], citedLocators: [], ...extra };
  }

  function parseStructuredAnswer(answer) {
    const text = String(answer || "").trim();
    if (!text) return null;
    const candidate = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    if (!candidate.startsWith("{")) return null;
    try {
      return JSON.parse(candidate);
    } catch {
      return { __parseError: true };
    }
  }

  function validateStructuredAnswer(payload, context) {
    if (!payload || payload.__parseError) return validationFailure("invalid-structured-answer", { structured: true });
    const answerText = typeof payload.answer === "string" ? payload.answer.trim() : "";
    const claims = Array.isArray(payload.claims) ? payload.claims : [];
    if (!answerText) return validationFailure("structured-answer-missing-answer", { structured: true });
    const evidence = Array.isArray(context?.evidence) ? context.evidence : [];
    if (context?.exposure === "public" && evidence.some((item) => !isPublicEvidence(item))) {
      return validationFailure("private-evidence-in-public-context", { structured: true });
    }
    if (payload.status === "not_answerable") {
      if (context?.answerability?.status !== "not_answerable") return validationFailure("not-answerable-status-without-boundary", { structured: true });
      if (claims.length) return validationFailure("not-answerable-must-have-no-claims", { structured: true });
      return {
        valid: true,
        reason: "not-answerable-boundary",
        structured: true,
        answerText,
        claims: [],
        citedEvidenceIds: [],
        citedSourceRefs: [],
        citedLocators: []
      };
    }
    if (!claims.length || claims.length > 20) return validationFailure("structured-answer-invalid-claims", { structured: true });
    const evidenceById = new Map(evidence.map((item) => [item.id, item]));
    const citedEvidenceIds = [];
    const citedSourceRefs = [];
    const citedLocators = [];
    const normalizedClaims = [];

    for (const claim of claims) {
      const claimText = typeof claim?.text === "string" ? claim.text.trim() : "";
      const citations = Array.isArray(claim?.citations) ? claim.citations : [];
      const supportingPhrases = Array.isArray(claim?.supportingPhrases) ? claim.supportingPhrases : [];
      if (!claimText || !answerContains(answerText, claimText)) return validationFailure("structured-claim-not-in-answer", { structured: true });
      if (!citations.length) return validationFailure("structured-claim-missing-citation", { structured: true });
      const supportByEvidenceId = new Map();
      for (const support of supportingPhrases) {
        const evidenceId = String(support?.evidenceId || "").trim();
        const phrase = String(support?.phrase || "").trim();
        if (!evidenceId || phrase.length < 3 || supportByEvidenceId.has(evidenceId)) continue;
        supportByEvidenceId.set(evidenceId, phrase);
      }
      const normalizedCitations = [];
      for (const citation of citations) {
        const evidenceId = String(citation?.evidenceId || "").trim();
        const item = evidenceById.get(evidenceId);
        if (!item) return validationFailure("structured-claim-unknown-evidence-id", { structured: true, evidenceId });
        if (String(citation?.sourceRef || "") !== String(item.sourceRef || "")) return validationFailure("structured-citation-sourceRef-mismatch", { structured: true, evidenceId });
        if (String(citation?.locator || "") !== String(item.locator || "")) return validationFailure("structured-citation-locator-mismatch", { structured: true, evidenceId });
        if (!item.sourceRef || !item.locator || !item.verification) return validationFailure("structured-citation-unverified-evidence", { structured: true, evidenceId });
        const phrase = supportByEvidenceId.get(evidenceId);
        if (!phrase || (!answerContains(item.claim, phrase) && !answerContains(item.boundary, phrase))) return validationFailure("structured-supporting-phrase-mismatch", { structured: true, evidenceId });
        citedEvidenceIds.push(evidenceId);
        citedSourceRefs.push(item.sourceRef);
        citedLocators.push(item.locator);
        normalizedCitations.push({ evidenceId, sourceRef: item.sourceRef, locator: item.locator });
      }
      normalizedClaims.push({ text: claimText, citations: normalizedCitations });
    }

    return {
      valid: true,
      reason: null,
      structured: true,
      answerText,
      claims: normalizedClaims,
      citedEvidenceIds: [...new Set(citedEvidenceIds)],
      citedSourceRefs: [...new Set(citedSourceRefs)],
      citedLocators: [...new Set(citedLocators)]
    };
  }

  function validateModelAnswer(answer, context, options = {}) {
    const text = String(answer || "").trim();
    if (!text) return validationFailure("empty-answer");
    const structured = parseStructuredAnswer(text);
    if (structured) return validateStructuredAnswer(structured, context);
    if (options.requireStructuredClaims) return validationFailure("structured-claims-required", { structured: false });
    const evidence = Array.isArray(context?.evidence) ? context.evidence : [];
    if (context?.exposure === "public" && evidence.some((item) => !isPublicEvidence(item))) return validationFailure("private-evidence-in-public-context");
    const citedItems = evidence.filter((item) => answerContains(text, item.sourceRef));
    if (!citedItems.length) return validationFailure("missing-sourceRef");
    const locatedItems = citedItems.filter((item) => locatorCandidates(item.locator).some((candidate) => answerContains(text, candidate)));
    if (!locatedItems.length) {
      return validationFailure("missing-locator", { citedSourceRefs: citedItems.map((item) => item.sourceRef) });
    }
    return {
      valid: true,
      reason: null,
      structured: false,
      citedSourceRefs: [...new Set(locatedItems.map((item) => item.sourceRef))],
      citedLocators: [...new Set(locatedItems.flatMap((item) => locatorCandidates(item.locator)))]
    };
  }

  function classifyEvidenceLayer(item) {
    const value = [item?.claimOrigin, item?.kind, item?.sourceLabel, item?.track]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("zh-CN");
    const isInstitutionalRecord = /institutional|catalog|catalogue|finding.?aid|archive|database|metadata|reuse.?policy|score.?file|sound.?catalog|discograph|edition.?lead|file.?candidate|modern.?edition.?boundary|digital.?research.?platform/.test(value);
    if (isInstitutionalRecord) return "record";
    const isMediatedSecondary = /secondary|scholar|biograph|critical|analysis|history|corroboration|reference|textbook|translation|mediated|via.?secondary|modern.?musicology/.test(value);
    if (/witness|contemporary.?witness/.test(value) && !isMediatedSecondary) return "original";
    if (isMediatedSecondary) return "scholar";
    if (/primary|self|autobiograph|correspondence|letter|original|digital.?edition|public.?text/.test(value)) return "original";
    return "unclassified";
  }

  function safeEvidence(item) {
    return {
      id: item.id,
      track: item.track,
      kind: item.kind,
      claim: item.claim,
      boundary: item.boundary,
      sourceRef: item.sourceRef,
      sourceLabel: item.sourceLabel,
      locator: item.locator,
      visibility: item.visibility,
      sourceUrl: item.visibility === "private-research" ? null : (item.sourceUrl || null),
      verification: item.verification || null,
      claimOrigin: item.claimOrigin || null,
      evidenceLayer: classifyEvidenceLayer(item),
      humanReviewed: item.humanReviewed === true,
      aiGenerated: item.aiGenerated === true
    };
  }

  function isPublicEvidence(item) {
    return item?.visibility === "public-link" || item?.visibility === "public-bibliography";
  }

  function publicEvidenceOnly(items) {
    return (items || []).filter(isPublicEvidence).map(safeEvidence);
  }

  function comparisonGroupFor(item) {
    const value = [item?.kind, item?.sourceRef, item?.sourceLabel, item?.claim]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("zh-CN");
    if (/score.?file|holograph|imslp:|谱本|扫描|file.?candidate/.test(value)) {
      return { id: "score-candidate", label: "谱本 / 扫描候选层" };
    }
    if (/works-and-versions|institutional-work|primary-digital-item|版本|首版|刻版|手稿|work.?catalogue/.test(value)) {
      return { id: "work-version", label: "作品 / 版本记录层" };
    }
    if (/performance-and-recordings|recording|sound-catalogue/.test(value)) {
      return { id: "recording", label: "表演 / 录音目录层" };
    }
    return { id: "other", label: "相关证据层" };
  }

  function buildComparison(query, kind, evidence) {
    if (!comparisonRequested(query)) {
      return Object.freeze({ enabled: false, mode: "none", groups: [], boundary: null, nextHumanAction: null });
    }
    const grouped = new Map();
    for (const item of evidence || []) {
      const group = comparisonGroupFor(item);
      if (!grouped.has(group.id)) grouped.set(group.id, { ...group, evidence: [] });
      grouped.get(group.id).evidence.push({
        evidenceId: item.id,
        sourceRef: item.sourceRef,
        sourceLabel: item.sourceLabel,
        locator: item.locator
      });
    }
    const groups = [...grouped.values()]
      .filter((group) => group.evidence.length)
      .map((group) => Object.freeze({
        id: group.id,
        label: group.label,
        evidence: Object.freeze(group.evidence.map((entry) => Object.freeze(entry)))
      }));
    const enabled = kind === "works" && groups.length >= 2;
    return Object.freeze({
      enabled,
      mode: enabled ? "evidence-boundary" : "insufficient-evidence-groups",
      groups: Object.freeze(groups),
      boundary: enabled
        ? "当前比较只把不同来源层的可回链对象并列展示；它不等于已经逐页核对谱面、确认修订因果或取得任何扫描/托管许可。"
        : "当前命中的公开证据不足以形成两个可区分的比较对象；不生成确定性的版本差异结论。",
      nextHumanAction: enabled
        ? "人工打开各组 sourceRef 对应对象，逐页记录版次、修订、编排、扫描层和地域权利，形成同一作品的对照表。"
        : "先补充两个明确的作品/版本、录音载体或机构对象标识，再建立逐项比较记录。"
    });
  }

  function promptFor(context) {
    const evidenceBlock = context.evidence.length
      ? context.evidence.map((item) => `- ${item.claim} [层级：${item.evidenceLayer}; ${item.sourceRef}; ${item.locator}; ${item.visibility}]`).join("\n")
      : "- 没有与问题直接匹配的证据卡。";
    return [
      "你是一个来源约束的西方音乐史研究助手，不冒充音乐家本人，不做心理诊断。",
      `人物：${context.personId}；问题类型：${context.questionKind}`,
      `证据覆盖：总计 ${context.coverage.totalEvidence} 张；当前问题匹配 ${context.coverage.selectedEvidence} 张；公开链接 ${context.coverage.publicEvidence} 张；私人研究 ${context.coverage.privateEvidence} 张；轨道：${context.coverage.tracks.join("、") || "暂无"}`,
      context.comparison?.enabled ? `比较模式：${context.comparison.groups.map((group) => `${group.label}（${group.evidence.length} 张）`).join(" vs ")}；只能输出证据层之间的可核对差异，不得补写未登记的谱面事实。` : "比较模式：未开启；如问题要求比较而证据不足，必须明确报告不足。",
      context.answerability.status === "not_answerable" ? `回答状态：not_answerable；原因：${context.answerability.reason}；下一步人工动作：${context.answerability.nextHumanAction}。不得生成该主题的事实性结论。` : "回答状态：answerable；仍须逐项绑定证据。",
      "回答规则：事实、自我表述、学者解释和模型推断必须分开；每个事实都回链 sourceRef 与页码/网页定位；证据不足时明确说未知并列出下一步人工动作。最终回答必须逐项写出至少一个上下文中的 sourceRef 和对应 locator，否则回答不通过引用闸门。",
      "来源层级规则：原文/一手材料、学者解释/二手研究、机构目录/档案记录必须分列；模型推断不能伪装成来源观点。",
      "证据元数据规则：verification、claimOrigin、humanReviewed 和 aiGenerated 是独立字段；字段缺失或 humanReviewed=false 时，不得写成人工核定事实，也不得把模型推断写回证据库。",
      "模型输出契约：只输出一个 JSON 对象，不要 Markdown 代码围栏或额外解释；对象含 answer 与 claims。每条 claim 含 text、citations、supportingPhrases；citation 的 evidenceId、sourceRef、locator 必须逐字复制同一证据卡，supportingPhrases 必须逐字取自该卡的 claim 或 boundary。",
      "权利规则：private-research 只可作本地研究线索，不能输出全文、翻译全文或本地路径；public-link 也不自动等于托管许可。",
      "证据卡：",
      evidenceBlock
    ].join("\n");
  }

  function buildContext(personId, query, options = {}) {
    const record = evidenceByPerson[personId] || { evidence: [], answerableTopics: [], notYetAnswerable: [] };
    const kind = questionKind(query);
    const tracks = questionTracks[kind];
    const allEvidence = record.evidence || [];
    const answerability = answerabilityFor(query);
    const trackEvidence = allEvidence.filter((item) => !tracks || tracks.has(item.track));
    const retrieved = retrieveEvidence(trackEvidence, query, kind, personId);
    const localEvidence = answerability.status === "not_answerable" ? [] : retrieved;
    const publicOnly = options === "public" || options?.exposure === "public";
    const selected = publicOnly ? publicEvidenceOnly(localEvidence) : localEvidence.map(safeEvidence);
    const allPublicEvidence = publicEvidenceOnly(allEvidence);
    const coverage = {
      totalEvidence: publicOnly ? allPublicEvidence.length : allEvidence.length,
      selectedEvidence: selected.length,
      publicEvidence: publicOnly ? allPublicEvidence.length : allPublicEvidence.length,
      privateEvidence: publicOnly ? 0 : allEvidence.filter((item) => item.visibility === "private-research").length,
      tracks: [...new Set((publicOnly ? selected : allEvidence).map((item) => item.track).filter(Boolean))]
    };
    const context = {
      schemaVersion: 4,
      personId,
      questionKind: kind,
      exposure: publicOnly ? "public" : "private-research",
      evidence: selected,
      coverage,
      answerability,
      retrieval: Object.freeze({ terms: queryTerms(query, personId), matchedEvidenceIds: selected.map((item) => item.id), specificMatch: queryTerms(query, personId).length > 0 }),
      comparison: buildComparison(query, kind, selected),
      answerableTopics: [...(record.answerableTopics || [])],
      notYetAnswerable: [...(record.notYetAnswerable || [])],
      answerContract: Object.freeze({
        requireSourceRef: true,
        requireLocator: true,
        requireVerification: true,
        requireClaimOrigin: true,
        requireCitationValidation: true,
        requireStructuredClaims: true,
        requireSupportingPhrase: true,
        distinguishSelfStatement: true,
        refuseUnsupportedPersonality: true,
        privateResearchNeverPublic: true,
        humanReviewRequiredForPublication: true
      })
    };
    return Object.freeze({ ...context, prompt: promptFor(context) });
  }

  function comparisonSubjectQuery(query, personIds = []) {
    let value = String(query || "");
    const needles = [...new Set(personIds.flatMap((personId) => personQueryTerms[personId] || []))]
      .sort((left, right) => right.length - left.length);
    for (const needle of needles) value = value.replaceAll(needle, " ");
    return normalize(value)
      .replace(/智能体|研究问题|请回答|关于|帮我|查找|找|比较|对照|差异|区别|异同|有什么|有哪些|哪些|如何|怎样|怎么|能否|可以|的|与|和|及|把|吗|呢/g, "") || "研究";
  }

  function buildComparisonContext(personIds, query, options = {}) {
    const ids = [...new Set((Array.isArray(personIds) ? personIds : [personIds]).map((id) => String(id || "")).filter((id) => evidenceByPerson[id]))];
    if (ids.length < 2) return ids[0] ? buildContext(ids[0], query, options) : buildContext(null, query, options);
    const publicOnly = options === "public" || options?.exposure === "public";
    const subjectQuery = comparisonSubjectQuery(query, ids);
    const contexts = ids.map((personId) => buildContext(personId, subjectQuery, options));
    const blocked = contexts.find((context) => context.answerability?.status === "not_answerable");
    const evidence = blocked ? [] : contexts.flatMap((context) => context.evidence || []);
    const groups = contexts.map((context, index) => Object.freeze({
      id: ids[index],
      label: ids[index],
      evidence: Object.freeze((context.evidence || []).map((item) => Object.freeze({
        evidenceId: item.id,
        sourceRef: item.sourceRef,
        sourceLabel: item.sourceLabel,
        locator: item.locator
      })))
    }));
    const populatedGroups = groups.filter((group) => group.evidence.length);
    const enabled = !blocked && populatedGroups.length >= 2;
    const coverage = {
      totalEvidence: contexts.reduce((sum, context) => sum + (context.coverage?.totalEvidence || 0), 0),
      selectedEvidence: evidence.length,
      publicEvidence: publicOnly ? evidence.length : contexts.reduce((sum, context) => sum + (context.coverage?.publicEvidence || 0), 0),
      privateEvidence: publicOnly ? 0 : contexts.reduce((sum, context) => sum + (context.coverage?.privateEvidence || 0), 0),
      tracks: [...new Set(contexts.flatMap((context) => context.coverage?.tracks || []))]
    };
    const answerability = blocked?.answerability || { status: "answerable", topicId: null, reason: null, nextHumanAction: null };
    const context = {
      schemaVersion: 4,
      personId: ids.join("|"),
      personIds: Object.freeze(ids),
      questionKind: contexts[0]?.questionKind || questionKind(subjectQuery),
      exposure: publicOnly ? "public" : "private-research",
      comparisonQuery: subjectQuery,
      evidence,
      coverage,
      answerability,
      retrieval: Object.freeze({
        terms: [...new Set(contexts.flatMap((context) => context.retrieval?.terms || []))],
        matchedEvidenceIds: evidence.map((item) => item.id),
        specificMatch: contexts.some((context) => context.retrieval?.specificMatch)
      }),
      comparison: Object.freeze({
        enabled,
        mode: enabled ? "cross-person-evidence-boundary" : "cross-person-insufficient-evidence",
        groups: Object.freeze(groups),
        boundary: enabled
          ? "当前比较只并列各人物已经通过公开证据筛选的卡片；相似性、差异性和因果关系都必须回到各自的 sourceRef 与 locator，不能把私人研究或模型记忆拼成共同结论。"
          : blocked
          ? "比较主题触发了当前人物边界，不能生成性格/心理或其他未回答事实结论。"
          : "当前至少有一位人物没有足够的公开证据组，不能生成跨人物事实性比较。",
        nextHumanAction: enabled
          ? "人工分别打开两组 sourceRef，先建立共同问题的来源层级表，再逐项记录相似、差异、反例和版本/地域边界。"
          : "为每位人物补充同一问题类型的公开、可定位证据后再比较。"
      }),
      answerableTopics: [...new Set(contexts.flatMap((context) => context.answerableTopics || []))],
      notYetAnswerable: [...new Set(contexts.flatMap((context) => context.notYetAnswerable || []))],
      answerContract: contexts[0]?.answerContract || Object.freeze({ requireSourceRef: true, requireLocator: true, requireVerification: true, requireClaimOrigin: true, requireCitationValidation: true, requireStructuredClaims: true, requireSupportingPhrase: true, distinguishSelfStatement: true, refuseUnsupportedPersonality: true, privateResearchNeverPublic: true, humanReviewRequiredForPublication: true })
    };
    return Object.freeze({ ...context, prompt: promptFor(context) });
  }

  window.MUSICIAN_AGENT_RUNTIME = Object.freeze({ questionKind, answerabilityFor, retrieveEvidence, buildContext, buildComparisonContext, comparisonRequested, safeEvidence, publicEvidenceOnly, validateModelAnswer, classifyEvidenceLayer });
})();
