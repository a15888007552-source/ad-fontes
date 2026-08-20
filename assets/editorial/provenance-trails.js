(() => {
  const scriptUrl = document.currentScript?.src || new URL('assets/editorial/provenance-trails.js', document.baseURI).href;
  const projectRoot = new URL('../../', scriptUrl);
  const page = location.pathname.match(/\/modules\/([^/]+)\//)?.[1];
  const img = (path) => new URL(path, projectRoot).href;
  if (!document.querySelector('link[data-provenance-trails]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('assets/editorial/provenance-trails.css?v=20260820-editorial1', projectRoot).href;
    link.dataset.provenanceTrails = 'true';
    document.head.append(link);
  }

  const datasets = {
    qinhan: {
      theme: 'jade', eyebrow: '考古来源 · 秦汉国家的地下档案',
      title: '帝陵、都城与军阵：文物从哪里来',
      intro: '秦汉馆里的印玺、兵器、俑群与建筑构件，并非孤立收藏。它们原先属于帝陵、陪葬坑、都城官署和军阵系统；出土位置决定了器物怎样被解释。',
      cards: [
        {kind:'帝陵', title:'秦始皇帝陵', date:'1974年至今持续考古', image:'modules/qinhan/assets/processed/crop/clay-warriors.webp', history:'秦始皇嬴政的陵园始建于即位之初，统一后继续营建。陵园以封土为中心，外城、内城、陪葬坑、墓葬和地面建筑共同构成庞大的帝国缩影。', dig:'1974年临潼西杨村村民打井发现兵马俑坑，此后发掘陆续揭示军阵、石铠甲、百戏俑、青铜水禽等不同陪葬系统。', objects:'本馆关联：兵马俑、石铠甲与石胄、秦兵器、度量衡器。', value:'把统一帝国的军制、工官生产、礼仪和宇宙观放进同一座陵园中研究。', source:'https://www.bmy.com.cn/news/news/1618.html'},
        {kind:'帝后合葬陵园', title:'汉景帝阳陵', date:'1990年代以来系统发掘', image:'modules/qinhan/assets/processed/crop/jade-burial.webp', history:'阳陵是汉景帝刘启与王皇后的合葬陵园，位于咸阳原。帝陵、后陵、从葬坑、陪葬墓园和南北区构成完整陵园。', dig:'考古揭示了成排从葬坑，陶俑原有木臂和衣服，裸身状态是木质与织物腐朽后的结果。', objects:'本馆关联：汉俑、玉衣塞、玉猪、陶仓与成套生活明器。', value:'显示西汉帝陵如何用缩小的官署、军队和生活物资营造地下王国。', source:'http://www.hylae.com/index.php?ac=article&at=list&tid=10'},
        {kind:'军功家族墓地', title:'杨家湾西汉墓与兵马俑坑', date:'1965年发现', image:'modules/qinhan/assets/processed/crop/cavalry-and-frontier-seal.webp', history:'杨家湾墓地位于咸阳原，通常与汉初高级军功贵族家族联系。墓旁俑坑以骑兵、步兵和指挥俑组成军阵。', dig:'1965年发现后出土数千件彩绘陶俑，骑兵俑的军服、马具和队列保存了西汉早期军事编制的视觉资料。', objects:'本馆关联：杨家湾骑兵俑、“汉归义羌长”印及边地军事专题。', value:'可把兵种、服色、族群和军功贵族的身份放在墓地组合中理解。', source:'https://wwj.shaanxi.gov.cn/sy/dtyw/dsdt/202410/t20241010_2887702.html'},
        {kind:'都城遗址', title:'汉长安城', date:'1956年以来持续考古', image:'modules/qinhan/assets/processed/crop/architecture-and-travel.webp', history:'汉长安城是西汉首都，宫城、官署、武库、市场、道路和水系共同构成政治中心。未央宫是丝绸之路长安—天山廊道世界遗产点。', dig:'六十余年考古逐步确认未央宫、长乐宫、武库、桂宫、建章宫及城门道路系统。', objects:'本馆关联：官印封泥、瓦当、铜诏版、建筑构件和汉代城市生活器。', value:'让“长安”从文献中的都城转化为可定位的宫殿、官署与行政网络。', source:'http://www.ncha.gov.cn/art/2022/3/18/art_2590_38.html'}
      ]
    },
    'xian-museum': {
      theme:'mirror', eyebrow:'城市考古 · 长安居民与寺院遗址', title:'从墓葬与寺院回到西安城',
      intro:'西安博物院的藏品多出自城市建设与考古发掘。汉墓中的彩镜、唐墓中的三彩、寺院遗址的造像和粟特墓葬的石椁，共同补出长安居民的日常与信仰。',
      cards:[
        {kind:'汉代墓葬',title:'红庙坡汉墓',date:'1963年发现',image:'modules/xian-museum/assets/supplement/painted-mirror-01.webp',history:'红庙坡位于汉长安城附近。墓主人姓名未能确定，但彩绘人物车马镜和高等级随葬品显示其社会身份不低。',dig:'1963年西安红庙坡村出土彩绘铜镜，矿物颜料在铜胎上保存两千年，因脆弱而很少长期陈列。',objects:'本馆代表：西汉彩绘人物车马镜。',value:'镜背出行、谒见、狩猎、宴饮四组画面，是西汉绘画与贵族生活的直接资料。',source:'https://www.cssn.cn/skgz/bwyc/202409/t20240912_5777182.shtml'},
        {kind:'唐代墓葬',title:'西安制药厂唐墓',date:'1966年发掘',image:'modules/xian-museum/assets/photos/focus-5058.webp',history:'墓主人身份公开资料尚未明确；墓中三彩俑呈现唐代长安胡汉交往、骑乘与随葬明器制度。',dig:'1966年在西安市莲湖区西安制药厂建设过程中发现，出土三彩胡人腾空马等器物。',objects:'本馆代表：三彩腾空马。',value:'四蹄腾空、胡人伏骑的瞬间在唐三彩中极少见，是长安交通与丝路胡风的形象证据。',source:'https://www.xabwy.com/showtwo.html?id=902&type=81&num=5'},
        {kind:'粟特人墓葬',title:'北周史君墓',date:'2003年井上村发现',image:'modules/xian-museum/assets/photos/focus-5073.webp',history:'墓主史君是凉州萨保，负责粟特聚落的政教与商旅事务；妻康氏同葬。双语墓志记录其粟特出身与在华经历。',dig:'2003年西安未央区井上村发现长斜坡墓道土洞墓，出土石椁、石门和粟特文—汉文墓志。',objects:'本馆代表：史君墓石椁及石门伎乐图。',value:'祆教祭祀、宴饮、出行和汉式墓葬制度并置，是入华粟特人生活史的重要档案。',source:'http://www.silkroads.org.cn/portal.php?mod=view&aid=24015'},
        {kind:'寺院遗址',title:'唐青龙寺遗址',date:'1950年代以来调查发掘',image:'modules/xian-museum/assets/photos/focus-4916.webp',history:'青龙寺位于唐长安新昌坊，是密宗重镇，也是日本入唐求法僧惠果、空海等活动的地点。',dig:'遗址考古确认寺院建筑基址，出土佛教造像和建筑构件，今天建有遗址博物馆。',objects:'本馆代表：青龙寺遗址出土一佛二菩萨佛龛。',value:'把唐长安佛教艺术与中日佛教交流落实到具体坊里和寺院空间。',source:'http://m.cnwest.com/xian/a/2021/05/11/19672373.html'},
        {kind:'寺院与城市地标',title:'荐福寺与小雁塔',date:'唐景龙年间始建',image:'modules/xian-museum/assets/photos/focus-5114.webp',history:'荐福寺与小雁塔是唐长安重要佛教遗存，塔与义净译经传统相连，后经历地震、修缮与城市变迁。',dig:'遗址内持续发现唐至明清建筑、灰池和寺院生活遗存；小雁塔现与博物院园区合为一体。',objects:'本馆代表：小雁塔、荐福寺出土建筑与生活遗物。',value:'将一座仍然矗立的唐塔与地下寺院遗存、近现代城市记忆连接起来。',source:'https://zh.wikipedia.org/wiki/%E5%B0%8F%E9%9B%81%E5%A1%94'}
      ]
    },
    'shaanxi-history': {
      theme:'mural',eyebrow:'盛唐墓葬 · 从陵墓壁画到窖藏金银',title:'帝陵陪葬墓与长安窖藏',
      intro:'陕历博的代表藏品中，很多来自乾陵陪葬墓、长安窖藏和寺院地宫。墓室位置、壁画所在墙面与器物组合，是理解盛唐图像和制度的必要坐标。',
      cards:[
        {kind:'城市窖藏',title:'何家村唐代窖藏',date:'1970年发现',image:'modules/shaanxi-history/assets/photos/focus-4613.webp',history:'窖藏埋于唐长安兴化坊附近，主人身份至今仍有争论；金银器、药物、货币和宝石可能与高等级官府或贵族财富有关。',dig:'1970年基建时发现两只陶瓮和一只银罐，集中保存一千余件组器物。',objects:'本馆代表：鎏金舞马衔杯纹银壶、鸳鸯莲瓣纹金碗、镶金兽首玛瑙杯、赤金走龙。',value:'从重量墨书、税银戳记、药材和外来器形，可研究唐代财政、宫廷生活与丝路交流。',source:'https://zh.wikipedia.org/wiki/%E4%BD%95%E5%AE%B6%E6%9D%91%E5%94%90%E4%BB%A3%E7%AA%96%E8%97%8F'},
        {kind:'乾陵陪葬墓',title:'章怀太子李贤墓',date:'1971年发掘',image:'modules/shaanxi-history/assets/supplement/maqiu.jpg',history:'李贤是唐高宗与武则天之子，曾任太子，684年去世；706年迁葬乾陵，711年追赠章怀太子并与妃房氏合葬。',dig:'墓道、过洞、天井与墓室保存大量壁画，发掘后揭取保护。',objects:'本馆代表：马球图、狩猎出行图、客使图等壁画。',value:'将唐代皇室马球、狩猎、外交和墓葬仪仗保存在连贯的空间叙事中。',source:'https://www.sxhm.com/collections/detail/507.html'},
        {kind:'乾陵陪葬墓',title:'永泰公主李仙蕙墓',date:'1960—1962年发掘',image:'modules/shaanxi-history/assets/supplement/gongnv.jpg',history:'永泰公主是唐中宗之女，701年去世，706年与武延基合葬并陪葬乾陵。',dig:'长斜坡墓道与前后室保存宫女、仪仗、天象等壁画，宫女图位于前室东壁南侧。',objects:'本馆代表：九人宫女图、仪仗图及墓葬出土器。',value:'九名宫女的服饰、器用与视线关系，为唐代宫廷女性生活提供罕见图像。',source:'https://www.sxhm.com/collections/detail/510.html'},
        {kind:'乾陵陪葬墓',title:'懿德太子李重润墓',date:'1971年发掘',image:'modules/shaanxi-history/assets/supplement/quelou.jpg',history:'李重润是唐中宗嫡长子，701年去世，706年按“号墓为陵”的高等级礼制陪葬乾陵。',dig:'墓道两壁阙楼、城墙、仪仗相对展开，三出阙超出一般太子墓规格。',objects:'本馆代表：阙楼图、仪仗图等唐墓壁画。',value:'阙楼结构、斗栱和城墙图像，是研究唐代建筑与皇室礼制的关键材料。',source:'https://wwj.shaanxi.gov.cn/wwsx/szjs/202411/t20241122_3212521.html'},
        {kind:'皇室墓葬',title:'贞顺皇后敬陵',date:'2004—2005年抢救发掘',image:'modules/shaanxi-history/assets/photos/focus-4336.webp',history:'贞顺皇后即武惠妃，是唐玄宗宠妃。敬陵位于西安长安区，石椁线刻仕女、花草和建筑细节。',dig:'墓葬早年被盗，石椁构件外流后追索回国，考古清理确认墓室结构与剩余遗物。',objects:'本馆代表：贞顺皇后石椁、仕女线刻。',value:'把文物追索、墓葬考古与盛唐宫廷线刻艺术联系在同一对象上。',source:'https://zh.wikipedia.org/wiki/%E6%AD%A6%E6%83%A0%E5%A6%83'},
        {kind:'寺院地宫',title:'法门寺塔基地宫',date:'1987年发现',image:'modules/shaanxi-history/assets/photos/focus-4446.webp',history:'法门寺地宫封闭于唐咸通十五年（874），供奉佛指舍利，并保存皇家供养金银器、玻璃器、茶具与丝织品。',dig:'1987年修塔时发现地宫，地宫内碑版和物账碑使大批器物具有明确名称、等级和用途。',objects:'本馆代表：淡黄色直壁玻璃杯、法门寺金银器及相关出土品。',value:'有纪年、有物账、有原始空间，是唐代宫廷工艺、佛教供养和茶文化的标准考古单位。',source:'https://zh.wikipedia.org/wiki/%E6%B3%95%E9%97%A8%E5%AF%BA%E5%9C%B0%E5%AE%AB'}
      ]
    },
    'shaanxi-archaeology-museum': {
      theme:'field',eyebrow:'考古项目 · 遗址如何成为历史',title:'从探方、墓室到研究报告',
      intro:'考古博物馆强调的不是“宝物清单”，而是获取知识的方法。每张卡片对应一个考古项目，展示发掘时间、遗迹关系、代表文物和学术问题。',
      cards:[
        {kind:'史前聚落',title:'杨官寨遗址',date:'2004年以来发掘',image:'modules/shaanxi-archaeology-museum/assets/photos/web/DSC_2890.jpg',history:'杨官寨是距今约六千年至五千年的仰韶中晚期大型中心聚落，环壕、道路、水利、墓地和手工业遗存显示出复杂社会。',dig:'发掘确认大型环壕及聚落边界；东区墓地把聚落与族群葬制直接连接。',objects:'本馆代表：联体釜灶、带流陶杯、玉钺、浮雕蛙纹陶釜。',value:'是讨论关中早期城市化、公共工程和仰韶社会组织的核心遗址。',source:'http://big5.news.cn/gate/big5/sn.news.cn/20240823/4aa77d3d258c43b7a854768b23f98413/c.html'},
        {kind:'石城文明',title:'石峁遗址',date:'2011年以来系统发掘',image:'modules/shaanxi-archaeology-museum/assets/photos/web/DSC_2919.jpg',history:'石峁位于神木，是距今约四千年的大型石城，由皇城台、内城和外城构成，城防、祭祀和手工业高度集中。',dig:'考古揭示石砌城门、纴木结构、壁画、石雕与人祭遗存，皇城台可能是区域权力中心。',objects:'本馆代表：皇城台口簧及石峁相关遗存。',value:'改变了对中国早期城市与文明中心只在中原出现的旧认识。',source:'http://kaogu.cssn.cn/xwzx/kgdt/201210/t20121029_5941920.shtml'},
        {kind:'诸侯墓地',title:'韩城梁带村芮国墓地',date:'2005年以来发掘',image:'modules/shaanxi-archaeology-museum/assets/photos/web/DSC_2636.jpg',history:'梁带村墓地属于两周之际的芮国贵族墓地，墓主包括芮桓公及高等级女性，青铜礼器与玉器组合保存完整。',dig:'多座大墓、车马坑和中小墓共同勾勒芮国国君、夫人与家族成员的墓地结构。',objects:'本馆代表：玉戈、玉璧、立鸟玉佩与玉杖首。',value:'补充了史籍失载或记载有限的芮国世系、婚姻和政治关系。',source:'https://zh.wikipedia.org/wiki/%E6%A2%81%E5%B8%A6%E6%9D%91%E8%8A%AE%E5%9B%BD%E9%81%97%E5%9D%80'},
        {kind:'周原考古',title:'周原遗址与贺家车马坑',date:'20世纪以来持续发掘',image:'modules/shaanxi-archaeology-museum/assets/photos/web/DSC_2812.jpg',history:'周原是周人灭商前后的政治中心之一，宫殿、制骨、铸铜、甲骨与墓地共同构成大型都邑。',dig:'2014年贺家车马坑K1等发掘保存了车马、铜翣与嵌绿松石马络饰，提供出行和礼仪的原始组合。',objects:'本馆代表：铜翣、嵌绿松石青铜马络饰、铸铜作坊遗存。',value:'从作坊到车马坑，展示西周都邑如何组织生产、交通与礼制。',source:'http://kaogu.cssn.cn/zwb/zdkt/201407/t20140715_3930071.shtml'},
        {kind:'家族墓园',title:'张安世家族墓',date:'2008年以来发掘',image:'modules/shaanxi-archaeology-museum/assets/photos/web/DSC_3182.jpg',history:'张安世是西汉麒麟阁功臣张汤之子，历仕武帝、昭帝、宣帝。凤栖原墓园延续数代，墓道、祠堂和陪葬关系清楚。',dig:'考古确认大型甲字形墓与家族成员墓葬，出土漆器、封泥和银器等。',objects:'本馆代表：银七子漆盒及家族墓出土器。',value:'把汉代功臣家族的政治地位、墓园营建与代际延续放在一个长期使用的空间中。',source:'https://zh.wikipedia.org/wiki/%E5%BC%A0%E5%AE%89%E4%B8%96'},
        {kind:'旧石器洞穴',title:'南郑疥疙洞遗址',date:'2018年发掘',image:'modules/shaanxi-archaeology-museum/assets/photos/web/DSC_2744.jpg',history:'疥疙洞位于汉中盆地南缘，保存旧石器时代人类活动、动物化石与石制品。',dig:'洞穴沉积中发现人类牙齿化石、石器和剑齿象、犀牛等动物遗存。',objects:'本馆代表：人类牙齿化石、犀牛牙齿、剑齿象牙齿与鹿角。',value:'为秦岭以南早期人类活动与环境变化提供直接年代与生态证据。',source:'https://zh.wikipedia.org/wiki/%E7%96%A5%E7%96%99%E6%B4%9E%E9%81%97%E5%9D%80'}
      ]
    },
    baoji: {
      theme:'bronze',eyebrow:'周秦墓地与窖藏 · 青铜器的原生组合',title:'青铜器离开地面之前',
      intro:'宝鸡的青铜重器多成组出自窖藏和贵族墓地。铭文、器类组合和埋藏位置，比单件器物的“精美”更能说明周人家族、诸侯与礼制。',
      cards:[
        {kind:'家族窖藏',title:'眉县杨家村窖藏',date:'2003年发现',image:'modules/baoji/assets/photos/web/DSC_3325.jpg',history:'窖藏属于西周晚期单氏家族，27件青铜器均有铭文；逨、单叔、单五父等可能是同一器主在不同阶段的称谓。',dig:'村民取土发现后及时报告，考古人员清理出逨盘、四十二年逨鼎、四十三年逨鼎等重器。',objects:'本馆代表：逨盘、四十二年逨鼎、逨盉、叔五父彝。',value:'铭文串起单氏八代与周王世系，是研究西周晚期册命、官职和家族史的完整档案。',source:'https://www.bjqtm.com/xcjy/dwxc/%E5%AE%9D%E5%8D%9A%E5%BE%AE%E8%AF%BE%E5%A0%82%E5%91%A8%E5%8E%9F%E7%9A%84%E4%B8%96%E5%AE%B6%E5%A4%A7%E6%97%8F-%E5%8D%95%E6%B0%8F%E5%AE%B6%E6%97%8F%EF%BC%88%E4%B8%8A%EF%BC%89'},
        {kind:'家族窖藏',title:'扶风庄白窖藏',date:'1976年发现',image:'modules/baoji/assets/photos/web/DSC_3575.jpg',history:'庄白一号窖藏保存微氏家族数代铜器，103件器物中多件带长铭，覆盖西周早中期。',dig:'庄白村农田基建发现后清理出墙盘、折觥、癫钟、癫簋、微伯鬲等。',objects:'本馆代表：墙盘、癫钟、癫簋、微伯兴匕。',value:'墙盘以周王世系对照微氏家史，使一个家族如何进入王朝政治变得可读。',source:'https://www.bjqtm.com/xcjy/dwxc/%e5%ae%9d%e5%8d%9a%e5%be%ae%e8%af%be%e5%a0%82%ef%bd%9c%e5%91%a8%e5%8e%9f%e7%9a%84%e4%b8%96%e5%ae%b6%e5%a4%a7%e6%97%8f-%e5%be%ae%e6%b0%8f%e5%ae%b6%e6%97%8f%ef%bc%88%e4%b8%8a%ef%bc%89'},
        {kind:'贵族墓地',title:'石鼓山西周墓地',date:'2012—2013年发掘',image:'modules/baoji/assets/photos/web/DSC_3249.jpg',history:'石鼓山墓地属于商末周初的高等级“户”氏家族，墓葬中青铜禁、方彝、卣和车马器组合完整。',dig:'发掘确认多座大墓，M3、M4出土青铜礼器、兵器与车马器，部分器形此前罕见。',objects:'本馆代表：户方彝、龙纹禁与兽面纹斗、父戊尊。',value:'填补了西周早期宝鸡地区非姬姓贵族家族的礼制与政治活动。',source:'https://www.bjqtm.com/xcjy/dwxc/%e5%ae%9d%e5%8d%9a%e5%be%ae%e8%af%be%e5%a0%82%e8%a5%bf%e5%91%a8%e8%b4%b5%e6%97%8f-%e6%88%b7%e6%b0%8f%e5%ae%b6%e6%97%8f'},
        {kind:'诸侯墓地',title:'茹家庄鱼国墓地',date:'1974年发掘',image:'modules/baoji/assets/photos/web/DSC_3761.jpg',history:'茹家庄墓地属于史籍失载的鱼国。国君墓、井姬墓与车马坑显示鱼国贵族和周王室姬姓女性的婚姻联系。',dig:'墓葬出土象尊、井姬鼎、强伯器与大量玉器，器物原生组合清晰。',objects:'本馆代表：象尊、井姬附耳鼎、井姬圆鼎、强伯盉。',value:'借铭文、婚姻与随葬组合重建一个失载诸侯国的政治结构。',source:'https://baike.baidu.com/item/%E8%8C%B9%E5%AE%B6%E5%BA%84%E8%A5%BF%E5%91%A8%E5%A2%93/0'},
        {kind:'诸侯墓地',title:'竹园沟鱼国墓地',date:'1980年发掘',image:'modules/baoji/assets/photos/web/DSC_3479.jpg',history:'竹园沟墓地保存鱼国另一支贵族墓葬，墓中编钟、礼器和车马器显示早期诸侯礼乐体系。',dig:'M7、M8、M13等墓葬出土伯各卣、兽面纹盉、云纹编钟和兽头轭饰。',objects:'本馆代表：兽面纹双耳方座簋、伯各卣、云纹编钟。',value:'和茹家庄墓地互相补充，使鱼国从单一墓主人扩展为有世系和等级的墓地群。',source:'https://baike.baidu.com/item/%E5%AE%9D%E9%B8%A1%E5%BC%93%E9%B1%BC%E5%9B%BD%E5%A2%93%E5%9C%B0/8225489'},
        {kind:'诸侯墓地',title:'纸坊头鱼国墓地',date:'1981年发现',image:'modules/baoji/assets/photos/web/DSC_3650.jpg',history:'纸坊头墓地是鱼国贵族墓地的重要组成，强伯名器和高等级鼎簋组合显示墓主人身份。',dig:'雨后坍塌暴露青铜器，随后调查发掘，出土强伯四耳方座簋、带盖龙纹鼎等。',objects:'本馆代表：强伯四耳方座簋、强伯双耳方座簋、带盖龙纹鼎。',value:'三处鱼国墓地并看，可观察同一诸侯国不同墓地与不同代际的器用变化。',source:'https://baike.baidu.com/item/%E5%AE%9D%E9%B8%A1%E5%BC%93%E9%B1%BC%E5%9B%BD%E5%A2%93%E5%9C%B0/8225489'},
        {kind:'秦国贵族墓',title:'益门堡春秋墓',date:'1992年发现',image:'modules/baoji/assets/photos/crops/dsc_3689-crop.jpg',history:'益门堡墓规模不大，却集中随葬金柄铁剑、金环、玉环和玉佩，墓主人身份至今仍有讨论。',dig:'施工中发现后进行清理，墓室虽小，金玉器和兵器组合异常丰富。',objects:'本馆代表：虎形玉佩、素面金环、索状玉环。',value:'说明秦国贵族身份不只依靠大型青铜礼器，也可通过金玉佩饰与兵器表达。',source:'http://kejiao.cntv.cn/2012/12/15/VIDA1355518458568336.shtml'},
        {kind:'公共墓地',title:'旭光商周墓地',date:'2018—2019年发掘',image:'modules/baoji/assets/photos/web/DSC_3323.jpg',history:'旭光墓地位于东沙河畔，延续西周至战国，墓葬规模和积石结构显示不同族群与等级。',dig:'抢救发掘确认西周墓、战国积石墓与车马遗存，出土罕见金制品和青铜器。',objects:'本馆代表：当卢、交父壬簋、覃鬲、兽面纹鼎。',value:'跨越数百年的公共墓地，为观察周秦之际葬俗、族群与社会结构变化提供连续序列。',source:'http://news.cnwest.com/baoji/a/2020/01/14/18372382.html'}
      ]
    },
    beilin:{
      theme:'ink',eyebrow:'碑石的原址 · 从墓前神道到碑林展柜',title:'碑从哪里来：陵墓、神道与墓志',
      intro:'碑林中的碑刻和墓志原本属于陵园、神道、墓室或寺院。这里不重复乾陵壁画，而集中讲石碑如何从墓葬空间进入金石收藏。',
      cards:[
        {kind:'帝陵与陪葬墓群',title:'唐昭陵与陪葬墓',date:'唐贞观至开元',image:'assets/photos/web/DSC_1496.jpg',history:'昭陵是唐太宗李世民与文德皇后合葬陵，九嵕山周围分布大量功臣、宗室陪葬墓。',dig:'唐俭等功臣碑原立墓前神道，后因保护、收藏和拓本传播进入博物馆体系。',objects:'碑林关联：唐俭碑、重刻莒国公唐俭碑；同时可与昭陵六骏专题对照。',value:'把功臣生平、陪葬制度、神道空间与后世金石校勘连接起来。',source:'https://www.dpm.org.cn/collection/impres/234165.html'},
        {kind:'功臣墓与神道碑',title:'李晟墓与神道碑',date:'793年葬，829年立碑',image:'assets/photos/web/DSC_1751.jpg',history:'李晟是平定朱泚之乱、收复长安的唐代名将，卒后赠太师，葬高陵奉正原。',dig:'裴度撰文、柳公权书丹并篆额，原碑经迁移保存于高陵；碑林展出拓本。',objects:'碑林关联：李晟碑拓本。',value:'名将功业、宰相文章、柳体书法合为“三绝”，也是神道碑如何保存人物史的典型。',source:'https://baike.baidu.com/item/%E6%9D%8E%E6%99%9F%E7%A2%91/1123785'},
        {kind:'长安粟特女性塔铭',title:'安优婆姨塔铭与群贤坊',date:'736年卒，739年立铭',image:'assets/photos/web/DSC_1954.jpg',history:'墓主安优婆姨先世来自粟特安国，家族迁居凉州姑臧，开元年间再迁长安群贤坊；她以佛教在家女居士身份入葬。',dig:'塔铭记录籍贯、迁徙、信仰、卒葬和子嗣，原石现藏榆林市古代碑刻艺术博物馆，碑林展出拓本。',objects:'碑林关联：《安优婆姨塔铭》拓本。',value:'把胡人女性、长安坊里和佛教信仰放进一个具体人的生命史中。',source:'https://github.com/a15888007552-source/ad-fontes-archive/releases/download/originals/DSC_1956.JPG'},
        {kind:'海上丝路人物神道碑',title:'杨良瑶墓与神道碑',date:'806年立碑，1984年出土',image:'assets/photos/web/DSC_1964.jpg',history:'杨良瑶是唐代宦官，贞元元年以聘国使身份经海路出使黑衣大食，806年去世。',dig:'神道碑1984年在泾阳小户杨村出土，记载其“舍陆登舟”经南海和马六甲海峡西行。',objects:'碑林关联：《杨良瑶神道碑》拓本。',value:'填补正史中唐代官方海路出使记录的空白，是海上丝绸之路的重要物证。',source:'https://baike.baidu.com/item/%E5%94%90%E6%9D%A8%E8%89%AF%E7%91%B6%E7%A5%9E%E9%81%93%E7%A2%91/16979412'}
      ]
    }
  };

  const cfg = datasets[page];
  if (!cfg || document.querySelector('.provenance-trails')) return;
  const main = document.querySelector('main') || document.body;
  const section = document.createElement('section');
  section.className = `provenance-trails provenance-trails--${cfg.theme}`;
  section.id = 'provenance-trails';
  section.innerHTML = `
    <header class="pt-head">
      <p class="pt-eyebrow">${cfg.eyebrow}</p>
      <h2 id="pt-title-${page}">${cfg.title}</h2>
      <p>${cfg.intro}</p>
    </header>
    <div class="pt-grid">${cfg.cards.map((c,i)=>`
      <article class="pt-card${i===0?' pt-card--lead':''}">
        <figure><img src="${img(c.image)}" alt="${c.title}代表文物" loading="lazy"><figcaption>${c.kind}</figcaption></figure>
        <div class="pt-body">
          <div class="pt-title"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${c.title}</h3><p>${c.date}</p></div></div>
          <dl>
            <div><dt>历史</dt><dd>${c.history}</dd></div>
            <div><dt>发现与发掘</dt><dd>${c.dig}</dd></div>
            <div><dt>本馆代表文物</dt><dd>${c.objects}</dd></div>
            <div><dt>为什么重要</dt><dd>${c.value}</dd></div>
          </dl>
          <a href="${c.source}" target="_blank" rel="noopener noreferrer">查看资料来源 ↗</a>
        </div>
      </article>`).join('')}</div>`;
  const footer = document.querySelector('footer');
  if (footer) footer.before(section); else main.append(section);
})();
