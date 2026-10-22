"""Software-render previews of a wordmark mesh dump (from `node scripts/verify-glb.mjs <glb> --dump <bin>`).

Usage:
    C:/Users/piyus/anaconda3/python.exe -I scripts/preview-wordmark.py <dump.bin> <out_dir> [--ref <2d.png>] [--tag desktop]

Writes <out_dir>/<tag>-front.png, <tag>-34.png, <tag>-side.png, <tag>-attrs.png (fillHeight | centreline) and,
with --ref, <tag>-compare.png (2D cut-out above the shaded front view). A plain z-buffer rasteriser with a
Lambert + Blinn-Phong + rim studio light; it is only meant for checking the shape (holes, steps, blobby tips).
"""
import argparse
import os
import struct

import numpy as np
from PIL import Image


def read_dump(path):
    data = open(path, "rb").read()
    off, meshes = 0, []
    while off < len(data):
        nl, nv, ni = struct.unpack_from("<III", data, off)
        off += 12
        name = data[off:off + nl].decode()
        off += nl + (4 - nl % 4) % 4

        def take(count, dtype):
            nonlocal off
            arr = np.frombuffer(data, dtype, count, off)
            off += arr.nbytes
            return arr

        pos = take(nv * 3, np.float32).reshape(-1, 3)
        nrm = take(nv * 3, np.float32).reshape(-1, 3)
        uv = take(nv * 2, np.float32).reshape(-1, 2)
        uv1 = take(nv * 2, np.float32).reshape(-1, 2)
        idx = take(ni, np.uint32).reshape(-1, 3)
        meshes.append(dict(name=name, pos=pos, nrm=nrm, uv=uv, uv1=uv1, idx=idx))
    return meshes


def rot(yaw, pitch):
    cy, sy, cp, sp = np.cos(yaw), np.sin(yaw), np.cos(pitch), np.sin(pitch)
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    return Rx @ Ry


def raster(meshes, R, W, H, scale, value_fn):
    zbuf = np.full((H, W), -np.inf)
    out = np.zeros((H, W, 3))
    mask = np.zeros((H, W), bool)
    for m in meshes:
        P = m["pos"] @ R.T
        N = m["nrm"] @ R.T
        V = value_fn(m, N)
        sx = W / 2 + P[:, 0] * scale
        sy = H / 2 - P[:, 1] * scale
        for a, b, c in m["idx"]:
            xa, xb, xc = sx[a], sx[b], sx[c]
            ya, yb, yc = sy[a], sy[b], sy[c]
            den = (yb - yc) * (xa - xc) + (xc - xb) * (ya - yc)
            if abs(den) < 1e-12:
                continue
            x0, x1 = int(max(min(xa, xb, xc), 0)), int(min(max(xa, xb, xc) + 1, W - 1))
            y0, y1 = int(max(min(ya, yb, yc), 0)), int(min(max(ya, yb, yc) + 1, H - 1))
            if x1 < x0 or y1 < y0:
                continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            w0 = ((yb - yc) * (gx - xc) + (xc - xb) * (gy - yc)) / den
            w1 = ((yc - ya) * (gx - xc) + (xa - xc) * (gy - yc)) / den
            w2 = 1 - w0 - w1
            ins = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
            if not ins.any():
                continue
            z = w0 * P[a, 2] + w1 * P[b, 2] + w2 * P[c, 2]
            zb = zbuf[y0:y1 + 1, x0:x1 + 1]
            upd = ins & (z > zb)
            if not upd.any():
                continue
            zb[upd] = z[upd]
            col = w0[..., None] * V[a] + w1[..., None] * V[b] + w2[..., None] * V[c]
            o = out[y0:y1 + 1, x0:x1 + 1]
            o[upd] = col[upd]
            mask[y0:y1 + 1, x0:x1 + 1] |= upd
    return out, mask


def studio(m, N):
    # interpolate the normal itself; shading is done per pixel below
    return N


