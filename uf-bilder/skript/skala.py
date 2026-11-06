#!/usr/bin/env python3
"""Skalar bilder i inbox/ till kvadrat och skriver en JSON-fil per bild i bilder/.

Varje JSON-fil innehåller bilden som en Base64-kodad data-URI (JPEG) tillsammans
med lite metadata. Filnamnet (utan ändelse) används som id.
"""

import argparse
import base64
import hashlib
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps

BILDANDELSER = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"}


def sha256_av_fil(sokvag: Path) -> str:
    h = hashlib.sha256()
    with sokvag.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def befintlig_sha256(json_sokvag: Path) -> str | None:
    if not json_sokvag.is_file():
        return None
    try:
        with json_sokvag.open(encoding="utf-8") as f:
            return json.load(f).get("sha256")
    except (OSError, ValueError):
        return None


def skala_bild(kalla: Path, size: int, quality: int) -> bytes:
    with Image.open(kalla) as bild:
        bild = ImageOps.exif_transpose(bild)
        if bild.mode in ("RGBA", "LA") or (bild.mode == "P" and "transparency" in bild.info):
            # Genomskinlighet blir vit bakgrund.
            rgba = bild.convert("RGBA")
            bakgrund = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
            bild = Image.alpha_composite(bakgrund, rgba)
        bild = bild.convert("RGB")
        bild = ImageOps.fit(bild, (size, size), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        buffert = io.BytesIO()
        bild.save(buffert, format="JPEG", quality=quality, optimize=True, progressive=True)
        return buffert.getvalue()


def behandla(kalla: Path, ut: Path, size: int, quality: int, alla: bool) -> bool:
    """Returnerar True om bilden behandlades, False om den hoppades över."""
    bild_id = kalla.stem
    json_sokvag = ut / f"{bild_id}.json"
    sha = sha256_av_fil(kalla)

    if not alla and befintlig_sha256(json_sokvag) == sha:
        print(f"hoppar över {kalla.name} (oförändrad)")
        return False

    jpg = skala_bild(kalla, size, quality)
    data = {
        "id": bild_id,
        "dataUri": "data:image/jpeg;base64," + base64.b64encode(jpg).decode("ascii"),
        "bytes": len(jpg),
        "size": size,
        "kalla": kalla.name,
        "sha256": sha,
        "skapad": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    ut.mkdir(parents=True, exist_ok=True)
    with json_sokvag.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"skalade {kalla.name} -> {json_sokvag} ({len(jpg)} byte, {size}x{size})")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Skalar bilder till kvadrat och skriver JSON med Base64.")
    parser.add_argument("--inbox", default="inbox", help="mapp med originalbilder (standard: inbox)")
    parser.add_argument("--ut", default="bilder", help="mapp för JSON-filer (standard: bilder)")
    parser.add_argument("--size", type=int, default=640, help="sidlängd i pixlar (standard: 640)")
    parser.add_argument("--quality", type=int, default=75, help="JPEG-kvalitet 1-95 (standard: 75)")
    parser.add_argument("--alla", action="store_true", help="gör om även oförändrade bilder")
    args = parser.parse_args()

    inbox = Path(args.inbox)
    ut = Path(args.ut)
    if not inbox.is_dir():
        print(f"fel: mappen {inbox} finns inte", file=sys.stderr)
        return 1

    filer = sorted(p for p in inbox.iterdir() if p.is_file() and p.suffix.lower() in BILDANDELSER)
    if not filer:
        print(f"inga bilder i {inbox}")
        return 0

    antal_fel = 0
    antal_skalade = 0
    for kalla in filer:
        try:
            if behandla(kalla, ut, args.size, args.quality, args.alla):
                antal_skalade += 1
        except Exception as e:  # noqa: BLE001 - vi vill rapportera alla fel och fortsätta
            antal_fel += 1
            print(f"fel: {kalla.name}: {e}", file=sys.stderr)

    print(f"klart: {antal_skalade} skalade, {len(filer) - antal_skalade - antal_fel} överhoppade, {antal_fel} fel")
    return 1 if antal_fel else 0


if __name__ == "__main__":
    sys.exit(main())
