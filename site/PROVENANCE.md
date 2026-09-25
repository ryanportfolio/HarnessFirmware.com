# Asset provenance

Everything under `site/` is written for this project unless listed below.

## Third-party assets shipped here

| Files | Asset | Source | License | License file |
|---|---|---|---|---|
| `assets/fonts/lineal/Lineal-VF.woff2` (shipped sha256 `53e3dcd4f08b3363466a23016c10868d5613cdf5df16c48bbfafc945990872eb`) | Lineal variable, version 2.000 (weight axis 0 to 1500), by Frank Adebiaye | Velvetyne: [velvetyne.fr/fonts/lineal](https://velvetyne.fr/fonts/lineal/), [gitlab.com/velvetyne/lineal](https://gitlab.com/velvetyne/lineal), `fonts/Variable/LinealVF.woff2`. Shipped unmodified: the shipped file is the upstream file, byte for byte | SIL Open Font License 1.1, Reserved Font Name "Lineal" | `assets/fonts/lineal/LICENSE.txt` |
| `assets/fonts/fraunces/Fraunces-Italic.woff2` (shipped sha256 `cdf6728da129e01a86cce1cb716d79e8919d99021e43f8b1ec890c0334e0af0a`) | Fraunces Italic, version 1.000, by Undercase Type, as one static instance: wght 600, opsz 144, SOFT 100, WONK 1 (the values `fonts.css` sets as the accent tokens) | [google/fonts ofl/fraunces](https://github.com/google/fonts/tree/main/ofl/fraunces), `Fraunces-Italic[SOFT,WONK,opsz,wght].ttf` (sha256 `b24448c43702fac4ee856781d461a0dfba8d8e594b6e8e190234b75fed2c0e01`); upstream [undercasetype/Fraunces](https://github.com/undercasetype/Fraunces). All four axes pinned with `fontTools.varLib.instancer --static`, then subset and converted to woff2 | SIL Open Font License 1.1 | `assets/fonts/fraunces/OFL.txt` |
| `assets/fonts/harness-text/HarnessText-VF.woff2` (shipped sha256 `a2f59920c25911b621faf6eac0000956e5405e31888c88bd5ecb5e77ee089bf8`) | Mona Sans variable, version 2.027, by GitHub, as a modified version named Harness Text | [github/mona-sans](https://github.com/github/mona-sans), `MonaSansVF[wdth,opsz,wght].ttf` (sha256 `9d96bf1303b964cc9101ea2419de780204cb6ace16375b017b66d1fe98a3a435`). Width axis fixed at 100, weight and optical-size axes kept, subset, converted to woff2 and renamed: "Mona" is a Reserved Font Name, which a modified version may not use | SIL Open Font License 1.1, Reserved Font Name "Mona" | `assets/fonts/harness-text/OFL.txt` |
| `assets/fonts/departure-mono/DepartureMono-Regular.woff2` (shipped sha256 `7507a04f0fb1aafc3de14ad1073255b18d629844da1eaf0c29d9fdc08b65089a`) | Departure Mono Regular, version 1.500, by Helena Zhang | [rektdeckard/departure-mono](https://github.com/rektdeckard/departure-mono), `DepartureMono-Regular.woff2` (sha256 `5b4fed1daa90708aa9c6ee1190abca9dc22164a1c1def0020386e46b61038cfb`). Subset | SIL Open Font License 1.1 | `assets/fonts/departure-mono/OFL.txt` |

The subsets keep Basic Latin, Latin-1, general punctuation and the arrows and symbols the pages use (U+0020-007E, U+00A0-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2190-21FF, U+2212, U+2318, U+25A0-25FF, U+2713) with every OpenType layout feature, made with fontTools 4.66 (`pyftsubset --layout-features='*' --flavor=woff2`; the Mona Sans width axis fixed first and the Fraunces axes pinned first, both with `fontTools.varLib.instancer`). `fonts.css` declares all four and sets the role tokens. Change `--accent-weight` or `--accent-vs` and the Fraunces instance has to be cut again from the upstream file.

## Project assets that are not hand-written code

| Files | What it is |
|---|---|
| `assets/memory-forest.webp` | Image generated with an AI image model for this project from its own memory-page concept. |
| `assets/grain.png` | Seeded grayscale noise written by `generate-grain.mjs`. Regenerate with `node site/generate-grain.mjs`. |
| `assets/favicon.svg`, `assets/harness-mark.svg` | The Harness H mark, drawn for this project. |