def shade(nmap, mask):
    n = nmap / np.maximum(np.linalg.norm(nmap, axis=-1, keepdims=True), 1e-9)
    L1 = np.array([-0.45, 0.6, 0.65]); L1 /= np.linalg.norm(L1)
    L2 = np.array([0.7, 0.2, 0.4]); L2 /= np.linalg.norm(L2)
    Vd = np.array([0, 0, 1.0])
    base = np.array([0.55, 0.06, 0.16])
    diff = np.clip(n @ L1, 0, 1)[..., None] * 0.9 + np.clip(n @ L2, 0, 1)[..., None] * 0.35 + 0.08
    Hh = (L1 + Vd) / np.linalg.norm(L1 + Vd)
    spec = np.clip(n @ Hh, 0, 1) ** 60
    H2 = (L2 + Vd) / np.linalg.norm(L2 + Vd)
    spec2 = np.clip(n @ H2, 0, 1) ** 30
    rim = (1 - np.clip(n[..., 2], 0, 1)) ** 3
    col = base * diff + spec[..., None] * np.array([1.0, 0.85, 0.5]) + spec2[..., None] * np.array([1.0, 0.55, 0.2]) * 0.5 + rim[..., None] * np.array([1.0, 0.45, 0.1]) * 0.5
    img = np.clip(col, 0, 1)
    img[~mask] = 0.04
    return (img * 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dump")
    ap.add_argument("out_dir")
    ap.add_argument("--ref", default=None)
    ap.add_argument("--tag", default="lod")
    ap.add_argument("--width", type=int, default=1600)
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    meshes = read_dump(a.dump)
    W = a.width
    H = int(W * 0.42)
    scale = W / 2.15
    views = {"front": rot(0, 0), "34": rot(np.radians(-38), np.radians(18)), "side": rot(np.radians(-80), np.radians(5))}
    for name, R in views.items():
        nm, mk = raster(meshes, R, W, H, scale, studio)
        Image.fromarray(shade(nm, mk)).save(os.path.join(a.out_dir, f"{a.tag}-{name}.png"))
        if name == "front":
            front_mask = mk
            front = shade(nm, mk)
    # attribute views: fillHeight (red->yellow) and centreline distance (grey)
    fh, mk = raster(meshes, rot(0, 0), W, H, scale, lambda m, N: np.stack([m["uv1"][:, 0]] * 3, 1))
    cl, _ = raster(meshes, rot(0, 0), W, H, scale, lambda m, N: np.stack([m["uv1"][:, 1]] * 3, 1))
    att = np.concatenate([fh, cl], 0)
    att[np.concatenate([~mk, ~mk], 0)] = 0
    Image.fromarray((np.clip(att, 0, 1) * 255).astype(np.uint8)).resize((W // 2, H)).save(os.path.join(a.out_dir, f"{a.tag}-attrs.png"))
    if a.ref:
        ref = Image.open(a.ref).convert("RGBA")
        # the 2D cut-out spans the same 2.0 units (its alpha bbox); fit it by its alpha bbox
        bb = ref.getchannel("A").point(lambda v: 255 if v > 127 else 0).getbbox()
        ref = ref.crop(bb)
        ys, xs = np.nonzero(front_mask)
        tw, th = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        ref = ref.resize((tw, th), Image.LANCZOS)
        canvas = Image.new("RGB", (W, H * 2), (10, 10, 10))
        bg = Image.new("RGBA", (W, H), (10, 10, 10, 255))
        bg.alpha_composite(ref, (int(xs.min()), int(ys.min())))
        canvas.paste(bg.convert("RGB"), (0, 0))
        canvas.paste(Image.fromarray(front), (0, H))
        canvas.save(os.path.join(a.out_dir, f"{a.tag}-compare.png"))
    print("ok", sum(len(m["idx"]) for m in meshes), "triangles")


if __name__ == "__main__":
    main()
