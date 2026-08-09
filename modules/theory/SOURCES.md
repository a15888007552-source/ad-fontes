# Musica Theorica · 2026-08-09 扩充资料记录

本文件记录第三稿新增的“声音与调律”“和声与声部”“节奏与形式”三条路径所据在线资料及使用边界。网页正文为重新组织、计算与撰写，不复制教材谱例或练习。

## 在线学术与教学资料

1. Mark Gotham et al., ed. *Open Music Theory*, Version 2. VIVA Open Publishing. 主要用于本科课程范围、音程、节拍、超节拍、形式功能、音级集合和十二音术语的交叉核对。开放教材主页：<https://viva.pressbooks.pub/openmusictheory/>。
2. Joe Wolfe, “Acoustics FAQ,” Music Acoustics, University of New South Wales. 用于频率、基频、泛音列、拍频、纯五度和十二平均律频率比的声学核对：<https://phys.unsw.edu.au/jw/musFAQ.html>。
3. Library of Congress, “Music History from Primary Sources: The Art of Musical Notation.” 用于复核纽姆、谱线、有量记谱及早期音乐印刷的历史链条：<https://www.loc.gov/collections/moldenhauer-archives/articles-and-essays/guide-to-archives/music-history/>。
4. Jean-Philippe Rameau, *Traité de l’harmonie réduite à ses principes naturels* (Paris, 1722), BnF Rés V 1613：<https://gallica.bnf.fr/ark:/12148/btv1b86232459>。
5. Gioseffo Zarlino, *Le istitutioni harmoniche* (Venice, 1562), University of North Texas Music Library：<https://digital.library.unt.edu/ark:/67531/metadc25955/>。

## 书目框架

- J. Peter Burkholder, Donald Jay Grout, and Claude V. Palisca, *A History of Western Music*, 10th ed.
- Richard Taruskin, *The Oxford History of Western Music*.
- Carl Dahlhaus, *Studies on the Origin of Harmonic Tonality* and *Nineteenth-Century Music*.
- M. L. West, *Ancient Greek Music*.
- Olivier Messiaen, *Technique de mon langage musical* (1944).
- Allen Forte, *The Structure of Atonal Music*.
- Robert P. Morgan, *Twentieth-Century Music*.

## 编写与计算说明

- 泛音实验以 C2 = 65.4063913 Hz 为基频，按 `n × f` 计算前 12 分音；最近十二平均律音及音分偏差由 `69 + 12 log2(f / 440)` 计算。
- 十二平均律半音比按 `2^(1/12)` 计算。纯律大三度使用 5:4，纯五度使用 3:2；相对 12-TET 的差值由 `1200 log2(ratio)` 计算。
- 页面合成音只用于辨认频率关系、音程方向、和弦连接与节拍层级，不模拟真实乐器的完整频谱、动态或空间响应。
- 功能和声、声部进行、节拍与形式的陈述均限定于相应历史和风格语境，不宣称为所有音乐传统的普遍语法。
