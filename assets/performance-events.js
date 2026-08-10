(function (root) {
  "use strict";

  // Item-level performance events are navigation records, not new rights
  // decisions. They point back to public evidence cards and keep venue,
  // date, version and participant roles separate from score/recording leads.
  const events = [
    {
      id: "event:stravinsky-rite-premiere-1913",
      personId: "stravinsky",
      workPathId: "work:stravinsky-rite-of-spring",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《春之祭》巴黎首演",
      workTitle: "The Rite of Spring / Le Sacre du printemps",
      date: "1913-05-29",
      dateLabel: "1913-05-29",
      location: {
        venue: "Théâtre des Champs-Élysées",
        city: "Paris",
        country: "France"
      },
      institution: "Théâtre des Champs-Élysées",
      participants: [
        { role: "作曲家", name: "Igor Stravinsky" },
        { role: "原编舞", name: "Vaslav Nijinsky" },
        { role: "编舞记号记录", name: "Marie Rambert" }
      ],
      versionLabel: "1913 首演 / 之后的 1921 首版与 1926 重作版另行登记",
      keywords: ["春之祭", "The Rite of Spring", "Le Sacre du printemps", "1913", "巴黎", "Théâtre des Champs-Élysées", "Nijinsky", "Marie Rambert", "首演"],
      evidenceRefs: ["stravinsky-loc-sacre-rambert-score", "stravinsky-loc-sacre-guide-record"],
      sourceTitle: "Library of Congress · Bronislava Nijinska Collection / Igor Stravinsky Guide",
      sourceUrl: "https://www.loc.gov/collections/bronislava-nijinska/articles-and-essays/le-sacre-du-printemps/",
      locator: "Le Sacre du Printemps article; premiere 29 May 1913; Théâtre des Champs-Élysées; Nijinsky choreography; Marie Rambert choreographic notes",
      claim: "LOC 机构记录把《春之祭》的作曲家、Nijinsky 原编舞、1913 年 5 月 29 日巴黎 Théâtre des Champs-Élysées 首演和 Marie Rambert 对编舞记号的记录放在同一研究入口中。",
      boundary: "这是机构文章与馆藏描述支持的事件导航，不等于已经取得首演节目单、完整演出名单、谱页图像或复制许可；Marie Rambert 的记号记录不被扩写成她参加首演或替代原始编舞档案。事件、谱本、图像和地域权利保持分层。",
      visibility: "public-link",
      verification: "institutional-event-record-verified-no-reuse-permission",
      humanReviewed: false,
      aiGenerated: false
    },
    {
      id: "event:stravinsky-capriccio-premiere-1929",
      personId: "stravinsky",
      workPathId: "work:stravinsky-capriccio-recording-1930",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《Capriccio》巴黎首演",
      workTitle: "Capriccio for Piano and Orchestra",
      date: "1929-12-06",
      dateLabel: "1929-12-06",
      location: {
        venue: "Salle Pleyel",
        city: "Paris",
        country: "France"
      },
      institution: "Orchestre symphonique de Paris",
      participants: [
        { role: "作曲家 / 钢琴独奏", name: "Igor Stravinsky" },
        { role: "指挥", name: "Ernest Ansermet" },
        { role: "乐团", name: "Orchestre symphonique de Paris" }
      ],
      versionLabel: "1928—1929 原作 / 1929-12-06 首演 / 1930 WLX1353 录音 / 1949 修订",
      keywords: ["Capriccio", "Capriccio for Piano and Orchestra", "钢琴与乐队", "1929-12-06", "Salle Pleyel", "Paris", "巴黎", "Igor Stravinsky", "Ernest Ansermet", "Orchestre symphonique de Paris", "WLX1353", "1949 修订", "首演"],
      evidenceRefs: ["stravinsky-boosey-capriccio-work", "stravinsky-capriccio-premiere-1929"],
      sourceTitle: "Maison de la Radio et de la Musique · Capriccio programme note",
      sourceUrl: "https://www.maisondelaradioetdelamusique.fr/sites/default/files/2024-12/6%20dec.%20OP.pdf",
      locator: "Official programme PDF p.6 (PDF index 5), lines 73–79: composed Nice/Écharvines 1928–1929; revised 1949; premiered Paris, Salle Pleyel, 6 Dec 1929; Orchestre symphonique de Paris; Ernest Ansermet; composer at piano",
      claim: "Radio France / Maison de la Radio et de la Musique 的官方节目册把《Capriccio》登记为 1928—1929 年创作、1949 年修订，并记录 1929 年 12 月 6 日在巴黎 Salle Pleyel 首演：斯特拉文斯基本人担任钢琴独奏，Ernest Ansermet 指挥 Orchestre symphonique de Paris。",
      boundary: "这是 2024 年机构节目册与 Boosey & Hawkes 出版者目录共同支持的作品—首演导航，不是 1929 原始节目单、首演谱面或完整档案。Boosey 所说的全球租售可用性是商业目录范围，不等于公共领域、复制、下载、AI 训练或本站托管许可；1929 首演、1930 WLX1353 录音和 1949 修订保持不同对象层。",
      visibility: "public-link",
      verification: "official-radio-france-programme-and-publisher-work-record-verified-no-reuse-permission",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.boosey.com/cr/music/Igor-Stravinsky-Capriccio/3019",
        "https://www.boosey.com/pages/licensing/composer/timeline?composerid=2708"
      ])
    },
    {
      id: "event:stravinsky-firebird-premiere-1910",
      personId: "stravinsky",
      workPathId: "work:stravinsky-firebird",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《火鸟》巴黎首演",
      workTitle: "L'Oiseau de feu / The Firebird / Жар-птица",
      date: "1910-06-25",
      dateLabel: "1910-06-25",
      location: {
        venue: "Théâtre National de l'Opéra de Paris",
        city: "Paris",
        country: "France"
      },
      institution: "Ballets russes / Théâtre National de l'Opéra de Paris",
      participants: [
        { role: "作曲家", name: "Igor Stravinsky" },
        { role: "编舞 / 剧情", name: "Michel Fokine" },
        { role: "火鸟", name: "Tamara Karsavina" },
        { role: "Ivan Tsarevitch", name: "Michel Fokine" },
        { role: "Belle Tsarevna", name: "Vera Fokina" },
        { role: "Kostchei", name: "Aleksej Bulgakov" },
        { role: "指挥", name: "Gabriel Pierné" },
        { role: "舞团", name: "Ballets russes" }
      ],
      versionLabel: "1910 原芭蕾首演 / 1911 首版全总谱 / 1911、1919、1945 三种音乐会组曲分层",
      keywords: ["火鸟", "The Firebird", "L'Oiseau de feu", "L'oiseau de feu", "Жар-птица", "K010", "IIS 10", "1910-06-25", "Théâtre National de l'Opéra de Paris", "Paris", "巴黎", "Ballets russes", "Michel Fokine", "Tamara Karsavina", "Vera Fokina", "Aleksej Bulgakov", "Gabriel Pierné", "首演"],
      evidenceRefs: ["stravinsky-bnf-firebird-work-13919969", "stravinsky-bnf-firebird-premiere-40148407"],
      sourceTitle: "BnF Catalogue général · L'Oiseau de feu · FRBNF40148407",
      sourceUrl: "https://catalogue.bnf.fr/ark:/12148/cb40148407x",
      locator: "FRBNF40148407; Paris, Théâtre National de l'Opéra de Paris; 1910-06-25; création à Paris; Fokine choreography/libretto; Karsavina, Fokine, Fokina, Bulgakov; Pierné conductor; Ballets russes",
      claim: "BnF 的首演对象 FRBNF40148407 记录《火鸟》于 1910 年 6 月 25 日在巴黎 Théâtre National de l'Opéra de Paris 首演，由 Michel Fokine 编舞并拟定剧情，Tamara Karsavina、Michel Fokine、Vera Fokina、Aleksej Bulgakov 等出演，Gabriel Pierné 指挥 Ballets russes；BnF 作品规范 FRBNF13919969 独立确认日期、指挥与两幕芭蕾身份。",
      boundary: "FRBNF40148407 明写该 notice 依据 BnF 1979 年 Diaghilev / Ballets russes 展览目录编制，不是本轮已见的 1910 原始节目单；因此不补写条目未列出的完整演员、乐团编制或逐幕内容。1910 首演、1911 首版总谱、三种音乐会组曲、1924 录音和任何媒体/图像权利保持分层。",
      visibility: "public-link",
      verification: "official-bnf-performance-and-musical-work-authority-records-verified-no-primary-programme-or-reuse-permission",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://catalogue.bnf.fr/ark:/12148/cb13919969z"
      ])
    },
    {
      id: "event:stravinsky-petrushka-premiere-1911",
      personId: "stravinsky",
      workPathId: "work:stravinsky-petrushka",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《彼得鲁什卡》巴黎首演",
      workTitle: "Petruška / Petrushka / Petrouchka, K012 / W 18a (1911)",
      date: "1911-06-13",
      dateLabel: "1911-06-13",
      location: {
        venue: "Théâtre du Châtelet",
        city: "Paris",
        country: "France"
      },
      institution: "Ballets Russes / Théâtre du Châtelet",
      participants: [
        { role: "作曲家 / 剧情", name: "Igor Stravinsky" },
        { role: "剧情 / 舞美 / 服装", name: "Alexandre Benois" },
        { role: "编舞", name: "Michel Fokine" },
        { role: "Ballerina", name: "Tamara Karsavina" },
        { role: "Petrouchka", name: "Vaslav Nijinsky" },
        { role: "Moor", name: "Alexandre Orlov" },
        { role: "Charlatan", name: "Enrico Cecchetti" },
        { role: "指挥", name: "Pierre Monteux" },
        { role: "乐团（Boosey 出版商记录）", name: "Orchestre du Théâtre du Châtelet" },
        { role: "舞团", name: "Ballets Russes" }
      ],
      versionLabel: "1911 原版首演 / 1946 修订与 1947 出版版另行登记",
      keywords: ["彼得鲁什卡", "Petruška", "Petrushka", "Petrouchka", "Pétrouchka", "K012", "W 18a", "1911-06-13", "Théâtre du Châtelet", "Paris", "巴黎", "Ballets Russes", "Michel Fokine", "Alexandre Benois", "Tamara Karsavina", "Vaslav Nijinsky", "Pierre Monteux", "Orchestre du Théâtre du Châtelet", "FRBNF40990883", "FRBNF39684785", "btv1b8415108j", "首演"],
      evidenceRefs: ["stravinsky-bnf-petrushka-work-13919984", "stravinsky-bnf-petrushka-programme-1911-40990883", "stravinsky-bnf-petrushka-premiere-39684785", "stravinsky-boosey-petrushka-work-premiere"],
      sourceTitle: "BnF / Gallica · 1911 Ballets russes programme; BnF spectacle record; Boosey & Hawkes work catalogue",
      sourceUrl: "https://catalogue.bnf.fr/ark:/12148/cb40990883m",
      locator: "FRBNF40990883 / Gallica btv1b8415108j / RES-2248 (14-17): official Ballets russes programme, second spectacle 13 and 15-17 June 1911, Pétrouchka création; FRBNF39684785: Théâtre du Châtelet, 1911-06-13, Fokine, Stravinsky/Benois, Karsavina, Nijinsky, Orlov, Cecchetti, Monteux; Boosey work catalogue musicid=4358: world premiere and orchestra cross-check",
      claim: "BnF 的 1911 年 Ballets russes 原始节目单目录把第二套节目定位到 6 月 13 日及 15—17 日，并明确列出 Pétrouchka（création）；BnF 首演对象记录 6 月 13 日 Théâtre du Châtelet、Fokine 编舞、Stravinsky/Benois 剧情、Karsavina、Nijinsky、Orlov、Cecchetti 与 Pierre Monteux。Boosey & Hawkes 的出版商作品页独立确认日期、场馆、Ballets Russes、Fokine、Monteux，并把乐团写作 Orchestre du Théâtre du Châtelet。",
      boundary: "FRBNF40990883 / Gallica btv1b8415108j 是原始节目单对象，但本轮只核验目录、OAI 与 69 页 IIIF manifest，没有逐页转录具体节目图像。FRBNF39684785 明写其 notice 依据 1969 年 Strasbourg 展览目录编制，不能冒充原始节目；Boosey 是现代出版商目录，乐团名称仅按该来源标注。三层证据可以交叉日期与阵容，但不能替代首演谱面、完整节目逐页核读、影像复制许可或演出录音。",
      visibility: "public-link",
      verification: "original-programme-catalogue-and-gallica-oai-verified-plus-bnf-derived-spectacle-record-and-official-publisher-cross-check",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://gallica.bnf.fr/ark:/12148/btv1b8415108j",
        "https://gallica.bnf.fr/services/OAIRecord?ark=btv1b8415108j",
        "https://catalogue.bnf.fr/ark:/12148/cb39684785d",
        "https://catalogue.bnf.fr/ark:/12148/cb13919984v",
        "https://www.boosey.com/pages/Opera/catalogue/cat_detail?musicid=4358"
      ])
    },
    {
      id: "event:debussy-la-mer-premiere-1905",
      personId: "debussy",
      workPathId: "work:debussy-la-mer",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《大海》巴黎首演",
      workTitle: "La mer",
      date: "1905-10-15",
      dateLabel: "1905-10-15",
      location: {
        venue: "Concerts Lamoureux",
        city: "Paris",
        country: "France"
      },
      institution: "Concerts Lamoureux",
      participants: [],
      versionLabel: "1905 首演 / Durand 1905 首版",
      keywords: ["大海", "La mer", "FL 111", "1905", "巴黎", "Concerts Lamoureux", "Durand", "首演"],
      evidenceRefs: ["debussy-bnf-la-mer-work-authority"],
      sourceTitle: "BnF Notice de titre musical · La mer. Orchestre. FL 111",
      sourceUrl: "https://catalogue.bnf.fr/ark:/12148/cb140051277",
      locator: "FRBNF14005127; composition 1903-08—1905-03-05; first performance 15 Oct 1905 Paris Concerts Lamoureux; first edition Durand 1905",
      claim: "BnF 作品权威记录把《La mer》规范为 FL 111，并登记 1905 年 10 月 15 日在巴黎 Concerts Lamoureux 首演以及 Durand 1905 首版。",
      boundary: "这是作品权威记录中的日期—机构—首版导航，不是首演节目单、指挥/乐团名单或具体谱面差异证据；不能由目录记录推导首演分谱、现代版或复制/托管许可。",
      visibility: "public-link",
      verification: "official-work-authority-event-record-verified",
      humanReviewed: false,
      aiGenerated: false
    },
    {
      id: "event:debussy-faune-premiere-1894",
      personId: "debussy",
      workPathId: "work:debussy-prelude-faune",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《牧神午后前奏曲》巴黎首演",
      workTitle: "Prélude à l’après-midi d’un faune",
      date: "1894-12-22",
      dateLabel: "1894-12-22",
      location: {
        venue: "当前机构来源未细化物理场馆",
        city: "Paris",
        country: "France"
      },
      institution: "Société nationale de musique",
      participants: [
        { role: "指挥", name: "Gustave Doret" },
        { role: "乐团", name: "Orchestre de la Société nationale de musique" }
      ],
      versionLabel: "1891—1894 创作 / 1894-12-22 首演 / 1895-10 Fromont 首版",
      keywords: ["牧神午后前奏曲", "牧神的午后前奏曲", "Prélude à l’après-midi d’un faune", "Prelude to the Afternoon of a Faun", "FL 87", "1894-12-22", "Paris", "巴黎", "Société nationale de musique", "Gustave Doret", "Orchestre de la SNM", "首演"],
      evidenceRefs: ["debussy-bnf-faune-work-authority", "debussy-philharmonie-faune-premiere-1894"],
      sourceTitle: "Philharmonie de Paris · Orchestre de Paris / Klaus Mäkelä · Prélude à l’après-midi d’un faune",
      sourceUrl: "https://philharmoniedeparis.fr/fr/live/concert/1159521-orchestre-de-paris-klaus-makela",
      locator: "Programme work note: composition 1892—1894; creation 22 Dec 1894 at Société nationale de musique, Paris; Orchestre de la SNM; Gustave Doret; instrumentation; cross-reference BnF FRBNF13911386",
      claim: "Philharmonie de Paris 的机构节目说明记录《牧神午后前奏曲》于 1894 年 12 月 22 日在巴黎 Société nationale de musique 首演，由 Gustave Doret 指挥 Orchestre de la SNM；BnF 的 FL 87 作品权威记录独立确认同一日期、城市与机构。",
      boundary: "这是现代机构节目说明与 BnF 作品权威记录共同支持的日期—机构—指挥—乐团导航，不是 1894 原始节目单；当前三条第一方来源没有细化物理演出厅，因此不补写场馆。节目页的现代文字、图像、2023 演出视频以及 BnF 手稿/数字影像均不因事件记录而获得复制、播放、下载或本站托管许可。",
      visibility: "public-link",
      verification: "official-philharmonie-programme-and-bnf-work-authority-verified-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://catalogue.bnf.fr/ark:/12148/cb13911386z",
        "https://catalogue.bnf.fr/ark:/12148/cb42271375h"
      ])
    },
    {
      id: "event:debussy-pelleas-premiere-1902",
      personId: "debussy",
      workPathId: "work:debussy-pelleas-et-melisande",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《佩利亚斯与梅丽桑德》巴黎首演",
      workTitle: "Pelléas et Mélisande",
      date: "1902-04-30",
      dateLabel: "1902-04-30",
      location: {
        venue: "Opéra-Comique",
        city: "Paris",
        country: "France"
      },
      institution: "Opéra-Comique",
      participants: [
        { role: "作曲家", name: "Claude Debussy" },
        { role: "剧本原作 / 剧本", name: "Maurice Maeterlinck" },
        { role: "舞台导演", name: "Albert Carré" },
        { role: "Mélisande", name: "Mary Garden" },
        { role: "Pelléas", name: "Jean Périer" }
      ],
      versionLabel: "1902 五幕首演；1904 Fromont 首版管弦总谱与 1905 配器修订另行登记",
      keywords: ["佩利亚斯与梅丽桑德", "佩列阿斯与梅丽桑德", "Pelléas et Mélisande", "Pelleas et Melisande", "FL 93", "CD 93", "1902-04-30", "Opéra-Comique", "Paris", "Mary Garden", "Jean Périer", "Albert Carré", "Maurice Maeterlinck", "首演"],
      evidenceRefs: ["debussy-bnf-pelleas-premiere-1902", "debussy-opera-comique-pelleas-history"],
      sourceTitle: "BnF Catalogue général · Notice de spectacle · Pelléas et Mélisande · FRBNF42253396",
      sourceUrl: "https://catalogue.bnf.fr/ark:/12148/cb42253396j",
      locator: "FRBNF42253396; ARK ark:/12148/cb42253396j; creation and representation Paris Opéra-Comique 1902-04-30; five acts; Albert Carré; Maurice Maeterlinck; Claude Debussy; Mary Garden; Jean Périer",
      claim: "BnF 的 spectacle notice 把五幕《Pelléas et Mélisande》的创作/演出精确定位到 1902 年 4 月 30 日巴黎 Opéra-Comique，列出 Albert Carré、Maurice Maeterlinck、Claude Debussy、Mary Garden 与 Jean Périer；Opéra-Comique 官方历史页独立确认同日首演、五幕体裁与 Maeterlinck 原作关系。",
      boundary: "这是机构 spectacle notice 与演出机构历史页支持的首演导航，不是完整原始节目单、首演总谱、完整阵容或演出图像。BnF 当前记录只明确列出 Mary Garden 与 Jean Périer 两位表演者，不从常识补写指挥或其余角色；1902 首演、1904 Fromont 总谱、1905 配器修订和现代演出保持不同对象层。",
      visibility: "public-link",
      verification: "official-bnf-spectacle-notice-and-opera-comique-history-verified-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze(["https://www.opera-comique.com/fr/310-ans-d-histoire"])
    },
    {
      id: "event:debussy-string-quartet-premiere-1893",
      personId: "debussy",
      workPathId: "work:debussy-string-quartet-op10",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《G 小调弦乐四重奏》巴黎首演",
      workTitle: "Quatuor à cordes / String Quartet in G minor, Op.10 / FL 91",
      date: "1893-12-29",
      dateLabel: "1893-12-29",
      location: {
        venue: "当前机构来源未细化物理场馆",
        city: "Paris",
        country: "France"
      },
      institution: "Société nationale de musique",
      participants: [
        { role: "作曲家", name: "Claude Debussy" },
        { role: "题献对象 / 首演者", name: "Quatuor Ysaÿe" }
      ],
      versionLabel: "1892—1893 创作 / 1893-12-29 首演 / 1894 Durand 首版",
      keywords: ["G 小调弦乐四重奏", "德彪西弦乐四重奏", "Quatuor à cordes", "String Quartet in G minor", "Op.10", "FL 91", "1893-12-29", "Paris", "巴黎", "Société nationale de musique", "Quatuor Ysaÿe", "首演"],
      evidenceRefs: ["debussy-bnf-string-quartet-work-13911421", "debussy-philharmonie-string-quartet-premiere-1893"],
      sourceTitle: "BnF Notice de titre musical / Philharmonie de Paris · Quatuor à cordes",
      sourceUrl: "https://catalogue.bnf.fr/ark:/12148/cb13911421n",
      locator: "BnF FRBNF13911421: composition 1892—1893; dedication Quatuor Ysaÿe; first performance Paris, Société nationale de musique, 29 Dec 1893 by the dedicatees; first edition Durand 1894. Philharmonie de Paris independently states 29 Dec 1893, Paris, Société nationale, Quatuor Ysaÿe.",
      claim: "BnF 的 FL 91 作品权威记录把《G 小调弦乐四重奏》首演定位到 1893 年 12 月 29 日巴黎 Société nationale de musique，由题献对象 Quatuor Ysaÿe 演奏；Philharmonie de Paris 的机构作品页独立确认同一日期、城市、机构和演奏团体。",
      boundary: "两条来源都是现代机构记录，不是 1893 原始节目单。它们支持日期、城市、Société nationale de musique 与 Quatuor Ysaÿe，但当前选定记录没有细化物理演出厅；因此事件卡明确保持场馆未知，不采纳 IMSLP 页面单独列出的 Salle Pleyel。现代页面的图像、音视频与分析也不因首演事实而获得本站复制、播放或托管许可。",
      visibility: "public-link",
      verification: "official-bnf-work-authority-and-philharmonie-programme-note-verified-no-original-programme-or-exact-hall",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://edutheque.philharmoniedeparis.fr/0759345-quatuor-a-cordes-de-claude-debussy.aspx?_lg=fr-FR"
      ])
    },
    {
      id: "event:debussy-jeux-premiere-1913",
      personId: "debussy",
      workPathId: "work:debussy-jeux-cd133",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《游戏》1913 巴黎世界首演",
      workTitle: "Jeux : poème dansé, FL 133 / CD 133",
      date: "1913-05-15",
      dateLabel: "1913-05-15",
      location: {
        venue: "Théâtre des Champs-Élysées",
        city: "Paris",
        country: "France"
      },
      institution: "Ballets Russes",
      participants: [
        { role: "作曲家", name: "Claude Debussy" },
        { role: "编舞 / 舞者（年轻男子）", name: "Vaslav Nijinsky" },
        { role: "舞者（年轻女子）", name: "Tamara Karsavina" },
        { role: "舞者（年轻女子）", name: "Ludmilla Schollar" },
        { role: "指挥", name: "Pierre Monteux" },
        { role: "布景 / 服装", name: "Léon Bakst" },
        { role: "舞台监督", name: "Serge Grigoriev" }
      ],
      versionLabel: "1912-08—1913-04 原作 / 1913-05-15 Ballets Russes 首演",
      keywords: ["德彪西游戏", "Jeux", "poème dansé", "FL 133", "CD 133", "1913-05-15", "Paris", "Théâtre des Champs-Élysées", "Ballets Russes", "Vaslav Nijinsky", "Tamara Karsavina", "Ludmilla Schollar", "Pierre Monteux", "Léon Bakst", "Serge Grigoriev", "FRBNF40175015", "FRBNF13911402", "FRBNF39615654", "世界首演"],
      evidenceRefs: ["debussy-bnf-jeux-work-13911402", "debussy-bnf-jeux-premiere-1913-40175015", "debussy-bnf-jeux-letter-godet-1913-39615654"],
      sourceTitle: "BnF Catalogue général · Notice de spectacle · Jeux · FRBNF40175015",
      sourceUrl: "https://catalogue.bnf.fr/ark:/12148/cb40175015b",
      locator: "FRBNF40175015; ark:/12148/cb40175015b; creation; Paris Théâtre des Champs-Elysées 1913-05-15; Nijinsky choreography and young-man role; Karsavina and Schollar young-woman roles; Pierre Monteux conductor; Ballets Russes; Bakst sets/costumes; Grigoriev stage management; record compiled from BnF 1979 Diaghilev/Ballets Russes exhibition catalogue",
      claim: "BnF 的 spectacle notice FRBNF40175015 把《Jeux》的 creation 定位到 1913 年 5 月 15 日巴黎 Théâtre des Champs-Élysées，列出 Nijinsky 的编舞与年轻男子角色、Karsavina 和 Schollar 的年轻女子角色、Monteux 指挥、Bakst 布景服装、Grigoriev 舞台监督及 Ballets Russes；BnF FL 133 作品权威记录和 1913-06-09 书信条目的目录注记独立支持同一日期、场馆和指挥。",
      boundary: "spectacle notice 明确说明它依据 BnF 1979 年《Diaghilev les Ballets Russes》展览目录编写，不是 1913 原始节目单；书信条目支持的是一页自笔签名书信的对象身份及现代目录注记，本轮没有阅读或转录信件正文。IMSLP General Information 单列 1913-05-13，与两条 BnF 机构记录冲突，事件卡采用 BnF 的 1913-05-15，同时保留冲突等待原始节目、报刊或演出日志复核。目录事实不授予节目、图像、舞台影像或音乐材料的复制与托管许可。",
      visibility: "public-link",
      verification: "official-bnf-work-authority-spectacle-and-letter-item-records-verified-derived-notice-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://catalogue.bnf.fr/ark:/12148/cb13911402c",
        "https://catalogue.bnf.fr/ark:/12148/cb39615654n",
        "https://imslp.org/wiki/Jeux_%28Debussy%2C_Claude%29"
      ])
    },
    {
      id: "event:mahler-symphony-1-premiere-1889",
      personId: "mahler",
      workPathId: "work:mahler-symphony-1-blumine",
      eventType: "version-premiere",
      eventLabel: "五乐章版本首演",
      title: "《第一交响曲》五乐章版本布达佩斯首演",
      workTitle: "Symphonische Dichtung in zwei Abteilungen · later Symphony No. 1",
      date: "1889-11-20",
      dateLabel: "1889-11-20",
      location: {
        venue: "Vigadó, großer Saal",
        city: "Budapest",
        country: "Hungary"
      },
      institution: "Budapester Philharmonische Gesellschaft / Budapester Philharmoniker",
      participants: [
        { role: "作曲家 / 指挥", name: "Gustav Mahler" }
      ],
      versionLabel: "GMW 11,1 · Symphonische Dichtung in zwei Abteilungen · 两部分五乐章早期状态；1893 GMW 11,2 仍含 Blumine，1896 后改为四乐章",
      keywords: ["马勒", "第一交响曲", "Symphony No.1", "Symphonische Dichtung", "GMW 11,1", "GMW 11,2", "V-001-002162", "1889-11-20", "Vigadó", "布达佩斯", "Blumine", "五乐章", "首演"],
      evidenceRefs: ["mahler-igmg-symphony1-premiere-program-v001002162", "mahler-foundation-symphony-1-history"],
      sourceTitle: "IGMG · Budapester Philharmoniker 1889/90 · V-001-002162",
      sourceUrl: "https://www.gustav-mahler.org/archiv/veranstaltungsprogramme/v-001/V-001-002162.pdf",
      relatedSourceUrls: ["https://hdl.handle.net/21.11115/0000-0014-3D5D-F", "https://mahlerfoundation.org/mahler/compositions/symphony-no-1/symphony-no-1-history/"],
      locator: "V-001-002162; Budapest Vigadó großer Saal; 20 November 1889; item 2 Symphonische Dichtung in zwei Abteilungen; first performance under the composer's direction; GMW 11,1",
      claim: "原始节目单把该作的首次演出精确定位到 1889-11-20 布达佩斯 Vigadó 大厅，并标明两部分五乐章的《Symphonische Dichtung》由作曲家 Gustav Mahler 指挥；Mahler Foundation 只作为后续 1893/1894 Blumine 与 1896 四乐章状态的交叉导航。",
      boundary: "V-001-002162 是一页匈牙利文节目单副本；它能支持日期、场馆、早期题名、两部分五乐章结构和 Mahler 指挥，但不能补齐全部乐手或倒推出所用谱本。Hermine Braga 演唱同场 Mozart 咏叹调，Erkel Sándor 及其作品也属于同场其他节目，均不写入这部交响曲的参与者。对象 PDM 不扩展到网站、翻译、现代谱本、音频或本站托管。",
      visibility: "public-link",
      verification: "primary-programme-pdf-file-and-visual-page-verified-with-institutional-version-history-cross-check",
      humanReviewed: false,
      aiGenerated: false
    },
    {
      id: "event:mahler-symphony-2-complete-premiere-1895",
      personId: "mahler",
      workPathId: "work:mahler-symphony-2-resurrection",
      eventType: "premiere",
      eventLabel: "完整首演",
      title: "《第二交响曲“复活”》柏林完整首演",
      workTitle: "Symphony No. 2 in C minor ‘Auferstehung’",
      date: "1895-12-13",
      dateLabel: "1895-12-13",
      location: {
        venue: "Philharmonie",
        city: "Berlin",
        country: "Germany"
      },
      institution: "Mahler Foundation / Berliner Philharmoniker",
      participants: [
        { role: "作曲家 / 指挥", name: "Gustav Mahler" },
        { role: "女高音 / 女低音独唱（当前来源未逐项对应声部）", name: "Josephine von Artner" },
        { role: "女高音 / 女低音独唱（当前来源未逐项对应声部）", name: "Hedy Feldenova" },
        { role: "管弦乐团", name: "Berlin Philharmonic Orchestra" },
        { role: "合唱团", name: "Stern’scher Gesangverein" },
        { role: "合唱团", name: "Sängerbund des Lehrervereins" },
        { role: "合唱指挥", name: "Julius Friedrich Gernsheim" }
      ],
      versionLabel: "1895-03-04 前三乐章首演 / 1895-12-13 全曲完整首演",
      keywords: ["马勒", "第二交响曲", "复活交响曲", "Symphony No.2", "Auferstehung", "GMW 30", "1895-12-13", "Philharmonie", "Berlin", "Berliner Philharmoniker", "Gustav Mahler", "Josephine von Artner", "Hedy Feldenova", "Stern’scher Gesangverein", "Sängerbund des Lehrervereins", "完整首演"],
      evidenceRefs: ["mahler-foundation-symphony-2-premiere-1895", "mahler-berlin-phil-symphony-2-premiere", "mahler-foundation-symphony-2-history"],
      sourceTitle: "Mahler Foundation · 1895 Concert Berlin 13-12-1895 · Symphony No. 2 (Premiere)",
      sourceUrl: "https://mahlerfoundation.org/mahler/locations/germany/berlin/concert-berlin-13-12-1895/",
      locator: "Chronology 1895; Philharmonie; Symphony No. 2 premiere; Josephine von Artner and Hedy Feldenova; Gustav Mahler; Berlin Philharmonic Orchestra; Stern’scher Gesangverein; Sängerbund des Lehrervereins; concert c083",
      claim: "Mahler Foundation 的事件页把 1895 年 12 月 13 日柏林 Philharmonie 的《第二交响曲》演出登记为全曲世界首演，列出马勒指挥、Berlin Philharmonic Orchestra、两位独唱者及两个合唱团；Berliner Philharmoniker 的机构史页面独立确认日期、全曲首演和作曲家指挥。",
      boundary: "两张现代机构页面可支持日期、城市、场馆、事件性质和列名参与者，但不是已核验的 1895 原始节目单；当前来源未逐项对应 von Artner 与 Feldenova 的女高音/女低音声部，也不据此补写所有乐手、合唱成员、排练过程或首演所用谱本。页面文字、历史图像、现代演出视频、节目单、音频和复制/托管许可保持分层。",
      visibility: "public-link",
      verification: "two-official-institutional-pages-cross-verified-no-original-programme-or-media",
      humanReviewed: false,
      aiGenerated: false
    },
    {
      id: "event:mahler-symphony5-premiere-1904",
      personId: "mahler",
      workPathId: "work:mahler-symphony-5",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《第五交响曲》1904 科隆世界首演",
      workTitle: "Symphony No. 5 in C-sharp minor, GMW 44",
      date: "1904-10-18",
      dateLabel: "1904-10-18",
      location: {
        venue: "Gürzenich, Großer Saal",
        city: "Cologne / Köln",
        country: "Germany"
      },
      institution: "Concert-Gesellschaft Köln",
      participants: [
        { role: "作曲家 / 指挥", name: "Gustav Mahler" },
        { role: "管弦乐团", name: "Gürzenich-Orchester" }
      ],
      versionLabel: "1904-10-18 世界首演层；1905、1911 修订及后续批判版另行登记",
      keywords: ["马勒第五交响曲", "第五交响曲", "Symphony No. 5", "GMW 44", "1904-10-18", "Gürzenich", "Großer Saal", "Köln", "Cologne", "Concert-Gesellschaft Köln", "Gürzenich-Orchester", "Gustav Mahler", "V-001-002141", "世界首演"],
      evidenceRefs: ["mahler-igmg-symphony5-premiere-program-v001002141"],
      sourceTitle: "Internationale Gustav Mahler Gesellschaft · V-001-002141 · Uraufführung der Fünften Symphonie",
      sourceUrl: "https://www.gustav-mahler.org/libraryid/20017",
      locator: "V-001-002141; 7-page programme; cover: Dienstag den 18. Oktober 1904, abends 7 Uhr, Erstes Gürzenich-Konzert; programme p.2: Fünfte Symphonie in five movements, Uraufführung unter persönlicher Leitung des Komponisten; Kölnische Zeitung announcements on programme pp.5 and 7",
      claim: "IGMG 的原始节目对象 V-001-002141 将 Concert-Gesellschaft Köln 1904/05 第一场 Gürzenich 音乐会定位到 1904 年 10 月 18 日、Gürzenich 大厅；节目第 2 页列出《第五交响曲》五个乐章，并明确写作由作曲家亲自指挥的世界首演。对象页同时登记 Gürzenich-Orchester 与 Gustav Mahler。",
      boundary: "原始节目支持 1904-10-18，优先于 Mahler Foundation 手稿总表所写的 1904-10-19；后者作为来源差异保留。IGMG 对象页的 Lula Mysz-Gmeiner（alto）和 August von Othegraven（piano）是整场级字段，节目内容显示其参与舒伯特项目，不属于纯管弦乐《第五交响曲》阵容，因此事件卡不收录二人。节目 PDF 的对象层 PDM 不扩展到 IGMG 网站、现代版本、表演、录音、目标地域或本站再托管。",
      visibility: "public-link",
      verification: "official-primary-programme-item-and-seven-page-same-source-pdf-verified-date-discrepancy-and-work-specific-cast-boundary-retained",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.gustav-mahler.org/archiv/veranstaltungsprogramme/v-001/V-001-002141.pdf",
        "https://hdl.handle.net/21.11115/0000-0014-3CF5-3",
        "https://mahlerfoundation.org/mahler/locations/germany/cologne/1904-concert-cologne-18-10-1904/",
        "https://imslp.org/wiki/Symphony_No.5_%28Mahler%2C_Gustav%29"
      ])
    },
    {
      id: "event:mahler-symphony-6-premiere-1906",
      personId: "mahler",
      workPathId: "work:mahler-symphony-6",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《第六交响曲》埃森世界首演",
      workTitle: "Symphony No. 6 in A minor, GMW 46",
      date: "1906-05-27",
      dateLabel: "1906-05-27",
      location: {
        venue: "Städtischer Saalbau",
        city: "Essen",
        country: "Germany"
      },
      institution: "Stadt Essen / Mahler Foundation / Essener Philharmoniker",
      participants: [
        { role: "作曲家 / 指挥", name: "Gustav Mahler" },
        { role: "联合市立管弦乐团", name: "Municipal orchestras of Essen and Utrecht" }
      ],
      versionLabel: "首演排练期间由初始 Scherzo/Andante 次序改为 Andante/Scherzo；确切首演用谱仍待原始节目与演出材料核对",
      keywords: ["马勒", "马勒第六交响曲", "Symphony No. 6", "GMW 46", "1906-05-27", "Städtischer Saalbau", "Essen", "Essener Philharmoniker", "Utrecht", "Allgemeiner deutscher Musikverein", "Tonkünstlerfest", "世界首演"],
      evidenceRefs: ["mahler-essen-symphony-6-premiere-1906", "mahler-foundation-symphony-6-history"],
      sourceTitle: "Stadt Essen · 1906 premiere of Mahler’s Sixth / Mahler Foundation · 1906 Concert Essen",
      sourceUrl: "https://www.essen.de/meldungen/pressemeldung_1307510.de.html",
      locator: "1906-05-27; alter Essener Saalbau; Tonkünstlerfest des Allgemeinen deutschen Musikvereins; Mahler personally conducted; Mahler Foundation concert c185 and rehearsal record",
      claim: "埃森市官方页面记载马勒于 1906 年 5 月 27 日在旧 Essener Saalbau 亲自指挥 Essener Philharmoniker，首演其《第六交响曲》；Mahler Foundation 的事件页独立登记同日 Städtischer Saalbau、第四场音乐会、全曲首演及 Essen 与 Utrecht 两支市立乐团的联合阵容。",
      boundary: "两条现代机构记录可以互证日期、城市、场馆、首演性质、马勒指挥和联合乐团；它们不是已取得的 1906 原始节目单或首演分谱。Mahler Foundation 的整场‘Concert Conductors’字段同时列 Richard Strauss 与 Gustav Mahler，不能据此把 Strauss 写成《第六交响曲》指挥；IMSLP General Information 写作 1906-05-26，与两条机构记录冲突，故保留待原始节目核定。页面图像、原始节目、演出材料与复制权均未取得。",
      visibility: "public-link",
      verification: "two-institutional-event-records-cross-verified-date-conflict-retained-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.mahlerfoundation.org/mahler/locations/germany/essen/1906-concert-essen-27-05-1906/",
        "https://www.theater-essen.de/ihr-besuch/spielstaetten/philharmonie/"
      ])
    },
    {
      id: "event:mahler-das-lied-premiere-1911",
      personId: "mahler",
      workPathId: "work:mahler-das-lied-von-der-erde",
      eventType: "premiere",
      eventLabel: "遗作首演",
      title: "《大地之歌》慕尼黑遗作首演",
      workTitle: "Das Lied von der Erde, GMW 49-O",
      date: "1911-11-20",
      dateLabel: "1911-11-20",
      location: {
        venue: "Tonhalle München",
        city: "Munich",
        country: "Germany"
      },
      institution: "Konzertbureau Emil Gutmann / Konzertvereins-Orchester München",
      participants: [
        { role: "指挥", name: "Bruno Walter" },
        { role: "女低音", name: "Madame Charles Cahier" },
        { role: "男高音", name: "William Miller" },
        { role: "管弦乐团", name: "Konzertvereins-Orchester München" }
      ],
      versionLabel: "GMW 49-O 管弦乐版遗作首演；GMW 49-K 声乐与钢琴版及后续出版/批判版另行登记",
      keywords: ["马勒", "大地之歌", "Das Lied von der Erde", "GMW 49-O", "1911-11-20", "Tonhalle München", "Bruno Walter", "Madame Charles Cahier", "William Miller", "Konzertvereins-Orchester München", "V-001-001144", "遗作首演"],
      evidenceRefs: ["mahler-igmg-das-lied-premiere-program-10272", "mahler-munich-phil-das-lied-premiere", "mahler-igmg-das-lied-work-gmw49"],
      sourceTitle: "Internationale Gustav Mahler Gesellschaft · Gedächtnis-Feier für Gustav Mahler · V-001-001144",
      sourceUrl: "https://www.gustav-mahler.org/libraryid/10272",
      locator: "Object 10272 / V-001-001144; programme PDF sequence p.5 headed TONHALLE; Montag den 20. November 1911, 8 Uhr; I. Abteilung Uraufführung Das Lied von der Erde; Bruno Walter; Madame Charles Cahier; William Miller; Konzertvereins-Orchester München",
      claim: "IGMG 保存的原始印刷节目单在 1911 年 11 月 20 日 Tonhalle München 的第一部分明确标出《大地之歌》首演、六个乐章、Bruno Walter 指挥、Madame Charles Cahier 与 William Miller 独唱，并列 Konzertvereins-Orchester München；慕尼黑爱乐机构史独立确认该乐团当时以 Konzertvereins-Orchester 名义完成首演。",
      boundary: "对象页同时覆盖 11 月 19—20 日纪念活动，而本事件日期取自节目 PDF 中 20 日页面；整场节目第二部分是《第二交响曲》，页面总名单中的 Marie Möhl-Knabl、Oratorien-Verein Augsburg 与 Ludwig Maier 不属于《大地之歌》第一部分，故未并入本事件阵容。对象级 PDM、网站版权、节目单图像、现代机构史与本站复制/托管权保持分层；本轮只登记必要事实与外链。",
      visibility: "public-link",
      verification: "primary-programme-page-and-performing-institution-history-cross-verified-object-pdm-no-rehosting",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.gustav-mahler.org/archiv/veranstaltungsprogramme/v-001/V-001-001144.pdf",
        "https://hdl.handle.net/21.11115/0000-0014-3C4E-1",
        "https://www.mphil.de/en/about-us/history"
      ])
    },
    {
      id: "event:schoenberg-pierrot-premiere-1912",
      personId: "schoenberg",
      workPathId: "work:schoenberg-pierrot-lunaire",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《月光小丑》柏林首演",
      workTitle: "Pierrot lunaire, Op.21",
      date: "1912-10-16",
      dateLabel: "1912-10-16",
      location: {
        venue: "Choralionsaal",
        city: "Berlin",
        country: "Germany"
      },
      institution: "Arnold Schönberg Center",
      participants: [
        { role: "念唱 / 首位诠释者 / 委约与资助者", name: "Albertine Zehme" },
        { role: "作曲家 / 指挥", name: "Arnold Schönberg" }
      ],
      versionLabel: "1912-10-09 受邀演出 / 1912-10-16 公开世界首演；1912 CM* 演出材料已散佚",
      keywords: ["月光小丑", "月迷彼埃罗", "Pierrot lunaire", "Op.21", "IAS 31", "Work ID 478", "1912-10-09", "1912-10-16", "柏林", "Choralionsaal", "Albertine Zehme", "Arnold Schönberg", "CM*", "首演"],
      evidenceRefs: ["schoenberg-asc-pierrot-work-478", "schoenberg-pierrot-premiere-1912"],
      sourceTitle: "Arnold Schönberg Center Works Database · Pierrot lunaire · Work ID 478",
      sourceUrl: "https://archive2.schoenberg.at/compositions/werke_einzelansicht.php?herkunft=allewerke&werke_id=478",
      locator: "Work ID 478; invited performance 9 October 1912; public world premiere 16 October 1912; Berlin Choralion-Saal; Albertine Zehme first interpreter / commissioner / dedicatee / sponsor; Arnold Schönberg conductor",
      claim: "Arnold Schönberg Center Work ID 478 把 1912 年 10 月 9 日 Choralion-Saal 受邀演出与 10 月 16 日同场地公开世界首演分开，记录 Albertine Zehme 为作品委约者、首位诠释者、题献对象与资助者，并列 Arnold Schönberg 为指挥；中心历史报刊页面独立确认正式首演日期与作曲家执棒。",
      boundary: "Work ID 478 还列出第一轮巡演组合，但没有在该字段逐人声明他们全部参加 10 月 16 日公开首演，因此本事件不把 Eduard Steuermann、Jakob Maliniak、Hans Kindler、Hendrik W. de Vries、Karl Eßberger 或 Hermann Scherchen倒填为正式首演阵容。1912 CM* 演出材料已经散佚，本轮也未见完整原始节目单；受邀演出、公开首演、来源 B/C、1914 初版和后世录音保持分层。",
      visibility: "public-link",
      verification: "official-work-database-and-institutional-press-page-cross-verified-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://schoenberg.at/en/newsblog/from-the-archive-historical-press-archive",
        "https://schoenberg.at/en/newsblog/110th-anniversary-members-of-the-press-uninvited",
        "https://archive2.schoenberg.at/compositions/quellen_einzelansicht.php?herkunft=allewerke&id_gatt=&id_quelle=1505&id_untergatt=&werke_id=478"
      ])
    },
    {
      id: "event:schoenberg-verklarte-nacht-premiere-1902",
      personId: "schoenberg",
      workPathId: "work:schoenberg-verklarte-nacht",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《升华之夜》维也纳首演",
      workTitle: "Verklärte Nacht, Op.4",
      date: "1902-03-18",
      dateLabel: "1902-03-18",
      location: {
        venue: "Kleiner Musikvereins-Saal",
        city: "Vienna",
        country: "Austria"
      },
      institution: "Arnold Schönberg Center",
      participants: [
        { role: "作曲家", name: "Arnold Schönberg" },
        { role: "演奏团体", name: "Rosé-Quartett" },
        { role: "首演参与者（乐器待原始节目单逐项核对）", name: "Franz Jelinek" },
        { role: "首演参与者（乐器待原始节目单逐项核对）", name: "Franz Schmidt" }
      ],
      versionLabel: "1899 弦乐六重奏原作 / 1902 首演 / 1905 印刷 / 1917 与 1943 弦乐团版本",
      keywords: ["升华之夜", "净化之夜", "净夜", "Verklärte Nacht", "Transfigured Night", "Op.4", "1902-03-18", "Kleiner Musikvereins-Saal", "Vienna", "维也纳", "Rosé-Quartett", "Franz Jelinek", "Franz Schmidt", "首演"],
      evidenceRefs: ["schoenberg-asc-verklarte-nacht-work-420", "schoenberg-asc-verklarte-nacht-program-4892"],
      sourceTitle: "Arnold Schönberg Center · Verklärte Nacht · original string-sextet version",
      sourceUrl: "https://archive2.schoenberg.at/compositions/werke_einzelansicht.php?herkunft=allewerke&werke_id=420",
      locator: "Official works database: Op.4; composition 09.1899–01.12.1899; premiere 18 March 1902, Wien, Kleiner Musikvereins-Saal; Rosé-Quartett, Franz Jelinek, Franz Schmidt; programme source ASC Image Archive ID 4892",
      claim: "Arnold Schönberg Center 的作品数据库把《Verklärte Nacht》弦乐六重奏原作登记为 1899 年完成，并记录 1902 年 3 月 18 日在维也纳 Kleiner Musikvereins-Saal 首演，由 Rosé-Quartett、Franz Jelinek 与 Franz Schmidt 参与；作品页把首演依据回链到 ASC 节目单对象 CP4892。",
      boundary: "作品数据库同时说明首演所用分谱已经散佚，因此不能把 1899 自笔稿、1902 实际演出状态和 1905 印刷本写成已经逐页一致。CP4892 的 Access Open 只是访问状态；ASC 图像档案与使用规则要求出版用高分辨率复制另行订购，档案文献复制须书面许可。事件卡不托管节目单图像、谱面、录音或下载文件。",
      visibility: "public-link",
      verification: "official-work-database-and-item-level-programme-record-verified-reproduction-permission-required",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://archive.schoenberg.at/resources/pages/view.php?k=6be7bbdd17",
        "https://schoenberg.at/en/schoenberg/kompositionen/transfigured-night-op-4",
        "https://schoenberg.at/images/stories/bilder_statische_artikel/archiv/benutzungsordnung-e.pdf"
      ])
    },
    {
      id: "event:schoenberg-string-quartet-2-premiere-1908",
      personId: "schoenberg",
      workPathId: "work:schoenberg-string-quartet-2",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《第二弦乐四重奏》维也纳首演",
      workTitle: "Streichquartett Nr. 2 fis-Moll, Op.10",
      date: "1908-12-21",
      dateLabel: "1908-12-21",
      location: {
        venue: "Bösendorfersaal",
        city: "Vienna",
        country: "Austria"
      },
      institution: "Arnold Schönberg Center",
      participants: [
        { role: "作曲家", name: "Arnold Schönberg" },
        { role: "女高音", name: "Marie Gutheil-Schoder" },
        { role: "弦乐四重奏", name: "Rosé-Quartett" }
      ],
      versionLabel: "1907—1908 原作 / 1908-12-21 首演 / 1909 自印初版与后续修订另行登记",
      keywords: ["第二弦乐四重奏", "String Quartet No.2", "Streichquartett Nr. 2", "Op.10", "1908-12-21", "Bösendorfersaal", "Vienna", "Wien", "Marie Gutheil-Schoder", "Rosé-Quartett", "首演"],
      evidenceRefs: ["schoenberg-asc-string-quartet-2-work-404", "schoenberg-asc-string-quartet-2-premiere-1908"],
      sourceTitle: "Arnold Schönberg Center Works Database · Streichquartett Nr. 2 · Originalfassung",
      sourceUrl: "https://archive2.schoenberg.at/compositions/werke_einzelansicht.php?herkunft=allewerke&werke_id=404",
      locator: "Work ID 404; Op.10; Entstehungszeitraum 03.1907–08.1908; Uraufführung 21 December 1908, Wien, Bösendorfersaal; Marie Gutheil-Schoder, soprano; Rosé-Quartett",
      claim: "Arnold Schönberg Center 的作品数据库把《第二弦乐四重奏》原作登记为 1907 年 3 月至 1908 年 8 月创作，并记录 1908 年 12 月 21 日在维也纳 Bösendorfersaal 首演，由 Marie Gutheil-Schoder 担任女高音、Rosé-Quartett 演奏。",
      boundary: "这是 ASC 现代作品与来源数据库中的首演记录，不是本轮已见的 1908 原始节目单、首演分谱或完整报刊档案；数据库明确列出的日期、场馆和两组表演者之外不补写人员。首演事件、1909 自印初版、1921/1925 修订研究总谱、1936 录音和任何谱面/图像/音频权利保持分层。",
      visibility: "public-link",
      verification: "official-item-level-work-and-premiere-database-verified-no-original-programme-seen",
      humanReviewed: false,
      aiGenerated: false
    },
    {
      id: "event:schoenberg-erwartung-premiere-1924",
      personId: "schoenberg",
      workPathId: "work:schoenberg-erwartung",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《期待》布拉格首演",
      workTitle: "Erwartung. Monodram in einem Akt, Op.17",
      date: "1924-06-06",
      dateLabel: "1924-06-06",
      location: {
        venue: "Deutsches Landestheater",
        city: "Prague",
        country: "Czechoslovakia"
      },
      institution: "International Society for Contemporary Music festival / Arnold Schönberg Center record",
      participants: [
        { role: "作曲家", name: "Arnold Schönberg" },
        { role: "女高音 / Eine Frau", name: "Marie Gutheil-Schoder" },
        { role: "指挥", name: "Alexander Zemlinsky" }
      ],
      versionLabel: "1909 原作 / 1917-04-05 首印发行 / 1924-06-06 首演",
      keywords: ["期待", "Erwartung", "Expectation", "Op.17", "1924-06-06", "Prague", "Prag", "Deutsches Landestheater", "Marie Gutheil-Schoder", "Alexander Zemlinsky", "Eine Frau", "首演"],
      evidenceRefs: ["schoenberg-asc-erwartung-work-premiere"],
      sourceTitle: "Arnold Schönberg Center Works Database · Erwartung op.17 · Work ID 472",
      sourceUrl: "https://archive2.schoenberg.at/compositions/werke_einzelansicht.php?herkunft=allewerke&werke_id=472",
      locator: "Work ID 472; Op.17; Uraufführung 6 June 1924, Prag, Deutsches Landestheater; Marie Gutheil-Schoder, Eine Frau; Alexander Zemlinsky, Dirigent",
      claim: "Arnold Schönberg Center Work ID 472 记录《Erwartung》Op.17 于 1924 年 6 月 6 日在布拉格 Deutsches Landestheater 首演，由 Marie Gutheil-Schoder 饰演唯一舞台角色 Eine Frau，Alexander Zemlinsky 指挥。",
      boundary: "这是 ASC 现代作品与来源数据库中的首演记录，不是本轮已见的 1924 原始节目单、首演总谱、乐团名册或完整评论档案；只能写入页面明确列出的日期、场馆、歌者和指挥，不补写未列乐团、同场曲目或额外人员。首演事件与 1909 手稿、1917 首印、1960 录音及 1962? 载体保持分层。",
      visibility: "public-link",
      verification: "official-item-level-work-and-premiere-database-verified-no-original-programme-seen",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze(["https://schoenberg.at/en/schoenberg/kompositionen/expectation-op17"])
    },
    {
      id: "event:schoenberg-gurre-lieder-premiere-1913",
      personId: "schoenberg",
      workPathId: "work:schoenberg-gurre-lieder",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《古雷之歌》全曲维也纳世界首演",
      workTitle: "Gurre-Lieder für Soli, Chor und Orchester",
      date: "1913-02-23",
      dateLabel: "1913-02-23",
      location: {
        venue: "Großer Musikvereins-Saal",
        city: "Vienna",
        country: "Austria"
      },
      institution: "Musikverein Wien / Arnold Schönberg Center",
      participants: [
        { role: "作曲家", name: "Arnold Schönberg" },
        { role: "指挥", name: "Franz Schreker" },
        { role: "乐团（Musikverein 机构文章所称）", name: "Vorgängerorchester der Wiener Symphoniker" }
      ],
      versionLabel: "1910-01-14 第一部双钢琴八手联弹改编演出 / 1913-02-23 全曲世界首演",
      keywords: ["古雷之歌", "Gurre-Lieder", "Gurre Lieder", "1913-02-23", "Vienna", "Wien", "Großer Musikvereins-Saal", "Musikverein", "Franz Schreker", "Vorgängerorchester der Wiener Symphoniker", "世界首演"],
      evidenceRefs: ["schoenberg-asc-gurre-work-premiere-480"],
      sourceTitle: "Arnold Schönberg Center Works Database · Gurre-Lieder · Work ID 480",
      sourceUrl: "https://archive2.schoenberg.at/compositions/werke_einzelansicht.php?herkunft=allewerke&werke_id=480",
      locator: "Work ID 480: complete world premiere 23 February 1913, Wien, Großer Musikvereins-Saal. Musikverein institutional article: premiere conducted by Franz Schreker with predecessor orchestra of the Wiener Symphoniker",
      claim: "ASC Work ID 480 记录《Gurre-Lieder》全曲于 1913 年 2 月 23 日在维也纳 Großer Musikvereins-Saal 世界首演；Musikverein 的机构文章补充 Franz Schreker 指挥、Wiener Symphoniker 的前身乐团演奏。",
      boundary: "ASC 数据库与 2024 年 Musikverein 机构文章不是本轮已见的 1913 原始节目单；文章没有精确写出历史乐团专名，也没有列出首演歌者、合唱团或完整演职员，因此只保留来源明确支持的作曲家、指挥和‘前身乐团’表述，不补写阵容。1910-01-14 Ehrbar-Saal 的事件只涉及第一部双钢琴八手联弹改编，不得与 1913 全曲世界首演合并。",
      visibility: "public-link",
      verification: "official-work-database-and-performing-institution-cross-check-no-original-programme-seen",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze(["https://multimedia.musikverein.at/musikfreunde/gurren-in-gurre-neun-hashtags-fuer-schoenbergs-gurre-lieder/"])
    },
    {
      id: "event:dvorak-carneval-premiere-1892",
      personId: "dvorak",
      workPathId: "work:dvorak-carneval-recording",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《狂欢节序曲》布拉格首演",
      workTitle: "Karneval, Op.92 / B 169",
      date: "1892-04-28",
      dateLabel: "1892-04-28",
      location: {
        venue: "Rudolfinum",
        city: "Prague",
        country: "Czech lands"
      },
      institution: "National Museum / Antonín Dvořák database",
      participants: [
        { role: "作曲家 / 指挥", name: "Antonín Dvořák" },
        { role: "乐团", name: "National Theatre Orchestra (Orchestr ND)" }
      ],
      versionLabel: "1891 三部曲原作 / 1892-04-28 以 Life (Czech Carnival)、统一 Op.91 首演 / 1894 独立 Op.92 / 录音与批判版另行登记",
      keywords: ["狂欢节序曲", "Karneval", "Carnival Overture", "Nature, Life and Love", "Life (Czech Carnival)", "Op.91", "Op.92", "B 169", "1892-04-28", "Prague", "布拉格", "Rudolfinum", "Antonín Dvořák", "Orchestr ND", "首演"],
      evidenceRefs: ["dvorak-carneval-premiere-1892", "dvorak-academy-carneval-work-trilogy"],
      sourceTitle: "National Museum · Antonín Dvořák · Karneval",
      sourceUrl: "https://antonindvorak.nm.cz/cs/dilo/detail/karneval/202",
      locator: "Karneval work record: Op.92; B169; composition 28 July–12 September 1891; premiere 28 April 1892; Praha, Rudolfinum; conductor Antonín Dvořák; Orchestr ND; 1955 critical-edition record H 1581",
      claim: "国家博物馆的德沃夏克作品数据库把《Karneval》登记为 Op.92 / B 169：1891 年 7 月 28 日开始、9 月 12 日完成，1892 年 4 月 28 日在布拉格 Rudolfinum 首演，由德沃夏克指挥国家剧院乐团。",
      boundary: "国家博物馆作品数据库支持作品号、创作日期、首演日期、地点、指挥和乐团；Academy 作品页补充三部曲总题、Life (Czech Carnival) 与统一 Op.91 的首演题名层。两者都是当代机构记录，不是已取得的 1892 原始节目单；不能把 1894 独立 Op.92 倒填成首演节目上的题名/作品号。首演、1894 首版、ME 9705 壳盘、1935 录音身份、2009 Naxos 再版与 1955 批判版保持不同对象层，也不产生谱面、音频、复制或本站托管许可。",
      visibility: "public-link",
      verification: "official-national-museum-work-and-premiere-record-verified-all-rights-reserved",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze(["https://antonindvorak.nm.cz/en/info/timeline"])
    },
    {
      id: "event:dvorak-new-world-premiere-1893",
      personId: "dvorak",
      workPathId: "work:dvorak-symphony-9",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《自新大陆》纽约首演",
      workTitle: "Symphony No. 9 in E minor, Op.95 / From the New World",
      date: "1893-12-16",
      dateLabel: "1893-12-16",
      location: {
        venue: "Main Hall",
        city: "New York",
        country: "United States"
      },
      institution: "Carnegie Hall",
      participants: [
        { role: "作曲家", name: "Antonín Dvořák" },
        { role: "指挥", name: "Anton Seidl" },
        { role: "乐团", name: "New York Philharmonic" }
      ],
      versionLabel: "1893 Carnegie Hall 首演 / 1894 N. Simrock 首版另行登记",
      keywords: ["自新大陆", "第九交响曲", "Symphony No.9", "From the New World", "1893", "Carnegie Hall", "Main Hall", "Anton Seidl", "New York Philharmonic", "首演"],
      evidenceRefs: ["dvorak-carnegie-new-world-premiere-1893", "dvorak-nyphil-symphony-9-parts-4211-101"],
      sourceTitle: "Carnegie Hall Data · Symphony No. 9 / New York Philharmonic event",
      sourceUrl: "https://data.carnegiehall.org/works/42557/about",
      locator: "Performance Events: New York Philharmonic 1893-12-16T20:15; related event 19396: Main Hall, Anton Seidl, New York Philharmonic, world-premiere comment",
      claim: "Carnegie Hall 数据库把《第九交响曲》1893-12-16 的纽约爱乐演出列入作品事件表；关联事件记录 Main Hall、Anton Seidl、New York Philharmonic，并把该场演出标为《自新大陆》世界首演。",
      boundary: "这是机构作品/事件数据库的日期、地点和参与者导航，不等于完整节目单、首演分谱图像、录音或复制许可；1893-12-15 的公开彩排与 12 月 16 日首演保持分开，NYPhil 分谱记录也不自动变成本站文件。",
      visibility: "public-link",
      verification: "official-carnegie-hall-work-event-record-verified-no-reuse-permission",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze(["https://data.carnegiehall.org/events/19396/about"])
    },
    {
      id: "event:dvorak-cello-concerto-premiere-1896",
      personId: "dvorak",
      workPathId: "work:dvorak-cello-concerto-op104",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《B 小调大提琴协奏曲》伦敦首演",
      workTitle: "Cello Concerto in B minor, Op.104 / B 191",
      date: "1896-03-19",
      dateLabel: "1896-03-19",
      location: {
        venue: "Queen's Hall",
        city: "London",
        country: "United Kingdom"
      },
      institution: "Philharmonic Society (now Royal Philharmonic Society)",
      participants: [
        { role: "大提琴独奏", name: "Leo Stern" },
        { role: "作曲家 / 指挥", name: "Antonín Dvořák" },
        { role: "主办 / 演奏机构", name: "Philharmonic Society" }
      ],
      versionLabel: "1895 新结尾 / 1896-03-19 首演 / 1896 Simrock 首版另行登记",
      keywords: ["B 小调大提琴协奏曲", "Cello Concerto", "Op.104", "B 191", "1896-03-19", "Queen's Hall", "London", "Leo Stern", "Antonín Dvořák", "Philharmonic Society", "Royal Philharmonic Society", "首演"],
      evidenceRefs: ["dvorak-academy-cello-concerto-b191", "dvorak-rps-cello-concerto-premiere-1896"],
      sourceTitle: "Antonín Dvořák encyclopaedia · Cello Concerto, Op.104 / B191",
      sourceUrl: "https://www.antonin-dvorak.cz/en/work/concerto-for-cello-and-orchestra-in-b-minor/",
      locator: "Work record and premiere section: 19 March 1896, Queen's Hall, London; Leo Stern; Philharmonic Society; Antonín Dvořák conducting; RPS official history booklet p.7 independently confirms the 1896 world premiere conducted by the composer",
      claim: "Academy of Classical Music 管理的德沃夏克作品百科把《B 小调大提琴协奏曲》首演登记为 1896 年 3 月 19 日伦敦 Queen's Hall，Leo Stern 独奏、Philharmonic Society 参与、德沃夏克指挥；Royal Philharmonic Society 官方历史册第 7 页独立确认该协会在 1896 年举行作品世界首演并由作曲家指挥。",
      boundary: "两条来源均为现代机构记录，不是 1896 原始节目单。RPS 历史册只交叉确认 1896 世界首演和作曲家指挥，并不单独给出日期、场馆或独奏者；详细字段由德沃夏克作品百科提供。事件中的 Philharmonic Society 不写成后来成立的 London Philharmonic Orchestra，也不据此补出完整乐手名单、首演谱面、录音、图像或复制/托管许可。",
      visibility: "public-link",
      verification: "two-institution-premiere-records-verified-no-original-programme-or-reuse-permission",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://royalphilharmonicsociety.org.uk/assets/files/RPS_A5_History_booklet_08_revised.pdf",
        "https://www.ceskafilharmonie.cz/en/event/31901-london-czech-philharmonic/"
      ])
    },
    {
      id: "event:dvorak-symphony-8-premiere-1890",
      personId: "dvorak",
      workPathId: "work:dvorak-symphony-8",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《第八交响曲》布拉格首演",
      workTitle: "Symphony No. 8 in G major, Op.88 / B 163",
      date: "1890-02-02",
      dateLabel: "1890-02-02",
      location: {
        venue: "Rudolfinum",
        city: "Prague",
        country: "Czech lands"
      },
      institution: "Umělecká beseda · Popular Concert",
      participants: [
        { role: "作曲家 / 指挥", name: "Antonín Dvořák" },
        { role: "乐团", name: "National Theatre Orchestra" }
      ],
      versionLabel: "1889 原作 / 1890-02-02 首演 / 1892 Novello 首版另行登记",
      keywords: ["第八交响曲", "Symphony No. 8", "Op.88", "B 163", "1890-02-02", "Prague", "布拉格", "Rudolfinum", "Umělecká beseda", "Popular Concert", "Antonín Dvořák", "National Theatre Orchestra", "首演"],
      evidenceRefs: ["dvorak-symphony-8-work-premiere-1890"],
      sourceTitle: "Antonín Dvořák encyclopaedia · Symphony No. 8 in G major",
      sourceUrl: "https://www.antonin-dvorak.cz/en/work/symphony-no-8/",
      locator: "Op.88; B163; composition 26 August–8 November 1889; premiere 2 February 1890, Prague; National Theatre Orchestra; Antonín Dvořák; premiere section identifies Rudolfinum and Umělecká beseda Popular Concert",
      claim: "Academy of Classical Music 管理的德沃夏克作品百科记录《第八交响曲》Op.88 / B 163 于 1890 年 2 月 2 日在布拉格首演，国家剧院乐团演奏、德沃夏克指挥；正文进一步定位 Rudolfinum 与 Umělecká beseda 的 Popular Concert。捷克爱乐机构页面独立交叉确认同日首演和作曲家指挥。",
      boundary: "两条来源都是当代机构作品/节目说明，不是 1890 年原始节目单、票据、乐团名册、首演分谱或报刊。作品百科的文本与图像仅限个人非商业使用，本站只保存必要事实、外链和来源边界；不复制页面正文或图像。",
      visibility: "public-link",
      verification: "two-institution-premiere-records-verified-no-original-programme-seen",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.ceskafilharmonie.cz/en/event/29322-season-opening-concert-czech-philharmonic/",
        "https://www.antonin-dvorak.cz/o-portalu/"
      ])
    },
    {
      id: "event:beethoven-eroica-public-premiere-1805",
      personId: "beethoven",
      workPathId: "work:beethoven-symphony-3-eroica",
      eventType: "premiere",
      eventLabel: "首次公开演出",
      title: "《第三交响曲“英雄”》首次公开演出",
      workTitle: "Symphony No. 3 in E-flat major, Op.55 · Sinfonia eroica",
      date: "1805-04-07",
      dateLabel: "1805-04-07",
      location: {
        venue: "Theater an der Wien",
        city: "Vienna",
        country: "Austria"
      },
      institution: "Theater an der Wien / Franz Clement's musical Akademie",
      participants: [
        { role: "Akademie 组织 / 节目纳入", name: "Franz Clement" }
      ],
      versionLabel: "1804 Lobkowitz 私人演出另行保留日期分歧 / 1805-04-07 首次公开呈现",
      keywords: ["第三交响曲", "英雄交响曲", "Eroica", "Sinfonia eroica", "Op.55", "1805-04-07", "Theater an der Wien", "Vienna", "Franz Clement", "Akademie", "首次公开演出", "Lobkowitz"],
      evidenceRefs: ["beethoven-theater-eroica-public-premiere-1805", "beethoven-house-eroica-work", "beethoven-musikverein-eroica-copyists-score"],
      sourceTitle: "Theater an der Wien · Egmont | Eroica · institutional work note",
      sourceUrl: "https://www.theater-wien.at/de/archiv/saison2019-20/1053/Egmont--Eroica",
      locator: "Inhalt / Zum Werk: Franz Clement integrated Eroica into his musical Akademie on 7 April 1805; apart from the private Lobkowitz performance, first public presentation on the Theater an der Wien stage",
      claim: "Theater an der Wien 的机构档案说明，Franz Clement 于 1805 年 4 月 7 日把《英雄交响曲》纳入自己的音乐 Akademie；除去 Lobkowitz 处的私人演出，这是该作第一次在该剧院舞台面向公众呈现。",
      boundary: "该段支持日期、场馆、Franz Clement 的 Akademie 与首次公开呈现，但没有明确标出指挥或完整演出阵容；事件中不把 Clement 或 Beethoven 自动写成指挥，也不采用 IMSLP 由 Wikipedia 链出的 conductor 字段。1804 私人演出另有 Beethoven-Haus‘早春’与 Musikverein‘六月’的来源分歧，因此不在本事件卡中制造单一私人首演日期。",
      visibility: "public-link",
      verification: "official-venue-history-record-verified-role-non-inference-and-private-date-discrepancy-boundary",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.beethoven.de/en/work/view/5529920004423680/Sinfonie%2BNr.%2B3%2B%28Es-Dur%29%2Bop.%2B55%2B%28Sinfonia%2Beroica%29",
        "https://musikverein.at/en/archiv/beethovens_eroica/"
      ])
    },
    {
      id: "event:beethoven-symphony-5-premiere-1808",
      personId: "beethoven",
      workPathId: "work:beethoven-symphony-5",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《第五交响曲》维也纳首演",
      workTitle: "Symphony No. 5 in C minor, Op.67",
      date: "1808-12-22",
      dateLabel: "1808-12-22",
      location: {
        venue: "Theater an der Wien",
        city: "Vienna",
        country: "Austria"
      },
      institution: "Theater an der Wien / Beethoven-Haus Bonn source record",
      participants: [],
      versionLabel: "1808-12-22 首演 / 1808—1809 首版与后续谱本另行登记",
      keywords: ["第五交响曲", "Symphony No. 5", "Op.67", "1808-12-22", "Vienna", "维也纳", "Theater an der Wien", "第六交响曲", "Choral Fantasy", "首演"],
      evidenceRefs: ["beethoven-house-op67-work"],
      sourceTitle: "Beethoven-Haus Bonn · Symphony no. 5 in C minor, op. 67",
      sourceUrl: "https://www.beethoven.de/en/work/view/6260401733894144/Sinfonie%2BNr.%2B5%2B%28c-Moll%29%2Bop.%2B67",
      locator: "Work record and Beethoven-in-Vienna timeline: first performance at Beethoven's concert, Theater an der Wien, 22 December 1808; Fifth and Sixth Symphonies performed together",
      claim: "Beethoven-Haus 的 Op.67 作品记录与维也纳时间线把《第五交响曲》的首次演出定位到 1808 年 12 月 22 日、Theater an der Wien 的贝多芬音乐会，并说明《第五》与《第六交响曲》同场首次演出。",
      boundary: "这是 Beethoven-Haus 机构作品记录和时间线支持的日期、场馆与同场作品关系；不据此补写完整节目单、演奏阵容、指挥身份、首演谱面、图像、录音或复制/托管许可。1808 首演、1808—1809 首版、1862 谱本候选与约 1930 历史录音目录保持分层。",
      visibility: "public-link",
      verification: "official-institutional-work-and-timeline-event-record-verified-no-reuse-permission",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.beethoven.de/en/g/zeittafel-beethoven-in-wien",
        "https://www.beethoven.de/en/media/view/5941101517078528/Au%C3%9Fenansicht%2Bdes%2BTheaters%2Ban%2Bder%2BWien%2C%2Bum%2B1810%2B-%2BReproduktion%2Beines%2Banonymen%2BStichs%2Baus%2Bdem%2Bfr%C3%BChen%2B19.%2BJahrhundert"
      ])
    },
    {
      id: "event:beethoven-ninth-premiere-1824",
      personId: "beethoven",
      workPathId: "work:beethoven-symphony-9",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《第九交响曲》维也纳首演",
      workTitle: "Symphony No. 9 in D minor, Op.125",
      date: "1824-05-07",
      dateLabel: "1824-05-07",
      location: {
        venue: "Kärntnertortheater",
        city: "Vienna",
        country: "Austria"
      },
      institution: "Kärntnertortheater / Staatsbibliothek zu Berlin",
      participants: [
        { role: "作曲家；据 SBB 转述的目击材料参与整体统筹并按自笔总谱提示新速度", name: "Ludwig van Beethoven" },
        { role: "指挥（SBB 原文仅作 Kapellmeister Umlauf）", name: "Kapellmeister Umlauf" }
      ],
      versionLabel: "1824-05-07 首演 / 1824-05-23 维也纳重演 / 后续谱本与录音目录另行登记",
      keywords: ["第九交响曲", "贝多芬第九交响曲", "Symphony No. 9", "Op.125", "1824", "1824-05-07", "1824-05-23", "Vienna", "维也纳", "academy", "Kärntnertortheater", "Kapellmeister Umlauf", "Mus.ms.autogr. Beethoven, L. v. 35, 78a", "Missa solemnis", "Die Weihe des Hauses", "首演", "重演"],
      evidenceRefs: ["beethoven-sbb-ninth-premiere-placard-1824", "beethoven-ninth-premiere-1824"],
      sourceTitle: "Staatsbibliothek zu Berlin · Über die 9. Sinfonie · premiere placard 1824",
      sourceUrl: "https://staatsbibliothek-berlin.de/die-staatsbibliothek/abteilungen/musik/sammlungen/bestaende/l-van-beethoven-9-sinfonie/ueber-die-9-sinfonie/",
      locator: "Plakat zur Uraufführung 1824, Mus.ms.autogr. Beethoven, L. v. 35, 78a; 7 May 1824 Wiener Kärntnertortheater; Beethoven beside conducting Kapellmeister Umlauf; repeat 23 May 1824",
      claim: "柏林国立图书馆把《第九交响曲》首演定位到 1824 年 5 月 7 日维也纳 Kärntnertortheater，并标出首演海报馆藏号 Mus.ms.autogr. Beethoven, L. v. 35, 78a；据其转述的目击材料，贝多芬参与整体统筹，站在指挥 Kapellmeister Umlauf 身旁按自笔总谱提示新速度。Beethoven-Haus 的独立机构页补充同场为一场 academy，并包含《庄严弥撒》三个乐章与《奉献屋》序曲。",
      boundary: "SBB 页面将馆藏对象标题/签名与机构演出史并列，但本项目没有逐字转录 1824 首演海报或核对完整节目与全体阵容。参与者只登记该页明确转述的 Beethoven 与 Kapellmeister Umlauf；不从其他叙述补全独唱、合唱、乐团或把 Umlauf 扩写成未在当前主来源出现的全名。原始海报、工作总谱、首演分谱、现代纪念页面/重演和图像/复制/托管许可保持分层。",
      visibility: "public-link",
      verification: "official-holding-institution-premiere-object-venue-and-participant-history-cross-checked-no-full-programme-or-reuse-permission",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.beethoven.de/en/press/view/5715431570538496/BTHVN2024%2B-%2B200%2Byears%2Bof%2BBeethoven%2526%252339%253Bs%2BNinth",
        "https://www.beethoven.de/en/media/view/5270671751905280/B%C3%BChne%2Bund%2BSitzplan%2Bdes%2BOrchesters%2Bim%2BK%C3%A4rntnertortheater%2BWien%2C%2B1821%2B-%2BStich%2Bvon%2BFranz%2BXaver%2BSt%C3%B6ber?fromArchive=4825812494712832"
      ])
    },
    {
      id: "event:busoni-arlecchino-premiere-1917",
      personId: "busoni",
      workPathId: "work:busoni-arlecchino",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《阿尔莱基诺》苏黎世首演",
      workTitle: "Arlecchino oder Die Fenster, Op.50 / K 270 / BV 270",
      date: "1917-05-11",
      dateLabel: "1917-05-11",
      location: {
        venue: "未在当前作品页中细化",
        city: "Zürich",
        country: "Switzerland"
      },
      institution: "Busoni-Nachlass digital edition",
      participants: [],
      versionLabel: "1917-05-11 苏黎世首演 / 1917 Leipzig 首印与 #870245 声乐谱 / 1918 管弦总谱 / 1992 录音分别登记",
      keywords: ["阿尔莱基诺", "Arlecchino", "Arlecchino oder Die Fenster", "Op.50", "K 270", "BV 270", "GND 300378130", "1917-05-11", "苏黎世", "Zürich", "首演"],
      evidenceRefs: ["busoni-busoni-nachlass-arlecchino-work"],
      sourceTitle: "Busoni-Nachlass · Arlecchino oder Die Fenster",
      sourceUrl: "https://busoni-nachlass.org/de/Werke/E0400133.html",
      locator: "E0400133; Op.50 / K 270; GND 300378130; Werk page XML/History; TEI publicationStmt CC BY-NC-SA 4.0; libretto October 1914; composition 1914–August 1916; first performance 11 May 1917 Zürich; first print 1917 Leipzig; dedicatee Arthur Bodanzky",
      claim: "Busoni-Nachlass E0400133 把《Arlecchino oder Die Fenster》登记为 Op.50 / K 270、GND 300378130，并记录 1914 年 10 月完成剧本、1914 年至 1916 年 8 月作曲、1917 年 5 月 11 日在 Zürich 首演和 1917 年 Leipzig 首次印刷。",
      boundary: "机构数字作品页支持日期、城市、作品版本与公开导航；它不是完整首演节目单、演员/指挥名单、首演谱面、录音或复制许可。当前页面未列完整参与者，不从 Arthur Bodanzky 的题献关系或作者字段推断演出角色；页面/XML、原始作品、谱本和再利用权利保持分层。",
      visibility: "public-link",
      verification: "official-work-page-event-record-verified-no-reuse-permission",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze(["https://busoni-nachlass.org/en/Works/E0400133.xml"])
    },
    {
      id: "event:busoni-doktor-faust-premiere-1925",
      personId: "busoni",
      workPathId: "work:busoni-doktor-faust",
      eventType: "premiere",
      eventLabel: "首演",
      title: "《浮士德博士》德累斯顿首演",
      workTitle: "Doktor Faust, K 303 / BV 303",
      date: "1925-05-21",
      dateLabel: "1925-05-21",
      location: {
        venue: "Semperoper Dresden",
        city: "Dresden",
        country: "Germany"
      },
      institution: "Sächsisches Staatstheater / Semperoper Dresden",
      participants: [
        { role: "指挥", name: "Fritz Busch" },
        { role: "Doktor Faust", name: "Robert Burg" },
        { role: "Herzogin von Parma", name: "Meta Seinemeyer" }
      ],
      versionLabel: "Busoni 未完成稿 / Philipp Jarnach 补作首演版 / Antony Beaumont 1984 另一补作版",
      keywords: ["浮士德博士", "Doktor Faust", "Doctor Faust", "K 303", "BV 303", "1925-05-21", "Dresden", "德累斯顿", "Semperoper", "Sächsisches Staatstheater", "Fritz Busch", "Robert Burg", "Meta Seinemeyer", "Philipp Jarnach", "Antony Beaumont", "首演"],
      evidenceRefs: ["busoni-busoni-nachlass-doktor-faust-work", "busoni-semperoper-doktor-faust-premiere-1925"],
      sourceTitle: "Semperoper Dresden · Semper! 2016/17 No. 4 · Eine Frage der Fassung",
      sourceUrl: "https://www.semperoper.de/fileadmin/semperoper/dokumente/publikationen/hefte/semper-magazin/Semper_2016-17/SO_Semper_No4_16-17_doppelseiten.pdf",
      locator: "Semper! 2016/17 No. 4, p. 12: archival premiere playbill caption; 21 May 1925; Philipp Jarnach version; Fritz Busch; Robert Burg as Faust; Meta Seinemeyer as Duchess; Beaumont 1984 completion discussed; cross-check Busoni-Nachlass E0400218",
      claim: "Semperoper Dresden 的机构杂志记录《Doktor Faust》于 1925 年 5 月 21 日在 Semperoper 首演，采用 Philipp Jarnach 据遗稿完成的版本，由 Fritz Busch 指挥，Robert Burg 饰 Faust、Meta Seinemeyer 饰 Parma 公爵夫人；同页把 Antony Beaumont 1984 补作版明确列为另一版本。Busoni-Nachlass E0400218 独立确认 1925-05-21 Dresden 首演日期。",
      boundary: "这是 Semperoper 2017 制作的现代机构回顾及其档案节目单图像，不是对 1925 原始节目单的完整转录；事件只登记页面明确列出的三位参与者，不补齐未见的全部演员、合唱与乐团名单。Jarnach 首演版、Beaumont 1984 版、原始节目单图像、现代演出照片/视频、谱面和表演权利均保持独立，不能由首演元数据推出复制、下载、演出或本站托管许可。",
      visibility: "public-link",
      verification: "official-semperoper-retrospective-and-busoni-nachlass-cross-check-no-original-programme-transcription",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.busoni-nachlass.org/en/E0400218.html",
        "https://www.busoni-nachlass.org/en/Works/E0400218.xml",
        "https://www.semperoper.de/die-semperoper/semperoper-dresden/geschichte-der-semperoper.html"
      ])
    },
    {
      id: "event:busoni-berceuse-elegiaque-premiere-1911",
      personId: "busoni",
      workPathId: "work:busoni-berceuse-elegiaque",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《悲歌摇篮曲》纽约世界首演",
      workTitle: "Berceuse élégiaque, Op.42 / K 252a / BV 252a",
      date: "1911-02-21",
      dateLabel: "1911-02-21 20:15",
      location: {
        venue: "Main Hall, Carnegie Hall",
        city: "New York",
        country: "United States"
      },
      institution: "Carnegie Hall / Philharmonic Society of New York",
      participants: [
        { role: "指挥", name: "Gustav Mahler" },
        { role: "乐团", name: "New York Philharmonic" }
      ],
      versionLabel: "1909 管弦作品 / 1910 Leipzig 首次印刷 / 1911 世界首演；后世 Arr. 录音目录另行登记",
      keywords: ["悲歌摇篮曲", "哀歌摇篮曲", "Berceuse élégiaque", "Berceuse elegiaque", "Op.42", "K 252a", "BV 252a", "1911-02-21", "20:15", "Main Hall", "Carnegie Hall", "New York", "Gustav Mahler", "New York Philharmonic", "Philharmonic Society of New York", "world premiere", "世界首演", "event 18816", "work_05"],
      evidenceRefs: ["busoni-nachlass-berceuse-elegiaque-work-e0400015", "busoni-carnegie-berceuse-elegiaque-premiere-1911"],
      sourceTitle: "Carnegie Hall Data Lab · Event 18816 · Berceuse élégiaque world premiere",
      sourceUrl: "https://data.carnegiehall.org/events/18816/about",
      locator: "event 18816; 1911-02-21T20:15; Main Hall; organizer Philharmonic Society of New York; Gustav Mahler; New York Philharmonic; work_05; WORLD PREMIERE; premiere status confirmed from New York Times review because printed programme did not identify premieres",
      claim: "Carnegie Hall 的结构化事件数据把《Berceuse élégiaque》Op.42 / BV 252a 登记在 1911 年 2 月 21 日 20:15 的 Main Hall 音乐会中，由 Gustav Mahler 指挥 New York Philharmonic，主办方为 Philharmonic Society of New York，并把该项标为世界首演。Busoni-Nachlass E0400015 独立确认同日 New York 首次演出。",
      boundary: "Carnegie Hall 的事件注释明确说明印刷节目没有标出当晚哪些作品为首演，世界首演身份由其引用的《纽约时报》评论确认；本轮没有把该结构化说明冒充成已经逐页核验的原始节目单或评论原文。事件只登记机构数据明确列出的时间、场馆、主办方、指挥与乐团，不补写未见的完整节目、排练、接收史或录音。节目图像、评论文本、表演、谱面和任何声音对象均不因此获得复制、下载或本站托管许可。",
      visibility: "public-link",
      verification: "official-carnegie-hall-structured-event-and-busoni-nachlass-cross-check-premiere-provenance-explicit",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://data.carnegiehall.org/events/18816/work_05/about",
        "https://data.carnegiehall.org/works/5881/about",
        "https://busoni-nachlass.org/en/Works/E0400015.html",
        "https://busoni-nachlass.org/en/Works/E0400015.xml"
      ])
    },
    {
      id: "event:busoni-fantasia-contrappuntistica-stock-us-premiere-1912",
      personId: "busoni",
      workPathId: "work:busoni-fantasia-contrappuntistica",
      eventType: "premiere",
      eventLabel: "管弦乐改编美国首演",
      title: "《对位幻想曲》Stock 管弦乐改编美国首演",
      workTitle: "Fantasia contrappuntistica, K 256 · arranged for orchestra by Frederick Stock",
      date: "1912-03-29",
      dateLabel: "1912-03-29",
      location: {
        venue: "Orchestra Hall",
        city: "Chicago",
        country: "United States"
      },
      institution: "Chicago Symphony Orchestra",
      participants: [
        { role: "指挥、管弦乐改编", name: "Frederick Stock" },
        { role: "乐团", name: "Chicago Symphony Orchestra" }
      ],
      versionLabel: "Frederick Stock 管弦乐改编的美国首演；不是钢琴原作首演",
      keywords: ["对位幻想曲", "Fantasia contrappuntistica", "K 256", "1912-03-29", "Chicago", "Orchestra Hall", "Chicago Symphony Orchestra", "Frederick Stock", "arranged for orchestra", "U.S. premiere", "管弦乐改编美国首演"],
      evidenceRefs: ["busoni-cso-fantasia-contrappuntistica-stock-us-premiere-1912"],
      sourceTitle: "Chicago Symphony Orchestra · U.S. Premieres by the Chicago Symphony Orchestra",
      sourceUrl: "https://cso.org/media/vjkiafjw/u-s-premieres.pdf",
      locator: "official PDF p.4 of 8; row 29-Mar-1912; Johann Sebastian Bach / Ferruccio Busoni; Fantasia contrappuntistica (arranged for orchestra by Frederick Stock); conductor Frederick Stock. PDF p.1 venue note: performances after December 1904 were at Orchestra Hall unless otherwise noted",
      claim: "Chicago Symphony Orchestra 的《U.S. Premieres》官方清单在 1912-03-29 条目中登记 Johann Sebastian Bach / Ferruccio Busoni《Fantasia contrappuntistica》，明确注明由 Frederick Stock 改编为管弦乐，并由 Stock 指挥。清单首页说明 1904 年 12 月以后未另注场馆的演出均在 Orchestra Hall，因此该事件登记为 Chicago Orchestra Hall 的美国首演。",
      boundary: "该官方清单的首演范围是美国首演，作品字段又明确限定为 Frederick Stock 的管弦乐改编；它不能被改写为 K 256 钢琴原作的世界首演，也不能据此推定 Busoni 对改编的授权、完整节目顺序、排练过程、接收史或录音。Chicago Symphony Orchestra 作为清单发布机构和演出主体登记，原始节目单、评论、改编总谱、表演与任何声音对象仍未取得复制或本站托管许可。",
      visibility: "public-link",
      verification: "official-cso-pdf-row-and-venue-header-visually-verified-arrangement-scope-explicit",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://busoni-nachlass.org/en/E0400018.html",
        "https://www.breitkopf.com/work/1554/fantasia-contrappuntistica-k-256"
      ])
    },
    {
      id: "event:beethoven-fidelio-premiere-1805",
      personId: "beethoven",
      workPathId: "work:beethoven-fidelio",
      eventType: "premiere",
      eventLabel: "原版首演",
      title: "《费德里奥／莱奥诺拉》1805 原版首演",
      workTitle: "Fidelio / Leonore, Op.72",
      date: "1805-11-20",
      dateLabel: "1805-11-20",
      location: {
        venue: "Theater an der Wien",
        city: "Vienna",
        country: "Austria"
      },
      institution: "Theater an der Wien / Beethoven-Haus Bonn source record",
      participants: [
        { role: "作曲家", name: "Ludwig van Beethoven" }
      ],
      versionLabel: "1805 三幕原版 / 1806 两幕修订版 / 1814-05-23 最终版首演分别登记",
      keywords: ["费德里奥", "Fidelio", "Leonore", "莱奥诺拉", "Op.72", "1805-11-20", "Theater an der Wien", "Vienna", "维也纳", "1806", "1814", "原版首演"],
      evidenceRefs: ["beethoven-fidelio-version-history"],
      sourceTitle: "Beethoven-Haus Bonn · On the trail of Beethoven · Revised copies",
      sourceUrl: "https://internet.beethoven.de/en/exhibition/on-the-trail-of-beethoven/",
      locator: "The collection / Revised copies: original version premiered Theater an der Wien on 20 November 1805; revised from three acts to two; final version premiered 23 May 1814",
      claim: "Beethoven-Haus 的 Bodmer 馆藏展览把贝多芬唯一歌剧的原版首演定位到 1805 年 11 月 20 日 Theater an der Wien，并说明该三幕版本随后经 1806 年两幕修订，1814 年又形成最终修订版。",
      boundary: "这是 Beethoven-Haus 机构展览对日期、场馆和版本关系的说明，不是 1805 原始节目单、完整演员/乐团名单或首演谱面。参与者只登记作品作者，不从后世演出史补写首演阵容；1805、1806、1814 三版及其不同演出必须保持分层。页面图像与数字手稿受 Beethoven-Haus 再利用条款约束，不能由事件元数据推出复制、下载、演出或本站托管许可。",
      visibility: "public-link",
      verification: "official-beethoven-haus-exhibition-version-and-premiere-record-no-original-programme-or-reuse-permission",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.beethoven.de/en/media/view/4548463471624192/Ludwig%2Bvan%2BBeethoven%2C%2BFidelio%2Bop.%2B72%2C%2B2.%2BFassung%2B1806%2C%2BMarsch%2C%2BPartitur%2C%2BAutograph?fromWork=4984496705241088",
        "https://www.beethoven.de/en/s/archiv-order"
      ])
    },
    {
      id: "event:beethoven-violin-concerto-premiere-1806",
      personId: "beethoven",
      workPathId: "work:beethoven-violin-concerto-op61",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《D 大调小提琴协奏曲》1806 首演",
      workTitle: "Violin Concerto in D major, Op.61",
      date: "1806-12-23",
      dateLabel: "1806-12-23",
      location: {
        venue: "Theater an der Wien",
        city: "Vienna",
        country: "Austria"
      },
      institution: "Theater an der Wien / k.k. privil. Schauspielhaus an der Wien",
      participants: [
        { role: "小提琴独奏、指挥（Wiener Symphoniker 现代作品档案字段）", name: "Franz Clement" },
        { role: "乐团（Wiener Symphoniker 现代作品档案历史名称）", name: "Orchester des k.k. privil. Schauspielhauses an der Wien" }
      ],
      versionLabel: "1806 首演层；首演后独奏声部与 1807 钢琴版引出的进一步修订另行登记",
      keywords: ["D 大调小提琴协奏曲", "Violin Concerto", "Op.61", "1806-12-23", "Theater an der Wien", "Vienna", "Franz Clement", "Orchester des k.k. privil. Schauspielhauses an der Wien", "首演"],
      evidenceRefs: ["beethoven-bnf-violin-concerto-op61-13908230", "beethoven-house-violin-concerto-op61-work", "beethoven-wiener-symphoniker-violin-concerto-premiere-1806"],
      sourceTitle: "Wiener Symphoniker · Concerto for Violin and Orchestra in D major, Op.61",
      sourceUrl: "https://www.wienersymphoniker.at/en/opus/concerto-violin-and-orchestra-d-major-op-61",
      locator: "Performance history / premiere: 23.12.1806; Vienna; Theater an der Wien; Franz Clement conductor and violin soloist; orchestra of the k.k. privil. Schauspielhaus an der Wien; cross-check BnF FRBNF13908230 and Beethoven-Haus work record",
      claim: "Wiener Symphoniker 的现代作品档案把《D 大调小提琴协奏曲》首演定位到 1806 年 12 月 23 日 Theater an der Wien，并在历史演出字段列出 Franz Clement 为小提琴独奏与指挥、当时 Theater an der Wien 的乐团为演出团体；BnF 与 Beethoven-Haus 的作品记录独立支持日期、首演与 Clement 的关系。",
      boundary: "Wiener Symphoniker 页面是现代机构作品／演出历史记录，不是 1806 年原始节目单、报刊或会计档案；参与者角色按该页字段原样标注来源，不把它改写成已逐页核对的首演档案。当前没有原始节目顺序、完整乐手名单、排练信息或首演用谱；Beethoven-Haus 记录的首演后修订与 1807 钢琴版修订也不能倒灌为 1806 首演时已经存在的文本。事件元数据不产生节目图像、谱面、表演或录音的复制、播放和托管许可。",
      visibility: "public-link",
      verification: "official-modern-orchestra-work-history-cross-checked-with-bnf-and-beethoven-haus-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://catalogue.bnf.fr/ark:/12148/cb13908230j",
        "https://www.beethoven.de/en/work/view/6051325007626240/?fromArchive=5066929207246848"
      ])
    },
    {
      id: "event:busoni-violin-concerto-premiere-1897",
      personId: "busoni",
      workPathId: "work:busoni-violin-concerto-op35a",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《D 大调小提琴协奏曲》1897 首演",
      workTitle: "Konzert für die Violine mit Orchester, Op.35a, K 243",
      date: "1897-10-08",
      dateLabel: "1897-10-08",
      location: {
        venue: "Berliner Sing-Akademie",
        city: "Berlin",
        country: "Germany"
      },
      institution: "Berliner Sing-Akademie",
      participants: [
        { role: "小提琴独奏（IMSLP 作品页参与者字段）", name: "Henri Petri" },
        { role: "乐团（IMSLP 作品页参与者字段）", name: "Berlin Philharmonic Orchestra" },
        { role: "指挥、作曲家（IMSLP 作品页参与者字段）", name: "Ferruccio Busoni" }
      ],
      versionLabel: "1897 世界首演层；1899 首印登记与 #178701 可能为 1913 年后重印的扫描层另行登记",
      keywords: ["布索尼小提琴协奏曲", "Violin Concerto", "Op.35a", "K 243", "BV 243", "1897-10-08", "Berliner Sing-Akademie", "Henri Petri", "Berlin Philharmonic Orchestra", "Ferruccio Busoni", "世界首演"],
      evidenceRefs: ["busoni-nachlass-violin-concerto-e0400469", "busoni-imslp-violin-concerto-178701"],
      sourceTitle: "Busoni-Nachlass · Konzert für die Violine mit Orchester · E0400469",
      sourceUrl: "https://www.busoni-nachlass.org/en/E0400469.html",
      locator: "E0400469 / TEI: composed 1896/1897; first performance 1897-10-08 at Berliner Sing-Akademie; first print 1899 Leipzig; dedicatee Henri Petri. IMSLP General Information separately lists Petri violin, Berlin Philharmonic Orchestra and Busoni conductor.",
      claim: "Busoni-Nachlass 的机构作品页与 TEI/XML 把 Op.35a / K 243 的首次演出定位到 1897 年 10 月 8 日 Berliner Sing-Akademie，并把 Henri Petri 登记为题献对象；IMSLP 作品页另列 Petri 为小提琴独奏、Berlin Philharmonic Orchestra 为乐团、Busoni 为指挥。",
      boundary: "Busoni-Nachlass 是文献学数字作品登记，当前文档状态为 unreviewed；它直接支持日期和场馆，但不列首演参与者角色。参与者三项来自 IMSLP 作品页的现代社区元数据，不能伪装成已见 1897 原始节目单、报刊或乐团档案；Henri Petri 的题献关系本身也不证明独奏角色。当前没有原始节目顺序、完整乐手名单、评论、排练资料或首演用谱。事件元数据和数字编辑 CC BY-NC-SA 4.0 声明都不产生节目图像、谱面、表演或录音的复制、播放和托管许可。",
      visibility: "public-link",
      verification: "official-busoni-nachlass-work-register-date-and-place-plus-imslp-participant-cross-check-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.busoni-nachlass.org/en/Works/E0400469.xml",
        "https://imslp.org/wiki/Violin_Concerto%2C_Op.35a_%28Busoni%2C_Ferruccio%29"
      ])
    },
    {
      id: "event:dvorak-rusalka-premiere-1901",
      personId: "dvorak",
      workPathId: "work:dvorak-rusalka-op114",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《水仙女》1901 布拉格世界首演",
      workTitle: "Rusalka, Op.114, B.203",
      date: "1901-03-31",
      dateLabel: "1901-03-31",
      location: {
        venue: "Národní divadlo / National Theatre",
        city: "Prague",
        country: "Bohemia, Austria-Hungary (1901)"
      },
      institution: "Národní divadlo (National Theatre, Prague)",
      participants: [
        { role: "音乐总监、指挥", name: "Karel Kovařovic" },
        { role: "舞台导演", name: "Robert Polák" },
        { role: "Rusalka", name: "Růžena Maturová" },
        { role: "Prince；临时替代 Karel Burian", name: "Bohumil Pták" },
        { role: "Water Sprite", name: "Václav Kliment" },
        { role: "Witch", name: "Růžena Bradáčová" },
        { role: "Foreign Princess", name: "Marie Kubátová" },
        { role: "乐团与合唱", name: "National Theatre Orchestra and Choir" }
      ],
      versionLabel: "1901 世界首演层；1905 历史钢琴缩谱、1910 第三印声乐谱与 1960 首次完整总谱登记另行分层",
      keywords: ["水仙女", "Rusalka", "Op.114", "B.203", "1901-03-31", "Národní divadlo", "National Theatre", "Prague", "Karel Kovařovic", "Robert Polák", "Růžena Maturová", "Bohumil Pták", "Karel Burian", "世界首演"],
      evidenceRefs: ["dvorak-rusalka-work-op114-b203", "dvorak-national-theatre-rusalka-premiere-1901"],
      sourceTitle: "Národní divadlo · 120 let od světové premiéry Rusalky",
      sourceUrl: "https://www.narodni-divadlo.cz/cs/aktuality/120-let-od-svetove-premiery-rusalky-v-narodnim-divadle",
      locator: "National Theatre anniversary record: world premiere 31 March 1901; Karel Kovařovic musical preparation; Robert Polák stage direction; Růžena Maturová; Bohumil Pták replaced Karel Burian; Václav Kliment; Růžena Bradáčová; Marie Kubátová; cross-check Antonín Dvořák work encyclopaedia",
      claim: "布拉格国家剧院的机构纪念页确认：德沃夏克与 Jaroslav Kvapil 的《Rusalka》于 1901 年 3 月 31 日在该院世界首演，Karel Kovařovic 负责音乐排演、Robert Polák 导演；Růžena Maturová 饰 Rusalka，Bohumil Pták 在 Karel Burian 临时退出后饰 Prince。德沃夏克专题站独立列出国家剧院乐团、合唱与主要角色。",
      boundary: "两条来源都是现代机构回顾/作品百科，不是 1901 原始节目单、剧院账簿、报刊、首演分谱或舞台设计实物。事件卡只登记两页明确支持的关键参与者，不声称这是完整首演档案；Bohumil Pták 的临时替代关系不能被抹平为预定首演阵容。事件元数据不产生节目、布景、服装、谱面、表演、录音或图像的复制、播放和托管许可。",
      visibility: "public-link",
      verification: "official-national-theatre-anniversary-record-cross-checked-with-institutional-work-encyclopaedia-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.antonin-dvorak.cz/en/work/rusalka/",
        "https://www.antonin-dvorak.cz/en/work/rusalka-incenation/"
      ])
    },
    {
      id: "event:stravinsky-symphony-of-psalms-premiere-1930",
      personId: "stravinsky",
      workPathId: "work:stravinsky-symphony-of-psalms",
      eventType: "premiere",
      eventLabel: "世界首演",
      title: "《诗篇交响曲》1930 布鲁塞尔世界首演",
      workTitle: "Symphony of Psalms / Symphonie de Psaumes, K052 / IIS 71",
      date: "1930-12-13",
      dateLabel: "1930-12-13",
      location: {
        venue: "Palais des Beaux-Arts",
        city: "Brussels",
        country: "Belgium"
      },
      institution: "Société Philharmonique de Bruxelles / Palais des Beaux-Arts",
      participants: [
        { role: "作曲家", name: "Igor Stravinsky" },
        { role: "指挥", name: "Ernest Ansermet" },
        { role: "演出团体（Boosey 首演字段）", name: "Société Philharmonique de Bruxelles" }
      ],
      versionLabel: "1930 原版世界首演层；1931 R.M.V. 517 原版总谱与 1948 B. & H. 16328 修订版另行登记",
      keywords: ["诗篇交响曲", "Symphony of Psalms", "Symphonie de Psaumes", "K052", "IIS 71", "1930-12-13", "Palais des Beaux-Arts", "Centre for Fine Arts", "Bozar", "Brussels", "Société Philharmonique de Bruxelles", "Ernest Ansermet", "世界首演"],
      evidenceRefs: ["stravinsky-boosey-symphony-of-psalms-work-premiere", "stravinsky-bozar-symphony-of-psalms-premiere-1930"],
      sourceTitle: "Boosey & Hawkes · Symphony of Psalms; Bozar · Centre for Fine Arts retrospective",
      sourceUrl: "https://www.boosey.com/cr/music/Igor-Stravinsky-Symphony-of-Psalms/2965",
      locator: "Boosey World Premiere: 13/12/1930, Palais des Beaux-Arts, Brussels, Société Philharmonique de Bruxelles / Ernest Ansermet. Bozar current programme: Symphony of Psalms had its world premiere here at the Centre for Fine Arts in 1930.",
      claim: "Boosey & Hawkes 的官方作品页把《诗篇交响曲》世界首演登记为 1930 年 12 月 13 日、布鲁塞尔 Palais des Beaux-Arts，由 Ernest Ansermet 与 Société Philharmonique de Bruxelles 演出；Bozar 的官方场馆节目页独立回顾该作于 1930 年在今天的 Centre for Fine Arts 场址世界首演。",
      boundary: "Boosey 是现代出版商作品目录，Bozar 是为 2027 活动撰写的现代场馆回顾；两者都不是 1930 原始节目单、首演合同、报刊或演出分谱。Bozar 只支持‘在这里’与 1930 年份，不能把当前 Henry Le Boeuf Hall 等活动字段倒填为首演具体厅名。事件记录不产生节目、谱面、表演、录音、图像或本站复制与托管许可。",
      visibility: "public-link",
      verification: "official-publisher-exact-premiere-record-cross-checked-with-official-venue-year-and-place-retrospective-no-original-programme",
      humanReviewed: false,
      aiGenerated: false,
      relatedSourceUrls: Object.freeze([
        "https://www.bozar.be/en/calendar/belgian-national-orchestra-halls-vlaams-radiokoor"
      ])
    }
  ];

  root.ANNALES_PERFORMANCE_EVENTS = Object.freeze(events.map((event) => Object.freeze({
    ...event,
    location: Object.freeze({ ...(event.location || {}) }),
    participants: Object.freeze((event.participants || []).map((participant) => Object.freeze({ ...participant }))),
    keywords: Object.freeze([...(event.keywords || [])]),
    evidenceRefs: Object.freeze([...(event.evidenceRefs || [])]),
    relatedSourceUrls: Object.freeze([...(event.relatedSourceUrls || [])])
  })));
})(typeof window !== "undefined" ? window : globalThis);
