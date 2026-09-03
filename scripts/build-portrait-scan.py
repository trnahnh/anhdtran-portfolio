"""
Build the derived asset for the portrait scan intro.

Reads public/profile/portrait.png, cuts the person out, estimates depth, crops
to head and shoulders, and writes public/profile/portrait-scan.png: a small
RGB image where

    R = cutout mask   (0 outside the person, 255 inside, soft edge)
    G = relative depth (255 nearest the camera, 0 farthest, 0 outside the mask)
    B = 0             (reserved; luminance was dropped to keep the file small)

Run by hand whenever the portrait changes. One-off tooling, not a build step:

    pip install rembg pillow numpy onnxruntime
    python scripts/build-portrait-scan.py --model <path to depth_anything_v2_small.onnx>

The depth model is Depth Anything V2 Small in ONNX form, from
https://huggingface.co/onnx-community/depth-anything-v2-small (onnx/model.onnx).
rembg downloads its own segmentation model on first use into U2NET_HOME.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "profile" / "portrait.png"
OUT = ROOT / "public" / "profile" / "portrait-scan.png"

WORK = 1024        # processing resolution; the source is 4000x4000
OUT_W = 512        # output width; height follows the crop's aspect
DEPTH_IN = 518     # Depth Anything's input side, a multiple of 14
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Crop: from just above the top of the head to mid-chest. The head top comes
# from the mask; the bottom is a fraction of the frame chosen by eye for this
# photo (the shoulder line is at about 0.66, the sweater's chest at 0.78).
CROP_BOTTOM = 0.78
CROP_MARGIN = 0.03  # fraction of the crop's own size, on every side


def cutout(img: Image.Image, session_name: str) -> np.ndarray:
    from rembg import new_session, remove

    session = new_session(session_name)
    rgba = remove(img, session=session, post_process_mask=True)
    alpha = np.asarray(rgba.split()[-1], dtype=np.float32) / 255.0
    return alpha


def depth(img: Image.Image, model: Path) -> np.ndarray:
    """Relative inverse depth for `img` (larger = nearer), at img's size."""
    import onnxruntime as ort

    sess = ort.InferenceSession(str(model), providers=["CPUExecutionProvider"])
    inp = sess.get_inputs()[0]
    out = sess.get_outputs()[0]

    x = img.convert("RGB").resize((DEPTH_IN, DEPTH_IN), Image.BICUBIC)
    arr = np.asarray(x, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    arr = arr.transpose(2, 0, 1)[None]  # 1x3xHxW

    pred = sess.run([out.name], {inp.name: arr})[0]
    pred = np.squeeze(pred).astype(np.float32)
    d = Image.fromarray(pred).resize(img.size, Image.BICUBIC)
    return np.asarray(d, dtype=np.float32)


def blur(a: np.ndarray, radius: float) -> np.ndarray:
    """Separable Gaussian blur on a float array (PIL cannot blur mode F)."""
    r = max(1, int(radius * 3))
    x = np.arange(-r, r + 1, dtype=np.float32)
    k = np.exp(-(x * x) / (2 * radius * radius))
    k /= k.sum()
    pad = np.pad(a, r, mode="edge")
    h = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 1, pad)
    v = np.apply_along_axis(lambda m: np.convolve(m, k, mode="valid"), 0, h)
    return v.astype(np.float32)


