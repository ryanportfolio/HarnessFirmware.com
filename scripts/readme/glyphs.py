"""Cut the README art's glyph table from the site's own font files.

GitHub serves README images with `default-src 'none'`, so an SVG cannot load a
web font. The art draws text as outlines instead. This script instances each
site face at the settings `site/fonts.css` uses, then writes every printable
ASCII glyph (plus the few extra characters in EXTRA) as SVG path data in font
units, with its advance width and the pair kerning HarfBuzz applies.

Output: scripts/readme/glyphs.json, committed. The Node generator reads only
that file, so CI and anyone rebuilding the README needs no Python.

Run it again only when a font file or an instance setting changes:

    uv run --with fonttools --with brotli --with uharfbuzz python scripts/readme/glyphs.py
"""

import io
import json
import pathlib

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parents[2]
FONTS = ROOT / "site" / "assets" / "fonts"
OUT = ROOT / "scripts" / "readme" / "glyphs.json"

# Role -> file and the axis values site/fonts.css (and the hero theme) set.
FACES = {
    "display": ("lineal/Lineal-VF.woff2", {"wght": 781}),
    "accent": ("fraunces/Fraunces-Italic.woff2", {}),  # already a static instance
    "text": ("harness-text/HarnessText-VF.woff2", {"wght": 500, "opsz": 24}),
    "mono": ("departure-mono/DepartureMono-Regular.woff2", {}),
}
EXTRA = "’·→"  # right single quote, middle dot, rightwards arrow
CHARS = "".join(chr(c) for c in range(0x20, 0x7F)) + EXTRA


class RoundPen(SVGPathPen):
    """SVG path pen that writes integer font units."""

    def __init__(self, glyphset):
        super().__init__(glyphset, ntos=lambda v: str(round(v)))


def instance(path, axes):
    font = TTFont(path)
    if axes:
        font = instancer.instantiateVariableFont(font, axes)
    buf = io.BytesIO()
    font.flavor = None
    font.save(buf)
    data = buf.getvalue()
    return TTFont(io.BytesIO(data)), data


def shaper(data):
    face = hb.Face(data)
    font = hb.Font(face)
    return font


def shape(font, text):
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"liga": False, "clig": False, "dlig": False, "kern": True})
    return buf.glyph_positions


def advance_run(font, text):
    return sum(p.x_advance for p in shape(font, text))


def cut(role, rel, axes):
    font, data = instance(FONTS / rel, axes)
    cmap = font.getBestCmap()
    glyphset = font.getGlyphSet()
    hbfont = shaper(data)
    upm = font["head"].unitsPerEm
    hhea = font["hhea"]
    glyphs = {}
    for ch in CHARS:
        gid = cmap.get(ord(ch))
        if gid is None:
            continue
        pen = RoundPen(glyphset)
        glyphset[gid].draw(pen)
        # Advance and offset come from HarfBuzz, not hmtx: Harness Text adds optical-size
        # spacing through GPOS, and pair kerning has to be measured on the same scale.
        pos = shape(hbfont, ch)[0]
        glyphs[ch] = {"d": pen.getCommands(), "adv": pos.x_advance, "dx": pos.x_offset}
    have = [c for c in CHARS if c in glyphs]
    kern = {}
    for a in have:
        for b in have:
            delta = advance_run(hbfont, a + b) - glyphs[a]["adv"] - glyphs[b]["adv"]
            if delta:
                kern[a + b] = delta
    missing = [c for c in CHARS if c not in glyphs]
    return {
        "file": rel,
        "axes": axes,
        "upm": upm,
        "ascender": hhea.ascent,
        "descender": hhea.descent,
        "missing": missing,
        "glyphs": glyphs,
        "kern": kern,
    }


def main():
    table = {role: cut(role, rel, axes) for role, (rel, axes) in FACES.items()}
    OUT.write_text(json.dumps(table, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    for role, face in table.items():
        print(f"{role}: {len(face['glyphs'])} glyphs, {len(face['kern'])} kern pairs, missing {[hex(ord(c)) for c in face['missing']]}")


if __name__ == "__main__":
    main()
