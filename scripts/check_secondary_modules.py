#!/usr/bin/env python3
"""Focused static checks; optional Git baseline proves reader content preservation.

    python scripts/check_secondary_modules.py --baseline <pre-change-commit>

No browser, network, protected payload, or third-party dependencies are used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


class ReaderHTML(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.views: dict[str, list[str]] = {}
        self.links: list[tuple[str, str]] = []
        self.active: str | None = None
        self.section_depth = 0
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        if tag == 'section':
            if self.active:
                self.section_depth += 1
            elif 'view' in attrs.get('class', '').split():
                self.active = attrs['id']
                self.section_depth = 1
                self.views[self.active] = []
        if self.active and tag in {'a', 'img', 'source'}:
            self.links.append((tag, attrs.get('href', attrs.get('src', ''))))

    def handle_endtag(self, tag):
        if tag == 'section' and self.active:
            self.section_depth -= 1
            if not self.section_depth:
                self.active = None

    def handle_data(self, data):
        if self.active:
            self.views[self.active].append(data)

    def corpus(self):
        return {key: re.sub(r'\s+', ' ', ''.join(parts)).strip() for key, parts in self.views.items()}


def read(module):
    return (ROOT / 'modules' / module / 'index.html').read_text(encoding='utf-8')


def git_read(ref, path):
    return subprocess.check_output(['git', 'show', f'{ref}:{path}'], cwd=ROOT).decode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', help='Original commit/ref for text, links, IDs, and crypto comparison')
    args = parser.parse_args()
    for module in ('philosophy', 'theory'):
        source = read(module)
        page = ReaderHTML(source)
        assert len(page.ids) == len(set(page.ids)), f'{module}: duplicate HTML IDs'
        assert 'reader.css' in source and 'reader-status' in source
        assert '../index.html' in source
        if args.baseline:
            old = ReaderHTML(git_read(args.baseline, f'modules/{module}/index.html'))
            assert old.corpus() == page.corpus(), f'{module}: research text changed'
            assert old.links == page.links, f'{module}: research links/resources changed'
            assert set(old.ids) <= set(page.ids), f'{module}: old IDs removed'
        digest = hashlib.sha256(json.dumps(page.corpus(), ensure_ascii=False, sort_keys=True).encode()).hexdigest()
        print(f'{module}: {len(page.views)} views; {len(page.ids)} unique IDs; research-text SHA256 {digest}')
    philosophy = ReaderHTML(read('philosophy'))
    for id_ in [*(f'p{n}' for n in range(1, 157)), *(f'chapter-{n}' for n in range(1, 11)), *(f'note{n}' for n in range(157, 172))]:
        assert id_ in philosophy.ids, f'philosophy: missing {id_}'
    theory = read('theory')
    theory_ids = ReaderHTML(theory).ids
    for flow in re.findall(r"data-flow='([^']+)'", theory):
        for _, id_ in json.loads(flow):
            assert id_ in theory_ids, f'theory: broken flow target {id_}'

    shao = read('shao')
    config = json.loads((ROOT / 'modules/shao/config.json').read_text(encoding='utf-8'))
    assert config['remoteUrl'].startswith(('http://', 'https://'))
    assert config['remoteUrl'] not in shao, 'Shao remote address remains hardcoded in HTML'
    assert '状态未验证' in shao and 'copy-address' in shao
    launcher = (ROOT / 'modules/shao/launcher.js').read_text(encoding='utf-8')
    assert re.findall(r"fetch\(([^)]+)\)", launcher) == ["'config.json'"], 'Shao must not infer health from cross-origin fetch'

    busoni = read('busoni')
    for marker in ('finding-aid', 'aria-live="polite"', 'show-password', 'getModifierState', 'aria-busy', 'rel="canonical"', "fetch('module.json')"):
        assert marker in busoni, f'Busoni missing {marker}'
    if args.baseline:
        old = git_read(args.baseline, 'modules/busoni/index.html')
        for name in ('b64ToBytes', 'deriveKey', 'ungzip', 'unlock'):
            pattern = rf'^(?:async )?function {name}\([^\n]+'
            assert re.search(pattern, old, re.M).group() == re.search(pattern, busoni, re.M).group(), f'Busoni crypto function {name} changed'
        changed = subprocess.check_output(['git', 'diff', '--name-only', args.baseline, '--', 'modules/busoni/payload.enc.json'], cwd=ROOT).strip()
        assert not changed, 'Protected payload changed'

    syntax = r'''const fs=require('fs'),vm=require('vm');
for(const module of ['shao','busoni','philosophy','theory']){
 const dir='modules/'+module+'/',html=fs.readFileSync(dir+'index.html','utf8');
 for(const [i,m] of [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].entries()){
  const src=m[1].match(/src="([^"]+)"/);
  new vm.Script(src?fs.readFileSync(dir+src[1],'utf8'):m[2],{filename:dir+(src?src[1]:i)});
 }
}console.log('All four modules: JavaScript syntax OK');'''
    subprocess.run(['node', '-e', syntax], cwd=ROOT, check=True)
    print('Secondary module checks passed' + ('; research content, links, IDs and crypto preserved against ' + args.baseline if args.baseline else ''))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
