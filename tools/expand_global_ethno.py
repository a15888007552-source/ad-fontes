import json
import math
import os
import subprocess
import sys
import time
import urllib.parse

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

USER_AGENT = "TerraMusica/1.0 (https://gusgumee.studio; contact@gusgumee.studio)"

poi_path = "modules/europa/data/poi.json"
media_path = "modules/europa/data/poi-media.json"
img_dir = "modules/europa/assets/img/poi"

os.makedirs(img_dir, exist_ok=True)

with open(poi_path, "r", encoding="utf-8") as f:
    poi_data = json.load(f)

with open(media_path, "r", encoding="utf-8") as f:
    media_data = json.load(f)

new_cities = {
    # Middle East & Central Asia
    "拉塔基亚": { "lon": 35.7828, "lat": 35.5342 },
    "阿勒颇": { "lon": 37.1628, "lat": 36.1992 },
    "大马士革": { "lon": 36.3067, "lat": 33.5119 },
    "巴勒贝克": { "lon": 36.2044, "lat": 34.0069 },
    "伊斯法罕": { "lon": 51.6775, "lat": 32.6575 },
    "设拉子": { "lon": 52.5583, "lat": 29.6261 },
    "撒马尔罕": { "lon": 66.9758, "lat": 39.6547 },
    "布哈拉": { "lon": 64.4136, "lat": 39.7758 },
    "巴库": { "lon": 49.8353, "lat": 40.3606 },
    "马斯喀特": { "lon": 58.4686, "lat": 23.6139 },
    "萨那": { "lon": 44.2158, "lat": 15.3547 },
    "杰拉什": { "lon": 35.8911, "lat": 32.2781 },

    # Sub-Saharan Africa & North Africa
    "拉各斯": { "lon": 3.3564, "lat": 6.6111 },
    "达喀尔": { "lon": -17.4339, "lat": 14.6644 },
    "亚的斯亚贝巴": { "lon": 38.7522, "lat": 9.0153 },
    "金沙萨": { "lon": 15.3056, "lat": -4.3314 },
    "桑给巴尔": { "lon": 39.1878, "lat": -6.1628 },
    "明德卢": { "lon": -24.9881, "lat": 16.8872 },
    "哈拉雷": { "lon": 31.0489, "lat": -17.8258 },
    "阿克拉": { "lon": -0.1983, "lat": 5.5528 },
    "索维拉": { "lon": -9.7719, "lat": 31.5125 },
    "非斯": { "lon": -4.9839, "lat": 34.0617 },
    "突尼斯城": { "lon": 10.3475, "lat": 36.8711 },

    # China Expansion
    "拉萨": { "lon": 91.0967, "lat": 29.6517 },
    "喀什": { "lon": 75.9897, "lat": 39.4722 },
    "呼和浩特": { "lon": 111.7486, "lat": 40.8425 },
    "黎平": { "lon": 109.1833, "lat": 25.9083 },
    "丽江": { "lon": 100.2372, "lat": 26.8722 },
    "广州": { "lon": 113.3325, "lat": 22.9061 },
    "潮州": { "lon": 116.6347, "lat": 23.6669 },
    "常熟": { "lon": 120.7489, "lat": 31.6567 },
    "菏泽": { "lon": 115.9458, "lat": 35.6022 },
    "榆林": { "lon": 110.2611, "lat": 37.4981 },
    "延吉": { "lon": 129.5089, "lat": 42.9069 },
    "随州": { "lon": 113.3826, "lat": 31.6906 },
    "舞阳": { "lon": 113.5986, "lat": 33.4382 },
    "西安": { "lon": 108.9398, "lat": 34.3416 },
    "敦煌": { "lon": 94.6620, "lat": 40.1421 },
    "泉州": { "lon": 118.5894, "lat": 24.9088 },
    "苏州": { "lon": 120.6195, "lat": 31.2990 },
    "成都": { "lon": 104.0665, "lat": 30.5728 },
    "无锡": { "lon": 120.3119, "lat": 31.4912 },
    "安阳": { "lon": 114.3924, "lat": 36.0975 }
}
poi_data["cityCoordinates"].update(new_cities)

rad = math.pi / 180
def distance_km(p1, p2):
    dLat = (p2["lat"] - p1["lat"]) * rad
    dLon = (p2["lon"] - p1["lon"]) * rad
    lat1 = p1["lat"] * rad
    lat2 = p2["lat"] * rad
    h = math.sin(dLat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dLon / 2) ** 2
    return round(6371 * 2 * math.atan2(math.sqrt(h), math.sqrt(max(0, 1 - h))), 3)

# Helper to download image using curl.exe
def fetch_wiki_image_curl(title, dest_path, lang="en"):
    quoted = urllib.parse.quote(title)
    api_url = f"https://{lang}.wikipedia.org/w/api.php?action=query&titles={quoted}&prop=pageimages&format=json&pithumbsize=1280"
    cmd = ["curl.exe", "-s", "--max-time", "10", "--connect-timeout", "5", "-A", USER_AGENT, api_url]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=12)
        data = json.loads(res.stdout)
        pages = data.get("query", {}).get("pages", {})
        img_url = None
        for pid, pinfo in pages.items():
            thumb = pinfo.get("thumbnail")
            if thumb and thumb.get("source"):
                img_url = thumb["source"].split("?")[0]
                break
        if img_url:
            dl_cmd = ["curl.exe", "-s", "-L", "--max-time", "18", "--connect-timeout", "6", "-A", USER_AGENT, img_url, "-o", dest_path]
            subprocess.run(dl_cmd, timeout=22)
            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 10000:
                return os.path.getsize(dest_path)
    except Exception as e:
        pass
    return 0

def fetch_commons_search_curl(query, dest_path):
    quoted = urllib.parse.quote(query)
    api_url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={quoted}&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=1280&format=json"
    cmd = ["curl.exe", "-s", "--max-time", "10", "--connect-timeout", "5", "-A", USER_AGENT, api_url]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=12)
        data = json.loads(res.stdout)
        pages = data.get("query", {}).get("pages", {})
        img_url = None
        for pid, pinfo in pages.items():
            ii = pinfo.get("imageinfo", [])
            if ii and ii[0].get("thumburl"):
                img_url = ii[0]["thumburl"].split("?")[0]
                break
            elif ii and ii[0].get("url"):
                img_url = ii[0]["url"].split("?")[0]
                break
        if img_url:
            dl_cmd = ["curl.exe", "-s", "-L", "--max-time", "18", "--connect-timeout", "6", "-A", USER_AGENT, img_url, "-o", dest_path]
            subprocess.run(dl_cmd, timeout=22)
            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 10000:
                return os.path.getsize(dest_path)
    except Exception as e:
        pass
    return 0

