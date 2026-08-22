# Shaanxi Archaeology R2 deletion verification

Status: `PASS_STATIC_BROWSER_PENDING`

## Frozen deletion set

- Base commit: `32b32832e1773f9698a785b3c49fbac3d5c3edd1`
- Frozen manifest: **1,061 files / 103,024,634 bytes**
- Pre-delete local files and SHA-256 checks: **1,061 / 1,061**
- Deleted: **1,061 files / 103,024,634 bytes**
- Frozen manifest local copies after deletion: **0**

The deletion set came from the existing media externalization plan and Shaanxi Archaeology upload verification at the base commit above. Deletion was performed one manifest path at a time. The current externalization plan/summary were regenerated afterward from the post-delete inventory; the base commit remains the frozen-manifest source.

## Retained out-of-manifest file

`modules/shaanxi-archaeology-museum/review/contact-sheets/contact_001_041.jpg`

- Status: `OUT_OF_MANIFEST_RETAINED`
- Size: **528,135 bytes**
- Present after deletion: **YES**
- It was not in the frozen/uploaded 1,061-file manifest and was not deleted or uploaded by this change.

## Runtime and audit checks

- Direct local runtime media references: **0**
- Old `r2.dev` runtime references: **0**
- Double module-prefix references: **0**
- Provenance Worker-resolved paths: **6**
- Static Worker references: **preserved**
- Dynamic catalog resolver: **preserved**
- `data/artifacts-data.js` logical paths: **preserved**
- Review contact sheet: **not runtime**

Media audit: **PASS**

- Before inventory: **5,449 files / 783,543,452 bytes**
- After inventory: **4,388 files / 680,518,818 bytes**
- Current externalization plan: **2,372 files / 359,545,285 bytes**

## Binary diff

- Additions: **0**
- Modifications: **0**
- Deletions: **1,061**
- Deleted binary path set equals the frozen manifest: **YES**

## Browser and network boundary

PR #19's GitHub-hosted Chromium smoke passed before deletion: search `167/1/167`, Worker media `51/51`, Worker failures `0`, local module media `0`, provenance `6/6`, dialogs `6`, thumbnail switches `5`, and console/page errors `0/0`.

No post-delete browser or Worker network result is claimed in this local report. The post-delete browser smoke remains pending the GitHub Actions run triggered by the deletion PR. Historical Worker upload verification remains separate: 1,061 objects, 1,061 Content-Length checks, and 40 SHA-256 samples passed before deletion.
