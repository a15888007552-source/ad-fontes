#!/usr/bin/env python3
"""Fast, dependency-free checks of public entries, local resources and finding aids."""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

from build_site_catalog import ROOT, generated_files, load_modules, read_exact

ORIGIN = 'a15888007552-source.github.io'
PREFIX = '/ad-fontes/'


class Tags(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def local_target(value: str, source: Path) -> Path | None:
    parsed = urlsplit(value)
    if parsed.scheme in ('data', 'mailto', 'tel', 'javascript', 'blob'):
        return None
    if parsed.netloc and parsed.netloc != ORIGIN:
        return None
    raw = unquote(parsed.path)
    if not raw:
        return None
    if raw.startswith('/'):
        if not raw.startswith(PREFIX):
            raise ValueError(f'site link escapes GitHub Pages prefix: {value}')
        path = ROOT / raw[len(PREFIX):]
    else:
        path = source.parent / raw
    path = path.resolve()
    if not path.is_relative_to(ROOT.resolve()):
        raise ValueError(f'local link escapes repository: {value}')
    if path.is_dir() or raw.endswith('/'):
        path /= 'index.html'
    return path


def main() -> int:
    errors = []
    resources = set()
    stylesheets = set()
    try:
        modules = load_modules()
        for path, expected in generated_files(ROOT, modules).items():
            if read_exact(path) != expected:
                errors.append(f'{path.relative_to(ROOT)}: generated catalog is stale')
    except (OSError, ValueError, KeyError) as exc:
        print(f'SITE CHECK FAIL: {exc}')
        return 1

    def check(value, source):
        if not value:
            return
        try:
            target = local_target(value, source)
            if target is not None:
                resources.add(target)
                if not target.is_file():
                    errors.append(f'{source.relative_to(ROOT)}: missing {value}')
                return target
        except ValueError as exc:
            errors.append(f'{source.relative_to(ROOT)}: {exc}')

    entries = [ROOT / 'index.html', ROOT / 'modules/index.html', ROOT / '404.html']
    for module in modules:
        route = ROOT / module['route']
        entries.append(route / 'index.html' if route.is_dir() else route)
    entrance_files = set(entries[:3])
    for source in entries:
        tags = Tags(source.read_text(encoding='utf-8-sig')).tags
        canonicals = []
        for tag, attrs in tags:
            if tag == 'link' and 'canonical' in attrs.get('rel', '').split():
                canonicals.append(attrs.get('href', ''))
                check(attrs.get('href'), source)
            if tag == 'script' or tag == 'img':
                check(attrs.get('src'), source)
            if tag == 'link' and set(attrs.get('rel', '').split()) & {'stylesheet', 'icon', 'preload'}:
                target = check(attrs.get('href'), source)
                if target is not None and target.suffix == '.css':
                    stylesheets.add(target)
            if tag == 'a' and source in entrance_files:
                if 'href' not in attrs:
                    errors.append(f'{source.relative_to(ROOT)}: anchor without href')
                check(attrs.get('href'), source)
            if 'modules/modules/' in attrs.get('href', '') or 'modules/modules/' in attrs.get('src', ''):
                errors.append(f'{source.relative_to(ROOT)}: accidental doubled modules path')
        if source.name != '404.html' and len(canonicals) != 1:
            errors.append(f'{source.relative_to(ROOT)}: expected one canonical URL')
    for source in stylesheets:
        if source.is_file():
            # Consume a whole quoted data URI; nested SVG url(%23id) is not a file.
            pattern = r'''url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s)]+))\s*\)'''
            for match in re.finditer(pattern, source.read_text(encoding='utf-8-sig')):
                value = next(group for group in match.groups() if group is not None).strip()
                if not value.startswith(('#', 'var(')):
                    check(value, source)

    hero_css = (ROOT / 'modules/europa/css/index.css').read_text(encoding='utf-8-sig')
    if 'url("../音乐学资源/musicology-hero.jpg")' not in hero_css:
        errors.append('Europa musicology hero must resolve relative to css/index.css')
    result = subprocess.run(['node', '--test', 'scripts/test_site_shell.cjs'], cwd=ROOT, capture_output=True, text=True)
    if result.returncode:
        errors.append('404/legacy/theme shell tests failed:\n' + result.stdout + result.stderr)
    if errors:
        print('SITE CHECK FAIL:\n' + '\n'.join(errors))
        return 1
    print(f'SITE CHECK PASS: {len(modules)} modules, {len(entries)} entries, {len(resources)} local targets, exact legacy/404 tests, fresh catalogs.')
    return 0


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