# How much of the final depth is local relief (nose, brow, collar) versus the
# model's global ordering (chest nearer than head). The global term alone
# spends the whole range on torso-versus-head and the face reads flat.
RELIEF_MIX = 0.6
RELIEF_RADIUS = 0.07  # of the crop width


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="depth_anything_v2_small.onnx")
    ap.add_argument("--session", default="isnet-general-use", help="rembg model name")
    ap.add_argument("--preview", default=None, help="directory for preview PNGs")
    args = ap.parse_args()

    if not SRC.exists():
        print(f"missing {SRC}", file=sys.stderr)
        return 1

    full = Image.open(SRC).convert("RGB")
    img = full.resize((WORK, WORK), Image.LANCZOS)

    print("cutout…")
    alpha = cutout(img, args.session)

    # --- crop to head and shoulders -------------------------------------
    hard = alpha > 0.5
    rows = np.where(hard.any(axis=1))[0]
    if rows.size == 0:
        print("mask is empty", file=sys.stderr)
        return 1
    y0 = int(rows[0])
    y1 = int(WORK * CROP_BOTTOM)
    cols = np.where(hard[y0:y1].any(axis=0))[0]
    x0, x1 = int(cols[0]), int(cols[-1]) + 1

    mw, mh = x1 - x0, y1 - y0
    px = int(mw * CROP_MARGIN)
    py = int(mh * CROP_MARGIN)
    x0, x1 = max(0, x0 - px), min(WORK, x1 + px)
    y0, y1 = max(0, y0 - py), min(WORK, y1 + py)
    print(f"crop x {x0}-{x1}  y {y0}-{y1}  ({x1 - x0}x{y1 - y0})")

    a = alpha[y0:y1, x0:x1]
    lum = np.asarray(img.convert("L"), dtype=np.float32)[y0:y1, x0:x1]

    # --- depth on the crop alone, from the full-resolution source --------
    # Running the model on the whole frame gives the face about a hundred
    # pixels of the model's input; on the crop it gets most of it.
    k = full.width / WORK
    crop_full = full.crop(
        (int(x0 * k), int(y0 * k), int(x1 * k), int(y1 * k))
    ).resize((x1 - x0, y1 - y0), Image.LANCZOS)
    print("depth…")
    d = depth(crop_full, Path(args.model))

    # --- normalise depth inside the mask --------------------------------
    inside = a > 0.5

    def norm(v: np.ndarray) -> np.ndarray:
        lo, hi = np.percentile(v[inside], [2, 98])
        return np.clip((v - lo) / max(hi - lo, 1e-6), 0, 1)

    # Fill outside the mask with the mask's mean before blurring so the
    # background does not bleed into the relief at the silhouette edge.
    d_fill = np.where(inside, d, d[inside].mean())
    local = d_fill - blur(d_fill, RELIEF_RADIUS * (x1 - x0))
    dn = np.clip((1 - RELIEF_MIX) * norm(d) + RELIEF_MIX * norm(local), 0, 1)
    dn[~(a > 0.02)] = 0

    # --- pack and resize --------------------------------------------------
    h_out = int(round(OUT_W * (y1 - y0) / (x1 - x0)))
    pack = np.stack([a * 255, dn * 255, np.zeros_like(lum)], axis=-1).astype(np.uint8)
    out = Image.fromarray(pack, "RGB").resize((OUT_W, h_out), Image.LANCZOS)

    # Soften the mask edge one step so the silhouette does not alias at
    # cell resolution, then re-pack.
    r, g, b = out.split()
    r = r.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.merge("RGB", (r, g, b))
    out.save(OUT, optimize=True)
    print(f"wrote {OUT}  {OUT_W}x{h_out}  {OUT.stat().st_size // 1024} KB")

    if args.preview:
        pv = Path(args.preview)
        pv.mkdir(parents=True, exist_ok=True)
        r.save(pv / "mask.png")
        g.save(pv / "depth.png")
        # A quick relief view: depth lit from the left, masked.
        gd = np.asarray(g, dtype=np.float32)
        gx = np.gradient(gd, axis=1)
        shade = np.clip(128 + gx * 6, 0, 255) * (np.asarray(r) > 127)
        Image.fromarray(shade.astype(np.uint8)).save(pv / "relief.png")
        print(f"previews in {pv}")
    return 0


if __name__ == "__main__":
    os.environ.setdefault("U2NET_HOME", str(Path(os.environ.get("TEMP", ".")) / "u2net"))
    raise SystemExit(main())
