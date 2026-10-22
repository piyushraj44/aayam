"""Extract the ASCII hand from the AAYAM reference artwork into a compact glyph grid.

Usage (from the repo root):
    C:/Users/piyus/anaconda3/python.exe -I scripts/extract-hand.py \
        docs/reference/aayam-wordmark-reference.jpg public/data public/images/stage/hand-fallback.webp \
        [--preview <dir>]

Outputs
    <data_dir>/hand-glyphs.json  header (see docs/TOUCH-CONTRACT.md)
    <data_dir>/hand-glyphs.bin   count x [col, row, brightness 0-255, tint 0=white|1=red|2=blue] (Uint8)
    <fallback.webp>              re-render of the grid as glyphs (light silver on transparent, ~1200 px)
    --preview <dir>              optional side-by-side comparison with the reference (for checking only)

Method
    1. The hand is a regular monospace character grid. The row and column pitch are measured from the
       spectrum of the brightness projection profiles (zero-padded FFT, refined by a parabolic peak fit),
       and the grid phase from the phase of that Fourier component.
    2. The molten wordmark (saturated warm blobs) is masked out, then every cell is sampled for glyph
       ink (mean luminance), peak luminance and a tint class from the faint red / blue chroma.
    3. A cell-level silhouette (closing + opening) gives the hand body without the 1-cell dotted drip
       lines; fingertips are the local lowest points of its bottom profile. Drip lines are the thin
       vertical runs left over below the body.
"""
import argparse
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
from scipy.signal import find_peaks

RAMP = " .:-=+*#%@"


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("data_dir")
    p.add_argument("fallback")
    p.add_argument("--preview", default=None)
    p.add_argument("--font", default=r"C:/Windows/Fonts/consolab.ttf")
    return p.parse_args()


