#!/usr/bin/env python3
"""Copy an existing trainer page as the starting point for a new one.

Usage: python3 .claude/skills/neue-uebungsseite/scaffold.py <source.html> <target.html> <storage-name> <title>
  e.g. scaffold.py grammar/accusative/accusative-trainer.html grammar/genitive/genitive-trainer.html genitiv "Genitiv Ukrainisch"

Adjusts: asset paths and back link (depth of the target), <title>, the T.de.title entry,
the localStorage key (KEY='<storage-name>.v1') and the test hook (window.__<storage-name>).
Everything else (data, texts, modes) still has to be rewritten by hand.
"""
import os, re, sys

if len(sys.argv) != 5:
    sys.exit(__doc__)
src, dst, name, title = sys.argv[1:]
if os.path.exists(dst):
    sys.exit('target exists: ' + dst)
s = open(src, encoding='utf-8').read()

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
rel = os.path.relpath(os.path.abspath(dst), root)
if rel.startswith('..'):
    sys.exit('target must be inside the repository: ' + dst)
depth = len(rel.split(os.sep)) - 1
up = '../' * depth
s = re.sub(r'href="(?:\.\./)*index\.html"', 'href="%sindex.html"' % up, s)
s = re.sub(r'(href|src)="(?:\.\./)*assets/', r'\1="%sassets/' % up, s)
s = re.sub(r'<title>[^<]*</title>', '<title>%s</title>' % title, s, count=1)
s = re.sub(r"(de:\{[^}]*?\btitle:)'[^']*'", lambda m: m.group(1) + "'" + title.replace("'", "\\'") + "'", s, count=1)
s, n = re.subn(r"var KEY='[^']*'", "var KEY='%s.v1'" % name, s)
if n != 1:
    sys.exit('expected exactly one storage key in the source page')
s = re.sub(r'window\.__[A-Za-z]+\b', 'window.__' + name, s)

os.makedirs(os.path.dirname(dst) or '.', exist_ok=True)
open(dst, 'w', encoding='utf-8').write(s)
print('written', dst, '| depth', depth, "| KEY='%s.v1' | window.__%s" % (name, name))
print('next: rewrite h1, intro, data, T.de/T.en (incl. en title), rules; add the page to index.html')