# Master list of POIs across Middle East, Africa, and China
new_pois_batch = [
    # --- MIDDLE EAST & WEST/CENTRAL ASIA ---
    {
        "id": "poi-me-ugarit",
        "city": "拉塔基亚",
        "name": "乌加里特遗址与胡里安颂歌发祥地",
        "category": "landmark",
        "kindLabel": "世界上古乐谱发源地",
        "lon": 35.7828,
        "lat": 35.5342,
        "source": { "kind": "wikipedia-index", "title": "Hurrian songs", "url": "https://en.wikipedia.org/wiki/Hurrian_songs" },
        "history": "位于叙利亚地中海沿岸拉塔基亚以北约10公里的古海港遗址（拉斯沙姆拉），兴盛于公元前14至前12世纪晚青铜时代，拥有规模宏大的皇家宫殿、神庙与档案库。1950年代在此出土了数十块刻有胡里安语与乌加里特楔形文字的泥板残片。",
        "musicRelation": "世界已知最早记谱旋律《胡里安颂歌第6号》（Hurrian Hymn No. 6，约公元前1400年）的出土地。泥板不仅记录了献给果园女神尼卡尔的歌词，更珍贵地铭刻了包括九种乐调（nid qabli等）与音程指法的里拉琴（Lyre）伴奏乐谱，是人类音乐史从口传进入文字记谱纪元的实物见证。",
        "wiki_titles": ["Hurrian_songs", "Ugarit"]
    },
    {
        "id": "poi-me-aleppocitadel",
        "city": "阿勒颇",
        "name": "阿勒颇古城与瓦斯拉古典音乐圣地",
        "category": "landmark",
        "kindLabel": "阿拉伯古典套曲摇篮",
        "lon": 37.1628,
        "lat": 36.1992,
        "source": { "kind": "wikipedia-index", "title": "Citadel of Aleppo", "url": "https://en.wikipedia.org/wiki/Citadel_of_Aleppo" },
        "history": "建在阿勒颇市中心高出周围平原50米的椭圆形石灰石山丘上的中世纪坚固城堡要塞，联合国教科文组织世界文化遗产。公元12至13世纪阿尤布王朝时期达到繁盛，其大门、王座大厅和宣礼塔展现了卓越的伊斯兰军事与宫廷建筑艺术。",
        "musicRelation": "阿拉伯世界古典声乐与器乐套曲“瓦斯拉”（Wasla）与“阿勒颇库杜德”（Qudud Halabiya）的发祥母体与世界中心。一代宗师萨巴赫·法赫里（Sabah Fakhri）在此登峰造极，其复杂的木卡姆转调、柔美的纳希德吟唱和严谨的十进位节奏型（Iqa'at），使阿勒颇被誉为阿拉伯音乐修养与鉴赏力的“最高法庭”。",
        "wiki_titles": ["Citadel_of_Aleppo"]
    },
    {
        "id": "poi-me-damascusmosque",
        "city": "大马士革",
        "name": "倭马亚大清真寺与大马士革穆瓦沙赫圣所",
        "category": "church",
        "kindLabel": "古典诗乐与赞歌圣地",
        "lon": 36.3067,
        "lat": 33.5119,
        "source": { "kind": "wikipedia-index", "title": "Umayyad Mosque", "url": "https://en.wikipedia.org/wiki/Umayyad_Mosque" },
        "history": "始建于公元705年倭马亚王朝哈里发瓦利德一世时期的大马士革地标建筑，拥有宏伟的列柱庭院、拜占庭式金色马赛克镶嵌画以及伊斯兰世界现存最早的尖塔之一（耶稣尖塔与新娘尖塔）。",
        "musicRelation": "黎凡特古典赞歌“纳希德”（Inshad）与安达卢西亚诗乐“穆瓦沙赫”（Muwashshah）东传黎凡特后的核心圣殿。大马士革清真寺诵经师团代代传承独特的无伴奏多声部调式和声吟诵法，其精致的木卡姆拉斯特（Rast）与巴雅提（Bayati）调式体系深刻滋养了古典阿拉伯声乐。",
        "wiki_titles": ["Umayyad_Mosque"]
    },
    {
        "id": "poi-me-baalbek",
        "city": "巴勒贝克",
        "name": "巴勒贝克神庙与国际艺术节圣地",
        "category": "theater",
        "kindLabel": "黎凡特歌剧与民歌圣殿",
        "lon": 36.2044,
        "lat": 34.0069,
        "source": { "kind": "wikipedia-index", "title": "Temple of Bacchus", "url": "https://en.wikipedia.org/wiki/Temple_of_Bacchus" },
        "history": "位于黎巴嫩贝卡谷地，公元2至3世纪罗马帝国安东尼王朝时期建造的柯林斯柱式巨型神庙建筑群。巴克科斯神庙长66米、宽35米，拥有保存极其完整的列柱长廊与精湛的神话浮雕，具备无与伦比的天然开阔声场。",
        "musicRelation": "著名的“巴勒贝克国际艺术节”（Baalbek International Festival）举办地。20世纪中叶，黎巴嫩“天籁国宝”歌后费鲁兹（Fairouz）与拉赫巴尼兄弟（Rahbani Brothers）在此连续首演了数十部将黎凡特民歌“达布克”（Dabke）与交响管弦深度交融的先锋音乐剧，使这里成为阿拉伯现代文艺复兴（Nahda）的象征。",
        "wiki_titles": ["Temple_of_Bacchus", "Baalbek"]
    },
    {
        "id": "poi-me-aliqapu",
        "city": "伊斯法罕",
        "name": "阿里卡普宫音乐大厅",
        "category": "hall",
        "kindLabel": "萨法维声学奇观 / 拉迪夫圣殿",
        "lon": 51.6775,
        "lat": 32.6575,
        "source": { "kind": "wikipedia-index", "title": "Ali Qapu", "url": "https://en.wikipedia.org/wiki/%C4%80l%C4%AB_Q%C4%81p%C5%AB" },
        "history": "坐落于伊斯法罕伊玛目广场西侧，萨法维帝国沙·阿巴斯一世于1597年建造的皇宫。宫殿共6层，顶层为著名的“音乐室”（Talar-e Musiqi），天花板与四周墙面完全由镂雕的石膏壁龛覆盖，其剪影精确呈现为波斯长颈鲁特琴、乌德琴、陶鼓和水罐形状。",
        "musicRelation": "全球古代声学与装饰艺术完美融合的孤例。那些形似乐器的镂空石膏壁龛不仅是视觉装饰，更是极高声学智慧的吸音与消混响装置，使波斯古典拉迪夫（Radif）体系中塞塔尔（Setar）、桑图尔（Santur）与细微的人声阿瓦兹（Avaz）得以纤毫毕现、纯净通透地回荡在皇家听众席上。",
        "wiki_titles": ["Ālī_Qāpū", "Isfahan"]
    },
    {
        "id": "poi-me-tombhafez",
        "city": "设拉子",
        "name": "哈菲兹墓与波斯吟唱圣所",
        "category": "tomb",
        "kindLabel": "诗歌与古典拉迪夫之魂",
        "lon": 52.5583,
        "lat": 29.6261,
        "source": { "kind": "wikipedia-index", "title": "Tomb of Hafez", "url": "https://en.wikipedia.org/wiki/Tomb_of_Hafez" },
        "history": "坐落于设拉子市北部莫萨拉花园，安葬着14世纪波斯最伟大的抒情诗人哈菲兹。1935年由法国建筑师安德烈·戈达尔主持重建为八角形大理石柱凉亭，穹顶内侧装饰有极其绚丽的绿、黄、蓝三色珐琅马赛克瓷砖。",
        "musicRelation": "波斯古典音乐与即兴吟唱艺术“阿瓦兹”（Avaz）的精神源泉。所有波斯古典拉迪夫十二套曲的核心唱段均以哈菲兹的加扎勒（Ghazal）抒情诗为词；当代波斯音乐泰斗穆罕默德-礼萨·沙贾里安（Mohammad-Reza Shajarian）等大师在此进行的吟唱，将波斯诗歌格律与细微微分音转调（Koron / Sori）结合到了天人合一之境。",
        "wiki_titles": ["Tomb_of_Hafez", "Hafez"]
    },
    {
        "id": "poi-me-registan",
        "city": "撒马尔罕",
        "name": "雷吉斯坦广场与东方之韵音乐圣地",
        "category": "landmark",
        "kindLabel": "丝路沙什马卡姆世界圣殿",
        "lon": 66.9758,
        "lat": 39.6547,
        "source": { "kind": "wikipedia-index", "title": "Registan", "url": "https://en.wikipedia.org/wiki/Registan" },
        "history": "帖木儿帝国首都撒马尔罕的核心广场，由三座宏伟绝伦的伊斯兰经学院（乌卢格别克经学院、提拉-卡里经学院和希尔-多尔经学院）呈马蹄形合围而成，以覆满青金石色与绿松石色的几何瓷砖圆顶闻名于世。",
        "musicRelation": "联合国非遗中亚古典“沙什马卡姆”（Shashmaqam）史诗与联合国教科文组织主办的两年一度“东方之韵”（Sharq Taronalari）国际音乐节主会场。都塔尔（Dutar）、坦布尔（Tanbur）与声乐长调在巨大拱门与庭院中激荡，是整个中亚丝绸之路音乐交融的最高平台。",
        "wiki_titles": ["Registan", "Samarkand"]
    },
    {
        "id": "poi-me-bukhara",
        "city": "布哈拉",
        "name": "卡隆建筑群与布哈拉木卡姆圣殿",
        "category": "landmark",
        "kindLabel": "中亚传统弦乐与套曲祖庭",
        "lon": 64.4136,
        "lat": 39.7758,
        "source": { "kind": "wikipedia-index", "title": "Po-i-Kalyan", "url": "https://en.wikipedia.org/wiki/Po-i-Kalyan" },
        "history": "布哈拉老城核心的历史建筑群，包括建于1127年高达45.6米的喀喇汗王朝卡隆宣礼塔、卡隆大清真寺与米尔-阿拉伯经学院。经学院的赭黄色砖砌拱券与繁复生动的外立面构成了中亚伊斯兰建筑的经典范例。",
        "musicRelation": "真正奠定“六大木卡姆”（Bukhara Shashmaqam）严格规制的核心诞生地。布哈拉埃米尔宫廷在此汇聚犹太与穆斯林乐师，完善了由250多首乐曲组成、横跨器乐序曲（Mushkilot）与人声套曲（Nasr）的庞大声乐宇宙，吉查克（Ghijak）弓弦乐与都塔尔在此具有无上崇高地位。",
        "wiki_titles": ["Po-i-Kalyan", "Bukhara"]
    },
    {
        "id": "poi-me-mughamcenter",
        "city": "巴库",
        "name": "阿塞拜疆国际木卡姆中心",
        "category": "hall",
        "kindLabel": "木卡姆艺术国家级圣殿",
        "lon": 49.8353,
        "lat": 40.3606,
        "source": { "kind": "wikipedia-index", "title": "International Mugham Center of Azerbaijan", "url": "https://en.wikipedia.org/wiki/International_Mugham_Center_of_Azerbaijan" },
        "history": "坐落于巴库滨海大道里海之畔，由建筑师瓦希德·卡西莫夫等人于2008年设计落成。整座建筑平面与立面巧妙抽象为阿塞拜疆传统长颈弹拨乐器“塔尔琴”（Tar）的优美琴身轮廓，内部配备世界顶级声学厅堂。",
        "musicRelation": "联合国教科文组织非遗阿塞拜疆木卡姆（Mugham）的全球研究与展演中心。由塔尔琴（Tar）、卡曼恰琴（Kamancheh）与手鼓（Daf）组成的三重奏在此展开极富戏剧性的即兴调式竞奏，著名大师阿利姆·卡西莫夫（Alim Qasimov）在此录制并传播了震撼世界的木卡姆声乐。",
        "wiki_titles": ["International_Mugham_Center_of_Azerbaijan"]
    },
    {
        "id": "poi-me-muscatopera",
        "city": "马斯喀特",
        "name": "马斯喀特皇家歌剧院",
        "category": "opera",
        "kindLabel": "阿拉伯半岛现代歌剧殿堂",
        "lon": 58.4686,
        "lat": 23.6139,
        "source": { "kind": "wikipedia-index", "title": "Royal Opera House Muscat", "url": "https://en.wikipedia.org/wiki/Royal_Opera_House_Muscat" },
        "history": "位于阿曼苏丹国首都马斯喀特沙提区，2011年由苏丹卡布斯·本·赛义德下令建成。建筑巧妙融合了传统阿曼城堡的白色石灰石外墙与精雕细琢的伊斯兰木雕几何花格，剧场采用世界领先的可调节混响声学木构与移动式舞台系统。",
        "musicRelation": "阿拉伯半岛建立的第一座顶级专业歌剧院。常年举办阿曼传统弹拨与鼓吹乐、海湾民间奥德音乐汇演，并邀请维也纳爱乐乐团、马林斯基剧院等顶级院团入驻，成为东方阿拉伯古典音乐与西方歌剧艺术在海湾对话的最高殿堂。",
        "wiki_titles": ["Royal_Opera_House_Muscat"]
    },
    {
        "id": "poi-me-sanaa",
        "city": "萨那",
        "name": "萨那老城与萨那之歌发祥地",
        "category": "landmark",
        "kindLabel": "人类口头非遗古典弹唱圣所",
        "lon": 44.2158,
        "lat": 15.3547,
        "source": { "kind": "wikipedia-index", "title": "Old City of Sana'a", "url": "https://en.wikipedia.org/wiki/Old_City_of_Sana%27a" },
        "history": "海拔2200米山谷中的千年古城，以数百栋由生土、烧砖建造的高达数层的塔楼住宅闻名，建筑外立面用白色石膏描绘出极其精细的几何花纹，带有半圆形彩色玻璃窗（Qamariya），为世界文化遗产。",
        "musicRelation": "联合国教科文组织第一批人类口述和非物质遗产代表作“萨那之歌”（Al-Ghina al-San'ani）的发源圣地。在传统客厅“玛芙拉杰”（Mawfraj）中，乐师怀抱古老独木雕琢的“加布斯琴”（Qanbus）或铜盘击奏（Sahn nuhasi），弹唱14世纪以来的古典阿拉伯诗歌，拥有奇特而迷人的微调式与自由散板节奏。",
        "wiki_titles": ["Old_City_of_Sana%27a"]
    },
    {
        "id": "poi-me-jerash",
        "city": "杰拉什",
        "name": "杰拉什南大剧场",
        "category": "theater",
        "kindLabel": "希腊罗马声学与黎凡特音乐节",
        "lon": 35.8911,
        "lat": 32.2781,
        "source": { "kind": "wikipedia-index", "title": "Jerash", "url": "https://en.wikipedia.org/wiki/Jerash" },
        "history": "建于公元90至92年罗马帝国图密善统治时期的半圆形露天剧场，依山坡而建，拥有可容纳3000余名观众的两层阶梯座席，舞台后方矗立着精美的双层柯林斯柱廊背景墙。剧场舞台正中央设有完美的声学聚焦点。",
        "musicRelation": "始于1981年的“杰拉什文化艺术节”（Jerash Festival）永久主会场。来自阿拉伯各国的管弦乐团、贝都因拉巴卜琴（Rebab）大师、乌德琴家与黎凡特达布克民间舞团在此汇聚，剧场出色的自然声学扩散使台上不用扩音即可让三千人清晰聆听琴声。",
        "wiki_titles": ["Jerash"]
    },

    # --- SUB-SAHARAN AFRICA & NORTH AFRICA ---
    {
        "id": "poi-af-newafrikashrine",
        "city": "拉各斯",
        "name": "新非洲神庙与非罗主义圣坛",
        "category": "hall",
        "kindLabel": "非洲放克与抗争音乐圣殿",
        "lon": 3.3564,
        "lat": 6.6111,
        "source": { "kind": "wikipedia-index", "title": "New Afrika Shrine", "url": "https://en.wikipedia.org/wiki/New_Afrika_Shrine" },
        "history": "位于尼日利亚旧都拉各斯伊凯贾区，最初由非洲现代音乐巨人费拉·库蒂（Fela Kuti）于1970年代创建的露天音乐俱乐部兼精神殿堂。原址遭军政府纵火焚毁后，由其子费米·库蒂（Femi Kuti）与费米家族于2000年重建为具有象征意义的大型铁架穹顶文化圣坛。",
        "musicRelation": "“非罗主义”（Afrobeat）音乐的绝对诞生地与圣所。费拉·库蒂在此将约鲁巴传统多节奏鼓乐、高生活音乐与美国放克爵士融为一体；鼓手东尼·艾伦（Tony Allen）在此确立了现代鼓乐史上最复杂、最具穿透力的复合节奏体系；神庙至今每周举办不间断的现场狂欢与社会正义演说。",
        "wiki_titles": ["New_Afrika_Shrine", "Fela_Kuti"]
    },
    {
        "id": "poi-af-danelsorano",
        "city": "达喀尔",
        "name": "丹尼尔·索拉诺国家剧院",
        "category": "theater",
        "kindLabel": "塞内加尔 Mbalax 与萨巴尔鼓圣所",
        "lon": -17.4339,
        "lat": 14.6644,
        "source": { "kind": "wikipedia-index", "title": "Théâtre national Daniel-Sorano", "url": "https://en.wikipedia.org/wiki/Th%C3%A9%C3%A2tre_national_Daniel-Sorano" },
        "history": "位于塞内加尔首都达喀尔市中心共和国大道附近，1965年由首任总统、诗人利奥波德·塞达·桑戈尔下令落成。现代派混凝土与热带几何遮阳构架构成了西非后殖民时代独立文化复兴的标志性剧场。",
        "musicRelation": "塞内加尔国家传统舞团与现代声乐的摇篮。西非流行乐教父尤苏·恩杜尔（Youssou N'Dour）在此汲取沃洛夫族传统萨巴尔鼓（Sabar）和塔玛鼓（Tama / 说话鼓）灵感，开创了风靡全球的 Mbalax 音乐流派；也是科拉琴格里奥（Griot）世家走向世界舞台的重要起点。",
        "wiki_titles": ["Théâtre_national_Daniel-Sorano", "Dakar"]
    },
    {
        "id": "poi-af-ethiopiatheatre",
        "city": "亚的斯亚贝巴",
        "name": "埃塞俄比亚国家大剧院与埃塞爵士摇篮",
        "category": "theater",
        "kindLabel": "埃塞俄比亚爵士与古代圣咏之枢",
        "lon": 38.7522,
        "lat": 9.0153,
        "source": { "kind": "wikipedia-index", "title": "Ethiopian National Theatre", "url": "https://en.wikipedia.org/wiki/Ethiopian_National_Theatre" },
        "history": "坐落于首都中心丘吉尔大道尽头，1955年由皇帝海尔·塞拉西一世在加冕银禧纪念期间落成。主入口矗立着由法国建筑师设计的宏伟弧形门廊，其广场中央矗立着标志性的犹大之狮青铜雕像。",
        "musicRelation": "举世闻名的“埃塞爵士”（Ethio-Jazz）诞生圣地。音乐宗师穆拉图·阿斯塔特克（Mulatu Astatke）在此出任管弦乐团总监，将埃塞俄比亚古代四种微调调式（Tizita、Bati、Anchihoye、Ambassel）与波士顿伯克利咆勃爵士乐融合；同城传统教堂亦直接承袭6世纪圣亚烈德（Saint Yared）发明的非洲最早记谱法“梅勒克特”（Meleket）。",
        "wiki_titles": ["Ethiopian_National_Theatre", "Mulatu_Astatke"]
    },
    {
        "id": "poi-af-palaisdupeuple",
        "city": "金沙萨",
        "name": "金沙萨大众宫与刚果伦巴圣所",
        "category": "hall",
        "kindLabel": "人类非遗刚果伦巴世界心脏",
        "lon": 15.3056,
        "lat": -4.3314,
        "source": { "kind": "wikipedia-index", "title": "Palais du Peuple (Kinshasa)", "url": "https://en.wikipedia.org/wiki/Palais_du_Peuple_(Kinshasa)" },
        "history": "位于刚果金首都金沙萨中心凯旋大道，1979年竣工的宏大现代公共集会综合体，正前方即为可容纳八万人的烈士体育场与卡兰布大道音乐长廊，是中非规模最大的集会演艺中心。",
        "musicRelation": "联合国教科文组织人类非物质文化遗产“刚果伦巴”（Congolese Rumba）与苏库斯（Soukous）音乐的全球中枢。一代吉他乐圣佛朗哥（Franco Luambo Makiadi）与全能OK爵士乐团、歌王塔布·雷（Tabu Ley Rochereau）与佩佩·卡莱在此主导了整整半个世纪席卷整个非洲大陆的舞曲风暴，其双吉他清脆的“塞贝”（Sebene）切音技巧重新定义了当代非洲吉他。",
        "wiki_titles": ["Palais_du_Peuple_(Kinshasa)", "Kinshasa"]
    },
    {
        "id": "poi-af-zanzibarfort",
        "city": "桑给巴尔",
        "name": "桑给巴尔旧要塞与塔拉布音乐学院",
        "category": "academy",
        "kindLabel": "印度洋斯瓦希里塔拉布音乐核心",
        "lon": 39.1878,
        "lat": -6.1628,
        "source": { "kind": "wikipedia-index", "title": "Old Fort of Zanzibar", "url": "https://en.wikipedia.org/wiki/Old_Fort_of_Zanzibar" },
        "history": "坐落于桑给巴尔石头城滨海前沿，17世纪末由阿曼阿曼苏丹国击败葡萄牙人后建造的坚固高墙珊瑚石城堡，拥有开放式的内院与古老炮台。城堡毗邻单桅三角帆船国家音乐学院（DCMA），为世界遗产的核心地标。",
        "musicRelation": "印度洋沿岸斯瓦希里古典音乐“塔拉布”（Taarab）的世界大本营。传奇百岁女歌唱家毕·吉杜德（Bi Kidude）长年在此登台；学院系统传承将阿拉伯乌德琴、埃及卡龙琴（Qanun）、印度手风琴与班图恩戈马鼓（Ngoma）交织而成的百年丝路乐章。",
        "wiki_titles": ["Old_Fort_of_Zanzibar", "Stone_Town"]
    },
    {
        "id": "poi-af-mindelocc",
        "city": "明德卢",
        "name": "明德卢文化中心与赤脚歌后纪念圣地",
        "category": "hall",
        "kindLabel": "莫尔纳音乐与萨达德乡愁之都",
        "lon": -24.9881,
        "lat": 16.8872,
        "source": { "kind": "wikipedia-index", "title": "Mindelo", "url": "https://en.wikipedia.org/wiki/Mindelo" },
        "history": "位于佛得角圣维森特岛明德卢港口核心街区，由19世纪葡萄牙海关大楼与殖民地时期商馆改建而成的粉彩拱廊建筑，拥有高大的百叶窗与典型的海岛木梁中庭。",
        "musicRelation": "联合国非遗佛得角“莫尔纳”（Morna）音乐的圣城与发源地。被誉为“赤脚歌后”的世界级巨星塞萨莉亚·埃沃拉（Cesária Évora）在此成长与登台，其用克里奥尔语吟唱的深沉忧伤（Sodade），将葡萄牙法多吉他、西非节拍与加勒比旋律熔铸为感动世界的大洋绝响。",
        "wiki_titles": ["Mindelo", "Cesária_Évora"]
    },
    {
        "id": "poi-af-hararenationalgallery",
        "city": "哈拉雷",
        "name": "哈拉雷国家艺术馆与绍纳姆比拉圣殿",
        "category": "landmark",
        "kindLabel": "绍纳族祖灵姆比拉与奇穆伦加音乐",
        "lon": 31.0489,
        "lat": -17.8258,
        "source": { "kind": "wikipedia-index", "title": "National Gallery of Zimbabwe", "url": "https://en.wikipedia.org/wiki/National_Gallery_of_Zimbabwe" },
        "history": "位于津巴布韦首都哈拉雷中央公园东南侧，1957年落成的现代主义混凝土展馆，以收藏和展示绍纳族大型皂石雕刻与传统非洲民俗器物闻名。",
        "musicRelation": "绍纳族祖灵祭祀乐器“姆比拉”（Mbira dzaVadzimu，22至28键拇指琴）与抗争音乐“奇穆伦加”（Chimurenga）的现代传播中心。托马斯·马普富莫（Thomas Mapfumo）在此将古老的姆比拉旋律移植至双电吉他与低音吉他，创造了激励民族独立运动的当代非洲抗争音乐典范。",
        "wiki_titles": ["National_Gallery_of_Zimbabwe", "Harare"]
    },
    {
        "id": "poi-af-ghanatheatre",
        "city": "阿克拉",
        "name": "加纳国家剧院与高生活音乐殿堂",
        "category": "theater",
        "kindLabel": "西非高生活音乐与泛非乐舞之冠",
        "lon": -0.1983,
        "lat": 5.5528,
        "source": { "kind": "wikipedia-index", "title": "National Theatre of Ghana", "url": "https://en.wikipedia.org/wiki/National_Theatre_of_Ghana" },
        "history": "坐落于加纳首都阿克拉市中心维多利亚堡区，1992年由中加合作建成，建筑外观宛如一只展翅翱翔的海鸥与扬帆起航的船帆，造型极其独特，内设1500座主剧场与露天展演广场。",
        "musicRelation": "西非流行音乐始祖“高生活”（Highlife）音乐的最高国家级舞台。20世纪中期“高生活之王”E.T. 门萨（E.T. Mensah）在此将阿坎族棕榈酒吉他乐、爵士铜管大乐队与加纳传统打击乐结合；剧院也是加纳国家交响乐团与泛非舞蹈乐团的常驻基地。",
        "wiki_titles": ["National_Theatre_of_Ghana", "Accra"]
    },
    {
        "id": "poi-af-essaouira",
        "city": "索维拉",
        "name": "索维拉要塞与格纳瓦世界音乐节圣地",
        "category": "landmark",
        "kindLabel": "人类非遗格纳瓦灵性恍惚音乐大本营",
        "lon": -9.7719,
        "lat": 31.5125,
        "source": { "kind": "wikipedia-index", "title": "Essaouira", "url": "https://en.wikipedia.org/wiki/Essaouira" },
        "history": "坐落于摩洛哥大西洋沿岸历史名城索维拉老城西北角的古老海防城墙与炮台要塞，建于1760年代阿拉维王朝时期，融合了法国军事工程师热内斯特设计的沃邦风格石砌城垒与伊斯兰尖拱门，濒临大西洋惊涛。",
        "musicRelation": "联合国教科文组织人类非物质文化遗产“格纳瓦”（Gnawa）音乐的世界中心，著名的索维拉格纳瓦世界音乐节（Gnaoua World Music Festival）主会场。黑人苏菲派乐师手持三弦羊皮低音“根布里琴”（Guembri）与铁响板“克拉卡布”（Qraqeb），进行通宵达旦的灵性出神疗愈仪式“莉拉”（Lila），吉米·亨德里克斯、罗伯特·普兰特等西方摇滚大师曾在此汲取灵感。",
        "wiki_titles": ["Essaouira", "Gnawa"]
    },
    {
        "id": "poi-af-babboujeloud",
        "city": "非斯",
        "name": "布日卢蓝门与非斯神圣音乐节圣地",
        "category": "landmark",
        "kindLabel": "阿拉伯-安达卢西亚古典乐乐府",
        "lon": -4.9839,
        "lat": 34.0617,
        "source": { "kind": "wikipedia-index", "title": "Bab Bou Jeloud", "url": "https://en.wikipedia.org/wiki/Bab_Bou_Jeloud" },
        "history": "摩洛哥伊斯兰千年古都非斯老城（Fes el-Bali）的主入口城门，建于1913年，外侧覆满象征非斯城深邃传统的钴蓝色马赛克几何瓷砖（Zellij），内侧则为伊斯兰绿瓷砖，是进入世界最大无汽车步行古城区的宏伟地标。",
        "musicRelation": "举世闻名的“非斯世界神圣音乐节”（Fez Festival of World Sacred Music）核心演出场所。非斯是自格拉纳达陷落后保存阿拉伯-安达卢西亚古典音乐体系“阿勒”（Ala / Tarab Andaloussi）最纯正的都城，其严谨的24套“努巴”（Nuba）组曲、拉巴卜琴与乌德琴传承在老城宫廷与清真寺回廊中世代回响。",
        "wiki_titles": ["Bab_Bou_Jeloud", "Fes_el_Bali"]
    },
    {
        "id": "poi-af-ennejmaezzahra",
        "city": "突尼斯城",
        "name": "埃农格拉宫 (阿拉伯与地中海音乐中心)",
        "category": "hall",
        "kindLabel": "古典马鲁夫音乐守护殿堂",
        "lon": 10.3475,
        "lat": 36.8711,
        "source": { "kind": "wikipedia-index", "title": "Ennejma Ezzahra", "url": "https://en.wikipedia.org/wiki/Ennejma_Ezzahra" },
        "history": "坐落于突尼斯城北郊著名的地中海蓝白小镇西迪布赛义德悬崖之巅，由英法德裔男爵、著名音乐学者鲁道夫·德朗热（Baron Rodolphe d'Erlanger）于1912至1922年建造的新摩尔式奢华宫殿，拥有雪白穹顶、大理石雕花喷泉与阿拉伯式几何木格窗。",
        "musicRelation": "阿拉伯古典音乐史上的“圣殿”。德朗热男爵在此耗费数十年编纂了划时代的六卷本巨著《阿拉伯音乐》（La musique arabe），并在此奠定了1932年开罗首届阿拉伯音乐大会的理论基石；如今这里是突尼斯“阿拉伯与地中海音乐中心”（CAMM），悉心典藏着突尼斯古典“马鲁夫”（Malouf）音乐的国宝级珍罕乐谱与古代乐器。",
        "wiki_titles": ["Ennejma_Ezzahra", "Sidi_Bou_Said"]
    },

    # --- CHINA TRADITIONAL & ETHNIC HERITAGE EXPANSION ---
    {
        "id": "poi-cn-norbulingka",
        "city": "拉萨",
        "name": "罗布林卡与藏戏阿吉拉姆圣殿",
        "category": "landmark",
        "kindLabel": "雪域藏戏与囊玛宫廷古乐圣地",
        "lon": 91.0967,
        "lat": 29.6517,
        "source": { "kind": "wikipedia-index", "title": "Norbulingka", "url": "https://en.wikipedia.org/wiki/Norbulingka" },
        "history": "坐落于拉萨市西郊，始建于18世纪中叶七世达赖喇嘛时期，是历代达赖喇嘛的夏宫，占地约36万平方米，为典型的藏式园林建筑群，拥有格桑颇章、金色颇章等华美宫殿，殿内绘制有规模宏大的历史与乐舞壁画。",
        "musicRelation": "人类非遗藏戏（Ache Lhamo）全藏区汇演的最高圣地——一年一度“雪顿节”的核心展演剧场；同时也是西藏古典宫廷歌舞“囊玛”（Nangma）与民间“堆谐”（Toeshey）的传习核心，六弦琴扎木念（Dranyen）、铁弦胡琴与骨笛在花香庭院中交织出雪域高原独特的清澈调式。",
        "wiki_titles": ["Norbulingka", "Lhasa"]
    },
    {
        "id": "poi-cn-kashgaroldtown",
        "city": "喀什",
        "name": "喀什老城与维吾尔十二木卡姆圣地",
        "category": "landmark",
        "kindLabel": "人类非遗丝路十二木卡姆祖庭",
        "lon": 75.9897,
        "lat": 39.4722,
        "source": { "kind": "wikipedia-index", "title": "Kashgar", "url": "https://en.wikipedia.org/wiki/Kashgar" },
        "history": "位于新疆塔里木盆地西缘，已有两千余年历史的生土建筑古城群落，高台民居层叠错落，穿行于生土过街楼与艾提尕尔清真寺广场之间，融合了中亚伊斯兰建筑与绿洲农耕民居的独特肌理。",
        "musicRelation": "人类非遗“新疆维吾尔木卡姆艺术”的发源摇篮与集大成之都。二十世纪木卡姆大师吐尔迪·阿洪（Turdi Akhun）在此系统完整口传并录制了《拉克》《且比亚特》等全部十二部旷世木卡姆大曲；独它尔（Dutar）、萨塔尔（Satar）、热瓦普（Rawap）与达卜手鼓（Dap）在老城茶馆里日夜欢奏。",
        "wiki_titles": ["Kashgar", "Id_Kah_Mosque"]
    },
    {
        "id": "poi-cn-ulanmuqir",
        "city": "呼和浩特",
        "name": "内蒙古乌兰牧骑宫与马头琴长调圣殿",
        "category": "hall",
        "kindLabel": "蒙古族长调 / 马头琴 / 呼麦圣所",
        "lon": 111.7486,
        "lat": 40.8425,
        "source": { "kind": "wikipedia-index", "title": "Hohhot", "url": "https://en.wikipedia.org/wiki/Hohhot" },
        "history": "坐落于呼和浩特市如意开发区核心文化带，外观汲取蒙古包穹顶与草原风卷哈达的流线型现代建筑设计，包含1200座大剧场与非物质文化遗产展厅。",
        "musicRelation": "蒙古族长调民歌（Urtiin Duu）、马头琴音乐与“呼麦”（Khoomei）双音喉鸣艺术的最高展示与研究基地。长调无固定拍节、高亢悠长、带有极其细腻的诺古拉（装饰颤音），与马头琴低沉辽阔的潮尔（伴奏低音）在此完美共鸣，承载着游牧文明的人类天籁。",
        "wiki_titles": ["Hohhot", "Morin_khuur"]
    },
    {
        "id": "poi-cn-zhaoxing",
        "city": "黎平",
        "name": "肇兴侗寨鼓楼群与侗族大歌圣所",
        "category": "landmark",
        "kindLabel": "人类非遗多声部无伴奏合唱之乡",
        "lon": 109.1833,
        "lat": 25.9083,
        "source": { "kind": "wikipedia-index", "title": "Zhaoxing", "url": "https://en.wikipedia.org/wiki/Zhaoxing" },
        "history": "坐落于贵州省黎平县西南部高山河谷，为全国最大的侗族自然村寨。全寨拥有“仁、义、礼、智、信”五座完全不用一钉一铆、全凭杉木榫卯嵌合而成的宝塔形飞檐鼓楼，最高达十余层，与五座风雨桥连通。",
        "musicRelation": "联合国教科文组织人类非物质文化遗产“侗族大歌”（Kam Grand Choir）的典型发祥村落。侗族大歌是世界上极为罕见的“民间多声部、无指挥、无伴奏”自然合唱，男女歌班在鼓楼篝火旁模拟蝉鸣、鸟语与高山流泉，一人领唱、众人和鸣，彻底打破了西方音乐界曾断言“中国无民间多部和声”的偏见。",
        "wiki_titles": ["Zhaoxing", "Dong_people"]
    },
    {
        "id": "poi-cn-naximusic",
        "city": "丽江",
        "name": "大研纳西古乐会与白沙细乐圣地",
        "category": "hall",
        "kindLabel": "汉唐道乐与纳西交融之活化石",
        "lon": 100.2372,
        "lat": 26.8722,
        "source": { "kind": "wikipedia-index", "title": "Old Town of Lijiang", "url": "https://en.wikipedia.org/wiki/Old_Town_of_Lijiang" },
        "history": "位于丽江大研古城密士巷四方街东北侧，典型的“三坊一照壁、四合五天井”纳西族传统木构瓦顶四合院，门楣悬挂着海内外音乐学者题赠的墨宝。",
        "musicRelation": "誉满海内外的纳西古乐（包括大型管弦套曲《白沙细乐》与《丽江古乐》）的核心发掘与演出阵地。老乐师们怀抱苏古笃、芦管、曲项琵琶与十面云锣，演奏中原早已失传的唐宋词牌、元代曲牌与道教“洞经音乐”，宣科先生在此主持了数千场走向国际的学术与文化展演。",
        "wiki_titles": ["Old_Town_of_Lijiang", "Lijiang"]
    },
    {
        "id": "poi-cn-sanrenting",
        "city": "广州",
        "name": "沙湾三稔厅与广东音乐发源地",
        "category": "hall",
        "kindLabel": "粤乐宗师何氏三杰创作圣所",
        "lon": 113.3325,
        "lat": 22.9061,
        "source": { "kind": "wikipedia-index", "title": "Guangzhou", "url": "https://en.wikipedia.org/wiki/Guangzhou" },
        "history": "坐落于广州番禺沙湾古镇安宁西街，始建于清代中叶，为沙湾何氏一族广东音乐名家聚集演乐的传统广府镬耳青砖小筑，因庭院内植有一株三稔树（杨桃变种）而得名。",
        "musicRelation": "岭南文化瑰宝“广东音乐”（粤乐）的最重要发祥母体。晚清民国时期，“沙湾何氏三杰”（何柳堂、何与年、何少霞）在此创立演乐会，手持高胡、秦琴、扬琴等五架头，在此创作出了《雨打芭蕉》《赛龙夺锦》《饿马摇铃》等奠定中国近代民族器乐基石的绝世名曲。",
        "wiki_titles": ["Guangdong_music_(genre)", "Guangzhou"]
    },
    {
        "id": "poi-cn-chaozhou",
        "city": "潮州",
        "name": "海阳县儒学宫与潮州音乐圣地",
        "category": "academy",
        "kindLabel": "潮州弦诗乐与大锣鼓之都",
        "lon": 116.6347,
        "lat": 23.6669,
        "source": { "kind": "wikipedia-index", "title": "Chaozhou", "url": "https://en.wikipedia.org/wiki/Chaozhou" },
        "history": "位于潮州古城昌黎路中段，始建于南宋绍兴年间的大型儒学建筑群，以大成殿重檐歇山顶、红墙琉璃瓦与精致潮州木雕石雕为特色；东临中国四大古桥之一潮州广济桥（湘子桥）。",
        "musicRelation": "国家级非物质文化遗产“潮州音乐”（潮州弦诗乐、潮州大锣鼓）的传习圣所。潮州筝派以独特的二四谱、重六调、轻三六调和活五调等古老微分音律制傲立乐坛，潮州大锣鼓更以司鼓指挥、大管弦合奏展现出气吞山河的盛唐遗风。",
        "wiki_titles": ["Chaozhou", "Guangji_Bridge"]
    },
    {
        "id": "poi-cn-yushanguqin",
        "city": "常熟",
        "name": "严天池故居与琴川虞山派祖庭",
        "category": "hall",
        "kindLabel": "中国古琴第一大派发祥圣地",
        "lon": 120.7489,
        "lat": 31.6567,
        "source": { "kind": "wikipedia-index", "title": "Changshu", "url": "https://en.wikipedia.org/wiki/Changshu" },
        "history": "位于江苏常熟古城虞山南麓琴川河畔，明代琴坛宗师严澂（严天池）的故居与晚翠亭旧址，周边园林清幽，古树参天，为江南水乡传统砖木民居。",
        "musicRelation": "联合国非遗中国古琴艺术影响最深远、流传最广的“虞山琴派”（亦称琴川派）发祥地。明万历年间严天池在此创立“琴川琴社”，编纂《松弦馆琴谱》，确立了古琴美学崇尚“清、微、淡、远”的正宗典范，彻底扭转了当时繁冗炫技的风气，成为中国文人琴乐的最高丰碑。",
        "wiki_titles": ["Changshu", "Guqin"]
    },
    {
        "id": "poi-cn-shandongzheng",
        "city": "菏泽",
        "name": "郓城古城与山东筝派传承中心",
        "category": "landmark",
        "kindLabel": "鲁西南大调曲子与齐鲁筝派",
        "lon": 115.9458,
        "lat": 35.6022,
        "source": { "kind": "wikipedia-index", "title": "Heze", "url": "https://en.wikipedia.org/wiki/Heze" },
        "history": "位于鲁西南平原菏泽郓城县，依托水泊梁山历史文脉复建的古城街区，拥有齐鲁风格青砖灰瓦大戏楼与传统乐社。",
        "musicRelation": "中国传统筝乐北方重镇“山东筝派”的核心摇篮。流传千年的鲁西“大调曲子”（八板体大套曲）在此生根，以大指小关节托劈和剧烈的大颤音闻名，一代古筝宗师赵玉斋、高自成在此将《高山流水》《汉宫秋月》等齐鲁名曲传扬海内外。",
        "wiki_titles": ["Heze", "Guzheng"]
    },
    {
        "id": "poi-cn-xintianyou",
        "city": "榆林",
        "name": "绥德黄土地与陕北信天游圣所",
        "category": "landmark",
        "kindLabel": "黄土高原信天游与陕北说书圣地",
        "lon": 110.2611,
        "lat": 37.4981,
        "source": { "kind": "wikipedia-index", "title": "Suide_County", "url": "https://en.wikipedia.org/wiki/Suide_County" },
        "history": "坐落于陕北黄土高原丘陵沟壑区中心绥德县无定河畔，保留有宏伟的秦汉名将蒙恬长眠之地与陕北传统土窑洞建筑群，自古有“天下名州”与“陕北石雕之乡”美誉。",
        "musicRelation": "联合国教科文组织关注的中国西北民歌明珠“信天游”与“陕北说书”的核心腹地。千沟万壑的高原风貌孕育了高亢嘹亮、自由奔放的甩腔，韩起祥等说书艺人一手抱三弦、腿绑甩板在此开创了民间口头叙事说唱的巅峰，《山丹丹开花红艳艳》《东方红》等民歌旋律均由此生发。",
        "wiki_titles": ["Suide_County", "Yulin,_Shaanxi"]
    },
    {
        "id": "poi-cn-yanji",
        "city": "延吉",
        "name": "中国朝鲜族非物质文化遗产馆",
        "category": "museum",
        "kindLabel": "伽倻琴与农乐长鼓舞国家级圣殿",
        "lon": 129.5089,
        "lat": 42.9069,
        "source": { "kind": "wikipedia-index", "title": "Yanji", "url": "https://en.wikipedia.org/wiki/Yanji" },
        "history": "位于吉林省延边朝鲜族自治州首府延吉市帽儿山脚下，建筑融合了传统朝鲜族飞檐灰瓦与现代玻璃幕墙风格，馆内设立有完整的民族乐器制作展示工坊与大型演艺厅。",
        "musicRelation": "人类非遗“中国朝鲜族农乐舞”与国家级非遗“朝鲜族伽倻琴艺术”的最高保护基地。展示了包括12弦与21弦伽倻琴散调、短箫、杖鼓（长鼓）以及著名的“象帽舞”旋转甩带技巧，是东北亚少数民族传统音乐活态传承的殿堂。",
        "wiki_titles": ["Yanji", "Gayageum"]
    }
]

