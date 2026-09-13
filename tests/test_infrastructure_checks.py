from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import repository_integrity  # noqa: E402
import scholarly_integrity  # noqa: E402


class RepositoryIntegrityTests(unittest.TestCase):
    def test_multi_museum_ids_are_scoped_but_same_museum_duplicates_are_not(self) -> None:
        self.assertNotEqual(
            repository_integrity.scoped_id({"museum_id": "beilin", "id": "artifact-001"}),
            repository_integrity.scoped_id({"museum_id": "qinhan", "id": "artifact-001"}),
        )
        self.assertEqual(
            repository_integrity.scoped_id({"museum_id": "beilin", "id": "artifact-001"}),
            repository_integrity.scoped_id({"museum_id": "beilin", "id": "artifact-001"}),
        )

    def test_repository_escape_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "modules" / "europa" / "index.html"
            source.parent.mkdir(parents=True)
            source.write_text("", encoding="utf-8")
            target, error = repository_integrity.resolve_local_reference(source, "../../../outside.png", root)
            self.assertIsNone(target)
            self.assertEqual(error, "escapes the repository root")

    def test_dynamic_and_external_references_are_not_treated_as_local_files(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "index.html"
            source.write_text("", encoding="utf-8")
            self.assertEqual(repository_integrity.resolve_local_reference(source, "https://example.com/a.png", root), (None, None))
            self.assertEqual(repository_integrity.resolve_local_reference(source, "${image}", root), (None, None))


class ScholarlyIntegrityTests(unittest.TestCase):
    def test_catalog_ids_are_reported_without_inventing_a_schema(self) -> None:
        ids, violations = scholarly_integrity.collect_catalog_ids(
            [{"id": "book-1"}, {"id": "book-1"}, {"id": "book-2"}]
        )
        self.assertEqual(ids, {"book-1", "book-2"})
        self.assertEqual(violations, ["duplicate catalog id 'book-1'"])

    def test_keyed_catalog_uses_explicit_keys(self) -> None:
        ids, violations = scholarly_integrity.collect_catalog_ids(
            {"source-a": {"title": "A"}, "source-b": {"title": "B"}}
        )
        self.assertEqual(ids, {"source-a", "source-b"})
        self.assertEqual(violations, [])


if __name__ == "__main__":
    unittest.main()
