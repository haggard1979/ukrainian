#!/usr/bin/env python3
"""Compare two screenshot folders from visual.js.

Usage: python3 tests/compare.py <dirA> <dirB> [diffdir]

Font antialiasing is not fully deterministic in headless Chromium: identical pages can differ in a few
hundred pixels by small amounts. Such files are reported as "noise". A file counts as changed when its size
differs or a pixel channel differs by more than THRESHOLD. With [diffdir], side-by-side images (A | B | diff)
are written for every changed file. Exit code 1 if anything changed or is missing.
"""
import os, sys
from PIL import Image, ImageChops

THRESHOLD = 96
if len(sys.argv) < 3:
    sys.exit(__doc__)
a, b = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else None
names = sorted(set(os.listdir(a)) | set(os.listdir(b)))
changed, noise, missing = [], [], []
for n in names:
    pa, pb = os.path.join(a, n), os.path.join(b, n)
    if not (os.path.exists(pa) and os.path.exists(pb)):
        missing.append(n); continue
    ia, ib = Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')
    if ia.size != ib.size:
        changed.append('%s (size %s -> %s)' % (n, ia.size, ib.size)); continue
    d = ImageChops.difference(ia, ib)
    if not d.getbbox():
        continue
    peak = max(hi for lo, hi in d.getextrema())
    if peak > THRESHOLD:
        changed.append('%s (area %s)' % (n, d.getbbox()))
        if out:
            os.makedirs(out, exist_ok=True)
            w, h = ia.size
            sheet = Image.new('RGB', (w * 3 + 20, h), 'white')
            sheet.paste(ia, (0, 0)); sheet.paste(ib, (w + 10, 0))
            sheet.paste(d.point(lambda v: 255 if v > THRESHOLD else 0), (2 * w + 20, 0))
            sheet.save(os.path.join(out, n))
    else:
        noise.append(n)
print('%d files: %d changed, %d only antialiasing noise, %d missing' % (len(names), len(changed), len(noise), len(missing)))
for x in changed: print('  changed ', x)
for x in missing: print('  missing ', x)
sys.exit(1 if changed or missing else 0)