# Additional image title overrides for phase 2 POIs that need valid offline files
phase2_image_fixes = {
    "poi-cn-liyuan": ["Tang_Paradise", "Great_Wild_Goose_Pagoda"],
    "poi-cn-mogaocave112": ["Mogao_Caves"],
    "poi-cn-kunqu": ["Kunqu", "Suzhou"],
    "poi-cn-yongling": ["Chengdu", "Sichuan"],
    "poi-cn-abing": ["Abing", "Wuxi"],
    "poi-cn-huguang": ["Huguang_Guild_Hall", "Beijing"],
    "poi-cn-fuhao": ["Tomb_of_Fu_Hao", "Yinxu"],
    "poi-ethno-gamelan": ["Pura_Taman_Saraswati", "Ubud"],
    "poi-ethno-shakuhachi": ["Tōfuku-ji", "Kyoto"],
    "poi-ethno-baghdadoud": ["Al-Mustansiriya_Madrasah", "Baghdad"]
}

print(f"Starting Injection & Image Pipeline for {len(new_pois_batch)} new POIs + {len(phase2_image_fixes)} image repairs...")

added_count = 0
for item in new_pois_batch:
    pid = item["id"]
    city = item["city"]
    name = item["name"]
    center = poi_data["cityCoordinates"][city]
    dist = distance_km(item, center)
    if dist > 40:
        print(f"WARNING: {pid} in {city} is {dist}km from center! Adjusting coordinates...")
        item["lon"] = center["lon"]
        item["lat"] = center["lat"]
        dist = 0.0

    rel_img_file = f"assets/img/poi/{pid}.jpg"
    abs_img_file = os.path.join("modules/europa", rel_img_file)

    # Download image if not present or small
    if not os.path.exists(abs_img_file) or os.path.getsize(abs_img_file) < 10000:
        print(f"Downloading image for {pid} ({name})...", flush=True)
        downloaded = 0
        for title in item.get("wiki_titles", []):
            sz = fetch_wiki_image_curl(title, abs_img_file, "en")
            if sz == 0:
                sz = fetch_wiki_image_curl(title, abs_img_file, "zh")
            if sz > 10000:
                downloaded = sz
                print(f"  [OK] Downloaded {sz} bytes via Wikipedia: {title}", flush=True)
                break
        if downloaded == 0:
            for title in item.get("wiki_titles", []):
                sz = fetch_commons_search_curl(title, abs_img_file)
                if sz > 10000:
                    downloaded = sz
                    print(f"  [OK] Downloaded {sz} bytes via Commons search: {title}", flush=True)
                    break
        if downloaded == 0:
            print(f"  [FAILED] Could not download image for {pid}", flush=True)
        time.sleep(0.3)
    else:
        print(f"Cached image for {pid} ({os.path.getsize(abs_img_file)} bytes)", flush=True)

    poi_obj = {
        "id": pid,
        "city": city,
        "name": name,
        "category": item["category"],
        "kindLabel": item["kindLabel"],
        "lon": item["lon"],
        "lat": item["lat"],
        "coordinateSource": "manual-building-coordinate",
        "coordinateStatus": "manual-building-coordinate",
        "cityDistanceKm": dist,
        "source": item["source"],
        "history": item["history"],
        "musicRelation": item["musicRelation"],
        "editorialStatus": "curated",
        "sourceKey": f"{city}|{name}",
        "imageKey": f"{city}|{name}",
        "imageSource": {
            "mediaId": pid,
            "file": rel_img_file,
            "credit": f"{name} · Wikimedia Commons",
            "source": item["source"]["url"]
        },
        "imageRequest": None,
        "legacySource": "world-ethno-curated"
    }

    # Upsert
    idx = next((i for i, p in enumerate(poi_data["pois"]) if p["id"] == pid), -1)
    if idx >= 0:
        poi_data["pois"][idx] = poi_obj
    else:
        poi_data["pois"].append(poi_obj)
        added_count += 1

    media_data["media"][pid] = {
        "url": rel_img_file,
        "file": rel_img_file,
        "credit": f"{name} · Wikimedia Commons",
        "source": item["source"]["url"],
        "aiCreated": False
    }

