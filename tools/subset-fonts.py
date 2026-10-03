"""Rebuild the two complementary variable-font subsets (fonttools[woff])."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset

root = Path(__file__).resolve().parents[1]
common = (set(range(128)) | {0xa0, 0xa9, 0xb7, 0xd7, 0x2022, 0x2026, 0x2032,
    0x2033, 0x20b9, 0x2197, 0x2199} | set(range(0x2010, 0x2016)) |
    set(range(0x2018, 0x2020)) | set(range(0x2190, 0x2194)))
for name in ["Latin", "Extended"]:
    font = TTFont(root / "tools/fonts/Satoshi-Variable.woff2")
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    processor = subset.Subsetter(options=options)
    processor.populate(unicodes=common if name == "Latin" else set(font.getBestCmap()) - common)
    processor.subset(font)
    font.flavor = "woff2"
    font.save(root / f"web/public/assets/fonts/Satoshi-{name}.woff2")