def wordmark_mask(a):
    """Saturated warm molten letters (same scoring as extract-wordmark.py), dilated for JPEG bleed."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    chroma = a.max(-1) - a.min(-1)
    warm = r - np.maximum(g, b) * 0.55
    score = np.clip((chroma - 18) / 45, 0, 1) * np.clip((warm - 10) / 40, 0, 1)
    m = ndimage.binary_closing(score > 0.15, iterations=2)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = np.isin(lab, 1 + np.where(sizes > 1500)[0])
    keep = ndimage.binary_fill_holes(keep)
    return ndimage.binary_dilation(keep, iterations=7)


def pitch_and_phase(profile, lo=3.0, hi=14.0):
    """Dominant period of a 1D projection profile, plus the phase of the cell centres."""
    x = profile - profile.mean()
    n = len(x)
    pad = 1 << int(np.ceil(np.log2(n * 16)))
    spec = np.abs(np.fft.rfft(x * np.hanning(n), pad))
    f = np.fft.rfftfreq(pad)
    ok = (f > 1 / hi) & (f < 1 / lo)
    i = int(np.argmax(np.where(ok, spec, 0)))
    # parabolic refinement of the peak
    y0, y1, y2 = spec[i - 1], spec[i], spec[i + 1]
    d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)
    period = 1.0 / ((i + d) / pad)
    # phase: position of brightness maxima (glyph centres)
    k = np.arange(n)
    c = np.sum(x * np.exp(-2j * np.pi * k / period))
    centre = (-np.angle(c) / (2 * np.pi)) * period % period
    return period, centre


def main():
    args = parse_args()
    img = Image.open(args.src).convert("RGB")
    a = np.asarray(img).astype(np.float32)
    H, W = a.shape[:2]
    L = a.mean(-1)

    wm = wordmark_mask(a)
    Lm = np.where(wm, 0, L)

    # region of interest: the black artboard minus margins (the hand lives above / between letters)
    ax0, ax1 = 300, 1160
    ay0, ay1 = 80, 860
    roi = Lm[ay0:ay1, ax0:ax1]
    # pitch from the dense upper part of the hand (no wordmark there)
    dense = Lm[110:640, 360:1090]
    py, cy = pitch_and_phase(dense.mean(1))
    px, cx = pitch_and_phase(dense.mean(0))
    cy += 110
    cx += 360
    # cell origin (top-left corner of the cell that contains the first centre) in image px
    oy = cy - py / 2
    ox = cx - px / 2
    oy -= np.ceil((oy - ay0) / py) * py
    ox -= np.ceil((ox - ax0) / px) * px

    rows_all = int((ay1 - oy) // py)
    cols_all = int((ax1 - ox) // px)

    ink = np.zeros((rows_all, cols_all), np.float32)
    peak = np.zeros_like(ink)
    rb = np.zeros_like(ink)  # red - blue chroma over lit pixels
    br = np.zeros_like(ink)  # blue/cyan - red
    for j in range(rows_all):
        y0 = int(round(oy + j * py))
        y1 = int(round(oy + (j + 1) * py))
        for i in range(cols_all):
            x0 = int(round(ox + i * px))
            x1 = int(round(ox + (i + 1) * px))
            if y0 < 0 or x0 < 0 or y1 > H or x1 > W:
                continue
            cell = Lm[y0:y1, x0:x1]
            ink[j, i] = cell.mean()
            peak[j, i] = cell.max()
            lit = cell > 40
            if lit.sum() >= 2:
                rgb = a[y0:y1, x0:x1][lit]
                rb[j, i] = np.mean(rgb[:, 0] - rgb[:, 2])
                br[j, i] = np.mean((rgb[:, 1] + rgb[:, 2]) * 0.5 - rgb[:, 0])

    on = (peak > 45) & (ink > 7)
    # drop tiny isolated specks far from anything (JPEG noise); keep the scattered ASCII dust
    nb = ndimage.convolve(on.astype(np.int32), np.ones((5, 5), np.int32), mode="constant")
    on &= nb >= 2

    # ---- tint classes (smoothed so JPEG chroma noise does not speckle) ----
    rb_s = ndimage.uniform_filter(np.where(on, rb, 0), 3) / np.maximum(ndimage.uniform_filter(on.astype(np.float32), 3), 1e-3)
    br_s = ndimage.uniform_filter(np.where(on, br, 0), 3) / np.maximum(ndimage.uniform_filter(on.astype(np.float32), 3), 1e-3)
    tint = np.zeros(on.shape, np.uint8)
    # the white glyphs are exactly neutral (r = g = b), so even a small chroma means a tinted glyph
    tint[on & (rb_s > 3.0)] = 1
    tint[on & ((br_s > 1.5) | (rb_s < -1.5)) & (rb_s < 1.0)] = 2

    # ---- silhouette, drips, fingertips ----
    # the hand body is built from the white glyphs only: the red / blue tinted boxes are decoration
    white = on & (tint == 0)
    # closing that is wider than tall: joins the dotted finger outlines without swallowing the drips
    body = ndimage.binary_closing(white, structure=np.ones((3, 5)), iterations=1)
    body = ndimage.binary_closing(body, structure=np.ones((1, 7)), iterations=1)
    body = ndimage.binary_fill_holes(body)
    body = ndimage.binary_opening(body, structure=np.ones((1, 5)))  # removes 1-3 col vertical dotted lines
    body = ndimage.binary_opening(body, structure=np.ones((3, 1)))
    lab, n = ndimage.label(body)
    sizes = ndimage.sum(body, lab, range(1, n + 1))
    body = lab == (1 + int(np.argmax(sizes)))  # the hand: the largest component
    body = ndimage.binary_fill_holes(ndimage.binary_closing(body, structure=np.ones((3, 3)), iterations=1))

    # crop the hand grid to all lit cells (+1 margin)
    rr, cc = np.where(on)
    r0, r1 = max(rr.min() - 1, 0), min(rr.max() + 2, rows_all)
    c0, c1 = max(cc.min() - 1, 0), min(cc.max() + 2, cols_all)
    on = on[r0:r1, c0:c1]
    ink = ink[r0:r1, c0:c1]
    peak = peak[r0:r1, c0:c1]
    tint = tint[r0:r1, c0:c1]
    body = body[r0:r1, c0:c1]
    rows, cols = on.shape

    # ---- drip lines: dotted vertical runs of neutral glyphs, horizontally isolated, outside the body ----
    neutral = on & (tint == 0) & ~ndimage.binary_dilation(tint > 0, iterations=1)
    padn = np.pad(neutral, ((0, 0), (4, 4)))
    side = np.zeros_like(neutral)
    for dx in (-4, -3, -2, 2, 3, 4):
        side |= padn[:, 4 + dx:4 + dx + cols]
    iso = neutral & ~side & ~body
    drip = np.zeros_like(on)
    drips = []
    for c in range(cols):
        col = iso[:, c] | (iso[:, c - 1] if c > 0 else False) | (iso[:, c + 1] if c + 1 < cols else False)
        ys = np.where(col)[0]
        if len(ys) < 5:
            continue
        # split into runs with gaps <= 4 rows
        runs, start = [], ys[0]
        for y_prev, y_next in zip(ys[:-1], ys[1:]):
            if y_next - y_prev > 4:
                runs.append((start, y_prev))
                start = y_next
        runs.append((start, ys[-1]))
        for y0r, y1r in runs:
            n_lit = int(col[y0r:y1r + 1].sum())
            if y1r - y0r + 1 >= 4 and n_lit >= max(3, 0.45 * (y1r - y0r + 1)):
                drips.append({"x": int(c), "y0": int(y0r), "y1": int(y1r)})
    # adjacent columns describe the same drip ("#." glyph pairs): keep the denser one
    drips.sort(key=lambda d: (d["x"], d["y0"]))
    merged = []
    for d in drips:
        dup = next((m for m in merged if abs(m["x"] - d["x"]) <= 2 and not (d["y0"] > m["y1"] + 5 or d["y1"] < m["y0"] - 5)), None)
        if dup:
            dup["y0"], dup["y1"] = min(dup["y0"], d["y0"]), max(dup["y1"], d["y1"])
        else:
            merged.append(dict(d))
    for d in merged:  # centre each drip on its densest column
        xs_ = range(max(0, d["x"] - 2), min(cols, d["x"] + 3))
        d["x"] = int(max(xs_, key=lambda x: iso[d["y0"]:d["y1"] + 1, x].sum()))
    changed = True
    while changed:  # recentering can make neighbours coincide: union them
        changed = False
        for i_ in range(len(merged)):
            for j_ in range(i_ + 1, len(merged)):
                p_, q_ = merged[i_], merged[j_]
                if abs(p_["x"] - q_["x"]) <= 1 and not (q_["y0"] > p_["y1"] + 5 or q_["y1"] < p_["y0"] - 5):
                    p_["y0"], p_["y1"] = min(p_["y0"], q_["y0"]), max(p_["y1"], q_["y1"])
                    merged.pop(j_)
                    changed = True
                    break
            if changed:
                break
    drips = sorted((d for d in merged if d["y1"] > rows * 0.45), key=lambda d: d["x"])
    for d in drips:
        drip[d["y0"]:d["y1"] + 1, max(0, d["x"] - 1):d["x"] + 2] |= iso[d["y0"]:d["y1"] + 1, max(0, d["x"] - 1):d["x"] + 2]
    tint[drip] = 0

    # ---- fingertips: peaks of the hand's bottom profile (fingers point down) ----
    bottom = np.full(cols, -1)
    for i in range(cols):
        ys = np.where(body[:, i])[0]
        if len(ys):
            bottom[i] = ys.max()
    prof = np.where(bottom < 0, 0, bottom).astype(np.float32)
    prof_s = ndimage.uniform_filter1d(prof, 3)
    pk, props = find_peaks(np.concatenate([[0], prof_s, [0]]), prominence=3, distance=10, plateau_size=1)
    pk = pk - 1
    peaks = [int(round((l + r) / 2)) - 1 for l, r in zip(props["left_edges"], props["right_edges"])]

    def refine(c_guess):
        """Exact tip on the glyph grid: walk up from the silhouette's lowest row until the lit glyphs form a
        run at least 4 cells wide (the converging finger outline), skipping a drip that is fused to the tip."""
        lo, hi = max(0, c_guess - 7), min(cols, c_guess + 8)
        c_best = lo + int(np.argmax(bottom[lo:hi]))
        y_start = int(bottom[c_best])
        for y in range(y_start, max(0, y_start - 15), -1):
            xs = np.where(on[y, lo:hi])[0] + lo
            if not len(xs):
                continue
            runs, s0 = [], xs[0]
            for x_prev, x_next in zip(xs[:-1], xs[1:]):
                if x_next - x_prev > 2:  # tolerate a one-cell gap
                    runs.append((s0, x_prev))
                    s0 = x_next
            runs.append((s0, xs[-1]))
            l_, r_ = max(runs, key=lambda t: t[1] - t[0])
            if r_ - l_ + 1 >= 4:
                return (l_ + r_) / 2.0, float(y)
        return float(c_best), float(y_start)

    tip_xy = [refine(c) for c in peaks]
    # webs between consecutive fingers (valley bottoms of the profile) give the knuckle line
    webs = [float(prof_s[a:b + 1].min()) for a, b in zip(peaks[:-1], peaks[1:])]
    knuckle_y = int(round(np.median(webs))) if webs else int(rows * 0.5)

    # a folded finger shows no peak; if only four were found, the fifth sits in the widest valley,
    # where the longest drip leaves the palm
    if len(tip_xy) == 4:
        gaps = [b - a for a, b in zip(peaks[:-1], peaks[1:])]
        g = int(np.argmax(gaps))
        a_, b_ = peaks[g], peaks[g + 1]
        inside = [d for d in drips if a_ + 4 < d["x"] < b_ - 4]
        if inside:
            d = max(inside, key=lambda d: d["y1"] - d["y0"])
            cx = d["x"]
        else:
            cx = (a_ + b_) // 2
        tip_xy.insert(g + 1, (float(cx), float(bottom[cx])))

    # names: left to right thumb, index, middle, ring, little; the lowest tip must be the contact finger
    names = ["thumb", "index", "middle", "ring", "little"][: len(tip_xy)]
    lowest = int(np.argmax([t[1] for t in tip_xy])) if tip_xy else 0
    if len(tip_xy) > 1 and lowest != 1:
        names[lowest], names[1] = names[1], names[lowest]
    fingertips = [{"name": n, "x": round(x + 0.5, 2), "y": round(y + 0.5, 2)} for n, (x, y) in zip(names, tip_xy)]
    # a drip that starts just under a fingertip belongs to that finger (it falls from the tip)
    for d in drips:
        for n, (x, y) in zip(names, tip_xy):
            if abs(d["x"] - x) <= 2.5 and 0 < d["y0"] - y <= 7:
                d["y0"] = int(y) + 1
                d["finger"] = n

    # ---- brightness 0..255 ----
    # glyph ink (mean) says how dense the character is, peak says how bright it is drawn
    v = np.where(on, 0.6 * ink / max(np.percentile(ink[on], 97), 1) + 0.4 * peak / max(np.percentile(peak[on], 97), 1), 0)
    bright = np.clip(np.round(np.power(np.clip(v, 0, 1), 0.7) * 255), 1, 255).astype(np.uint8)

    jj, ii = np.where(on)
    rec = np.stack([ii, jj, bright[jj, ii], tint[jj, ii]], 1).astype(np.uint8)
    assert cols <= 255 and rows <= 255
    os.makedirs(args.data_dir, exist_ok=True)
    rec.tofile(os.path.join(args.data_dir, "hand-glyphs.bin"))

    header = {
        "version": 1,
        "cols": int(cols),
        "rows": int(rows),
        "count": int(len(rec)),
        "aspect": round(float(px / py), 4),
        "fingertips": fingertips,
        "knuckleY": knuckle_y,
        "contactFinger": "index",
        # extras (not required by the contract; handy for the stage)
        "drips": drips,
        "tints": {"white": int((rec[:, 3] == 0).sum()), "red": int((rec[:, 3] == 1).sum()), "blue": int((rec[:, 3] == 2).sum())},
        "source": {
            "image": os.path.basename(args.src),
            "pitchX": round(float(px), 4),
            "pitchY": round(float(py), 4),
            "originX": round(float(ox + c0 * px), 2),
            "originY": round(float(oy + r0 * py), 2),
        },
        "ramp": RAMP,
    }
    with open(os.path.join(args.data_dir, "hand-glyphs.json"), "w") as f:
        json.dump(header, f, indent=1)

    # ---- re-render as glyphs (validation + fallback) ----
    out_w = 1200
    cw = out_w / cols
    ch = cw / (px / py)
    out_h = int(np.ceil(rows * ch))
    font = ImageFont.truetype(args.font, int(round(ch * 0.92)))
    canvas = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    silver = np.array([214, 220, 228])
    tints = {0: silver, 1: np.array([226, 170, 176]), 2: np.array([170, 196, 228])}
    for c, r, bv, t in rec:
        ch_i = min(len(RAMP) - 1, 1 + int(bv / 256 * (len(RAMP) - 1)))
        g = RAMP[ch_i]
        col = tints[int(t)]
        alpha = int(np.clip(90 + bv * 0.65, 0, 255))
        d.text((c * cw + cw * 0.5, r * ch + ch * 0.5), g, font=font, fill=(*col.tolist(), alpha), anchor="mm")
    os.makedirs(os.path.dirname(args.fallback) or ".", exist_ok=True)
    canvas.save(args.fallback, "WEBP", quality=88, method=6)

    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        x0 = int(ox + c0 * px)
        y0 = int(oy + r0 * py)
        ref = img.crop((x0, y0, int(x0 + cols * px), int(y0 + rows * py))).resize((out_w, out_h), Image.LANCZOS)
        bg = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 255))
        bg.alpha_composite(canvas)
        dbg = bg.copy()
        dd = ImageDraw.Draw(dbg)
        for fobj in fingertips:
            X, Y = fobj["x"] * cw, fobj["y"] * ch
            dd.ellipse((X - 9, Y - 9, X + 9, Y + 9), outline=(255, 200, 0, 255), width=3)
            dd.text((X + 12, Y), fobj["name"], fill=(255, 200, 0, 255), font=ImageFont.truetype(args.font, 22))
        dd.line((0, knuckle_y * ch, out_w, knuckle_y * ch), fill=(0, 255, 120, 160), width=2)
        for dr in drips:
            dd.line((dr["x"] * cw + cw / 2, dr["y0"] * ch, dr["x"] * cw + cw / 2, dr["y1"] * ch), fill=(0, 160, 255, 120), width=2)
        sbs = Image.new("RGB", (out_w * 2, out_h))
        sbs.paste(ref, (0, 0))
        sbs.paste(dbg.convert("RGB"), (out_w, 0))
        sbs.save(os.path.join(args.preview, "hand-compare.png"))
        Image.fromarray((body * 255).astype(np.uint8)).resize((cols * 4, rows * 7), Image.NEAREST).save(os.path.join(args.preview, "hand-body.png"))

    print(json.dumps({k: header[k] for k in ("cols", "rows", "count", "aspect", "fingertips", "knuckleY", "tints", "source")}))
    print("drips", len(drips), "bin bytes", rec.nbytes)


if __name__ == "__main__":
    main()