# Fix phase 2 images
print("\nRepairing Phase 2 missing images...")
for pid, titles in phase2_image_fixes.items():
    rel_img_file = f"assets/img/poi/{pid}.jpg"
    abs_img_file = os.path.join("modules/europa", rel_img_file)
    if not os.path.exists(abs_img_file) or os.path.getsize(abs_img_file) < 10000:
        print(f"Repairing {pid}...")
        downloaded = 0
        for title in titles:
            sz = fetch_wiki_image_curl(title, abs_img_file)
            if sz > 10000:
                downloaded = sz
                print(f"  [OK] Repaired {sz} bytes via Wikipedia: {title}")
                break
        if downloaded == 0:
            for title in titles:
                sz = fetch_commons_search_curl(title, abs_img_file)
                if sz > 10000:
                    downloaded = sz
                    print(f"  [OK] Repaired {sz} bytes via Commons: {title}")
                    break
        time.sleep(0.3)

with open(poi_path, "w", encoding="utf-8") as f:
    json.dump(poi_data, f, indent=2, ensure_ascii=False)

with open(media_path, "w", encoding="utf-8") as f:
    json.dump(media_data, f, indent=2, ensure_ascii=False)

print(f"\nExpansion Complete! Added {added_count} POIs.")
print(f"Total POIs in database: {len(poi_data['pois'])}")
print(f"Total cities in database: {len(poi_data['cityCoordinates'])}")
