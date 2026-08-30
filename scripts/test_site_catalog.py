#!/usr/bin/env python3
"""Focused, dependency-free metadata and generated-region regression tests."""

import contextlib
from copy import deepcopy
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import build_site_catalog as catalog


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "schemas").mkdir()
        (self.root / "schemas/module.schema.json").write_bytes(
            (catalog.ROOT / "schemas/module.schema.json").read_bytes())
        self.module = {
            "id": "example", "number": "I", "title": "示例 <档案>", "latinTitle": "Exemplum",
            "subtitle": "资料", "description": "谨慎的范围说明。", "route": "modules/example/index.html",
            "type": "research-tool", "status": "active", "access": "public", "home": True,
            "parent": None, "materialTypes": ["史料"], "sourceBasis": ["据本"], "corpusCounts": {},
            "contentRevision": None, "interfaceRevision": "2026-08-30", "maintainer": "编者",
            "citation": "推荐引用。", "version": "1.0.0", "entry": "index.html",
        }
        self.save(self.module)
        for relative in set(catalog.TARGETS.values()):
            names = [name for name, target in catalog.TARGETS.items() if target == relative]
            text = "manual before\r\n" + "\r\n".join(
                f"<!-- BEGIN GENERATED: {name} -->\r\nstale\r\n<!-- END GENERATED: {name} -->"
                for name in names) + "\r\nmanual after\n"
            (self.root / relative).write_bytes(text.encode("utf-8"))

    def save(self, module, directory=None):
        directory = self.root / (directory or f"modules/{module['id']}")
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "index.html").write_text("<title>Fixture</title>", encoding="utf-8")
        (directory / "module.json").write_text(json.dumps(module, ensure_ascii=False), encoding="utf-8")

    def assert_invalid(self, text):
        with self.assertRaisesRegex(ValueError, text):
            catalog.load_modules(self.root)

    def test_valid_module_and_nullable_content_date(self):
        self.assertEqual(catalog.load_modules(self.root)[0]["contentRevision"], None)

    def test_required_and_unknown_fields(self):
        del self.module["citation"]
        self.module["unexpected"] = "no"
        self.save(self.module)
        self.assert_invalid("missing required field citation")
        self.assert_invalid("unknown field unexpected")

    def test_enums_and_invalid_date(self):
        for field, value, expected in [("status", "published", "unsupported value"),
                                       ("access", "online", "unsupported value"),
                                       ("interfaceRevision", "2026-02-30", "real YYYY-MM-DD"),
                                       ("contentRevision", "2026-8-1", "real YYYY-MM-DD")]:
            with self.subTest(field=field):
                original = self.module[field]
                self.module[field] = value
                self.save(self.module)
                self.assert_invalid(expected)
                self.module[field] = original

    def test_duplicate_id_number_and_route(self):
        other = deepcopy(self.module)
        self.save(other, "modules/second")
        for field in ("id", "number", "route"):
            self.assert_invalid(f"duplicate {field}")

    def test_missing_route_and_escape(self):
        (self.root / "modules/example/index.html").unlink()
        self.assert_invalid("route does not exist")
        self.module["route"] = "../outside/index.html"
        self.save(self.module)
        self.assert_invalid("invalid format|escapes")

    def test_missing_formal_metadata_is_detected(self):
        directory = self.root / "modules/missing"
        directory.mkdir()
        (directory / "index.html").write_text("", encoding="utf-8")
        self.assert_invalid("missing formal module.json")

    def test_root_level_module_and_parent_hierarchy(self):
        self.module["id"] = "museum"
        self.module["number"] = "I.1"
        self.module["route"] = "museum/index.html"
        self.module["home"] = False
        self.module["parent"] = "example"
        self.save(self.module, "museum")
        loaded = catalog.load_modules(self.root)
        self.assertEqual([m["id"] for m in loaded], ["example", "museum"])
        self.module["parent"] = "absent"
        self.save(self.module, "museum")
        self.assert_invalid("existing top-level module")

    def test_count_sources_and_stale_counts(self):
        (self.root / "corpus.json").write_text('{"items": [1, 2]}', encoding="utf-8")
        self.module["corpusCounts"] = {"记录": 2}
        self.module["countSources"] = {"记录": {"file": "corpus.json", "pointer": "/items"}}
        self.save(self.module)
        self.assertEqual(catalog.load_modules(self.root)[0]["corpusCounts"]["记录"], 2)
        self.module["corpusCounts"]["记录"] = 3
        self.save(self.module)
        self.assert_invalid("stale count")
        self.module["countSources"] = {}
        self.save(self.module)
        self.assert_invalid("exactly one countSources")

    def test_html_is_escaped(self):
        self.assertIn("示例 &lt;档案&gt;", catalog.home_region([self.module]))
        self.assertIn("示例 &lt;档案&gt;", catalog.catalog_region([self.module]))

    def test_missing_and_duplicate_markers_fail(self):
        with self.assertRaisesRegex(ValueError, "exactly one marker pair"):
            catalog.replace_region("unmarked", "example", "new")
        text = "<!-- BEGIN GENERATED: example --><!-- END GENERATED: example -->"
        with self.assertRaisesRegex(ValueError, "exactly one marker pair"):
            catalog.replace_region(text + text, "example", "new")

    def test_check_is_read_only_build_is_deterministic_and_preserves_outer_bytes(self):
        before = (self.root / "index.html").read_bytes()
        with patch.object(catalog, "ROOT", self.root), contextlib.redirect_stdout(io.StringIO()), \
                contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(catalog.main(["--check"]), 1)
            self.assertEqual((self.root / "index.html").read_bytes(), before)
            self.assertEqual(catalog.main([]), 0)
            built = {p: p.read_bytes() for p in (self.root / f for f in set(catalog.TARGETS.values()))}
            self.assertEqual(catalog.main(["--check"]), 0)
            self.assertEqual(catalog.main([]), 0)
            for path, data in built.items():
                self.assertEqual(path.read_bytes(), data)
                self.assertTrue(data.startswith(b"manual before\r\n"))
                self.assertTrue(data.endswith(b"\r\nmanual after\n"))


if __name__ == "__main__":
    unittest.main()
